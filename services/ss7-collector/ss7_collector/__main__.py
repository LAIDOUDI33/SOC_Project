"""
Djezzy SOC - SS7/Diameter Signaling Collector
Captures and normalizes telecom signaling messages from STP/MSC/HLR via SIGTRAN (M3UA/SCTP) or Diameter
"""

import asyncio
import json
import logging
import signal
import socket
import struct
import time
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from enum import Enum
from pathlib import Path
from typing import Optional, Dict, List, Any

import orjson
from confluent_kafka import Producer
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
        create_kafka_headers_with_trace, SS7CollectorLogger, mask_sensitive
    )
    
    # Initialize with service name and file logging
    logger = init_logging(
        service_name="ss7-collector",
        log_level=os.getenv('LOG_LEVEL', 'INFO'),
        log_to_file=True,  # Enable file logging in production
        log_directory="/var/log/soc"
    )
    
    # Create specialized SS7 collector logger with domain-specific methods
    ss7_log = SS7CollectorLogger()
    
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
    class SS7CollectorLogger:
        def __init__(self):
            self.logger = logger
        def log_capture(self, **kwargs):
            self.logger.info("signaling_packet_captured", **kwargs)
        def log_decode_error(self, **kwargs):
            self.logger.warning("packet_decode_failed", **kwargs)
    
    ss7_log = SS7CollectorLogger()


# ============== Configuration ==============

class Settings(BaseSettings):
    """Application settings from environment variables."""
    
    # Server configuration
    host: str = "0.0.0.0"
    port: int = 7000
    
    # SS7/SIGTRAN configuration
    m3ua_listen_port: int = 2904
    sctp_listen_port: int = 2905
    
    # Diameter configuration
    diameter_listen_port: int = 3868
    diameter_realm: str = "djezzy.dz"
    diameter_host: str = "ss7-collector.djezzy.dz"
    
    # Kafka configuration
    kafka_bootstrap_servers: str = "kafka-broker-1:9092,kafka-broker-2:9092,kafka-broker-3:9092"
    output_topic: str = "ss7-raw-events"
    kafka_linger_ms: int = 10
    kafka_batch_size: int = 16384
    kafka_compression_type: str = "lz4"
    
    # Capture settings
    capture_interface: str = "eth0"
    pcap_enabled: bool = True
    pcap_dir: Path = Path("/var/capture/ss7")
    pcap_max_size_mb: int = 512
    pcap_rotation_interval_hours: int = 1
    
    # Processing settings
    normalize_messages: bool = True
    enrich_with_geoip: bool = True
    max_message_size_bytes: int = 65535
    buffer_size: int = 10000
    
    class Config:
        env_prefix = "SS7_"
        env_file = "/etc/ss7-collector/.env"


settings = Settings()


# ============== Data Models ==============

class SS7Protocol(Enum):
    MTP3 = "mtp3"
    SCCP = "sccp"
    TCAP = "tcap"
    MAP = "map"
    CAP = "cap"
    ISUP = "isup"
    INAP = "inap"
    DIAMETER = "diameter"


class MessageType(Enum):
    # MAP messages
    MAP_SEND_ROUTING_INFO_FOR_SM = "sendRoutingInfoForSM"
    MAP_PROVIDE_ROAMING_NUMBER = "provideRoamingNumber"
    MAP_UPDATE_LOCATION = "updateLocation"
    MAP_CANCEL_LOCATION = "cancelLocation"
    MAP_INSERT_SUBSCRIBER_DATA = "insertSubscriberData"
    MAP_DELETE_SUBSCRIBER_DATA = "deleteSubscriberData"
    MAP_FORWARD_SHORT_MESSAGE = "forwardShortMessage"
    MAP_PROCESS_UNSTRUCTURED_SS_REQUEST = "processUnstructuredSSRequest"
    MAP_AUTHENTICATION_FAILURE_REPORT = "authenticationFailureReport"
    MAP_NOTE_SUBSCRIBER_PRESENT = "noteSubscriberPresent"
    MAP_READY_FOR_SM = "readyForSM"
    MAP_ANY_TIME_INTERROGATION = "anyTimeInterrogation"
    
    # ISUP messages
    ISUP_IAM = "initialAddressMessage"  # Initial Address Message
    ISUP_ACM = "addressCompleteMessage"
    ISUP_ANM = "answerMessage"
    ISUP_REL = "releaseMessage"
    ISUP_RLC = "releaseComplete"
    
    # Diameter messages
    DIAMETER_CER = "capabilities-exchange-request"
    DIAMETER_CEA = "capabilities-exchange-answer"
    DIAMETER_DWR = "device-watchdog-request"
    DIAMETER_DWA = "device-watchdog-answer"
    DIAMETER_ULR = "user-location-register-request"  # S6a/HSS
    DIAMETER_ULA = "user-location-register-answer"
    DIAMETER_AIR = "authenticate-information-request"
    DIAMETER_AIA = "authenticate-information-answer"
    DIAMETER_CLR = "cancel-location-request"
    DIAMETER_CLA = "cancel-location-answer"
    DIAMETER_IDR = "insert-subscriber-data-request"
    DIAMETER_IDA = "insert-subscriber-data-answer"
    

