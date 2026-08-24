#!/usr/bin/env python3
"""
CyberSOC Platform - Go-Live Implementation Roadmap
==================================================
Master document covering all remaining steps for production deployment.
Comprehensive 6-phase plan with detailed tasks, dependencies, and timelines.
"""

import os
import sys
from datetime import datetime
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm, cm

# Point unit (1 point = 1/72 inch)
pt = 1

from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, ListFlowable, ListItem, KeepTogether
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# FONT REGISTRATION
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FONT_DIR = '/usr/share/fonts'

# Primary Chinese font - Noto Serif SC
pdfmetrics.registerFont(TTFont('NotoSerifSC', f'{FONT_DIR}/truetype/noto-serif-sc/NotoSerifSC-Regular.ttf'))
pdfmetrics.registerFont(TTFont('NotoSerifSC-Bold', f'{FONT_DIR}/truetype/noto-serif-sc/NotoSerifSC-Bold.ttf'))
registerFontFamily('NotoSerifSC', normal='NotoSerifSC', bold='NotoSerifSC-Bold')

# Mono font for technical content
pdfmetrics.registerFont(TTFont('SarasaMonoSC', f'{FONT_DIR}/truetype/chinese/SarasaMonoSC-Regular.ttf'))

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# CASCADE PALETTE (V2) - Consistent with previous CyberSOC documents
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PAGE_BG       = colors.HexColor('#f2f1f0')
SECTION_BG    = colors.HexColor('#ebeae9')
CARD_BG       = colors.HexColor('#efeeec')
TABLE_STRIPE  = colors.HexColor('#f5f5f3')
HEADER_FILL   = colors.HexColor('#6f6751')
COVER_BLOCK   = colors.HexColor('#665f4a')
BORDER        = colors.HexColor('#cfc9b8')
ICON          = colors.HexColor('#9e8847')
ACCENT        = colors.HexColor('#8d7325')
ACCENT_2      = colors.HexColor('#5e42b1')
TEXT_PRIMARY   = colors.HexColor('#242320')
TEXT_MUTED     = colors.HexColor('#8a8881')
SEM_SUCCESS   = colors.HexColor('#418a59')
SEM_WARNING   = colors.HexColor('#a7894e')
SEM_ERROR     = colors.HexColor('#b1554d')
SEM_INFO      = colors.HexColor('#4b729a')

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# CUSTOM STYLES
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
styles = getSampleStyleSheet()

styles.add(ParagraphStyle(name='DocTitle', fontName='NotoSerifSC-Bold', fontSize=26, leading=34,
    alignment=TA_CENTER, textColor=TEXT_PRIMARY, spaceAfter=10*mm))
styles.add(ParagraphStyle(name='Subtitle', fontName='NotoSerifSC', fontSize=13, leading=18,
    alignment=TA_CENTER, textColor=TEXT_MUTED, spaceAfter=6*mm))
styles.add(ParagraphStyle(name='SectionHeading', fontName='NotoSerifSC-Bold', fontSize=16, leading=24,
    textColor=HEADER_FILL, spaceBefore=16*pt, spaceAfter=8*pt))
styles.add(ParagraphStyle(name='SubsectionHeading', fontName='NotoSerifSC-Bold', fontSize=13, leading=19,
    textColor=ICON, spaceBefore=12*pt, spaceAfter=6*pt))
styles.add(ParagraphStyle(name='H3Heading', fontName='NotoSerifSC-Bold', fontSize=11, leading=15,
    textColor=TEXT_PRIMARY, spaceBefore=9*pt, spaceAfter=5*pt))
styles.add(ParagraphStyle(name='CustomBody', fontName='NotoSerifSC', fontSize=10, leading=17,
    alignment=TA_JUSTIFY, textColor=TEXT_PRIMARY, spaceBefore=3*pt, spaceAfter=7*pt, firstLineIndent=18*pt))
styles.add(ParagraphStyle(name='BodyNoIndent', fontName='NotoSerifSC', fontSize=10, leading=17,
    alignment=TA_JUSTIFY, textColor=TEXT_PRIMARY, spaceBefore=3*pt, spaceAfter=7*pt))
styles.add(ParagraphStyle(name='TableHeader', fontName='NotoSerifSC-Bold', fontSize=9, leading=12,
    alignment=TA_CENTER, textColor=colors.white))
styles.add(ParagraphStyle(name='TableCell', fontName='NotoSerifSC', fontSize=9, leading=12,
    alignment=TA_LEFT, textColor=TEXT_PRIMARY))
styles.add(ParagraphStyle(name='TableCellCenter', fontName='NotoSerifSC', fontSize=9, leading=12,
    alignment=TA_CENTER, textColor=TEXT_PRIMARY))
styles.add(ParagraphStyle(name='TechText', fontName='SarasaMonoSC', fontSize=8.5, leading=12,
    alignment=TA_LEFT, textColor=TEXT_PRIMARY, backColor=CARD_BG, borderPadding=5*pt))
styles.add(ParagraphStyle(name='BulletText', fontName='NotoSerifSC', fontSize=9.5, leading=15,
    alignment=TA_LEFT, textColor=TEXT_PRIMARY, leftIndent=14*pt, bulletIndent=5*pt))
styles.add(ParagraphStyle(name='Caption', fontName='NotoSerifSC', fontSize=8.5, leading=12,
    alignment=TA_CENTER, textColor=TEXT_MUTED, spaceBefore=3*pt, spaceAfter=8*pt))

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# DOCUMENT SETUP
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OUTPUT_DIR = '/home/z/my-project/download'
os.makedirs(OUTPUT_DIR, exist_ok=True)

output_path = os.path.join(OUTPUT_DIR, 'Cybersoc_GoLive_Implementation_Roadmap.pdf')

doc = SimpleDocTemplate(
    output_path, pagesize=A4,
    leftMargin=20*mm, rightMargin=20*mm,
    topMargin=18*mm, bottomMargin=18*mm
)

story = []

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# HELPER FUNCTIONS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
def create_section_table(data, col_widths=None, header_rows=1):
    if col_widths is None:
        available_width = doc.width
        col_count = len(data[0])
        col_widths = [available_width / col_count] * col_count
    
    table = Table(data, colWidths=col_widths, repeatRows=header_rows)
    
    style_commands = [
        ('BACKGROUND', (0, 0), (-1, header_rows-1), HEADER_FILL),
        ('TEXTCOLOR', (0, 0), (-1, header_rows-1), colors.white),
        ('FONTNAME', (0, 0), (-1, header_rows-1), 'NotoSerifSC-Bold'),
        ('FONTSIZE', (0, 0), (-1, header_rows-1), 9),
        ('ALIGN', (0, 0), (-1, header_rows-1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, header_rows-1), 8),
        ('TOPPADDING', (0, 0), (-1, header_rows-1), 8),
        ('FONTNAME', (0, header_rows), (-1, -1), 'NotoSerifSC'),
        ('FONTSIZE', (0, header_rows), (-1, -1), 8.5),
        ('TEXTCOLOR', (0, header_rows), (-1, -1), TEXT_PRIMARY),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
        ('LINEBELOW', (0, header_rows-1), (-1, header_rows-1), 1.2, ACCENT),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, header_rows), (-1, -1), 5),
        ('BOTTOMPADDING', (0, header_rows), (-1, -1), 5),
        ('ROWBACKGROUNDS', (0, header_rows), (-1, -1), [colors.white, TABLE_STRIPE]),
    ]
    
    table.setStyle(TableStyle(style_commands))
    return table


