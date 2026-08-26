#!/usr/bin/env python3
"""
CyberSOC Platform - Security Configuration Validator
=====================================================
Validates .env.production against GA security requirements.
Exits with code 0 if all checks pass, 1 if any critical failures.

Usage:
    python3 validate-security-config.py [--env-file PATH] [--strict] [--json]

Author: CyberSOC Security Team
Version: 2.0.0-GA
"""

import argparse
import os
import re
import sys
import json
from datetime import datetime
from typing import Dict, List, Tuple, Any

class SecurityConfigValidator:
    """Validates production environment configuration for security compliance."""
    
    # Critical security checks (must pass)
    CRITICAL_CHECKS = {
        'debug_disabled': {
            'pattern': r'^DEBUG=false$',
            'description': 'DEBUG must be false in production',
            'severity': 'CRITICAL'
        },
        'mfa_bypass_disabled': {
            'pattern': r'^ALLOW_MFA_BYPASS=false$',
            'description': 'MFA bypass must be disabled',
            'severity': 'CRITICAL'
        },
        'rate_limiting_enabled': {
            'pattern': r'^DISABLE_RATE_LIMITING=false$',
            'description': 'Rate limiting must be enabled',
            'severity': 'CRITICAL'
        },
        'audit_logging_enabled': {
            'pattern': r'^DISABLE_AUDIT_LOGGING=false$',
            'description': 'Audit logging must be enabled',
            'severity': 'CRITICAL'
        },
        'node_env_production': {
            'pattern': r'^NODE_ENV=production$',
            'description': 'NODE_ENV must be "production"',
            'severity': 'CRITICAL'
        },
    }
    
    # High priority checks
    HIGH_CHECKS = {
        'jwt_secret_present': {
            'pattern': r'^JWT_SECRET=.+$',
            'description': 'JWT_SECRET must be set',
            'severity': 'HIGH'
        },
        'refresh_secret_present': {
            'pattern': r'^REFRESH_SECRET=.+$',
            'description': 'REFRESH_SECRET must be set',
            'severity': 'HIGH'
        },
        'encryption_key_present': {
            'pattern': r'^ENCRYPTION_KEY=.+$',
            'description': 'ENCRYPTION_KEY must be set',
            'severity': 'HIGH'
        },
        'csrf_secret_present': {
            'pattern': r'^CSRF_SECRET=.+$',
            'description': 'CSRF_SECRET must be set',
            'severity': 'HIGH'
        },
        'db_ssl_required': {
            'pattern': r'sslmode=require',
            'description': 'Database connection must use SSL',
            'severity': 'HIGH'
        },
        'redis_auth': {
            'pattern': r'redis://:[^@]+@',
            'description': 'Redis URL must include password',
            'severity': 'HIGH'
        },
        'session_secure_cookie': {
            'pattern': r'^SESSION_COOKIE_SECURE=true$',
            'description': 'Session cookie must be secure',
            'severity': 'HIGH'
        },
        'session_httponly_cookie': {
            'pattern': r'^SESSION_COOKIE_HTTPONLY=true$',
            'description': 'Session cookie must be HttpOnly',
            'severity': 'HIGH'
        },
        'hsts_enabled': {
            'pattern': r'^HSTS_ENABLED=true$',
            'description': 'HSTS must be enabled',
            'severity': 'HIGH'
        },
        'log_level_production': {
            'pattern': r'^LOG_LEVEL=(warn|error)$',
            'description': 'Log level should be warn or error',
            'severity': 'HIGH'
        },
        'stacktrace_disabled': {
            'pattern': r'^STACKTRACE=false$',
            'description': 'Stack traces must be disabled',
            'severity': 'HIGH'
        },
        'sensitive_redaction': {
            'pattern': r'^SENSITIVE_REDACTION=true$',
            'description': 'Sensitive data redaction must be enabled',
            'severity': 'HIGH'
        },
    }
    
    # Medium priority checks
    MEDIUM_CHECKS = {
        'jwt_refresh_different': {
            'check': 'secrets_unique',
            'description': 'JWT_SECRET and REFRESH_SECRET must differ',
            'severity': 'MEDIUM'
        },
        'encryption_key_length': {
            'pattern': r'^ENCRYPTION_KEY=[a-fA-F0-9]{64}$',
            'description': 'ENCRYPTION_KEY must be 32 bytes (64 hex chars)',
            'severity': 'MEDIUM'
        },
        'no_placeholder_values': {
            'check': 'no_placeholders',
            'description': 'No placeholder/default values remain',
            'severity': 'MEDIUM'
        },
        'https_urls_only': {
            'check': 'https_urls',
            'description': 'All URLs must use HTTPS',
            'severity': 'MEDIUM'
        },
        'csp_configured': {
            'pattern': r'^CSP_ENABLED=true$',
            'description': 'Content-Security-Policy must be configured',
            'severity': 'MEDIUM'
        },
        'audit_retention_adequate': {
            'pattern': r'AUDIT_LOG_RETENTION_DAYS=(2555|[2-9]\d{3}|\d{5,})',
            'description': 'Audit retention >= 7 years (2555 days) for ANRT',
            'severity': 'MEDIUM'
        },
    }
    
    PLACEHOLDER_PATTERNS = [
        r'<GENERATE',
        r'<PASSWORD>',
        r'<FROM_VAULT>',
        r'<YOUR_',
        r'CHANGE_ME',
        r'REPLACE_ME',
        r'placeholder',
        r'<INSERT',
    ]
    
    def __init__(self, env_file: str, strict_mode: bool = False):
        self.env_file = env_file
        self.strict_mode = strict_mode
        self.config_content = {}
        self.results = {
            'timestamp': datetime.now().isoformat(),
            'env_file': env_file,
            'strict_mode': strict_mode,
            'checks': [],
            'summary': {'critical': 0, 'high': 0, 'medium': 0, 'low': 0, 'passed': 0},
            'passed': True
        }
    
    def load_config(self) -> bool:
        """Load and parse the environment configuration file."""
        if not os.path.exists(self.env_file):
            self._record_result('file_exists', False, f"File not found: {self.env_file}", 'CRITICAL')
            return False
        
        try:
            with open(self.env_file, 'r') as f:
                for line_num, line in enumerate(f, 1):
                    line = line.strip()
                    if line and not line.startswith('#') and '=' in line:
                        key, value = line.split('=', 1)
                        self.config_content[key] = {
                            'value': value,
                            'line': line_num
                        }
            
            self._record_result('file_exists', True, f"Loaded {len(self.config_content)} config entries", 'INFO')
            return True
            
        except Exception as e:
            self._record_result('file_readable', False, f"Error reading file: {e}", 'CRITICAL')
            return False
    
    def _record_result(self, check_name: str, passed: bool, message: str, severity: str = 'MEDIUM'):
        result = {
            'check': check_name,
            'passed': passed,
            'message': message,
            'severity': severity,
            'timestamp': datetime.now().isoformat()
        }
        self.results['checks'].append(result)
        
        if not passed:
            self.results['passed'] = False
            sev_lower = severity.lower()
            if sev_lower in self.results['summary']:
                self.results['summary'][sev_lower] += 1
        else:
            self.results['summary']['passed'] += 1
    
    def run_critical_checks(self):
        """Run critical security validation checks."""
        print("\n" + "="*70)
        print("CRITICAL SECURITY CHECKS")
        print("="*70)
        
        for check_name, check_def in self.CRITICAL_CHECKS.items():
            found = False
            for key, data in self.config_content.items():
                full_line = f"{key}={data['value']}"
                if re.search(check_def['pattern'], full_line, re.IGNORECASE):
                    found = True
                    break
            
            if found:
                self._record_result(check_name, True, check_def['description'], check_def['severity'])
                print(f"  [PASS] {check_def['description']}")
            else:
                self._record_result(check_name, False, check_def['description'], check_def['severity'])
                print(f"  [FAIL] {check_def['description']} - {check_def['severity']}")
    
    def run_high_checks(self):
        """Run high-priority security validation checks."""
        print("\n" + "="*70)
        print("HIGH PRIORITY SECURITY CHECKS")
        print("="*70)
        
        for check_name, check_def in self.HIGH_CHECKS.items():
            found = False
            for key, data in self.config_content.items():
                full_line = f"{key}={data['value']}"
                if re.search(check_def['pattern'], full_line, re.IGNORECASE):
                    found = True
                    break
            
            if found:
                self._record_result(check_name, True, check_def['description'], check_def['severity'])
                print(f"  [PASS] {check_def['description']}")
            else:
                self._record_result(check_name, False, check_def['description'], check_def['severity'])
                print(f"  [FAIL] {check_def['description']} - {check_def['severity']}")
    
    def run_medium_checks(self):
        """Run medium-priority security validation checks."""
        print("\n" + "="*70)
        print("MEDIUM PRIORITY SECURITY CHECKS")
        print("="*70)
        
        for check_name, check_def in self.MEDIUM_CHECKS.items():
            passed = False
            message = ""
            
            if check_def.get('check') == 'secrets_unique':
                jwt = self.config_content.get('JWT_SECRET', {}).get('value', '')
                refresh = self.config_content.get('REFRESH_SECRET', {}).get('value', '')
                if jwt and refresh and jwt != refresh:
                    passed = True
                    message = "JWT_SECRET differs from REFRESH_SECRET"
                else:
                    message = "JWT_SECRET and REFRESH_SECRET are identical or missing"
            
            elif check_def.get('check') == 'no_placeholders':
                has_placeholder = False
                for key, data in self.config_content.items():
                    for pattern in self.PLACEHOLDER_PATTERNS:
                        if re.search(pattern, data['value'], re.IGNORECASE):
                            has_placeholder = True
                            message = f"Placeholder found in {key}: {data['value'][:30]}..."
                            break
                    if has_placeholder:
                        break
                if not has_placeholder:
                    passed = True
                    message = "No placeholder values detected"
            
            elif check_def.get('check') == 'https_urls':
                has_http = False
                for key, data in self.config_content.items():
                    if 'URL' in key.upper() and data['value'].startswith('http://'):
                        has_http = True
                        message = f"Insecure HTTP URL in {key}: {data['value'][:30]}..."
                        break
                if not has_http:
                    passed = True
                    message = "All URLs use HTTPS"
            
            elif 'pattern' in check_def:
                for key, data in self.config_content.items():
                    full_line = f"{key}={data['value']}"
                    if re.search(check_def['pattern'], full_line, re.IGNORECASE):
                        passed = True
                        message = check_def['description']
                        break
                
                if not passed:
                    message = f"Check failed: {check_def['description']}"
            
            self._record_result(check_name, passed, message, check_def['severity'])
            status = "[PASS]" if passed else "[WARN]"
            print(f"  {status} {message}")
    
    def check_file_permissions(self):
        """Check file permissions."""
        print("\n" + "="*70)
        print("FILE PERMISSIONS CHECK")
        print("="*70)
        
        try:
            stat_info = os.stat(self.env_file)
            mode = oct(stat_info.st_mode)[-3:]
            
            # Check owner permissions only (should be 600 or 640)
            if mode in ['600', '640']:
                self._record_result('file_permissions', True, f"Permissions: {mode} (secure)", 'LOW')
                print(f"  [OK] File permissions: {mode}")
            else:
                self._record_result('file_permissions', False, 
                                   f"Permissions: {mode} (should be 600 or 640)", 'MEDIUM')
                print(f"  [WARN] File permissions: {mode} (recommend 600)")
            
            # Check if file is world-readable
            if mode[-1] in ['4', '5', '6', '7']:
                self._record_result('world_readable', False, 
                                   "File is world-readable - security risk", 'HIGH')
                print(f"  [FAIL] File is world-readable!")
            
        except Exception as e:
            self._record_result('file_permissions_check', False, f"Cannot check permissions: {e}", 'LOW')
    
    def generate_report(self) -> Dict[str, Any]:
        """Generate final validation report."""
        total = len(self.results['checks'])
        failed = sum([v for k, v in self.results['summary'].items() if k != 'passed'])
        
        self.results['total_checks'] = total
        self.results['failed_checks'] = failed
        self.results['pass_rate'] = round((self.results['summary']['passed'] / total * 100), 1) if total > 0 else 0
        
        return self.results
    
    def print_summary(self):
        """Print validation summary."""
        print("\n" + "="*70)
        print("SECURITY CONFIGURATION VALIDATION SUMMARY")
        print("="*70)
        
        summary = self.results['summary']
        total = sum(summary.values())
        
        print(f"\n  Total Checks:     {total}")
        print(f"  Passed:           {summary['passed']} ✅")
        print(f"  Critical Failures: {summary['critical']} ❌")
        print(f"  High Failures:    {summary['high']} ⚠️")
        print(f"  Medium Warnings:  {summary['medium']} ⚠️")
        print(f"\n  Pass Rate:        {self.results.get('pass_rate', 0)}%")
        
        if self.results['passed']:
            print("\n  ✅ SECURITY CONFIGURATION VALIDATED - Ready for deployment")
            return 0
        else:
            print("\n  ❌ SECURITY ISSUES FOUND - Must fix before deployment")
            if self.strict_mode:
                print("  (Strict mode: failing on any issue)")
            return 1


