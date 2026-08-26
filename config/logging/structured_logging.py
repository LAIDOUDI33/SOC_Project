"""
Djezzy National SOC Platform - Structured Logging Standard
============================================================

REMEDIATION MED-003: Standardized logging format across all 26+ containers.

This module provides:
- JSON-formatted structured logs with consistent schema
- Trace ID propagation across Kafka → SS7 Analyzer → Diameter Monitor → Alerts
- Sensitive data masking (IMSI, MSISDN, ICCID partial redaction)
- Syslog severity level mapping
- Service identification and correlation

Usage:
    from soc_logging import get_logger, set_trace_id, mask_sensitive
    
    logger = get_logger("ss7-collector")
    logger.info("message_captured", extra={
        "protocol": "M3UA",
        "imsi": "603021200000001",  # Will be auto-masked
        "source_ip": "10.0.1.100"
    })

Log Format Output:
{
    "timestamp": "2026-08-04T10:30:45.123Z",
    "service": "ss7-collector",
    "level": "INFO",
    "trace_id": "abc123def456",
    "message": "message_captured",
    "protocol": "M3UA",
    "imsi": "603021******0001",  # Masked
    "source_ip": "10.0.1.100",
    "host": "djezzy-ss7-collector-0",
    "environment": "production"
}

@version: 1.0.0
@remediation: MED-003
"""

import json
import logging
import os
import re
import socket
import threading
import time
import uuid
from datetime import datetime, timezone
from functools import lru_cache
from typing import Any, Dict, List, Optional, Set, Union


# =============================================================================
# CONFIGURATION
# =============================================================================

class LoggingConfig:
    """Centralized logging configuration for all SOC services."""
    
    # Log levels mapping to syslog severity
    SYSLOG_LEVELS = {
        logging.DEBUG: 7,      # DEBUG
        logging.INFO: 6,       # INFO
        logging.WARNING: 4,    # WARNING
        logging.ERROR: 3,      # ERROR
        logging.CRITICAL: 2,   # CRITICAL
    }
    
    # Sensitive field patterns to mask
    SENSITIVE_PATTERNS = {
        'imsi': r'^\d{15}$',           # IMSI: 15 digits
        'msisdn': r'^\+?\d{10,15}$',   # MSISDN: phone number
        'iccid': r'^\d{19,20}$',       # ICCID: SIM card ID
        'imei': r'^\d{15}$',           # IMEI: device ID
        'password': r'.*',              # Any password field
        'secret': r'.*',                # Any secret field
        'api_key': r'.*',               # API keys
        'token': r'.*',                 # Auth tokens
        'credit_card': r'^\d{13,16}$',  # Credit card numbers (if present)
    }
    
    # Fields to always include in log output
    STANDARD_FIELDS = [
        'timestamp',
        'service',
        'level',
        'trace_id',
        'message',
        'host',
        'environment',
        'version',
    ]
    
    # Environment detection
    ENVIRONMENT = os.getenv('NODE_ENV', os.getenv('ENVIRONMENT', 'development'))
    SERVICE_NAME = os.getenv('SERVICE_NAME', os.getenv('HOSTNAME', 'unknown-service'))
    LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO').upper()
    VERSION = os.getenv('SERVICE_VERSION', '1.0.0')
    
    # Masking character
    MASK_CHAR = '*'
    
    # Preserve digits for partial masking
    IMSI_MASK_SHOW_LAST = 4      # Show last 4 digits of IMSI
    MSISDN_MASK_SHOW_MIDDLE = 3  # Show first 3 and last X digits of MSISDN


# =============================================================================
# TRACE ID PROPAGATION
# =============================================================================

