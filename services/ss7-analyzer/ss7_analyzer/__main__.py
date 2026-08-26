"""
Djezzy SOC - SS7 Security Analyzer
Real-time analysis of SS7/Diameter messages for attack detection, fraud prevention, and alerting.
"""

import asyncio
import json
import logging
import os
import re
import time
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime, timezone, timedelta
from enum import Enum
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional, Set, Tuple

import orjson
import yaml
from cerberus import Validator
from confluent_kafka import Consumer, Producer, KafkaError, TopicPartition
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
        SS7AnalyzerLogger, mask_sensitive, mask_log_data
    )
    
    # Initialize with service name and file logging
    logger = init_logging(
        service_name="ss7-analyzer",
        log_level=os.getenv('LOG_LEVEL', 'INFO'),
        log_to_file=True,  # Enable file logging in production
        log_directory="/var/log/soc"
    )
    
    # Create specialized SS7 analyzer logger with domain-specific methods
    ss7_log = SS7AnalyzerLogger()
    
except ImportError as e:
    # Fallback to basic structlog if SOC module not available (development mode)
    import structlog
    
    structlog.configure(
        processors=[
            structlog.stdlib.filter_by_level,
            structlog.add_log_level,
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            structlog.dev.ConsoleRenderer(),
        ],
        wrapper_class=structlog.stdlib.BoundLogger,
        context_class=dict,
        logger_factory=structlog.PrintLoggerFactory(),
        cache_logger_on_first_use=True,
    )
    
    logger = structlog.get_logger()
    
    # Create fallback wrapper class
    class SS7AnalyzerLogger:
        def __init__(self):
            self.logger = logger
        def log_rule_match(self, **kwargs):
            self.logger.info("rule_matched", **kwargs)
        def log_alert_generated(self, **kwargs):
            self.logger.warning("alert_generated", **kwargs)
    
    ss7_log = SS7AnalyzerLogger()


# ============== Configuration ==============

class Settings(BaseSettings):
    """Analyzer settings."""
    
    # Server
    host: str = "0.0.0.0"
    port: int = 8000
    
    # Kafka
    kafka_bootstrap_servers: str = "kafka-broker-1:9092,kafka-broker-2:9092,kafka-broker-3:9092"
    input_topic: str = "ss7-raw-events"
    output_topic: str = "ss7-alerts"
    consumer_group: str = "ss7-analyzer-group"
    
    # TheHive integration
    thehive_url: str = "http://thehive:9000"
    thehive_api_key: str = ""
    auto_create_cases: bool = True
    case_severity_map: Dict[str, int] = {"CRITICAL": 4, "HIGH": 3, "MEDIUM": 2, "LOW": 1}
    
    # Rules configuration
    rules_dir: Path = Path("/etc/ss7-analyzer/rules")
    rules_reload_interval_seconds: int = 300
    
    # Detection settings
    enable_ml_detection: bool = False
    anomaly_threshold: float = 0.85
    baseline_window_hours: int = 24
    
    # Rate limiting / blocking
    max_alerts_per_source_per_minute: int = 100
    block_threshold_score: float = 0.95
    
    class Config:
        env_prefix = "SS7_ANALYZER_"
        env_file = "/etc/ss7-analyzer/.env"


settings = Settings()


# ============== Data Models ==============

