"""
Djezzy SOC - Diameter Protocol Monitor
Monitors LTE/EPS Diameter interfaces (S6a, Gx, Rx, Cx) for security anomalies.
"""

import asyncio
import json
import logging
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional

import orjson
import yaml
from confluent_kafka import Consumer, Producer, KafkaError
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings

# Configure structured logging (SOC Platform Standard - MED-003)
# Uses standardized JSON format with trace ID propagation and sensitive data masking
import sys
import os

# Add project root to path for logging module import
sys.path.insert(0, '/app')  # Docker container path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../..'))

try:
    # Import SOC standardized logging module
    from config.logging.structured_logging import (
        init_logging, get_logger, set_trace_id, get_trace_id, clear_trace_id,
        process_incoming_kafka_message, create_kafka_headers_with_trace,
        DiameterMonitorLogger, mask_sensitive, mask_log_data
    )
    
    # Initialize with service name and file logging
    logger = init_logging(
        service_name="diameter-monitor",
        log_level=os.getenv('LOG_LEVEL', 'INFO'),
        log_to_file=True,  # Enable file logging in production
        log_directory="/var/log/soc"
    )
    
    # Create specialized Diameter monitor logger with domain-specific methods
    diam_log = DiameterMonitorLogger()
    
except ImportError:
    # Fallback to basic structlog if SOC module not available (development mode)
    import structlog
    
    structlog.configure(
        processors=[
            structlog.stdlib.filter_by_level,
            structlog.add_log_level,
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.dev.ConsoleRenderer(),
        ],
        wrapper_class=structlog.stdlib.BoundLogger,
        cache_logger_on_first_use=True,
    )
    
    logger = structlog.get_logger()
    
    # Create fallback wrapper class
    class DiameterMonitorLogger:
        def __init__(self):
            self.logger = logger
        def log_ulr_storm_detected(self, **kwargs):
            self.logger.critical("ulr_storm_detected", **kwargs)
        def log_auth_failure(self, **kwargs):
            self.logger.warning("diameter_auth_failure", **kwargs)
    
    diam_log = DiameterMonitorLogger()


class Settings(BaseSettings):
    host: str = "0.0.0.0"
    port: int = 8001
    diameter_listen_port: int = 3869
    realm: str = "djezzy.dz"
    host_name: str = "diameter-monitor.djezzy.dz"
    
    kafka_bootstrap_servers: str = "kafka-broker-1:9092,kafka-broker-2:9092,kafka-broker-3:9092"
    input_topic: str = "ss7-raw-events"
    output_topic: str = "diameter-alerts"
    consumer_group: str = "diameter-monitor-group"
    
    class Config:
        env_prefix = "DIAMETER_"


settings = Settings()

app = FastAPI(
    title="Djezzy SOC - Diameter Monitor",
    description="LTE/EPS Diameter interface security monitoring",
    version="1.0.0",
)