def add_paragraph(text, style_name='CustomBody'):
    story.append(Paragraph(text, styles[style_name]))


def add_bullet_list(items):
    bullet_items = []
    for item in items:
        bullet_items.append(ListItem(
            Paragraph(item, styles['BulletText']),
            leftIndent=14*pt, bulletColor=ACCENT
        ))
    story.append(ListFlowable(bullet_items, bulletType='bullet', start='circle'))


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# COVER PAGE
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
story.append(Spacer(1, 35*mm))
story.append(Paragraph("CyberSOC Platform", styles['DocTitle']))
story.append(Spacer(1, 4*mm))
story.append(Paragraph("Go-Live Implementation Roadmap", styles['DocTitle']))
story.append(Spacer(1, 6*mm))
story.append(Paragraph(
    "Complete Production Deployment Guide<br/>"
    "6 Phases | 42 Workstreams | 180+ Tasks",
    styles['Subtitle']
))
story.append(Spacer(1, 12*mm))

cover_info = [
    [Paragraph("<b>Document Type</b>", styles['TableHeader']), 
     Paragraph("Implementation Roadmap", styles['TableCellCenter'])],
    [Paragraph("<b>Version</b>", styles['TableHeader']), 
     Paragraph("1.0.0", styles['TableCellCenter'])],
    [Paragraph("<b>Date</b>", styles['TableHeader']), 
     Paragraph(datetime.now().strftime("%Y-%m-%d"), styles['TableCellCenter'])],
    [Paragraph("<b>Total Duration</b>", styles['TableHeader']), 
     Paragraph("16-24 Weeks", styles['TableCellCenter'])],
]
cover_table = Table(cover_info, colWidths=[70*mm, 55*mm])
cover_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (0, -1), SECTION_BG),
    ('BACKGROUND', (1, 0), (1, -1), CARD_BG),
    ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('LEFTPADDING', (0, 0), (-1, -1), 10),
    ('RIGHTPADDING', (0, 0), (-1, -1), 10),
    ('TOPPADDING', (0, 0), (-1, -1), 7),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 7),
]))
story.append(cover_table)

story.append(PageBreak())

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# TABLE OF CONTENTS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
story.append(Paragraph("Table of Contents", styles['SectionHeading']))
story.append(Spacer(1, 6*mm))

toc_data = [
    ("1.", "Executive Summary & Current Status", "Completed work and remaining scope"),
    ("2.", "Phase 1: Core Platform Completion", "Admin Interface + API Gateway + Auth"),
    ("3.", "Phase 2: Infrastructure & Deployment", "Kubernetes + Database + CI/CD"),
    ("4.", "Phase 3: Security Hardening", "Audit + Compliance + Penetration Testing"),
    ("5.", "Phase 4: Quality Assurance", "Testing Strategy + Performance + Validation"),
    ("6.", "Phase 5: Operations & Support", "Monitoring + Runbooks + Documentation"),
    ("7.", "Phase 6: Launch Preparation", "Pilot Program + GA Readiness"),
    ("8.", "Master Timeline & Critical Path", "Gantt overview + dependencies"),
    ("9.", "Resource Requirements", "Team structure + skills needed"),
    ("10.", "Risk Register & Mitigation", "Key risks and contingency plans"),
]

for num, title, desc in toc_data:
    story.append(Paragraph(f"<b>{num} {title}</b><br/><font color='{TEXT_MUTED.hexval()}' size='8'>{desc}</font>", 
                          styles['BodyNoIndent']))
    story.append(Spacer(1, 2*mm))

story.append(PageBreak())

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SECTION 1: EXECUTIVE SUMMARY
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
story.append(Paragraph("1. Executive Summary & Current Status", styles['SectionHeading']))

add_paragraph(
    "This Go-Live Implementation Roadmap provides a comprehensive blueprint for deploying the CyberSOC Platform "
    "into production environment. The CyberSOC Platform is an AI-Native Security Operations Center operating "
    "system comprising 41 integrated modules spanning SIEM, XDR, SOAR, UEBA, Threat Intelligence, and advanced "
    "AI-driven security capabilities. The platform has undergone extensive specification development including "
    "benchmark analysis against 12 enterprise competitors, module coverage auditing confirming 90%+ feature "
    "completeness across all functional areas, and architectural expansion addressing Kubernetes deployment, "
    "known limitations documentation, and technical debt tracking frameworks."
)

add_paragraph(
    "The current status reflects significant progress in design and specification phases while identifying "
    "critical gaps requiring focused execution before production deployment can proceed safely. The billing "
    "and licensing architecture has been fully specified supporting six distinct tiers: Free, Professional, "
    "Business, Enterprise, Government, and On-Premise deployments. This commercial framework provides the "
    "foundation for sustainable operations but requires integration with the administrative interface and "
    "underlying infrastructure components that form the focus of this implementation roadmap."
)

story.append(Paragraph("1.1 Completed Deliverables", styles['SubsectionHeading']))

completed_items = [
    "<b>Benchmark Analysis Document:</b> 20-page competitive analysis comparing CyberSOC against 12 enterprise SIEM/SOAR platforms",
    "<b>Module Coverage Audit:</b> Comprehensive verification of all 41 modules with 90%+ feature coverage confirmed",
    "<b>Expansion Document:</b> 14-page technical expansion covering K8s architecture, limitations register, and technical debt tracking",
    "<b>Billing & Licensing Architecture:</b> 28-page complete specification with 6-tier pricing model, feature matrices, and compliance frameworks",
]
add_bullet_list(completed_items)

story.append(Paragraph("1.2 Remaining Scope Summary", styles['SubsectionHeading']))

scope_summary = [
    [Paragraph("<b>Phase</b>", styles['TableHeader']),
     Paragraph("<b>Focus Area</b>", styles['TableHeader']),
     Paragraph("<b>Duration</b>", styles['TableHeader']),
     Paragraph("<b>Tasks</b>", styles['TableHeader']),
     Paragraph("<b>Status</b>", styles['TableHeader'])],
    ["Phase 1", "Core Platform (Admin + Auth)", "6-9 weeks", "~35 tasks", "Not Started"],
    ["Phase 2", "Infrastructure & Deployment", "5-6 weeks", "~28 tasks", "Not Started"],
    ["Phase 3", "Security Hardening", "10-14 weeks*", "~32 tasks", "Not Started"],
    ["Phase 4", "Quality Assurance", "5-7 weeks", "~30 tasks", "Not Started"],
    ["Phase 5", "Operations & Support", "5-6 weeks", "~25 tasks", "Not Started"],
    ["Phase 6", "Launch Preparation", "6-9 weeks", "~30 tasks", "Not Started"],
]

scope_table = create_section_table(scope_summary,
    col_widths=[22*mm, 48*mm, 25*mm, 22*mm, 25*mm])
story.append(scope_table)
story.append(Paragraph("* Phase 3 runs in parallel with other phases where possible", styles['Caption']))

story.append(PageBreak())

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SECTION 2: PHASE 1 - CORE PLATFORM COMPLETION
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
story.append(Paragraph("2. Phase 1: Core Platform Completion", styles['SectionHeading']))

add_paragraph(
    "Phase 1 addresses the most critical gap in the current platform state: the absence of a comprehensive "
    "administrative interface and the authentication/authorization infrastructure necessary for secure operations. "
    "The Admin Interface serves as the central control plane for all platform management activities including user "
    "provisioning, role assignment, tenant configuration (for MSSP deployments), system monitoring, license "
    "management, and integration administration. Without this component, operational teams lack the tools required "
    "for day-to-day platform management, creating dependency on engineering resources for routine tasks that should "
    "be self-service capable."
)