class AlertSeverity(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class AlertStatus(str, Enum):
    NEW = "new"
    INVESTIGATING = "investigating"
    ESCALATED = "escalated"
    RESOLVED = "resolved"
    FALSE_POSITIVE = "false_positive"


@dataclass
class DetectionRule:
    """A single detection rule definition."""
    name: str
    description: str
    severity: AlertSeverity
    condition: Dict[str, Any]
    action: List[str]
    tags: List[str] = field(default_factory=list)
    mitre_technique: Optional[str] = None
    mitre_tactic: Optional[str] = None
    enabled: bool = True
    
    def matches(self, message: Dict) -> bool:
        """Check if a message matches this rule's conditions."""
        return self._evaluate_condition(self.condition, message)
    
    def _evaluate_condition(self, condition: Dict, message: Dict) -> bool:
        """Recursively evaluate condition tree."""
        if not condition:
            return True
        
        op = condition.get("op", "and")
        
        if op == "and":
            return all(
                self._evaluate_condition(sub_cond, message)
                for sub_cond in condition.get("conditions", [])
            )
        elif op == "or":
            return any(
                self._evaluate_condition(sub_cond, message)
                for sub_cond in condition.get("conditions", [])
            )
        elif op == "not":
            return not self._evaluate_condition(condition.get("condition", {}), message)
        else:
            # Leaf condition - field comparison
            field_path = condition.get("field")
            operator = condition.get("operator", "equals")
            value = condition.get("value")
            
            actual_value = self._get_field_value(message, field_path)
            
            if actual_value is None:
                return False
            
            return self._compare(actual_value, value, operator)
    
    def _get_field_value(self, obj: Dict, path: str) -> Any:
        """Get nested field value using dot notation."""
        keys = path.split(".")
        current = obj
        for key in keys:
            if isinstance(current, dict):
                current = current.get(key)
                if current is None:
                    return None
            else:
                return None
        return current
    
    def _compare(self, actual: Any, expected: Any, operator: str) -> bool:
        """Compare values using specified operator."""
        try:
            if operator == "equals":
                return actual == expected
            elif operator == "not_equals":
                return actual != expected
            elif operator == "contains":
                return expected in str(actual)
            elif operator == "matches":
                return bool(re.match(expected, str(actual)))
            elif operator == "greater_than":
                return float(actual) > float(expected)
            elif operator == "less_than":
                return float(actual) < float(expected)
            elif operator == "in":
                return actual in expected if isinstance(expected, list) else False
            elif operator == "exists":
                return actual is not None
            else:
                logger.warning("unknown_operator", operator=operator)
                return False
        except (ValueError, TypeError) as e:
            logger.debug("comparison_error", error=str(e))
            return False


@dataclass
class SecurityAlert:
    """Generated security alert from rule match."""
    alert_id: str
    rule_name: str
    severity: AlertSeverity
    title: str
    description: str
    source_message: Dict
    timestamp: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    indicators: List[str] = field(default_factory=list)
    risk_score: float = 0.0
    iocs: List[Dict] = field(default_factory=list)
    status: AlertStatus = AlertStatus.NEW
    actions_taken: List[str] = field(default_factory=list)
    
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
            "risk_score": self.risk_score,
            "iocs": self.iocs,
            "status": self.status.value,
            "actions_taken": self.actions_taken,
        }


# ============== State Trackers ==============

class SlidingWindowCounter:
    """Thread-safe sliding window counter for rate-based detection."""
    
    def __init__(self, window_size_seconds: int = 60, max_windows: int = 10):
        self.window_size = window_size_seconds
        self.max_windows = max_windows
        self.windows: Dict[str, List[float]] = defaultdict(list)
        self.lock = asyncio.Lock()
    
    async def increment(self, key: str, timestamp: float = None):
        """Increment counter for key at timestamp."""
        async with self.lock:
            ts = timestamp or time.time()
            self.windows[key].append(ts)
            await self._cleanup(key, ts)
    
    async def get_count(self, key: str, since: float = None) -> int:
        """Get count of events in current window."""
        async with self.lock:
            ts = since or (time.time() - self.window_size)
            return sum(1 for t in self.windows[key] if t >= ts)
    
    async def _cleanup(self, key: str, current_time: float):
        """Remove old entries outside window."""
        cutoff = current_time - (self.window_size * self.max_windows)
        self.windows[key] = [t for t in self.windows[key] if t >= cutoff]


# ============== Rules Engine ==============

