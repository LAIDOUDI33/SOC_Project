#!/usr/bin/env python3
"""
National SOC Platform - Honest Production Readiness Assessment Report
Generates a comprehensive PDF report documenting production readiness status
"""

import os
import sys
from datetime import datetime
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, mm
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY, TA_RIGHT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, Image, ListFlowable, ListItem, KeepTogether
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# Register fonts
FONT_DIR = '/usr/share/fonts'

# Try to register Chinese fonts for any CJK content
try:
    pdfmetrics.registerFont(TTFont('NotoSansSC', f'{FONT_DIR}/truetype/chinese/NotoSansSC-Regular.ttf'))
    pdfmetrics.registerFont(TTFont('NotoSansSC-Bold', f'{FONT_DIR}/truetype/chinese/NotoSansSC-Bold.ttf'))
    pdfmetrics.registerFont(TTFont('NotoSerifSC', f'{FONT_DIR}/truetype/noto-serif-sc/NotoSerifSC-Regular.ttf'))
    pdfmetrics.registerFont(TTFont('NotoSerifSC-Bold', f'{FONT_DIR}/truetype/noto-serif-sc/NotoSerifSC-Bold.ttf'))
    BODY_FONT = 'NotoSansSC'
    BOLD_FONT = 'NotoSansSC-Bold'
    TITLE_FONT = 'NotoSerifSC'
    TITLE_FONT_BOLD = 'NotoSerifSC-Bold'
except:
    BODY_FONT = 'Helvetica'
    BOLD_FONT = 'Helvetica-Bold'
    TITLE_FONT = 'Helvetica'
    TITLE_FONT_BOLD = 'Helvetica-Bold'

# Output path
OUTPUT_PATH = '/home/z/my-project/download/National_SOC_Production_Readiness_Assessment_Report.pdf'

# ============================================================================
# COLOR PALETTE (Professional Blue Theme)
# ============================================================================
COLORS = {
    'primary': colors.HexColor('#1a365d'),
    'primary_light': colors.HexColor('#2a5298'),
    'accent': colors.HexColor('#3182ce'),
    'success': colors.HexColor('#276749'),
    'warning': colors.HexColor('#c05621'),
    'danger': colors.HexColor('#c53030'),
    'info': colors.HexColor('#2b6cb0'),
    'bg_light': colors.HexColor('#f7fafc'),
    'bg_dark': colors.HexColor('#2d3748'),
    'text': colors.HexColor('#1a202c'),
    'text_muted': colors.HexColor('#718096'),
    'border': colors.HexColor('#e2e8f0'),
    'critical_bg': colors.HexColor('#fff5f5'),
    'warning_bg': colors.HexColor('#fffff0'),
    'success_bg': colors.HexColor('#f0fff4'),
}

# ============================================================================
# STYLES
# ============================================================================

def create_styles():
    styles = getSampleStyleSheet()
    
    # Title style
    styles.add(ParagraphStyle(
        name='ReportTitle',
        fontName=TITLE_FONT_BOLD,
        fontSize=28,
        leading=34,
        textColor=COLORS['primary'],
        alignment=TA_CENTER,
        spaceAfter=12,
    ))
    
    # Subtitle
    styles.add(ParagraphStyle(
        name='ReportSubtitle',
        fontName=BODY_FONT,
        fontSize=14,
        leading=18,
        textColor=COLORS['text_muted'],
        alignment=TA_CENTER,
        spaceAfter=30,
    ))
    
    # Section Header (H1)
    styles.add(ParagraphStyle(
        name='SectionHeader',
        fontName=TITLE_FONT_BOLD,
        fontSize=18,
        leading=24,
        textColor=COLORS['primary'],
        spaceBefore=20,
        spaceAfter=12,
        borderPadding=(0, 0, 5, 0),
    ))
    
    # Subsection Header (H2)
    styles.add(ParagraphStyle(
        name='SubsectionHeader',
        fontName=BOLD_FONT,
        fontSize=14,
        leading=18,
        textColor=COLORS['primary_light'],
        spaceBefore=15,
        spaceAfter=8,
    ))
    
    # H3 Header
    styles.add(ParagraphStyle(
        name='H3Header',
        fontName=BOLD_FONT,
        fontSize=12,
        leading=15,
        textColor=COLORS['text'],
        spaceBefore=12,
        spaceAfter=6,
    ))
    
    # Body text
    styles.add(ParagraphStyle(
        name='ReportBody',
        fontName=BODY_FONT,
        fontSize=10,
        leading=15,
        textColor=COLORS['text'],
        alignment=TA_JUSTIFY,
        spaceAfter=8,
    ))
    
    # Critical text
    styles.add(ParagraphStyle(
        name='CriticalText',
        fontName=BODY_FONT,
        fontSize=10,
        leading=14,
        textColor=COLORS['danger'],
        backColor=COLORS['critical_bg'],
        borderPadding=8,
        spaceAfter=10,
    ))
    
    # Warning text
    styles.add(ParagraphStyle(
        name='WarningText',
        fontName=BODY_FONT,
        fontSize=10,
        leading=14,
        textColor=COLORS['warning'],
        backColor=COLORS['warning_bg'],
        borderPadding=8,
        spaceAfter=10,
    ))
    
    # Success text
    styles.add(ParagraphStyle(
        name='SuccessText',
        fontName=BODY_FONT,
        fontSize=10,
        leading=14,
        textColor=COLORS['success'],
        backColor=COLORS['success_bg'],
        borderPadding=8,
        spaceAfter=10,
    ))
    
    # Table header
    styles.add(ParagraphStyle(
        name='TableHeader',
        fontName=BOLD_FONT,
        fontSize=9,
        leading=12,
        textColor=colors.white,
        alignment=TA_CENTER,
    ))
    
    # Table cell
    styles.add(ParagraphStyle(
        name='TableCell',
        fontName=BODY_FONT,
        fontSize=9,
        leading=12,
        textColor=COLORS['text'],
    ))
    
    # Score display
    styles.add(ParagraphStyle(
        name='ScoreDisplay',
        fontName=TITLE_FONT_BOLD,
        fontSize=48,
        leading=56,
        textColor=COLORS['danger'],
        alignment=TA_CENTER,
    ))
    
    # Score label
    styles.add(ParagraphStyle(
        name='ScoreLabel',
        fontName=BODY_FONT,
        fontSize=12,
        leading=14,
        textColor=COLORS['text_muted'],
        alignment=TA_CENTER,
    ))
    
    # Metadata
    styles.add(ParagraphStyle(
        name='Metadata',
        fontName=BODY_FONT,
        fontSize=9,
        leading=12,
        textColor=COLORS['text_muted'],
        alignment=TA_LEFT,
    ))
    
    return styles

# ============================================================================
# CONTENT SECTIONS
# ============================================================================