class TraceContext:
    """
    Thread-local storage for trace context propagation.
    
    Enables trace IDs to flow through:
    Kafka Message → ss7-collector → ss7-analyzer → diameter-monitor → Alerts → Wazuh
    """
    
    _local = threading.local()
    
    @classmethod
    def set_trace_id(cls, trace_id: Optional[str] = None) -> str:
        """Set trace ID for current thread/context."""
        if not trace_id:
            trace_id = cls.generate_trace_id()
        cls._local.trace_id = trace_id
        return trace_id
    
    @classmethod
    def get_trace_id(cls) -> Optional[str]:
        """Get current trace ID."""
        return getattr(cls._local, 'trace_id', None)
    
    @classmethod
    def clear_trace_id(cls) -> None:
        """Clear trace ID (end of request/processing)."""
        if hasattr(cls._local, 'trace_id'):
            delattr(cls._local, 'trace_id')
    
    @classmethod
    def generate_trace_id(cls) -> str:
        """Generate new unique trace ID."""
        return f"{uuid.uuid4().hex[:8]}{int(time.time()*1000)%100000:05d}"
    
    @classmethod
    def extract_from_kafka_headers(cls, headers: Dict) -> Optional[str]:
        """Extract trace ID from Kafka message headers."""
        if not headers:
            return None
        
        # Check common header names for trace ID
        header_names = ['trace-id', 'trace_id', 'X-Trace-ID', 'correlation-id', 'X-Correlation-ID']
        
        for name in header_names:
            value = headers.get(name) or headers.get(name.lower()) or headers.get(name.upper())
            if value:
                return value if isinstance(value, str) else str(value)
        
        return None


# Global convenience functions
def set_trace_id(trace_id: Optional[str] = None) -> str:
    """Set trace ID for current context."""
    return TraceContext.set_trace_id(trace_id)

def get_trace_id() -> Optional[str]:
    """Get current trace ID."""
    return TraceContext.get_trace_id()

def clear_trace_id() -> None:
    """Clear current trace ID."""
    TraceContext.clear_trace_id()


# =============================================================================
# SENSITIVE DATA MASKING
# =============================================================================