class RulesEngine:
    """Load and manage detection rules from YAML files."""
    
    def __init__(self, rules_dir: Path):
        self.rules_dir = rules_dir
        self.rules: Dict[str, DetectionRule] = {}
        self.last_load_time: float = 0
        self.load_rules()
    
    def load_rules(self):
        """Load all YAML rule files from rules directory."""
        loaded_count = 0
        error_count = 0
        
        if not self.rules_dir.exists():
            logger.warning("rules_directory_not_found", path=str(self.rules_dir))
            return
        
        for rule_file in self.rules_dir.glob("**/*.yaml"):
            try:
                with open(rule_file) as f:
                    rule_data = yaml.safe_load(f)
                
                if isinstance(rule_data, list):
                    for rd in rule_data:
                        rule = self._parse_rule(rd)
                        if rule:
                            self.rules[rule.name] = rule
                            loaded_count += 1
                elif isinstance(rule_data, dict):
                    rule = self._parse_rule(rule_data)
                    if rule:
                        self.rules[rule.name] = rule
                        loaded_count += 1
                        
            except Exception as e:
                error_count += 1
                logger.error("rule_load_error", file=str(rule_file), error=str(e))
        
        self.last_load_time = time.time()
        logger.info("rules_loaded", total=len(self.rules), errors=error_count)
    
    def _parse_rule(self, data: Dict) -> Optional[DetectionRule]:
        """Parse rule dict into DetectionRule object."""
        try:
            required_fields = ["name", "description", "severity", "condition"]
            for f in required_fields:
                if f not in data:
                    logger.warning("rule_missing_field", rule=data.get("name"), field=f)
                    return None
            
            return DetectionRule(
                name=data["name"],
                description=data["description"],
                severity=AlertSeverity(data.get("severity", "MEDIUM").upper()),
                condition=data.get("condition", {}),
                action=data.get("action", ["log"]),
                tags=data.get("tags", []),
                mitre_technique=data.get("mitre_technique"),
                mitre_tactic=data.get("mitre_tactic"),
                enabled=data.get("enabled", True),
            )
        except Exception as e:
            logger.error("rule_parse_error", error=str(e))
            return None
    
    def evaluate(self, message: Dict) -> List[DetectionRule]:
        """Evaluate message against all enabled rules."""
        matches = []
        for rule_name, rule in self.rules.items():
            if rule.enabled and rule.matches(message):
                matches.append(rule)
        return matches
    
    def reload_if_needed(self):
        """Reload rules if modification time has changed."""
        if time.time() - self.last_load_time > settings.rules_reload_interval_seconds:
            self.load_rules()


# ============== TheHive Integration ==============

