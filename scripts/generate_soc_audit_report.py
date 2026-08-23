#!/usr/bin/env python3
"""
National SOC Platform - Production Readiness Audit Report Generator
Phase 1 & Phase 2 Comprehensive Assessment
"""

import os
import sys
from datetime import datetime
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, cm, mm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, Image, ListFlowable, ListItem, KeepTogether
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY, TA_RIGHT
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# Register fonts - using DejaVu (widely available, ReportLab-compatible)
FONT_DIR = '/usr/share/fonts'
pdfmetrics.registerFont(TTFont('NotoSerifSC', f'{FONT_DIR}/truetype/dejavu/DejaVuSerif.ttf'))
pdfmetrics.registerFont(TTFont('NotoSerifSC-Bold', f'{FONT_DIR}/truetype/dejavu/DejaVuSerif-Bold.ttf'))
pdfmetrics.registerFont(TTFont('NotoSansSC', f'{FONT_DIR}/truetype/dejavu/DejaVuSans.ttf'))
pdfmetrics.registerFont(TTFont('NotoSansSC-Bold', f'{FONT_DIR}/truetype/dejavu/DejaVuSans-Bold.ttf'))

# Cascade Palette (Professional Technical Audit)
PAGE_BG       = colors.HexColor('#f8f9fa')
SECTION_BG    = colors.HexColor('#f0f1f3')
CARD_BG       = colors.HexColor('#ffffff')
TABLE_STRIPE  = colors.HexColor('#f5f6f7')
HEADER_FILL   = colors.HexColor('#1a365d')
ACCENT        = colors.HexColor('#2d5a87')
ACCENT_2      = colors.HexColor('#4a7ac7')
TEXT_PRIMARY   = colors.HexColor('#1a202c')
TEXT_MUTED     = colors.HexColor('#718096')
BORDER        = colors.HexColor('#e2e8f0')
SEM_SUCCESS   = colors.HexColor('#276749')
SEM_WARNING   = colors.HexColor('#c05621')
SEM_ERROR     = colors.HexColor('#c53030')
SEM_INFO      = colors.HexColor('#2b6cb0')

# Page setup
PAGE_WIDTH, PAGE_HEIGHT = A4
LEFT_MARGIN = 2*cm
RIGHT_MARGIN = 2*cm
TOP_MARGIN = 2*cm
BOTTOM_MARGIN = 2*cm

def create_styles():
    """Create custom paragraph styles for the report."""
    styles = getSampleStyleSheet()
    
    # Title style
    styles.add(ParagraphStyle(
        name='ReportTitle',
        fontName='NotoSerifSC-Bold',
        fontSize=28,
        leading=34,
        alignment=TA_CENTER,
        textColor=HEADER_FILL,
        spaceAfter=12
    ))
    
    # Subtitle style
    styles.add(ParagraphStyle(
        name='ReportSubtitle',
        fontName='NotoSansSC',
        fontSize=14,
        leading=18,
        alignment=TA_CENTER,
        textColor=TEXT_MUTED,
        spaceAfter=24
    ))
    
    # Section heading (H1)
    styles.add(ParagraphStyle(
        name='SectionHeading',
        fontName='NotoSerifSC-Bold',
        fontSize=18,
        leading=24,
        textColor=HEADER_FILL,
        spaceBefore=20,
        spaceAfter=12,
        borderPadding=(0, 0, 4, 0),
        borderWidth=0,
        borderColor=ACCENT
    ))
    
    # Subsection heading (H2)
    styles.add(ParagraphStyle(
        name='SubsectionHeading',
        fontName='NotoSerifSC-Bold',
        fontSize=14,
        leading=18,
        textColor=ACCENT,
        spaceBefore=16,
        spaceAfter=8
    ))
    
    # Body text - update existing
    styles['BodyText'].fontName = 'NotoSansSC'
    styles['BodyText'].fontSize = 10
    styles['BodyText'].leading = 15
    styles['BodyText'].alignment = TA_JUSTIFY
    styles['BodyText'].textColor = TEXT_PRIMARY
    styles['BodyText'].spaceAfter = 8
    
    # Finding title
    styles.add(ParagraphStyle(
        name='FindingTitle',
        fontName='NotoSansSC-Bold',
        fontSize=10,
        leading=14,
        textColor=TEXT_PRIMARY,
        spaceBefore=6,
        spaceAfter=2
    ))
    
    # Finding detail
    styles.add(ParagraphStyle(
        name='FindingDetail',
        fontName='NotoSansSC',
        fontSize=9,
        leading=13,
        textColor=TEXT_MUTED,
        leftIndent=12,
        spaceAfter=4
    ))
    
    # Status badges
    styles.add(ParagraphStyle(
        name='StatusPass',
        fontName='NotoSansSC-Bold',
        fontSize=9,
        textColor=colors.white,
        alignment=TA_CENTER
    ))
    
    styles.add(ParagraphStyle(
        name='StatusWarn',
        fontName='NotoSansSC-Bold',
        fontSize=9,
        textColor=colors.white,
        alignment=TA_CENTER
    ))
    
    styles.add(ParagraphStyle(
        name='StatusFail',
        fontName='NotoSansSC-Bold',
        fontSize=9,
        textColor=colors.white,
        alignment=TA_CENTER
    ))
    
    # Executive summary stat
    styles.add(ParagraphStyle(
        name='StatNumber',
        fontName='NotoSerifSC-Bold',
        fontSize=24,
        leading=28,
        alignment=TA_CENTER,
        textColor=ACCENT
    ))
    
    styles.add(ParagraphStyle(
        name='StatLabel',
        fontName='NotoSansSC',
        fontSize=9,
        leading=12,
        alignment=TA_CENTER,
        textColor=TEXT_MUTED
    ))
    
    return styles

def create_status_badge(status, styles):
    """Create a colored status badge."""
    if status == 'PASS':
        return Paragraph('<font color="white" backcolor="#276749">PASS</font>', styles['StatusPass'])
    elif status == 'WARN':
        return Paragraph('<font color="white" backcolor="#c05621">WARN</font>', styles['StatusWarn'])
    else:
        return Paragraph('<font color="white" backcolor="#c53030">FAIL</font>', styles['StatusFail'])

def create_severity_badge(severity):
    """Create severity-colored text."""
    color_map = {
        'Critical': '#c53030',
        'High': '#c05621', 
        'Medium': '#d69e2e',
        'Low': '#718096'
    }
    color = color_map.get(severity, '#718096')
    return f'<font color="{color}"><b>{severity}</b></font>'

def build_executive_summary(styles):
    """Build executive summary section."""
    elements = []
    
    elements.append(Paragraph("Executive Summary", styles['SectionHeading']))
    elements.append(Spacer(1, 8))
    
    summary_text = """
    This Production Readiness Audit provides a comprehensive assessment of the National SOC Platform 
    (Djezzy Telecom) across two major phases: Phase 1 (Code Quality & Security Basics, Configuration & 
    Infrastructure) and Phase 2 (Advanced Security Review, Performance & Scalability, Monitoring & 
    Operations). The audit examined over 150 configuration files, source code modules, Kubernetes 
    manifests, and operational procedures to evaluate the platform's readiness for deployment as 
    critical national infrastructure.
    """
    elements.append(Paragraph(summary_text.strip(), styles['BodyText']))
    elements.append(Spacer(1, 16))
    
    # Overall Status Statistics Table
    stats_data = [
        ['Metric', 'Phase 1', 'Phase 2', 'Overall'],
        ['Overall Status', 'CONDITIONAL PASS', 'CONDITIONAL PASS', 'CONDITIONAL PASS'],
        ['Total Findings', '22', '35', '57'],
        ['Critical Issues', '3', '3', '6'],
        ['High Severity', '6', '9', '15'],
        ['Medium Severity', '11', '14', '25'],
        ['Low Severity', '8', '9', '17'],
        ['Compliance Score', '78%', '87%', '82.5%']
    ]
    
    stats_table = Table(stats_data, colWidths=[3*cm, 3.5*cm, 3.5*cm, 3.5*cm])
    stats_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), HEADER_FILL),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('FONTNAME', (0, 0), (-1, 0), 'NotoSansSC-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('FONTNAME', (0, 1), (-1, -1), 'NotoSansSC'),
        ('FONTSIZE', (0, 1), (-1, -1), 9),
        ('BACKGROUND', (0, 1), (-1, -1), CARD_BG),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [CARD_BG, TABLE_STRIPE]),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(stats_table)
    elements.append(Spacer(1, 16))
    
    # Key Findings Summary
    elements.append(Paragraph("Key Findings Overview", styles['SubsectionHeading']))
    
    key_findings = """
    <b>Strengths Identified:</b> The platform demonstrates strong security foundations with well-structured 
    RBAC implementation (4-tier role hierarchy), comprehensive admission control via OPA/Gatekeeper 
    (9+ active policies), excellent TLS configuration (TLS 1.2/1.3 only, HSTS with 2-year max-age), 
    multi-layer DDoS protection with auto-mitigation capabilities, and enterprise-grade encryption 
    (AES-256-GCM with HSM-backed key management via HashiCorp Vault and Thales Luna FIPS 140-2 L3).
    Operational maturity is evident in world-class incident response playbooks (12 documented playbooks), 
    comprehensive escalation matrix with time-based auto-escalation, and thorough standard operating 
    procedures with RACI matrices.
    <br/><br/>
    <b>Critical Gaps Requiring Immediate Attention:</b> Three critical issues must be addressed before 
    production deployment: (1) Wazuh SIEM component running as root with SYS_ADMIN privilege escalation 
    enabled poses significant security risk; (2) All storage configured with local-path StorageClass 
    providing no data replication or high availability guarantees; (3) Placeholder secrets present in 
    version control repositories creating potential credential exposure risk. Additionally, the disaster 
    recovery posture is significantly underdeveloped with no formal RTO/RPO definitions, no DR site 
    documentation, and untested backup restoration procedures.
    <br/><br/>
    <b>Go/No-Go Recommendation:</b> <font color="#c05621"><b>CONDITIONAL GO</b></font> - The platform 
    may proceed to production deployment provided all Critical and High-priority findings are remediated 
    within the specified timelines. Estimated remediation effort: 40-80 hours for critical/high priority 
    items, with full compliance achievable within 6-8 weeks.
    """
    elements.append(Paragraph(key_findings.strip(), styles['BodyText']))
    
    return elements

