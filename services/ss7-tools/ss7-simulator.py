#!/usr/bin/env python3
"""
SS7 Traffic Simulator for Djezzy SOC Platform Testing
Generates realistic SS7 traffic patterns for security testing and validation

Features:
- Normal call flows (MO/MT SMS, USSD, LCS)
- Attack scenarios (IRSF, SIM swap, Wangiri)
- Load testing support
- PCAP output for analysis pipeline

Usage:
    python ss7-simulator.py --scenario irsf --rate 1000 --duration 300
    python ss7-simulator.py --scenario normal --output traffic.pcap
    python ss7-simulator.py --scenario sim_swap --verbose
    python ss7-simulator.py --list-scenarios

Author: Djezzy National SOC Platform
Version: 1.0.0
"""

import argparse
import random
import time
import json
import sys
import logging
import hashlib
import struct
import socket
from datetime import datetime, timedelta
from dataclasses import dataclass, field, asdict
from typing import Dict, List, Optional, Any, Tuple, Callable
from enum import Enum
from collections import defaultdict
import threading
import queue

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('SS7Simulator')


class ScenarioType(Enum):
    """Available simulation scenarios"""
    NORMAL_CALLS = "normal_calls"
    IRSF_ATTACK = "irsf_attack"
    SIM_SWAP = "sim_swap"
    WANGIRI = "wangiri"
    SMS_FLOOD = "sms_flood"
    MIXED_TRAFFIC = "mixed_traffic"
    LOAD_TEST = "load_test"


@dataclass
class SS7MessageTemplate:
    """Template for generating SS7 messages"""
    protocol: str
    operation_name: str
    operation_code: int
    source_pc: int
    dest_pc: int
    source_gt: Optional[str] = None
    dest_gt: Optional[str] = None
    imsi: Optional[str] = None
    msisdn: Optional[str] = None
    params: Dict[str, Any] = field(default_factory=dict)


@dataclass
class SimulationStats:
    """Statistics for a simulation run"""
    start_time: float = 0
    end_time: float = 0
    total_messages: int = 0
    messages_by_protocol: Dict[str, int] = field(default_factory=lambda: defaultdict(int))
    messages_by_operation: Dict[str, int] = field(default_factory=lambda: defaultdict(int))
    errors: int = 0
    target_rate: float = 0
    actual_rate: float = 0
    
    def to_dict(self) -> Dict:
        duration = self.end_time - self.start_time if self.end_time else 0
        return {
            'start_time': datetime.fromtimestamp(self.start_time).isoformat() if self.start_time else None,
            'end_time': datetime.fromtimestamp(self.end_time).isoformat() if self.end_time else None,
            'duration_seconds': round(duration, 2),
            'total_messages': self.total_messages,
            'messages_by_protocol': dict(self.messages_by_protocol),
            'messages_by_operation': dict(self.messages_by_operation),
            'errors': self.errors,
            'target_rate_per_sec': self.target_rate,
            'actual_rate_per_sec': round(self.total_messages / duration, 2) if duration > 0 else 0
        }


# Algerian Network Configuration
ALGERIA_MCC = "603"
ALGERIA_MCC_MNC = {  # MNCs for Algerian operators
    'djezzy': '01',
    'mobilis': '02',
    'ooredoo': '03'
}

# Point Code Allocation (ITU-T 14-bit format)
POINT_CODES = {
    # Signaling Transfer Points
    'stp_primary': 0x0001,
    'stp_secondary': 0x0002,
    'stp_algiers': 0x0003,
    
    # Home Location Registers
    'hlr_main': 0x0004,
    'hlr_backup': 0x0005,
    
    # Mobile Switching Centers
    'msc_algiers': 0x0033,
    'msc_oran': 0x0034,
    'msc_constantine': 0x0035,
    'msc_annaba': 0x0036,
    
    # Visitor Location Registers
    'vlr_algiers': 0x0099,
    'vlr_oran': 0x009A,
    
    # Service Nodes
    'scp_main': 0x00B0,
    'smsc_djezzy': 0x00C0,
}

# Global Title prefixes for Djezzy
GT_PREFIXES = {
    'hlr': '2136001',     # HLR GT prefix
    'msc': '2136002',     # MSC GT prefix  
    'vlr': '2136003',     # VLR GT prefix
    'smsc': '2136004',    # SMSC GT prefix
    'scp': '2136005',     # SCP GT prefix
}


def generate_imsi(mcc_mnc: str = None) -> str:
    """Generate realistic IMSI for Algeria network."""
    if mcc_mnc is None:
        mcc_mnc = ALGERIA_MCC + ALGERIA_MCC_MNC['djezzy']
    
    # MSIN (Mobile Subscriber Identification Number) - 10 digits
    msin = ''.join([str(random.randint(0, 9)) for _ in range(10)])
    return mcc_mnc + msin