class TheHiveClient:
    """Client for creating cases in TheHive platform."""
    
    def __init__(self, base_url: str, api_key: str):
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self.headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }
    
    async def create_case_from_alert(self, alert: SecurityAlert) -> Optional[str]:
        """Create a new case in TheHive from security alert."""
        if not settings.auto_create_cases:
            return None
        
        try:
            import httpx
            
            case_payload = {
                "title": alert.title[:200],
                "description": self._build_case_description(alert),
                "severity": settings.case_severity_map.get(alert.severity.value, 2),
                "tlp": 2,  # Amber
                "pap": 2,  # Amber
                "tags": ["ss7", "auto-created"] + [alert.rule_name] + alert.indicators,
                "observables": self._build_observables(alert),
            }
            
            async with httpx.AsyncClient(timeout=30) as client:
                response = await client.post(
                    f"{self.base_url}/api/case",
                    headers=self.headers,
                    json=case_payload,
                )
                
                if response.status_code == 201:
                    case_id = response.json().get("_id") or response.json().get("id")
                    logger.info("thehive_case_created", 
                               case_id=case_id, 
                               rule=alert.rule_name,
                               severity=alert.severity.value)
                    return case_id
                else:
                    logger.error("thehive_create_error", 
                                status=response.status_code,
                                body=response.text)
                    return None
                    
        except Exception as e:
            logger.exception("thehive_client_error")
            return None
    
    def _build_case_description(self, alert: SecurityAlert) -> str:
        """Build detailed case description."""
        msg = alert.source_message.get("message_type", "Unknown")
        protocol = alert.source_message.get("protocol", "Unknown")
        calling = alert.source_message.get("calling_party_gt", {}).get("address", "N/A")
        called = alert.source_message.get("called_party_gt", {}).get("address", "N/A")
        imsi = alert.source_message.get("imsi", "N/A")
        
        return f"""## SS7 Security Alert Details

**Rule:** {alert.rule_name}
**Severity:** {alert.severity.value}
**Risk Score:** {alert.risk_score:.2f}

### Source Message Information
- **Protocol:** {protocol}
- **Message Type:** {msg}
- **Calling Party GT:** {calling}
- **Called Party GT:** {called}
- **IMSI:** {imsi}

### Detection Indicators
{chr(10).join(f'- {ind}' for ind in alert.indicators)}

### IOCs Identified
{chr(10).join(f'- **{ioc.get("type", "unknown")}**: {ioc.get("value", "N/A")}' for ioc in alert.iocs)}

### Raw Message Context
```json
{orjson.dumps(alert.source_message, option=orjson.OPT_INDENT_2).decode()}
```

---
*Automatically created by Djezzy SOC SS7 Analyzer*
*Detection Time: {alert.timestamp.isoformat()}*
"""
    
    def _build_observables(self, alert: SecurityAlert) -> List[Dict]:
        """Build observables list for TheHive case."""
        observables = []
        
        # Add IOCs as observables
        for ioc in alert.iocs:
            obs = {
                "dataType": ioc.get("type", "other"),
                "data": ioc.get("value", ""),
                "tlp": 2,
                "tags": ["ss7-ioc"],
            }
            observables.append(obs)
        
        # Add source/destination addresses
        calling_gt = alert.source_message.get("calling_party_gt", {})
        if calling_gt.get("address"):
            observables.append({
                "dataType": "phone-number",
                "data": calling_gt["address"],
                "tlp": 2,
                "tags": ["calling-party-gt", "ss7"],
            })
        
        called_gt = alert.source_message.get("called_party_gt", {})
        if called_gt.get("address"):
            observables.append({
                "dataType": "phone-number",
                "data": called_gt["address"],
                "tlp": 2,
                "tags": ["called-party-gt", "ss7"],
            })
        
        return observables


# ============== Main Analyzer Application ==============

app = FastAPI(
    title="Djezzy SOC - SS7 Security Analyzer",
    description="Real-time SS7 attack detection and alerting engine",
    version="1.0.0",
)

# Global state
rules_engine: Optional[RulesEngine] = None
thehive_client: Optional[TheHiveClient] = None
counters: SlidingWindowCounter = None
stats = {
    "messages_processed": 0,
    "alerts_generated": 0,
    "cases_created": 0,
    "errors": 0,
    "start_time": time.time(),
}