def build_phase1_code_security(styles):
    """Build Phase 1 Code Quality & Security Basics section."""
    elements = []
    
    elements.append(PageBreak())
    elements.append(Paragraph("Phase 1: Code Quality & Security Basics", styles['SectionHeading']))
    elements.append(Spacer(1, 8))
    
    intro = """
    This section examines the application source code for security vulnerabilities, authentication 
    implementation quality, input validation practices, and secret management. The review covered 
    core security libraries including input-validation.ts, encryption-utils.ts, session-management.ts, 
    csrf-protection.ts, rate-limiter.ts, and authentication middleware components.
    """
    elements.append(Paragraph(intro.strip(), styles['BodyText']))
    elements.append(Spacer(1, 12))
    
    # Category A: Input Validation
    elements.append(Paragraph("A) Input Validation [WARN]", styles['SubsectionHeading']))
    
    findings_a = [
        ("A-001: HTML Sanitization Uses Regex-Based Parser [HIGH]", 
         "The sanitizeHTMLContent() function in src/lib/security/input-validation.ts (lines 513-557) "
         "uses regex-based HTML parsing which is fundamentally insecure. Regex cannot reliably parse HTML "
         "due to its context-sensitive nature, allowing potential bypass with malformed HTML, nested tags, "
         "or encoding tricks such as '&lt;scr&lt;script&gt;ipt&gt;' patterns.",
         "Replace regex-based sanitization with established library (DOMPurify for browser, sanitize-html "
         "or node-dompurify for Node.js server-side). Implement proper HTML parser (htmlparser2) with "
         "allowlist approach."),
        
        ("A-002: SQL Injection Detection Only, Not Prevention [MEDIUM]",
         "The detectSQLPatterns() function explicitly states it does NOT prevent SQL injection - it "
         "provides detection/logging only. Developers may incorrectly rely on this as prevention, "
         "creating false sense of security.",
         "Add prominent documentation that this is logging/detection only. Enforce ORM usage (Prisma "
         "is already in dependencies). Consider ESLint rule to flag raw SQL string concatenation."),
        
        ("A-003: Default MaxLength Excessively Permissive [MEDIUM]",
         "Default maxLength parameter set to 10,000 characters in validation functions could enable "
         "DoS through memory exhaustion in storage fields or bypass length-based validation in downstream systems.",
         "Reduce default to conservative value (1000-2000 characters). Require explicit opt-in for "
         "longer fields like textarea or JSON payloads.")
    ]
    
    for title, finding, recommendation in findings_a:
        elements.append(Paragraph(title, styles['FindingTitle']))
        elements.append(Paragraph(f"<b>Finding:</b> {finding}", styles['FindingDetail']))
        elements.append(Paragraph(f"<b>Recommendation:</b> {recommendation}", styles['FindingDetail']))
        elements.append(Spacer(1, 6))
    
    # Category B: Authentication & Authorization
    elements.append(Paragraph("B) Authentication & Authorization [WARN]", styles['SubsectionHeading']))
    
    findings_b = [
        ("B-001: Password Hashing Algorithm Below OWASP Recommendations [HIGH]",
         "Default password hashing uses PBKDF2-HMAC-SHA512 with 600,000 iterations. While acceptable, "
         "OWASP currently recommends Argon2id (primary) or bcrypt (acceptable alternative). The code "
         "acknowledges this but throws errors instead of implementing Argon2id.",
         "Install and implement argon2 package. Make Argon2id default algorithm with memory cost >=64MB, "
         "parallelism >=2, iterations >=3."),
        
        ("B-002: JWT Implementation Lacks Key Rotation Support [HIGH]",
         "Custom TokenGenerator class lacks Key ID (kid) field for key rotation, token revocation list/"
         "blackboard support, issuer (iss) claim validation, and audience (aud) claim validation. Cannot "
         "rotate compromised keys without invalidating all tokens.",
         "Add kid header for key rotation support. Add iss and aud claims. Implement token blacklist in Redis. "
         "Consider migrating to mature JWT library (jose or jsonwebtoken)."),
        
        ("B-003: Session Storage Uses In-Memory Map [MEDIUM]",
         "Session storage uses JavaScript Map which loses sessions on process restart, doesn't scale "
         "horizontally, has memory leak potential if cleanup fails, and is unsuitable for production.",
         "Use Redis for session storage (ioredis dependency exists). Implement session serialization. "
         "Add graceful shutdown handling.")
    ]
    
    for title, finding, recommendation in findings_b:
        elements.append(Paragraph(title, styles['FindingTitle']))
        elements.append(Paragraph(f"<b>Finding:</b> {finding}", styles['FindingDetail']))
        elements.append(Paragraph(f"<b>Recommendation:</b> {recommendation}", styles['FindingDetail']))
        elements.append(Spacer(1, 6))
    
    # Category C: Security Headers & CSRF
    elements.append(Paragraph("C) Security Headers & CSRF Protection [PASS]", styles['SubsectionHeading']))
    
    csrf_text = """
    CSRF protection implementation is well-designed following OWASP guidelines: HMAC-SHA256 token signing "
     "with timing-safe comparison, token expiration enforcement, synchronized token pattern available, "
     "one-time token option for APIs, SameSite=Strict cookie attribute, and Secure flag on cookies. CSP "
     "nonce generation method exists but integration into middleware should be verified. CORS configuration "
     "via environment variable is properly implemented.
    """
    elements.append(Paragraph(csrf_text.strip(), styles['BodyText']))
    
    # Category D: Code Quality
    elements.append(Paragraph("D) Code Quality [WARN]", styles['SubsectionHeading']))
    
    findings_d = [
        ("D-001: Error Details Leaked in Non-Production [HIGH]",
         "Decryption errors expose details when not in production environment. If NODE_ENV misconfigured, "
         "production may leak sensitive cryptographic error information.",
         "Always log full error to secure logging system. Return generic error regardless of environment."),
        
        ("D-002: Typo in Session Management Code [MEDIUM]",
         "Line 410 of session-management.ts contains typo 'sameCode' instead of 'sameSite' causing "
         "runtime crash when generating Set-Cookie header for sessions.",
         "Fix typo immediately - 5 minute fix preventing potential outage.")
    ]
    
    for title, finding, recommendation in findings_d:
        elements.append(Paragraph(title, styles['FindingTitle']))
        elements.append(Paragraph(f"<b>Finding:</b> {finding}", styles['FindingDetail']))
        elements.append(Paragraph(f"<b>Recommendation:</b> {recommendation}", styles['FindingDetail']))
        elements.append(Spacer(1, 6))
    
    # Category E: Secret Management
    elements.append(Paragraph("E) Secret Management [WARN]", styles['SubsectionHeading']))
    
    findings_e = [
        ("E-001: Placeholder Secrets in .env.example Are Guessable [HIGH]",
         "Example secrets use predictable patterns like 'your-jwt-secret-here-minimum-32-characters-long'. "
         "Developers may copy these directly to .env.local. Automated scanners detect these patterns.",
         "Use empty values with clear comments. Add pre-commit hook to reject known placeholder values."),
        
        ("E-002: Encryption Key Stored as Class Property [HIGH]",
         "Encryption key stored using type assertion '(this as any).key = config.key' bypasses TypeScript "
         "checks, accessible via reflection/debugging, and prevents secure memory zeroing.",
         "Use private field with proper typing. Consider Node.js crypto KeyObject for secure handling.")
    ]
    
    for title, finding, recommendation in findings_e:
        elements.append(Paragraph(title, styles['FindingTitle']))
        elements.append(Paragraph(f"<b>Finding:</b> {finding}", styles['FindingDetail']))
        elements.append(Paragraph(f"<b>Recommendation:</b> {recommendation}", styles['FindingDetail']))
        elements.append(Spacer(1, 6))
    
    # Positive Findings
    elements.append(Paragraph("Positive Security Strengths", styles['SubsectionHeading']))
    
    positives = """
    The platform demonstrates several commendable security practices: Comprehensive telecom-specific "
    "input validation with ANRT-compliant IMSI/MSISDN masking; SSRF prevention blocking internal IPs "
     "and cloud metadata endpoints; Multi-algorithm Redis-backed rate limiting with role-based limits "
     "(stricter for auth endpoints: 5/15min login, 5/5min MFA); Password security with constant-time "
     "comparison, salt generation, and rehash detection; PII protection with dedicated anonymization "
     "salt and fail-fast in production mode; Docker security with non-root user, multi-stage builds, "
     "and health checks properly configured.
    """
    elements.append(Paragraph(positives.strip(), styles['BodyText']))
    
    return elements

