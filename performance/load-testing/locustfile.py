#!/usr/bin/env python3
"""
Djezzy SOC Platform - Locust Load Testing Suite

Purpose: Python-based load testing alternative to k6
Features: Real-time web UI, distributed testing, custom metrics

Usage:
    locust -f locustfile.py --host=http://localhost:3000
    locust -f locustfile.py --headless --users 1000 --spawn-rate 10 -t 1h

Requirements:
    pip install locust requests

@version 1.0.0
@author Djezzy SOC Performance Team
"""

import random
import time
import json
import uuid
from datetime import datetime, timedelta
from locust import HttpUser, task, between, events, constant_pacing
from locust.runners import MasterRunner, WorkerRunner

# ============================================================================
# Configuration Constants
# ============================================================================

BASE_URL = "http://localhost:3000"
TARGET_EPS = 500000  # Events Per Second target
CONCURRENT_USERS = 10000
TEST_DURATION_HOURS = 24

# User Persona Weights (must sum to 100)
PERSONA_WEIGHTS = {
    "soc_analyst": 40,
    "soc_operator": 30,
    "threat_hunter": 15,
    "manager": 10,
    "admin": 5,
}

# Performance Thresholds
THRESHOLDS = {
    "p95_response_time_ms": 2000,
    "error_rate_percent": 0.5,
    "target_throughput_rps": 50000,
}

# ============================================================================
# Custom Event Hooks for Metrics Collection
# ============================================================================

@events.test_start.add_listener
def on_test_start(environment, **kwargs):
    """Initialize test counters and logging"""
    print("\n" + "=" * 70)
    print("  Djezzy SOC Platform - Locust Load Test")
    print("=" * 70)
    print(f"  Start Time: {datetime.now().isoformat()}")
    print(f"  Target Host: {environment.host}")
    print("-" * 70)


@events.test_stop.add_listener
def on_test_stop(environment, **kwargs):
    """Generate final test summary"""
    print("\n" + "=" * 70)
    print("  Load Test Complete")
    print("-" * 70)
    print(f"  End Time: {datetime.now().isoformat()}")
    print("=" * 70 + "\n")


# ============================================================================
# Helper Functions
# ============================================================================

def generate_auth_token(user_type: str) -> str:
    """Generate or retrieve authentication token"""
    # In production, implement proper OAuth/JWT flow
    return f"test-token-{user_type}-{uuid.uuid4().hex[:8]}"


def generate_event_payload() -> dict:
    """Generate realistic security event payload"""
    event_types = [
        "network.connection", "security.alert", "authentication.attempt",
        "malware.detection", "intrusion.signature", "dns.query",
        "http.request", "file.access", "process.execution"
    ]
    
    severities = ["info", "low", "medium", "high", "critical"]
    severity_weights = [0.4, 0.25, 0.2, 0.1, 0.05]
    
    sources = ["firewall", "ids", "siem", "edr", "nta", "log_manager"]
    
    def weighted_choice(items, weights):
        r = random.random()
        cumulative = 0
        for item, weight in zip(items, weights):
            cumulative += weight
            if r <= cumulative:
                return item
        return items[-1]
    
    return {
        "id": f"evt-{int(time.time()*1000)}-{uuid.uuid4().hex[:12]}",
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "event_type": random.choice(event_types),
        "severity": weighted_choice(severities, severity_weights),
        "source": random.choice(sources),
        "source_ip": f"{random.randint(1,255)}.{random.randint(0,255)}.{random.randint(0,255)}.{random.randint(1,254)}",
        "destination_ip": f"10.{random.randint(0,255)}.{random.randint(0,255)}.{random.randint(1,254)}",
        "destination_port": random.choice([80, 443, 22, 53, 3306, 8080, 8443]),
        "protocol": random.choice(["TCP", "UDP", "HTTP", "HTTPS"]),
        "raw_log": f"[{datetime.utcnow().isoformat()}] Security event from load test",
        "custom_fields": {
            "correlation_id": f"corr-{uuid.uuid4().hex[:16]}",
            "geoip_country": "DZ",
            "geoip_city": random.choice(["Algiers", "Oran", "Constantine", "Annaba"]),
        }
    }