story.append(Paragraph("2.1 Admin Interface Development", styles['SubsectionHeading']))

add_paragraph(
    "The Admin Interface must support multiple administrator personas with varying permission levels and "
    "operational scopes. Super Administrators require full system access including tenant creation, global "
    "configuration changes, and billing oversight. Organization Administrators manage users and settings within "
    "their assigned organizational boundaries. Billing Administrators handle financial operations including invoice "
    "review, payment processing, and credit adjustments. Read-Only Observers access dashboards and reports without "
    "modification capabilities. The interface architecture follows a modular component approach enabling phased "
    "delivery of capability groups while maintaining consistent user experience patterns."
)

admin_tasks = [
    [Paragraph("<b>Task ID</b>", styles['TableHeader']),
     Paragraph("<b>Task Description</b>", styles['TableHeader']),
     Paragraph("<b>Priority</b>", styles['TableHeader']),
     Paragraph("<b>Effort</b>", styles['TableHeader']),
     Paragraph("<b>Dependencies</b>", styles['TableHeader'])],
    ["1.1", "Admin UI Framework Setup (React/Vue scaffold)", "Critical", "3 days", "None"],
    ["1.2", "User Management Module (CRUD)", "Critical", "5 days", "1.1"],
    ["1.3", "Role-Based Access Control UI", "Critical", "4 days", "1.1"],
    ["1.4", "Tenant Management (MSSP multi-tenancy)", "High", "6 days", "1.2, 1.3"],
    ["1.5", "System Configuration Dashboard", "High", "5 days", "1.1"],
    ["1.6", "License Management Interface", "High", "4 days", "Billing API"],
    ["1.7", "Integration Management Console", "Medium", "4 days", "1.1"],
    ["1.8", "Audit Log Viewer & Export", "Medium", "3 days", "1.2"],
    ["1.9", "Health Monitoring Dashboard", "High", "4 days", "Monitoring APIs"],
    ["1.10", "Backup/Restore Controls", "Medium", "3 days", "Infrastructure"],
]

admin_table = create_section_table(admin_tasks,
    col_widths=[15*mm, 60*mm, 20*mm, 18*mm, 33*mm])
story.append(admin_table)
story.append(Paragraph("Table 2.1: Admin Interface Development Tasks", styles['Caption']))

story.append(Paragraph("2.2 API Gateway & Authentication System", styles['SubsectionHeading']))

add_paragraph(
    "The API Gateway serves as the unified entry point for all platform traffic, implementing cross-cutting "
    "concerns including authentication, authorization, rate limiting, request routing, and logging. The gateway "
    "must integrate with enterprise identity providers through standard protocols (OAuth 2.0, OpenID Connect, SAML) "
    "while supporting service-to-service authentication via mTLS and API keys. Rate limiting policies protect "
    "backend services from overload while ensuring fair resource allocation across tenants and user categories. "
    "The authentication system implements a zero-trust architecture where every request carries verifiable credentials "
    "and authorization decisions occur at multiple enforcement points throughout the request lifecycle."
)

auth_tasks = [
    [Paragraph("<b>Task ID</b>", styles['TableHeader']),
     Paragraph("<b>Task Description</b>", styles['TableHeader']),
     Paragraph("<b>Priority</b>", styles['TableHeader']),
     Paragraph("<b>Effort</b>", styles['TableHeader']),
     Paragraph("<b>Dependencies</b>", styles['TableHeader'])],
    ["2.1", "API Gateway Deployment (Kong/Ambassador)", "Critical", "4 days", "K8s Cluster"],
    ["2.2", "OAuth 2.0 / OIDC Provider Integration", "Critical", "5 days", "2.1"],
    ["2.3", "SAML SSO Configuration", "High", "3 days", "2.2"],
    ["2.4", "mTLS Service Mesh Setup", "High", "4 days", "K8s Cluster"],
    ["2.5", "API Key Management System", "High", "3 days", "2.1"],
    ["2.6", "Rate Limiting Policies", "Medium", "2 days", "2.1"],
    ["2.7", "JWT Token Lifecycle Management", "Critical", "3 days", "2.2"],
    ["2.8", "Session Management & Refresh", "High", "2 days", "2.7"],
    ["2.9", "Multi-Factor Authentication", "High", "4 days", "2.2"],
    ["2.10", "Password Policy Enforcement", "Medium", "2 days", "2.2"],
]

auth_table = create_section_table(auth_tasks,
    col_widths=[15*mm, 58*mm, 20*mm, 18*mm, 35*mm])
story.append(auth_table)
story.append(Paragraph("Table 2.2: API Gateway & Authentication Tasks", styles['Caption']))

story.append(PageBreak())

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SECTION 3: PHASE 2 - INFRASTRUCTURE & DEPLOYMENT
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
story.append(Paragraph("3. Phase 2: Infrastructure & Deployment", styles['SectionHeading']))

add_paragraph(
    "Phase 2 establishes the production-grade infrastructure foundation upon which all CyberSOC services operate. "
    "The Kubernetes-based deployment architecture provides scalability, resilience, and operational efficiency "
    "through container orchestration, automated scaling, and self-healing capabilities. This phase encompasses "
    "cluster provisioning, Helm chart finalization for all platform components, database schema migration and "
    "data pipeline establishment, continuous integration/deployment pipeline automation, and secret management "
    "implementation protecting sensitive credentials and configuration values throughout the environment."
)

story.append(Paragraph("3.1 Kubernetes Production Environment", styles['SubsectionHeading']))

k8s_tasks = [
    [Paragraph("<b>Task ID</b>", styles['TableHeader']),
     Paragraph("<b>Task Description</b>", styles['TableHeader']),
     Paragraph("<b>Priority</b>", styles['TableHeader']),
     Paragraph("<b>Effort</b>", styles['TableHeader']),
     Paragraph("<b>Dependencies</b>", styles['TableHeader'])],
    ["3.1", "Production K8s Cluster Provisioning", "Critical", "3 days", "Cloud Account"],
    ["3.2", "Helm Charts Finalization (all services)", "Critical", "5 days", "3.1"],
    ["3.3", "Namespace & Resource Quota Design", "High", "2 days", "3.1"],
    ["3.4", "Ingress Controller & TLS Setup", "Critical", "3 days", "3.1"],
    ["3.5", "Persistent Volume Classes Config", "High", "2 days", "3.1"],
    ["3.6", "Pod Security Policies / Pod Standards", "High", "2 days", "3.1"],
    ["3.7", "Horizontal Pod Autoscaler Config", "Medium", "2 days", "3.2"],
    ["3.8", "Network Policies (Zero-Trust)", "High", "3 days", "3.1"],
    ["3.9", "Backup/Restore for K8s Resources", "Critical", "3 days", "3.1"],
    ["3.10", "Multi-Environment Setup (Dev/Stag/Prod)", "High", "4 days", "3.2"],
]

k8s_table = create_section_table(k8s_tasks,
    col_widths=[15*mm, 58*mm, 20*mm, 18*mm, 35*mm])
story.append(k8s_table)
story.append(Paragraph("Table 3.1: Kubernetes Infrastructure Tasks", styles['Caption']))

story.append(Paragraph("3.2 Database & Data Pipeline", styles['SubsectionHeading']))

