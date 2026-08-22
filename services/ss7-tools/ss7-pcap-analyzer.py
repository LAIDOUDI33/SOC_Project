#!/usr/bin/env python3
"""
SS7 PCAP File Analyzer for Djezzy SOC Platform
Analyzes Wireshark PCAP files containing SIGTRAN/SS7 traffic

Features:
- Parse SCTP/M3UA/SIGTRAN encapsulated SS7
- Extract MAP/CAP/ISUP conversations
- Generate fraud indicators
- Output JSON reports, CSV exports

Usage:
    python ss7-pcap-analyzer.py input.pcap --format json --fraud-check
    python ss7-pcap-analyzer.py input.pcap --output report.json --csv-export
    python ss7-pcap-analyzer.py input.pcap --filter MAP --verbose

Author: Djezzy National SOC Platform
Version: 1.0.0
"""

import argparse
import json
import csv
import os
import sys
import logging
import hashlib
from datetime import datetime, timedelta
from dataclasses import dataclass, field, asdict
from typing import Dict, List, Optional, Any, Tuple
from collections import defaultdict
from enum import Enum
import struct

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('SS7PcapAnalyzer')


class SS7Protocol(Enum):
    """SS7 Protocol types supported by the analyzer"""
    MTP3 = "MTP3"
    SCCP = "SCCP"
    TCAP = "TCAP"
    MAP = "MAP"
    CAP = "CAP"
    ISUP = "ISUP"
    INAP = "INAP"


class FraudType(Enum):
    """Fraud pattern categories"""
    IRSF = "International Revenue Share Fraud"
    SIM_SWAP = "SIM Swap Fraud"
    WANGIRI = "Wangiri (One-Ring)"
    SMS_FLOOD = "SMS Flooding"
    USSD_ABUSE = "USSD Abuse"
    LOCATION_TRACKING = "Unauthorized Location Tracking"
    CALL_BOMBING = "Call Bombing"
    INTERCEPTION = "Potential Interception"