def build_phase1_configuration(styles):
    """Build Phase 1 Configuration & Infrastructure section."""
    elements = []
    
    elements.append(PageBreak())
    elements.append(Paragraph("Phase 1: Configuration & Infrastructure", styles['SectionHeading']))
    elements.append(Spacer(1, 8))
    
    intro = """
    This section evaluates Kubernetes deployment manifests, network configuration, storage persistence, "
    "configuration management, scaling policies, and web server hardening. The review covered base and "
     "production K8s configurations across 22 YAML files totaling over 3,000 lines of infrastructure-as-code.
    """
    elements.append(Paragraph(intro.strip(), styles['BodyText']))
    elements.append(Spacer(1, 12))
    
    # Critical Findings Table
    elements.append(Paragraph("Critical Infrastructure Findings", styles['SubsectionHeading']))
    
    crit_data = [
        ['ID', 'Category', 'Severity', 'Issue', 'Impact'],
        ['CF-01', 'Deployment', 'CRITICAL', 'Wazuh running as root with SYS_ADMIN', 'Privilege escalation'],
        ['CF-02', 'Storage', 'CRITICAL', 'local-path storage class everywhere', 'Data loss on node failure'],
        ['CF-03', 'Secrets', 'CRITICAL', 'Placeholder secrets in repo', 'Credential exposure'],
        ['WH-01', 'Deployment', 'HIGH', 'No imagePullSecrets configured', 'Registry auth failure'],
        ['WH-02', 'Storage', 'HIGH', 'No automated backup solution', 'No recovery capability'],
        ['WH-03', 'Storage', 'HIGH', 'ReadWriteOnly limits scalability', 'Cannot share logs/PCAPs'],
    ]
    
    crit_table = Table(crit_data, colWidths=[1.5*cm, 2*cm, 2*cm, 5*cm, 3.5*cm])
    crit_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), HEADER_FILL),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('FONTNAME', (0, 0), (-1, 0), 'NotoSansSC-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 8),
        ('FONTNAME', (0, 1), (-1, -1), 'NotoSansSC'),
        ('FONTSIZE', (0, 1), (-1, -1), 7),
        ('BACKGROUND', (0, 1), (-1, -1), CARD_BG),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [CARD_BG, TABLE_STRIPE]),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        # Color-code severity column
        ('TEXTCOLOR', (2, 1), (2, 3), SEM_ERROR),
        ('TEXTCOLOR', (2, 4), (2, 6), SEM_WARNING),
    ]))
    elements.append(crit_table)
    elements.append(Spacer(1, 16))
    
    # Detailed Categories
    elements.append(Paragraph("A) Kubernetes Deployment Readiness [WARN]", styles['SubsectionHeading']))
    
    deploy_text = """
    <b>Resource Limits:</b> Inconsistent allocation between base (cpu: 2-4, memory: 4Gi-8Gi) and production "
    "(cpu: 500m-2, memory: 512Mi-2Gi) deployments. Production appears underestimated for National SOC workload.<br/><br/>"
    "<b>Health Checks:</b> Comprehensive probe configuration with liveness (30s/15s/5s), readiness (10s/10s/5s), "
    "and startup probes (10s/5s/30 failures) properly implemented across all critical deployments.<br/><br/>"
    "<b>Pod Disruption Budgets:</b> Excellent coverage - SOC API minAvailable: 2 (67% of 3 replicas), Kong: 1 (50%), "
    "Elasticsearch/Kafka/ZooKeeper: 2 (quorum maintenance).<br/><br/>"
    "<b>Security Context Issue:</b> Wazuh Manager running as root (runAsUser: 0) with allowPrivilegeEscalation: true "
    "and SYS_ADMIN capability - CRITICAL violation requiring immediate remediation or documented exception approval.
    """
    elements.append(Paragraph(deploy_text, styles['BodyText']))
    
    elements.append(Paragraph("B) Network Configuration [PASS]", styles['SubsectionHeading']))
    
    network_text = """
    <b>TLS Configuration:</b> Excellent - TLS 1.2+ only with strong cipher suites (ECDHE+AES-256-GCM), OCSP "
    "stapling enabled, HSTS max-age=63072000 (2 years)+preload, cert-manager integration for automatic certificate "
    "management across 10 subdomains (soc.djezzy.dz, api.*, grafana.*, siem.*, soar.*, ti.*, vuln.*, edr.*, "
    "opencti.*, nsm.*).<br/><br/>"
    "<b>Network Policies:</b> Zero-trust architecture with default-deny-all for ALL namespaces (ingress+egress). "
    "Explicit allow rules for legitimate traffic flows. Namespace isolation: soc-frontend, soc-backend, soc-events, "
    "soc-monitoring, soc-ss7. Database access control restricting PostgreSQL/Elasticsearch/Redis to specific pods only."
    """
    elements.append(Paragraph(network_text, styles['BodyText']))
    
    elements.append(Paragraph("C) Storage & Persistence [FAIL]", styles['SubsectionHeading']))
    
    storage_text = """
    <b>Critical Issue:</b> All 18 PVCs use local-path StorageClass with ReadWriteOnce access mode. Problems include: "
    "no data replication (node failure=data loss), no multi-zone support (violates HA requirements), manual provisioning, "
    "no snapshot/backup integration. Total storage ~4.5Ti (PostgreSQL 500Gi+200Gi backup, Elasticsearch 1Ti, Arkime PCAPs 2Ti, "
    "Zeek logs 200Gi, Prometheus 200Gi).<br/><br/>"
    "<b>Backup Gap:</b> Backup PVC exists (200Gi) but no Velero/Restic configuration, no CronJob for database dumps, "
    "no retention policy defined, no off-site replication. ANRT compliance typically requires 7-year retention for "
    "telecommunications data.<br/><br/>"
    "<b>Recommendation:</b> Migrate to Ceph-RBD/GP3/Premium-SSD storage classes. Implement Velero for K8s backups. "
    "Configure PostgreSQL WAL archiving to object storage. Define RPO<1hr, RTO<4hr targets.
    """
    elements.append(Paragraph(storage_text, styles['BodyText']))
    
    elements.append(Paragraph("D) Scaling & Availability [PASS]", styles['SubsectionHeading']))
    
    scaling_text = """
    <b>HPA Configuration:</b> Comprehensive autoscaling with component-specific targets: SOC API (3-10 replicas, "
    "CPU 70%/Memory 80%), Kong (2-6, CPU 60%/Memory 75%), Cortex (1-5, CPU 70%/Memory 85%), Suricata (2-6, CPU 60%). "
    "Stabilization windows: scale-down 300s. Custom metrics for Kafka consumer lag (SS7 analyzer).<br/><br/>"
    "<b>Load Balancing:</b> Proper architecture - External: NGINX Ingress Controller -> Kong API Gateway. Internal: "
    "ClusterIP services. Headless services for StatefulSets (Kafka, Zookeeper). Session affinity for SSE connections.<br/><br/>"
    "<b>Gap:</b> No topologySpreadConstraints for zone-aware scheduling. Only preferred (soft) podAntiAffinity configured.
    """
    elements.append(Paragraph(scaling_text, styles['BodyText']))
    
    elements.append(Paragraph("E) Web Server Configuration [WARN]", styles['SubsectionHeading']))
    
    webserver_text = """
    "<b>Nginx (Excellent):</b> SSL/TLS 1.2+ with strong ciphers, OCSP stapling, complete security headers "
    "(HSTS, X-Frame-Options, CSP), server_tokens off, sensitive file blocking (.env,.git,.conf), JSON logging for ELK "
    "integration, multi-layer rate limiting zones (general 10r/s, api 30r/s, auth 5r/s, sse 5 connections).<br/><br/>"
    "<b>Caddy (Incomplete):</b> File truncated/incomplete (starts with ':81 {'). No TLS config, no security headers, "
    "no rate limiting visible. Requires completion or removal if Nginx-only architecture intended.<br/><br/>"
    "<b>Static Assets:</b> Optimal caching - /_next/static/* public immutable 365 days, /public/* 24 hours, /api/* "
    "no-store. Gzip level 6 enabled. Next.js output: standalone with source maps disabled in production.
    """
    elements.append(Paragraph(webserver_text, styles['BodyText']))
    
    return elements