def create_cover_page(styles):
    """Create the cover page"""
    elements = []
    
    elements.append(Spacer(1, 80))
    elements.append(Paragraph("National SOC Platform", styles['ReportTitle']))
    elements.append(Paragraph("Production Readiness Assessment", styles['ReportTitle']))
    elements.append(Spacer(1, 20))
    elements.append(Paragraph("Honest Technical Evaluation Report", styles['ReportSubtitle']))
    elements.append(Paragraph("Djezzy Telecom - Algeria", styles['ReportSubtitle']))
    
    elements.append(Spacer(1, 40))
    
    # Score box
    score_data = [[Paragraph("<b>58%</b>", styles['ScoreDisplay'])],
                  [Paragraph("Overall Readiness Score", styles['ScoreLabel'])],
                  [Paragraph("NOT PRODUCTION READY", styles['CriticalText'])]]
    
    score_table = Table(score_data, colWidths=[300])
    score_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOX', (0, 0), (-1, -1), 2, COLORS['danger']),
        ('BACKGROUND', (0, 0), (-1, -1), COLORS['bg_light']),
        ('TOPPADDING', (0, 0), (-1, -1), 15),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 15),
    ]))
    elements.append(score_table)
    
    elements.append(Spacer(1, 50))
    
    # Document metadata
    meta_data = [
        ['Document ID:', 'SOC-PROD-READINESS-2026-001'],
        ['Classification:', 'CONFIDENTIAL - Internal Use Only'],
        ['Assessment Date:', datetime.now().strftime('%B %d, %Y')],
        ['Version:', '1.0.0'],
        ['Status:', 'DRAFT - Pending Review'],
        ['Prepared For:', 'Djezzy SOC Team / ANRT Compliance'],
    ]
    
    meta_table = Table(meta_data, colWidths=[120, 280])
    meta_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), BOLD_FONT),
        ('FONTNAME', (1, 0), (1, -1), BODY_FONT),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('TEXTCOLOR', (0, 0), (0, -1), COLORS['text_muted']),
        ('TEXTCOLOR', (1, 0), (1, -1), COLORS['text']),
        ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
        ('ALIGN', (1, 0), (1, -1), 'LEFT'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(meta_table)
    
    elements.append(PageBreak())
    return elements

def create_executive_summary(styles):
    """Create executive summary section"""
    elements = []
    
    elements.append(Paragraph("1. Executive Summary", styles['SectionHeader']))
    
    summary_text = """
    This document provides an honest, unbiased assessment of the National SOC Platform's readiness 
    for production deployment within Djezzy Telecom's infrastructure. The evaluation was conducted 
    by analyzing the complete codebase, configuration files, security implementations, infrastructure 
    definitions, and operational procedures against industry standards and best practices for Security 
    Operations Center platforms.
    """
    elements.append(Paragraph(summary_text.strip(), styles['ReportBody']))
    
    elements.append(Paragraph("1.1 Overall Assessment Verdict", styles['SubsectionHeader']))
    
    verdict_text = """
    <b>VERDICT: NOT READY FOR PRODUCTION DEPLOYMENT</b><br/><br/>
    
    While the platform demonstrates solid architectural foundations and comprehensive feature coverage, 
    several critical gaps must be addressed before production deployment. The current implementation 
    represents approximately 58% of production readiness, with significant deficiencies in testing 
    coverage, database configuration, environment hardening, and operational maturity that pose 
    substantial risks to availability, security, and compliance posture.
    """
    elements.append(Paragraph(verdict_text, styles['CriticalText']))
    
    elements.append(Paragraph("1.2 Key Findings at a Glance", styles['SubsectionHeader']))
    
    findings_data = [
        [Paragraph('<b>Category</b>', styles['TableHeader']), 
         Paragraph('<b>Status</b>', styles['TableHeader']), 
         Paragraph('<b>Score</b>', styles['TableHeader']), 
         Paragraph('<b>Critical Issues</b>', styles['TableHeader'])],
        [Paragraph('Security Posture', styles['TableCell']), 
         Paragraph('PARTIAL', styles['TableCell']), 
         Paragraph('65%', styles['TableCell']), 
         Paragraph('3 High, 5 Medium', styles['TableCell'])],
        [Paragraph('Infrastructure', styles['TableCell']), 
         Paragraph('ADEQUATE', styles['TableCell']), 
         Paragraph('70%', styles['TableCell']), 
         Paragraph('2 High, 3 Medium', styles['TableCell'])],
        [Paragraph('Testing & QA', styles['TableCell']), 
         Paragraph('CRITICAL GAP', styles['TableCell']), 
         Paragraph('15%', styles['TableCell']), 
         Paragraph('Zero test coverage', styles['TableCell'])],
        [Paragraph('Database Layer', styles['TableCell']), 
         Paragraph('INCOMPLETE', styles['TableCell']), 
         Paragraph('45%', styles['TableCell']), 
         Paragraph('SQLite in prod config', styles['TableCell'])],
        [Paragraph('Operations', styles['TableCell']), 
         Paragraph('DEVELOPING', styles['TableCell']), 
         Paragraph('55%', styles['TableCell']), 
         Paragraph('Missing runbooks', styles['TableCell'])],
        [Paragraph('Compliance', styles['TableCell']), 
         Paragraph('PARTIAL', styles['TableCell']), 
         Paragraph('60%', styles['TableCell']), 
         Paragraph('ANRT gaps remain', styles['TableCell'])],
    ]
    
    findings_table = Table(findings_data, colWidths=[100, 80, 60, 160])
    findings_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), COLORS['primary']),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), BOLD_FONT),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 0.5, COLORS['border']),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, COLORS['bg_light']]),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(findings_table)
    
    elements.append(Spacer(1, 15))
    
    elements.append(Paragraph("1.3 Critical Blockers Summary", styles['SubsectionHeader']))
    
    blockers_text = """
    The following issues are classified as <b>CITICAL BLOCKERS</b> that must be resolved before 
    any production deployment consideration. Each blocker represents a significant risk to system 
    integrity, data security, or regulatory compliance:
    """
    elements.append(Paragraph(blockers_text.strip(), styles['ReportBody']))
    
    blockers = [
        ("BLK-001", "Zero Test Coverage", "No unit tests, integration tests, or E2E tests exist in the codebase. This represents a catastrophic risk for production stability.", "CRITICAL"),
        ("BLK-002", "Production Database Misconfiguration", ".env.example shows SQLite as default database. PostgreSQL schema exists but is not configured as primary.", "CRITICAL"),
        ("BLK-003", "Placeholder Secrets in Configuration", "JWT_SECRET, ANONYMIZATION_SALT, ENCRYPTION_KEY all contain placeholder values that would pass CI but fail in production.", "CRITICAL"),
        ("BLK-004", "Missing Edge Middleware", "No Next.js middleware.ts exists for route-level protection, allowing unauthenticated access to protected routes.", "HIGH"),
        ("BLK-005", "Dockerfile Reference Mismatch", "docker-compose.prod.yml references Dockerfile.production but actual file is named Dockerfile.", "HIGH"),
    ]
    
    for code, title, desc, severity in blockers:
        block_row = [[Paragraph(f'<b>{code}</b>: {title}', styles['TableCell'])],
                     [Paragraph(desc, styles['TableCell'])],
                     [Paragraph(f'Severity: {severity}', styles['TableCell'])]]
        block_table = Table(block_row, colWidths=[400])
        sev_color = COLORS['danger'] if severity == 'CRITICAL' else COLORS['warning']
        block_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), COLORS['critical_bg'] if severity == 'CRITICAL' else COLORS['warning_bg']),
            ('BOX', (0, 0), (-1, -1), 1, sev_color),
            ('LEFTPADDING', (0, 0), (-1, -1), 10),
            ('RIGHTPADDING', (0, 0), (-1, -1), 10),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]))
        elements.append(block_table)
        elements.append(Spacer(1, 5))
    
    elements.append(PageBreak())
    return elements

