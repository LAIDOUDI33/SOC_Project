#!/usr/bin/env python3
"""
MAP Test Case Generator
Djezzy National SOC Platform - SS7 Tools Suite

Generates test MAP messages for validation:
- Subscriber authentication (sendAuthenticationInfo)
- Location update (updateLocation)
- SMS routing (routingInfoForSM)
- Call handling (provideRoamingNumber)
- And many more MAP operations

Usage:
    python map-message-generator.py --operation sendAuthenticationInfo --count 10
    python map-message-generator.py --operation all --output test_messages.json
    python map-message-generator.py --scenario location_update_flow --verbose

Author: Djezzy SOC Team
Version: 1.0.0
"""

import argparse
import json
import sys
import random
import struct
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, field, asdict
from enum import IntEnum


# ============================================================
# CONSTANTS & ENUMS
# ============================================================

class MAPOperation(IntEnum):
    """MAP Operation Codes (3GPP TS 29.002)"""
    # Location Management
    UPDATE_LOCATION = 2
    CANCEL_LOCATION = 3
    PROVIDE_ROAMING_NUMBER = 4
    NOTE_SUBSCRIBER_PRESENT_IN_VLR = 11
    RESET = 37
    
    # Subscriber Management
    INSERT_SUBSCRIBER_DATA = 9
    DELETE_SUBSCRIBER_DATA = 10
    
    # Authentication & Security
    SEND_AUTHENTICATION_INFO = 56
    SEND_IDENTIFICATION = 57
    
    # Call Handling
    PROCESS_ACCESS_REQUEST = 44
    PREPARE_HANDOVER = 45
    PREPARE_SUBSEQUENT_HANDOVER = 47
    PROCESS_ROAMING_NUMBER = 50
    EXECUTE_HANDOVER = 51
    SEND_END_SIGNAL = 58
    
    # SMS Operations
    ROUTING_INFO_FOR_SM = 22
    MO_FORWARD_SHORT_MESSAGE = 46
    MT_FORWARD_SHORT_MESSAGE = 44
    REPORT_SM_DELIVERY_STATUS = 23
    INFORM_SERVICE_CENTRE = 32
    ALERT_SERVICE_CENTRE = 33
    READY_FOR_SM = 24
    NOTE_MS_PRESENT_FOR_GPRS = 73
    
    # USSD
    PROCESS_UNSTRUCTURED_SS_REQUEST = 59
    UNSTRUCTURE_SS_REQUEST = 60
    UNSTRUCTURE_SS_NOTIFY = 61
    
    # Subscriber Information Enquiry
    ANY_TIME_INTERROGATION = 66
    ANY_TIME_SUBSCRIPTION_INTERROGATION = 69
    PROVIDE_SUBSCRIBER_INFO = 70
    PROVIDESubscriberInfo = 71
    
    # IMEI Management
    CHECK_IMEI = 41
    
    # LCS (Location Services)
    PROVIDE_SUBSCRIBER_LOCATION = 83
    SUBSCRIBER_LOCATION_REPORT = 74
    
    # GPRS
    SEND_ROUTING_INFO_FOR_GPRS = 12
    FAILURE_REPORT = 25
    NOTE_MSUBSCRIBER_PRESENT_IN_GPRS = 26


class TCAPMessageType(IntEnum):
    """TCAP Message Types"""
    UNIDIRECTIONAL = 0x61
    QUERY_WITH_PERMISSION = 0x62
    QUERY_WITHOUT_PERMISSION = 0x63
    RESPONSE_WITH_PERMISSION = 0x64
    RESPONSE_WITHOUT_PERMISSION = 0x65
    CONVERSATION_WITH_PERMISSION = 0x66
    CONVERSATION_WITHOUT_PERMISSION = 0x67
    ABORT = 0x68


# ============================================================
# DATA CLASSES
# ============================================================

@dataclass
class PointCode:
    """SS7 Point Code (ITU-T 14-bit)"""
    raw: int
    
    @property
    def display(self) -> str:
        network = (self.raw >> 11) & 0x07
        cluster = (self.raw >> 3) & 0xFF
        member = self.raw & 0x07
        return f"{network}-{cluster:03d}-{member}"