def generate_msisdn(prefix: str = "213") -> str:
    """Generate realistic MSISDN for Algeria."""
    # Djezzy number ranges (examples)
    djezzy_prefixes = ['55', '56', '66', '79']
    prefix_part = random.choice(djezzy_prefixes)
    suffix = ''.join([str(random.randint(0, 9)) for _ in range(6)])
    return prefix + prefix_part + suffix


def generate_gt(gt_type: str) -> str:
    """Generate Global Title based on type."""
    prefix = GT_PREFIXES.get(gt_type, GT_PREFIXES['msc'])
    suffix = ''.join([str(random.randint(0, 9)) for _ in range(6)])
    return prefix + suffix


class SS7TrafficSimulator:
    """
    Main simulator class for generating SS7 traffic patterns.
    
    Supports multiple scenarios including normal traffic and attack simulations.
    Output can be directed to files, sockets, or processed by callbacks.
    """
    
    def __init__(self, config: Optional[Dict] = None):
        """
        Initialize the simulator.
        
        Args:
            config: Optional configuration dictionary
        """
        self.config = config or {}
        self.stats = SimulationStats()
        self._running = False
        self._stop_event = threading.Event()
        self._message_queue: queue.Queue = queue.Queue(maxsize=10000)
        self._callbacks: List[Callable] = []
        self._output_file = None
        
        # Subscriber pools for realistic simulation
        self._subscriber_pool: List[Dict[str, str]] = []
        self._attacker_pool: List[Dict[str, str]] = []
        
        # Pre-generate subscriber pool
        self._generate_subscriber_pool(size=1000)
        
        logger.info("SS7TrafficSimulator initialized")
    
    def _generate_subscriber_pool(self, size: int = 1000) -> None:
        """Generate a pool of subscribers for simulation."""
        self._subscriber_pool = []
        for _ in range(size):
            subscriber = {
                'imsi': generate_imsi(),
                'msisdn': generate_msisdn(),
                'gt': generate_gt('msc')
            }
            self._subscriber_pool.append(subscriber)
        
        # Generate attacker pool (smaller)
        self._attacker_pool = []
        for _ in range(50):
            attacker = {
                'imsi': generate_imsi(),
                'msisdn': generate_msisdn(),
                'gt': generate_gt('msc'),
                'international_destinations': self._generate_premium_numbers()
            }
            self._attacker_pool.append(attacker)
    
    def _generate_premium_numbers(self, count: int = 20) -> List[str]:
        """Generate premium rate destination numbers."""
        premium_prefixes = [
            '+44', '+1', '+33', '+49',  # Common premium destinations
            '+882', '+883',  # International networks
        ]
        numbers = []
        for _ in range(count):
            prefix = random.choice(premium_prefixes)
            suffix = ''.join([str(random.randint(0, 9)) for _ in range(10)])
            numbers.append(prefix + suffix)
        return numbers
    
    def get_random_subscriber(self) -> Dict[str, str]:
        """Get a random subscriber from the pool."""
        return random.choice(self._subscriber_pool)
    
    def get_random_attacker(self) -> Dict[str, str]:
        """Get a random attacker from the pool."""
        return random.choice(self._attacker_pool)
    
    def add_callback(self, callback: Callable[[Dict], None]) -> None:
        """Add callback function to receive generated messages."""
        self._callbacks.append(callback)
    
    def simulate(self, scenario: ScenarioType, 
                 rate: float = 100.0,
                 duration: int = 60,
                 output_path: Optional[str] = None) -> SimulationStats:
        """
        Run a simulation scenario.
        
        Args:
            scenario: Type of scenario to simulate
            rate: Messages per second to generate
            duration: Duration in seconds
            output_path: Optional file path for output
            
        Returns:
            SimulationStats with results
        """
        logger.info(f"Starting simulation: scenario={scenario.value}, rate={rate}/s, duration={duration}s")
        
        self.stats = SimulationStats()
        self.stats.target_rate = rate
        self._running = True
        self._stop_event.clear()
        
        if output_path:
            self._output_file = open(output_path, 'w' if output_path.endswith('.json') else 'wb')
        
        try:
            self.stats.start_time = time.time()
            
            # Select scenario handler
            handlers = {
                ScenarioType.NORMAL_CALLS: self._simulate_normal_calls,
                ScenarioType.IRSF_ATTACK: self._simulate_irsf_attack,
                ScenarioType.SIM_SWAP: self._simulate_sim_swap,
                ScenarioType.WANGIRI: self._simulate_wangiri,
                ScenarioType.SMS_FLOOD: self._simulate_sms_flood,
                ScenarioType.MIXED_TRAFFIC: self._simulate_mixed_traffic,
                ScenarioType.LOAD_TEST: self._simulate_load_test,
            }
            
            handler = handlers.get(scenario, self._simulate_normal_calls)
            
            # Calculate timing
            interval = 1.0 / rate if rate > 0 else 0
            end_time = time.time() + duration
            message_count = 0
            
            while time.time() < end_time and not self._stop_event.is_set():
                # Generate batch of messages
                messages = handler(rate=min(rate, 100))
                
                for msg in messages:
                    self._emit_message(msg)
                    message_count += 1
                
                # Rate limiting
                actual_interval = interval * len(messages) if messages else interval
                if actual_interval > 0 and time.time() < end_time:
                    time.sleep(min(actual_interval, 0.1))
            
            self.stats.end_time = time.time()
            self.stats.total_messages = message_count
            
            logger.info(f"Simulation complete: {message_count} messages generated")
            
        finally:
            self._running = False
            if self._output_file:
                if isinstance(self._output_file, object) and hasattr(self._output_file, 'close'):
                    self._output_file.close()
                self._output_file = None
        
        return self.stats
    
    def stop(self) -> None:
        """Stop the running simulation."""
        logger.info("Stopping simulation...")
        self._stop_event.set()
        self._running = False
    
    def _emit_message(self, message: Dict) -> None:
        """Emit a message to all registered outputs."""
        self.stats.total_messages += 1
        self.stats.messages_by_protocol[message.get('protocol', 'Unknown')] += 1
        self.stats.messages_by_operation[message.get('operation_name', 'Unknown')] += 1
        
        # Send to callbacks
        for callback in self._callbacks:
            try:
                callback(message)
            except Exception as e:
                self.stats.errors += 1
                logger.debug(f"Callback error: {e}")
        
        # Write to file if configured
        if self._output_file:
            try:
                if hasattr(self._output_file, 'write'):
                    if hasattr(self._output_file, 'mode') and 'b' in self._output_file.mode:
                        self._output_file.write(self._encode_to_pcap_chunk(message))
                    else:
                        self._output_file.write(json.dumps(message) + '\n')
            except Exception as e:
                self.stats.errors += 1
                logger.error(f"Write error: {e}")
    
    def _create_message(self, template: SS7MessageTemplate, **overrides) -> Dict:
        """Create a message dictionary from template with optional overrides."""
        msg = {
            'timestamp': time.time(),
            'protocol': template.protocol,
            'operation_code': template.operation_code,
            'operation_name': template.operation_name,
            'source_point_code': f"{template.source_pc:04X}",
            'dest_point_code': f"{template.dest_pc:04X}",
            'source_global_title': overrides.get('source_gt', template.source_gt),
            'dest_global_title': overrides.get('dest_gt', template.dest_gt),
            'imsi': overrides.get('imsi', template.imsi),
            'msisdn': overrides.get('msisdn', template.msisdn),
            'params': {**template.params, **overrides.get('params', {})}
        }
        return msg
    
    # ==================== SCENARIO HANDLERS ====================
    
    def _simulate_normal_calls(self, rate: float = 10) -> List[Dict]:
        """
        Simulate normal SS7 traffic patterns.
        Includes MO/MT calls, SMS, USSD, and location updates.
        """
        messages = []
        
        # Traffic distribution weights
        operations = [
            ('updateLocation', 25, 'MAP', 3, POINT_CODES['msc_algiers'], POINT_CODES['hlr_main']),
            ('sendAuthenticationInfo', 15, 'MAP', 50, POINT_CODES['vlr_algiers'], POINT_CODES['hlr_main']),
            ('mo-forwardSM', 15, 'MAP', 44, POINT_CODES['msc_algiers'], POINT_CODES['smsc_djezzy']),
            ('mt-forwardSM', 12, 'MAP', 45, POINT_CODES['smsc_djezzy'], POINT_CODES['msc_algiers']),
            ('processUnstructuredSS-Request', 8, 'MAP', 60, POINT_CODES['msc_algiers'], POINT_CODES['scp_main']),
            ('anyTimeInterrogation', 5, 'MAP', 37, POINT_CODES['scp_main'], POINT_CODES['hlr_main']),
            ('insertSubscriberData', 5, 'MAP', 51, POINT_CODES['hlr_main'], POINT_CODES['vlr_algiers']),
            ('provideRoamingNumber', 10, 'MAP', 56, POINT_CODES['hlr_main'], POINT_CODES['msc_oran']),
            ('initialDP', 5, 'CAP', 0, POINT_CODES['msc_algiers'], POINT_CODES['scp_main']),
        ]
        
        # Select operations based on weights
        for _ in range(int(rate)):
            op_name, weight, protocol, opcode, src_pc, dest_pc = random.choices(
                operations, weights=[op[1] for op in operations]
            )[0]
            
            subscriber = self.get_random_subscriber()
            
            template = SS7MessageTemplate(
                protocol=protocol,
                operation_name=op_name,
                operation_code=opcode,
                source_pc=src_pc,
                dest_pc=dest_pc,
                imsi=subscriber['imsi'],
                msisdn=subscriber['msisdn'],
                source_gt=subscriber['gt'] if random.random() > 0.5 else None,
                dest_gt=generate_gt('hlr') if 'HLR' in op_name or 'hlr' in str(dest_pc) else None
            )
            
            msg = self._create_message(template)
            messages.append(msg)
        
        return messages
    
    def _simulate_irsf_attack(self, rate: float = 50) -> List[Dict]:
        """
        Simulate International Revenue Share Fraud (IRSF) attack.
        
        Characteristics:
        - High volume calls to international premium numbers
        - Calls often exactly at billing intervals (60s, 180s)
        - Multiple unique premium destinations
        - Often originates from compromised or fraudulent subscriptions
        """
        messages = []
        attacker = self.get_random_attacker()
        
        for _ in range(int(rate)):
            # IRSF pattern: mostly ISUP/CAP setup calls to international numbers
            is_setup = random.random() > 0.3  # 70% are call setups
            
            if is_setup:
                # Call setup (InitialDP / Setup)
                dest_number = random.choice(attacker['international_destinations'])
                
                template = SS7MessageTemplate(
                    protocol='CAP',
                    operation_name='initialDP',
                    operation_code=0,
                    source_pc=POINT_CODES['msc_algiers'],
                    dest_pc=POINT_CODES['scp_main'],
                    source_gt=attacker['gt'],
                    dest_gt=dest_number,
                    imsi=attacker['imsi'],
                    msisdn=attacker['msisdn'],
                    params={
                        'called_party_number': dest_number,
                        'calling_party_number': attacker['msisdn'],
                        'call_type': 'international',
                        'expected_duration': random.choice([60, 120, 180]),  # Billing intervals
                        'destination_country': self._get_country_from_number(dest_number)
                    }
                )
            else:
                # Occasional location update to maintain registration
                template = SS7MessageTemplate(
                    protocol='MAP',
                    operation_name='updateLocation',
                    operation_code=3,
                    source_pc=POINT_CODES['vlr_algiers'],
                    dest_pc=POINT_CODES['hlr_main'],
                    imsi=attacker['imsi'],
                    msisdn=attacker['msisdn']
                )
            
            msg = self._create_message(template)
            messages.append(msg)
        
        return messages
    
    def _get_country_from_number(self, number: str) -> str:
        """Extract country from phone number prefix."""
        country_map = {
            '+44': 'United Kingdom',
            '+1': 'USA/Canada',
            '+33': 'France',
            '+49': 'Germany',
            '+882': 'International Networks',
            '+883': 'International Networks'
        }
        for prefix, country in country_map.items():
            if number.startswith(prefix):
                return country
        return 'Unknown'
    
    def _simulate_sim_swap(self, rate: float = 30) -> List[Dict]:
        """
        Simulate SIM Swap fraud attack sequence.
        
        Attack flow:
        1. Attacker obtains victim's personal information
        2. Social engineers carrier to issue new SIM
        3. New SIM activates, triggering location update
        4. Attacker intercepts OTP/messages meant for victim
        """
        messages = []
        victim = self.get_random_subscriber()
        
        # SIM Swap phases
        phases = [
            # Phase 1: Authentication probing (failed auth attempts)
            ('auth_probe', 0.2),
            # Phase 2: Provisioning events (insertSubscriberData)
            ('provisioning', 0.3),
            # Phase 3: Location update (new SIM activation)
            ('activation', 0.3),
            # Phase 4: Fraudulent activity (OTP interception, banking access)
            ('fraud_activity', 0.2),
        ]
        
        for _ in range(int(rate)):
            phase, _ = random.choices(phases, weights=[p[1] for p in phases])[0]
            
            if phase == 'auth_probe':
                # Failed authentication attempts
                template = SS7MessageTemplate(
                    protocol='MAP',
                    operation_name='sendAuthenticationInfo',
                    operation_code=50,
                    source_pc=random.choice([POINT_CODES['vlr_algiers'], POINT_CODES['vlr_oran']]),
                    dest_pc=POINT_CODES['hlr_main'],
                    imsi=victim['imsi'],
                    params={'result': 'authentication_failure', 'failure_reason': 'invalid_sres'}
                )
            
            elif phase == 'provisioning':
                # SIM provisioning (InsertSubscriberData with new data)
                template = SS7MessageTemplate(
                    protocol='MAP',
                    operation_name='insertSubscriberData',
                    operation_code=51,
                    source_pc=POINT_CODES['hlr_main'],
                    dest_pc=POINT_CODES['vlr_algiers'],
                    imsi=victim['imsi'],
                    msisdn=victim['msisdn'],
                    params={
                        'provisioning_type': 'sim_swap',
                        'ki_changed': True,
                        'new_auth_vectors': 5
                    }
                )
            
            elif phase == 'activation':
                # Location update from new SIM (different VLR possibly)
                template = SS7MessageTemplate(
                    protocol='MAP',
                    operation_name='updateLocation',
                    operation_code=3,
                    source_pc=random.choice([POINT_CODES['vlr_algiers'], POINT_CODES['vlr_oran']]),
                    dest_pc=POINT_CODES['hlr_main'],
                    imsi=victim['imsi'],
                    msisdn=victim['msisdn'],
                    params={'update_type': 'normal', 'previous_vlr_unknown': True}
                )
            
            else:  # fraud_activity
                # Intercept SMS OTP or make fraudulent calls
                ops = [
                    ('mt-forwardSM', 45, POINT_CODES['smsc_djezzy'], POINT_CODES['msc_algiers']),
                    ('mo-forwardSM', 44, POINT_CODES['msc_algiers'], POINT_CODES['smsc_djezzy']),
                    ('processUnstructuredSS-Request', 60, POINT_CODES['msc_algiers'], POINT_CODES['scp_main']),
                ]
                op_name, opcode, src, dest = random.choice(ops)
                template = SS7MessageTemplate(
                    protocol='MAP',
                    operation_name=op_name,
                    operation_code=opcode,
                    source_pc=src,
                    dest_pc=dest,
                    imsi=victim['imsi'],
                    msisdn=victim['msisdn'],
                    params={'intercepted': True, 'post_swap': True}
                )
            
            msg = self._create_message(template)
            messages.append(msg)
        
        return messages
    
    def _simulate_wangiri(self, rate: float = 40) -> List[Dict]:
        """
        Simulate Wangiri (one-ring) fraud attack.
        
        Characteristics:
        - Very short duration calls (< 5 seconds typically)
        - Large number of unique victims called
        - Pattern: one ring, hang up before answer
        - Goal: get victims to call back premium number
        """
        messages = []
        attacker = self.get_random_attacker()
        
        # Generate many unique victim numbers
        victims = [generate_msisdn() for _ in range(200)]
        
        for _ in range(int(rate)):
            victim = random.choice(victims)
            
            # Wangiri call pattern
            is_call_setup = random.random() > 0.1  # 90% are calls
            
            if is_call_setup:
                template = SS7MessageTemplate(
                    protocol='CAP',
                    operation_name='initialDP',
                    operation_code=0,
                    source_pc=POINT_CODES['msc_algiers'],
                    dest_pc=POINT_CODES['scp_main'],
                    source_gt=attacker['gt'],
                    dest_gt='+213' + victim[3:],  # Format as domestic
                    imsi=attacker['imsi'],
                    msisdn=attacker['msisdn'],
                    params={
                        'call_duration_expected': random.uniform(1, 5),  # Very short
                        'wangiri_pattern': True,
                        'callback_number': random.choice(attacker['international_destinations'])
                    }
                )
            else:
                # Occasional release/clearing
                template = SS7MessageTemplate(
                    protocol='ISUP',
                    operation_name='release',
                    operation_code=16,
                    source_pc=POINT_CODES['scp_main'],
                    dest_pc=POINT_CODES['msc_algiers'],
                    params={'cause': 'normal_clearing', 'duration': random.uniform(1, 4)}
                )
            
            msg = self._create_message(template)
            messages.append(msg)
        
        return messages
    
    def _simulate_sms_flood(self, rate: float = 60) -> List[Dict]:
        """
        Simulate SMS flooding attack.
        
        Characteristics:
        - High volume SMS from single or few sources
        - May target specific victim(s)
        - Can be used for spam or DoS
        """
        messages = []
        attacker = self.get_random_attacker()
        victim = self.get_random_subscriber()  # Primary target
        
        for _ in range(int(rate)):
            # Mostly MO-SMS (originating from attacker)
            is_mo = random.random() > 0.2  # 80% originating
            
            if is_mo:
                template = SS7MessageTemplate(
                    protocol='MAP',
                    operation_name='mo-forwardSM',
                    operation_code=44,
                    source_pc=POINT_CODES['msc_algiers'],
                    dest_pc=POINT_CODES['smsc_djezzy'],
                    source_gt=attacker['gt'],
                    dest_gt=generate_gt('smsc'),
                    imsi=attacker['imsi'],
                    msisdn=attacker['msisdn'],
                    params={
                        'sm_content': '[SPAM/FLOOD message]',
                        'target_msisdn': victim['msisdn'],
                        'flood_sequence': True
                    }
                )
            else:
                # Some MT-SMS (delivery attempts)
                template = SS7MessageTemplate(
                    protocol='MAP',
                    operation_name='mt-forwardSM',
                    operation_code=45,
                    source_pc=POINT_CODES['smsc_djezzy'],
                    dest_pc=POINT_CODES['msc_algiers'],
                    imsi=victim['imsi'],
                    msisdn=victim['msisdn'],
                    params={'delivery_status': 'failed', 'error': 'subscriber_busy'}
                )
            
            msg = self._create_message(template)
            messages.append(msg)
        
        return messages
    
    def _simulate_mixed_traffic(self, rate: float = 20) -> List[Dict]:
        """
        Simulate mixed traffic with both normal and malicious patterns.
        Useful for testing detection systems.
        """
        messages = []
        
        # Mix of different traffic types
        # 70% normal, 30% various attacks
        if random.random() < 0.7:
            return self._simulate_normal_calls(rate * 0.7)
        
        # Choose an attack type randomly
        attack_scenarios = [
            (self._simulate_irsf_attack, 0.3),
            (self._simulate_wangiri, 0.3),
            (self._simulate_sms_flood, 0.2),
            (self._simulate_sim_swap, 0.2),
        ]
        
        handler, _ = random.choices(attack_scenarios, weights=[a[1] for a in attack_scenarios])[0]
        return handler(rate * 0.3)
    
    def _simulate_load_test(self, rate: float = 100) -> List[Dict]:
        """
        Generate high-volume traffic for load testing.
        Focuses on maximum throughput rather than realism.
        """
        messages = []
        
        # Simple, fast message generation for load testing
        templates = [
            SS7MessageTemplate(
                protocol='MAP',
                operation_name='updateLocation',
                operation_code=3,
                source_pc=POINT_CODES['msc_algiers'],
                dest_pc=POINT_CODES['hlr_main']
            ),
            SS7MessageTemplate(
                protocol='MAP',
                operation_name='sendAuthenticationInfo',
                operation_code=50,
                source_pc=POINT_CODES['vlr_algiers'],
                dest_pc=POINT_CODES['hlr_main']
            ),
            SS7MessageTemplate(
                protocol='MAP',
                operation_name='mo-forwardSM',
                operation_code=44,
                source_pc=POINT_CODES['msc_algiers'],
                dest_pc=POINT_CODES['smsc_djezzy']
            ),
        ]
        
        subscriber = self.get_random_subscriber()
        
        for _ in range(int(rate)):
            template = random.choice(templates)
            template.imsi = subscriber['imsi']
            template.msisdn = subscriber['msisdn']
            
            msg = self._create_message(template)
            messages.append(msg)
            
            # Rotate subscriber occasionally
            if random.random() < 0.01:
                subscriber = self.get_random_subscriber()
        
        return messages
    
    def _encode_to_pcap_chunk(self, message: Dict) -> bytes:
        """
        Encode message as raw packet bytes for PCAP output.
        This creates simplified SCTP/M3UA encapsulated packets.
        """
        timestamp = message.get('timestamp', time.time())
        
        # Build simplified M3UA payload
        m3ua_payload = self._build_m3ua_packet(message)
        
        # Build SCTP chunk (simplified)
        sctp_chunk = self._build_sctp_data_chunk(m3ua_payload)
        
        # Build IP header (simplified)
        ip_packet = self._build_ip_packet(sctp_chunk)
        
        return ip_packet
    
    def _build_m3ua_packet(self, message: Dict) -> bytes:
        """Build M3UA Transfer message."""
        # M3UA Common Header
        version = 1
        reserved = 0
        msg_class = 4  # Transfer
        msg_type = 1  # Payload data
        
        # Parse point codes
        try:
            opc = int(message.get('source_point_code', '0001'), 16)
            dpc = int(message.get('dest_point_code', '0004'), 16)
        except ValueError:
            opc = 1
            dpc = 4
        
        # MTP3 Routing Label (32 bits)
        routing_label = struct.pack('>I', (opc << 16) | (dpc & 0xFFFF))[1:]  # 24 bits
        
        # Service Indicator
        si_map = {'MAP': 5, 'CAP': 5, 'ISUP': 3, 'SCCP': 5}
        si = si_map.get(message.get('protocol', 'MAP'), 5)
        
        # Build M3UA parameters
        params = bytearray()
        params += routing_label
        params += bytes([si, 0, 0, 0])  # SI + spare + priority
        
        # Add TCAP-like payload (simplified)
        tcap_payload = self._build_tcap_payload(message)
        params += tcap_payload
        
        # Complete M3UA message
        length = 8 + len(params)
        header = struct.pack('>BBH', version, reserved, (msg_class << 8) | msg_type)
        header += struct.pack('>I', length)
        
        return bytes(header) + bytes(params)
    
    def _build_tcap_payload(self, message: Dict) -> bytes:
        """Build simplified TCAP payload."""
        # Simplified TCAP Begin with Invoke component
        opcode = message.get('operation_code', 0)
        
        tcap = bytearray()
        tcap += bytes([0x60])  # TCAP BEGIN tag
        tcap += bytes([0x80 | len(bytes([0xa1, 0x05, 0x02, 0x01, opcode]))])  # Length placeholder
        tcap += bytes([0xa1])  # Invoke component tag
        tcap += bytes([0x05])  # Length
        tcap += bytes([0x02, 0x01, opcode])  # Operation code
        
        return bytes(tcap)
    
    def _build_sctp_data_chunk(self, payload: bytes) -> bytes:
        """Build SCTP DATA chunk."""
        # SCTP Data Chunk Header
        chunk_type = 0  # DATA
        chunk_flags = 0
        chunk_length = 16 + len(payload)  # Header + payload
        
        # TSN, Stream ID, Protocol ID
        tsn = random.randint(1, 0xFFFFFFFF)
        stream_id = 0
        ppid = 3  # M3UA
        
        header = struct.pack('>BBHI', chunk_type, chunk_flags, chunk_length, tsn)
        header += struct.pack('>HI', stream_id, ppid)
        
        return header + payload
    
    def _build_ip_packet(self, payload: bytes) -> bytes:
        """Build IPv4 packet header."""
        version_ihl = 0x45
        dscp_ecn = 0
        total_length = 20 + len(payload)
        identification = random.randint(1, 0xFFFF)
        flags_fragment = 0x4000  # Don't fragment
        ttl = 64
        protocol = 132  # SCTP
        checksum = 0  # Would calculate properly in production
        src_ip = socket.inet_aton('10.0.0.1')  # Dummy source
        dst_ip = socket.inet_aton('10.0.0.2')  # Dummy dest
        
        header = struct.pack('>BBHHHBBH',
                            version_ihl, dscp_ecn, total_length,
                            identification, flags_fragment,
                            ttl, protocol, checksum)
        header += src_ip + dst_ip
        
        return header + payload