@dataclass
class GlobalTitle:
    """SS7 Global Title (GT) structure."""
    number_type: int  # Nature of address indicator
    numbering_plan: int
    translation_type: int
    encoding_scheme: int
    address: str  # Digits string


@dataclass  
class SS7Message:
    """Normalized SS7 message structure."""
    
    # Metadata
    timestamp: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    message_id: str = field(default_factory=lambda: f"ss7_{int(time.time()*1000000)}")
    capture_source: str = "unknown"
    raw_length: int = 0
    
    # Protocol layers
    protocol: SS7Protocol = SS7Protocol.MAP
    message_type: MessageType = None
    opcode: int = 0
    
    # Addresses
    calling_party_gt: Optional[GlobalTitle] = None
    called_party_gt: Optional[GlobalTitle] = None
    originating_point_code: int = 0
    destination_point_code: int = 0
    
    # Subscriber info (if present)
    imsi: Optional[str] = None
    msisdn: Optional[str] = None
    imei: Optional[str] = None
    
    # Location info
    msc_address: Optional[str] = None
    vlr_number: Optional[str] = None
    location_area: Optional[Dict] = None
    cell_id: Optional[str] = None
    
    # Content
    payload: Optional[Dict] = None
    raw_payload_hex: Optional[str] = None
    
    # Risk indicators (computed during analysis)
    risk_score: float = 0.0
    risk_indicators: List[str] = field(default_factory=list)
    
    def to_dict(self) -> Dict:
        """Convert to dictionary for JSON serialization."""
        return {
            "timestamp": self.timestamp.isoformat(),
            "message_id": self.message_id,
            "capture_source": self.capture_source,
            "raw_length": self.raw_length,
            "protocol": self.protocol.value if isinstance(self.protocol, SS7Protocol) else self.protocol,
            "message_type": self.message_type.value if isinstance(self.message_type, MessageType) else self.message_type,
            "opcode": self.opcode,
            "calling_party_gt": asdict(self.calling_party_gt) if self.calling_party_gt else None,
            "called_party_gt": asdict(self.called_party_gt) if self.called_party_gt else None,
            "originating_point_code": self.originating_point_code,
            "destination_point_code": self.destination_point_code,
            "imsi": self.imsi,
            "msisdn": self.msisdn,
            "imei": self.imei,
            "msc_address": self.msc_address,
            "vlr_number": self.vlr_number,
            "location_area": self.location_area,
            "cell_id": self.cell_id,
            "payload": self.payload,
            "risk_score": self.risk_score,
            "risk_indicators": self.risk_indicators,
        }


class HealthResponse(BaseModel):
    """Health check response model."""
    status: str = "healthy"
    service: str = "ss7-collector"
    version: str = "1.0.0"
    uptime_seconds: float = 0.0
    messages_processed: int = 0
    messages_dropped: int = 0
    kafka_lag: int = 0


# ============== Kafka Producer ==============