@dataclass
class GlobalTitle:
    """Global Title representation"""
    digits: str
    translation_type: int = 0
    numbering_plan: int = 1  # E.164
    nature_of_address: int = 4  # International
    
    @property
    def encoded_tbcd(self) -> bytes:
        """Encode to TBCD format"""
        result = bytearray()
        
        # Encoding scheme + Numbering plan
        result.append((self.translation_type << 4) | self.numbering_plan)
        
        # Nature of address + Length of digits
        digit_len = len(self.digits)
        result.append((self.nature_of_address << 4) | (digit_len if digit_len <= 9 else 0xF))
        
        # Digits in TBCD format
        for i in range(0, len(self.digits), 2):
            d1 = int(self.digits[i]) if i < len(self.digits) else 0xF
            d2 = int(self.digits[i+1]) if i+1 < len(self.digits) else 0xF
            
            # Low nibble first, then high nibble
            result.append((d2 << 4) | d1)
        
        return bytes(result)


@dataclass
class MAPMessage:
    """Generated MAP message structure"""
    id: str
    timestamp: datetime
    operation: MAPOperation
    operation_name: str
    direction: str  # invoke / return_result / return_error
    tcap_message_type: TCAPMessageType
    invoke_id: int
    
    # Routing
    opc: PointCode
    dpc: PointCode
    sls: int
    
    # Addresses
    source_gt: Optional[GlobalTitle] = None
    destination_gt: Optional[GlobalTitle] = None
    source_ssn: Optional[int] = None
    destination_ssn: Optional[int] = None
    
    # Parameters (decoded)
    parameters: Dict[str, Any] = field(default_factory=dict)
    
    # Raw data
    raw_hex: str = ""
    packet_length: int = 0
    
    # Subscriber info (masked for privacy)
    imsi: Optional[str] = None
    msisdn: Optional[str] = None
    masked_imsi: Optional[str] = None
    masked_msisdn: Optional[str] = None


@dataclass
class GeneratorConfig:
    """Configuration for MAP message generator"""
    operation: Optional[str] = None
    count: int = 1
    output_file: Optional[str] = None
    output_format: str = "json"  # json, hex, detailed
    verbose: bool = False
    
    # Network defaults
    default_opc: int = 101  # MSC
    default_dpc: int = 3   # HLR
    default_ssn_hlr: int = 8
    default_ssn_msc: int = 2
    default_ssn_smsc: int = 150
    
    # Subscriber ranges
    imsi_prefix: str = "60301"  # Algeria MCC+MNC (Djezzy)
    msisdn_country_code: str = "+213"
    
    # Randomize options
    randomize_subscribers: bool = True
    randomize_timestamps: bool = True


# ============================================================
# GENERATOR CLASS
# ============================================================