class DataMasker:
    """
    Masks sensitive data in log messages according to ANRT privacy requirements.
    
    Rules:
    - IMSI: Show only last 4 digits (e.g., 603021******0001)
    - MSISDN: Show area code + last 4 digits (e.g., +213 555****1234)
    - IMEI: Show only last 4 digits
    - ICCID: Show only last 4 digits
    - Passwords/Secrets/Tokens: Full mask (**********)
    """
    
    _instance = None
    _lock = threading.Lock()
    
    def __new__(cls):
        """Singleton pattern for compiled regex patterns."""
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._compile_patterns()
        return cls._instance
    
    def _compile_patterns(self):
        """Pre-compile regex patterns for performance."""
        self.compiled_patterns = {}
        for field_name, pattern in LoggingConfig.SENSITIVE_PATTERNS.items():
            try:
                self.compiled_patterns[field_name] = re.compile(pattern)
            except re.error:
                pass  # Skip invalid patterns
    
    def mask_imsi(self, imsi: str) -> str:
        """Mask IMSI showing only last N digits."""
        if not imsi or len(imsi) < LoggingConfig.IMSI_MASK_SHOW_LAST:
            return imsi or ''
        show = LoggingConfig.IMSI_MASK_SHOW_LAST
        return imsi[:3] + LoggingConfig.MASK_CHAR * (len(imsi) - show - 3) + imsi[-show:]
    
    def mask_msisdn(self, msisdn: str) -> str:
        """Mask MSISDN showing prefix and last digits."""
        if not msisdn:
            return ''
        
        # Remove + and spaces for processing
        clean = msisdn.replace('+', '').replace(' ', '').replace('-', '')
        
        if len(clean) < 7:
            return msisdn  # Too short to mask meaningfully
        
        # Keep country code (first 2-3), mask middle, keep last 4
        prefix_len = min(3, len(clean) - 5)
        suffix_len = min(4, len(clean) - prefix_len - 1)
        
        masked = (clean[:prefix_len] + 
                  LoggingConfig.MASK_CHAR * (len(clean) - prefix_len - suffix_len) + 
                  clean[-suffix_len:])
        
        # Reformat with original formatting
        if msisdn.startswith('+'):
            masked = '+' + masked
        
        return masked
    
    def mask_imei(self, imei: str) -> str:
        """Mask IMEI showing only last 4 digits."""
        if not imei or len(imei) < 4:
            return imei or ''
        return LoggingConfig.MASK_CHAR * (len(imei) - 4) + imei[-4:]
    
    def mask_iccid(self, iccid: str) -> str:
        """Mask ICCID showing only last 4 digits."""
        if not iccid or len(iccid) < 4:
            return iccid or ''
        return LoggingConfig.MASK_CHAR * (len(iccid) - 4) + iccid[-4:]
    
    def mask_full(self, value: str) -> str:
        """Fully mask a value (for passwords, secrets)."""
        if not value:
            return ''
        return LoggingConfig.MASK_CHAR * min(len(value), 12)
    
    def mask_value(self, field_name: str, value: Any) -> Any:
        """
        Mask a value based on field name.
        
        Returns original value if field is not sensitive.
        Recursively handles dictionaries and lists.
        """
        if value is None:
            return None
        
        field_lower = field_name.lower().replace('_', '').replace('-', '')
        
        # Handle string values
        if isinstance(value, str):
            # Check each sensitive field type
            if 'imsi' in field_lower:
                return self.mask_imsi(value)
            elif 'msisdn' in field_lower or 'phone' in field_lower:
                return self.mask_msisdn(value)
            elif 'imei' in field_lower:
                return self.mask_imei(value)
            elif 'iccid' in field_lower or 'sim' in field_lower:
                return self.mask_iccid(value)
            elif any(s in field_lower for s in ['password', 'secret', 'token', 'apikey', 'api_key']):
                return self.mask_full(value)
            
            return value
        
        # Handle dictionaries recursively
        elif isinstance(value, dict):
            return {k: self.mask_value(k, v) for k, v in value.items()}
        
        # Handle lists recursively
        elif isinstance(value, list):
            return [self.mask_value(f'{field_name}[]', item) for item in value]
        
        return value
    
    def mask_log_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Mask all sensitive fields in a log data dictionary."""
        return {k: self.mask_value(k, v) for k, v in data.items()}


# Global instance
_masker = DataMasker()

def mask_sensitive(field_name: str, value: Any) -> Any:
    """Convenience function to mask a single field's value."""
    return _masker.mask_value(field_name, value)

def mask_log_data(data: Dict[str, Any]) -> Dict[str, Any]:
    """Convenience function to mask all sensitive data in a dictionary."""
    return _masker.mask_log_data(data)


# =============================================================================
# STRUCTURED LOG FORMATTER
# =============================================================================