def build_phase2_advanced_security(styles):
    """Build Phase 2 Advanced Security Review section."""
    elements = []
    
    elements.append(PageBreak())
    elements.append(Paragraph("Phase 2: Advanced Security Review", styles['SectionHeading']))
    elements.append(Spacer(1, 8))
    
    intro = """
    This section performs deep-dive security analysis examining RBAC implementation, network segmentation, "
    "pod security standards, admission controls, audit logging, DDoS protection, data encryption, and vulnerability "
    "management. Overall security posture assessed at 90.5% meeting government-grade standards with minor improvements required.
    """
    elements.append(Paragraph(intro.strip(), styles['BodyText']))
    elements.append(Spacer(1, 12))
    
    # Score Summary Table
    score_data = [
        ['Security Domain', 'Score', 'Status', 'Key Gap'],
        ['RBAC & Access Control', '92%', 'PASS', 'ResourceFieldSelector syntax issue'],
        ['Network Security', '85%', 'WARN', 'mTLS not active, permissive egress'],
        ['Pod Security', '94%', 'PASS', 'Deprecated PSP API (v1beta1)'],
        ['Admission Control', '96%', 'PASS', 'None critical'],
        ['Audit & Compliance', '91%', 'PASS', 'Placeholder CA_BUNDLE in audit policy'],
        ['DDoS & Edge Protection', '93%', 'PASS', 'CSP unsafe-inline in CDN rules'],
        ['Data Protection', '95%', 'PASS', 'Redis in-transit only (note)'],
        ['Vulnerability Mgmt', '78%', 'WARN', 'Static DB, mock dependencies, no image scanning'],
    ]
    
    score_table = Table(score_data, colWidths=[4*cm, 2*cm, 2*cm, 6*cm])
    score_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), HEADER_FILL),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('ALIGN', (1, 1), (2, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('FONTNAME', (0, 0), (-1, 0), 'NotoSansSC-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 9),
        ('FONTNAME', (0, 1), (-1, -1), 'NotoSansSC'),
        ('FONTSIZE', (0, 1), (-1, -1), 8),
        ('BACKGROUND', (0, 1), (-1, -1), CARD_BG),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [CARD_BG, TABLE_STRIPE]),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(score_table)
    elements.append(Spacer(1, 16))
    
    # RBAC Details
    elements.append(Paragraph("A) RBAC & Access Control [PASS - 92%]", styles['SubsectionHeading']))
    
    rbac_text = """
    <b>Strengths:</b> Well-structured 4-tier role hierarchy: djezzy-soc-analyst (read-mostly, limited write), "
    "djezzy-soc-engineer (extended access for remediation, no cluster-wide admin), djezzy-soc-admin (full namespace "
    "access, requires MFA+approval annotations), djezzy-soc-auditor (read-only audit access). Service account hardening "
    "with automountServiceAccountToken: false where not needed. SA quotas enforced (backend:20, frontend:10, events:15, "
    "monitoring:10). Group-based bindings via OIDC for corporate identity integration.<br/><br/>"
    "<b>Issues:</b> ResourceFieldSelector syntax issue in engineer secret access rule (line 77-79 rbac.yaml) uses non-standard "
    "syntax that won't work in K8s [P1-High]. Auditor role has broad secret read access without justification logging [P2-Medium].
    """
    elements.append(Paragraph(rbac_text, styles['BodyText']))
    
    # Network Security Details
    elements.append(Paragraph("B) Network Security [WARN - 85%]", styles['SubsectionHeading']))
    
    net_text = """
    "<b>Strengths:</b> Default-deny-all policy for both ingress and egress. Zero Trust architecture with explicit allow rules. "
    "Database network isolation (PostgreSQL/Elasticsearch/Redis accept from specific pods only). Auth service restricted to "
    "LDAPS (port 636) only. Monitoring namespace isolated.<br/><br/>"
    "<b>Critical Gap:</b> mTLS configuration commented out/reference only in Calico GlobalNetworkPolicy. East-West traffic "
    "may be unencrypted between pods [P1-Critical]. Egress gateway allows all outbound traffic (line 544: egress: [{}]) - should "
    "implement egress filtering [P2-High]. No explicit network policy for monitoring namespace egress [P3-Medium]."
    """
    elements.append(Paragraph(net_text, styles['BodyText']))
    
    # Pod Security Details
    elements.append(Paragraph("C) Pod Security Standards [PASS - 94%]", styles['SubsectionHeading']))
    
    psp_text = """
    "<b>Excellent Implementation:</b> Pod Security Standards labels at namespace level (baseline+restricted). MustRunAsNonRoot "
    "enforced. readOnlyRootFilesystem: true for all policies. requiredDropCapabilities: ALL with selective allow. hostNetwork/"
    "hostPID/hostIPC: false explicitly denied. ValidatingAdmissionPolicy (K8s 1.28+) with CEL expressions. Seccomp/AppArmor profiles "
    "set to runtime/default.<br/><br/>"
    "<b>Active Constraints (Gatekeeper OPA):</b> require-security-labels, deny-privileged-containers, require-non-root-users, "
    "require-readonly-filesystem, deny-host-namespaces, allowed-image-repositories (whitelist), reject-latest-tag, require-resource-limits, "
    "block-default-namespace. Allowed registries: registry.djezzy.local, harbor.djezzy.dz, ghcr.io/djezzy-soc/, gcr.io/djezzy-soc-prod/.<br/><br/>"
    "<b>Issue:</b> PSP using deprecated policy/v1beta1 API (removed in K8s 1.25+) - migrate to PSA [P2-Medium]. SELinux RunAsAny should be more restrictive [P3-Low].
    """
    elements.append(Paragraph(psp_text, styles['BodyText']))
    
    # Data Protection Details  
    elements.append(Paragraph("G) Data Protection [PASS - 95%]", styles['SubsectionHeading']))
    
    data_text = """
    "<b>Enterprise-Grade Encryption:</b> AES-256-GCM throughout. HashiCorp Vault integration for key management. HSM (Thales Luna) "
    "for root keys - FIPS 140-2 Level 3 certified. Automatic key rotation - 90-day interval for DEKs. PostgreSQL TDE with column-level "
    "encryption for PII. Kafka topic encryption with per-topic keys. ETCD encryption for K8s secrets. Application-layer field encryption "
    "with Google Tink. Tokenization engine for subscriber data. Backup encryption with separate backup keys.<br/><br/>"
    "<b>Data Localization:</b> Algeria-only storage enforced per ARTP requirements. PII anonymization module with SHA-256 salted hashing "
    "(anonymizeIP, anonymizeEmail, anonymizePhoneNumber, anonymizeName, anonymizePII functions). Emergency key compromise procedure: 15-minute "
    "response time requirement with immediate revocation via Vault.
    """
    elements.append(Paragraph(data_text, styles['BodyText']))
    
    # Vulnerability Management Details
    elements.append(Paragraph("H) Vulnerability Management [WARN - 78%]", styles['SubsectionHeading']))
    
    vuln_text = """
    "<b>Current Capabilities:</b> VulnerabilityScanner class with CVSS v3.1 scoring. SARIF report generation for CI/CD integration. "
    "SecurityConfigChecker for runtime validation. Dependency scanning with version comparison. Environment checks (secrets, headers, auth, "
    "sessions).<br/><br/>"
    "<b>Critical Gaps:</b> Hardcoded KNOWN_VULNERABILITIES array (not live NVD feed) [P1-Critical]. getDependencies() returns static "
    "mock data, not actual package file parsing [P1-Critical]. No container image scanning (Trivy/Grype) configured [P2-High]. No SBOM "
    "(Software Bill of Materials) generation (CycloneDX/SPDX) [P3-Medium]. No automated patch management workflow (Dependabot/Renovate) "
    "[P3-Medium].<br/><br/>"
    "<b>Recommended Integrations:</b> Trivy (container scanning), Grype (vulnerability DB lookup), Dependabot (auto-updates), Syft (SBOM), "
    "OSV-Scanner (Google OSS vulnerability database).
    """
    elements.append(Paragraph(vuln_text, styles['BodyText']))
    
    return elements

def build_phase2_performance(styles):
    """Build Phase 2 Performance & Scalability section."""
    elements = []
    
    elements.append(PageBreak())
    elements.append(Paragraph("Phase 2: Performance & Scalability", styles['SectionHeading']))
    elements.append(Spacer(1, 8))
    
    intro = """
    This section analyzes caching architecture, database performance tuning, message queue configuration, API optimization, "
    "frontend performance, load testing evidence, resource management, and scalability patterns. Overall assessment: 86.65% - "
    "APPROVED FOR PRODUCTION DEPLOYMENT with conditions.
    """
    elements.append(Paragraph(intro.strip(), styles['BodyText']))
    elements.append(Spacer(1, 12))
    
    # Performance Scores Table
    perf_data = [
        ['Performance Area', 'Score', 'Status', 'Key Metric'],
        ['Caching Architecture', '92%', 'PASS', 'Target: 95%+ hit rate, <5ms latency'],
        ['Database Performance', '90%', 'PASS', 'shared_buffers: 16GB, autovacuum tuned'],
        ['Message Queue (Kafka)', '88%', 'PASS', '500K EPS target, 96 partitions'],
        ['API Performance', '82%', 'WARN', 'P95<200ms, P99<500ms defined'],
        ['Frontend Optimization', '89%', 'PASS', 'Code splitting, bundle <500KB'],
        ['Load Testing Evidence', '85%', 'PASS', 'k6 + Locust scripts ready'],
        ['Resource Management', '87%', 'PASS', 'Connection pools, GC monitoring'],
        ['Scalability Patterns', '80%', 'WARN', 'Stateless, sharding function ready'],
    ]
    
    perf_table = Table(perf_data, colWidths=[4*cm, 2*cm, 2*cm, 6*cm])
    perf_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), HEADER_FILL),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('ALIGN', (1, 1), (2, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('FONTNAME', (0, 0), (-1, 0), 'NotoSansSC-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 9),
        ('FONTNAME', (0, 1), (-1, -1), 'NotoSansSC'),
        ('FONTSIZE', (0, 1), (-1, -1), 8),
        ('BACKGROUND', (0, 1), (-1, -1), CARD_BG),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [CARD_BG, TABLE_STRIPE]),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(perf_table)
    elements.append(Spacer(1, 16))
    
    # Caching Architecture
    elements.append(Paragraph("A) Multi-Layer Caching Architecture [PASS - 92%]", styles['SubsectionHeading']))
    
    cache_text = """
    "<b>Four-Tier Strategy:</b> L1 Browser (Service Worker, 60s-24h TTL) -> L2 CDN (Cloudflare edge, 5min-30days) -> "
    "L3 Redis Cluster (distributed, 6 nodes x 32GB = 192GB total, 30s-24h by type) -> L4 Database (PostgreSQL query cache, 16GB shared_buffers). "
    "Target: 95%+ hit rate, <5ms average read latency.<br/><br/>"
    "<b>Invalidation Strategies:</b> Immediate Pub/Sub (alerts, incidents, permissions), Time-based TTL (metrics snapshots), "
    "Version-based (dashboard widgets, reports), Tag-based (related alerts, timeline). Stale-While-Revalidate enabled across all layers.<br/><br/>"
    "<b>Session Management:</b> Distributed via Redis cluster with CSPRNG session IDs, absolute timeout (8h) + idle timeout (30m), "
    "concurrent session limiting (default: 5), IP/User-Agent binding option, graceful cleanup.
    """
    elements.append(Paragraph(cache_text, styles['BodyText']))
    
    # Database Performance
    elements.append(Paragraph("B) Database Performance [PASS - 90%]", styles['SubsectionHeading']))
    
    db_text = """
    "<b>PostgreSQL Tuning (Enterprise-grade):</b> shared_buffers: 16GB (25% RAM), effective_cache_size: 48GB (75%), work_mem: 256MB, "
    "maintenance_work_mem: 2GB, max_connections: 500 (with PgBouncer), wal_level: replica, checkpoint_completion_target: 0.9, "
    "random_page_cost: 1.1 (SSD-optimized). Autovacuum: 6 workers, 30s naptime, aggressive scale factors (0.05 vacuum, 0.02 analyze).<br/><br/>"
    "<b>Index Strategy:</b> B-tree (equality/sorting), composite (common queries), partial (active data only), GIN (JSONB custom_fields), "
    "BRIN (time-series, extremely space-efficient). Partitioned tables: security_events (daily/monthly, 50B rows/year expected), cdr_records "
    "(monthly, 80B rows/year). Materialized views for dashboard aggregation.<br/><br/>"
    "<b>Connection Pooling:</b> PgBouncer configured - transaction mode, pool_size: 100, reserve_pool: 50, max_client_conn: 5000, "
    "query_timeout: 30s. Application-side pool: maxConnections: 20, health checks every 30s, retry with exponential backoff.
    """
    elements.append(Paragraph(db_text, styles['BodyText']))
    
    # Kafka/Messaging
    elements.append(Paragraph("C) Message Queue & Streaming [PASS - 88%]", styles['SubsectionHeading']))
    
    kafka_text = """
    "<b>Kafka Configuration (500K EPS Target):</b> num.partitions: 48 default / 96 events topic, replication.factor: 3, "
    "min.insync.replicas: 2, batch.size: 64KB, linger.ms: 5ms, compression.type: lz4, acks: all (strong durability). "
    "Idempotent producer enabled. Unclean leader election disabled.<br/><br/>"
    "<b>Consumer Groups:</b> Cooperative sticky assignor for balanced partition assignment. session.timeout.ms: 15000, "
    "heartbeat.interval.ms: 5000, max.poll.records: 1000. Custom metrics for Kafka consumer lag in HPA (SS7 analyzer).<br/><br/>"
    "<b>Gap:</b> Backpressure handling incomplete in kafka-client.ts - implement explicit graceful degradation when Kafka overloaded [C001-Critical].
    """
    elements.append(Paragraph(kafka_text, styles['BodyText']))
    
    # Frontend Optimization
    elements.append(Paragraph("E) Frontend Optimization [PASS - 89%]", styles['SubsectionHeading']))
    
    fe_text = """
    "<b>Code Splitting:</b> Route-based lazy loading for all major routes (dashboard, alerts, incidents high priority; analytics medium; "
    "compliance, settings low). Component-level lazy loading with loading states for 12+ heavy components (ThreatTrendChart, EventsTimeline, "
    "GeoHeatmap, NetworkTopology, IncidentPlaybookRunner, etc.). Intersection Observer-based prefetching.<br/><br/>"
    "<b>Image Pipeline:</b> Next.js Image with AVIF/WebP format detection, responsive srcset, blur placeholders, domain validation. "
    "Bundle analysis: threshold enforcement (500KB total gzipped, 100KB/chunk, 150KB vendor). Package alternatives identified: moment->date-fns "
    "(80% savings), lodash->lodash-es (60%), @ant-design/icons->lucide-react (90%).<br/><br/>"
    "<b>Core Web Vitals:</b> Full tracking (LCP, FID, CLS, INP, TTFB) with thresholds: LCP good<2500ms, FID good<100ms, CLS good<0.1, "
    "INP good<200ms, TTFB good<800ms. Automated reporting via sendBeacon.
    """
    elements.append(Paragraph(fe_text, styles['BodyText']))
    
    # Capacity Planning
    elements.append(Paragraph("Capacity Planning Guidance", styles['SubsectionHeading']))
    
    capacity_data = [
        ['Resource', 'Current', 'Target Scale', 'Headroom', 'Scaling Action'],
        ['App Servers', '5 instances', '20 instances', '4x ready', 'HPA 5-30 replicas'],
        ['PostgreSQL', '64GB RAM/32 cores', '128GB/64 cores', '2x only', 'Add read replicas'],
        ['Redis Cluster', '192GB (6x32GB)', '384GB (12x32GB)', '2x ready', 'Scale horizontally'],
        ['Elasticsearch', '3x64GB nodes', '9x64GB nodes', '3x ready', 'Add data nodes'],
        ['Kafka', '3 brokers', '9 brokers', '3x ready', 'Increase partitions'],
        ['CDN', 'Cloudflare Enterprise', 'Same', 'Unlimited', 'Optimize cache TTLs'],
    ]
    
    cap_table = Table(capacity_data, colWidths=[3*cm, 3*cm, 3*cm, 2.5*cm, 3.5*cm])
    cap_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), ACCENT),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('FONTNAME', (0, 0), (-1, 0), 'NotoSansSC-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 8),
        ('FONTNAME', (0, 1), (-1, -1), 'NotoSansSC'),
        ('FONTSIZE', (0, 1), (-1, -1), 8),
        ('BACKGROUND', (0, 1), (-1, -1), CARD_BG),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [CARD_BG, TABLE_STRIPE]),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(cap_table)
    
    return elements