def generate_batch_events(batch_size: int = 100) -> list:
    """Generate batch of events for throughput testing"""
    return [generate_event_payload() for _ in range(batch_size)]


def get_headers(token: str, content_type: str = "application/json") -> dict:
    """Build standard request headers"""
    return {
        "Content-Type": content_type,
        "Authorization": f"Bearer {token}",
        "X-Request-ID": str(uuid.uuid4()),
        "X-Test-Type": "locust-load-test",
        "Accept": "application/json",
    }


# ============================================================================
# Base User Class with Common Functionality
# ============================================================================

class BaseSOCUser(HttpUser):
    """Base user class for Djezzy SOC Platform testing"""
    
    abstract = True
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.token = None
        self.user_type = "default"
        
    def on_start(self):
        """Called when a user starts - handles authentication"""
        self.user_type = self._get_user_type()
        self.token = generate_auth_token(self.user_type)
        
    def on_stop(self):
        """Cleanup when user session ends"""
        pass
        
    def _get_user_type(self) -> str:
        """Override in subclasses to define user type"""
        return "default"


# ============================================================================
# User Persona Classes
# ============================================================================

class SOCAnalystUser(BaseSOCUser):
    """
    SOC Analyst User - Primary dashboard/alerts consumer
    Weight: 40% of total users
    Behavior: Frequent alert investigation, log searches, dashboard monitoring
    """
    
    wait_time = between(5, 30)  # Think time between actions
    
    def _get_user_type(self):
        return "soc_analyst"
    
    @task(30)
    def view_dashboard(self):
        """Load main dashboard page"""
        headers = get_headers(self.token)
        self.client.get(
            "/",
            headers=headers,
            name="Dashboard Page"
        )
    
    @task(25)
    def view_active_alerts(self):
        """View active alerts list"""
        headers = get_headers(self.token)
        params = {
            "limit": "50",
            "status": "active",
            "sort": "-severity,-created_at"
        }
        self.client.get(
            "/api/alerts",
            headers=headers,
            params=params,
            name="Alerts List"
        )
    
    @task(20)
    def investigate_alert(self):
        """Investigate specific alert details"""
        headers = get_headers(self.token)
        
        # First get an alert ID
        response = self.client.get(
            "/api/alerts?limit=1&status=active",
            headers=headers,
            name="Get Alert ID"
        )
        
        if response.status_code == 200:
            try:
                data = response.json()
                if data.get("data") and len(data["data"]) > 0:
                    alert_id = data["data"][0].get("id")
                    if alert_id:
                        self.client.get(
                            f"/api/alerts/{alert_id}?include=context,related,ioc",
                            headers=headers,
                            name="Alert Details"
                        )
            except Exception:
                pass
    
    @task(15)
    def search_logs(self):
        """Perform log search queries"""
        headers = get_headers(self.token)
        query = "severity:high OR severity:critical -status:false_positive"
        self.client.get(
            f"/api/v1/events/search?q={query}&limit=25",
            headers=headers,
            name="Log Search"
        )
    
    @task(10)
    def view_metrics(self):
        """View system metrics"""
        headers = get_headers(self.token)
        self.client.get(
            "/api/metrics?range=6h&granularity=5m",
            headers=headers,
            name="System Metrics"
        )