def list_scenarios() -> None:
    """Print available scenarios with descriptions."""
    print("\nAvailable Simulation Scenarios:")
    print("=" * 60)
    
    scenarios = [
        (ScenarioType.NORMAL_CALLS, "Normal SS7 traffic (calls, SMS, USSD, location updates)"),
        (ScenarioType.IRSF_ATTACK, "International Revenue Share Fraud simulation"),
        (ScenarioType.SIM_SWAP, "SIM Swap fraud attack sequence"),
        (ScenarioType.WANGIRI, "Wangiri (one-ring) fraud pattern"),
        (ScenarioType.SMS_FLOOD, "SMS flooding/spam attack"),
        (ScenarioType.MIXED_TRAFFIC, "Mixed normal and malicious traffic"),
        (ScenarioType.LOAD_TEST, "High-volume load testing pattern"),
    ]
    
    for scenario, description in scenarios:
        print(f"\n  {scenario.value:<20} {description}")
    
    print("\n" + "=" * 60)
    print("\nExample usage:")
    print("  python ss7-simulator.py --scenario irsf_attack --rate 100 --duration 300")
    print("  python ss7-simulator.py --scenario normal_calls --output traffic.json")
    print()


def main():
    """Main entry point for command-line usage."""
    parser = argparse.ArgumentParser(
        description='SS7 Traffic Simulator for Djezzy SOC Platform Testing',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s --scenario irsf_attack --rate 100 --duration 300
  %(prog)s --scenario normal_calls --output traffic.json
  %(prog)s --scenario sim_swap --verbose
  %(prog)s --list-scenarios
        """
    )
    
    parser.add_argument('--scenario', '-s', 
                       choices=[s.value for s in ScenarioType],
                       default='normal_calls',
                       help='Simulation scenario (default: normal_calls)')
    parser.add_argument('--rate', '-r', type=float, default=100,
                       help='Messages per second (default: 100)')
    parser.add_argument('--duration', '-d', type=int, default=60,
                       help='Duration in seconds (default: 60)')
    parser.add_argument('--output', '-o', help='Output file path (.json or .pcap)')
    parser.add_argument('--config', '-c', help='Path to configuration file')
    parser.add_argument('--list-scenarios', action='store_true',
                       help='List available scenarios and exit')
    parser.add_argument('--verbose', '-v', action='store_true',
                       help='Enable verbose output')
    parser.add_argument('--quiet', '-q', action='store_true',
                       help='Suppress non-error output')
    parser.add_argument('--stats-only', action='store_true',
                       help='Only print final statistics')
    parser.add_argument('--seed', type=int, help='Random seed for reproducibility')
    
    args = parser.parse_args()
    
    # Configure logging
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)
    elif args.quiet:
        logging.getLogger().setLevel(logging.ERROR)
    
    # Handle list scenarios
    if args.list_scenarios:
        list_scenarios()
        return 0
    
    # Set random seed if provided
    if args.seed:
        random.seed(args.seed)
    
    try:
        # Load config if provided
        config = None
        if args.config:
            try:
                with open(args.config, 'r') as f:
                    config = json.load(f)
            except Exception as e:
                logger.warning(f"Could not load config: {e}")
        
        # Create simulator
        simulator = SS7TrafficSimulator(config=config)
        
        # Add console output callback unless quiet or stats-only
        if not args.quiet and not args.stats_only:
            def console_callback(msg: Dict):
                if args.verbose:
                    ts = datetime.fromtimestamp(msg['timestamp']).strftime('%H:%M:%S.%f')[:-3]
                    print(f"[{ts}] {msg['protocol']:4} {msg['operation_name'][:30]:<30} "
                          f"{msg.get('source_point_code','?')}->{msg.get('dest_point_code','?')}")
            simulator.add_callback(console_callback)
        
        # Determine scenario enum
        scenario = ScenarioType(args.scenario)
        
        # Print startup info
        if not args.quiet:
            print(f"\n{'='*60}")
            print(f"SS7 Traffic Simulator - Djezzy National SOC Platform")
            print(f"{'='*60}")
            print(f"Scenario:   {args.scenario}")
            print(f"Rate:       {args.rate} msgs/sec")
            print(f"Duration:   {args.duration} seconds")
            print(f"Output:     {args.output or 'stdout'}")
            print(f"{'='*60}\n")
        
        # Run simulation
        stats = simulator.simulate(
            scenario=scenario,
            rate=args.rate,
            duration=args.duration,
            output_path=args.output
        )
        
        # Print statistics
        stats_dict = stats.to_dict()
        
        if not args.quiet:
            print(f"\n{'='*60}")
            print("SIMULATION COMPLETE")
            print(f"{'='*60}")
            print(f"Duration:      {stats_dict['duration_seconds']:.2f} seconds")
            print(f"Total Messages: {stats_dict['total_messages']:,}")
            print(f"Target Rate:    {stats_dict['target_rate_per_sec']} msgs/sec")
            print(f"Actual Rate:    {stats_dict['actual_rate_per_sec']} msgs/sec")
            print(f"Errors:         {stats_dict['errors']}")
            
            print(f"\nProtocol Distribution:")
            for proto, count in sorted(stats_dict['messages_by_protocol'].items(), 
                                      key=lambda x: -x[1]):
                pct = count / stats_dict['total_messages'] * 100
                print(f"  {proto}: {count:,} ({pct:.1f}%)")
            
            print(f"\nTop Operations:")
            top_ops = sorted(stats_dict['messages_by_operation'].items(), 
                           key=lambda x: -x[1])[:10]
            for op, count in top_ops:
                print(f"  {op}: {count:,}")
            
            print(f"{'='*60}\n")
        
        # Write stats file if output specified
        if args.output and args.output.endswith('.json'):
            stats_filename = args.output.replace('.json', '_stats.json')
            with open(stats_filename, 'w') as f:
                json.dump(stats_dict, f, indent=2)
            if not args.quiet:
                print(f"Statistics written to {stats_filename}")
        
        return 0
        
    except KeyboardInterrupt:
        print("\n\nSimulation interrupted by user")
        return 130
    except Exception as e:
        logger.exception("Simulation failed")
        print(f"Error: {e}", file=sys.stderr)
        return 1


if __name__ == '__main__':
    sys.exit(main())