class SS7KafkaProducer:
    """Kafka producer for SS7 events with delivery guarantees."""
    
    def __init__(self):
        config = {
            'bootstrap.servers': settings.kafka_bootstrap_servers,
            'client.id': 'ss7-collector',
            'linger.ms': settings.kafka_linger_ms,
            'batch.size': settings.kafka_batch_size,
            'compression.type': settings.kafka_compression_type,
            'acks': 'all',
            'retries': 5,
            'max.in.flight.requests.per.connection': 5,
            'enable.idempotence': True,
            'queue.buffering.max.messages': settings.buffer_size,
            'socket.keepalive.enable': True,
        }
        
        self.producer = Producer(config)
        self.messages_sent = 0
        self.messages_failed = 0
        
        logger.info("kafka_initialized", bootstrap_servers=settings.kafka_bootstrap_servers)
    
    def delivery_callback(self, err, msg):
        """Callback for message delivery reports."""
        if err:
            self.messages_failed += 1
            logger.error("kafka_delivery_error", error=str(err), topic=msg.topic(), partition=msg.partition())
        else:
            pass  # Successful delivery
    
    async def send_message(self, message: SS7Message):
        """Send a normalized SS7 message to Kafka."""
        try:
            key = message.imsi or message.msisdn or message.message_id
            value = orjson.dumps(message.to_dict())
            
            self.producer.produce(
                topic=settings.output_topic,
                key=key.encode('utf-8'),
                value=value,
                callback=self.delivery_callback
            )
            
            self.messages_sent += 1
            
            # Poll for delivery callbacks periodically
            if self.messages_sent % 100 == 0:
                self.producer.poll(0)
                
        except Exception as e:
            logger.exception("kafka_send_error", message_id=message.message_id)
            raise
    
    def flush(self):
        """Flush any pending messages."""
        remaining = self.producer.flush(timeout=30)
        if remaining > 0:
            logger.warning("kafka_flush_incomplete", remaining=remaining)
        return remaining
    
    def close(self):
        """Close the producer gracefully."""
        self.flush()
        self.producer.flush(infinity=10)
        logger.info("kafka_producer_closed", total_sent=self.messages_sent)


# ============== Protocol Parsers ==============

class M3UAParser:
    """Parse M3UA (MTP3 User Adaptation) messages."""
    
    MESSAGE_CLASS_MGMT = 0
    MESSAGE_CLASS_TRANSFER = 1
    MESSAGE_CLASS_SSNM = 2
    MESSAGE_CLASS_ASPSM = 3
    MESSAGE_CLASS_ASPTM = 4
    
    @classmethod
    def parse_header(cls, data: bytes) -> Dict:
        """Parse M3UA header (8 bytes)."""
        if len(data) < 8:
            raise ValueError("M3UA header too short")
        
        version, reserved, message_class, message_type = struct.unpack('!BBHH', data[:8])
        
        return {
            "version": version,
            "reserved": reserved,
            "message_class": message_class,
            "message_type": message_type,
            "length": struct.unpack('!I', data[4:8])[0] & 0x00FFFFFF,
        }
    
    @classmethod
    def parse_payload_data(cls, data: bytes) -> Dict:
        """Parse DATA message payload (MTP3 payload)."""
        if len(data) < 16:
            raise ValueError("M3UA DATA payload too short")
        
        # Parse MTP3 routing label
        opc, dpc, si, ni, mp, sls = struct.unpack('!IIIBBBI', data[:16])
        
        return {
            "opc": opc & 0x3FFFFFFF,  # Originating Point Code (14-bit or 24-bit)
            "dpc": dpc & 0x3FFFFFFF,  # Destination Point Code
            "service_indicator": si,
            "network_indicator": ni,
            "message_priority": mp,
            "signaling_link_selection": sls,
            "mtp3_payload": data[16:] if len(data) > 16 else b'',
        }