class SOCOperatorUser(BaseSOCUser):
    """
    SOC Operator User - Active incident management
    Weight: 30% of total users
    Behavior: Alert acknowledgment, status updates, compliance checks
    """
    
    wait_time = between(10, 60)
    
    def _get_user_type(self):
        return "soc_operator"
    
    @task(35)
    def monitor_dashboard(self):
        """Continuous dashboard monitoring"""
        headers = get_headers(self.token)
        self.client.get(
            "/?refresh=true",
            headers=headers,
            name="Dashboard Monitor"
        )
    
    @task(25)
    def acknowledge_alerts(self):
        """Acknowledge new alerts"""
        headers = get_headers(self.token)
        
        # Get unacknowledged alerts
        response = self.client.get(
            "/api/alerts?status=new&limit=5",
            headers=headers,
            name="Get New Alerts"
        )
        
        if response.status_code == 200:
            try:
                data = response.json()
                if data.get("data"):
                    for alert in data["data"][:2]:  # Acknowledge up to 2
                        self.client.patch(
                            f"/api/alerts/{alert['id']}",
                            json={
                                "status": "acknowledged",
                                "acknowledged_by": f"operator-{self.user_id}",
                                "acknowledged_at": datetime.utcnow().isoformat(),
                                "notes": "Acknowledged during operations"
                            },
                            headers=headers,
                            name="Acknowledge Alert"
                        )
            except Exception:
                pass
    
    @task(20)
    def update_incident_status(self):
        """Update incident progress"""
        headers = get_headers(self.token)
        self.client.patch(
            "/api/incidents/update-status",
            json={
                "status": "in_progress",
                "updated_at": datetime.utcnow().isoformat(),
                "notes": "Status update from operator"
            },
            headers=headers,
            name="Update Incident"
        )
    
    @task(20)
    def check_compliance(self):
        """Check compliance status"""
        headers = get_headers(self.token)
        self.client.get(
            "/api/compliance?framework=artp&detailed=true",
            headers=headers,
            name="Compliance Check"
        )


class ThreatHunterUser(BaseSOCUser):
    """
    Threat Hunter User - Advanced search and analysis
    Weight: 15% of total users
    Behavior: Complex queries, threat correlation, deep investigation
    """
    
    wait_time = between(15, 120)
    
    def _get_user_type(self):
        return "threat_hunter"
    
    @task(40)
    def advanced_search(self):
        """Execute complex search queries"""
        headers = get_headers(self.token)
        
        query_templates = [
            {"filters": [
                {"field": "timestamp", "operator": "gte", "value": (datetime.utcnow() - timedelta(hours=1)).isoformat()},
                {"field": "severity", "operator": "in", "value": ["high", "critical"]},
            ]},
            {"query": "event_type:intrusion AND source_ip:* AND destination_port:(443 OR 8080)"},
            {"filters": [
                {"field": "source_ip", "operator": "regex", "value": "^41\\."},
                {"field": "custom_fields.geoip_country", "operator": "=", "value": "DZ"},
            ]},
        ]
        
        query = random.choice(query_templates)
        self.client.post(
            "/api/v1/events/search/advanced",
            json=query,
            headers=headers,
            name="Advanced Search"
        )
    
    @task(30)
    def pivot_investigation(self):
        """Pivot from one indicator to related events"""
        headers = get_headers(self.token)
        
        # Get a recent high-severity event as pivot point
        response = self.client.get(
            "/api/v1/events/search?q=severity:critical&limit=1",
            headers=headers,
            name="Get Pivot Point"
        )
        
        if response.status_code == 200:
            try:
                data = response.json()
                if data.get("data"):
                    source_ip = data["data"][0].get("source_ip")
                    if source_ip:
                        self.client.get(
                            f"/api/v1/events/search?q=source_ip:{source_ip}&limit=50",
                            headers=headers,
                            name="Pivot Investigation"
                        )
            except Exception:
                pass
    
    @task(20)
    def analyze_threat_intel(self):
        """Query threat intelligence feeds"""
        headers = get_headers(self.token)
        self.client.get(
            "/api/threats?severity=critical&include=ioc,related_campaigns",
            headers=headers,
            name="Threat Intel Analysis"
        )
    
    @task(10)
    def run_correlation_query(self):
        """Run correlation engine queries"""
        headers = get_headers(self.token)
        self.client.post(
            "/api/analytics/correlate",
            json={
                "time_window": "24h",
                "min_confidence": 0.7,
                "max_results": 100
            },
            headers=headers,
            name="Correlation Query"
        )