class MAPMessageGenerator:
    """
    Generates test MAP messages for validation and testing.
    
    Supports all major MAP operations with realistic parameter values.
    """
    
    def __init__(self, config: GeneratorConfig):
        self.config = config
        self.messages: List[MAPMessage] = []
        self._message_counter = 0
        
        # Operation name mapping
        self.operation_names = {
            MAPOperation.UPDATE_LOCATION: 'updateLocation',
            MAPOperation.CANCEL_LOCATION: 'cancelLocation',
            MAPOperation.PROVIDE_ROAMING_NUMBER: 'provideRoamingNumber',
            MAPOperation.SEND_AUTHENTICATION_INFO: 'sendAuthenticationInfo',
            MAPOperation.INSERT_SUBSCRIBER_DATA: 'insertSubscriberData',
            MAPOperation.DELETE_SUBSCRIBER_DATA: 'deleteSubscriberData',
            MAPOperation.ROUTING_INFO_FOR_SM: 'routingInfoForSM',
            MAPOperation.MO_FORWARD_SHORT_MESSAGE: 'moForwardSM',
            MAPOperation.MT_FORWARD_SHORT_MESSAGE: 'mtForwardSM',
            MAPOperation.PROCESS_UNSTRUCTURED_SS_REQUEST: 'processUSSD',
            MAPOperation.ANY_TIME_INTERROGATION: 'anyTimeInterrogation',
            MAPOperation.CHECK_IMEI: 'checkIMEI',
            MAPOperation.PROVIDE_SUBSCRIBER_LOCATION: 'provideSubscriberLocation',
            MAPOperation.SEND_ROUTING_INFO_FOR_GPRS: 'sendRoutingInfoForGPRS',
            MAPOperation.READY_FOR_SM: 'readyForSM',
            MAPOperation.ALERT_SERVICE_CENTRE: 'alertServiceCentre',
            MAPOperation.REPORT_SM_DELIVERY_STATUS: 'reportSMDeliveryStatus',
        }
        
        self.log(f"MAP Message Generator initialized")
        if config.operation:
            self.log(f"Target operation: {config.operation}")
    
    def log(self, message: str) -> None:
        """Print message if verbose mode is enabled"""
        if self.config.verbose:
            print(f"[GENERATOR] {message}")
    
    def generate(self) -> List[MAPMessage]:
        """
        Generate messages based on configuration.
        
        Returns:
            List of generated MAP messages
        """
        if self.config.operation == 'all':
            # Generate one of each operation type
            for op in MAPOperation:
                if op != MAPOperation.UNDEFINED if hasattr(MAPOperation, 'UNDEFINED') else True:
                    try:
                        msg = self._generate_single_message(op)
                        if msg:
                            self.messages.append(msg)
                    except Exception as e:
                        self.log(f"Error generating {op.name}: {e}")
        else:
            # Generate specified operation(s)
            target_ops = self._resolve_operations()
            
            for _ in range(self.config.count):
                op = random.choice(target_ops)
                msg = self._generate_single_message(op)
                if msg:
                    self.messages.append(msg)
        
        self.log(f"Generated {len(self.messages)} messages")
        
        # Write output if requested
        if self.config.output_file:
            self._write_output()
        
        return self.messages
    
    def _resolve_operations(self) -> List[MAPOperation]:
        """Resolve operation name/enum to list of operations"""
        if not self.config.operation:
            return [MAPOperation.SEND_AUTHENTICATION_INFO]  # Default
        
        op_str = self.config.operation.lower().replace('-', '_').replace(' ', '_')
        
        # Try to match by name
        for op in MAPOperation:
            if op.name.lower() == op_str or str(op.value) == self.config.operation:
                return [op]
        
        # Try common aliases
        aliases = {
            'auth': MAPOperation.SEND_AUTHENTICATION_INFO,
            'authentication': MAPOperation.SEND_AUTHENTICATION_INFO,
            'location_update': MAPOperation.UPDATE_LOCATION,
            'lu': MAPOperation.UPDATE_LOCATION,
            'sms_routing': MAPOperation.ROUTING_INFO_FOR_SM,
            'sms_mo': MAPOperation.MO_FORWARD_SHORT_MESSAGE,
            'sms_mt': MAPOperation.MT_FORWARD_SHORT_MESSAGE,
            'ussd': MAPOperation.PROCESS_UNSTRUCTURED_SS_REQUEST,
            'roaming_number': MAPOperation.PROVIDE_ROAMING_NUMBER,
            'prn': MAPOperation.PROVIDE_ROAMING_NUMBER,
            'ati': MAPOperation.ANY_TIME_INTERROGATION,
            'imei_check': MAPOperation.CHECK_IMEI,
            'gprs_routing': MAPOperation.SEND_ROUTING_INFO_FOR_GPRS,
            'subscriber_info': MAPOperation.PROVIDE_SUBSCRIBER_INFO,
            'location': MAPOperation.PROVIDE_SUBSCRIBER_LOCATION,
            'ready_for_sm': MAPOperation.READY_FOR_SM,
            'alert_sc': MAPOperation.ALERT_SERVICE_CENTRE,
            'sm_delivery': MAPOperation.REPORT_SM_DELIVERY_STATUS,
        }
        
        if op_str in aliases:
            return [aliases[op_str]]
        
        # Return all operations as fallback
        return list(MAPOperation)[:15]  # Limit to avoid too many
    
    def _generate_single_message(self, operation: MAPOperation) -> Optional[MAPMessage]:
        """Generate a single MAP message for the given operation"""
        self._message_counter += 1
        
        now = datetime.now()
        if self.config.randomize_timestamps:
            now = now - timedelta(seconds=random.randint(0, 3600))
        
        # Generate subscriber info
        imsi, msisdn = self._generate_subscriber()
        
        # Determine routing based on operation
        opc, dpc, src_ssn, dst_ssn, src_gt, dst_gt = self._get_routing_for_operation(operation)
        
        # Generate operation-specific parameters
        params = self._generate_parameters(operation, imsi, msisdn)
        
        # Generate raw hex (simplified but realistic structure)
        raw_hex, pkt_len = self._build_raw_hex(operation, params, imsi, msisdn)
        
        # Determine direction (invoke vs response)
        direction = random.choice(['invoke', 'return_result', 'return_error']) if random.random() > 0.7 else 'invoke'
        tcap_type = TCAPMessageType.QUERY_WITH_PERMISSION if direction == 'invoke' else TCAPMessageType.RESPONSE_WITH_PERMISSION
        
        return MAPMessage(
            id=f"map_{self._message_counter:06d}",
            timestamp=now,
            operation=operation,
            operation_name=self.operation_names.get(operation, f'MAP_Op_{operation.value}'),
            direction=direction,
            tcap_message_type=tcap_type,
            invoke_id=random.randint(1, 255),
            opc=opc,
            dpc=dpc,
            sls=random.randint(0, 15),
            source_gt=src_gt,
            destination_gt=dst_gt,
            source_ssn=src_ssn,
            destination_ssn=dst_ssn,
            parameters=params,
            raw_hex=raw_hex,
            packet_length=pkt_len,
            imsi=imsi,
            msisdn=msisdn,
            masked_imsi=imsi[:5] + '*' * 10 if imsi else None,
            masked_msisdn='+213' + msisdn[-7:-2] + '**' + msisdn[-2:] if msisdn else None,
        )
    
    def _generate_subscriber(self) -> Tuple[str, str]:
        """Generate realistic-looking IMSI and MSISDN"""
        if self.config.randomize_subscribers:
            # IMSI: MCC(603) + MNC(01) + MSIN (10 digits)
            msin = ''.join([str(random.randint(0, 9)) for _ in range(10)])
            imsi = f"{self.config.imsi_prefix}{msin}"
            
            # MSISDN: +213 + prefix (55/66/77 for Djezzy) + number
            prefix = random.choice(['55', '66', '77'])
            number = ''.join([str(random.randint(0, 9)) for _ in range(7)])
            msisdn = f"{prefix}{number}"
        else:
            imsi = f"{self.config.imsi_prefix}{'1' * 10}"  # Test IMSI
            msisdn = f"{self.config.msisdn_country_code}5501234567"  # Test MSISDN
        
        return imsi, msisdn
    
    def _get_routing_for_operation(
        self, 
        operation: MAPOperation
    ) -> Tuple[PointCode, PointCode, Optional[int], Optional[int], Optional[GlobalTitle], Optional[GlobalTitle]]:
        """Determine routing elements for an operation"""
        opc = PointCode(self.config.default_opc)
        dpc = PointCode(self.config.default_dpc)
        src_ssn = None
        dst_ssn = None
        src_gt = None
        dst_gt = None
        
        # HLR-related operations (MSC/VLR -> HLR)
        hlr_ops = [
            MAPOperation.UPDATE_LOCATION,
            MAPOperation.SEND_AUTHENTICATION_INFO,
            MAPOperation.INSERT_SUBSCRIBER_DATA,
            MAPOperation.DELETE_SUBSCRIBER_DATA,
            MAPOperation.CHECK_IMEI,
            MAPOperation.ANY_TIME_INTERROGATION,
            MAPOperation.ANY_TIME_SUBSCRIPTION_INTERROGATION,
            MAPOperation.PROVIDE_SUBSCRIBER_INFO,
        ]
        
        # SMSC-related operations
        smsc_ops = [
            MAPOperation.ROUTING_INFO_FOR_SM,
            MAPOperation.MT_FORWARD_SHORT_MESSAGE,
            MAPOperation.REPORT_SM_DELIVERY_STATUS,
            MAPOperation.ALERT_SERVICE_CENTRE,
        ]
        
        # SCP/CAMEL related
        scp_ops = [
            MAPOperation.PROCESS_UNSTRUCTURED_SS_REQUEST,
        ]
        
        if operation in hlr_ops:
            dst_ssn = self.config.default_ssn_hlr  # HLR SSN
            src_ssn = self.config.default_ssn_msc  # MSC SSN
            dst_gt = GlobalTitle(digits=f"{self.config.msisdn_country_code}{random.choice(['55','66','77'])}{''.join([str(random.randint(0,9)) for _ in range(7)])}")
            
        elif operation in smsc_ops:
            dst_ssn = self.config.default_ssn_smsc  # SMSC SSN
            src_gt = GlobalTitle(digits=f"{self.config.msisdn_country_code}{random.choice(['55','66','77'])}{''.join([str(random.randint(0,9)) for _ in range(7)])}")
            
        elif operation == MAPOperation.PROVIDE_ROAMING_NUMBER:
            dst_ssn = self.config.default_ssn_msc  # GMSC/MSC SSN
            src_ssn = self.config.default_ssn_hlr  # HLR SSN
            
        elif operation == MAPOperation.MO_FORWARD_SHORT_MESSAGE:
            dst_ssn = self.config.default_ssn_smsc
            src_gt = GlobalTitle(digits=f"{self.config.msisdn_country_code}{random.choice(['55','66','77'])}{''.join([str(random.randint(0,9)) for _ in range(7)])}")
            
        elif operation == MAPOperation.READY_FOR_SM:
            src_ssn = self.config.default_ssn_smsc
            dst_ssn = self.config.default_ssn_hlr
            dst_gt = GlobalTitle(digits=f"{self.config.msisdn_country_code}{random.choice(['55','66','77'])}{''.join([str(random.randint(0,9)) for _ in range(7)])}")
        
        return opc, dpc, src_ssn, dst_ssn, src_gt, dst_gt
    
    def _generate_parameters(
        self, 
        operation: MAPOperation, 
        imsi: str, 
        msisdn: str
    ) -> Dict[str, Any]:
        """Generate operation-specific parameters"""
        params = {}
        
        if operation == MAPOperation.SEND_AUTHENTICATION_INFO:
            params['imsi'] = imsi
            params['numberOfRequestedVectors'] = random.choice([3, 5])
            params['segmentationProhibited'] = False
            params['requestedInfo'] = ['authSet', 'imeisv']
            
        elif operation == MAPOperation.UPDATE_LOCATION:
            params['imsi'] = imsi
            params['mscNumber'] = ''.join([str(random.randint(0, 9)) for _ in range(6)])
            params['vlrNumber'] = ''.join([str(random.randint(0, 9)) for _ in range(6)])
            params['lmsi'] = ''.join([str(random.randint(0, 9)) for _ in range(4)])
            params['locationUpdateType'] = random.choice(['normalUpdating', 'periodicUpdating'])
            params['updateVlr'] = True
            params['newVLR'] = f"VLR-{random.randint(1,20):02"
            
        elif operation == MAPOperation.ROUTING_INFO_FOR_SM:
            params['msisdn'] = msisdn
            params['sm_RP_PRI'] = True
            params['sm_MemoryAvailable'] = True
            params['mf_InfoImpl'] = False
            params['serviceCentreAddress'] = f"+{self.config.msisdn_country_code}600100200"
            
        elif operation == MAPOperation.MO_FORWARD_SHORT_MESSAGE:
            params['sm_RP_DA'] = msisdn
            params['sm_RP_OA'] = f"+{self.config.msisdn_country_code}600100200"
            params['sm_RP_UI'] = ''.join([str(random.randint(0, 9)) for _ in range(8)])
            params['sm_RP_PI'] = ''.join([str(random.randint(0, 9)) for _ in random(2, 8))])
            params['sm_RP_OCI'] = ''.join([str(random.randint(0, 9)) for _ in range(random(3, 12))])
            params['sm_RP_LI'] = ''.join([str(random.randint(0, 9)) for _ in range(random(5, 18))])
            params['sm_RP_PDU'] = "Hello World"  # Actual SM content
            params['moreMessagesToSend'] = random.choice([True, False])
            
        elif operation == MAPOperation.MT_FORWARD_SHORT_MESSAGE:
            params['sm_RP_DA'] = msisdn
            params['sm_RP_OA'] = f"+{self.config.msisdn_country_code}600100200"
            params['sm_RP_UI'] = ''.join([str(random.randint(0, 9)) for _ in range(8)])
            params['sm_RP_PDU'] = "Test message from SMSC"
            params['absentSubscriberDiagnosticSM'] = None
            params['deliveryOutcome'] = random.choice(['success', 'busy', 'absent_subscriber'])
            
        elif operation == MAPOperation.PROCESS_UNSTRUCTURED_SS_REQUEST:
            params['ussd_DataString'] = f"*{random.randint(100, 999)}#"  # USSD code
            params['ussd_DataCodingScheme'] = random.choice([0x0F, 0x48])  # GSM 7bit / UCS2
            params['msisdn'] = msisdn
            
        elif operation == MAPOperation.PROVIDE_ROAMING_NUMBER:
            params['imsi'] = imsi
            params['msisdn_Roaming_NN'] = msisdn
            params['msc_Number'] = ''.join([str(random.randint(0, 9)) for _ in range(6)])
            params['previous_LAI'] = {
                'mcc': '603',
                'mnc': '01',
                'lac': f"{random.randint(1, 9999):04d}",
                'cellId': f"{random.randint(1, 65535):05x}",
            }
            params['gsm_BSSP_List'] = [{
                'cellGlobalId': f"MCC{random.randint(200, 999)}-MNC{random.randint(1, 99)}-LAC{random.randint(1, 9999)}-CI{random.randint(1, 65535)}"
            }]
            params['extensionContainer'] = None
            params['cug_CheckIndicator'] = None
            params['specificsList'] = None
            params['suppressionOfCallBarring'] = None
            
        elif operation == MAPOperation.CHECK_IMEI:
            params['imei'] = f"{''.join([str(random.randint(0, 9)) for _ in range(15)])}"
            params['requestSpecifics'] = random.choice(['basicCheck', 'equipmentStatus', 'routingCheck'])
            
        elif operation == MAPOperation.ANY_TIME_INTERROGATION:
            params['imsi'] = imsi
            params['requestedInfo'] = random.choice([
                'locationInformation',
                'subscriberState',
                'IMSI',
                'MSISDN',
                'allInfo'
            ])
            
        elif operation == MAPOperation.READY_FOR_SM:
            params['imsi'] = imsi
            
        else:
            # Generic parameters for other operations
            params['imsi'] = imsi
            params['msisdn'] = msisdn
            params['operationSpecific'] = f"Parameters for {operation.name}"
        
        return params
    
    def _build_raw_hex(
        self, 
        operation: MAPOperation, 
        params: Dict[str, Any],
        imsi: str,
        msisdn: str
    ) -> Tuple[str, int]:
        """Build simplified but structurally valid hex representation"""
        # This creates a realistic-looking hex dump that represents
        # the layered protocol structure: MTP3 -> SCCP -> TCAP -> MAP
        
        parts = []
        
        # MTP3 Routing Label (7 bytes)
        mtp3_rl = f"{self.config.default_opc:04X}{self.config.default_dpc:04X}00{random.randint(0, 255):02X}"
        parts.append(mtp3_rl)
        
        # SIO (Service Information Octet)
        sio = "03"  # SCCP
        parts.append(sio)
        
        # SCCP UDT header
        sccp_header = "09"  # UDT message type
        sccp_header += "00"  # Class 0
        sccp_header += "08"  # Hop counter
        sccp_header += "0b"  # Pointer to called party
        sccp_header += "13"  # Pointer to calling party
        sccp_header += "19"  # Pointer to data
        
        # Called Party Address (GT with SSN)
        if params.get('msisdn'):
            gt_digits = params['msisdn'].replace('+', '')
            gt_encoded = self._encode_gt(gt_digits)
            sccp_header += gt_encoded
        else:
            sccp_header += "04a3090106" + ("11" * 8)  # Dummy GT
            
        # Calling Party Address (PC + optional GT)
        sccp_header += "420300000103"  # PC only (MSC)
        
        parts.append(sccp_header)
        
        # TCAP header
        tcap_tag = "62"  # QUERY_WITH_PERMISSION
        tcap_length = "80"  # Variable length placeholder
        parts.append(tcap_tag)
        parts.append(tcap_length)
        
        # Transaction ID (OTID)
        otid = f"{random.randint(1, 0xFFFF):08X}"
        parts.append(otid)
        
        # Dialogue Portion (OID for MAP v3)
        dialogue_oid = "060704110001010101"
        parts.append(dialogue_oid)
        
        # Component portion
        component_tag = "6c"  # Invoke component
        component_length = "81"  # Length > 128
        parts.append(component_tag)
        
        # Invoke ID
        invoke_id = f"02{random.randint(1, 127):02X}"
        parts.append(invoke_id)
        
        # Operation Code (local integer form for MAP)
        op_code = f"02{operation.value:02X}"
        parts.append(op_code)
        
        # Parameters SEQUENCE
        param_tag = "30"
        param_length = "81"
        parts.append(param_tag)
        parts.append(param_length)
        
        # Add operation-specific parameter encoding
        param_data = self._encode_parameters(operation, params, imsi, msisdn)
        parts.append(param_data)
        
        # Combine all parts
        full_hex = ''.join(parts)
        
        # Calculate actual length
        actual_length = len(full_hex) // 2  # Convert hex chars to bytes
        
        return full_hex.upper(), actual_length
    
    def _encode_gt(self, digits: str) -> str:
        """Encode global title digits to TBCD format"""
        result = "91"  # E.164 numbering plan, international
        result += f"{len(digits):02X}"  # Odd/even indicator + length
        result += "04"  # No extension, E.164 encoding
        result += "A1"  # Nature of address (international)
        
        # Encode digits as TBCD
        padded = digits + 'F' * (16 - len(digits))
        for i in range(0, len(padded), 2):
            low = padded[i]
            high = padded[i+1] if i+1 < len(padded) else 'F'
            result += f"{high}{low}"
        
        return result
    
    def _encode_parameters(
        self,
        operation: MAPOperation,
        params: Dict[str, Any],
        imsi: str,
        msisdn: str
    ) -> str:
        """Encode operation-specific parameters"""
        result = ""
        
        if operation == MAPOperation.SEND_AUTHENTICATION_INFO:
            # IMSI as TBCD string
            imsi_tbcd = self._tbcd_encode(imsi)
            result += f"8004{len(imsi)//2:02X}{imsi_tbcd}"
            # numberOfRequestedVectors
            vectors = params.get('numberOfRequestedVectors', 5)
            result += f"0201{vectors:02X}"
            
        elif operation == MAPOperation.UPDATE_LOCATION:
            # IMSI
            imsi_tbcd = self._tbcd_encode(imsi)
            result += f"80{len(imsi)+1:02X}80{len(imsi)//2:02X}{imsi_tbcd}"
            # Location info
            result += "84038003013030303"  # MCC-MNC-LAC-CI
            result += "a00301020304050607"  # SAC-SMS-NewVLR
            result += "a10901"  # Update VLR flag
            
        elif operation == MAPOperation.ROUTING_INFO_FOR_SM:
            # MSISDN
            msisdn_tbcd = self._tbcd_encode(msisdn.replace('+', ''))
            result += f"80{len(msisdn)+1:02X}80{len(msisdn)//2:02X}{msisdn_tbcd}"
            # Service center address
            sc_addr = self._tbcd_encode(params.get('serviceCentreAddress', '+213600100200').replace('+', ''))
            result += a1080{len(sc_addr)//2:02X}{sc_addr}
            
        elif operation == MAPOperation.MO_FORWARD_SHORT_MESSAGE:
            # SM-RP DA (destination address = MSISDN)
            da_tbcd = self._tbcd_encode(msisdn.replace('+', ''))
            result += f"80{len(msisdn)+1:02X}80{len(msisdn)//2:02X}{da_tbcd}"
            # SM-RP OA (originating address = SC address)
            oa = params.get('sm_RP_OA', '+213600100200').replace('+', '')
            oa_tbcd = self._tbcd_encode(oa)
            result += a1080{len(oa)//2:02X}{oa_tbcd}"
            # SM-RP UI + PDU
            ui = params.get('sm_RP_UI', '00000001')
            pdu = params.get('sm_RP_PDU', '')
            result += f"0404{ui}"
            if pdu:
                result += a1080{len(pdu):02X}{pdu.encode().hex()}"
                
        elif operation == MAPOperation.PROCESS_UNSTRUCTURED_SS_REQUEST:
            # USSD data string
            ussd = params.get('ussd_DataString', '*100#')
            result += f"80{len(ussd)+1:02X}80{len(ussd)//2:02X}"
            result += self._tbcd_encode(ussd.replace('#', '').replace('*', ''))
            # Data coding scheme
            result += "0401"  # Default GSM 7-bit
            # MSISDN
            msisdn_tbcd = self._tbcd_encode(msisdn.replace('+', ''))
            result += a1080{len(msisdn)//2:02X}{msisdn_tbcd}"
            
        elif operation == MAPOperation.PROVIDE_ROAMING_NUMBER:
            # IMSI
            imsi_tbcd = self._tbcd_encode(imsi)
            result += f"80{len(imsi)+1:02X}80{len(imsi)//2:02X}{imsi_tbcd}"
            # MSISDN Roaming NN
            rn_msisdn = params.get('msisdn_Roaming_NN', msisdn).replace('+', '')
            rn_tbcd = self._tbcd_encode(rn_msisdn)
            result += a1080{len(rn_msisdn)//2:02X}{rn_tbcd}"
            # MSC Number
            msc_num = params.get('msc_Number', '12345')
            result += a2040{len(msc_num)//2:02X}{self._tbcd_encode(msc_num)}"
            # Previous LAI
            result += "3012060330313030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030"
            
        else:
            # Generic parameter encoding
            result += "800480"  # IMSI tag + length + value placeholder
            result += self._tbcd_encode(imsi)
            result += "8104"  # MSISDN tag + length
            result += self._tbcd_encode(msisdn.replace('+', '') if msisdn else '0000000000000')
        
        return result
    
    def _tbcd_encode(self, digits: str) -> str:
        """Encode digits to TBCD format"""
        result = ''
        padded = digits + 'F' * ((len(digits) + 1) // 2 * 2 - len(digits))
        
        for i in range(0, len(padded) - 1, 2):
            low = padded[i]
            high = padded[i + 1]
            result += f"{high}{low}"
        
        return result
    
    def _write_output(self) -> None:
        """Write generated messages to output file"""
        filepath = self.config.output_file
        
        if filepath.endswith('.json'):
            output_data = {
                'generator': 'MAP Message Generator v1.0',
                'generated_at': datetime.now().isoformat(),
                'configuration': {
                    'operation': self.config.operation,
                    'count': self.config.count,
                    'format': self.config.output_format,
                },
                'summary': {
                    'total_messages': len(self.messages),
                    'operations_generated': list(set(m.operation_name for m in self.messages)),
                },
                'messages': [
                    {
                        'id': m.id,
                        'timestamp': m.timestamp.isoformat(),
                        'operation': m.operation_name,
                        'operation_code': m.operation.value,
                        'direction': m.direction,
                        'opc': m.opc.display,
                        'dpc': m.dpc.display,
                        'sls': m.sls,
                        'source_ssn': m.source_ssn,
                        'destination_ssn': m.destination_ssn,
                        'masked_imsi': m.masked_imsi,
                        'masked_msisdn': m.masked_msisdn,
                        'parameters': m.parameters,
                        'raw_hex': m.raw_hex,
                        'packet_length': m.packet_length,
                    }
                    for m in self.messages
                ],
            }
            
            with open(filepath, 'w') as f:
                json.dump(output_data, f, indent=2, default=str)
                
        elif filepath.endswith('.hex'):
            with open(filepath, 'w') as f:
                for msg in self.messages:
                    f.write(f"# {msg.id} | {msg.operation_name}\n")
                    f.write(f"# Timestamp: {msg.timestamp.isoformat()}\n")
                    f.write(f"# OPC: {msg.opc.display} DPC: {m.dpc.display}\n")
                    f.write(f"# IMSI: {m.masked_imsi} MSISDN: {m.masked_msisdn}\n")
                    f.write(f"\n{msg.raw_hex}\n\n")
                    
        elif filepath.endswith('.csv'):
            import csv
            with open(filepath, 'w', newline='') as f:
                writer = csv.writer(f)
                writer.writerow([
                    'ID', 'Timestamp', 'Operation', 'Operation Code', 'Direction',
                    'OPC', 'DPC', 'SLS', 'Source SSN', 'Dest SSN',
                    'Masked IMSI', 'Masked MSISDN', 'Packet Length'
                ])
                for msg in self.messages:
                    writer.writerow([
                        msg.id,
                        msg.timestamp.isoformat(),
                        msg.operation_name,
                        str(msg.operation.value),
                        msg.direction,
                        msg.opc.display,
                        m.dpc.display,
                        m.sls,
                        m.source_ssn or '',
                        m.destination_ssn or '',
                        m.masked_imsi or '',
                        m.masked_msisdn or '',
                        m.packet_length,
                    ])
        
        self.log(f"Output written to: {filepath}")


# ============================================================
# MAIN ENTRY POINT
# ============================================================

def main():
    """Main entry point for command-line usage"""
    parser = argparse.ArgumentParser(
        description='MAP Test Case Generator - Generate test MAP messages for validation',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Operations:
  sendAuthenticationInfo     - Subscriber authentication
  updateLocation             - Location update
  routingInfoForSM           - SMS routing query
  moForwardSM                 - Mobile-originated SMS
  mtForwardSM                 - Mobile-terminated SMS
  processUSSD                 - USSD processing
  provideRoamingNumber       - Roaming number request
  anyTimeInterrogation         - Subscriber info query
  checkIMEI                   - IMEI verification
  readyForSM                  - SMS delivery notification
  alertServiceCentre          - Alert service centre
  reportSMDeliveryStatus      - SMS delivery report
  sendRoutingInfoForGPRS      - GPRS routing info
  all                         - One of each operation

Examples:
    python map-message-generator.py --operation sendAuthenticationInfo --count 10
    python map-message-generator.py --operation all --output test_cases.json
    python map-message-generator.py --scenario auth_flow --verbose
    python map-message-generator.py --operation sms_routing --count 50 --output sms_test.csv
        """
    )
    
    parser.add_argument('--operation', '-o', 
                       help='MAP operation to generate (name or code)')
    parser.add_argument('--count', '-n', type=int, default=1,
                       help='Number of messages to generate (default: 1)')
    parser.add_argument('--output', help='Output file path (.json, .hex, or .csv)')
    parser.add_argument('--format', '-f', choices=['json', 'hex', 'detailed'],
                       default='json', help='Output format (default: json)')
    parser.add_argument('--verbose', '-v', action='store_true',
                       help='Enable verbose output')
    
    args = parser.parse_args()
    
    # Create configuration
    config = GeneratorConfig(
        operation=args.operation or 'all',
        count=args.count,
        output_file=args.output,
        output_format=args.format,
        verbose=args.verbose,
    )
    
    # Run generator
    generator = MAPMessageGenerator(config)
    messages = generator.generate()
    
    # Print summary
    print("\n" + "="*70)
    print("MAP MESSAGE GENERATOR COMPLETE")
    print("="*70)
    print(f"\nTotal Messages Generated: {len(messages)}")
    print(f"Operations Covered: {len(set(m.operation_name for m in messages))}")
    
    if args.output:
        print(f"\nOutput File: {args.output}")
    
    print("\nGenerated Operations:")
    for op_name in sorted(set(m.operation_name for m in messages)):
        count = sum(1 for m in messages if m.operation_name == op_name)
        print(f"  {op_name:<35} {count:>5}")
    
    print("\n" + "="*70)


if __name__ == '__main__':
    main()