def main():
    parser = argparse.ArgumentParser(
        description='CyberSOC Platform Security Configuration Validator',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python3 validate-security-config.py                     # Check default .env.production
  python3 validate-security-config.py --env-file .env.staging  # Check specific file
  python3 validate-security-config.py --strict --json       # Strict mode + JSON output
        """
    )
    
    parser.add_argument(
        '--env-file', '-e',
        type=str,
        default='.env.production',
        help='Environment file to validate (default: .env.production)'
    )
    parser.add_argument(
        '--strict', '-s',
        action='store_true',
        help='Fail on any warning (not just critical/high)'
    )
    parser.add_argument(
        '--json', '-j',
        action='store_true',
        help='Output results as JSON'
    )
    
    args = parser.parse_args()
    
    print("\n" + "╔" + "="*68 + "╗")
    print("║" + " "*15 + "CyberSOC Security Config Validator" + " "*22 + "║")
    print("╚" + "="*68 + "╝")
    print(f"\n  Environment File: {args.env_file}")
    print(f"  Strict Mode:      {'Yes' if args.strict else 'No'}")
    print(f"  Timestamp:        {datetime.now().isoformat()}")
    
    validator = SecurityConfigValidator(args.env_file, args.strict)
    
    if not validator.load_config():
        report = validator.generate_report()
        if args.json:
            print(json.dumps(report, indent=2))
        return 1
    
    validator.run_critical_checks()
    validator.run_high_checks()
    validator.run_medium_checks()
    validator.check_file_permissions()
    
    report = validator.generate_report()
    exit_code = validator.print_summary()
    
    if args.json:
        print("\n" + "="*70)
        print("JSON OUTPUT:")
        print("="*70)
        print(json.dumps(report, indent=2, default=str))
    
    return exit_code


if __name__ == '__main__':
    sys.exit(main())