db_tasks = [
    [Paragraph("<b>Task ID</b>", styles['TableHeader']),
     Paragraph("<b>Task Description</b>", styles['TableHeader']),
     Paragraph("<b>Priority</b>", styles['TableHeader']),
     Paragraph("<b>Effort</b>", styles['TableHeader']),
     Paragraph("<b>Dependencies</b>", styles['TableHeader'])],
    ["3.11", "PostgreSQL Cluster Setup (HA)", "Critical", "3 days", "K8s Ready"],
    ["3.12", "Schema Migration Scripts", "Critical", "4 days", "3.11"],
    ["3.13", "ClickHouse/Time-Series DB Setup", "High", "3 days", "K8s Ready"],
    ["3.14", "Redis Cache Cluster Config", "High", "2 days", "K8s Ready"],
    ["3.15", "Data Retention Policy Implementation", "High", "2 days", "3.12, 3.13"],
    ["3.16", "Database Backup Automation", "Critical", "2 days", "3.11, 3.13"],
    ["3.17", "Connection Pooling (PgBouncer)", "Medium", "1 day", "3.11"],
    ["3.18", "Elasticsearch/OpenSearch Cluster", "High", "3 days", "K8s Ready"],
    ["3.19", "Kafka/Event Streaming Setup", "High", "3 days", "K8s Ready"],
    ["3.20", "Data Pipeline Orchestration (Airflow)", "Medium", "3 days", "3.13, 3.18"],
]

db_table = create_section_table(db_tasks,
    col_widths=[15*mm, 58*mm, 20*mm, 18*mm, 35*mm])
story.append(db_table)
story.append(Paragraph("Table 3.2: Database & Data Pipeline Tasks", styles['Caption']))

story.append(Paragraph("3.3 CI/CD Pipeline Automation", styles['SubsectionHeading']))

cicd_tasks = [
    [Paragraph("<b>Task ID</b>", styles['TableHeader']),
     Paragraph("<b>Task Description</b>", styles['TableHeader']),
     Paragraph("<b>Priority</b>", styles['TableHeader']),
     Paragraph("<b>Effort</b>", styles['TableHeader']),
     Paragraph("<b>Dependencies</b>", styles['TableHeader'])],
    ["3.21", "GitOps Repository Structure", "Critical", "2 days", "None"],
    ["3.22", "GitHub Actions/GitLab CI Pipelines", "Critical", "4 days", "3.21"],
    ["3.23", "Container Registry Setup", "Critical", "1 day", "Cloud Account"],
    ["3.24", "Image Scanning (Trivy/Grype)", "High", "2 days", "3.23"],
    ["3.25", "Automated Testing Integration", "High", "3 days", "3.22"],
    ["3.26", "Deployment Automation (ArgoCD)", "Critical", "3 days", "3.21, 3.2"],
    ["3.27", "Environment Promotion Workflow", "Medium", "2 days", "3.26"],
    ["3.28", "Secret Injection (External Secrets)", "High", "2 days", "Vault Setup"],
    ["3.29", "Feature Flag Integration", "Medium", "2 days", "3.22"],
    ["3.30", "Rollback Procedures Automation", "High", "2 days", "3.26"],
]

cicd_table = create_section_table(cicd_tasks,
    col_widths=[15*mm, 58*mm, 20*mm, 18*mm, 35*mm])
story.append(cicd_table)
story.append(Paragraph("Table 3.3: CI/CD Pipeline Tasks", styles['Caption']))

story.append(PageBreak())

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SECTION 4: PHASE 3 - SECURITY HARDENING
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
story.append(Paragraph("4. Phase 3: Security Hardening", styles['SectionHeading']))

add_paragraph(
    "Phase 3 addresses the security posture requirements essential for a cybersecurity platform handling sensitive "
    "operational data and customer environments. Given that CyberSOC processes security events, threat intelligence, "
    "and potentially classified information for government customers, the security bar must exceed typical SaaS "
    "applications. This phase includes external security audits by qualified firms, penetration testing across "
    "application and infrastructure layers, vulnerability scanning integration into development workflows, and "
    "preparation for compliance certifications required by enterprise and government procurement processes. "
    "Importantly, many Phase 3 activities can execute in parallel with other phases, particularly the audit and "
    "certification preparation workstreams."
)

story.append(Paragraph("4.1 External Security Audit & Penetration Testing", styles['SubsectionHeading']))

sec_audit_tasks = [
    [Paragraph("<b>Task ID</b>", styles['TableHeader']),
     Paragraph("<b>Task Description</b>", styles['TableHeader']),
     Paragraph("<b>Priority</b>", styles['TableHeader']),
     Paragraph("<b>Effort</b>", styles['TableHeader']),
     Paragraph("<b>Dependencies</b>", styles['TableHeader'])],
    ["4.1", "Security Audit Firm Selection & Contracting", "Critical", "5 days", "Budget Approval"],
    ["4.2", "Application Security Assessment (DAST/SAST)", "Critical", "10 days*", "4.1, Phase 1"],
    ["4.3", "Infrastructure Penetration Test", "Critical", "8 days*", "4.1, Phase 2"],
    ["4.4", "Red Team Exercise (Adversary Simulation)", "High", "10 days*", "4.2, 4.3"],
    ["4.5", "Social Engineering Assessment", "Medium", "5 days", "4.1"],
    ["4.6", "Findings Remediation Sprint", "Critical", "14 days", "4.2, 4.3, 4.4"],
    ["4.7", "Re-testing & Validation", "Critical", "5 days", "4.6"],
    ["4.8", "Security Architecture Review", "High", "5 days", "4.1"],
    ["4.9", "Cryptography Assessment", "High", "3 days", "4.1"],
    ["4.10", "Final Security Attestation", "Critical", "3 days", "4.7"],
]

sec_audit_table = create_section_table(sec_audit_tasks,
    col_widths=[15*mm, 58*mm, 20*mm, 18*mm, 35*mm])
story.append(sec_audit_table)
story.append(Paragraph("* External firm-led; internal coordination required", styles['Caption']))
story.append(Paragraph("Table 4.1: Security Audit & Penetration Testing Tasks", styles['Caption']))

story.append(Paragraph("4.2 Vulnerability Management & Tooling", styles['SubsectionHeading']))

vuln_tasks = [
    [Paragraph("<b>Task ID</b>", styles['TableHeader']),
     Paragraph("<b>Task Description</b>", styles['TableHeader']),
     Paragraph("<b>Priority</b>", styles['TableHeader']),
     Paragraph("<b>Effort</b>", styles['TableHeader']),
     Paragraph("<b>Dependencies</b>", styles['TableHeader'])],
    ["4.11", "SAST Tool Integration (SonarQube/Semgrep)", "High", "3 days", "CI Pipeline"],
    ["4.12", "DAST Tool Integration (OWASP ZAP)", "High", "3 days", "CI Pipeline"],
    ["4.13", "Dependency Scanning (Snyk/Dependabot)", "High", "2 days", "CI Pipeline"],
    ["4.14", "Container Image Scanning", "Critical", "2 days", "Registry"],
    ["4.15", "Vulnerability Triage Process", "High", "2 days", "4.11-4.14"],
    ["4.16", "SLA Definitions (Critical/High/Med/Low)", "Medium", "1 day", "4.15"],
    ["4.17", "Patch Management Workflow", "High", "2 days", "4.15"],
    ["4.18", "CVE Monitoring & Alerting", "Medium", "2 days", "4.13"],
    ["4.19", "Security Baseline Hardening (CIS)", "High", "3 days", "OS Images"],
    ["4.20", "Runtime Protection (Falco/Tetragon)", "Medium", "3 days", "K8s Cluster"],
]

vuln_table = create_section_table(vuln_tasks,
    col_widths=[15*mm, 58*mm, 20*mm, 18*mm, 35*mm])