class SCCPParser:
    """Parse SCCP (Signaling Connection Control Part) messages."""
    
    MESSAGE_TYPE_CR = 0x01  # Connection Request
    MESSAGE_TYPE_CC = 0x02  # Connection Confirm
    MESSAGE_TYPE_DT1 = 0x05  # Data Form 1
    MESSAGE_TYPE_UDT = 0x09  # Unitdata (connectionless)
    MESSAGE_TYPE_XUDT = 0x11  # Extended Unitdata
    
    GT_INDICATOR_NO_GT = 0x00
    GT_INDICATOR_GT_ONLY = 0x01
    GT_INDICATOR_GT_SSN = 0x02
    
    @classmethod
    def parse_called_party_address(cls, data: bytes) -> Dict:
        """Parse SCCP called party address."""
        if not data:
            return {}
        
        result = {}
        byte0 = data[0]
        
        result["point_code_indicator"] = bool(byte0 & 0x80)
        result["ssn_indicator"] = bool(byte0 & 0x40)
        result["global_title_indicator"] = (byte0 >> 2) & 0x03
        result["routing_indicator"] = byte0 & 0x03
        
        offset = 1
        
        if result["global_title_indicator"] != cls.GT_INDICATOR_NO_GT:
            if offset < len(data):
                result["nature_of_address"] = data[offset] & 0x07
                result["numbering_plan"] = (data[offset] >> 4) & 0x0F
                offset += 1
                if offset < len(data):
                    odd_flag = data[offset] & 0x80
                    digits = b''
                    while offset < len(data):
                        b = data[offset]
                        high = (b >> 4) & 0x0F
                        low = b & 0x0F
                        if high <= 9:
                            digits += bytes([high + 0x30])
                        if low <= 9:
                            digits += bytes([low + 0x30])
                        offset += 1
                    result["address_digits"] = digits.decode('ascii')
        
        if result["ssn_indicator"] and offset < len(data):
            result["subsystem_number"] = data[offset]
        
        return result


class TCAPParser:
    """Parse TCAP (Transaction Capabilities Application Part)."""
    
    @classmethod
    def parse_transaction_id(cls, data: bytes) -> tuple:
        """Extract OTID (Originating Transaction ID) and DTID (Destination Transaction ID)."""
        # Simplified OTID/DTID extraction from TCAP
        otid = dtid = None
        try:
            if len(data) >= 12:
                # OTID is typically first 4 bytes of transaction portion
                otid = struct.unpack('!I', data[4:8])[0]
                dtid = struct.unpack('!I', data[8:12])[0]
        except Exception:
            pass
        return otid, dtid


class MAPParser:
    """Parse MAP (Mobile Application Part) operations."""
    
    OPERATION_CODES = {
        2: "sendRoutingInfoForSM",
        18: "provideRoamingNumber",
        2: "updateLocation",
        56: "cancelLocation",
        52: "insertSubscriberData",
        53: "deleteSubscriberData",
        46: "forwardShortMessage",
        59: "processUnstructuredSSRequest",
        66: "authenticationFailureReport",
        68: "noteSubscriberPresent",
        67: "readyForSM",
        88: "anyTimeInterrogation",
    }
    
    @classmethod
    def get_operation_name(cls, opcode: int) -> str:
        return cls.OPERATION_CODES.get(opcode, f"unknown_operation_{opcode}")
    
    @classmethod
    def extract_imsi(cls, data: bytes) -> Optional[str]:
        """Attempt to extract IMSI from MAP message."""
        # IMSI is typically encoded as BCD string in specific parameters
        # This is a simplified extraction - real implementation needs full ASN.1 parsing
        imsi_patterns = [
            b'\x08\x29\x80\x00',  # Common IMSI tag prefix
            b'\x80\x91\xA3',       # Alternative encoding
        ]
        for pattern in imsi_patterns:
            idx = data.find(pattern)
            if idx != -1:
                start = idx + len(pattern)
                # Extract up to 15 digits (IMSI length)
                end = min(start + 8, len(data))
                try:
                    digits = ''
                    for b in data[start:end]:
                        high = (b >> 4) & 0x0F
                        low = b & 0x0F
                        if high <= 9:
                            digits += chr(high + 0x30)
                        if low <= 9:
                            digits += chr(low + 0x30)
                    if len(digits) >= 8 and digits.isdigit():
                        return digits
                except Exception:
                    continue
        return None