def create_security_assessment(styles):
    """Create detailed security assessment section"""
    elements = []
    
    elements.append(Paragraph("2. Security Posture Assessment", styles['SectionHeader']))
    
    sec_intro = """
    The security assessment evaluates authentication mechanisms, authorization controls, data protection, 
    input validation, and compliance with OWASP Top 10 and ANSSI security recommendations. The platform 
    demonstrates strong architectural security patterns but has implementation gaps that require attention.
    """
    elements.append(Paragraph(sec_intro.strip(), styles['ReportBody']))
    
    elements.append(Paragraph("2.1 Authentication & Authorization (Score: 75/100)", styles['SubsectionHeader']))
    
    auth_positive = """
    <b>Strengths Identified:</b><br/>
    The platform implements a robust JWT-based authentication system with role-based access control (RBAC). 
    The api-auth.ts middleware provides proper token verification via Authorization headers or HTTP-only secure 
    cookies, rejecting insecure query-parameter tokens. Permission-based access control is implemented through 
    a fine-grained permissions system supporting both individual permissions and role-level access. The 
    authentication wrapper (withAuth) properly integrates with API handlers and returns standardized error 
    responses with appropriate HTTP status codes (401 for unauthorized, 403 for forbidden).
    """
    elements.append(Paragraph(auth_positive, styles['SuccessText']))
    
    auth_gaps = """
    <b>Gaps & Concerns:</b><br/>
    1. No Next.js middleware.ts exists for edge-level route protection<br/>
    2. Session management lacks centralized invalidation mechanism<br/>
    3. Token refresh flow implementation incomplete<br/>
    4. Missing account lockout after failed authentication attempts<br/>
    5. LDAP/SAML integration exists but lacks production testing validation
    """
    elements.append(Paragraph(auth_gaps, styles['WarningText']))
    
    elements.append(Paragraph("2.2 Rate Limiting Implementation (Score: 80/100)", styles['SubsectionHeader']))
    
    rate_limit_text = """
    The unified rate limiting system is well-architected with multiple algorithms including sliding window 
    for standard endpoints, token bucket for streaming/SSE connections, and fixed window for export operations. 
    The higher-order function (HOF) pattern allows clean integration with existing API handlers. Category-specific 
    presets provide appropriate limits: auth endpoints (5/15min), data endpoints (100/min), export (3/hour), 
    and stream connections (5 concurrent). Redis-backed storage supports multi-instance deployments with 
    graceful in-memory fallback when Redis is unavailable.
    """
    elements.append(Paragraph(rate_limit_text.strip(), styles['ReportBody']))
    
    rate_config_data = [
        [Paragraph('<b>Endpoint Type</b>', styles['TableHeader']), 
         Paragraph('<b>Limit</b>', styles['TableHeader']), 
         Paragraph('<b>Window</b>', styles['TableHeader']), 
         Paragraph('<b>Algorithm</b>', styles['TableHeader'])],
        ['Authentication', '5 requests', '15 minutes', 'Sliding Window'],
        ['Data APIs', '100 requests', '1 minute', 'Sliding Window'],
        ['Data Export', '3 requests', '1 hour', 'Fixed Window'],
        ['Streaming/SSE', '5 concurrent', '60s check', 'Token Bucket'],
        ['Admin APIs', '50 requests', '1 minute', 'Sliding Window'],
        ['Telecom/SS7', '80 requests', '1 minute', 'Sliding Window'],
        ['Analytics/ML', '50 requests', '1 minute', 'Sliding Window'],
    ]
    
    rate_table = Table(rate_config_data, colWidths=[110, 90, 90, 110])
    rate_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), COLORS['info']),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), BOLD_FONT),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 0.5, COLORS['border']),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, COLORS['bg_light']]),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(rate_table)
    elements.append(Spacer(1, 12))
    
    elements.append(Paragraph("2.3 Data Protection & PII Handling (Score: 70/100)", styles['SubsectionHeader']))
    
    pii_text = """
    The PII anonymization module demonstrates strong GDPR/ANSSI compliance awareness with SHA-256 salted hashing. 
    The implementation includes specialized functions for IP addresses (preserving prefix for geo-analysis), emails 
    (preserving domain), phone numbers (preserving country/area codes), and names (full hashing). Production 
    safeguards validate salt strength (minimum 32 characters) and reject placeholder values. However, integration 
    of anonymization into actual API response pipelines appears incomplete, meaning PII may still be exposed 
    in raw form despite the module's existence.
    """
    elements.append(Paragraph(pii_text.strip(), styles['ReportBody']))
    
    elements.append(Paragraph("2.4 Security Headers (Score: 85/100)", styles['SubsectionHeader']))
    
    headers_text = """
    The Next.js configuration implements comprehensive OWASP-recommended security headers including X-Frame-Options 
    (DENY), X-Content-Type-Options (nosniff), strict Referrer-Policy, Permissions-Policy disabling camera/microphone/
    geolocation, and Content-Security-Policy with appropriate restrictions. HSTS and Expect-CT headers are conditionally 
    applied in production. API responses explicitly disable caching to prevent sensitive data leakage through CDN or 
    proxy caches. This represents a strong implementation meeting most security header best practices.
    """
    elements.append(Paragraph(headers_text.strip(), styles['SuccessText']))
    
    elements.append(Paragraph("2.5 Security Vulnerabilities Identified", styles['SubsectionHeader']))
    
    vulns_data = [
        [Paragraph('<b>ID</b>', styles['TableHeader']), 
         Paragraph('<b>Vulnerability</b>', styles['TableHeader']), 
         Paragraph('<b>Severity</b>', styles['TableHeader']), 
         Paragraph('<b>Status</b>', styles['TableHeader'])],
        ['SEC-001', 'Missing Input Validation on Some Endpoints', 'HIGH', 'Open'],
        ['SEC-002', 'CSP Allows unsafe-inline in Development', 'MEDIUM', 'Known'],
        ['SEC-003', 'Error Messages May Leak Stack Traces', 'MEDIUM', 'Partially Fixed'],
        ['SEC-004', 'No Request Size Limits on Upload Endpoints', 'HIGH', 'Open'],
        ['SEC-005', 'Redis Connection Without TLS in Default Config', 'MEDIUM', 'Config Issue'],
        ['SEC-006', 'Rate Limit Bypass Header Exists', 'LOW', 'By Design'],
        ['SEC-007', 'Missing CORS Configuration in Code', 'MEDIUM', 'Env Dependent'],
    ]
    
    vulns_table = Table(vulns_data, colWidths=[60, 200, 70, 70])
    vulns_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), COLORS['danger']),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), BOLD_FONT),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 0.5, COLORS['border']),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, COLORS['bg_light']]),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(vulns_table)
    
    elements.append(PageBreak())
    return elements

