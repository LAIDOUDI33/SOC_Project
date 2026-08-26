"""
REMEDIATION MED-001: Standardized Logging Configuration for Djezzy SOC Platform

This module provides unified structured logging configuration for all services:
- JSON format output for machine parsing
- Consistent field names across services
- Trace ID propagation support
- Log level configuration via environment
- Sensitive data masking

Usage:
    from soc_logging import get_logger, init_logging
    
    # Initialize once at startup
    init_logging(service_name="ss7-collector", environment="production")
    
    # Get logger for current module
    logger = get_logger(__name__)
    
    logger.info("service_started", extra={
        "port": 7000,
        "version": "1.0.0",
        "trace_id": "abc123"
    })
"""

import json
import logging
import os
import sys
import time
import traceback
from datetime import datetime, timezone
from typing import Any, Dict, Optional
from functools import wraps


# =============================================================================
# Standard Field Names (consistent across all services)
# =============================================================================

STANDARD_FIELDS = {
    'timestamp': '@timestamp',       # ISO 8601 UTC
    'level': 'log.level',            # INFO, WARN, ERROR, etc.
    'service': 'service.name',        # e.g., ss7-collector, kafka-0
    'environment': 'environment',     # production, staging, development
    'host': 'host.hostname',          # Container hostname
    'message': 'message',             # Log message
    'logger': 'log.logger',           # Module/logger name
    'trace_id': 'trace.id',           # Distributed trace ID
    'span_id': 'span.id',             # Span within trace
    'error': 'error.message',         # Error message if any
    'stack_trace': 'error.stack_trace',  # Full stack trace
}

# Fields to mask for PII protection
SENSITIVE_FIELDS = [
    'imsi', 'msisdn', 'imei', 'password', 'secret', 'token', 'key',
    'credit_card', 'ssn', 'api_key'
]


class SOCJSONFormatter(logging.Formatter):
    """
    Custom JSON formatter implementing Djezzy SOC logging standard.
    
    Output format:
    {
        "@timestamp": "2026-08-03T15:30:00.000Z",
        "log.level": "INFO",
        "service.name": "ss7-collector",
        "environment": "production",
        "host.hostname": "djezzy-ss7-collector-abc123",
        "message": "SS7 message processed successfully",
        "log.logger": "ss7_collector.capture",
        "trace.id": "abc-def-123456",
        "custom_field": "value"
    }
    """
    
    def __init__(
        self,
        service_name: str = "unknown-service",
        environment: str = "production",
        **kwargs
    ):
        super().__init__(**kwargs)
        self.service_name = service_name
        self.environment = environment
        self.hostname = os.environ.get('HOSTNAME', os.uname()[1])
        
    def format(self, record: logging.LogRecord) -> str:
        """
        Format log record as JSON with standard fields.
        """
        # Create base log entry with standard fields
        log_entry = {
            STANDARD_FIELDS['timestamp']: datetime.now(timezone.utc).isoformat(),
            STANDARD_FIELDS['level']: record.levelname,
            STANDARD_FIELDS['service']: self.service_name,
            STANDARD_FIELDS['environment']: self.environment,
            STANDARD_FIELDS['host']: self.hostname,
            STANDARD_FIELDS['message']: record.getMessage(),
            STANDARD_FIELDS['logger']: record.name,
        }
        
        # Add trace context if available
        trace_id = getattr(record, 'trace_id', None)
        if trace_id:
            log_entry[STANDARD_FIELDS['trace_id']] = trace_id
        
        span_id = getattr(record, 'span_id', None)
        if span_id:
            log_entry[STANDARD_FIELDS['span_id']] = span_id
        
        # Add error information for exceptions
        if record.exc_info and record.exc_info[0] is not None:
            exc_type, exc_value, exc_tb = record.exc_info
            log_entry[STANDARD_FIELDS['error']] = str(exc_value)
            log_entry[STANDARD_FIELDS['stack_trace']] = ''.join(
                traceback.format_exception(exc_type, exc_value, exc_tb)
            )
        
        # Add any extra fields from the log call
        extra = getattr(record, '__dict__', {})
        for key, value in extra.items():
            if key not in ('name', 'msg', 'args', 'created', 'exc_info', 
                          'exc_text', 'stack_info', 'lineno', 'funcName',
                          'module', 'threadName', 'processName', 'thread',
                          'process', 'levelname', 'levelno', 'pathname',
                          'filename', 'sinfo', 'message', '__dict__'):
                # Mask sensitive fields
                if any(sensitive in key.lower() for sensitive in SENSITIVE_FIELDS):
                    value = self._mask_sensitive(value)
                
                # Use dot notation for nested fields
                clean_key = key.replace('_', '.')
                log_entry[clean_key] = value
        
        return json.dumps(log_entry, default=str, ensure_ascii=False)
    
    @staticmethod
    def _mask_sensitive(value: Any) -> str:
        """Mask sensitive values, showing only first/last characters."""
        value_str = str(value)
        if len(value_str) <= 8:
            return '****'
        return f"{value_str[:2]}...{value_str[-2:]}"