class StructuredFormatter(logging.Formatter):
    """
    Custom JSON formatter for structured logging.
    
    Outputs consistent JSON format with all required fields.
    """
    
    def __init__(self, service_name: Optional[str] = None):
        super().__init__()
        self.service_name = service_name or LoggingConfig.SERVICE_NAME
        self.hostname = socket.gethostname()
    
    def format(self, record: logging.LogRecord) -> str:
        """Format log record as JSON."""
        # Build base log entry
        log_entry = {
            'timestamp': datetime.now(timezone.utc).isoformat(timespec='milliseconds').replace('+00:00', 'Z'),
            'service': self.service_name,
            'level': record.levelname,
            'trace_id': TraceContext.get_trace_id() or 'no-trace',
            'message': record.getMessage(),
            'host': self.hostname,
            'environment': LoggingConfig.ENVIRONMENT,
            'version': LoggingConfig.VERSION,
            'syslog_severity': LoggingConfig.SYSLOG_LEVELS.get(record.no, 6),
        }
        
        # Add standard logging fields if available
        if hasattr(record, 'funcName'):
            log_entry['function'] = record.funcName
        if hasattr(record, 'lineno'):
            log_entry['line'] = record.lineno
        if hasattr(record, 'module'):
            log_entry['module'] = record.module
        
        # Add exception info if present
        if record.exc_info and record.exc_info[0]:
            log_entry['exception'] = {
                'type': record.exc_info[0].__name__,
                'message': str(record.exc_info[1]),
            }
        
        # Add custom extra fields with sensitive data masking
        extra_fields = {}
        standard_attrs = {
            'name', 'msg', 'args', 'created', 'filename', 'funcName',
            'levelname', 'levelno', 'lineno', 'module', 'pathname',
            'process', 'processName', 'thread', 'threadName', 'exc_info',
            'exc_text', 'stack_info', 'taskName', 'message'
        }
        
        for key, value in record.__dict__.items():
            if key not in standard_attrs and not key.startswith('_'):
                extra_fields[key] = value
        
        # Mask sensitive data in extra fields
        if extra_fields:
            log_entry.update(_masker.mask_log_data(extra_fields))
        
        # Ensure JSON serialization
        try:
            return json.dumps(log_entry, default=str, ensure_ascii=False)
        except TypeError:
            return json.dumps({'error': 'Log serialization failed', 'raw_message': str(log_entry)})


# =============================================================================
# LOGGER FACTORY
# =============================================================================

@lru_cache(maxsize=32)
def get_logger(service_name: Optional[str] = None, 
               log_level: Optional[str] = None,
               enable_console: bool = True,
               enable_file: bool = False,
               log_file_path: Optional[str] = None) -> logging.Logger:
    """
    Get a configured logger with structured JSON output.
    
    Args:
        service_name: Name for the service (used in log entries)
        log_level: Override default log level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        enable_console: Enable console (stderr) output
        enable_file: Enable file output
        log_file_path: Path for log file (default: /var/log/soc/{service_name}.log)
    
    Returns:
        Configured logger instance with structured formatter
    
    Example:
        >>> logger = get_logger("ss7-collector")
        >>> logger.info("Processing message", extra={"protocol": "M3UA", "imsi": "603021200000001"})
        {"timestamp":"...","service":"ss7-collector","level":"INFO","trace_id":"...","message":"Processing message","protocol":"M3UA","imsi":"603021******0001",...}
    """
    service_name = service_name or LoggingConfig.SERVICE_NAME
    log_level = log_level or LoggingConfig.LOG_LEVEL
    
    # Create logger
    logger = logging.getLogger(service_name)
    logger.setLevel(getattr(logging, log_level.upper(), logging.INFO))
    
    # Prevent duplicate handlers
    if logger.handlers:
        return logger
    
    # Create formatter
    formatter = StructuredFormatter(service_name)
    
    # Console handler
    if enable_console:
        console_handler = logging.StreamHandler()
        console_handler.setLevel(logging.DEBUG)
        console_handler.setFormatter(formatter)
        logger.addHandler(console_handler)
    
    # File handler
    if enable_file:
        log_path = log_file_path or f"/var/log/soc/{service_name}.log"
        
        # Ensure directory exists
        log_dir = os.path.dirname(log_path)
        if log_dir and not os.path.exists(log_dir):
            os.makedirs(log_dir, exist_ok=True)
        
        file_handler = logging.FileHandler(log_path)
        file_handler.setLevel(logging.DEBUG)
        file_handler.setFormatter(formatter)
        logger.addHandler(file_handler)
    
    return logger


# =============================================================================
# KAFKA INTEGRATION HELPERS
# =============================================================================