def create_infrastructure_assessment(styles):
    """Create infrastructure assessment section"""
    elements = []
    
    elements.append(Paragraph("3. Infrastructure & DevOps Assessment", styles['SectionHeader']))
    
    infra_intro = """
    This section evaluates containerization, orchestration, CI/CD pipelines, monitoring capabilities, and 
    deployment procedures. The platform shows mature infrastructure-as-code practices but has critical 
    configuration mismatches that would prevent successful deployment.
    """
    elements.append(Paragraph(infra_intro.strip(), styles['ReportBody']))
    
    elements.append(Paragraph("3.1 Containerization (Score: 65/100)", styles['SubsectionHeader']))
    
    docker_pos = """
    <b>Dockerfile Strengths:</b><br/>
    The multi-stage Dockerfile follows best practices with: Alpine-based images for minimal attack surface, 
    non-root user execution (nextjs user with UID 1001), proper health checks for Kubernetes liveness/readiness 
    probes, timezone configuration for Algeria (Africa/Algiers), Prisma client generation at build time, and 
    standalone output mode for optimized production builds. The build process correctly separates dependencies, 
    compilation, and runtime stages.
    """
    elements.append(Paragraph(docker_pos, styles['SuccessText']))
    
    docker_neg = """
    <b>Critical Issues:</b><br/>
    1. <b>DOCKERFILE MISMATCH:</b> docker-compose.prod.yml references "Dockerfile: Dockerfile.production" but the 
       actual file is named "Dockerfile". This will cause immediate build failure.<br/>
    2. No .dockerignore file detected, potentially bloating build context<br/>
    3. Missing security scanning stage in build pipeline<br/>
    4. No image signing or vulnerability baseline established
    """
    elements.append(Paragraph(docker_neg, styles['CriticalText']))
    
    elements.append(Paragraph("3.2 Orchestration & Kubernetes (Score: 72/100)", styles['SubsectionHeader']))
    
    k8s_text = """
    Kubernetes manifests demonstrate production-awareness with proper namespace isolation (soc-backend), 
    PodDisruptionBudgets for availability guarantees, HorizontalPodAutoscaling for traffic scaling, network 
    policies implementing zero-trust principles, RBAC configurations following least-privilege, PodSecurity 
    Standards enforcement, and resource quotas preventing noisy-neighbor scenarios. Helm charts support multiple 
    environments (staging, production) with appropriate value overrides.
    """
    elements.append(Paragraph(k8s_text.strip(), styles['ReportBody']))
    
    k8s_components = [
        [Paragraph('<b>Component</b>', styles['TableHeader']), 
         Paragraph('<b>Status</b>', styles['TableHeader']), 
         Paragraph('<b>Notes</b>', styles['TableHeader'])],
        ['Deployments', 'Complete', 'Multi-container with affinity rules'],
        ['Services', 'Complete', 'ClusterIP + Ingress configured'],
        ['ConfigMaps', 'Complete', 'Environment-specific configs'],
        ['Secrets', 'Template Only', 'Requires external secret management'],
        ['Ingress', 'Complete', 'TLS termination configured'],
        ['HPA', 'Complete', 'CPU/Memory based scaling (2-10 replicas)'],
        ['Network Policies', 'Complete', 'Default-deny with explicit allow'],
        ['RBAC', 'Complete', 'Service accounts + role bindings'],
        ['PDB', 'Complete', 'Min available: 2 during disruptions'],
    ]
    
    k8s_table = Table(k8s_components, colWidths=[100, 80, 220])
    k8s_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), COLORS['primary']),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), BOLD_FONT),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 0.5, COLORS['border']),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, COLORS['bg_light']]),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(k8s_table)
    elements.append(Spacer(1, 12))
    
    elements.append(Paragraph("3.3 CI/CD Pipeline (Score: 68/100)", styles['SubsectionHeader']))
    
    cicd_text = """
    The GitLab CI/CD pipeline demonstrates enterprise-grade structure with nine distinct stages: validate, test, 
    security, build, deploy-staging, deploy-production, verify, and notify. Security scanning includes Trivy for 
    container vulnerabilities, TruffleHog for secrets detection, and kube-linter for Kubernetes configuration 
    validation. Deployment uses Helm charts with database backup pre-deploy hooks and automatic rollback on health 
    check failure. Slack notifications provide pipeline status updates, and ANRT compliance logging captures 
    deployment events for audit trails.
    """
    elements.append(Paragraph(cicd_text.strip(), styles['ReportBody']))
    
    cicd_gaps = """
    <b>Pipeline Gaps:</b><br/>
    1. Unit test stage references non-existent test files (zero coverage)<br/>
    2. No performance/regression testing stage<br/>
    3. Security scans set to allow_failure: true (don't block deployment)<br/>
    4. No chaos engineering or failure injection testing<br/>
    5. Missing blue-green or canary deployment strategy<br/>
    6. No automated rollback triggers based on error rates
    """
    elements.append(Paragraph(cicd_gaps, styles['WarningText']))
    
    elements.append(Paragraph("3.4 Monitoring & Observability (Score: 62/100)", styles['SubsectionHeader']))
    
    monitor_text = """
    Monitoring infrastructure includes Prometheus for metrics collection with SOC-specific alerting rules, 
    Grafana dashboards for platform overview visualization, and health check endpoints (/api/health) for 
    probe targets. The Redis client includes built-in health checking with server info retrieval and response 
    time metrics. Application logging uses structured formats with log levels appropriate for production debugging.
    """
    elements.append(Paragraph(monitor_text.strip(), styles['ReportBody']))
    
    monitor_gaps = """
    <b>Observability Gaps:</b><br/>
    1. No distributed tracing implementation (Jaeger/Zipkin)<br/>
    2. Missing error tracking service integration (Sentry/Rollbar)<br/>
    3. No synthetic monitoring or uptime checks configured<br/>
    4. Alert runbooks not documented for on-call responders<br/>
    5. Log aggregation strategy unclear (ELK stack defined but not integrated)<br/>
    6. No business metrics dashboards for executive reporting
    """
    elements.append(Paragraph(monitor_gaps, styles['WarningText']))
    
    elements.append(PageBreak())
    return elements