story.append(vuln_table)
story.append(Paragraph("Table 4.2: Vulnerability Management Tasks", styles['Caption']))

story.append(Paragraph("4.3 Compliance Certification Preparation", styles['SubsectionHeading']))

compliance_tasks = [
    [Paragraph("<b>Task ID</b>", styles['TableHeader']),
     Paragraph("<b>Task Description</b>", styles['TableHeader']),
     Paragraph("<b>Priority</b>", styles['TableHeader']),
     Paragraph("<b>Effort</b>", styles['TableHeader']),
     Paragraph("<b>Dependencies</b>", styles['TableHeader'])],
    ["4.21", "SOC 2 Type I Control Mapping", "Critical", "5 days", "Control Framework"],
    ["4.22", "Evidence Collection Automation", "High", "5 days", "4.21"],
    ["4.23", "ISO 27001 Gap Analysis", "High", "5 days", "ISMS Scope"],
    ["4.24", "GDPR Data Processing Assessment", "High", "4 days", "Data Inventory"],
    ["4.25", "Privacy Policy & Terms Draft", "Medium", "3 days", "Legal Review"],
    ["4.26", "Data Processing Agreements Template", "Medium", "2 days", "Legal Review"],
    ["4.27", "FedRAMP Package Preparation (Gov)", "High", "10 days", "Gov Requirements"],
    ["4.28", "Penetration Test Report for Auditors", "High", "2 days", "4.7"],
    ["4.29", "Audit Trail Verification", "High", "3 days", "Logging System"],
    ["4.30", "Certification Body Engagement", "Critical", "3 days", "4.21-4.24"],
]

compliance_table = create_section_table(compliance_tasks,
    col_widths=[15*mm, 58*mm, 20*mm, 18*mm, 35*mm])
story.append(compliance_table)
story.append(Paragraph("Table 4.3: Compliance Certification Tasks", styles['Caption']))

story.append(PageBreak())

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SECTION 5: PHASE 4 - QUALITY ASSURANCE
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
story.append(Paragraph("5. Phase 4: Quality Assurance", styles['SectionHeading']))

add_paragraph(
    "Phase 4 ensures the CyberSOC Platform meets quality standards necessary for production deployment across "
    "functionality, performance, reliability, and security dimensions. The testing strategy employs a pyramid "
    "approach with extensive unit test coverage forming the foundation, integration tests validating component "
    "interactions, end-to-end tests verifying critical user journeys, and specialized testing including load "
    "testing, chaos engineering, and security validation. The existing test suite specification (documented in "
    "the platform's Section 29) provides the framework; this phase focuses on execution, gap identification, "
    "and remediation to achieve coverage targets sufficient for production confidence."
)

story.append(Paragraph("5.1 Testing Strategy Execution", styles['SubsectionHeading']))

qa_tasks = [
    [Paragraph("<b>Task ID</b>", styles['TableHeader']),
     Paragraph("<b>Task Description</b>", styles['TableHeader']),
     Paragraph("<b>Priority</b>", styles['TableHeader']),
     Paragraph("<b>Effort</b>", styles['TableHeader']),
     Paragraph("<b>Dependencies</b>", styles['TableHeader'])],
    ["5.1", "Unit Test Coverage Analysis & Gap Fill", "Critical", "5 days", "Code Base"],
    ["5.2", "Integration Test Suite Execution", "Critical", "5 days", "Test Env Ready"],
    ["5.3", "API Contract Testing (Pact)", "High", "3 days", "5.2"],
    ["5.4", "End-to-End Test Automation (Playwright)", "Critical", "7 days", "UI Components"],
    ["5.5", "Performance Baseline Establishment", "High", "4 days", "Staging Env"],
    ["5.6", "Load Testing (10x Normal Traffic)", "Critical", "5 days", "5.5"],
    ["5.7", "Stress Testing (Breaking Point)", "Medium", "3 days", "5.6"],
    ["5.8", "Soak Testing (72-hour Sustained)", "Medium", "3 days", "5.6"],
    ["5.9", "Chaos Engineering Experiments", "High", "5 days", "K8s Prod-like"],
    ["5.10", "Accessibility Testing (WCAG 2.1)", "Medium", "3 days", "5.4"],
]

qa_table = create_section_table(qa_tasks,
    col_widths=[15*mm, 58*mm, 20*mm, 18*mm, 35*mm])
story.append(qa_table)
story.append(Paragraph("Table 5.1: Quality Assurance Testing Tasks", styles['Caption']))

story.append(Paragraph("5.2 Purple Team Validation", styles['SubsectionHeading']))

purple_tasks = [
    [Paragraph("<b>Task ID</b>", styles['TableHeader']),
     Paragraph("<b>Task Description</b>", styles['TableHeader']),
     Paragraph("<b>Priority</b>", styles['TableHeader']),
     Paragraph("<b>Effort</b>", styles['TableHeader']),
     Paragraph("<b>Dependencies</b>", styles['TableHeader'])],
    ["5.11", "MITRE ATT&CK Technique Mapping", "High", "4 days", "Detection Rules"],
    ["5.12", "Attack Scenario Library Creation", "High", "3 days", "5.11"],
    ["5.13", "Blue Team Detection Validation", "Critical", "5 days", "5.12, SIEM"],
    ["5.14", "Response Playbook Testing", "Critical", "4 days", "SOAR, 5.13"],
    ["5.15", "Threat Hunt Exercise Execution", "High", "3 days", "UEBA, Threat Intel"],
    ["5.16", "DFIR Workflow Validation", "High", "3 days", "DFIR Platform"],
    ["5.17", " purple Team Retrospective", "Medium", "2 days", "5.13-5.16"],
    ["5.18", "Detection Rule Tuning", "Critical", "4 days", "5.13, 5.14"],
    ["5.19", "False Positive Reduction", "High", "3 days", "5.18"],
    ["5.20", "MTTD/MTTR Benchmark Measurement", "High", "2 days", "5.13-5.16"],
]

purple_table = create_section_table(purple_tasks,
    col_widths=[15*mm, 58*mm, 20*mm, 18*mm, 35*mm])
story.append(purple_table)
story.append(Paragraph("Table 5.2: Purple Team Validation Tasks", styles['Caption']))

story.append(PageBreak())

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SECTION 6: PHASE 5 - OPERATIONS & SUPPORT
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
story.append(Paragraph("6. Phase 5: Operations & Support", styles['SectionHeading']))

add_paragraph(
    "Phase 5 establishes the operational capabilities required for day-to-day platform management, incident "
    "response, and customer support. The monitoring and observability stack provides visibility into system health, "
    "performance characteristics, and operational anomalies enabling proactive issue detection and resolution. "
    "Runbooks codify standard operating procedures for common scenarios reducing mean-time-to-resolution through "
    "documented playbooks. Documentation finalization ensures operators, analysts, managers, and developers have "
    "access to accurate, current reference materials appropriate to their roles and responsibilities within the "
    "platform ecosystem."
)

story.append(Paragraph("6.1 Monitoring & Observability Stack", styles['SubsectionHeading']))