class SOCSensitiveDataFilter(logging.Filter):
    """Filter to automatically detect and mask sensitive data in log messages."""
    
    def __init__(self):
        super().__init__('sensitive_data_filter')
        # Patterns that might contain sensitive data
        self.sensitive_patterns = [
            ('IMSI', r'IMSI\s*[:=]\s*(\d{15})'),
            ('MSISDN', r'(?:\+?213|00213|0)?([5-7]\d{8})'),
            ('IMEI', r'IMEI\s*[:=]\s*(\d{15})'),
            ('API Key', r'(?:key|token|secret)\s*[:=]\s*(\S{10,})'),
        ]
    
    def filter(self, record: logging.LogRecord) -> bool:
        """Apply masking to detected sensitive data."""
        import re
        
        msg = record.getMessage()
        masked_msg = msg
        
        for pattern_type, pattern in self.sensitive_patterns:
            matches = re.findall(pattern, msg, re.IGNORECASE)
            for match in matches:
                if len(str(match)) > 4:
                    masked_msg = masked_msg.replace(
                        str(match), 
                        f"{str(match)[:2]}{'*' * (len(str(match)) - 4)}{str(match)[-2:]}"
                    )
        
        # Store masked message
        if masked_msg != msg:
            record.msg = masked_msg
            
        return True