class DiameterParser:
    """Parse Diameter protocol messages."""
    
    APPLICATION_IDS = {
        0: "Diameter Common Commands",
        16777250: "3GPP Cx (IMS)",           # Cx interface
        16777251: "3GPP Dx (IMS)",
        16777264: "3GPP Sh (UDR)",
        16777265: "3GPP Dh (UDR)",
        16777236: "3GPP S6a (HSS-LTE)",      # S6a interface
        16777237: "3GPP S6d (HSS-LTE)",
        16777250: "3GPP Gx (PCRF-PCEF)",     # Policy control
        16777238: "3GPP Rx (AF-PCRF)",
        16777221: "3GPP SGd (AS-SGSN)",
        16777251: "3GPP S13 (EIR-MME)",
        16777263: "3GPP SLh (GMLC-HSS)",
        4: "3GPP2 AKA",
        16777272: "3GPP2 S6M",
    }
    
    COMMAND_CODES = {
        280: "capabilities-exchange",
        281: "capabilities-exchange-answer",
        280: "device-watchdog-request",
        281: "device-watchdog-answer",
        301: "disconnect-peer-request",
        302: "disconnect-peer-answer",
        257: "abort-session",
        275: "re-auth-request",
        276: "re-auth-answer",
        271: "session-termination-request",
        272: "session-termination-answer",
        274: "abort-session-request",
        275: "abort-session-answer",
        316: "user-location-register-request",   # ULR (S6a)
        317: "user-location-register-answer",   # ULA
        318: "authenticate-information-request",  # AIR (S6a)
        319: "authenticate-information-answer",  # AIA
        320: "cancel-location-request",          # CLR (S6a)
        321: "cancel-location-answer",          # CLA
        322: "insert-subscriber-data-request",   # IDR (S6a)
        323: "insert-subscriber-data-answer",   # IDA (S6a),
    }
    
    @classmethod
    def parse_header(cls, data: bytes) -> Dict:
        """Parse Diameter header (20 bytes)."""
        if len(data) < 20:
            raise ValueError("Diameter header too short")
        
        version = data[0]
        length = struct.unpack('!I', b'\x00' + data[1:4])[0]
        flags = data[4]
        command_code = struct.unpack('!I', b'\x00' + data[5:8])[0]
        application_id = struct.unpack('!I', data[8:12])[0]
        hop_by_hop_id = struct.unpack('!I', data[12:16])[0]
        end_to_end_id = struct.unpack('!I', data[16:20])[0]
        
        return {
            "version": version,
            "length": length,
            "is_request": bool(flags & 0x80),
            "is_proxiable": bool(flags & 0x40),
            "error_bit": bool(flags & 0x20),
            "is_retransmit": bool(flags & 0x10),
            "command_code": command_code,
            "command_name": cls.COMMAND_CODES.get(command_code, f"unknown_{command_code}"),
            "application_id": application_id,
            "application_name": cls.APPLICATION_IDS.get(application_id, f"unknown_app_{application_id}"),
            "hop_by_hop_id": hop_by_hop_id,
            "end_to_end_id": end_to_end_id,
        }


# ============== Main Application ==============

app = FastAPI(
    title="Djezzy SOC - SS7 Signaling Collector",
    description="Captures and normalizes SS7/Diameter signaling messages for security analysis",
    version="1.0.0",
)

# Global state
kafka_producer: Optional[SS7KafkaProducer] = None
message_counter = {"total": 0, "errors": 0}
start_time = time.time()