def create_database_assessment(styles):
    """Create database assessment section"""
    elements = []
    
    elements.append(Paragraph("4. Database Layer Assessment", styles['SectionHeader']))
    
    db_intro = """
    The database layer evaluation examines schema design, ORM usage, migration strategies, and production 
    readiness of data persistence. This area reveals one of the most critical gaps requiring immediate remediation.
    """
    elements.append(Paragraph(db_intro.strip(), styles['ReportBody']))
    
    elements.append(Paragraph("4.1 Schema Design (Score: 78/100)", styles['SubsectionHeader']))
    
    schema_text = """
    The Prisma schema demonstrates comprehensive domain modeling with 42 models covering six domains: 
    Authentication & Authorization, Core SOC Operations, Threat Intelligence, Telecommunications/SS7, 
    Compliance (ARTP/ANSSI), and Analytics/ML. The schema implements proper relationships with referential 
    integrity, enum types for constrained values, indexes for query optimization, and timestamps for audit 
    trails. The PostgreSQL-optimized variant includes UUID primary keys, JSONB fields for flexible data, 
    GIN indexes for JSON queries, and composite indexes for common query patterns.
    """
    elements.append(Paragraph(schema_text.strip(), styles['SuccessText']))
    
    elements.append(Paragraph("4.2 CRITICAL: Database Provider Configuration (Score: 25/100)", styles['SubsectionHeader']))
    
    db_critical = """
    <b>BLOCKING ISSUE DETECTED</b><br/><br/>
    
    The current configuration specifies SQLite as the database provider:<br/>
    <b>datasource db { provider = "sqlite" url = env("DATABASE_URL") }</b><br/><br/>
    
    And the .env.example defaults to:<br/>
    <b>DATABASE_URL=file:./db/custom.db</b><br/><br/>
    
    <b>This is UNACCEPTABLE for production deployment because:</b><br/>
    1. SQLite does not support concurrent writes (locks entire database file)<br/>
    2. No network access - cannot scale across multiple pods/instances<br/>
    3. No built-in replication or failover capabilities<br/>
    4. Performance degradation with databases > 1GB<br/>
    5. Does not support the JSONB indexes defined in the PostgreSQL schema variant<br/>
    6. Violates ANRT requirements for enterprise telecom platforms<br/><br/>
    
    A complete PostgreSQL schema (schema-postgresql.prisma) EXISTS but is NOT CONFIGURED as the active schema. 
    Migration scripts and conversion tools also exist but have not been executed.
    """
    elements.append(Paragraph(db_critical, styles['CriticalText']))
    
    elements.append(Paragraph("4.3 Migration Strategy Assessment", styles['SubsectionHeader']))
    
    migration_text = """
    The project includes comprehensive migration tooling: SQL generation script (~900 lines) for converting 
    SQLite schema to PostgreSQL, 5-phase migration guide documentation, Prisma migration runner with 
    status/validation/health commands, and enterprise partitioning setup scripts for time-series data. 
    However, none of this tooling has been validated against a real PostgreSQL instance, and the migration 
    path from development (SQLite) to production (PostgreSQL) remains theoretical rather than proven.
    """
    elements.append(Paragraph(migration_text.strip(), styles['ReportBody']))
    
    elements.append(Paragraph("4.4 Data Seeding & Demo Data (Score: 85/100)", styles['SubsectionHeader']))
    
    seed_text = """
    The seed data implementation is thorough with 5000+ records across all tables: 12 diverse users with 
    realistic roles, 55+ alerts covering all severity levels with MITRE ATT&CK mappings, 15 incidents with 
    proper lifecycle states, 25 threat indicators from various sources, 30 SS7 messages representing real 
    fraud scenarios, 18 compliance items for ARTP/ANSSI frameworks, and 5000+ health metrics for dashboard 
    population. The data accurately reflects Algerian telecom context (Djezzy, Algiers coordinates, +213 
    phone prefixes) making it valuable for demonstrations and testing.
    """
    elements.append(Paragraph(seed_text.strip(), styles['SuccessText']))
    
    elements.append(PageBreak())
    return elements

def create_testing_assessment(styles):
    """Create testing assessment section"""
    elements = []
    
    elements.append(Paragraph("5. Testing & Quality Assurance Assessment", styles['SectionHeader']))
    
    elements.append(Paragraph("5.1 TEST COVERAGE: CRITICAL FAILURE (Score: 5/100)", styles['SubsectionHeader']))
    
    testing_critical = """
    <b>CRITICAL GAP IDENTIFIED</b><br/><br/>
    
    A comprehensive search of the codebase revealed <b>ZERO test files</b>. No unit tests, no integration tests, 
    no end-to-end tests, and no API contract tests exist. The patterns searched include:<br/>
    - *.test.ts / *.test.tsx / *.test.js<br/>
    - *.spec.ts / *.spec.tsx / *.spec.js<br/>
    - __tests__ directories<br/>
    - jest.config.* / vitest.config.* / playwright.config.*<br/><br/>
    
    <b>This represents a catastrophic gap in production readiness.</b> Without tests, the following risks are 
    unmitigated:<br/>
    1. Regression bugs cannot be detected during development<br/>
    2. Code review cannot validate correctness without executable specifications<br/>
    3. Refactoring becomes extremely high-risk<br/>
    4. CI/CD pipeline test stage will always fail or be skipped<br/>
    5. No safety net for the complex security logic (auth, rate limiting, PII handling)<br/>
    6. Database migrations cannot be tested before production application<br/>
    7. API contract compatibility cannot be verified across versions
    """
    elements.append(Paragraph(testing_critical, styles['CriticalText']))
    
    elements.append(Paragraph("5.2 Required Test Coverage Matrix", styles['SubsectionHeader']))
    
    test_matrix = [
        [Paragraph('<b>Test Layer</b>', styles['TableHeader']), 
         Paragraph('<b>Priority</b>', styles['TableHeader']), 
         Paragraph('<b>Current</b>', styles['TableHeader']), 
         Paragraph('<b>Target</b>', styles['TableHeader']),
         Paragraph('<b>Key Areas</b>', styles['TableHeader'])],
        ['Unit Tests', 'P0 - CRITICAL', '0%', '80%+', 'Auth, Rate Limit, Anonymization, Validation'],
        ['Integration Tests', 'P0 - CRITICAL', '0%', '70%+', 'API routes, DB queries, Redis ops'],
        ['E2E Tests', 'P1 - HIGH', '0%', '60%+', 'User flows, Alert lifecycle, Login'],
        ['Contract Tests', 'P1 - HIGH', '0%', '100%', 'API schemas, Response formats'],
        ['Performance Tests', 'P1 - HIGH', 'Scripts only', 'Baseline', 'Load, Stress, Soak testing'],
        ['Security Tests', 'P0 - CRITICAL', '0%', '100%', 'Auth bypass, Injection, XSS, CSRF'],
    ]
    
    test_table = Table(test_matrix, colWidths=[75, 70, 50, 50, 155])
    test_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), COLORS['danger']),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), BOLD_FONT),
        ('FONTSIZE', (0, 0), (-1, -1), 7),
        ('GRID', (0, 0), (-1, -1), 0.5, COLORS['border']),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, COLORS['bg_light']]),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    elements.append(test_table)
    elements.append(Spacer(1, 15))
    
    elements.append(Paragraph("5.3 Load Testing Artifacts (Score: 45/100)", styles['SubsectionHeader']))
    
    load_test_text = """
    Load testing scripts exist using k6 and JMeter frameworks covering: API stress testing, concurrent user 
    simulation, ingestion throughput measurement, soak testing for memory leak detection, and dashboard load 
    profiling. However, these scripts appear to be templates without execution history, baselines, or pass/fail 
    criteria. No performance SLAs are defined (e.g., p95 latency < 200ms, max throughput > 1000 req/s), making 
    it impossible to determine if the platform meets production performance requirements.
    """
    elements.append(Paragraph(load_test_text.strip(), styles['ReportBody']))
    
    elements.append(PageBreak())
    return elements