@app.on_event("startup")
async def startup_event():
    """Initialize components on startup."""
    global rules_engine, thehive_client, counters
    
    logger.info("analyzer_startup_beginning")
    
    # Initialize rules engine
    rules_engine = RulesEngine(settings.rules_dir)
    
    # Initialize TheHive client
    if settings.thehive_api_key:
        thehive_client = TheHiveClient(settings.thehive_url, settings.thehive_api_key)
    
    # Initialize rate counters
    counters = SlidingWindowCounter(window_size_seconds=60)
    
    # Start background consumer task
    asyncio.create_task(kafka_consumer_task())
    
    logger.info("analyzer_startup_complete",
                rules_loaded=len(rules_engine.rules),
                thehive_enabled=bool(settings.thehive_api_key))


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown."""
    logger.info("analyzer_shutdown", stats=stats)


# ============== API Endpoints ==============

class HealthResponse(BaseModel):
    status: str
    service: str = "ss7-analyzer"
    version: str = "1.0.0"
    uptime_seconds: float = 0.0
    rules_loaded: int = 0
    alerts_generated: int = 0


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    return HealthResponse(
        status="healthy",
        uptime_seconds=time.time() - stats["start_time"],
        rules_loaded=len(rules_engine.rules) if rules_engine else 0,
        alerts_generated=stats["alerts_generated"],
    )


@app.get("/api/v1/rules")
async def list_rules():
    """List all loaded detection rules."""
    if not rules_engine:
        raise HTTPException(status_code=503, detail="Rules engine not initialized")
    
    return [
        {
            "name": r.name,
            "description": r.description,
            "severity": r.severity.value,
            "enabled": r.enabled,
            "tags": r.tags,
        }
        for r in rules_engine.rules.values()
    ]


@app.post("/api/v1/rules/reload")
async def reload_rules():
    """Force reload of detection rules from disk."""
    if not rules_engine:
        raise HTTPException(status_code=503, detail="Rules engine not initialized")
    
    rules_engine.load_rules()
    return {"status": "reloaded", "rules_count": len(rules_engine.rules)}


@app.get("/api/v1/alerts/recent")
async def get_recent_alerts(limit: int = 50):
    """Get recent alerts (placeholder - would query storage)."""
    return {"message": "Query alert storage backend", "limit": limit}


@app.get("/api/v1/stats")
async def get_statistics():
    """Get analyzer statistics."""
    uptime = time.time() - stats["start_time"]
    return {
        "uptime_seconds": uptime,
        "messages_processed": stats["messages_processed"],
        "alerts_generated": stats["alerts_generated"],
        "cases_created": stats["cases_created"],
        "errors": stats["errors"],
        "messages_per_second": stats["messages_processed"] / max(1, uptime),
        "alerts_per_minute": (stats["alerts_generated"] * 60) / max(1, uptime),
        "rules_active": len([r for r in rules_engine.rules.values() if r.enabled]) if rules_engine else 0,
    }


# ============== Kafka Consumer Task ==============

async def kafka_consumer_task():
    """Background task to consume SS7 messages from Kafka and analyze them."""
    
    consumer_config = {
        'bootstrap.servers': settings.kafka_bootstrap_servers,
        'group.id': settings.consumer_group,
        'auto.offset.reset': 'latest',
        'enable.auto.commit': True,
        'auto.commit.interval.ms': 5000,
        'session.timeout.ms': 30000,
        'max.poll.interval.ms': 300000,
        'fetch.max.bytes': 52428800,  # 50MB
        'max.partition.fetch.bytes': 1048576,  # 1MB per partition
    }
    
    producer_config = {
        'bootstrap.servers': settings.kafka_bootstrap_servers,
        'client.id': 'ss7-analyzer-producer',
        'linger.ms': 10,
        'compression.type': 'lz4',
    }
    
    consumer = Consumer(consumer_config)
    producer = Producer(producer_config)
    
    consumer.subscribe([settings.input_topic])
    
    logger.info("kafka_consumer_started",
                input_topic=settings.input_topic,
                output_topic=settings.output_topic,
                group_id=settings.consumer_group)
    
    try:
        while True:
            msg = consumer.poll(timeout=1.0)
            
            if msg is None:
                continue
            
            if msg.error():
                if msg.error().code() == KafkaError._PARTITION_EOF:
                    continue
                else:
                    logger.error("kafka_consumer_error", error=msg.error())
                    stats["errors"] += 1
                    continue
            
            try:
                # Parse message
                message = orjson.loads(msg.value())
                stats["messages_processed"] += 1
                
                # Evaluate against rules
                matching_rules = rules_engine.evaluate(message)
                
                if matching_rules:
                    for rule in matching_rules:
                        alert = create_alert(rule, message)
                        
                        # Send to output topic
                        alert_json = orjson.dumps(alert.to_dict())
                        producer.produce(
                            topic=settings.output_topic,
                            key=alert.alert_id.encode('utf-8'),
                            value=alert_json,
                        )
                        
                        stats["alerts_generated"] += 1
                        
                        # Create TheHive case for high/critical alerts
                        if alert.severity in [AlertSeverity.HIGH, AlertSeverity.CRITICAL]:
                            if thehive_client:
                                case_id = await thehive_client.create_case_from_alert(alert)
                                if case_id:
                                    stats["cases_created"] += 1
                                    alert.actions_taken.append(f"Created TheHive case: {case_id}")
                        
                        logger.info("alert_generated",
                                    rule=rule.name,
                                    severity=alert.severity.value,
                                    alert_id=alert.alert_id)
                
                # Periodically check for rule reload
                rules_engine.reload_if_needed()
                
            except orjson.JSONDecodeError as e:
                stats["errors"] += 1
                logger.error("json_parse_error", error=str(e))
            except Exception as e:
                stats["errors"] += 1
                logger.exception("message_processing_error")
            
            # Periodic producer flush
            producer.poll(0)
            
    except KeyboardInterrupt:
        pass
    finally:
        logger.info("kafka_consumer_stopping")
        producer.flush()
        consumer.close()


def create_alert(rule: DetectionRule, message: Dict) -> SecurityAlert:
    """Create a SecurityAlert from a matched rule and message."""
    alert_id = f"ss7_alert_{int(time.time()*1000000)}"
    
    # Extract indicators from message
    indicators = extract_indicators(rule, message)
    
    # Calculate risk score
    risk_score = calculate_risk_score(rule, message, indicators)
    
    # Build title and description
    title = build_alert_title(rule, message)
    description = build_alert_description(rule, message, indicators)
    
    # Extract IOCs
    iocs = extract_iocs(message)
    
    return SecurityAlert(
        alert_id=alert_id,
        rule_name=rule.name,
        severity=rule.severity,
        title=title,
        description=description,
        source_message=message,
        indicators=indicators,
        risk_score=risk_score,
        iocs=iocs,
        actions_taken=[],
    )


def extract_indicators(rule: DetectionRule, message: Dict) -> List[str]:
    """Extract human-readable indicators from message."""
    indicators = []
    
    # Protocol/message type
    protocol = message.get("protocol", "Unknown")
    msg_type = message.get("message_type", "Unknown")
    indicators.append(f"Protocol: {protocol}, Type: {msg_type}")
    
    # Addresses
    calling = message.get("calling_party_gt", {})
    if calling.get("address"):
        indicators.append(f"Calling GT: {calling['address']}")
    
    called = message.get("called_party_gt", {})
    if called.get("address"):
        indicators.append(f"Called GT: {called['address']}")
    
    # Subscriber info
    if message.get("imsi"):
        indicators.append(f"IMSI present: {message['imsi'][:6]}******")
    if message.get("msisdn"):
        indicators.append(f"MSISDN present: {message['msisdn'][-4:]}****")
    
    # Location
    if message.get("location_area"):
        indicators.append("Location info present")
    
    # Rule-specific indicators
    if "location_tracking" in rule.name.lower():
        indicators.append("Potential location tracking pattern detected")
    if "fraud" in rule.name.lower() or "irsf" in rule.name.lower():
        indicators.append("Financial fraud indicator")
    if "brute_force" in rule.name.lower() or "flooding" in rule.name.lower():
        indicators.append("Rate anomaly detected")
    
    return indicators


def calculate_risk_score(rule: DetectionRule, message: Dict, indicators: List[str]) -> float:
    """Calculate risk score (0.0 to 1.0) for an alert."""
    score = 0.0
    
    # Base score from severity
    severity_scores = {
        AlertSeverity.CRITICAL: 0.8,
        AlertSeverity.HIGH: 0.6,
        AlertSeverity.MEDIUM: 0.4,
        AlertSeverity.LOW: 0.2,
    }
    score = severity_scores.get(rule.severity, 0.3)
    
    # Adjust based on subscriber presence
    if message.get("imsi"):
        score += 0.05
    if message.get("imei"):
        score += 0.03
    
    # Adjust based on sensitive operations
    sensitive_ops = [
        "sendRoutingInfoForSM",
        "provideRoamingNumber",
        "anyTimeInterrogation",
        "cancelLocation",
    ]
    if message.get("message_type") in sensitive_ops:
        score += 0.1
    
    # MITRE technique adjustment
    if rule.mitre_technique:
        score += 0.05
    
    # Clamp to valid range
    return min(1.0, max(0.0, score))


def build_alert_title(rule: DetectionRule, message: Dict) -> str:
    """Build concise alert title."""
    protocol = message.get("protocol", "SS7")
    msg_type = message.get("message_type", "Unknown")
    calling = message.get("calling_party_gt", {}).get("address", "Unknown")
    
    return f"[SS7][{rule.severity.value}] {rule.name} - {msg_type} from {calling}"


def build_alert_description(rule: DetectionRule, message: Dict, indicators: List[str]) -> str:
    """Build detailed alert description."""
    desc = f"""**Rule:** {rule.name}