def create_kafka_headers_with_trace(
    existing_headers: Optional[Dict] = None,
    additional_context: Optional[Dict] = None
) -> Dict:
    """
    Create Kafka message headers with trace ID for propagation.
    
    This should be called when producing messages to Kafka to ensure
    trace continuity across services.
    
    Args:
        existing_headers: Existing headers to preserve
        additional_context: Additional context to add
    
    Returns:
        Dictionary with trace headers ready for Kafka
    
    Example:
        >>> producer.produce(topic, value, headers=create_kafka_headers_with_trace())
    """
    trace_id = TraceContext.get_trace_id() or TraceContext.generate_trace_id()
    
    headers = {
        'trace-id': trace_id,
        'source-service': LoggingConfig.SERVICE_NAME,
        'timestamp': datetime.now(timezone.utc).isoformat(),
        'environment': LoggingConfig.ENVIRONMENT,
    }
    
    if existing_headers:
        headers.update(existing_headers)
    
    if additional_context:
        headers.update(additional_context)
    
    return headers


def process_incoming_kafka_message(
    message_value: bytes,
    message_headers: Optional[Dict] = None
) -> tuple:
    """
    Process incoming Kafka message and establish trace context.
    
    Call this at the start of message processing to maintain trace chain.
    
    Args:
        message_value: Raw message body (bytes)
        message_headers: Headers from Kafka message
    
    Returns:
        Tuple of (parsed_message_dict, trace_id_str)
    
    Example:
        >>> msg_dict, trace_id = process_incoming_kafka_message(msg.value(), msg.headers())
        >>> # ... process message with trace_id already set ...
        >>> clear_trace_id()  # Clean up when done
    """
    import orjson
    
    # Parse message
    try:
        if isinstance(message_value, bytes):
            parsed = orjson.loads(message_value)
        else:
            parsed = message_value
    except Exception:
        parsed = {'raw': message_value.decode('utf-8', errors='replace') if isinstance(message_value, bytes) else str(message_value)}
    
    # Extract or create trace ID
    trace_id = None
    
    # Try headers first
    if message_headers:
        if isinstance(message_headers, dict):
            trace_id = TraceContext.extract_from_kafka_headers(message_headers)
        else:
            # Kafka-python header format: [(key, value), ...]
            try:
                header_dict = {k.decode(): v.decode() if isinstance(v, bytes) else v 
                              for k, v in message_headers}
                trace_id = TraceContext.extract_from_kafka_headers(header_dict)
            except Exception:
                pass
    
    # Try message body
    if not trace_id and isinstance(parsed, dict):
        trace_id = parsed.get('trace_id') or parsed.get('traceId')
    
    # Set trace context
    TraceContext.set_trace_id(trace_id)
    
    return parsed, trace_id or TraceContext.get_trace_id()


# =============================================================================
# SERVICE-SPECIFIC WRAPPERS
# =============================================================================

class SS7CollectorLogger:
    """Pre-configured logger wrapper for ss7-collector service."""
    
    def __init__(self):
        self.logger = get_logger("ss7-collector")
        self.service = "ss7-collector"
    
    def log_capture(self, protocol: str, source_ip: str, destination_ip: str,
                    packet_size: int, imsi: Optional[str] = None, **kwargs):
        """Log captured signaling packet."""
        self.logger.info("signaling_packet_captured", extra={
            'protocol': protocol,
            'source_ip': source_ip,
            'destination_ip': destination_ip,
            'packet_size': packet_size,
            'imsi': imsi,
            **kwargs
        })
    
    def log_decode_error(self, raw_data: bytes, error: str):
        """Log packet decoding failure."""
        self.logger.warning("packet_decode_failed", extra={
            'error': error,
            'data_length': len(raw_data),
            'data_preview': raw_data[:32].hex() if raw_data else None
        })


class SS7AnalyzerLogger:
    """Pre-configured logger wrapper for ss7-analyzer service."""
    
    def __init__(self):
        self.logger = get_logger("ss7-analyzer")
        self.service = "ss7-analyzer"
    
    def log_rule_match(self, rule_name: str, severity: str, imsi: Optional[str],
                       indicators: List[str], **kwargs):
        """Log when a detection rule matches."""
        self.logger.info("rule_matched", extra={
            'rule_name': rule_name,
            'severity': severity,
            'imsi': imsi,
            'indicator_count': len(indicators),
            **kwargs
        })
    
    def log_alert_generated(self, alert_id: str, rule_name: str, severity: str):
        """Log alert generation."""
        self.logger.warning("alert_generated", extra={
            'alert_id': alert_id,
            'rule_name': rule_name,
            'severity': severity
        })


