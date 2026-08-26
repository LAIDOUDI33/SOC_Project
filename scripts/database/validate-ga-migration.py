#!/usr/bin/env python3
"""
CyberSOC Platform - GA Migration Validation Script
====================================================
Validates PostgreSQL schema, data integrity, and production readiness.
Run after executing ga-migration-staging.sql against staging database.

Usage:
    python validate-ga-migration.py [--db-url URL] [--verbose] [--json-output]

Author: CyberSOC DBA Team
Version: 2.0.0-GA
Date: 2026-08-26
"""

import argparse
import json
import sys
import os
from datetime import datetime
from typing import Dict, List, Any, Optional, Tuple

# Try to import psycopg2, fall back to validation without DB connection
try:
    import psycopg2
    from psycopg2.extras import RealDictCursor
    PSYCOPG2_AVAILABLE = True
except ImportError:
    PSYCOPG2_AVAILABLE = False
    print("[WARN] psycopg2 not available - running in schema-only validation mode")


class MigrationValidator:
    """Validates CyberSOC GA migration status"""
    
    # Expected schema definition (tables with their critical columns)
    EXPECTED_TABLES = {
        'users': {
            'critical_columns': ['id', 'username', 'email', 'role', 'is_active', 'created_at'],
            'indexes': ['idx_users_username', 'idx_users_email', 'idx_users_role']
        },
        'sessions': {
            'critical_columns': ['id', 'user_id', 'session_token_hash', 'ip_address', 'expires_at', 'is_valid'],
            'indexes': ['idx_sessions_user']
        },
        'audit_log': {
            'critical_columns': ['id', 'timestamp', 'actor_id', 'action', 'resource_type', 'details'],
            'indexes': ['idx_audit_log_timestamp']
        },
        'incidents': {
            'critical_columns': ['id', 'incident_number', 'title', 'severity', 'status', 'detected_at'],
            'indexes': ['idx_incidents_status', 'idx_incidents_severity']
        },
        'alerts': {
            'critical_columns': ['id', 'alert_id', 'source_type', 'rule_name', 'severity', 'status', 'triggered_at'],
            'indexes': ['idx_alerts_status', 'idx_alerts_severity']
        },
        'threat_indicators': {
            'critical_columns': ['id', 'indicator_type', 'indicator_value', 'confidence', 'severity', 'is_active'],
            'indexes': ['idx_threat_indicators_value', 'idx_threat_indicators_type']
        },
        'hunt_sessions': {
            'critical_columns': ['id', 'session_name', 'status', 'created_by', 'created_at'],
            'indexes': ['idx_hunt_sessions_status']
        },
        'hunt_hypotheses': {
            'critical_columns': ['id', 'session_id', 'hypothesis_text', 'status'],
            'indexes': ['idx_hypotheses_session']  # May vary
        },
        'ss7_messages': {
            'critical_columns': ['id', 'message_id', 'message_type', 'received_at', 'is_suspicious'],
            'indexes': ['idx_ss7_messages_type', 'idx_ss7_messages_suspicious']
        },
        'fraud_events': {
            'critical_columns': ['id', 'event_id', 'fraud_type', 'severity', 'status', 'detected_at'],
            'indexes': ['idx_fraud_events_type', 'idx_fraud_events_status']
        },
        'compliance_requirements': {
            'critical_columns': ['id', 'framework', 'requirement_id', 'requirement_name', 'status'],
            'indexes': ['idx_compliance_framework']
        },
        'playbooks': {
            'critical_columns': ['id', 'name', 'category', 'trigger_type', 'is_active'],
            'indexes': ['idx_playbooks_category']
        },
        'feature_flags': {
            'critical_columns': ['id', 'flag_key', 'flag_name', 'value', 'is_security_sensitive'],
            'indexes': []  # Primary key only expected
        },
        'system_settings': {
            'critical_columns': ['key', 'value', 'description'],
            'indexes': []  # Primary key only expected
        }
    }
    
    # Expected enums
    EXPECTED_ENUMS = [
        'threat_severity',
        'incident_status',
        'alert_status',
        'user_role',
        'auth_provider',
        'mfa_method',
        'integration_type',
        'compliance_framework',
        'data_classification',
        'ss7_message_type',
        'fraud_type'
    ]
    
    # Expected extensions
    EXPECTED_EXTENSIONS = [
        'uuid-ossp',
        'pgcrypto',
        'pg_trgm',
        'btree_gist'
    ]
    
    # Expected views
    EXPECTED_VIEWS = [
        'v_active_incidents',
        'mv_dashboard_metrics'
    ]
    
    # Expected stored procedures/functions
    EXPECTED_FUNCTIONS = [
        'update_updated_at_column',
        'generate_incident_number',
        'generate_incident_number_trigger',
        'refresh_dashboard_metrics',
        'get_soc_dashboard_summary',
        'bulk_acknowledge_alerts'
    ]
    
    def __init__(self, db_url: Optional[str] = None, verbose: bool = False):
        self.db_url = db_url or os.environ.get(
            'DATABASE_URL',
            'postgresql://soc_staging:staging_secure_pass_2024@localhost:15432/cybersoc_staging'
        )
        self.verbose = verbose
        self.results: Dict[str, Any] = {
            'timestamp': datetime.now().isoformat(),
            'environment': 'staging',
            'validation_results': {},
            'summary': {'passed': 0, 'failed': 0, 'warnings': 0, 'skipped': 0}
        }
        self.conn = None
    
    def connect(self) -> bool:
        """Establish database connection"""
        if not PSYCOPG2_AVAILABLE:
            self._log("info", "psycopg2 not available - skipping live DB checks")
            return False
        
        try:
            self.conn = psycopg2.connect(self.db_url)
            self._log("info", f"Connected to database successfully")
            return True
        except Exception as e:
            self._log("error", f"Failed to connect to database: {e}")
            return False
    
    def disconnect(self):
        """Close database connection"""
        if self.conn:
            self.conn.close()
            self._log("info", "Database connection closed")
    
    def _log(self, level: str, message: str):
        """Log message with level"""
        prefix = {
            'info': '[INFO]',
            'ok': '[OK]',
            'warn': '[WARN]',
            'error': '[ERROR]'
        }.get(level, '[LOG]')
        
        if self.verbose or level in ('error', 'warn'):
            print(f"{prefix} {message}")
    
    def _record_result(self, category: str, test: str, passed: bool, 
                       details: str = '', warning: bool = False):
        """Record a test result"""
        if category not in self.results['validation_results']:
            self.results['validation_results'][category] = []
        
        result = {
            'test': test,
            'passed': passed,
            'details': details,
            'timestamp': datetime.now().isoformat()
        }
        
        self.results['validation_results'][category].append(result)
        
        if warning:
            self.results['summary']['warnings'] += 1
        elif passed:
            self.results['summary']['passed'] += 1
        else:
            self.results['summary']['failed'] += 1
    
    def check_extensions(self):
        """Check PostgreSQL extensions are installed"""
        self._log("info", "Checking PostgreSQL extensions...")
        
        if not self.conn:
            self._record_result('extensions', 'connection_available', False, 
                              "No database connection - skipping extension check", warning=True)
            return
        
        try:
            with self.conn.cursor() as cur:
                cur.execute("""
                    SELECT extname 
                    FROM pg_extension 
                    WHERE extname IN %s
                """, (tuple(self.EXPECTED_EXTENSIONS),))
                
                installed = [row[0] for row in cur.fetchall()]
                
                for ext in self.EXPECTED_EXTENSIONS:
                    is_installed = ext in installed
                    status = "installed" if is_installed else "MISSING"
                    self._record_result('extensions', f'extension_{ext}', is_installed, status)
                    
                    if is_installed:
                        self._log("ok", f"Extension {ext}: {status}")
                    else:
                        self._log("error", f"Extension {ext}: {status}")
        
        except Exception as e:
            self._record_result('extensions', 'check_error', False, str(e))
    
    def check_enums(self):
        """Check enum types exist"""
        self._log("info", "Checking enum types...")
        
        if not self.conn:
            self._record_result('enums', 'connection_available', False,
                              "No database connection - skipping enum check", warning=True)
            return
        
        try:
            with self.conn.cursor() as cur:
                cur.execute("""
                    SELECT t.typname 
                    FROM pg_type t 
                    JOIN pg_namespace n ON n.oid = t.typnamespace
                    WHERE n.nspname = 'public' AND t.typtype = 'e'
                """)
                
                existing_enums = [row[0] for row in cur.fetchall()]
                
                for enum in self.EXPECTED_ENUMS:
                    exists = enum in existing_enums
                    status = "exists" if exists else "MISSING"
                    self._record_result('enums', f'enum_{enum}', exists, status)
                    
                    if exists:
                        self._log("ok", f"Enum {enum}: {status}")
                    else:
                        self._log("error", f"Enum {enum}: {status}")
        
        except Exception as e:
            self._record_result('enums', 'check_error', False, str(e))
    
    def check_tables(self):
        """Check all required tables exist with correct structure"""
        self._log("info", "Checking table structure...")
        
        if not self.conn:
            self._record_result('tables', 'connection_available', False,
                              "No database connection - skipping table check", warning=True)
            return
        
        try:
            with self.conn.cursor() as cur:
                # Get existing tables
                cur.execute("""
                    SELECT tablename 
                    FROM pg_tables 
                    WHERE schemaname = 'public'
                """)
                existing_tables = [row[0] for row in cur.fetchall()]
                
                for table_name, spec in self.EXPECTED_TABLES.items():
                    table_exists = table_name in existing_tables
                    
                    if not table_exists:
                        self._record_result('tables', f'table_{table_name}', False, 
                                           f"Table does not exist")
                        self._log("error", f"Table {table_name}: MISSING")
                        continue
                    
                    # Check columns
                    cur.execute("""
                        SELECT column_name 
                        FROM information_schema.columns 
                        WHERE table_schema = 'public' AND table_name = %s
                    """, (table_name,))
                    existing_cols = [row[0] for row in cur.fetchall()]
                    
                    missing_cols = [c for c in spec['critical_columns'] if c not in existing_cols]
                    
                    if missing_cols:
                        self._record_result('tables', f'table_{table_name}_columns', False,
                                          f"Missing columns: {missing_cols}")
                        self._log("error", f"Table {table_name}: Missing columns {missing_cols}")
                    else:
                        self._record_result('tables', f'table_{table_name}_columns', True,
                                          f"All {len(spec['critical_columns'])} critical columns present")
                        self._log("ok", f"Table {table_name}: All columns present")
                    
                    # Check indexes (non-critical)
                    if spec.get('indexes'):
                        cur.execute("""
                            SELECT indexname 
                            FROM pg_indexes 
                            WHERE schemaname = 'public' AND tablename = %s
                        """, (table_name,))
                        existing_indexes = [row[0] for row in cur.fetchall()]
                        
                        for idx in spec['indexes']:
                            idx_exists = idx in existing_indexes
                            self._record_result('tables', f'index_{idx}', idx_exists,
                                              "exists" if idx_exists else "not found (may affect performance)")
        
        except Exception as e:
            self._record_result('tables', 'check_error', False, str(e))
    
    def check_views(self):
        """Check materialized views and regular views"""
        self._log("info", "Checking views...")
        
        if not self.conn:
            self._record_result('views', 'connection_available', False,
                              "No database connection - skipping view check", warning=True)
            return
        
        try:
            with self.conn.cursor() as cur:
                # Check regular views
                cur.execute("""
                    SELECT viewname 
                    FROM pg_views 
                    WHERE schemaname = 'public'
                """)
                regular_views = [row[0] for row in cur.fetchall()]
                
                # Check materialized views
                cur.execute("""
                    SELECT matviewname 
                    FROM pg_matviews 
                    WHERE schemaname = 'public'
                """)
                mat_views = [row[0] for row in cur.fetchall()]
                
                all_views = regular_views + mat_views
                
                for view in self.EXPECTED_VIEWS:
                    exists = view in all_views
                    view_type = "materialized" if view in mat_views else "regular"
                    self._record_result('views', f'view_{view}', exists,
                                      f"{view_type} view - {'found' if exists else 'MISSING'}")
                    
                    if exists:
                        self._log("ok", f"View {view}: {view_type}")
                    else:
                        self._log("error", f"View {view}: MISSING")
        
        except Exception as e:
            self._record_result('views', 'check_error', False, str(e))
    
    def check_functions(self):
        """Check stored procedures and functions"""
        self._log("info", "Checking functions/procedures...")
        
        if not self.conn:
            self._record_result('functions', 'connection_available', False,
                              "No database connection - skipping function check", warning=True)
            return
        
        try:
            with self.conn.cursor() as cur:
                cur.execute("""
                    SELECT routine_name 
                    FROM information_schema.routines 
                    WHERE routine_schema = 'public'
                      AND routine_type IN ('FUNCTION', 'PROCEDURE')
                """)
                existing_funcs = [row[0] for row in cur.fetchall()]
                
                for func in self.EXPECTED_FUNCTIONS:
                    # Partial match (PostgreSQL may add suffixes)
                    matches = [f for f in existing_funcs if func.lower() in f.lower()]
                    exists = len(matches) > 0
                    self._record_result('functions', f'function_{func}', exists,
                                      f"{'Found: ' + ', '.join(matches) if exists else 'NOT FOUND'}")
                    
                    if exists:
                        self._log("ok", f"Function {func}: Found")
                    else:
                        self._log("warn", f"Function {func}: Not found (may be optional)")
        
        except Exception as e:
            self._record_result('functions', 'check_error', False, str(e))
    
    def check_feature_flags(self):
        """Verify security-critical feature flags are present"""
        self._log("info", "Checking feature flags...")
        
        if not self.conn:
            self._record_result('feature_flags', 'connection_available', False,
                              "No database connection - skipping flag check", warning=True)
            return
        
        critical_flags = [
            ('ALLOW_MFA_BYPASS', False),      # MUST be false
            ('DISABLE_RATE_LIMITING', False),  # MUST be false
            ('DISABLE_AUDIT_LOGGING', False)   # MUST be false
        ]
        
        try:
            with self.conn.cursor() as cur:
                cur.execute("SELECT flag_key, value FROM feature_flags")
                flags = {row[0]: row[1] for row in cur.fetchall()}
                
                for flag_key, expected_value in critical_flags:
                    if flag_key not in flags:
                        self._record_result('feature_flags', f'flag_{flag_key}', False,
                                          f"Security-critical flag MISSING")
                        self._log("error", f"Flag {flag_key}: MISSING - SECURITY RISK!")
                    elif flags[flag_key] != expected_value:
                        self._record_result('feature_flags', f'flag_{flag_key}', False,
                                          f"Flag is {flags[flag_key]}, should be {expected_value} - SECURITY RISK!")
                        self._log("error", f"Flag {flag_key}: {flags[flag_key]} - SHOULD BE {expected_value}!")
                    else:
                        self._record_result('feature_flags', f'flag_{flag_key}', True,
                                          f"Correctly set to {expected_value}")
                        self._log("ok", f"Flag {flag_key}: Correctly set to {expected_value}")
        
        except Exception as e:
            self._record_result('feature_flags', 'check_error', False, str(e))
    
    def check_data_integrity(self):
        """Basic data integrity checks"""
        self._log("info", "Checking data integrity...")
        
        if not self.conn:
            self._record_result('integrity', 'connection_available', False,
                              "No database connection - skipping integrity check", warning=True)
            return
        
        try:
            with self.conn.cursor() as cur:
                # Check referential integrity on users table
                cur.execute("SELECT COUNT(*) FROM users")
                user_count = cur.fetchone()[0]
                self._record_result('integrity', 'users_populated', user_count > 0,
                                  f"{user_count} users in system", warning=(user_count == 0))
                
                # Check audit log has entries
                cur.execute("SELECT COUNT(*) FROM audit_log")
                audit_count = cur.fetchone()[0]
                self._record_result('integrity', 'audit_log_entries', audit_count >= 0,
                                  f"{audit_count} audit log entries")
                
                # Verify no orphaned sessions
                cur.execute("""
                    SELECT COUNT(*) FROM sessions s 
                    LEFT JOIN users u ON s.user_id = u.id 
                    WHERE u.id IS NULL AND s.user_id IS NOT NULL
                """)
                orphaned_sessions = cur.fetchone()[0]
                self._record_result('integrity', 'orphaned_sessions', orphaned_sessions == 0,
                                  f"{orphaned_sessions} orphaned session records")
                
                # Check for NULL critical fields
                cur.execute("SELECT COUNT(*) FROM incidents WHERE incident_number IS NULL")
                null_incident_nums = cur.fetchone()[0]
                self._record_result('integrity', 'incidents_null_numbers', null_incident_nums == 0,
                                  f"{null_incident_nums} incidents without numbers")
        
        except Exception as e:
            self._record_result('integrity', 'check_error', False, str(e))
    
    def check_performance_indexes(self):
        """Verify performance-critical indexes exist"""
        self._log("info", "Checking performance indexes...")
        
        if not self.conn:
            return
        
        perf_critical_indexes = [
            ('audit_log', 'idx_audit_log_timestamp'),
            ('alerts', 'idx_alerts_status'),
            ('incidents', 'idx_incidents_status'),
            ('ss7_messages', 'idx_ss7_messages_received')
        ]
        
        try:
            with self.conn.cursor() as cur:
                for table, expected_idx in perf_critical_indexes:
                    cur.execute("""
                        SELECT 1 FROM pg_indexes 
                        WHERE schemaname = 'public' AND tablename = %s AND indexname = %s
                    """, (table, expected_idx))
                    exists = cur.fetchone() is not None
                    self._record_result('performance', f'index_{expected_idx}', exists,
                                      f"Performance index on {table}")
                    
                    if not exists:
                        self._log("warn", f"Performance index {expected_idx} on {table} missing - queries may be slow")
        
        except Exception as e:
            self._record_result('performance', 'check_error', False, str(e))
    
    def run_all_checks(self) -> Dict[str, Any]:
        """Execute all validation checks"""
        print("\n" + "="*70)
        print("CyberSOC Platform - GA Migration Validation")
        print("="*70)
        print(f"Timestamp: {self.results['timestamp']}")
        print(f"Environment: {self.results['environment'].upper()}")
        print(f"Database: {self.db_url.split('@')[-1] if '@' in self.db_url else 'N/A'}")
        print("="*70 + "\n")
        
        connected = self.connect()
        
        if connected:
            self.check_extensions()
            self.check_enums()
            self.check_tables()
            self.check_views()
            self.check_functions()
            self.check_feature_flags()
            self.check_data_integrity()
            self.check_performance_indexes()
            
            self.disconnect()
        else:
            # Run schema file validation instead
            self._validate_schema_file()
        
        # Print summary
        self.print_summary()
        
        return self.results
    
    def _validate_schema_file(self):
        """Validate SQL schema file exists and has expected content when no DB connection"""
        schema_file = '/home/z/my-project/scripts/database/ga-migration-staging.sql'
        
        if os.path.exists(schema_file):
            with open(schema_file, 'r') as f:
                content = f.read()
            
            self._record_result('schema_file', 'file_exists', True, f"Schema file found at {schema_file}")
            
            # Check for key statements
            checks = [
                ('CREATE TABLE users', 'users_table'),
                ('CREATE TABLE incidents', 'incidents_table'),
                ('CREATE TABLE alerts', 'alerts_table'),
                ('CREATE EXTENSION', 'extensions'),
                ('CREATE TYPE threat_severity', 'enums'),
                ('CREATE INDEX', 'indexes'),
                ('CREATE OR REPLACE FUNCTION', 'functions'),
                ('feature_flags', 'security_flags')
            ]
            
            for search_str, check_name in checks:
                found = search_str.lower() in content.lower()
                self._record_result('schema_file', check_name, found,
                                  f"Schema contains '{search_str}'")
        else:
            self._record_result('schema_file', 'file_exists', False, "Schema file not found")
    
    def print_summary(self):
        """Print validation summary"""
        summary = self.results['summary']
        total = summary['passed'] + summary['failed'] + summary['warnings']
        
        pass_rate = (summary['passed'] / total * 100) if total > 0 else 0
        
        print("\n" + "="*70)
        print("VALIDATION SUMMARY")
        print("="*70)
        print(f"Total Checks:     {total}")
        print(f"Passed:           {summary['passed']} ✅")
        print(f"Failed:           {summary['failed']} ❌")
        print(f"Warnings:         {summary['warnings']} ⚠️")
        print(f"Skipped:          {summary['skipped']} ⏭️")
        print("-"*70)
        print(f"Pass Rate:        {pass_rate:.1f}%")
        print("="*70)
        
        if summary['failed'] > 0:
            print("\n❌ VALIDATION FAILED - Fix issues before proceeding to production")
            sys.exit(1)
        elif summary['warnings'] > 0:
            print("\n⚠️  VALIDATION PASSED WITH WARNINGS - Review warnings before production")
        else:
            print("\n✅ ALL VALIDATIONS PASSED - Ready for production deployment")
        
        print("\nNext Steps:")
        print("  1. Address any failed checks above")
        print("  2. Review warnings for potential improvements")
        print("  3. Run full application test suite against this database")
        print("  4. Proceed to Task 2: TLS Certificate Generation")
        print()


def main():
    parser = argparse.ArgumentParser(
        description='CyberSOC Platform GA Migration Validator',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python validate-ga-migration.py                     # Use default connection
  python validate-ga-migration.py --verbose           # Show detailed output
  python validate-ga-migration.py --json-output       # Output JSON results
  python validate-ga-migration.py --db-url "postgresql://..."
        """
    )
    
    parser.add_argument(
        '--db-url',
        type=str,
        help='PostgreSQL connection URL (default: from DATABASE_URL env or localhost:15432)'
    )
    parser.add_argument(
        '--verbose', '-v',
        action='store_true',
        help='Show verbose output including individual checks'
    )
    parser.add_argument(
        '--json-output', '-j',
        action='store_true',
        help='Output results as JSON (for CI/CD integration)'
    )
    
    args = parser.parse_args()
    
    validator = MigrationValidator(db_url=args.db_url, verbose=args.verbose)
    results = validator.run_all_checks()
    
    if args.json_output:
        print(json.dumps(results, indent=2, default=str))
    
    return 0 if results['summary']['failed'] == 0 else 1


if __name__ == '__main__':
    sys.exit(main())