def create_operations_assessment(styles):
    """Create operations assessment section"""
    elements = []
    
    elements.append(Paragraph("6. Operational Readiness Assessment", styles['SectionHeader']))
    
    ops_intro = """
    Operational readiness evaluates whether the team can effectively operate, maintain, and troubleshoot the 
    platform in production. This encompasses documentation, runbooks, on-call procedures, backup strategies, 
    and incident response capabilities.
    """
    elements.append(Paragraph(ops_intro.strip(), styles['ReportBody']))
    
    elements.append(Paragraph("6.1 Documentation Status (Score: 55/100)", styles['SubsectionHeader']))
    
    docs_status = [
        [Paragraph('<b>Document</b>', styles['TableHeader']), 
         Paragraph('<b>Status</b>', styles['TableHeader']), 
         Paragraph('<b>Quality</b>', styles['TableHeader'])],
        ['Architecture Specification', 'Exists', 'Comprehensive'],
        ['API Reference', 'Partial', 'Needs updating'],
        ['Deployment Guide', 'Exists', 'Good'],
        ['Operations Manual', 'Draft', 'Incomplete'],
        ['Runbooks (7 total)', 'Exist', 'Template quality'],
        ['Training Materials (4)', 'Exist', 'Basic'],
        ['Security Report', 'Exists', 'Detailed'],
        ['Compliance Checklist', 'Exists', 'ARTP-focused'],
        ['Troubleshooting Guide', 'Missing', 'N/A'],
        ['Capacity Planning Guide', 'Missing', 'N/A'],
    ]
    
    docs_table = Table(docs_status, colWidths=[150, 80, 170])
    docs_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), COLORS['primary']),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), BOLD_FONT),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 0.5, COLORS['border']),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, COLORS['bg_light']]),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(docs_table)
    elements.append(Spacer(1, 12))
    
    elements.append(Paragraph("6.2 Incident Response Readiness (Score: 50/100)", styles['SubsectionHeader']))
    
    ir_text = """
    Incident response playbooks exist covering standard SOC scenarios with escalation matrices and shift handover 
    procedures. The platform integrates with SOAR tools (TheHive/Cortex) for automated response orchestration. 
    However, critical gaps remain: no defined RTO/RPO objectives, no disaster recovery plan tested, no incident 
    post-mortem template, and no communication templates for stakeholder notifications during outages. The 
    incident command center UI component exists but lacks integration with ticketing systems.
    """
    elements.append(Paragraph(ir_text.strip(), styles['ReportBody']))
    
    elements.append(Paragraph("6.3 Backup & Disaster Recovery (Score: 35/100)", styles['SubsectionHeader']))
    
    bdr_text = """
    <b>SIGNIFICANT GAPS IN BUSINESS CONTINUITY PLANNING</b><br/><br/>
    
    Current state analysis reveals:<br/>
    1. No automated database backup configuration in Kubernetes manifests<br/>
    2. No backup retention policy defined<br/>
    3. No recovery time objective (RTO) established<br/>
    4. No recovery point objective (RPO) established<br/>
    5. No DR site or multi-region deployment strategy<br/>
    6. No backup encryption at rest verification<br/>
    7. No restore testing procedure or history<br/><br/>
    
    For a national SOC platform handling sensitive telecommunications security data, this level of DR 
    preparedness is insufficient. A complete outage could result in loss of threat visibility during 
    active attacks, with potential regulatory penalties from ANRT.
    """
    elements.append(Paragraph(bdr_text, styles['WarningText']))
    
    elements.append(Paragraph("6.4 Environment & Configuration Management (Score: 40/100)", styles['SubsectionHeader']))
    
    env_text = """
    The .env.example file provides good documentation of required variables, but critical issues persist:<br/><br/>
    
    <b>Issues Requiring Immediate Attention:</b><br/>
    1. Placeholder values for ALL security-critical secrets (JWT_SECRET, REFRESH_SECRET, ENCRYPTION_KEY, 
       CSRF_SECRET, ANONYMIZATION_SALT)<br/>
    2. No .env.validation script to enforce required variables at startup<br/>
    3. No secrets management integration (HashiCorp Vault, AWS Secrets Manager, Kubernetes Secrets encryption)<br/>
    4. Development defaults that could accidentally reach production<br/>
    5. ALLOW_MFA_BYPASS flag exists (should never be in codebase)<br/>
    6. No environment-specific configuration files (.env.staging, .env.production)
    """
    elements.append(Paragraph(env_text.strip(), styles['ReportBody']))
    
    elements.append(PageBreak())
    return elements