@app.on_event("startup")
async def startup_event():
    """Initialize components on startup."""
    global kafka_producer
    
    logger.info("startup_beginning")
    
    # Initialize Kafka producer
    kafka_producer = SS7KafkaProducer()
    
    logger.info("startup_complete", 
                kafka_servers=settings.kafka_bootstrap_servers,
                output_topic=settings.output_topic)


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown."""
    global kafka_producer
    
    logger.info("shutdown_initiated")
    
    if kafka_producer:
        kafka_producer.close()
    
    logger.info("shutdown_complete", total_messages=message_counter["total"])


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    return HealthResponse(
        status="healthy",
        uptime_seconds=time.time() - start_time,
        messages_processed=message_counter["total"],
        messages_dropped=message_counter["errors"],
    )


@app.get("/metrics")
async def prometheus_metrics():
    """Prometheus-compatible metrics endpoint."""
    from prometheus_client import generate_latest, CONTENT_TYPE_LATEST, REGISTRY
    
    # Custom metrics would be registered here
    metrics_data = generate_latest(REGISTRY)
    
    from fastapi.responses import Response
    return Response(content=metrics_data, media_type=CONTENT_TYPE_LATEST)


@app.post("/api/v1/message/inject")
async def inject_message(message: Dict[str, Any]):
    """
    Inject a pre-parsed message (for testing or external sources).
    This allows integration with external SS7 probes or firewalls.
    """
    global kafka_producer, message_counter
    
    try:
        ss7_msg = SS7Message(**message)
        
        if kafka_producer:
            await kafka_producer.send_message(ss7_msg)
        
        message_counter["total"] += 1
        
        return {
            "status": "accepted",
            "message_id": ss7_msg.message_id,
            "topic": settings.output_topic,
        }
    except Exception as e:
        message_counter["errors"] += 1
        logger.exception("inject_error")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v1/stats")
async def get_statistics():
    """Get collection statistics."""
    return {
        "uptime_seconds": time.time() - start_time,
        "messages_processed": message_counter["total"],
        "messages_errors": message_counter["errors"],
        "messages_per_second": message_counter["total"] / max(1, time.time() - start_time),
        "kafka_topic": settings.output_topic,
        "capture_enabled": settings.pcap_enabled,
    }


# ============== SCTP/M3UA Listener ==============

class SCTPServer:
    """Simplified SCTP server for receiving SIGTRAN messages."""
    
    def __init__(self, port: int, handler_coroutine):
        self.port = port
        self.handler = handler_coroutine
        self.server = None
        self.running = False
    
    async def start(self):
        """Start listening on SCTP port."""
        # Note: Full SCTP implementation requires sctp library
        # For production, use dedicated SIGTRAN stack (e.g., Kamailio, Open5GS)
        logger.warning("sctp_listener_note", 
                      message="Full SCTP requires kernel support - use external SIGTRAN gateway")
        logger.info("sctp_mode", mode="http_bridge_only")


# ============== PCAP Writer ==============

class PCAPWriter:
    """Rotating PCAP file writer for SS7 traffic capture."""
    
    def __init__(self, base_dir: Path, max_size_mb: int = 512, rotation_hours: int = 1):
        self.base_dir = base_dir
        self.max_size_bytes = max_size_mb * 1024 * 1024
        self.rotation_hours = rotation_hours
        self.current_file = None
        self.current_size = 0
        self.rotation_time = time.time()
        self.base_dir.mkdir(parents=True, exist_ok=True)
    
    def write_packet(self, data: bytes, timestamp: float = None):
        """Write a packet to current PCAP file."""
        import os
        
        if timestamp is None:
            timestamp = time.time()
        
        # Check rotation conditions
        need_rotation = (
            self.current_file is None or
            self.current_size > self.max_size_bytes or
            (time.time() - self.rotation_time) > (self.rotation_hours * 3600)
        )
        
        if need_rotation:
            self._rotate_file(timestamp)
        
        # Write packet (simplified - use scapy for proper PCAP format)
        try:
            self.current_file.write(data)
            self.current_size += len(data)
        except Exception as e:
            logger.error("pcap_write_error", error=str(e))
    
    def _rotate_file(self, timestamp: float):
        """Rotate to new PCAP file."""
        if self.current_file:
            self.current_file.close()
        
        filename = f"ss7_capture_{datetime.fromtimestamp(timestamp).strftime('%Y%m%d_%H%M%S')}.pcap"
        filepath = self.base_dir / filename
        
        self.current_file = open(filepath, 'ab')
        self.current_size = 0
        self.rotation_time = timestamp
        
        logger.info("pcap_rotated", file=str(filepath))


# ============== Entry Point ==============

if __name__ == "__main__":
    import uvicorn
    
    logger.info("starting_ss7_collector",
                version="1.0.0",
                listen_on=f"{settings.host}:{settings.port}",
                m3ua_port=settings.m3ua_listen_port,
                diameter_port=settings.diameter_listen_port,
                kafka_topic=settings.output_topic)
    
    uvicorn.run(
        app,
        host=settings.host,
        port=settings.port,
        log_level="info",
        access_log=True,
    )