@dataclass
class SS7Message:
    """Represents a single SS7 message extracted from PCAP"""
    timestamp: float
    protocol: str
    operation_code: int
    operation_name: str
    source_pc: int  # Point code (originating)
    dest_pc: int  # Point code (destination)
    source_gt: Optional[str]  # Global title (calling party)
    dest_gt: Optional[str]  # Global title (called party)
    imsi: Optional[str]
    msisdn: Optional[str]
    payload_size: int
    raw_data: bytes = field(repr=False)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization"""
        return {
            'timestamp': self.timestamp,
            'timestamp_iso': datetime.fromtimestamp(self.timestamp).isoformat(),
            'protocol': self.protocol,
            'operation_code': self.operation_code,
            'operation_name': self.operation_name,
            'source_point_code': f"{self.source_pc:04X}",
            'dest_point_code': f"{self.dest_pc:04X}",
            'source_gt': self.source_gt,
            'dest_gt': self.dest_gt,
            'imsi': self._mask_imsi() if self.imsi else None,
            'msisdn': self._mask_msisdn() if self.msisdn else None,
            'payload_size': self.payload_size
        }
    
    def _mask_imsi(self) -> str:
        """Mask IMSI for privacy (show only MCC+MNC)"""
        if self.imsi and len(self.imsi) >= 6:
            return self.imsi[:6] + '*' * (len(self.imsi) - 6)
        return self.imsi or ''
    
    def _mask_msisdn(self) -> str:
        """Mask MSISDN for privacy"""
        if self.msisdn and len(self.msisdn) > 4:
            return '*' * (len(self.msisdn) - 4) + self.msisdn[-4:]
        return self.msisdn or ''


@dataclass
class Conversation:
    """Represents an SS7 conversation (dialogue between nodes)"""
    conversation_id: str
    start_time: float
    end_time: float
    messages: List[SS7Message] = field(default_factory=list)
    participants: List[str] = field(default_factory=list)
    protocol: str = ""
    
    @property
    def duration(self) -> float:
        return self.end_time - self.start_time
    
    @property
    def message_count(self) -> int:
        return len(self.messages)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'conversation_id': self.conversation_id,
            'start_time': datetime.fromtimestamp(self.start_time).isoformat(),
            'end_time': datetime.fromtimestamp(self.end_time).isoformat(),
            'duration_seconds': round(self.duration, 3),
            'message_count': self.message_count,
            'participants': self.participants,
            'protocol': self.protocol,
            'messages': [m.to_dict() for m in self.messages]
        }


@dataclass
class FraudIndicator:
    """Fraud detection indicator with metadata"""
    fraud_type: FraudType
    severity: str  # critical, high, medium, low
    confidence: float  # 0.0 to 1.0
    description: str
    affected_subscribers: List[str] = field(default_factory=list)
    evidence: List[Dict[str, Any]] = field(default_factory=list)
    timestamp: float = field(default_factory=lambda: datetime.now().timestamp())
    rule_id: str = ""
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'fraud_type': self.fraud_type.value,
            'severity': self.severity,
            'confidence': round(self.confidence, 2),
            'description': self.description,
            'affected_subscribers': self.affected_subscribers,
            'evidence_count': len(self.evidence),
            'evidence': self.evidence[:10],  # Limit evidence in output
            'timestamp': datetime.fromtimestamp(self.timestamp).isoformat(),
            'rule_id': self.rule_id
        }


# MAP Operation Code Registry (ITU-T Q.773)
MAP_OPERATIONS = {
    # Location Management
    2: "updateLocation",
    3: "cancelLocation",
    46: "purgeMS",
    50: "sendAuthenticationInfo",
    51: "insertSubscriberData",
    52: "deleteSubscriberData",
    
    # Call Handling
    56: "provideRoamingNumber",
    57: "resumeCallHandling",
    58: "forwardAccessSignalling",
    
    # SMS Operations
    44: "mo-forwardSM",  # Mobile Originated SMS
    45: "mt-forwardSM",  # Mobile Terminated SMS
    47: "reportSMDeliveryStatus",
    48: "informServiceCentre",
    59: "readyForSM",
    
    # USSD
    60: "processUnstructuredSS-Request",
    61: "processUnstructuredSS-Notify",
    62: "unstructuredSS-Request",
    63: "unstructuredSS-Notify",
    
    # Subscriber Management
    18: "registerSS",
    19: "eraseSS",
    20: "activateSS",
    21: "deactivateSS",
    22: "interrogateSS",
    23: "invokeSS",
    24: "registerPassword",
    25: "getPassword",
    
    # Authentication & Security
    49: "checkIMEI",
    53: "reset",
    
    # Call Independent Supplementary Services
    37: "anyTimeInterrogation",
    38: "anyTimeModification",
}

# CAP Operation Codes (ETSI 300.974)
CAP_OPERATIONS = {
    # Initial DP
    0: "initialDP",
    1: "assistRequestInstructions",
    2: "establishTemporaryConnection",
    3: "connectToResource",
    4: "connect",
    5: "releaseCall",
    6: "requestReportBCSMEvent",
    7: "eventReportBCSM",
    8: "continue",
    9: "connectToResource",
    
    # Charging
    20: "applyCharging",
    21: "applyChargingReport",
    
    # Call Information
    30: "callInformationReport",
    31: "callInformationRequest",
    
    # Service Interaction
    40: "activityTest",
    41: "activityTestResponse",
}


class SS7PcapAnalyzer:
    """
    Main analyzer class for SS7 PCAP files.
    
    Supports parsing of SCTP/M3UA/SIGTRAN encapsulated SS7 traffic
    and extraction of MAP, CAP, and ISUP conversations.
    """
    
    def __init__(self, config_path: Optional[str] = None):
        """Initialize the analyzer with optional configuration."""
        self.config = self._load_config(config_path)
        self.messages: List[SS7Message] = []
        self.conversations: List[Conversation] = []
        self.fraud_indicators: List[FraudIndicator] = []
        
        # Statistics counters
        self.stats = {
            'total_packets': 0,
            'ss7_packets': 0,
            'protocols': defaultdict(int),
            'operations': defaultdict(int),
            'point_codes': defaultdict(int),
            'global_titles': defaultdict(int),
            'time_range': {'start': None, 'end': None}
        }
        
        # Fraud detection thresholds (configurable)
        self.thresholds = {
            'irsf': {
                'international_calls_per_hour': 10,
                'unique_destinations': 5,
                'suspicious_duration_min': 55,
                'suspicious_duration_max': 65,
                'high_risk_countries': ['Premium Rate', 'High Cost']
            },
            'sim_swap': {
                'location_update_after_auth_fail': True,
                'multiple_provisioning_window_minutes': 60,
                'max_provisioning_attempts': 3
            },
            'wangiri': {
                'max_duration_seconds': 5,
                'min_calls_per_hour': 20,
                'unique_victims_threshold': 10
            },
            'sms_flood': {
                'max_sms_per_minute': 10,
                'max_sms_per_hour': 100
            },
            'ussd_abuse': {
                'max_ussd_per_minute': 15,
                'suspicious_patterns': ['**00*', '**21*']
            }
        }
        
        logger.info("SS7PcapAnalyzer initialized")
    
    def _load_config(self, config_path: Optional[str]) -> Dict:
        """Load configuration from YAML file if provided."""
        default_config = {
            'output_format': 'json',
            'include_raw_data': False,
            'fraud_detection_enabled': True,
            'protocols_to_analyze': ['MAP', 'CAP', 'ISUP'],
            'privacy_masking': True
        }
        
        if config_path and os.path.exists(config_path):
            try:
                import yaml
                with open(config_path, 'r') as f:
                    user_config = yaml.safe_load(f)
                    default_config.update(user_config)
                    logger.info(f"Loaded configuration from {config_path}")
            except ImportError:
                logger.warning("PyYAML not installed, using default config")
            except Exception as e:
                logger.error(f"Error loading config: {e}")
        
        return default_config
    
    def analyze_pcap(self, pcap_file: str, filter_protocol: Optional[str] = None) -> Dict[str, Any]:
        """
        Main analysis entry point.
        
        Args:
            pcap_file: Path to the PCAP file to analyze
            filter_protocol: Optional protocol filter (MAP, CAP, ISUP, etc.)
            
        Returns:
            Dictionary containing complete analysis results
        """
        logger.info(f"Starting analysis of {pcap_file}")
        
        if not os.path.exists(pcap_file):
            raise FileNotFoundError(f"PCAP file not found: {pcap_file}")
        
        # Parse the PCAP file
        self._parse_pcap_file(pcap_file, filter_protocol)
        
        # Extract conversations from parsed messages
        self.extract_conversations()
        
        # Run fraud detection if enabled
        if self.config.get('fraud_detection_enabled', True):
            self.detect_fraud_patterns()
        
        # Generate final report
        report = self.generate_report()
        
        logger.info(f"Analysis complete: {self.stats['ss7_packets']} SS7 packets analyzed")
        return report
    
    def _parse_pcap_file(self, pcap_file: str, filter_protocol: Optional[str]) -> None:
        """
        Parse PCAP file using available libraries.
        Tries scapy first, then dpkt as fallback.
        """
        try:
            self._parse_with_scapy(pcap_file, filter_protocol)
        except ImportError:
            logger.info("Scapy not available, trying dpkt...")
            try:
                self._parse_with_dpkt(pcap_file, filter_protocol)
            except ImportError:
                raise RuntimeError("No packet parsing library available. Install scapy or dpkt.")
    
    def _parse_with_scapy(self, pcap_file: str, filter_protocol: Optional[str]) -> None:
        """Parse PCAP using Scapy library."""
        from scapy.all import rdpcap, SCTP, Raw
        
        packets = rdpcap(pcap_file)
        self.stats['total_packets'] = len(packets)
        
        for pkt in packets:
            try:
                msg = self._extract_ss7_from_scapy(pkt, filter_protocol)
                if msg:
                    self.messages.append(msg)
                    self.stats['ss7_packets'] += 1
                    self.stats['protocols'][msg.protocol] += 1
                    self.stats['operations'][msg.operation_name] += 1
                    
                    # Update time range
                    ts = msg.timestamp
                    if self.stats['time_range']['start'] is None or ts < self.stats['time_range']['start']:
                        self.stats['time_range']['start'] = ts
                    if self.stats['time_range']['end'] is None or ts > self.stats['time_range']['end']:
                        self.stats['time_range']['end'] = ts
                        
            except Exception as e:
                logger.debug(f"Error processing packet: {e}")
                continue
    
    def _extract_ss7_from_scapy(self, pkt, filter_protocol: Optional[str]) -> Optional[SS7Message]:
        """Extract SS7 message from Scapy packet."""
        from scapy.all import SCTP, IP, Raw
        
        # Check for SCTP (SIGTRAN transport)
        if SCTP in pkt:
            sctp_layer = pkt[SCTP]
            
            # Try to parse M3UA payload
            if pkt.haslayer(Raw):
                raw_payload = bytes(pkt[Raw].load)
                
                # Parse M3UA header if present
                if len(raw_payload) >= 8:
                    m3ua_msg = self._parse_m3ua(raw_payload)
                    if m3ua_msg:
                        protocol = m3ua_msg.get('protocol', 'Unknown')
                        
                        # Apply protocol filter
                        if filter_protocol and protocol.upper() != filter_protocol.upper():
                            return None
                        
                        return SS7Message(
                            timestamp=float(pkt.time),
                            protocol=protocol,
                            operation_code=m3ua_msg.get('opcode', 0),
                            operation_name=m3ua_msg.get('opname', 'Unknown'),
                            source_pc=m3ua_msg.get('source_pc', 0),
                            dest_pc=m3ua_msg.get('dest_pc', 0),
                            source_gt=m3ua_msg.get('source_gt'),
                            dest_gt=m3ua_msg.get('dest_gt'),
                            imsi=m3ua_msg.get('imsi'),
                            msisdn=m3ua_msg.get('msisdn'),
                            payload_size=len(raw_payload),
                            raw_data=raw_payload
                        )
        return None
    
    def _parse_m3ua(self, data: bytes) -> Optional[Dict]:
        """
        Parse M3UA (MTP3 User Adaptation) message.
        Returns dictionary with extracted fields.
        """
        if len(data) < 8:
            return None
        
        # M3UA Common Header
        version = data[0]
        reserved = data[1]
        msg_class = data[2]
        msg_type = data[3]
        msg_length = struct.unpack('>I', data[4:8])[0]
        
        result = {
            'version': version,
            'msg_class': msg_class,
            'msg_type': msg_type,
            'protocol': 'Unknown'
        }
        
        # Message Class: 3 = SSNM, 1 = ASPTM, 0 = MGMT, 2 = RKM, 4 = Transfer
        if msg_class == 4:  # Transfer messages contain actual SS7
            if len(data) >= 16:
                # M3UA Protocol Data field contains MTP3 routing label
                opc = struct.unpack('>I', b'\x00' + data[8:11])[0]
                dpc = struct.unpack('>I', b'\x00' + data[11:14])[0]
                si = data[14]  # Service Indicator
                
                result['source_pc'] = opc
                result['dest_pc'] = dpc
                result['service_indicator'] = si
                
                # Map SI to protocol
                si_map = {
                    3: 'ISUP',
                    5: 'SCCP',
                    8: 'MTP3 Management'
                }
                base_protocol = si_map.get(si, f'SI-{si}')
                
                # Parse SCCP/TCAP/MAP payload
                if len(data) > 16:
                    tcap_data = data[16:]
                    tcap_info = self._parse_tcap(tcap_data)
                    result.update(tcap_info)
                    if tcap_info.get('protocol'):
                        result['protocol'] = tcap_info['protocol']
                    else:
                        result['protocol'] = base_protocol
        else:
            # Non-transfer M3UA message
            class_names = {
                0: 'MGMT',
                1: 'ASPTM',
                2: 'RKM',
                3: 'SSNM',
                4: 'Transfer'
            }
            result['protocol'] = f"M3UA-{class_names.get(msg_class, msg_class)}"
        
        return result
    
    def _parse_tcap(self, data: bytes) -> Dict:
        """Parse TCAP (Transaction Capabilities Application Part) layer."""
        result = {}
        
        if len(data) < 4:
            return result
        
        try:
            # Simple ASN.1 BER/DER parsing for TCAP
            # This is a simplified parser - production use should use proper ASN.1 library
            tag = data[0]
            
            # TCAP tags: 0x60=BEGIN, 0x61=END, 0x62=CONTINUE, 0x64=ABORT
            if tag in [0x60, 0x61, 0x62]:
                # Extract operation code from component portion
                op_code = self._extract_operation_code(data)
                result['opcode'] = op_code
                
                # Determine protocol based on operation code context
                if op_code in MAP_OPERATIONS:
                    result['opname'] = MAP_OPERATIONS[op_code]
                    result['protocol'] = 'MAP'
                elif op_code in CAP_OPERATIONS:
                    result['opname'] = CAP_OPERATIONS[op_code]
                    result['protocol'] = 'CAP'
                else:
                    result['opname'] = f'Operation_{op_code}'
                    result['protocol'] = 'TCAP'
                
                # Try to extract subscriber identifiers
                subscriber_info = self._extract_subscriber_params(data)
                result.update(subscriber_info)
                
        except Exception as e:
            logger.debug(f"TCAP parse error: {e}")
        
        return result
    
    def _extract_operation_code(self, data: bytes) -> int:
        """Extract TCAP operation code from component."""
        # Look for invoke component (tag 0xA1) and operation code
        idx = 0
        while idx < len(data) - 2:
            if data[idx] == 0xA1:  # Invoke component
                # Skip length and local opcode
                if idx + 3 < len(data):
                    if data[idx + 2] == 0x02:  # Integer tag
                        op_len = data[idx + 3]
                        if idx + 4 + op_len <= len(data):
                            return data[idx + 4]
            idx += 1
        return 0
    
    def _extract_subscriber_params(self, data: bytes) -> Dict:
        """Extract IMSI, MSISDN from TCAP parameters."""
        result = {'imsi': None, 'msisdn': None, 'source_gt': None, 'dest_gt': None}
        
        # Look for common patterns (simplified heuristic)
        # In production, use proper ASN.1 decoding
        try:
            data_str = data.hex()
            
            # IMSI pattern detection (E.212: starts with MCC for Algeria 603)
            # Look for TBCD-encoded strings of appropriate length
            idx = 0
            while idx < len(data) - 8:
                # Check for potential IMSI (15 digits = 8 bytes TBCD)
                segment = data[idx:idx+8]
                if self._looks_like_imsi(segment):
                    imsi = self._decode_tbcd(segment)
                    if imsi.startswith('603'):  # Algeria MCC
                        result['imsi'] = imsi
                        break
                idx += 1
                
        except Exception as e:
            logger.debug(f"Subscriber extraction error: {e}")
        
        return result
    
    def _looks_like_imsi(self, data: bytes) -> bool:
        """Heuristic check if data looks like TBCD-encoded IMSI."""
        if len(data) != 8:
            return False
        # Valid TBCD should have reasonable digit values
        for byte in data:
            nibble_high = (byte >> 4) & 0x0F
            nibble_low = byte & 0x0F
            if nibble_high > 9 and nibble_high not in [0x0A, 0x0B, 0x0C, 0x0D, 0x0E, 0x0F]:
                return False
            if nibble_low > 9 and nibble_low not in [0x0A, 0x0B, 0x0C, 0x0D, 0x0E, 0x0F]:
                return False
        return True
    
    def _decode_tbcd(self, data: bytes) -> str:
        """Decode TBCD (Telephony BCD) encoded string."""
        result = ''
        for byte in data:
            low_nibble = byte & 0x0F
            high_nibble = (byte >> 4) & 0x0F
            
            # Convert nibbles to digits
            if low_nibble <= 9:
                result += str(low_nibble)
            if high_nibble <= 9:
                result += str(high_nibble)
        return result
    
    def _parse_with_dpkt(self, pcap_file: str, filter_protocol: Optional[str]) -> None:
        """Parse PCAP using dpkt library (fallback method)."""
        import dpkt
        from dpkt.sctp import SCTP
        
        with open(pcap_file, 'rb') as f:
            pcap = dpkt.pcap.Reader(f)
            
            for timestamp, buf in pcap:
                self.stats['total_packets'] += 1
                try:
                    eth = dpkt.ethernet.Ethernet(buf)
                    
                    # Look for IP/SCTP
                    if isinstance(eth.data, dpkt.ip.IP):
                        ip = eth.data
                        if isinstance(ip.data, SCTP):
                            sctp = ip.data
                            
                            # Process SCTP chunks
                            for chunk in sctp.chunks:
                                if chunk.type == 0:  # DATA chunk
                                    msg = self._extract_ss7_from_dpkt(
                                        chunk.data, timestamp, 
                                        ip.src, ip.dst,
                                        filter_protocol
                                    )
                                    if msg:
                                        self.messages.append(msg)
                                        self.stats['ss7_packets'] += 1
                                        self.stats['protocols'][msg.protocol] += 1
                                        
                except Exception as e:
                    logger.debug(f"dpkt parse error: {e}")
                    continue
    
    def _extract_ss7_from_dpkt(self, data: bytes, timestamp: float, 
                                 src_ip: bytes, dst_ip: bytes,
                                 filter_protocol: Optional[str]) -> Optional[SS7Message]:
        """Extract SS7 message from dpkt-parsed data."""
        # Reuse M3UA parser
        m3ua_msg = self._parse_m3ua(data)
        if m3ua_msg:
            protocol = m3ua_msg.get('protocol', 'Unknown')
            if filter_protocol and protocol.upper() != filter_protocol.upper():
                return None
            
            return SS7Message(
                timestamp=timestamp,
                protocol=protocol,
                operation_code=m3ua_msg.get('opcode', 0),
                operation_name=m3ua_msg.get('opname', 'Unknown'),
                source_pc=m3ua_msg.get('source_pc', 0),
                dest_pc=m3ua_msg.get('dest_pc', 0),
                source_gt=m3ua_msg.get('source_gt'),
                dest_gt=m3ua_msg.get('dest_gt'),
                imsi=m3ua_msg.get('imsi'),
                msisdn=m3ua_msg.get('msisdn'),
                payload_size=len(data),
                raw_data=data
            )
        return None
    
    def extract_conversations(self) -> List[Conversation]:
        """
        Group messages into conversations based on TCAP dialogues.
        A conversation is a sequence of related messages between endpoints.
        """
        logger.info("Extracting conversations...")
        
        # Group messages by dialogue ID (simplified: group by source-dest pair within time window)
        dialogue_groups: Dict[str, List[SS7Message]] = defaultdict(list)
        
        # Time window for grouping related messages (5 minutes)
        time_window_seconds = 300
        
        for msg in self.messages:
            # Create dialogue key from point codes
            key_base = f"{msg.source_pc}-{msg.dest_pc}"
            
            # Find existing dialogue or create new one
            found_group = False
            for key in list(dialogue_groups.keys()):
                if key.startswith(key_base) or key.endswith(key_base.replace('-', '-')[::-1].split('-', 1)[-1]):
                    # Check time window
                    group_msgs = dialogue_groups[key]
                    if group_msgs and abs(msg.timestamp - group_msgs[-1].timestamp) < time_window_seconds:
                        dialogue_groups[key].append(msg)
                        found_group = True
                        break
            
            if not found_group:
                new_key = f"{key_base}-{len(dialogue_groups)}"
                dialogue_groups[new_key].append(msg)
        
        # Create Conversation objects
        self.conversations = []
        for key, msgs in dialogue_groups.items():
            if msgs:
                conv = Conversation(
                    conversation_id=hashlib.md5(key.encode()).hexdigest()[:12],
                    start_time=min(m.timestamp for m in msgs),
                    end_time=max(m.timestamp for m in msgs),
                    messages=msgs,
                    participants=list(set(
                        [f"PC-{m.source_pc:04X}" for m in msgs] +
                        [f"PC-{m.dest_pc:04X}" for m in msgs]
                    )),
                    protocol=msgs[0].protocol if msgs else "Unknown"
                )
                self.conversations.append(conv)
        
        # Sort by start time
        self.conversations.sort(key=lambda c: c.start_time)
        
        logger.info(f"Extracted {len(self.conversations)} conversations")
        return self.conversations
    
    def detect_fraud_patterns(self) -> List[FraudIndicator]:
        """
        Run fraud detection heuristics on analyzed messages.
        Implements multiple detection algorithms for different fraud types.
        """
        logger.info("Running fraud detection analysis...")
        
        self.fraud_indicators = []
        
        # Run each detection module
        self._detect_irsf()
        self._detect_sim_swap()
        self._detect_wangiri()
        self._detect_sms_flood()
        self._detect_ussd_abuse()
        self._detect_location_tracking()
        
        # Sort by severity
        severity_order = {'critical': 0, 'high': 1, 'medium': 2, 'low': 3}
        self.fraud_indicators.sort(
            key=lambda x: (severity_order.get(x.severity, 4), -x.confidence)
        )
        
        logger.info(f"Detected {len(self.fraud_indicators)} potential fraud indicators")
        return self.fraud_indicators
    
    def _detect_irsf(self) -> None:
        """
        Detect International Revenue Share Fraud (IRSF).
        
        Heuristics:
        - High volume of international calls to premium destinations
        - Calls with duration exactly at billing intervals (e.g., 60 seconds)
        - Multiple unique international destinations from single subscriber
        """
        threshold = self.thresholds['irsf']
        
        # Group calls by originating MSISDN
        calls_by_subscriber: Dict[str, List[SS7Message]] = defaultdict(list)
        
        for msg in self.messages:
            if msg.protocol == 'ISUP' or msg.operation_name in ['setup', 'initialDP']:
                if msg.msisdn:
                    calls_by_subscriber[msg.msisdn].append(msg)
        
        for msisdn, calls in calls_by_subscriber.items():
            if len(calls) < threshold['international_calls_per_hour']:
                continue
            
            # Check for suspicious duration patterns
            suspicious_calls = []
            unique_destinations = set()
            
            for call in calls:
                if call.dest_gt:
                    unique_destinations.add(call.dest_gt)
                    # Check for exact 60-second pattern (common in IRSF)
                    # This would need CDR correlation in production
            
            if (len(unique_destinations) >= threshold['unique_destinations'] and 
                len(calls) >= threshold['international_calls_per_hour']):
                
                indicator = FraudIndicator(
                    fraud_type=FraudType.IRSF,
                    severity='critical',
                    confidence=min(0.95, 0.5 + (len(calls) / 100)),
                    description=f"Potential IRSF detected: {len(calls)} international calls "
                               f"to {len(unique_destinations)} unique destinations in 1 hour",
                    affected_subscribers=[msisdn],
                    evidence=[{'call_count': len(calls), 'destinations': len(unique_destinations)}],
                    rule_id='IRS-001'
                )
                self.fraud_indicators.append(indicator)
    
    def _detect_sim_swap(self) -> None:
        """
        Detect SIM Swap fraud indicators.
        
        Heuristics:
        - Location Update after authentication failure
        - Multiple provisioning attempts in short window
        - InsertSubscriberData followed by unusual activity
        """
        threshold = self.thresholds['sim_swap']
        
        # Track authentication failures per subscriber
        auth_failures: Dict[str, List[float]] = defaultdict(list)
        location_updates: Dict[str, List[float]] = defaultdict(list)
        provisioning_events: Dict[str, List[float]] = defaultdict(list)
        
        for msg in self.messages:
            if msg.imsi:
                # Track sendAuthenticationInfo (potential auth check)
                if msg.operation_name == 'sendAuthenticationInfo':
                    auth_failures[msg.imsi].append(msg.timestamp)
                
                # Track updateLocation (location update)
                if msg.operation_name == 'updateLocation':
                    location_updates[msg.imsi].append(msg.timestamp)
                
                # Track insertSubscriberData (provisioning)
                if msg.operation_name == 'insertSubscriberData':
                    provisioning_events[msg.imsi].append(msg.timestamp)
        
        # Check for SIM swap patterns
        for imsi in auth_failures:
            events = auth_failures[imsi]
            
            # Check for auth failure followed closely by location update
            if imsi in location_updates:
                for lu_time in location_updates[imsi]:
                    for af_time in events:
                        time_diff = abs(lu_time - af_time)
                        if time_diff < 300:  # Within 5 minutes
                            indicator = FraudIndicator(
                                fraud_type=FraudType.SIM_SWAP,
                                severity='critical',
                                confidence=0.85,
                                description="Authentication failure followed by location update - "
                                          "possible SIM swap detected",
                                affected_subscribers=[imsi],
                                evidence=[{'auth_failure': af_time, 'location_update': lu_time}],
                                rule_id='SIM-001'
                            )
                            self.fraud_indicators.append(indicator)
                            break
        
        # Check for multiple provisioning attempts
        for imsi, times in provisioning_events.items():
            if len(times) >= threshold['max_provisioning_attempts']:
                # Check if attempts are within window
                sorted_times = sorted(times)
                for i in range(len(sorted_times) - threshold['max_provisioning_attempts'] + 1):
                    window = sorted_times[i + threshold['max_provisioning_attempts'] - 1] - sorted_times[i]
                    if window <= threshold['multiple_provisioning_window_minutes'] * 60:
                        indicator = FraudIndicator(
                            fraud_type=FraudType.SIM_SWAP,
                            severity='high',
                            confidence=0.75,
                            description=f"Multiple SIM provisioning attempts ({len(times)}) "
                                      f"detected within short timeframe",
                            affected_subscribers=[imsi],
                            evidence=[{'attempt_count': len(times), 'timespan_minutes': window / 60}],
                            rule_id='SIM-002'
                        )
                        self.fraud_indicators.append(indicator)
                        break
    
    def _detect_wangiri(self) -> None:
        """
        Detect Wangiri (one-ring) fraud pattern.
        
        Heuristics:
        - Many very short-duration calls (< 5 seconds)
        - High number of unique victims called
        - Pattern of single ring then hang-up
        """
        threshold = self.thresholds['wangiri']
        
        # Group by calling party (attacker)
        calls_by_caller: Dict[str, List[SS7Message]] = defaultdict(list)
        
        for msg in self.messages:
            if msg.protocol == 'ISUP' or msg.operation_name in ['initialDP', 'setup']:
                if msg.source_gt:
                    calls_by_caller[msg.source_gt].append(msg)
        
        for caller, calls in calls_by_caller.items():
            if len(calls) < threshold['min_calls_per_hour']:
                continue
            
            unique_victims = set()
            short_calls = 0
            
            for call in calls:
                if call.dest_gt:
                    unique_victims.add(call.dest_gt)
                # Short duration calls (would need CDR data for exact duration)
                # Using proxy metric here
                short_calls += 1
            
            if (len(unique_victims) >= threshold['unique_victims_threshold'] and
                len(calls) >= threshold['min_calls_per_hour']):
                
                indicator = FraudIndicator(
                    fraud_type=FraudType.WANGIRI,
                    severity='high',
                    confidence=min(0.9, 0.4 + (len(calls) / 200)),
                    description=f"Wangiri pattern detected: {len(calls)} calls to "
                              f"{len(unique_victims)} unique numbers, avg duration suggests one-ring",
                    affected_subscribers=[caller],
                    evidence=[
                        {'total_calls': len(calls), 
                         'unique_victims': len(unique_victims),
                         'short_calls': short_calls}
                    ],
                    rule_id='WAN-001'
                )
                self.fraud_indicators.append(indicator)
    
    def _detect_sms_flood(self) -> None:
        """Detect SMS flooding attacks."""
        threshold = self.thresholds['sms_flood']
        
        sms_by_sender: Dict[str, List[SS7Message]] = defaultdict(list)
        
        for msg in self.messages:
            if msg.operation_name in ['mo-forwardSM', 'mt-forwardSM']:
                if msg.msisdn:
                    sms_by_sender[msg.msisdn].append(msg)
        
        for sender, sms_list in sms_by_sender.items():
            # Check per-minute rate
            sorted_sms = sorted(sms_list, key=lambda x: x.timestamp)
            
            for i, sms in enumerate(sorted_sms):
                window_start = sms.timestamp
                count_in_window = 1
                
                for j in range(i + 1, len(sorted_sms)):
                    if sorted_sms[j].timestamp - window_start <= 60:
                        count_in_window += 1
                    else:
                        break
                
                if count_in_window > threshold['max_sms_per_minute']:
                    indicator = FraudIndicator(
                        fraud_type=FraudType.SMS_FLOOD,
                        severity='medium',
                        confidence=0.8,
                        description=f"SMS flood detected: {count_in_window} SMS in 1 minute",
                        affected_subscribers=[sender],
                        evidence=[{'sms_count': count_in_window}],
                        rule_id='SMS-001'
                    )
                    self.fraud_indicators.append(indicator)
                    break
    
    def _detect_ussd_abuse(self) -> None:
        """Detect USSD abuse patterns."""
        threshold = self.thresholds['ussd_abuse']
        
        ussd_sessions: Dict[str, List[SS7Message]] = defaultdict(list)
        
        for msg in self.messages:
            if 'USSD' in msg.operation_name or 'unstructuredSS' in msg.operation_name.lower():
                if msg.msisdn:
                    ussd_sessions[msg.msisdn].append(msg)
        
        for msisdn, sessions in ussd_sessions.items():
            if len(sessions) > threshold['max_ussd_per_minute']:
                indicator = FraudIndicator(
                    fraud_type=FraudType.USSD_ABUSE,
                    severity='low',
                    confidence=0.6,
                    description=f"High USSD activity: {len(sessions)} sessions detected",
                    affected_subscribers=[msisdn],
                    evidence=[{'session_count': len(sessions)}],
                    rule_id='USS-001'
                )
                self.fraud_indicators.append(indicator)
    
    def _detect_location_tracking(self) -> None:
        """Detect potential unauthorized location tracking via provideSubscriberInfo."""
        tracking_queries: Dict[str, List[SS7Message]] = defaultdict(list)
        
        for msg in self.messages:
            if msg.operation_name == 'anyTimeInterrogation':
                if msg.dest_gt:
                    tracking_queries[msg.dest_gt].append(msg)
        
        for target, queries in tracking_queries.items():
            if len(queries) > 50:  # More than 50 location queries is suspicious
                sources = set(q.source_gt for q in queries if q.source_gt)
                indicator = FraudIndicator(
                    fraud_type=FraudType.LOCATION_TRACKING,
                    severity='high',
                    confidence=0.7,
                    description=f"Excessive location queries ({len(queries)}) for single subscriber",
                    affected_subscribers=[target],
                    evidence=[{'query_count': len(queries), 'query_sources': len(sources)}],
                    rule_id='LOC-001'
                )
                self.fraud_indicators.append(indicator)
    
    def generate_report(self) -> Dict[str, Any]:
        """Generate comprehensive analysis report."""
        report = {
            'metadata': {
                'generated_at': datetime.now().isoformat(),
                'analyzer_version': '1.0.0',
                'platform': 'Djezzy National SOC Platform'
            },
            'summary': {
                'total_packets_analyzed': self.stats['total_packets'],
                'ss7_messages_extracted': self.stats['ss7_packets'],
                'conversations_identified': len(self.conversations),
                'fraud_indicators_found': len(self.fraud_indicators),
                'analysis_time_range': {
                    'start': (datetime.fromtimestamp(self.stats['time_range']['start']).isoformat() 
                             if self.stats['time_range']['start'] else None),
                    'end': (datetime.fromtimestamp(self.stats['time_range']['end']).isoformat() 
                           if self.stats['time_range']['end'] else None)
                }
            },
            'protocol_distribution': dict(self.stats['protocols']),
            'operation_statistics': dict(self.stats['operations']),
            'conversations': [c.to_dict() for c in self.conversations[:100]],  # Limit output
            'fraud_indicators': [f.to_dict() for f in self.fraud_indicators],
            'statistics': {
                'unique_point_codes': len(self.stats['point_codes']),
                'unique_global_titles': len(self.stats['global_titles']),
                'top_operations': dict(sorted(self.stats['operations'].items(), 
                                             key=lambda x: -x[1])[:20])
            }
        }
        return report
    
    def export_csv(self, output_path: str) -> None:
        """Export messages to CSV format."""
        with open(output_path, 'w', newline='') as f:
            writer = csv.writer(f)
            
            # Header row
            writer.writerow([
                'Timestamp', 'Protocol', 'Operation Code', 'Operation Name',
                'Source PC', 'Dest PC', 'Source GT', 'Dest GT',
                'IMSI', 'MSISDN', 'Payload Size'
            ])
            
            # Data rows
            for msg in self.messages:
                writer.writerow([
                    datetime.fromtimestamp(msg.timestamp).isoformat(),
                    msg.protocol,
                    msg.operation_code,
                    msg.operation_name,
                    f"{msg.source_pc:04X}",
                    f"{msg.dest_pc:04X}",
                    msg.source_gt,
                    msg.dest_gt,
                    msg._mask_imsi(),
                    msg._mask_msisdn(),
                    msg.payload_size
                ])
        
        logger.info(f"CSV exported to {output_path}")


def main():
    """Main entry point for command-line usage."""
    parser = argparse.ArgumentParser(
        description='SS7 PCAP Analyzer for Djezzy SOC Platform',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s capture.pcap
  %(prog)s capture.pcap --format json --output report.json
  %(prog)s capture.pcap --fraud-check --csv-export
  %(prog)s capture.pcap --filter MAP --verbose
        """
    )
    
    parser.add_argument('input_file', help='Input PCAP file to analyze')
    parser.add_argument('--format', choices=['json', 'text'], default='json',
                       help='Output format (default: json)')
    parser.add_argument('--output', '-o', help='Output file path')
    parser.add_argument('--config', '-c', help='Path to configuration YAML file')
    parser.add_argument('--filter', help='Filter by protocol (MAP, CAP, ISUP, etc.)')
    parser.add_argument('--fraud-check', action='store_true',
                       help='Enable fraud detection analysis')
    parser.add_argument('--no-fraud', action='store_true',
                       help='Disable fraud detection')
    parser.add_argument('--csv-export', action='store_true',
                       help='Export messages to CSV file')
    parser.add_argument('--csv-path', help='Custom CSV output path')
    parser.add_argument('--verbose', '-v', action='store_true',
                       help='Enable verbose output')
    parser.add_argument('--quiet', '-q', action='store_true',
                       help='Suppress non-error output')
    
    args = parser.parse_args()
    
    # Configure logging level
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)
    elif args.quiet:
        logging.getLogger().setLevel(logging.ERROR)
    
    try:
        # Initialize analyzer
        analyzer = SS7PcapAnalyzer(config_path=args.config)
        
        # Override fraud detection setting
        if args.no_fraud:
            analyzer.config['fraud_detection_enabled'] = False
        if args.fraud_check:
            analyzer.config['fraud_detection_enabled'] = True
        
        # Run analysis
        report = analyzer.analyze_pcap(args.input_file, filter_protocol=args.filter)
        
        # Output results
        if args.format == 'json':
            output = json.dumps(report, indent=2, default=str)
            if args.output:
                with open(args.output, 'w') as f:
                    f.write(output)
                print(f"Report written to {args.output}")
            else:
                print(output)
        else:
            print_text_report(report)
        
        # CSV export
        if args.csv_export:
            csv_path = args.csv_path or args.input_file.replace('.pcap', '_messages.csv')
            analyzer.export_csv(csv_path)
        
        # Exit with error code if fraud detected
        if report['fraud_indicators_found'] > 0:
            sys.exit(2)  # Custom exit code for fraud detected
            
    except FileNotFoundError as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        logger.exception("Analysis failed")
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