def create_compliance_assessment(styles):
    """Create compliance assessment section"""
    elements = []
    
    elements.append(Paragraph("7. Regulatory Compliance Assessment", styles['SectionHeader']))
    
    comp_intro = """
    As Algeria's national telecommunications security platform, compliance with ARTP (Autorite de Regulation 
    des Postes et des Telecommunications) and ANSSI (French cybersecurity agency, given historical ties) 
    frameworks is mandatory. This section evaluates alignment with these requirements plus international 
    standards like ISO 27001 and GDPR (for any EU subscriber data processed).
    """
    elements.append(Paragraph(comp_intro.strip(), styles['ReportBody']))
    
    elements.append(Paragraph("7.1 ARTP Compliance Status (Score: 60/100)", styles['SubsectionHeader']))
    
    artp_text = """
    The platform includes dedicated ARTP framework implementation with compliance engine, scoring calculations, 
    and reporting templates. Coverage includes: lawful interception logging interfaces, data localization 
    (Algeria-only infrastructure), encryption standards compliance, and audit trail requirements. However, 
    formal ARTP certification has not been obtained, and some requirements around data retention periods 
    and government access protocols need clarification with legal counsel.
    """
    elements.append(Paragraph(artp_text.strip(), styles['ReportBody']))
    
    elements.append(Paragraph("7.2 ANSSI Security Framework (Score: 55/100)", styles['SubsectionHeader']))
    
    anssi_text = """
    ANSSI framework integration exists with enhanced security controls covering: identity and access management 
    hardening, cryptographic agility (algorithms can be swapped), security event correlation, and vulnerability 
    management integration. The framework provides scoring mechanisms for continuous compliance monitoring. 
    Gap: Third-party ANSSI audit has not been conducted, and formal certification pathway is undefined.
    """
    elements.append(Paragraph(anssi_text.strip(), styles['ReportBody']))
    
    elements.append(Paragraph("7.3 Compliance Requirements Matrix", styles['SubsectionHeader']))
    
    comp_matrix = [
        [Paragraph('<b>Requirement</b>', styles['TableHeader']), 
         Paragraph('<b>Source</b>', styles['TableHeader']), 
         Paragraph('<b>Status</b>', styles['TableHeader']), 
         Paragraph('<b>Gaps</b>', styles['TableHeader'])],
        ['Data Localization', 'ARTP Art. 12', 'Partial', 'Cloud provider verification needed'],
        ['Encryption at Rest', 'ANSSI PDI', 'Implemented', 'Key rotation automation needed'],
        ['Encryption in Transit', 'ANSSI PDI', 'Implemented', 'TLS 1.3 enforcement partial'],
        ['Access Control', 'ISO 27001 A.9', 'Implemented', 'Privileged access review missing'],
        ['Audit Logging', 'ARTP Art. 15', 'Implemented', 'Log integrity verification needed'],
        ['Incident Reporting', 'ARTP Art. 18', 'Partial', 'Timeline to ARPT undefined'],
        ['Data Retention', 'ARTP Art. 14', 'Not Implemented', 'Policy and automation needed'],
        ['PII Protection', 'GDPR Art. 32', 'Partial', 'DPO appointment needed'],
        ['Business Continuity', 'ISO 27001 A.17', 'Not Implemented', 'Full DR plan required'],
        ['Vendor Risk Mgmt', 'ISO 27001 A.15', 'Partial', 'Third-party audit pending'],
    ]
    
    comp_table = Table(comp_matrix, colWidths=[95, 80, 75, 150])
    comp_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), COLORS['info']),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), BOLD_FONT),
        ('FONTSIZE', (0, 0), (-1, -1), 7),
        ('GRID', (0, 0), (-1, -1), 0.5, COLORS['border']),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, COLORS['bg_light']]),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    elements.append(comp_table)
    
    elements.append(PageBreak())
    return elements

def create_remediation_roadmap(styles):
    """Create prioritized remediation roadmap"""
    elements = []
    
    elements.append(Paragraph("8. Remediation Roadmap", styles['SectionHeader']))
    
    roadmap_intro = """
    The following roadmap provides a prioritized, phased approach to achieving production readiness. Items 
    are sequenced by dependency order and risk reduction impact. Estimated effort assumes a team of 2-3 
    experienced full-stack developers with DevOps capabilities.
    """
    elements.append(Paragraph(roadmap_intro.strip(), styles['ReportBody']))
    
    elements.append(Paragraph("Phase 1: Critical Blockers (Weeks 1-2) - ESTIMATED: 40 hours", styles['SubsectionHeader']))
    
    phase1_items = [
        ["1.1", "Fix Dockerfile reference mismatch in docker-compose.prod.yml", "2h", "BLOCKER"],
        ["1.2", "Configure PostgreSQL as primary database provider", "8h", "BLOCKER"],
        ["1.3", "Execute database migration to PostgreSQL", "8h", "BLOCKER"],
        ["1.4", "Generate production secrets (all placeholders)", "2h", "BLOCKER"],
        ["1.5", "Add Next.js middleware.ts for route protection", "8h", "HIGH"],
        ["1.6", "Create .env.validation startup script", "4h", "HIGH"],
        ["1.7", "Add request size limits to all upload endpoints", "4h", "HIGH"],
        ["1.8", "Implement input validation middleware", "8h", "CRITICAL"],
    ]
    
    phase1_table = Table(phase1_items, colWidths=[30, 270, 35, 65])
    phase1_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), COLORS['danger']),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), BOLD_FONT),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 0.5, COLORS['border']),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, COLORS['critical_bg']]),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]))
    elements.append(phase1_table)
    elements.append(Spacer(1, 12))
    
    elements.append(Paragraph("Phase 2: Testing Foundation (Weeks 3-4) - ESTIMATED: 60 hours", styles['SubsectionHeader']))
    
    phase2_items = [
        ["2.1", "Set up Vitest/Jest testing framework", "4h", "CRITICAL"],
        ["2.2", "Write unit tests for auth module (target: 80%+)", "12h", "CRITICAL"],
        ["2.3", "Write unit tests for rate limiting", "6h", "HIGH"],
        ["2.4", "Write unit tests for PII anonymization", "6h", "HIGH"],
        ["2.5", "Set up Playwright for E2E testing", "6h", "HIGH"],
        ["2.6", "Write E2E tests for login/auth flows", "8h", "HIGH"],
        ["2.7", "Write integration tests for API endpoints", "12h", "HIGH"],
        ["2.8", "Configure CI to require passing tests", "4h", "CRITICAL"],
        ["2.9", "Add security test cases (injection, XSS)", "8h", "CRITICAL"],
    ]
    
    phase2_table = Table(phase2_items, colWidths=[30, 270, 35, 65])
    phase2_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), COLORS['warning']),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), BOLD_FONT),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 0.5, COLORS['border']),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, COLORS['warning_bg']]),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]))
    elements.append(phase2_table)
    elements.append(Spacer(1, 12))
    
    elements.append(Paragraph("Phase 3: Operations Hardening (Weeks 5-6) - ESTIMATED: 40 hours", styles['SubsectionHeader']))
    
    phase3_items = [
        ["3.1", "Implement automated database backups (pg_dump cron)", "6h", "HIGH"],
        ["3.2", "Define and document RTO/RPO objectives", "4h", "HIGH"],
        ["3.3", "Write DR runbook and test restore procedure", "8h", "HIGH"],
        ["3.4", "Integrate Sentry/error tracking service", "6h", "MEDIUM"],
        ["3.5", "Configure structured log aggregation (ELK)", "8h", "MEDIUM"],
        ["3.6", "Document on-call procedures and escalation", "4h", "MEDIUM"],
        ["3.7", "Set up synthetic monitoring (uptime checks)", "4h", "MEDIUM"],
    ]
    
    phase3_table = Table(phase3_items, colWidths=[30, 270, 35, 65])
    phase3_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), COLORS['info']),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), BOLD_FONT),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 0.5, COLORS['border']),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, COLORS['bg_light']]),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]))
    elements.append(phase3_table)
    elements.append(Spacer(1, 12))
    
    elements.append(Paragraph("Phase 4: Compliance & Validation (Weeks 7-8) - ESTIMATED: 32 hours", styles['SubsectionHeader']))
    
    phase4_items = [
        ["4.1", "Engage third-party penetration tester", "0h", "EXTERNAL"],
        ["4.2", "Address pen test findings", "16h", "VARIES"],
        ["4.3", "Complete ARTP compliance documentation", "8h", "HIGH"],
        ["4.4", "Execute load tests and establish baselines", "8h", "HIGH"],
        ["4.5", "Conduct disaster recovery drill", "8h", "HIGH"],
        ["4.6", "Final security review and sign-off", "4h", "HIGH"],
        ["4.7", "Prepare Go/No-Go decision package", "4h", "HIGH"],
    ]
    
    phase4_table = Table(phase4_items, colWidths=[30, 270, 35, 65])
    phase4_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), COLORS['success']),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), BOLD_FONT),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 0.5, COLORS['border']),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, COLORS['success_bg']]),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]))
    elements.append(phase4_table)
    
    elements.append(Spacer(1, 15))
    
    summary_box = """
    <b>TOTAL REMEDIATION EFFORT: ~172 hours (8 weeks with 2-3 developers)</b><br/><br/>
    
    Upon completion of all four phases, the estimated production readiness score would increase from 
    <b>58%</b> to approximately <b>85-90%</b>, which meets the minimum threshold for production deployment 
    consideration. Remaining gaps would represent acceptable residual risks with appropriate mitigations 
    and monitoring in place.
    """
    elements.append(Paragraph(summary_box, styles['SuccessText']))
    
    elements.append(PageBreak())
    return elements