def init_logging(
    service_name: str,
    environment: str = "production",
    log_level: str = None,
    log_file: str = None,
    enable_json: bool = True,
    enable_console: bool = True,
) -> logging.Logger:
    """
    Initialize standardized logging for a service.
    
    Args:
        service_name: Name of the service (e.g., ss7-collector, kafka-0)
        environment: Environment name (production, staging, development)
        log_level: Log level (DEBUG, INFO, WARNING, ERROR). Falls back to LOG_LEVEL env var.
        log_file: Optional file path for log output
        enable_json: Use JSON formatter (True recommended for production)
        enable_console: Also output to console/stdout
    
    Returns:
        Configured root logger instance
    """
    # Determine log level from parameter or environment
    if not log_level:
        log_level = os.environ.get('LOG_LEVEL', 'INFO')
    
    # Validate log level
    numeric_level = getattr(logging, log_level.upper(), logging.INFO)
    
    # Get root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(numeric_level)
    
    # Remove existing handlers to avoid duplicates
    root_logger.handlers.clear()
    
    # Add sensitive data filter
    sensitive_filter = SOCSensitiveDataFilter()
    root_logger.addFilter(sensitive_filter)
    
    if enable_json:
        # JSON formatter for production/machine consumption
        json_formatter = SOCJSONFormatter(
            service_name=service_name,
            environment=environment,
            datefmt='%Y-%m-%dT%H:%M:%S.%fZ'
        )
        
        # Console handler with JSON
        if enable_console:
            console_handler = logging.StreamHandler(sys.stdout)
            console_handler.setLevel(numeric_level)
            console_handler.setFormatter(json_formatter)
            console_handler.addFilter(sensitive_filter)
            root_logger.addHandler(console_handler)
        
        # File handler with JSON (if specified)
        if log_file:
            file_handler = logging.FileHandler(log_file)
            file_handler.setLevel(numeric_level)
            file_handler.setFormatter(json_formatter)
            file_handler.addFilter(sensitive_filter)
            root_logger.addHandler(file_handler)
    
    else:
        # Human-readable formatter for development
        dev_formatter = logging.Formatter(
            fmt='%(asctime)s [%(levelname)s] %(name)s: %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
        
        if enable_console:
            console_handler = logging.StreamHandler(sys.stdout)
            console_handler.setLevel(numeric_level)
            console_handler.setFormatter(dev_formatter)
            root_logger.addHandler(console_handler)
    
    # Configure common libraries to use our log level
    logging.getLogger('kafka').setLevel(logging.WARNING)
    logging.getLogger('urllib3').setLevel(logging.WARNING)
    logging.getLogger('asyncio').setLevel(logging.WARNING)
    
    # Log initialization complete
    logger = logging.getLogger(service_name)
    logger.info(
        "logging_initialized",
        extra={
            'service': service_name,
            'environment': environment,
            'log_level': log_level,
            'json_format': enable_json,
            'python_version': sys.version.split()[0],
        }
    )
    
    return root_logger


def get_logger(name: str) -> logging.Logger:
    """
    Get a logger instance with the given name.
    
    Args:
        name: Logger/module name (typically __name__)
    
    Returns:
        Logger instance
    """
    return logging.getLogger(name)


class TraceContext:
    """
    Context manager for adding trace IDs to log messages.
    
    Usage:
        with TraceContext(trace_id='abc123', span_id='span456') as ctx:
            logger.info('processing_request', extra=ctx.to_dict())
    """
    
    def __init__(self, trace_id: str = None, span_id: str = None):
        self.trace_id = trace_id or _generate_id()
        self.span_id = span_id or _generate_id()
    
    def to_dict(self) -> Dict[str, str]:
        return {
            'trace_id': self.trace_id,
            'span_id': self.span_id,
        }
    
    def __enter__(self):
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        return False


def _generate_id(length: int = 16) -> str:
    """Generate a random ID string."""
    import secrets
    alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789'
    return ''.join(secrets.choice(alphabet) for _ in range(length))


def timed_operation(logger: logging.Logger, operation_name: str):
    """
    Decorator to log operation timing.
    
    Usage:
        @timed_operation(logger, 'database_query')
        def fetch_user(user_id):
            # ... operation
            pass
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            start_time = time.time()
            
            logger.debug(
                'operation_started',
                extra={
                    'operation': operation_name,
                    'function': func.__name__,
                }
            )
            
            try:
                result = func(*args, **kwargs)
                duration_ms = (time.time() - start_time) * 1000
                
                logger.info(
                    'operation_completed',
                    extra={
                        'operation': operation_name,
                        'function': func.__name__,
                        'duration_ms': round(duration_ms, 2),
                    }
                )
                
                return result
                
            except Exception as e:
                duration_ms = (time.time() - start_time) * 1000
                
                logger.error(
                    'operation_failed',
                    extra={
                        'operation': operation_name,
                        'function': func.__name__,
                        'duration_ms': round(duration_ms, 2),
                        'error': str(e),
                    },
                    exc_info=True
                )
                raise
        
        return wrapper
    return decorator


# Export public API
__all__ = [
    'init_logging',
    'get_logger',
    'TraceContext',
    'timed_operation',
    'SOCJSONFormatter',
    'SOCSensitiveDataFilter',
    'STANDARD_FIELDS',
    'SENSITIVE_FIELDS',
]