monitoring_tasks = [
    [Paragraph("<b>Task ID</b>", styles['TableHeader']),
     Paragraph("<b>Task Description</b>", styles['TableHeader']),
     Paragraph("<b>Priority</b>", styles['TableHeader']),
     Paragraph("<b>Effort</b>", styles['TableHeader']),
     Paragraph("<b>Dependencies</b>", styles['TableHeader'])],
    ["6.1", "Metrics Collection (Prometheus/StatsD)", "Critical", "3 days", "K8s Cluster"],
    ["6.2", "Visualization Dashboards (Grafana)", "Critical", "4 days", "6.1"],
    ["6.3", "Log Aggregation (ELK/Loki Stack)", "Critical", "3 days", "K8s Cluster"],
    ["6.4", "Distributed Tracing (Jaeger/Tempo)", "High", "3 days", "Service Mesh"],
    ["6.5", "Alert Manager Configuration", "Critical", 3, "days", "6.1, 6.3"],
    ["6.6", "SLO/SLI Definition & Tracking", "High", "2 days", "6.2"],
    ["6.7", "Error Tracking (Sentry)", "Medium", "1 day", "App Deployed"],
    ["6.8", "UM/Application Monitoring", "Medium", "2 days", "6.2"],
    ["6.9", "Incident Communication (PagerDuty/OpsGenie)", "High", "2 days", "6.5"],
    ["6.10", "Dashboard Library (Pre-built Views)", "High", "3 days", "6.2"],
]

monitoring_table = create_section_table(monitoring_tasks,
    col_widths=[15*mm, 58*mm, 20*mm, 18*mm, 35*mm])
story.append(monitoring_table)
story.append(Paragraph("Table 6.1: Monitoring & Observability Tasks", styles['Caption']))

story.append(Paragraph("6.2 Runbooks & Operational Procedures", styles['SubsectionHeading']))

runbook_tasks = [
    [Paragraph("<b>Task ID</b>", styles['TableHeader']),
     Paragraph("<b>Task Description</b>", styles['TableHeader']),
     Paragraph("<b>Priority</b>", styles['TableHeader']),
     Paragraph("<b>Effort</b>", styles['TableHeader']),
     Paragraph("<b>Dependencies</b>", styles['TableHeader'])],
    ["6.11", "Incident Response Runbook", "Critical", "3 days", "Alerting"],
    ["6.12", "Escalation Procedures", "High", "1 day", "6.11"],
    ["6.13", "Disaster Recovery Runbook", "Critical", "3 days", "DR Tested"],
    ["6.14", "Scaling Procedures (Up/Down)", "Medium", "1 day", "HPA Configured"],
    ["6.15", "Deployment Rollback Procedure", "Critical", "1 day", "CI/CD Ready"],
    ["6.16", "Database Recovery Procedures", "Critical", "2 days", "Backups"],
    ["6.17", "Security Incident Response", "Critical", "3 days", "SIEM Active"],
    ["6.18", "Customer Onboarding Runbook", "High", "2 days", "Admin UI"],
    ["6.19", "Maintenance Window Procedures", "Medium", "1 day", "6.11"],
    ["6.20", "Vendor/Integration Troubleshooting", "Medium", "2 days", "Integrations"],
]

runbook_table = create_section_table(runbook_tasks,
    col_widths=[15*mm, 58*mm, 20*mm, 18*mm, 35*mm])
story.append(runbook_table)
story.append(Paragraph("Table 6.2: Runbooks & Procedures Tasks", styles['Caption']))

story.append(Paragraph("6.3 Documentation Finalization", styles['SubsectionHeading']))

doc_tasks = [
    [Paragraph("<b>Task ID</b>", styles['TableHeader']),
     Paragraph("<b>Task Description</b>", styles['TableHeader']),
     Paragraph("<b>Priority</b>", styles['TableHeader']),
     Paragraph("<b>Effort</b>", styles['TableHeader']),
     Paragraph("<b>Dependencies</b>", styles['TableHeader'])],
    ["6.21", "SOC Analyst User Guide", "High", "5 days", "Features Stable"],
    ["6.22", "SOC Manager Administration Guide", "High", "4 days", "Admin UI Complete"],
    ["6.23", "CISO Executive Dashboard Guide", "Medium", "2 days", "CISO Dashboard"],
    ["6.24", "Developer API Reference", "High", "7 days", "API Stable"],
    ["6.25", "Production Deployment Guide", "Critical", "4 days", "Phase 2 Complete"],
    ["6.26", "Troubleshooting Knowledge Base", "High", "4 days", "Common Issues Known"],
    ["6.27", "Release Notes & Changelog Process", "Medium", "1 day", "CI/CD"],
    ["6.28", "Architecture Decision Records (ADRs)", "Medium", "3 days", "Design Decisions"],
    ["6.29", "Training Materials (Videos/Walkthroughs)", "Medium", "5 days", "6.21-6.24"],
    ["6.30", "FAQ & Self-Service Portal Content", "Low", "2 days", "KB Started"],
]

doc_table = create_section_table(doc_tasks,
    col_widths=[15*mm, 58*mm, 20*mm, 18*mm, 35*mm])
story.append(doc_table)
story.append(Paragraph("Table 6.3: Documentation Tasks", styles['Caption']))

story.append(PageBreak())

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SECTION 7: PHASE 6 - LAUNCH PREPARATION
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
story.append(Paragraph("7. Phase 6: Launch Preparation", styles['SectionHeading']))

add_paragraph(
    "Phase 6 prepares the organization, systems, and processes for General Availability (GA) launch. This phase "
    "begins with a controlled pilot program involving select customers who provide real-world validation of "
    "platform capabilities under actual usage conditions. Pilot feedback drives refinements before broader release. "
    "Concurrently, go-to-market preparations ensure sales, marketing, customer success, and support teams are "
    "equipped to represent, sell, onboard, and serve customers effectively. Launch readiness gates verify that "
    "all prerequisite conditions are met before opening availability to the general market."
)

story.append(Paragraph("7.1 Pilot/Beta Program", styles['SubsectionHeading']))

pilot_tasks = [
    [Paragraph("<b>Task ID</b>", styles['TableHeader']),
     Paragraph("<b>Task Description</b>", styles['TableHeader']),
     Paragraph("<b>Priority</b>", styles['TableHeader']),
     Paragraph("<b>Effort</b>", styles['TableHeader']),
     Paragraph("<b>Dependencies</b>", styles['TableHeader'])],
    ["7.1", "Pilot Customer Selection Criteria", "Critical", "2 days", "ICP Defined"],
    ["7.2", "Pilot Customer Recruitment (3-5)", "Critical", "10 days", "7.1"],
    ["7.3", "Pilot Onboarding Plan", "High", "2 days", "7.2"],
    ["7.4", "Feature-Gated Pilot Build", "Critical", "3 days", "Phase 1-4 Milestones"],
    ["7.5", "Feedback Collection Mechanism", "High", "2 days", "7.4"],
    ["7.6", "Weekly Pilot Sync Cadence", "Medium", "Ongoing", "7.4 Launched"],
    ["7.7", "Issue Triage & Prioritization", "High", "Ongoing", "7.5"],
    ["7.8", "Pilot Success Metrics Definition", "High", "1 day", "7.1"],
    ["7.9", "Pilot Retrospective & Learnings", "Critical", "2 days", "Pilot Complete"],
    ["7.10", "GA Readiness Assessment", "Critical", "3 days", "7.9, All Phases"],
]

pilot_table = create_section_table(pilot_tasks,
    col_widths=[15*mm, 58*mm, 20*mm, 18*mm, 35*mm])
story.append(pilot_table)
story.append(Paragraph("Table 7.1: Pilot Program Tasks", styles['Caption']))

story.append(Paragraph("7.2 General Availability Preparation", styles['SubsectionHeading']))