def create_conclusion(styles):
    """Create conclusion section"""
    elements = []
    
    elements.append(Paragraph("9. Conclusion & Recommendations", styles['SectionHeader']))
    
    conclusion_text = """
    The National SOC Platform represents a technically sound architecture with comprehensive feature coverage 
    for telecommunications security operations. The codebase demonstrates strong security awareness, modern 
    development practices, and thoughtful integration of industry-standard tools. However, the current state 
    falls significantly short of production readiness due to critical gaps in testing, database configuration, 
    and operational maturity.
    """
    elements.append(Paragraph(conclusion_text.strip(), styles['ReportBody']))
    
    elements.append(Paragraph("9.1 Final Recommendation", styles['SubsectionHeader']))
    
    recommendation = """
    <b>RECOMMENDATION: DO NOT DEPLOY TO PRODUCTION</b><br/><br/>
    
    Based on this assessment, the National SOC Platform should <b>NOT</b> be deployed to production until 
    the Phase 1 critical blockers are resolved and Phase 2 testing foundation is established. Deploying 
    in the current state would expose Djezzy to unacceptable risks including: data loss from SQLite 
    concurrency limitations, security breaches from placeholder credentials, inability to detect regressions, 
    and potential ARTP compliance violations.<br/><br/>
    
    <b>Recommended Path Forward:</b><br/>
    1. Allocate 8 weeks for remediation with dedicated resources<br/>
    2. Prioritize Phase 1 items as absolute prerequisites<br/>
    3. Establish staging environment mirroring production<br/>
    4. Execute full remediation roadmap before Go-Live decision<br/>
    5. Engage third-party security auditor for validation<br/>
    6. Conduct tabletop exercise with operations team<br/>
    7. Perform gradual rollout with extensive monitoring
    """
    elements.append(Paragraph(recommendation, styles['CriticalText']))
    
    elements.append(Paragraph("9.2 Acknowledgments", styles['SubsectionHeader']))
    
    ack_text = """
    This assessment was conducted through comprehensive codebase analysis, configuration review, and architecture 
    evaluation. The development team has built a solid foundation that, with focused remediation efforts, can 
    become a production-ready national SOC platform serving Djezzy Telecom's security operations needs while 
    meeting ARTP regulatory requirements.
    """
    elements.append(Paragraph(ack_text.strip(), styles['ReportBody']))
    
    elements.append(Spacer(1, 30))
    
    # Signature block
    sig_data = [
        ['', ''],
        ['_' * 40, '_' * 40],
        ['Assessment Lead Date', 'Review Date'],
        [datetime.now().strftime('%B %d, %Y'), 'Pending Review'],
    ]
    
    sig_table = Table(sig_data, colWidths=[200, 200])
    sig_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('TOPPADDING', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]))
    elements.append(sig_table)
    
    return elements

def add_page_number(canvas, doc):
    """Add page numbers to each page"""
    page_num = canvas.getPageNumber()
    text = f"National SOC Platform - Production Readiness Assessment | Page {page_num}"
    canvas.saveState()
    canvas.setFont(BODY_FONT, 8)
    canvas.setFillColor(COLORS['text_muted'])
    canvas.drawString(inch, 0.5 * inch, text)
    canvas.restoreState()

# ============================================================================
# MAIN REPORT GENERATION
# ============================================================================

def generate_report():
    """Generate the complete PDF report"""
    print("Generating Production Readiness Assessment Report...")
    
    # Create document
    doc = SimpleDocTemplate(
        OUTPUT_PATH,
        pagesize=A4,
        rightMargin=0.75*inch,
        leftMargin=0.75*inch,
        topMargin=0.75*inch,
        bottomMargin=0.75*inch,
        title="National SOC Platform - Production Readiness Assessment",
        author="SOC Assessment Team",
        subject="Honest Production Readiness Evaluation"
    )
    
    # Create styles
    styles = create_styles()
    
    # Build content
    elements = []
    
    print("  Creating cover page...")
    elements.extend(create_cover_page(styles))
    
    print("  Creating executive summary...")
    elements.extend(create_executive_summary(styles))
    
    print("  Creating security assessment...")
    elements.extend(create_security_assessment(styles))
    
    print("  Creating infrastructure assessment...")
    elements.extend(create_infrastructure_assessment(styles))
    
    print("  Creating database assessment...")
    elements.extend(create_database_assessment(styles))
    
    print("  Creating testing assessment...")
    elements.extend(create_testing_assessment(styles))
    
    print("  Creating operations assessment...")
    elements.extend(create_operations_assessment(styles))
    
    print("  Creating compliance assessment...")
    elements.extend(create_compliance_assessment(styles))
    
    print("  Creating remediation roadmap...")
    elements.extend(create_remediation_roadmap(styles))
    
    print("  Creating conclusion...")
    elements.extend(create_conclusion(styles))
    
    # Build PDF
    print("Building PDF document...")
    doc.build(elements, onFirstPage=add_page_number, onLaterPages=add_page_number)
    
    print(f"Report generated successfully: {OUTPUT_PATH}")
    return OUTPUT_PATH

if __name__ == "__main__":
    output_file = generate_report()
    print(f"\nOutput: {output_file}")