**Description:** {rule.description}
**Protocol:** {message.get('protocol', 'Unknown')}
**Message Type:** {message.get('message_type', 'Unknown')}
**Timestamp:** {message.get('timestamp', 'Unknown')}

### Key Indicators
{chr(10).join(f'- {ind}' for ind in indicators)}

### Address Information
- **Calling Party:** {message.get('calling_party_gt', {}).get('address', 'N/A')}
- **Called Party:** {message.get('called_party_gt', {}).get('address', 'N/A')}
- **OPC:** {message.get('originating_point_code', 'N/A')}
- **DPC:** {message.get('destination_point_code', 'N/A')}

### Subscriber (if present)
- **IMSI:** {message.get('imsi', 'Not available')}
- **MSISDN:** {message.get('msisdn', 'Not available')}
- **IMEI:** {message.get('imei', 'Not available')}

### Location (if present)
- **MSC:** {message.get('msc_address', 'N/A')}
- **VLR:** {message.get('vlr_number', 'N/A')}
- **Cell ID:** {message.get('cell_id', 'N/A')}

### MITRE ATT&CK Mapping
- **Technique:** {rule.mitre_technique or 'N/A'}
- **Tactic:** {rule.mitre_tactic or 'N/A'}

### Recommended Actions
{chr(10).join(f'- {action}' for action in rule.action)}
"""
    return desc


def extract_iocs(message: Dict) -> List[Dict]:
    """Extract Indicators of Compromise from message."""
    iocs = []
    
    # Phone numbers/GTs
    for party_type in ["calling_party_gt", "called_party_gt"]:
        gt = message.get(party_type, {})
        if gt.get("address"):
            iocs.append({
                "type": "phone-number",
                "value": gt["address"],
                "source": party_type,
            })
    
    # IMSI (partial, masked)
    if message.get("imsi"):
        iocs.append({
            "type": "imsi",
            "value": message["imsi"],
            "source": "subscriber_id",
        })
    
    # IMEI
    if message.get("imei"):
        iocs.append({
            "type": "imei",
            "value": message["imei"],
            "source": "device_id",
        })
    
    # MSISDN
    if message.get("msisdn"):
        iocs.append({
            "type": "msisdn",
            "value": message["msisdn"],
            "source": "subscriber_number",
        })
    
    return iocs


# ============== Entry Point ==============

if __name__ == "__main__":
    import uvicorn
    
    logger.info("starting_ss7_analyzer",
                version="1.0.0",
                listen_on=f"{settings.host}:{settings.port}",
                input_topic=settings.input_topic,
                output_topic=settings.output_topic,
                rules_dir=str(settings.rules_dir))
    
    uvicorn.run(
        app,
        host=settings.host,
        port=settings.port,
        log_level="info",
    )