def build_phase2_monitoring(styles):
    """Build Phase 2 Monitoring & Operations section."""
    elements = []
    
    elements.append(PageBreak())
    elements.append(Paragraph("Phase 2: Monitoring & Operations", styles['SectionHeading']))
    elements.append(Spacer(1, 8))
    
    intro = """
    This section evaluates monitoring stack completeness, logging strategy, alerting and incident response procedures, "
    "health check implementation, operational documentation, reporting automation, Helm chart maturity, and disaster "
    "readiness. Overall operational maturity: 3.8/5 (Developing -> Defined). Status: CONDITIONAL PASS (76%).
    """
    elements.append(Paragraph(intro.strip(), styles['BodyText']))
    elements.append(Spacer(1, 12))
    
    # Monitoring Stack
    elements.append(Paragraph("A) Monitoring Stack [PASS - 85%]", styles['SubsectionHeading']))
    
    mon_text = """
    "<b>Prometheus Configuration (Comprehensive):</b> 8 scrape jobs covering SOC platform, Node Exporter, PostgreSQL, Redis, "
    "Nginx Ingress, Kubernetes API, Nodes, Pods. Remote write to Thanos for long-term retention. Dual Alertmanager setup "
    "(primary+backup) for HA. TLS-secured scraping with CA verification.<br/><br/>"
    "<b>Alert Rules (20+ rules, 7 categories):</b> soc_platform_health (uptime, degradation, error rates), "
    "soc_platform_performance (response times, DB queries), soc_platform_resources (memory, CPU, disk), soc_platform_sse "
    "(real-time connections), soc_platform_security (auth, traffic, SSL), telecom_alerts (SS7, GTP, fraud, risk), "
    "sla_alerts (availability, incident SLA). PagerDuty integration for automatic paging.<br/><br/>"
    "<b>Grafana Dashboard:</b> System Health Score gauge, Request Rate timeseries, API Response Time P95/P99 stacked area, "
    "Active Incidents/Alerts/SSE Connections/Error Rate stat panels, Memory Usage & CPU Load timeseries. 10-second refresh, "
    "Africa/Algiers timezone.<br/><br/>"
    "<b>Gap:</b> Metrics API (/api/metrics) returns demo data, not live Prometheus metrics [MON-001-High]. No custom business metrics "
    "(alerts processed/sec, MTTR tracking) [MON-002-Medium].
    """
    elements.append(Paragraph(mon_text, styles['BodyText']))
    
    # Logging
    elements.append(Paragraph("B) Logging Strategy [WARN - 65%]", styles['SubsectionHeading']))
    
    log_text = """
    "<b>Strengths:</b> Secure error handler with comprehensive sensitive key redaction (password, token, apiKey, authorization, "
    "cookie, creditCard, ssn, email, phone, address, ip). Unique request ID generation for distributed tracing. Environment-aware "
    "logging (full stack in dev, sanitized in prod). Consistent JSON structured log format. Production config: LOG_LEVEL=info, "
    "LOG_FORMAT=json, ELASTICSEARCH_URL configured.<br/><br/>"
    "<b>Gaps:</b> Centralized logging architecture referenced but not verified - ELK/Loki deployment needed [LOG-001-High]. "
    "No log shipping daemon (Fluentd/Filebeat) sidecar defined [LOG-002-Medium]. No log level rotation or archival automation "
    "[LOG-003-Medium]. Health endpoint uses console.error instead of structured logger [LOG-004-Low].
    """
    elements.append(Paragraph(log_text, styles['BodyText']))
    
    # Alerting & IR
    elements.append(Paragraph("C) Alerting & Incident Response [PASS - 88%]", styles['SubsectionHeading']))
    
    ir_text = """
    "<b>Escalation Matrix (World-Class):</b> Authority matrix with 6 tiers (T1-T3, Manager, Commander, CISO). Decision rights clearly "
    "defined (close FP, block IP, notify ministry, declare major incident). Time-based auto-escalation: SEV-0 (+15min Commander, +30min CISO, "
    "+60min Ministry), SEV-1 (+30min Commander, +1hr Director, +2hrs CISO).<br/><br/>"
    "<b>Incident Response Playbooks (12 documented):</b> PB-001 Ransomware Response (5-phase decision tree), PB-002 Phishing Investigation "
    "(artifact collection/enrichment), PB-003 Compromised Account (quick reference card + detailed), plus 9 additional indexed playbooks. "
    "SLA targets: Critical <15min, High <30min, Medium <60min, Low <4hrs.<br/><br/>"
    "<b>Gaps:</b> Contact names are placeholders '[Name]' [ALT-001-Medium]. No integration test for alert delivery to PagerDuty "
    "[ALT-002-Medium]. Post-incident review timeline not enforced [ALT-003-Low].
    """
    elements.append(Paragraph(ir_text, styles['BodyText']))
    
    # Disaster Recovery (Critical Gap)
    elements.append(Paragraph("H) Disaster Recovery [FAIL - 55%]", styles['SubsectionHeading']))
    
    dr_text = """
    "<b>CRITICAL GAP - Most Significant Finding in Entire Audit:</b><br/><br/>"
    "<b>DR-001 [CRITICAL]:</b> No formal RTO/RPO document with targets per system. Cannot guarantee recovery capabilities. "
    "Recommend defining: RTO<1hr critical systems, RPO<15min; RTO<4hr standard systems, RPO<1hr.<br/><br/>"
    "<b>DR-002 [CRITICAL]:</b> No DR site or failover documentation. Single point of failure for national infrastructure. "
    "Secondary region/site failover runbook urgently needed.<br/><br/>"
    "<b>DR-003 [CRITICAL]:</b> No tested backup restore procedures. Storage allocated (1Ti NFS backup PVC) but no verification "
    "procedure exists. Backups may be useless without testing.<br/><br/>"
    "<b>Additional DR Gaps:</b> No database replication/failover configuration documented [DR-004-High]. No incident command center "
    "activation procedure [DR-005-Medium]. No communication plan for extended outages [DR-006-Medium].<br/><br/>"
    "<b>Recommended Actions:</b> Create formal DR policy document (2 days). Document secondary region failover (3-5 days). "
    "Execute quarterly restore tests (2 days). Schedule DR drills within 30 days of go-live.
    """
    elements.append(Paragraph(dr_text, styles['BodyText']))
    
    # Operational Procedures
    elements.append(Paragraph("E) Operational Procedures [PASS - 90%]", styles['SubsectionHeading']))
    
    ops_text = """
    "<b>SOPs (Enterprise Grade):</b> Full organizational structure with RACI matrix. Role definitions (Tier 1-3, Shift Lead, "
    "IR Manager, Director). Shift start/end procedures with checklists. Incident lifecycle: Detection -> Triage -> Containment -> "
    "Eradication -> Recovery -> Lessons Learned. Quality metrics: >95% triage accuracy, >98% SLA compliance.<br/><br/>"
    "<b>Shift Handover (Thorough):</b> 2-hour overlap periods. Standardized 15-20 minute meeting agenda. Complete handover report template. "
    "Quick reference card for verbal handovers. Special scenarios: Major incident, incomplete investigations, difficult situations.<br/><br/>"
    "<b>Deployment Guide (Complete):</b> 4 options (script, compose, kubectl, helm). Pre-deployment checklist (14 items). Security "
    "configuration (secrets, TLS, network policies). Resource recommendations with scaling guidelines. Rollback procedures for all methods.
    """
    elements.append(Paragraph(ops_text, styles['BodyText']))
    
    # Reporting
    elements.append(Paragraph("F) Reporting & Compliance [PASS - 80%]", styles['SubsectionHeading']))
    
    rpt_text = """
    "<b>Report Generator (Architecturally Sound):</b> 5 types - Daily Operational (06:00), Weekly Executive (08:00 Mondays), "
    "Monthly Compliance (1st of month), Monthly Incident Stats (07:30 1st), Quarterly Board (Quarter start). Output formats: PDF, CSV, "
    "HTML, JSON. Singleton pattern with caching (100 entries, 24hr TTL). Template registry for extensibility.<br/><br/>"
    "<b>Distribution (Multi-channel):</b> Email (attachments, HTML body), Slack (block kit formatting, file upload), Webhook (custom payloads). "
    "Cron expression parser with run history tracking.<br/><br/>"
    "<b>Critical Gap:</b> Report data source is mock/random, NOT actual database queries [RPT-001-Critical]. Compliance reports will be fictional "
    "until connected to real data sources. Email/Slack distribution simulated, not integrated [RPT-002-High].
    """
    elements.append(Paragraph(rpt_text, styles['BodyText']))
    
    return elements