def print_text_report(report: Dict) -> None:
    """Print human-readable text report."""
    print("\n" + "=" * 70)
    print("SS7 PCAP ANALYSIS REPORT - DJEZZY NATIONAL SOC PLATFORM")
    print("=" * 70)
    
    meta = report['metadata']
    print(f"\nGenerated: {meta['generated_at']}")
    print(f"Analyzer Version: {meta['analyzer_version']}")
    
    summary = report['summary']
    print(f"\n--- Summary ---")
    print(f"Total Packets Analyzed: {summary['total_packets_analyzed']:,}")
    print(f"SS7 Messages Extracted: {summary['ss7_messages_extracted']:,}")
    print(f"Conversations Identified: {summary['conversations_identified']:,}")
    print(f"Fraud Indicators Found: {summary['fraud_indicators_found']}")
    
    print(f"\n--- Protocol Distribution ---")
    for proto, count in report['protocol_distribution'].items():
        print(f"  {proto}: {count:,} ({count/report['ss7_messages_extracted']*100:.1f}%)")
    
    print(f"\n--- Top Operations ---")
    for op, count in list(report['statistics']['top_operations'].items())[:10]:
        print(f"  {op}: {count:,}")
    
    if report['fraud_indicators']:
        print(f"\n!!! FRAUD INDICATORS !!!")
        print("-" * 40)
        for indicator in report['fraud_indicators'][:10]:
            print(f"[{indicator['severity'].upper()}] {indicator['fraud_type']}")
            print(f"  Confidence: {indicator['confidence']:.0%}")
            print(f"  {indicator['description']}")
            print()
    
    print("=" * 70 + "\n")


if __name__ == '__main__':
    main()