class ManagerUser(BaseSOCUser):
    """
    Manager User - Reports and KPI monitoring
    Weight: 10% of total users
    Behavior: Report viewing, KPI dashboards, audit reviews
    """
    
    wait_time = between(20, 90)
    
    def _get_user_type(self):
        return "manager"
    
    @task(40)
    def view_reports(self):
        """View operational reports"""
        headers = get_headers(self.token)
        periods = ["24h", "7d", "30d"]
        period = random.choice(periods)
        
        self.client.get(
            f"/api/reports?type=kpi&period={period}",
            headers=headers,
            name=f"KPI Report ({period})"
        )
    
    @task(30)
    def review_incidents(self):
        """Review open incidents overview"""
        headers = get_headers(self.token)
        self.client.get(
            "/api/incidents?status=open&summary=true&priority=high,critical",
            headers=headers,
            name="Incident Review"
        )
    
    @task(20)
    def view_team_performance(self):
        """View team performance metrics"""
        headers = get_headers(self.token)
        self.client.get(
            "/api/analytics/team-performance?period=7d",
            headers=headers,
            name="Team Performance"
        )
    
    @task(10)
    def audit_recent_activity(self):
        """Review recent activity logs"""
        headers = get_headers(self.token)
        self.client.get(
            "/api/audit/logs?action_type=all&limit=100",
            headers=headers,
            name="Audit Log Review"
        )


class AdminUser(BaseSOCUser):
    """
    Admin User - System administration tasks
    Weight: 5% of total users
    Behavior: User management, system config, health checks
    """
    
    wait_time = between(30, 180)
    
    def _get_user_type(self):
        return "admin"
    
    @task(35)
    def manage_users(self):
        """View/manage user accounts"""
        headers = get_headers(self.token)
        self.client.get(
            "/api/users?limit=50&role=all&status=active",
            headers=headers,
            name="User Management"
        )
    
    @task(25)
    def system_health_check(self):
        """Deep system health verification"""
        headers = get_headers(self.token)
        self.client.get(
            "/api/system?metrics=cpu,memory,disk,network,connections",
            headers=headers,
            name="System Health Check"
        )
    
    @task(20)
    def view_audit_trail(self):
        """Review comprehensive audit trail"""
        headers = get_headers(self.token)
        self.client.get(
            "/api/audit/logs?detailed=true&period=7d",
            headers=headers,
            name="Audit Trail"
        )
    
    @task(20)
    def configuration_status(self):
        """Check configuration integrity"""
        headers = get_headers(self.token)
        self.client.get(
            "/api/system/config-status",
            headers=headers,
            name="Config Status"
        )


# ============================================================================
# Specialized Ingestion User for Throughput Testing
# ============================================================================

class IngestionUser(HttpUser):
    """
    Dedicated ingestion user for EPS throughput testing
    Designed for maximum event submission rate
    """
    
    wait_time = constant_pacing(1 / 100)  # Target ~100 events/sec per user
    
    def on_start(self):
        self.ingestion_token = __import__('os').environ.get('INGESTION_TOKEN', 'perf-test-token')
    
    @task
    def ingest_single_event(self):
        """Ingest single security event"""
        headers = {
            "Content-Type": "application/json",
            "X-Ingestion-Token": self.ingestion_token,
            "X-Event-Source": "locust-ingestion-test",
        }
        
        payload = generate_event_payload()
        
        self.client.post(
            "/api/v1/events",
            json=payload,
            headers=headers,
            name="Single Event Ingestion",
            timeout=0.05  # 50ms timeout for fast failure
        )
    
    @task(weight=3)
    def ingest_batch_events(self):
        """Ingest batch of events for higher throughput"""
        headers = {
            "Content-Type": "application/json",
            "X-Ingestion-Token": self.ingestion_token,
            "X-Batch-Size": "100",
        }
        
        batch = generate_batch_events(100)
        payload = {
            "batch_id": f"batch-{uuid.uuid4().hex[:8]}",
            "source": "locust-batch-test",
            "events": batch,
        }
        
        self.client.post(
            "/api/v1/events/batch",
            json=payload,
            headers=headers,
            name="Batch Ingestion (100)",
            timeout=0.1
        )


# ============================================================================
# Test Configuration Classes
# ============================================================================

class StandardLoadTest(SOCAnalystUser, SOCOperatorUser, ThreatHunterUser, ManagerUser, AdminUser):
    """
    Mixed workload test with realistic user distribution
    Automatically distributes users based on persona weights
    """
    pass


# For running specific scenarios via command line:
# locust -f locustfile.py SOCAnalystUser --users 4000
# locust -f locustfile.py IngestionUser --users 100 --spawn-rate 10