def build_remediation_matrix(styles):
    """Build consolidated remediation matrix."""
    elements = []
    
    elements.append(PageBreak())
    elements.append(Paragraph("Critical Findings & Remediation Matrix", styles['SectionHeading']))
    elements.append(Spacer(1, 8))
    
    intro = """
    This section consolidates all Critical and High-priority findings into a prioritized remediation roadmap with effort estimates, "
    "responsible parties, and target timelines. Items are ordered by severity and implementation dependency.
    """
    elements.append(Paragraph(intro.strip(), styles['BodyText']))
    elements.append(Spacer(1, 12))
    
    # Immediate Actions (Before Go-Live)
    elements.append(Paragraph("Phase 1: Immediate Actions (Before Go-Live) - 1-2 Weeks", styles['SubsectionHeading']))
    
    immediate_data = [
        ['Priority', 'ID', 'Issue', 'Effort', 'Owner'],
        ['P1-CRIT', 'CF-01', 'Wazuh root/SYS_ADMIN - Document exception or remediate', '4hr', 'Infra/Sec'],
        ['P1-CRIT', 'CF-02', 'Migrate from local-path to replicated storage', '16hr', 'Infra'],
        ['P1-CRIT', 'CF-03', 'Remove placeholder secrets, implement Sealed Secrets', '4hr', 'SecOps'],
        ['P1-CRIT', 'DR-001', 'Define and document formal RTO/RPO targets', '8hr', 'SOC Dir'],
        ['P1-CRIT', 'DR-002', 'Document DR site/failover procedures', '16hr', 'Infra Lead'],
        ['P1-CRIT', 'NET-006', 'Enable mTLS for East-West traffic', '8hr', 'Network Sec'],
        ['P1-CRIT', 'AUD-010', 'Replace CA_BUNDLE placeholder in audit policy', '30min', 'SecOps'],
        ['P1-CRIT', 'VULN-005', 'Integrate live NVD/GitHub Advisory feed', '8hr', 'App Sec'],
        ['P1-CRIT', 'RPT-001', 'Connect reports to actual data sources', '3-5 days', 'Backend'],
        ['P1-HIGH', 'D-003', 'Fix sameCode typo in session management', '5min', 'Developer'],
        ['P1-HIGH', 'E-001', 'Add startup validation rejecting placeholder secrets', '1hr', 'Developer'],
        ['P1-HIGH', 'B-004', 'Remove role names from error messages', '30min', 'Developer'],
        ['P1-HIGH', 'WH-01', 'Add imagePullSecrets for registry auth', '1hr', 'K8s Admin'],
    ]
    
    imm_table = Table(immediate_data, colWidths=[2*cm, 2*cm, 7*cm, 2*cm, 2*cm])
    imm_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), SEM_ERROR),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('FONTNAME', (0, 0), (-1, 0), 'NotoSansSC-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 8),
        ('FONTNAME', (0, 1), (-1, -1), 'NotoSansSC'),
        ('FONTSIZE', (0, 1), (-1, -1), 7),
        ('BACKGROUND', (0, 1), (-1, -1), CARD_BG),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [CARD_BG, TABLE_STRIPE]),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]))
    elements.append(imm_table)
    elements.append(Spacer(1, 16))
    
    # Short-Term Actions
    elements.append(Paragraph("Phase 2: Short-Term (Post-Launch) - 2-4 Weeks", styles['SubsectionHeading']))
    
    shortterm_data = [
        ['Priority', 'ID', 'Issue', 'Effort', 'Owner'],
        ['P2-HIGH', 'WH-02', 'Implement Velero automated backups', '8hr', 'DevOps'],
        ['P2-HIGH', 'DR-003', 'Test backup restore procedures', '8hr', 'DBA/Ops'],
        ['P2-HIGH', 'LOG-001', 'Deploy centralized logging (ELK/Loki)', '16hr', 'DevOps/SRE'],
        ['P2-HIGH', 'MON-001', 'Connect metrics to live Prometheus data', '8hr', 'Backend'],
        ['P2-HIGH', 'HLT-001', 'Implement circuit breaker pattern', '8hr', 'Backend'],
        ['P2-HIGH', 'RPT-002', 'Integrate email/Slack distribution', '8hr', 'Backend'],
        ['P2-HIGH', 'VULN-007', 'Add Trivy container image scanning', '16hr', 'CI/CD'],
        ['P2-HIGH', 'A-001', 'Replace regex HTML sanitizer with DOMPurify', '4hr', 'Frontend'],
        ['P2-HIGH', 'B-001', 'Implement Argon2id password hashing', '4hr', 'Backend'],
        ['P2-HIGH', 'B-003', 'Migrate sessions to Redis storage', '8hr', 'Backend'],
        ['P2-MED', 'NET-007', 'Implement egress filtering at gateway', '4hr', 'Network Sec'],
        ['P2-MED', 'POD-008', 'Migrate from deprecated PSP APIs', '8hr', 'K8s Admin'],
        ['P2-MED', 'DDoS-011', 'Remove unsafe-inline from CDN CSP', '1hr', 'CDN Admin'],
    ]
    
    st_table = Table(shortterm_data, colWidths=[2*cm, 2*cm, 7*cm, 2*cm, 2*cm])
    st_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), SEM_WARNING),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('FONTNAME', (0, 0), (-1, 0), 'NotoSansSC-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 8),
        ('FONTNAME', (0, 1), (-1, -1), 'NotoSansSC'),
        ('FONTSIZE', (0, 1), (-1, -1), 7),
        ('BACKGROUND', (0, 1), (-1, -1), CARD_BG),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [CARD_BG, TABLE_STRIPE]),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]))
    elements.append(st_table)
    elements.append(Spacer(1, 16))
    
    # Continuous Improvement
    elements.append(Paragraph("Phase 3: Continuous Improvement - Ongoing", styles['SubsectionHeading']))
    
    ongoing_data = [
        ['Priority', 'ID', 'Issue', 'Effort', 'Owner'],
        ['P3-MED', 'WH-04', 'Implement zone-aware scheduling (topologySpreadConstraints)', '4hr', 'K8s Admin'],
        ['P3-MED', 'WH-06', 'Evaluate PostgreSQL HA (Patroni) for DB redundancy', '40hr', 'DBA'],
        ['P3-MED', 'B-03', 'Evaluate service mesh (Istio/Linkerd) for mTLS', '24hr', 'Platform'],
        ['P3-MED', 'OPS-001', 'Create Change Management Board process', '8hr', 'SOC Mgr'],
        ['P3-MED', 'VULN-008', 'Implement SBOM generation (CycloneDX/SPDX)', '8hr', 'CI/CD'],
        ['P3-MED', 'VULN-009', 'Add Dependabot/Renovate for auto updates', '4hr', 'Platform'],
        ['P3-LOW', 'NET-008', 'Add monitoring namespace egress policy', '2hr', 'Network Sec'],
        ['P3-LOW', 'DDoS-012', 'Change X-Frame-Options to DENY', '15min', 'SecOps'],
        ['P3-LOW', 'WH-05', 'Complete or remove Caddyfile configuration', '2hr', 'Platform'],
        ['P3-LOW', 'D-005', 'Consolidate duplicate auth middleware files', '4hr', 'Backend'],
    ]
    
    og_table = Table(ongoing_data, colWidths=[2*cm, 2*cm, 7*cm, 2*cm, 2*cm])
    og_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), TEXT_MUTED),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('FONTNAME', (0, 0), (-1, 0), 'NotoSansSC-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 8),
        ('FONTNAME', (0, 1), (-1, -1), 'NotoSansSC'),
        ('FONTSIZE', (0, 1), (-1, -1), 7),
        ('BACKGROUND', (0, 1), (-1, -1), CARD_BG),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [CARD_BG, TABLE_STRIPE]),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]))
    elements.append(og_table)
    
    return elements