ga_tasks = [
    [Paragraph("<b>Task ID</b>", styles['TableHeader']),
     Paragraph("<b>Task Description</b>", styles['TableHeader']),
     Paragraph("<b>Priority</b>", styles['TableHeader']),
     Paragraph("<b>Effort</b>", styles['TableHeader']),
     Paragraph("<b>Dependencies</b>", styles['TableHeader'])],
    ["7.11", "Marketing Collateral Development", "High", "5 days", "Messaging Finalized"],
    ["7.12", "Sales Enablement Training", "High", "3 days", "7.11, Pricing"],
    ["7.13", "Customer Success Playbooks", "High", "3 days", "Onboarding Flow"],
    ["7.14", "Support Tier Configuration", "Critical", "2 days", "Support Tools"],
    ["7.15", "SLA Publication & Internal Alignment", "Critical", "2 days", "SLOs Measured"],
    ["7.16", "Pricing Page & Quote Generator", "High", "3 days", "Billing System"],
    ["7.17", "Legal Review (Terms, Privacy, DPA)", "Critical", "5 days", "Draft Documents"],
    ["7.18", "Launch Communications Plan", "Medium", "2 days", "Launch Date Set"],
    ["7.19", "Press Release & Analyst Briefings", "Medium", "3 days", "7.11"],
    ["7.20", "Post-Launch Support Surge Planning", "High", "2 days", "7.14"],
]

ga_table = create_section_table(ga_tasks,
    col_widths=[15*mm, 58*mm, 20*mm, 18*mm, 35*mm])
story.append(ga_table)
story.append(Paragraph("Table 7.2: GA Preparation Tasks", styles['Caption']))

story.append(PageBreak())

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SECTION 8: MASTER TIMELINE & CRITICAL PATH
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
story.append(Paragraph("8. Master Timeline & Critical Path", styles['SectionHeading']))

add_paragraph(
    "The master timeline integrates all six phases into a coherent schedule identifying dependencies, parallelism "
    "opportunities, and the critical path determining minimum achievable duration. The timeline assumes adequately "
    "staffed cross-functional teams with necessary domain expertise; adjustments may be required based on actual "
    "resource availability and organizational context. Buffer time is incorporated at phase boundaries to accommodate "
    "unforeseen challenges without cascading delays to subsequent phases."
)

timeline_data = [
    [Paragraph("<b>Phase</b>", styles['TableHeader']),
     Paragraph("<b>Start</b>", styles['TableHeader']),
     Paragraph("<b>End</b>", styles['TableHeader']),
     Paragraph("<b>Duration</b>", styles['TableHeader']),
     Paragraph("<b>Critical Path?</b>", styles['TableHeader']),
     Paragraph("<b>Parallel With</b>", styles['TableHeader'])],
    ["Phase 1: Core Platform", "Week 1", "Week 7", "6 weeks", "YES", "-"],
    ["Phase 2: Infrastructure", "Week 2", "Week 7", "5 weeks", "YES", "Phase 1 (partial)"],
    ["Phase 3: Security", "Week 3", "Week 14", "10-12 weeks", "Partial", "Phases 1, 2, 4"],
    ["Phase 4: QA", "Week 7", "Week 12", "5 weeks", "YES", "Phase 3 (partial)"],
    ["Phase 5: Operations", "Week 8", "Week 13", "5 weeks", "NO", "Phase 4"],
    ["Phase 6: Launch Prep", "Week 12", "Week 18", "6 weeks", "YES", "Phase 5 (partial)"],
    ["Buffer/Contingency", "Week 16", "Week 20", "4 weeks", "-", "All phases"],
    ["TOTAL", "Week 1", "Week 20", "16-24 weeks", "-", "-"],
]

timeline_table = create_section_table(timeline_data,
    col_widths=[38*mm, 18*mm, 18*mm, 22*mm, 25*mm, 39*mm])
story.append(timeline_table)
story.append(Paragraph("Table 8.1: Master Timeline Overview", styles['Caption']))

story.append(Paragraph("8.1 Critical Path Analysis", styles['SubsectionHeading']))

add_paragraph(
    "The critical path represents the sequence of dependent tasks determining minimum project duration. Any delay "
    "on critical path tasks directly extends the overall timeline. The primary critical path flows through: Admin "
    "Interface development (enabling all operational capabilities) -> API Gateway and Authentication (security "
    "foundation) -> Database and Infrastructure (deployment target) -> QA Validation (quality gate) -> Launch "
    "Preparation (market readiness). Phase 3 (Security Hardening) partially overlaps the critical path as external "
    "audit scheduling may constrain certification timing independent of development progress."
)

critical_path = [
    [Paragraph("<b>Sequence</b>", styles['TableHeader']),
     Paragraph("<b>Milestone</b>", styles['TableHeader']),
     Paragraph("<b>Target Date</b>", styles['TableHeader']),
     Paragraph("<b>Gate Criteria</b>", styles['TableHeader'])],
    ["CP-1", "Admin UI Alpha", "Week 3", "Core CRUD working"],
    ["CP-2", "Auth System Live", "Week 5", "SSO + RBAC functional"],
    ["CP-3", "Infra Ready", "Week 7", "K8s + DB + CI/CD operational"],
    ["CP-4", "Integration Complete", "Week 9", "All modules deployed on infra"],
    ["CP-5", "QA Sign-off", "Week 12", "All tests passing, perf met"],
    ["CP-6", "Security Attestation", "Week 14", "Audit clean, certs in progress"],
    ["CP-7", "Operations Ready", "Week 15", "Monitoring, runbooks, docs complete"],
    ["CP-8", "Pilot Complete", "Week 17", "3+ customers successful"],
    ["CP-9", "GA Gate Review", "Week 19", "All criteria verified"],
    ["CP-10", "General Availability", "Week 20", "Platform open to all customers"],
]

cp_table = create_section_table(critical_path,
    col_widths=[22*mm, 40*mm, 28*mm, 70*mm])
story.append(cp_table)
story.append(Paragraph("Table 8.2: Critical Path Milestones", styles['Caption']))

story.append(PageBreak())

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SECTION 9: RESOURCE REQUIREMENTS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
story.append(Paragraph("9. Resource Requirements", styles['SectionHeading']))

add_paragraph(
    "Successful execution of the Go-Live roadmap requires cross-functional team composition with specific skills "
    "and experience levels. The team structure below represents recommended staffing for aggressive timeline "
    "execution; reduced headcount extends duration proportionally. Key roles include platform engineering for core "
    "development, site reliability engineering for infrastructure and operations, security engineering for hardening "
    "and compliance, quality assurance for testing, and product/program management for coordination and stakeholder "
    "management. Vendor/contractor augmentation may address skill gaps or capacity constraints during peak periods."
)

story.append(Paragraph("9.1 Recommended Team Structure", styles['SubsectionHeading']))

team_data = [
    [Paragraph("<b>Role</b>", styles['TableHeader']),
     Paragraph("<b>Count</b>", styles['TableHeader']),
     Paragraph("<b>Skills Required</b>", styles['TableHeader']),
     Paragraph("<b>Phase Focus</b>", styles['TableHeader'])],
    ["Platform Engineer (Senior)", "3-4", "React, Python, Go, K8s, Microservices", "Phase 1, 2, 4"],
    ["Platform Engineer (Mid)", "2-3", "React, Python, REST APIs, SQL", "Phase 1, 4"],
    ["Site Reliability Engineer", "2-3", "K8s, Terraform, Prometheus, Grafana", "Phase 2, 5"],
    ["Security Engineer", "2", "AppSec, Cloud Sec, Compliance, Pentest", "Phase 3"],
    ["QA Engineer", "2", "Automation, Performance, Security Testing", "Phase 4"],
    ["DevOps Engineer", "2", "CI/CD, GitOps, IaC, Container Security", "Phase 2, 3"],
    ["Technical Writer", "1", "API Docs, User Guides, Architecture", "Phase 5, 6"],
    ["Product Manager", "1", "Roadmap, Prioritization, Stakeholders", "All Phases"],
    ["Program Manager", "1", "Coordination, Risk, Dependencies", "All Phases"],
    ["Customer Success Eng", "1", "Onboarding, Training, Feedback Loop", "Phase 6"],
]