class AlertSeverity(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


@dataclass
class DiameterAlert:
    alert_id: str
    rule_name: str
    severity: AlertSeverity
    title: str
    description: str
    source_message: Dict
    timestamp: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    indicators: List[str] = field(default_factory=list)
    
    def to_dict(self) -> Dict:
        return {
            "alert_id": self.alert_id,
            "rule_name": self.rule_name,
            "severity": self.severity.value,
            "title": self.title,
            "description": self.description,
            "timestamp": self.timestamp.isoformat(),
            "source_message": self.source_message,
            "indicators": self.indicators,
        }


# Application IDs for LTE interfaces
LTE_APPLICATIONS = {
    16777236: "S6a",   # HSS-MME (subscriber location, auth)
    16777237: "S6d",   # HSS-SGSN
    16777250: "Cx",    # IMS HSS-CSCF
    16777251: "Dx",    # IMS HSS-AS
    16777264: "Sh",    # UDR-HSS/AS
    16777265: "Dh",    # UDR-AS
    16777221: "SGd",   # AS-SGSN
    16777250: "Gx",    # PCRF-PCEF (policy)
    16777238: "Rx",    # AF-PCRF
    16777251: "S13",   # EIR-MME (IMEI check)
    16777263: "SLh",   # GMLC-HSS
}

# Result codes (RFC 3588 + 3GPP TS 29.329)
# REMEDIATION FIX: Removed duplicate keys that were causing incorrect lookups
# Previous bug: 5001 and 5012 appeared twice, with second value overwriting first
DIAMETER_RESULT_CODES = {
    # === SUCCESS (2xxx) ===
    2001: "DIAMETER_SUCCESS",
    2002: "DIAMETER_MULTI_ROUND_ANSWER",
    
    # === PROTOCOL ERRORS (3xxx) ===
    3001: "DIAMETER_COMMAND_NOT_SUPPORTED",
    3002: "DIAMETER_UNABLE_TO_DELIVER",
    3003: "DIAMETER_REALM_NOT_SERVED",
    3004: "DIAMETER_TOO_BUSY",
    3005: "DIAMETER_LOOP_DETECTED",
    3007: "DIAMETER_APPLICATION_UNSUPPORTED",
    3010: "DIAMETER_INVALID_HDR_BITS",
    3011: "DIAMETER_INVALID_MSG_LENGTH",
    3013: "DIAMETER_TIMEOUT",
    
    # === GENERIC FAILURES (5xxx) ===
    5001: "DIAMETER_AUTH_REJECTED",
    5003: "DIAMETER_ERROR_IDENTITIES_DONT_MATCH",  # Was duplicate, now unique
    5004: "DIAMETER_UNABLE_TO_COMPLY",
    5005: "DIAMETER_INVALID_AVP_VALUE",
    5008: "DIAMETER_MISSING_AVP",
    5009: "DIAMETER_RESOURCES_EXCEEDED",
    5010: "DIAMETER_CONTRADICTING_AVPS",
    5012: "DIAMETER_AVP_OCCURRS_TOO_MANY_TIMES",
    5013: "DIAMETER_AVP_NOT_SUPPORTED",
    5014: "DIAMETER_UNKNOWN_PEER",
    5017: "DIAMETER_UNSUPPORTED_QOS",
    5018: "DIAMETER_MISSING_ROUTE_RECORD",
    5019: "DIAMETER_INVALID_DESTINATION_HOST",
    5020: "DIAMETER_INVALID_DESTINATION_REALM",
    
    # === 3GPP-SPECIFIC RESULT CODES (TS 29.329) ===
    # S6a/HSS Interface Errors
    # NOTE: Codes 5001, 5012 defined above in generic section - do not duplicate here
    4181: "DIAMETER_ERROR_ROAMING_NOT_ALLOWED",
    5011: "DIAMETER_AUTHENTICATION_DATA_UNAVAILABLE",  # Fixed: was incorrectly using 5001
    5060: "DIAMETER_ERROR_USER_UNKNOWN",  # Fixed: was incorrectly using 5012
    
    # Additional 3GPP-specific codes
    5420: "DIAMETER_ERROR_USER_UNKNOWN_S6A",  # S6a specific alias (kept for backward compat)
    5030: "DIAMETER_ERROR_RAT_NOT_ALLOWED",
    5040: "DIAMETER_ERROR_ILLEGAL_EQUIPMENT",
    5050: "DIAMETER_ERROR_UNKNOWN_SERVICEDS",
    5061: "DIAMETER_ERROR_ABSENT_USER",
    5062: "DIAMETER_ERROR_ERROR_USER_NO_GPRS_DATA_SUBSCRIPTION",
    5063: "DIAMETER_ERROR_ROAMING_NOT_ALLOWED_IN_THIS_TRACKING_AREA",
    5064: "DIAMETER_ERROR_NO_SUBSCRIPTION_TO_SERVICEDS",
    5065: "DIAMETER_ERROR_SUBSCRIPTION_DEPLETED",
    5066: "DIAMETER_ERROR_LL_ONLY_SUBSCRIPTION",
    5067: "DIAMETER_ERROR_PLMN_NOT_ALLOWED",
    5068: "DIAMETER_ERROR_AREA_NOT_ALLOWED",
    5069: "DIAMETER_ERROR_ROAMING_NOT_ALLOWED_IN_THIS_LOCATION_AREA",
    5070: "DIAMETER_ERROR_NO_ROAMING_AGREEMENT",
    5071: "DIAMETER_ERROR_MSISDN_NOT_KNOWN_IN_HSS",
    5072: "DIAMETER_ERROR_NON_EXISTENT_PDN_CONTEXT",
    5073: "DIAMETER_ERROR_MULTIPLE_PDN_CONTEXTS_FOR_THE GIVEN_APN_AND_APNI",
    5074: "DIAMETER_ERROR_CONFLICTING_REQUESTS",
    5075: "DIAMETER_ERROR_AMBR_CHANGE_REJECTED",
    5076: "DIAMETER_ERROR_INCORRECT_MAX_REQUESTED_BANDWIDTH_UE",
    5077: "DIAMETER_ERROR_CSFB_NOT_SUPPORTED_BY_REMOTE_NODE",
    5078: "DIAMETER_ERROR_CSFB_FAILED_DUE_TO_INTERNAL_ERROR",
    5079: "DIAMETER_ERROR_CSFB_TEMPORARILY_UNAVAILABLE",
    5080: "DIAMETER_ERROR_SUBSCRIBER_ILLEGAL_FOR_SERVICE",
    5081: "DIAMETER_ERROR_UNKOWN_BSSID",
    5082: "DIAMETER_ERROR_UNKNOWN_EPS_SUBSCRIPTION",
    5083: "DIAMETER_ERROR_UNKNOWN_NON_3GPP_ACCESS_TYPE",
    5084: "DIAMETER_ERROR_UE_NOT_RESPONDING",
    5085: "DIAMETER_ERROR_UE_NOT_REACHABLE_FOR Paging",
    5086: "DIAMETER_ERROR_CONDITIONAL_IE_MISSING",
    5087: "DIAMETER_ERROR_CONDITIONAL_IE_ERROR",
    5088: "DIAMETER_ERROR_PDN_IPV4_ADDRESS_ALLOCATION_FAILURE",
    5089: "DIAMETER_ERROR_PDN_IPV6_PREFIX_ALLOCATION_FAILURE",
    5090: "DIAMETER_ERROR_PDN_IPV4V6_ADDRESS_ALLOCATION_FAILURE",
}

# Reverse lookup helper for debugging
def get_result_code_name(code: int) -> str:
    """Get human-readable name for result code, with fallback."""
    return DIAMETER_RESULT_CODES.get(code, f"UNKNOWN_RESULT_CODE_{code}")


stats = {
    "messages_processed": 0,
    "alerts_generated": 0,
    "errors": 0,
    "start_time": time.time(),
}

# =============================================================================
# REMEDIATION HIGH-001: ULR Storm Detection - Sliding Window Implementation
# =============================================================================

class SlidingWindowRateLimiter:
    """
    Sliding window rate limiter for detecting Diameter message floods.
    
    Tracks message counts within configurable time windows to detect:
    - ULR (User Location Register) storms indicating HSS DoS
    - Authentication flood attacks
    - Abnormal signaling patterns from specific IMSIs or sources
    
    Uses a dictionary of deques for O(1) insert and cleanup operations.
    """
    
    def __init__(self, window_seconds: int = 60, max_requests: int = 100):
        self.window_seconds = window_seconds
        self.max_requests = max_requests
        self.windows: Dict[str, List[float]] = defaultdict(list)
        self._lock = asyncio.Lock()
    
    async def record(self, key: str) -> Dict[str, any]:
        """Record an event and return current statistics."""
        async with self._lock:
            now = time.time()
            window = self.windows[key]
            
            # Add current timestamp
            window.append(now)
            
            # Clean up old entries outside the window
            cutoff = now - self.window_seconds
            self.windows[key] = [t for t in window if t > cutoff]
            
            current_count = len(self.windows[key])
            is_exceeded = current_count > self.max_requests
            
            return {
                "key": key,
                "current_count": current_count,
                "max_allowed": self.max_requests,
                "window_seconds": self.window_seconds,
                "is_exceeded": is_exceeded,
                "rate_per_second": current_count / self.window_seconds,
            }
    
    async def check_and_alert(
        self, 
        key: str, 
        alert_callback,
        context: Dict = None
    ) -> Optional[Dict]:
        """Check rate and generate alert if threshold exceeded."""
        stats = await self.record(key)
        
        if stats["is_exceeded"]:
            alert = await alert_callback(stats, context)
            return alert
        
        return None
    
    def get_all_stats(self) -> Dict[str, Dict]:
        """Get statistics for all tracked keys."""
        now = time.time()
        result = {}
        
        for key, window in self.windows.items():
            cutoff = now - self.window_seconds
            clean_window = [t for t in window if t > cutoff]
            self.windows[key] = clean_window
            
            result[key] = {
                "current_count": len(clean_window),
                "max_allowed": self.max_requests,
                "is_exceeded": len(clean_window) > self.max_requests,
                "rate_per_second": len(clean_window) / self.window_seconds,
            }
        
        return result


# Global rate limiters for different detection scenarios
ulr_rate_limiter = SlidingWindowRateLimiter(window_seconds=60, max_requests=50)
auth_failure_limiter = SlidingWindowRateLimiter(window_seconds=60, max_requests=20)
global_diameter_limiter = SlidingWindowRateLimiter(window_seconds=60, max_requests=500)


async def create_ulr_storm_alert(rate_stats: Dict, context: Dict = None) -> DiameterAlert:
    """Create an alert for ULR storm detection."""
    imsi = context.get("imsi", "unknown") if context else "unknown"
    source_ip = context.get("source_ip", "unknown") if context else "unknown"
    
    return DiameterAlert(
        alert_id=f"diam_ulr_storm_{int(time.time()*1000000)}",
        rule_name="DIAMETER_ULR_STORM_DETECTED",
        severity=AlertSeverity.CRITICAL,
        title="CRITICAL: ULR Storm Detected on S6a Interface",
        description=(
            f"User Location Register request storm detected. "
            f"Rate: {rate_stats['rate_per_second']:.1f} req/s "
            f"(threshold: {rate_stats['max_allowed']} per {rate_stats['window_seconds']}s). "
            f"This may indicate HSS DoS attack, device cloning, or signaling flood. "
            f"IMSI: {imsi}, Source: {source_ip}"
        ),
        source_message=context or {},
        indicators=[
            f"ULR Rate: {rate_stats['current_count']}/{rate_stats['max_allowed']}",
            f"IMSI: {imsi}",
            f"Threshold Exceeded: {rate_stats['current_count'] - rate_stats['max_allowed']} requests",
        ],
    )


@app.on_event("startup")
async def startup():
    logger.info("diameter_monitor_startup")
    asyncio.create_task(consumer_task())


@app.on_event("shutdown")
async def shutdown():
    logger.info("diameter_monitor_shutdown")


class HealthResponse(BaseModel):
    status: str = "healthy"
    service: str = "diameter-monitor"
    version: str = "1.0.0"
    uptime_seconds: float = 0.0


@app.get("/health", response_model=HealthResponse)
async def health():
    return HealthResponse(uptime_seconds=time.time() - stats["start_time"])


@app.get("/api/v1/stats")
async def get_stats():
    uptime = time.time() - stats["start_time"]
    return {
        **stats,
        "uptime_seconds": uptime,
        "messages_per_second": stats["messages_processed"] / max(1, uptime),
    }


def analyze_diameter_message(message: Dict) -> Optional[DiameterAlert]:
    """Analyze a single Diameter message for security issues."""
    
    if message.get("protocol") != "diameter":
        return None
    
    app_id = message.get("application_id", 0)
    app_name = LTE_APPLICATIONS.get(app_id, f"Unknown({app_id})")
    msg_type = message.get("message_type", "")
    result_code = message.get("payload", {}).get("result_code")
    imsi = message.get("imsi")
    
    alerts = []
    
    # Rule: Authentication failures on S6a
    if app_name == "S6a" and msg_type == "authenticate-information-answer":
        if result_code and result_code != 2001:
            if result_code in [5001, 5420]:  # Auth rejected / User unknown
                alerts.append(DiameterAlert(
                    alert_id=f"diam_auth_{int(time.time()*1000000)}",
                    rule_name="DIAMETER_S6A_AUTH_FAILURE",
                    severity=AlertSeverity.HIGH if imsi else AlertSeverity.MEDIUM,
                    title=f"S6a Authentication Failure - {DIAMETER_RESULT_CODES.get(result_code, 'Unknown')}",
                    description=f"Authentication failed on S6a interface for IMSI {imsi or 'unknown'} with result code {result_code}",
                    source_message=message,
                    indicators=[f"Result Code: {result_code}", f"Application: {app_name}"],
                ))
    
    # =============================================================================
    # REMEDIATION HIGH-001: ULR Storm Detection with Sliding Window
    # Now uses actual rate limiting instead of placeholder pass statement
    # =============================================================================
    if msg_type == "user-location-register-request" and app_name == "S6a":
        # Create rate limit key combining IMSI and source for granular tracking
        ulr_key = f"ulr_{imsi or 'unknown'}_{message.get('source_ip', 'unknown')}"
        
        # Check rate synchronously (for compatibility with current sync interface)
        import asyncio
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                # If we're already in an async context, create a task
                # For now, do synchronous check as fallback
                ulr_stats = _sync_rate_check(ulr_key, ulr_rate_limiter)
                if ulr_stats and ulr_stats["is_exceeded"]:
                    alerts.append(DiameterAlert(
                        alert_id=f"diam_ulr_storm_{int(time.time()*1000000)}",
                        rule_name="DIAMETER_ULR_STORM_DETECTED",
                        severity=AlertSeverity.CRITICAL,
                        title="CRITICAL: ULR Storm Detected on S6a Interface",
                        description=(
                            f"User Location Register request storm detected. "
                            f"Rate: {ulr_stats['rate_per_second']:.1f} req/s "
                            f"(threshold: {ulr_stats['max_allowed']} per {ulr_stats['window_seconds']}s). "
                            f"This may indicate HSS DoS attack, device cloning, or signaling flood. "
                            f"IMSI: {imsi or 'unknown'}"
                        ),
                        source_message=message,
                        indicators=[
                            f"ULR Rate: {ulr_stats['current_count']}/{ulr_stats['max_allowed']}",
                            f"IMSI: {imsi or 'unknown'}",
                            f"Threshold Exceeded by: {ulr_stats['current_count'] - ulr_stats['max_allowed']} requests",
                        ],
                    ))
        except RuntimeError:
            # No event loop, do sync check
            ulr_stats = _sync_rate_check(ulr_key, ulr_rate_limiter)
            if ulr_stats and ulr_stats["is_exceeded"]:
                alerts.append(create_ulr_storm_alert_sync(ulr_stats, imsi, message))
    
    # Rule: Unknown application ID
    if app_id not in LTE_APPLICATIONS:
        alerts.append(DiameterAlert(
            alert_id=f"diam_unknown_app_{int(time.time()*1000000)}",
            rule_name="DIAMETER_UNKNOWN_APPLICATION",
            severity=AlertSeverity.LOW,
            title=f"Unknown Diameter Application ID: {app_id}",
            description=f"Received Diameter message from unknown application ID {app_id}. May indicate misconfiguration or probing.",
            source_message=message,
            indicators=["Unknown Application ID"],
        ))
    
    # Return highest severity alert or first one
    if alerts:
        severity_order = {
            AlertSeverity.CRITICAL: 4,
            AlertSeverity.HIGH: 3,
            AlertSeverity.MEDIUM: 2,
            AlertSeverity.LOW: 1,
        }
        alerts.sort(key=lambda a: severity_order.get(a.severity, 0), reverse=True)
        return alerts[0]
    
    return None


# Synchronous fallback for rate checking (used when not in async context)
def _sync_rate_check(key: str, limiter: SlidingWindowRateLimiter) -> Optional[Dict]:
    """Synchronous version of rate check for non-async contexts."""
    now = time.time()
    window = limiter.windows[key]
    
    # Add current timestamp
    window.append(now)
    
    # Clean up old entries outside the window
    cutoff = now - limiter.window_seconds
    limiter.windows[key] = [t for t in window if t > cutoff]
    
    current_count = len(limiter.windows[key])
    
    return {
        "key": key,
        "current_count": current_count,
        "max_allowed": limiter.max_requests,
        "window_seconds": limiter.window_seconds,
        "is_exceeded": current_count > limiter.max_requests,
        "rate_per_second": current_count / limiter.window_seconds,
    }


def create_ulr_storm_alert_sync(rate_stats: Dict, imsi: Optional[str], message: Dict) -> DiameterAlert:
    """Synchronous ULR storm alert creation for non-async contexts."""
    return DiameterAlert(
        alert_id=f"diam_ulr_storm_{int(time.time()*1000000)}",
        rule_name="DIAMETER_ULR_STORM_DETECTED",
        severity=AlertSeverity.CRITICAL,
        title="CRITICAL: ULR Storm Detected on S6a Interface",
        description=(
            f"User Location Register request storm detected. "
            f"Rate: {rate_stats['rate_per_second']:.1f} req/s "
            f"(threshold: {rate_stats['max_allowed']} per {rate_stats['window_seconds']}s). "
            f"This may indicate HSS DoS attack, device cloning, or signaling flood. "
            f"IMSI: {imsi or 'unknown'}"
        ),
        source_message=message,
        indicators=[
            f"ULR Rate: {rate_stats['current_count']}/{rate_stats['max_allowed']}",
            f"IMSI: {imsi or 'unknown'}",
            f"Threshold Exceeded by: {rate_stats['current_count'] - rate_stats['max_allowed']} requests",
        ],
    )


async def consumer_task():
    """Consume messages from Kafka and analyze."""
    
    config = {
        'bootstrap.servers': settings.kafka_bootstrap_servers,
        'group.id': settings.consumer_group,
        'auto.offset.reset': 'latest',
        'enable.auto.commit': True,
    }
    
    producer_config = {
        'bootstrap.servers': settings.kafka_bootstrap_servers,
        'client.id': 'diameter-monitor-producer',
    }
    
    consumer = Consumer(config)
    producer = Producer(producer_config)
    
    consumer.subscribe([settings.input_topic])
    
    logger.info("diameter_consumer_started", topic=settings.input_topic)
    
    try:
        while True:
            msg = consumer.poll(timeout=1.0)
            
            if msg is None:
                continue
            
            if msg.error():
                stats["errors"] += 1
                continue
            
            try:
                message = orjson.loads(msg.value())
                
                # Only process diameter messages
                if message.get("protocol") == "diameter":
                    stats["messages_processed"] += 1
                    
                    alert = analyze_diameter_message(message)
                    
                    if alert:
                        alert_json = orjson.dumps(alert.to_dict())
                        producer.produce(
                            topic=settings.output_topic,
                            key=alert.alert_id.encode('utf-8'),
                            value=alert_json,
                        )
                        stats["alerts_generated"] += 1
                        
                        logger.info("diameter_alert_generated",
                                    rule=alert.rule_name,
                                    severity=alert.severity.value)
            
            except Exception as e:
                stats["errors"] += 1
                logger.exception("message_processing_error")
            
            producer.poll(0)
    
    except KeyboardInterrupt:
        pass
    finally:
        producer.flush()
        consumer.close()
        logger.info("diameter_consumer_stopped")


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(app, host=settings.host, port=settings.port)