def build_compliance_matrix(styles):
    """Build compliance framework mapping section."""
    elements = []
    
    elements.append(PageBreak())
    elements.append(Paragraph("Compliance Framework Mapping", styles['SectionHeading']))
    elements.append(Spacer(1, 8))
    
    intro = """
    This section maps the platform's security controls against relevant regulatory frameworks and industry standards "
    "including ANSSI (French cybersecurity agency guidelines), ARTP (Algerian telecommunications regulator requirements), "
    "NIST (US National Institute of Standards and Technology), CIS Kubernetes Benchmark, and OWASP (Open Web Application "
    "Security Project) standards.
    """
    elements.append(Paragraph(intro.strip(), styles['BodyText']))
    elements.append(Spacer(1, 12))
    
    # ANSSI Framework
    elements.append(Paragraph("ANSSI Framework Alignment", styles['SubsectionHeading']))
    
    anssi_data = [
        ['Domain', 'Controls', 'Coverage', 'Status', 'Notes'],
        ['PSSI (Security Policy)', '3', '100%', 'ALIGNED', 'Governance, org, classification'],
        ['EBIOS (Risk Mgmt)', '3', '100%', 'ALIGNED', 'Risk assessment, assets, threats'],
        ['RGS (Technical Sec)', '5', '95%', 'ALIGNED', 'Auth, crypto, logging, network'],
        ['SecNumCloud (Cloud)', '2', '90%', 'ALIGNED', 'Provider qual, data protection'],
        ['Detection', '2', '95%', 'ALIGNED', 'SIEM, threat intel'],
        ['Response', '2', '95%', 'ALIGNED', 'IR, crisis management'],
    ]
    
    anssi_table = Table(anssi_data, colWidths=[3.5*cm, 2*cm, 2*cm, 2*cm, 5.5*cm])
    anssi_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), HEADER_FILL),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('ALIGN', (1, 1), (3, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('FONTNAME', (0, 0), (-1, 0), 'NotoSansSC-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 9),
        ('FONTNAME', (0, 1), (-1, -1), 'NotoSansSC'),
        ('FONTSIZE', (0, 1), (-1, -1), 8),
        ('BACKGROUND', (0, 1), (-1, -1), CARD_BG),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [CARD_BG, TABLE_STRIPE]),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(anssi_table)
    elements.append(Spacer(1, 12))
    
    # ARTP Framework
    elements.append(Paragraph("ARTP Regulatory Requirements (Algeria)", styles['SubsectionHeading']))
    
    artp_data = [
        ['Requirement Area', 'ARTP Ref', 'Status', 'Evidence'],
        ['Access Control', 'ARTP-NS-001', 'COMPLIANT', '4-tier RBAC, least privilege, MFA for admin'],
        ['Network Segmentation', 'ARTP-NS-002', 'COMPLIANT', 'Zero-trust, namespace isolation, DB restrictions'],
        ['Traffic Filtering', 'ARTP-NS-005', 'COMPLIANT', 'Network policies, WAF, rate limiting'],
        ['Data Protection', 'ARTP-DP-001', 'COMPLIANT', 'AES-256-GCM, HSM, Vault, tokenization'],
        ['Data Localization', 'ARTP-DP-005', 'COMPLIANT', 'Algeria-only storage enforced, OPA policy'],
        ['Encryption Standards', 'ARTP-SP-002', 'COMPLIANT', 'TLS 1.2+, HSTS, cert-manager'],
        ['Logging Requirements', 'ARTP-LI-005', 'COMPLIANT', '5-year retention, WORM, HMAC integrity'],
        ['Incident Management', 'ARTP-IM-001', 'COMPLIANT', '12 playbooks, escalation matrix, SLAs'],
        ['Availability', 'ARTP-NS-008', 'PARTIAL', 'HPA configured, DR gaps (see DR section)'],
        ['Egress Filtering', 'ARTP-NS-xxx', 'GAP', 'Permissive gateway egress needs tightening'],
    ]
    
    artp_table = Table(artp_data, colWidths=[3.5*cm, 2.5*cm, 2.5*cm, 6.5*cm])
    artp_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), ACCENT),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('ALIGN', (1, 1), (2, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('FONTNAME', (0, 0), (-1, 0), 'NotoSansSC-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 8),
        ('FONTNAME', (0, 1), (-1, -1), 'NotoSansSC'),
        ('FONTSIZE', (0, 1), (-1, -1), 8),
        ('BACKGROUND', (0, 1), (-1, -1), CARD_BG),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [CARD_BG, TABLE_STRIPE]),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        # Highlight gap row
        ('TEXTCOLOR', (2, 10), (2, 10), SEM_WARNING),
    ]))
    elements.append(artp_table)
    elements.append(Spacer(1, 12))
    
    # NIST & CIS
    elements.append(Paragraph("NIST & CIS Benchmark Alignment", styles['SubsectionHeading']))
    
    nist_cis_data = [
        ['Standard', 'Area', 'Coverage', 'Status', 'Primary Gap'],
        ['NIST AC-3', 'Access Enforcement', '95%', 'COMPLIANT', 'Auditor scope limitation'],
        ['NIST AC-6', 'Least Privilege', '95%', 'COMPLIANT', 'Minor RBAC syntax issue'],
        ['NIST SC-7', 'Boundary Protection', '85%', 'PARTIAL', 'mTLS not yet active'],
        ['NIST SC-28', 'Data at Rest Protection', '98%', 'COMPLIANT', 'Redis in-transit note'],
        ['NIST AU-2', 'Audit Events', '92%', 'COMPLIANT', 'Centralized logging verify'],
        ['NIST SI-2', 'Software Flaw Remediation', '65%', 'PARTIAL', 'Static vuln DB, no auto-patch'],
        ['CIS K8s 5.1-5.7', 'Pod Security', '94%', 'ALIGNED', 'Deprecated PSP migration'],
        ['CIS K8s General', 'Cluster Hardening', '90%', 'ALIGNED', 'Root container exceptions'],
        ['OWASP Top 10', 'Web App Security', '93%', 'ALIGNED', 'CSP hardening at edge'],
    ]
    
    nist_table = Table(nist_cis_data, colWidths=[3*cm, 3.5*cm, 2*cm, 2.5*cm, 4*cm])
    nist_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), ACCENT_2),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('ALIGN', (2, 1), (3, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('FONTNAME', (0, 0), (-1, 0), 'NotoSansSC-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 8),
        ('FONTNAME', (0, 1), (-1, -1), 'NotoSansSC'),
        ('FONTSIZE', (0, 1), (-1, -1), 8),
        ('BACKGROUND', (0, 1), (-1, -1), CARD_BG),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [CARD_BG, TABLE_STRIPE]),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]))
    elements.append(nist_table)
    elements.append(Spacer(1, 16))
    
    # Final Verdict
    elements.append(Paragraph("Final Audit Verdict", styles['SubsectionHeading']))
    
    verdict_text = """
    <b>Audit Classification: CONDITIONAL PASS</b><br/><br/>
    The National SOC Platform demonstrates strong security foundations suitable for critical national infrastructure deployment. "
    "The platform excels in RBAC design, admission control, encryption posture, DDoS protection, and operational procedures. "
    "However, several critical items must be addressed before go-live:<br/><br/>
    <b>Pre-requisites for Production Deployment:</b><br/>
    1. All Critical-priority findings (CF-01, CF-02, CF-03, DR-001, DR-002, NET-006, AUD-010, VULN-005, RPT-001)<br/>
    2. High-priority code fixes (D-003 typo, E-001 secret validation, B-004 error messages)<br/>
    3. Disaster Recovery framework establishment (minimum viable: RTO/RPO doc, one successful restore test)<br/>
    4. Centralized logging operationalization<br/><br/>
    <b>Estimated Timeline to Full Compliance:</b><br/>
    - Minimum viable operations: 2 weeks (resolve P1 items only)<br/>
    - Production-ready with conditions: 4-6 weeks (P1 + P2 items)<br/>
    - Full operational excellence: 8-12 weeks (all recommendations)<br/><br/>
    <b>Recommended Next Steps:</b><br/>
    1. Present findings to CISO/Security Director for sign-off<br/>
    2. Create remediation sprint backlog with assigned owners<br/>
    3. Schedule weekly progress reviews until go-live criteria met<br/>
    4. Plan penetration testing engagement post-remediation<br/>
    5. Execute first quarterly DR drill within 30 days of launch
    """
    elements.append(Paragraph(verdict_text, styles['BodyText']))
    
    return elements