team_table = create_section_table(team_data,
    col_widths=[40*mm, 18*mm, 68*mm, 34*mm])
story.append(team_table)
story.append(Paragraph("Table 9.1: Team Composition Recommendations", styles['Caption']))

story.append(Paragraph("9.2 Tool & Infrastructure Costs", styles['SubsectionHeading']))

costs_data = [
    [Paragraph("<b>Category</b>", styles['TableHeader']),
     Paragraph("<b>Item</b>", styles['TableHeader']),
     Paragraph("<b>Monthly Est.</b>", styles['TableHeader']),
     Paragraph("<b>Notes</b>", styles['TableHeader'])],
    ["Cloud Infrastructure", "AWS/GCP/K8s Cluster", "$8,000-15,000", "3 envs, prod-sized"],
    ["Monitoring Tools", "Datadog/PagerDuty/Sentry", "$2,000-4,000", "Team seats included"],
    ["Security Tools", "Snyk/SonarQube/Pentest Firm", "$5,000-10,000", "One-time + recurring"],
    ["Development Tools", "GitHub/GitLab/IDE Licenses", "$1,500-3,000", "Per-developer pricing"],
    ["Communication", "Slack/Zoom/Confluence", "$500-1,000", "Team collaboration"],
    ["Design Tools", "Figma/Zeplin", "$500-800", "UI/UX collaboration"],
    ["Contingency Buffer", "Unplanned Expenses", "+15-20%", "Recommended reserve"],
]

costs_table = create_section_table(costs_data,
    col_widths=[38*mm, 50*mm, 32*mm, 40*mm])
story.append(costs_table)
story.append(Paragraph("Table 9.2: Estimated Monthly Infrastructure Costs", styles['Caption']))

story.append(PageBreak())

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SECTION 10: RISK REGISTER & MITIGATION
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
story.append(Paragraph("10. Risk Register & Mitigation", styles['SectionHeading']))

add_paragraph(
    "Effective risk management requires proactive identification, assessment, and mitigation planning for factors "
    "that could impact Go-Live success. The risk register below captures key risks identified across technical, "
    "organizational, and external dimensions. Each risk is assessed for probability of occurrence and potential "
    "impact on timeline, budget, or quality outcomes. Mitigation strategies define preventive measures to reduce "
    "likelihood and contingent responses to minimize impact if risks materialize. Regular risk review cadence "
    "(recommended weekly during active phases) ensures emerging risks are captured and mitigations remain relevant."
)

risk_data = [
    [Paragraph("<b>ID</b>", styles['TableHeader']),
     Paragraph("<b>Risk Description</b>", styles['TableHeader']),
     Paragraph("<b>P</b>", styles['TableHeader']),
     Paragraph("<b>I</b>", styles['TableHeader']),
     Paragraph("<b>Mitigation Strategy</b>", styles['TableHeader'])],
    ["R1", "Key personnel attrition during project", "M", "H", "Cross-training, documentation, retention bonuses"],
    ["R2", "Scope creep from stakeholders", "H", "M", "Change control board, strict scope baseline"],
    ["R3", "Third-party integration delays", "H", "H", "Early engagement, fallback options, mock services"],
    ["R4", "Security audit findings severity", "M", "H", "Pre-audit self-assessment, remediation sprints"],
    ["R5", "Performance not meeting SLAs", "M", "H", "Early benchmarking, architecture optimization"],
    ["R6", "Pilot customer churn/dissatisfaction", "M", "H", "Careful selection, dedicated success support"],
    ["R7", "Compliance certification delays", "M", "M", "Early auditor engagement, evidence automation"],
    ["R8", "Infrastructure cost overruns", "L", "M", "Reserved instances, auto-scaling limits"],
    ["R9", "Competitor launch before ours", "M", "M", "Accelerate critical path, phased GA"],
    ["R10", "Regulatory change affecting features", "L", "H", "Regulatory monitoring, flexible architecture"],
]

risk_table = create_section_table(risk_data,
    col_widths=[12*mm, 62*mm, 12*mm, 12*mm, 72*mm])
story.append(risk_table)
story.append(Paragraph("Table 10.1: Risk Register (P=Probability, I=Impact: H/M/L)", styles['Caption']))

story.append(Paragraph("10.1 Launch Readiness Gates", styles['SubsectionHeading']))

add_paragraph(
    "Before declaring General Availability, the project must pass through defined readiness gates verifying that "
    "all prerequisite conditions are satisfied. Each gate has specific acceptance criteria that must be objectively "
    "demonstrable; subjective assessments or optimistic projections do not satisfy gate requirements. Gate reviews "
    "involve cross-functional stakeholders with authority to halt progression if criteria are not met. The gate "
    "structure prevents premature launch that could damage customer trust, brand reputation, or operational stability."
)

gates_data = [
    [Paragraph("<b>Gate</b>", styles['TableHeader']),
     Paragraph("<b>Criteria Category</b>", styles['TableHeader']),
     Paragraph("<b>Key Metrics/Requirements</b>", styles['TableHeader']),
     Paragraph("<b>Approver</b>", styles['TableHeader'])],
    ["G1", "Functional Completeness", "All P0/P1 features working, no known critical bugs", "Product Lead"],
    ["G2", "Performance Benchmarks", "P99 latency <500ms, 99.9% uptime demonstrated", "Engineering Lead"],
    ["G3", "Security Clearance", "No critical/high findings open, pen test passed", "CISO/Security Lead"],
    ["G4", "Operational Readiness", "Runbooks validated, on-call rotated, alerts tuned", "SRE Lead"],
    ["G5", "Documentation Complete", "All guides published, training delivered", "Tech Writing Lead"],
    ["G6", "Support Readiness", "Tier 1 trained, escalation paths tested, SLA published", "Support Lead"],
    ["G7", "Commercial Readiness", "Pricing live, quoting works, legal reviewed", "Sales Ops + Legal"],
    ["G8", "Pilot Validation", "3+ pilots successful, NPS >40, churn <10%", "CS Leader + Product"],
]

gates_table = create_section_table(gates_data,
    col_widths=[18*mm, 38*mm, 72*mm, 30*mm])
story.append(gates_table)
story.append(Paragraph("Table 10.2: Launch Readiness Gates", styles['Caption']))

story.append(Spacer(1, 10*mm))

# Closing summary
add_paragraph(
    "This Go-Live Implementation Roadmap provides the comprehensive framework for transitioning the CyberSOC Platform "
    "from its current specification-complete state to full production deployment serving real customers. The six-phase "
    "approach balances thoroughness with agility, enabling parallel execution where dependencies permit while maintaining "
    "clear quality gates between phases. Success requires sustained commitment from cross-functional teams, adequate "
    "resource allocation, and disciplined execution against the plans outlined herein. Regular progress reviews against "
    "this roadmap will identify deviations early enabling corrective action before timeline or quality impacts materialize.",
    'BodyNoIndent'
)

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# BUILD PDF
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
print(f"Building PDF: {output_path}")
doc.build(story)
print(f"Successfully generated: {output_path}")
print(f"File size: {os.path.getsize(output_path)} bytes")