class DiameterMonitorLogger:
    """Pre-configured logger wrapper for diameter-monitor service."""
    
    def __init__(self):
        self.logger = get_logger("diameter-monitor")
        self.service = "diameter-monitor"
    
    def log_ulr_storm_detected(self, imsi: str, rate_per_sec: float, threshold: int):
        """Log ULR storm detection event."""
        self.logger.critical("ulr_storm_detected", extra={
            'imsi': imsi,
            'rate_per_second': round(rate_per_sec, 2),
            'threshold': threshold,
            'attack_type': 'hss_dos_flood'
        })
    
    def log_auth_failure(self, imsi: Optional[str], result_code: int, app_name: str):
        """Log Diameter authentication failure."""
        self.logger.warning("diameter_auth_failure", extra={
            'imsi': imsi,
            'result_code': result_code,
            'result_name': get_result_code_name(result_code),
            'application': app_name
        })


# Import helper for result code lookup (defined in diameter_monitor)
def get_result_code_name(code: int) -> str:
    """Fallback result code lookup if not importing from diameter_monitor."""
    # Common codes - extend as needed
    codes = {
        2001: "DIAMETER_SUCCESS",
        5001: "DIAMETER_AUTH_REJECTED",
        5012: "DIAMETER_AVP_OCCURRS_TOO_MANY_TIMES",
        5420: "DIAMETER_ERROR_USER_UNKNOWN",
        4181: "DIAMETER_ERROR_ROAMING_NOT_ALLOWED",
    }
    return codes.get(code, f"UNKNOWN_CODE_{code}")


# =============================================================================
# INITIALIZATION HELPER
# =============================================================================

def init_logging(service_name: str, 
                 log_level: Optional[str] = None,
                 log_to_file: bool = False,
                 log_directory: str = "/var/log/soc"):
    """
    Initialize logging for a service. Call once at service startup.
    
    Args:
        service_name: Name of the service
        log_level: Log level (default from env or INFO)
        log_to_file: Enable file logging
        log_directory: Directory for log files
    
    Usage:
        # At top of __main__.py or main():
        from soc_logging import init_logging, get_logger
        
        init_logging("ss7-collector", log_to_file=True)
        logger = get_logger()
    """
    # Update global config
    LoggingConfig.SERVICE_NAME = service_name
    if log_level:
        LoggingConfig.LOG_LEVEL = log_level.upper()
    
    # Create log directory if needed
    if log_to_file and not os.path.exists(log_directory):
        os.makedirs(log_directory, exist_ok=True)
    
    # Get and return logger
    return get_logger(
        service_name=service_name,
        log_level=log_level,
        enable_file=log_to_file,
        log_file_path=os.path.join(log_directory, f"{service_name}.log") if log_to_file else None
    )


# =============================================================================
# EXPORTS
# =============================================================================

__all__ = [
    # Main functions
    'get_logger',
    'init_logging',
    'set_trace_id',
    'get_trace_id',
    'clear_trace_id',
    'mask_sensitive',
    'mask_log_data',
    
    # Kafka helpers
    'create_kafka_headers_with_trace',
    'process_incoming_kafka_message',
    
    # Service-specific loggers
    'SS7CollectorLogger',
    'SS7AnalyzerLogger',
    'DiameterMonitorLogger',
    
    # Configuration
    'LoggingConfig',
    'TraceContext',
    'DataMasker',
]

# Module-level initialization info
__version__ = '1.0.0'
__author__ = 'Djezzy SOC Platform Team'
__remediation__ = 'MED-003'