def add_page_number(canvas, doc):
    """Add page number to each page."""
    page_num = canvas.getPageNumber()
    text = f"National SOC Platform - Production Readiness Audit | Page {page_num}"
    canvas.saveState()
    canvas.setFont('NotoSansSC', 8)
    canvas.setFillColor(TEXT_MUTED)
    canvas.drawCentredString(PAGE_WIDTH/2, 1.5*cm, text)
    canvas.restoreState()

def generate_report(output_path):
    """Generate the complete audit report PDF."""
    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        leftMargin=LEFT_MARGIN,
        rightMargin=RIGHT_MARGIN,
        topMargin=TOP_MARGIN,
        bottomMargin=BOTTOM_MARGIN,
        title="National SOC Platform - Production Readiness Audit Report",
        author="Security Audit Team",
        subject="Phase 1 & Phase 2 Production Readiness Assessment"
    )
    
    styles = create_styles()
    story = []
    
    # Cover Page
    story.append(Spacer(1, 3*cm))
    story.append(Paragraph("PRODUCTION READINESS AUDIT REPORT", styles['ReportTitle']))
    story.append(Spacer(1, 0.5*cm))
    story.append(Paragraph("National SOC Platform", styles['ReportSubtitle']))
    story.append(Paragraph("Djezzy Telecom - Algeria", styles['ReportSubtitle']))
    story.append(Spacer(1, 1*cm))
    story.append(Paragraph(f"Audit Date: {datetime.now().strftime('%B %d, %Y')}", styles['ReportSubtitle']))
    story.append(Paragraph("Classification: CONFIDENTIAL - GOVERNMENT GRADE SECURITY", styles['ReportSubtitle']))
    story.append(Spacer(1, 2*cm))
    
    # Cover stats
    cover_stats = [
        ['Phase 1 Status', 'Phase 2 Status', 'Overall', 'Findings'],
        ['CONDITIONAL\nPASS', 'CONDITIONAL\nPASS', 'CONDITIONAL\nPASS', '57 Total\n(6 Critical)']
    ]
    cover_table = Table(cover_stats, colWidths=[3.5*cm, 3.5*cm, 3.5*cm, 3.5*cm])
    cover_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), HEADER_FILL),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('FONTNAME', (0, 0), (-1, 0), 'NotoSansSC-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('FONTNAME', (0, 1), (-1, 1), 'NotoSerifSC-Bold'),
        ('FONTSIZE', (0, 1), (-1, 1), 14),
        ('TEXTCOLOR', (0, 1), (-1, 1), ACCENT),
        ('BACKGROUND', (0, 1), (-1, -1), SECTION_BG),
        ('GRID', (0, 0), (-1, -1), 1, BORDER),
        ('TOPPADDING', (0, 0), (-1, -1), 12),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
    ]))
    story.append(cover_table)
    
    story.append(PageBreak())
    
    # Table of Contents placeholder
    story.append(Paragraph("Table of Contents", styles['SectionHeading']))
    story.append(Spacer(1, 12))
    
    toc_items = [
        "1. Executive Summary",
        "2. Phase 1: Code Quality & Security Basics",
        "3. Phase 1: Configuration & Infrastructure",
        "4. Phase 2: Advanced Security Review",
        "5. Phase 2: Performance & Scalability",
        "6. Phase 2: Monitoring & Operations",
        "7. Critical Findings & Remediation Matrix",
        "8. Compliance Framework Mapping"
    ]
    
    for item in toc_items:
        story.append(Paragraph(item, styles['BodyText']))
    
    # Build all sections
    story.extend(build_executive_summary(styles))
    story.extend(build_phase1_code_security(styles))
    story.extend(build_phase1_configuration(styles))
    story.extend(build_phase2_advanced_security(styles))
    story.extend(build_phase2_performance(styles))
    story.extend(build_phase2_monitoring(styles))
    story.extend(build_remediation_matrix(styles))
    story.extend(build_compliance_matrix(styles))
    
    # Build PDF
    doc.build(story, onFirstPage=add_page_number, onLaterPages=add_page_number)
    print(f"Report generated successfully: {output_path}")
    return output_path

if __name__ == "__main__":
    output_file = "/home/z/my-project/download/National_SOC_Production_Readiness_Audit_Report.pdf"
    generate_report(output_file)
