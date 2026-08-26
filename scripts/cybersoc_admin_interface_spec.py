#!/usr/bin/env python3
"""
CyberSOC Platform - Admin Interface Specification Document
Phase 1: Go-Live Critical Path Deliverable

This script generates a comprehensive 20+ page PDF specification document
covering all administrative capabilities, RBAC matrix, dashboard components,
CRUD operations, and integration points with the Billing/Licensing system.
"""

import os
import sys
from datetime import datetime
from reportlab.lib import colors
from reportlab.lib.units import inch, cm

# Unit fix - pt is not in reportlab.lib.units
pt = 1
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY, TA_RIGHT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, Image, ListFlowable, ListItem, KeepTogether
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily
from reportlab.graphics.shapes import Drawing, Rect, String, Line
from reportlab.graphics.charts.barcharts import VerticalBarChart
from reportlab.graphics.charts.piecharts import Pie
from reportlab.graphics.charts.legends import Legend
from reportlab.graphics import renderPDF

# ============================================================================
# FONT REGISTRATION (CJK Support)
# ============================================================================
FONT_DIR = '/usr/share/fonts'

# Register Noto Serif SC (Primary Chinese font - serif)
pdfmetrics.registerFont(TTFont('NotoSerifSC', f'{FONT_DIR}/truetype/noto-serif-sc/NotoSerifSC-Regular.ttf'))
pdfmetrics.registerFont(TTFont('NotoSerifSC-Bold', f'{FONT_DIR}/truetype/noto-serif-sc/NotoSerifSC-Bold.ttf'))
registerFontFamily('NotoSerifSC', normal='NotoSerifSC', bold='NotoSerifSC-Bold')

# Register Sarasa Mono SC (Monospace for code/technical)
pdfmetrics.registerFont(TTFont('SarasaMonoSC', f'{FONT_DIR}/truetype/chinese/SarasaMonoSC-Regular.ttf'))

# Unit fix
pt = 1

# ============================================================================
# CASCADE PALETTE (CyberSOC Design System)
# ============================================================================
# XL tier: backgrounds (area > 50%, S <= 0.08)
PAGE_BG       = colors.HexColor('#f6f5f4')
SECTION_BG    = colors.HexColor('#efefee')

# L tier: surfaces (area 20-50%, S <= 0.15)
CARD_BG       = colors.HexColor('#ecebe7')
TABLE_STRIPE  = colors.HexColor('#ececea')

# M tier: structural fills (area 5-20%, S <= 0.30)
HEADER_FILL   = colors.HexColor('#615637')
COVER_BLOCK   = colors.HexColor('#695f40')

# S tier: edges & icons (area 1-5%, S <= 0.50)
BORDER        = colors.HexColor('#c2baa3')
ICON          = colors.HexColor('#a2893e')

# XS tier: emphasis (area < 1%, S <= 0.75)
ACCENT        = colors.HexColor('#866f2b')
ACCENT_2      = colors.HexColor('#53b0cf')

# Typography
TEXT_PRIMARY   = colors.HexColor('#1f1e1c')
TEXT_MUTED     = colors.HexColor('#85827b')

# Semantic (low-saturation)
SEM_SUCCESS   = colors.HexColor('#49885e')
SEM_WARNING   = colors.HexColor('#887246')
SEM_ERROR     = colors.HexColor('#954e47')
SEM_INFO      = colors.HexColor('#5e7d9d')

# ============================================================================
# STYLE DEFINITIONS
# ============================================================================
styles = getSampleStyleSheet()

# Custom styles with CyberSOC branding
styles.add(ParagraphStyle(
    name='CoverTitle',
    fontName='NotoSerifSC-Bold',
    fontSize=28,
    leading=36,
    textColor=colors.white,
    alignment=TA_CENTER,
    spaceAfter=12
))

styles.add(ParagraphStyle(
    name='CoverSubtitle',
    fontName='NotoSerifSC',
    fontSize=16,
    leading=22,
    textColor=colors.HexColor('#d9d4c5'),
    alignment=TA_CENTER,
    spaceAfter=8
))

styles.add(ParagraphStyle(
    name='ChapterTitle',
    fontName='NotoSerifSC-Bold',
    fontSize=18,
    leading=26,
    textColor=HEADER_FILL,
    spaceBefore=20,
    spaceAfter=12,
    borderPadding=(0, 0, 6, 0),
))

styles.add(ParagraphStyle(
    name='SectionTitle',
    fontName='NotoSerifSC-Bold',
    fontSize=14,
    leading=20,
    textColor=ACCENT,
    spaceBefore=16,
    spaceAfter=8
))

styles.add(ParagraphStyle(
    name='SubSectionTitle',
    fontName='NotoSerifSC-Bold',
    fontSize=12,
    leading=16,
    textColor=TEXT_PRIMARY,
    spaceBefore=12,
    spaceAfter=6
))

styles.add(ParagraphStyle(
    name='CustomBody',
    fontName='NotoSerifSC',
    fontSize=10,
    leading=16,
    textColor=TEXT_PRIMARY,
    alignment=TA_JUSTIFY,
    spaceBefore=4,
    spaceAfter=8,
    firstLineIndent=0
))

styles.add(ParagraphStyle(
    name='CustomBodyNoIndent',
    fontName='NotoSerifSC',
    fontSize=10,
    leading=16,
    textColor=TEXT_PRIMARY,
    alignment=TA_LEFT,
    spaceBefore=4,
    spaceAfter=8
))

styles.add(ParagraphStyle(
    name='TableHeader',
    fontName='NotoSerifSC-Bold',
    fontSize=9,
    leading=12,
    textColor=colors.white,
    alignment=TA_CENTER
))

styles.add(ParagraphStyle(
    name='TableCell',
    fontName='NotoSerifSC',
    fontSize=8.5,
    leading=11,
    textColor=TEXT_PRIMARY,
    alignment=TA_LEFT
))

styles.add(ParagraphStyle(
    name='CodeBlock',
    fontName='SarasaMonoSC',
    fontSize=8,
    leading=10,
    textColor=TEXT_PRIMARY,
    backColor=CARD_BG,
    borderPadding=6,
    spaceBefore=6,
    spaceAfter=6
))

styles.add(ParagraphStyle(
    name='BulletText',
    fontName='NotoSerifSC',
    fontSize=10,
    leading=14,
    textColor=TEXT_PRIMARY,
    leftIndent=20,
    bulletIndent=10,
    spaceBefore=2,
    spaceAfter=4
))

styles.add(ParagraphStyle(
    name='CaptionStyle',
    fontName='NotoSerifSC',
    fontSize=8,
    leading=10,
    textColor=TEXT_MUTED,
    alignment=TA_CENTER,
    spaceBefore=4,
    spaceAfter=12
))

styles.add(ParagraphStyle(
    name='TOCEntry',
    fontName='NotoSerifSC',
    fontSize=11,
    leading=18,
    textColor=TEXT_PRIMARY,
    leftIndent=0
))

styles.add(ParagraphStyle(
    name='TOCSubEntry',
    fontName='NotoSerifSC',
    fontSize=10,
    leading=16,
    textColor=TEXT_MUTED,
    leftIndent=20
))

# ============================================================================
# DOCUMENT METADATA
# ============================================================================
DOC_TITLE = "CyberSOC Platform"
DOC_SUBTITLE = "Admin Interface Specification Document"
DOC_VERSION = "Version 1.0"
DOC_DATE = datetime.now().strftime("%Y-%m-%d")
DOC_CLASSIFICATION = "INTERNAL - TECHNICAL SPECIFICATION"

OUTPUT_PATH = "/home/z/my-project/download/Cybersoc_Admin_Interface_Specification.pdf"

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================
def create_section_header(text, style='SectionTitle'):
    """Create a styled section header with underline"""
    return Paragraph(text, styles[style])

def create_body_text(text, indent=True):
    """Create body paragraph with optional indentation"""
    style = 'CustomBody' if indent else 'CustomBodyNoIndent'
    return Paragraph(text, styles[style])

def create_table(data, col_widths=None, header_rows=1):
    """Create a styled table with cascade palette"""
    if col_widths is None:
        # Auto-calculate widths based on page width
        available_width = A4[0] - 2*cm  # Margins
        num_cols = len(data[0]) if data else 0
        col_widths = [available_width / num_cols] * num_cols
    
    table = Table(data, colWidths=col_widths, repeatRows=header_rows)
    
    style_commands = [
        # Header styling
        ('BACKGROUND', (0, 0), (-1, header_rows-1), HEADER_FILL),
        ('TEXTCOLOR', (0, 0), (-1, header_rows-1), colors.white),
        ('FONTNAME', (0, 0), (-1, header_rows-1), 'NotoSerifSC-Bold'),
        ('FONTSIZE', (0, 0), (-1, header_rows-1), 9),
        ('ALIGN', (0, 0), (-1, header_rows-1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, header_rows-1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, header_rows-1), 8),
        ('TOPPADDING', (0, 0), (-1, header_rows-1), 8),
        
        # Body styling
        ('FONTNAME', (0, header_rows), (-1, -1), 'NotoSerifSC'),
        ('FONTSIZE', (0, header_rows), (-1, -1), 8.5),
        ('TEXTCOLOR', (0, header_rows), (-1, -1), TEXT_PRIMARY),
        ('ALIGN', (0, header_rows), (-1, -1), 'LEFT'),
        ('VALIGN', (0, header_rows), (-1, -1), 'TOP'),
        ('BOTTOMPADDING', (0, header_rows), (-1, -1), 6),
        ('TOPPADDING', (0, header_rows), (-1, -1), 6),
        
        # Alternating row colors
        ('ROWBACKGROUNDS', (0, header_rows), (-1, -1), [CARD_BG, colors.white]),
        
        # Grid
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
        ('BOX', (0, 0), (-1, -1), 1, HEADER_FILL),
    ]
    
    table.setStyle(TableStyle(style_commands))
    return table

def create_info_box(title, content_list, box_type='info'):
    """Create an information/callout box"""
    type_colors = {
        'info': SEM_INFO,
        'warning': SEM_WARNING,
        'error': SEM_ERROR,
        'success': SEM_SUCCESS
    }
    bg_color = type_colors.get(box_type, SEM_INFO)
    
    data = [[Paragraph(f"<b>{title}</b>", styles['TableCell'])]]
    for item in content_list:
        data.append([Paragraph(item, styles['TableCell'])])
    
    table = Table(data, colWidths=[A4[0] - 2.5*cm])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), bg_color),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#f8f9fa')),
        ('BOX', (0, 0), (-1, -1), 1, bg_color),
        ('INNERGRID', (0, 0), (-1, -1), 0.25, bg_color),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    return table

# ============================================================================
# CONTENT SECTIONS
# ============================================================================
def build_cover_page():
    """Build cover page elements"""
    elements = []
    
    # Spacer for top margin
    elements.append(Spacer(1, 2*inch))
    
    # Main title block
    cover_data = [[
        Paragraph(DOC_TITLE, styles['CoverTitle'])
    ], [
        Paragraph(DOC_SUBTITLE, styles['CoverSubtitle'])
    ], [
        Paragraph(f"{DOC_VERSION} | {DOC_DATE}", styles['CoverSubtitle'])
    ]]
    
    cover_table = Table(cover_data, colWidths=[5*inch])
    cover_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), HEADER_FILL),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 30),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 30),
        ('LEFTPADDING', (0, 0), (-1, -1), 40),
        ('RIGHTPADDING', (0, 0), (-1, -1), 40),
    ]))
    elements.append(cover_table)
    
    elements.append(Spacer(1, 0.5*inch))
    
    # Classification badge
    class_data = [[Paragraph(f"<b>{DOC_CLASSIFICATION}</b>", 
                             ParagraphStyle('ClassStyle', fontName='NotoSerifSC-Bold',
                                           fontSize=10, textColor=HEADER_FILL,
                                           alignment=TA_CENTER))]]
    class_table = Table(class_data, colWidths=[3*inch])
    class_table.setStyle(TableStyle([
        ('BOX', (0, 0), (-1, -1), 2, HEADER_FILL),
        ('BACKGROUND', (0, 0), (-1, -1), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(class_table)
    
    elements.append(Spacer(1, 1*inch))
    
    # Document info
    info_text = f"""
    <b>Document Purpose:</b> This specification defines the complete administrative interface 
    for the CyberSOC AI-Native Security Operations Center Operating System. It covers role-based 
    access control (RBAC) implementation, dashboard components, CRUD operations for all managed 
    entities, and integration requirements with the Billing and Licensing Architecture.<br/><br/>
    <b>Target Audience:</b> Platform Architects, Frontend Developers, DevOps Engineers, 
    Security Officers, Product Managers<br/><br/>
    <b>Go-Live Phase:</b> Phase 1 - Critical Path Item
    """
    elements.append(Paragraph(info_text, styles['CustomBodyNoIndent']))
    
    elements.append(PageBreak())
    return elements

def build_toc():
    """Build Table of Contents"""
    elements = []
    
    elements.append(Paragraph("TABLE OF CONTENTS", styles['ChapterTitle']))
    elements.append(Spacer(1, 0.3*inch))
    
    toc_entries = [
        ("1.", "Executive Summary", "3"),
        ("2.", "Administrative Role Matrix", "4"),
        ("   2.1", "Super Administrator", "4"),
        ("   2.2", "Organization Administrator", "5"),
        ("   2.3", "Billing Administrator", "5"),
        ("   2.4", "Read-Only Analyst", "6"),
        ("   2.5", "Permission Matrix Reference", "6"),
        ("3.", "Dashboard Architecture", "8"),
        ("   3.1", "System Overview Dashboard", "8"),
        ("   3.2", "User Management Dashboard", "9"),
        ("   3.3", "License & Revenue Dashboard", "10"),
        ("   3.4", "Usage Analytics Dashboard", "11"),
        ("4.", "User Management Module", "12"),
        ("   4.1", "User CRUD Operations", "12"),
        ("   4.2", "Bulk User Operations", "13"),
        ("   4.3", "User Session Management", "14"),
        ("5.", "Role & Permission Management", "15"),
        ("   5.1", "Role Definition Framework", "15"),
        ("   5.2", "Permission Assignment", "16"),
        ("   5.3", "Custom Role Creation", "17"),
        ("6.", "Tenant/Organization Management", "18"),
        ("   6.1", "MSSP Multi-Tenancy Model", "18"),
        ("   6.2", "Tenant Configuration", "19"),
        ("   6.3", "Resource Quotas", "20"),
        ("7.", "System Configuration", "21"),
        ("   7.1", "Global Settings", "21"),
        ("   7.2", "Integration Configuration", "22"),
        ("   7.3", "Security Policies", "23"),
        ("8.", "Audit Logging & Compliance", "24"),
        ("   8.1", "Audit Event Taxonomy", "24"),
        ("   8.2", "Log Retention & Export", "25"),
        ("   8.3", "Compliance Reporting", "26"),
        ("9.", "API Reference", "27"),
        ("   9.1", "Authentication Endpoints", "27"),
        ("   9.2", "User Management APIs", "28"),
        ("   9.3", "Tenant Management APIs", "29"),
        ("   9.4", "System Configuration APIs", "30"),
        ("10.", "Billing/Licensing Integration", "31"),
        ("   10.1", "License Inventory Sync", "31"),
        ("   10.2", "Usage Metering", "32"),
        ("   10.3", "Tier Enforcement", "33"),
        ("11.", "Security Requirements", "34"),
        ("   11.1", "Authentication Security", "34"),
        ("   11.2", "Authorization Controls", "35"),
        ("   11.3", "Data Protection", "36"),
        ("12.", "Implementation Roadmap", "37"),
        ("", "Appendix A: UI Mockup Descriptions", "38"),
        ("", "Appendix B: Database Schema Reference", "39"),
        ("", "Appendix C: Error Code Catalog", "40"),
    ]
    
    for num, title, page in toc_entries:
        if num.strip().startswith("   "):
            style = 'TOCSubEntry'
            num = num.strip()
        else:
            style = 'TOCEntry'
        
        entry = f"{num}  {title}{'.' * (60 - len(num) - len(title))}{page}"
        elements.append(Paragraph(entry, styles[style]))
    
    elements.append(PageBreak())
    return elements

def build_executive_summary():
    """Build Executive Summary section"""
    elements = []
    
    elements.append(Paragraph("1. EXECUTIVE SUMMARY", styles['ChapterTitle']))
    elements.append(Spacer(1, 0.2*inch))
    
    summary_text = """
    The CyberSOC Admin Interface represents the central command and control surface for platform operators, 
    enabling comprehensive management of users, organizations, licenses, security policies, and system 
    configurations. This specification document defines the complete functional requirements, technical 
    architecture, and integration patterns necessary to deliver a production-ready administrative 
    capability as part of the platform's General Availability (GA) release.
    """
    elements.append(create_body_text(summary_text))
    
    elements.append(create_section_header("1.1 Document Scope"))
    scope_text = """
    This specification encompasses four primary administrative domains that collectively enable full 
    operational control of the CyberSOC Platform. First, the Identity and Access Management domain 
    provides complete lifecycle management for user accounts, authentication credentials, session 
    state, and multi-factor authentication enrollment across all licensing tiers. Second, the 
    Organization and Tenant Management domain implements the multi-tenancy architecture required 
    for Managed Security Service Provider (MSSP) operations, including hierarchical resource isolation, 
    per-tenant configuration, and cross-tenant visibility controls. Third, the License and Revenue 
    Operations domain integrates with the six-tier pricing model to provide real-time license inventory 
    tracking, usage metering, automated tier enforcement, and revenue analytics. Fourth, the System 
    Configuration and Security domain offers centralized management of platform-wide settings, 
    integration endpoints, security policies, and compliance frameworks.
    """
    elements.append(create_body_text(scope_text))
    
    elements.append(create_section_header("1.2 Key Design Principles"))
    
    principles_data = [
        ["Principle", "Description", "Implementation"],
        ["Role-Based Access Control", 
         "All administrative actions governed by granular permission assignments tied to organizational roles",
         "RBAC engine with 47 discrete permissions across 8 functional domains"],
        ["Auditability",
         "Every administrative action logged with full context for compliance and forensics",
         "Immutable audit trail with tamper-evident logging to Elasticsearch cluster"],
        ["Multi-Tenancy Isolation",
         "Complete data and configuration separation between tenant organizations",
         "Row-level security + namespace-scoped Kubernetes resources + DB schema isolation"],
        ["Self-Service Operations",
         "Administrators can perform common tasks without engineering intervention",
         "Intuitive UI workflows with validation, bulk operations, and templated configurations"],
        ["API-First Architecture",
         "All administrative capabilities exposed via RESTful APIs for automation",
         "OpenAPI 3.0 specification with SDK generation for TypeScript, Python, Go"],
    ]
    elements.append(create_table(principles_data, col_widths=[1.5*inch, 2.8*inch, 2.2*inch]))
    elements.append(Spacer(1, 0.15*inch))
    
    elements.append(create_section_header("1.3 Success Criteria"))
    
    success_criteria = [
        "All CRUD operations for Users, Roles, Tenants, and Configurations fully functional with proper validation",
        "Role-based permission enforcement achieving 100% coverage of administrative API endpoints",
        "Audit logging capturing 100% of state-changing administrative actions with sub-second latency",
        "Dashboard components rendering within 3 seconds for datasets up to 100,000 records",
        "Bulk operations supporting minimum 1,000 items per batch with progress indication",
        "Cross-browser compatibility achieved for Chrome 90+, Firefox 88+, Safari 14+, Edge 90+",
        "WCAG 2.1 AA accessibility compliance for all administrative interfaces",
        "Integration tests achieving >95% code coverage for admin API endpoints"
    ]
    
    for criterion in success_criteria:
        elements.append(Paragraph(f"• {criterion}", styles['BulletText']))
    
    elements.append(PageBreak())
    return elements

def build_role_matrix():
    """Build Administrative Role Matrix section"""
    elements = []
    
    elements.append(Paragraph("2. ADMINISTRATIVE ROLE MATRIX", styles['ChapterTitle']))
    elements.append(Spacer(1, 0.2*inch))
    
    intro_text = """
    The CyberSOC Platform implements a hierarchical role-based access control (RBAC) system with four 
    predefined administrative roles, each calibrated to specific operational responsibilities and 
    trust levels. This section details the permissions, constraints, and typical use cases associated 
    with each role. Organizations may also define custom roles by combining individual permissions, 
    though the predefined roles cover the majority of deployment scenarios and are recommended as 
    starting points for most implementations.
    """
    elements.append(create_body_text(intro_text))
    
    # Super Administrator
    elements.append(create_section_header("2.1 Super Administrator (super_admin)"))
    
    super_admin_text = """
    The Super Administrator role represents the highest privilege level within the CyberSOC Platform, 
    intended for platform owners, principal engineers, and designated emergency responders. Users 
    assigned this role possess unrestricted access to all administrative functions, including the 
    ability to modify system-level configurations, manage other administrators, and override 
    tenant-level restrictions when necessary for troubleshooting or incident response. Due to the 
    extensive privileges associated with this role, organizations should implement strict controls 
    on its assignment, including mandatory approval workflows, regular access reviews, and 
    just-in-time elevation mechanisms where possible.
    """
    elements.append(create_body_text(super_admin_text))
    
    super_perms = [
        ["Permission Domain", "Capabilities"],
        ["User Management", "Create, read, update, delete any user account; reset passwords; unlock accounts; force password changes; disable MFA; impersonate users (audit-required); manage API keys; configure SSO mappings"],
        ["Role Management", "Create, modify, delete custom roles; assign any role to any user; modify permission sets; manage role hierarchies; configure permission inheritance rules"],
        ["Tenant Management", "Create and terminate tenant organizations; modify tenant quotas; access tenant data (with audit trail); transfer ownership between tenants; configure tenant-level settings"],
        ["System Configuration", "Modify global platform settings; manage integrations; configure alerting rules; update license keys; manage SSL certificates; configure backup schedules; control feature flags"],
        ["Security Operations", "View and export all audit logs; manage security policies; configure WAF rules; control IP allowlists; manage encryption keys; access forensic data"],
        ["Billing Operations", "View revenue dashboards; generate invoices; apply credits; modify subscription tiers; process refunds; configure payment gateways; view usage reports"],
    ]
    elements.append(create_table(super_perms, col_widths=[1.5*inch, 5*inch]))
    elements.append(Spacer(1, 0.15*inch))
    
    # Org Administrator
    elements.append(create_section_header("2.2 Organization Administrator (org_admin)"))
    
    org_admin_text = """
    The Organization Administrator role is designed for day-to-day operational management within a 
    single tenant organization. This role provides comprehensive control over the organization's 
    users, configurations, and resources while maintaining strict isolation from other tenants and 
    platform-level settings. In MSSP deployments, each customer organization typically has one or 
    more Org Administrators who manage their analysts, configure detection rules, and monitor 
    security posture without requiring intervention from the service provider's Super Administrators. 
    This separation of duties enables scalable multi-tenant operations while maintaining clear 
    accountability boundaries.
    """
    elements.append(create_body_text(org_admin_text))
    
    org_perms = [
        ["Permission Domain", "Capabilities"],
        ["User Management", "Create, read, update, delete users within organization; reset passwords; unlock accounts; manage group memberships; configure user-specific permissions; manage API keys for org users"],
        ["Resource Management", "Configure detection rules; manage playbooks; customize dashboards; configure alert routing; manage integration credentials (org-scoped); set retention policies"],
        ["Monitoring & Response", "Access all security data within organization; acknowledge alerts; manage incidents; execute response actions (within org scope); generate reports"],
        ["Configuration", "Modify organization-level settings; configure branding; manage notification channels; set up SSO for org users; configure IP restrictions"],
    ]
    elements.append(create_table(org_perms, col_widths=[1.5*inch, 5*inch]))
    elements.append(Spacer(1, 0.15*inch))
    
    # Billing Administrator
    elements.append(create_section_header("2.3 Billing Administrator (billing_admin)"))
    
    billing_admin_text = """
    The Billing Administrator role focuses specifically on financial operations, license management, 
    and revenue-related functions. This role is essential for organizations operating under the 
    Professional, Business, or Enterprise licensing tiers where usage tracking, invoice management, 
    and cost optimization are ongoing concerns. Billing Administrators can view detailed usage 
    metrics, generate financial reports, manage subscription plans, and handle customer inquiries 
    about charges without requiring access to security data or user management functions. This 
    role segregation supports compliance with financial controls and reduces the risk of 
    unauthorized access to sensitive operational data.
    """
    elements.append(create_body_text(billing_admin_text))
    
    billing_perms = [
        ["Permission Domain", "Capabilities"],
        ["License Management", "View license inventory; track seat utilization; request license allocation changes; view license expiration dates; download license certificates"],
        ["Usage Analytics", "View usage dashboards; generate usage reports; analyze consumption trends; set usage alerts; compare actual vs. allocated resources"],
        ["Invoice Operations", "View invoice history; download invoices; query charge details; dispute line items (creates support ticket); view payment status"],
        ["Subscription Management", "View current plan details; request plan changes (requires approval); view upgrade/downgrade options; estimate costs for different tiers"],
        ["Reporting", "Generate cost allocation reports; create budget forecasts; export data for finance systems; schedule recurring reports"],
    ]
    elements.append(create_table(billing_perms, col_widths=[1.5*inch, 5*inch]))
    elements.append(Spacer(1, 0.15*inch))
    
    # Read-Only Analyst
    elements.append(create_section_header("2.4 Read-Only Analyst (readonly_analyst)"))
    
    readonly_text = """
    The Read-Only Analyst role provides visibility into administrative data without modification 
    capabilities, suitable for auditors, compliance officers, junior analysts, and stakeholders 
    who require observational access without operational authority. Users with this role can view 
    user lists, examine configurations, review audit logs, and access dashboards but cannot make 
    changes, export sensitive data, or perform administrative actions. This role is particularly 
    valuable during security audits, compliance assessments, and onboarding periods where new team 
    members need to familiarize themselves with the platform's capabilities before receiving 
    elevated privileges.
    """
    elements.append(create_body_text(readonly_text))
    
    readonly_perms = [
        ["Permission Domain", "Capabilities"],
        ["Visibility", "View user lists (masked PII); view role assignments; view tenant configurations; view system health status; view license summaries"],
        ["Dashboards", "Access all read-only dashboards; filter and sort data; export anonymized aggregates; save personal view preferences"],
        ["Audit Logs", "View audit log entries; search and filter logs; view event details; cannot export raw logs or access deleted entries"],
        ["Reports", "View scheduled reports; access pre-built analytical views; cannot create custom reports or modify report templates"],
    ]
    elements.append(create_table(readonly_perms, col_widths=[1.5*inch, 5*inch]))
    elements.append(Spacer(1, 0.15*inch))
    
    # Permission Matrix
    elements.append(create_section_header("2.5 Comprehensive Permission Matrix"))
    
    matrix_intro = """
    The following matrix provides a complete reference mapping between administrative roles and 
    individual permissions. Each cell indicates whether the role possesses the permission (checkmark), 
    lacks it explicitly (X), or inherits it conditionally based on context (circle). This matrix 
    serves as the authoritative reference for permission assignments and should be consulted when 
    configuring custom roles or evaluating access requests.
    """
    elements.append(create_body_text(matrix_intro))
    
    perm_matrix = [
        ["Permission", "Super Admin", "Org Admin", "Billing Admin", "Read-Only"],
        ["users.create", "✓", "✓ (org only)", "—", "—"],
        ["users.delete", "✓", "✓ (org only)", "—", "—"],
        ["users.impersonate", "✓", "—", "—", "—"],
        ["roles.manage", "✓", "—", "—", "—"],
        ["tenants.create", "✓", "—", "—", "—"],
        ["tenants.configure", "✓", "✓ (own only)", "—", "—"],
        ["system.settings", "✓", "—", "—", "—"],
        ["billing.view", "✓", "✓ (summary)", "✓", "✓ (limited)"],
        ["billing.modify", "✓", "—", "✓ (requests)", "—"],
        ["audit.export", "✓", "✓ (org only)", "—", "—"],
        ["security.policies", "✓", "✓ (org only)", "—", "—"],
        ["integrations.manage", "✓", "✓ (org only)", "—", "—"],
    ]
    elements.append(create_table(perm_matrix, col_widths=[1.8*inch, 1.2*inch, 1.2*inch, 1.2*inch, 1.1*inch]))
    
    elements.append(PageBreak())
    return elements

def build_dashboard_architecture():
    """Build Dashboard Architecture section"""
    elements = []
    
    elements.append(Paragraph("3. DASHBOARD ARCHITECTURE", styles['ChapterTitle']))
    elements.append(Spacer(1, 0.2*inch))
    
    intro_text = """
    The administrative dashboard system provides real-time visibility into platform operations, 
    user activity, license utilization, and system health. Built on a modular component architecture, 
    dashboards can be customized, saved, and shared among administrators with appropriate permissions. 
    Each dashboard leverages the platform's unified analytics pipeline, ensuring consistent data 
    freshness (maximum 30-second latency for real-time widgets) and supporting drill-down navigation 
    from summary metrics to detailed record views.
    """
    elements.append(create_body_text(intro_text))
    
    # System Overview Dashboard
    elements.append(create_section_header("3.1 System Overview Dashboard"))
    
    system_overview_text = """
    The System Overview Dashboard serves as the administrative landing page, presenting a comprehensive 
    snapshot of platform health, active sessions, recent alerts, and pending action items. This 
    dashboard is visible to all administrative roles with varying levels of detail granularity. 
    Super Administrators see platform-wide aggregates across all tenants, while Organization 
    Administrators see data scoped to their specific organization. The dashboard employs a responsive 
    grid layout that adapts from four columns on desktop displays to a single column on mobile devices, 
    ensuring usability across all supported form factors.
    """
    elements.append(create_body_text(system_overview_text))
    
    overview_widgets = [
        ["Widget Name", "Data Source", "Refresh Rate", "Description"],
        ["Active Users Gauge", "Redis session store", "Real-time", "Circular gauge showing currently authenticated users vs. license seat count; color-coded thresholds at 70%, 90%, 100%"],
        ["System Health Score", "Aggregated health checks", "60 seconds", "Composite score (0-100) derived from API latency, error rates, database connectivity, queue depth; trend indicator shows 24hr change"],
        ["Alert Triage Queue", "Elasticsearch alert index", "30 seconds", "Count of unacknowledged alerts by severity; click-through to filtered alert list with bulk-acknowledge capability"],
        ["License Utilization Bar", "PostgreSQL license table", "5 minutes", "Horizontal stacked bar showing allocated vs. used seats per tier; hover reveals exact counts and expiration dates"],
        ["Recent Audit Events", "Elasticsearch audit index", "30 seconds", "Scrollable list of last 20 administrative actions with actor, timestamp, action type, and target entity"],
        ["Infrastructure Status", "Kubernetes API + Prometheus", "60 seconds", "Status indicators for each microservice pod showing CPU, memory, restart count, and uptime; click for detailed metrics"],
        ["Pending Approvals", "PostgreSQL workflow table", "2 minutes", "Count of items awaiting approval (new users, role changes, license requests); links to approval workflow screens"],
        ["Geographic Distribution", "GeoIP + Redis", "5 minutes", "World map heatmap showing login locations; highlights anomalous access patterns from unexpected regions"],
    ]
    elements.append(create_table(overview_widgets, col_widths=[1.4*inch, 1.4*inch, 0.9*inch, 2.8*inch]))
    elements.append(Spacer(1, 0.15*inch))
    
    # User Management Dashboard
    elements.append(create_section_header("3.2 User Management Dashboard"))
    
    user_dashboard_text = """
    The User Management Dashboard provides centralized visibility and control over all user accounts 
    within the administrator's scope of authority. For Super Administrators, this encompasses all 
    platform users across every tenant organization. For Organization Administrators, the view is 
    filtered to show only users belonging to their specific organization. The dashboard supports 
    advanced filtering, search, and bulk operations, enabling efficient management of user populations 
    ranging from handfuls to tens of thousands of accounts.
    """
    elements.append(create_body_text(user_dashboard_text))
    
    user_widgets = [
        ["Widget Name", "Data Source", "Refresh Rate", "Description"],
        ["User Directory Table", "PostgreSQL user directory", "On-demand", "Full-featured data table with sorting, filtering, column selection, pagination (50/100/250 rows); inline status toggle; row actions menu"],
        ["User Statistics Cards", "Aggregated queries", "5 minutes", "Four cards showing Total Users, Active Today, New This Week, Locked/Disabled; sparkline charts show 30-day trends"],
        ["Role Distribution Pie", "PostgreSQL role assignments", "5 minutes", "Interactive pie chart breaking down users by primary role; segment click filters directory table"],
        ["MFA Enrollment Status", "PostgreSQL mfa_credentials", "5 minutes", "Horizontal bar showing enrolled vs. not enrolled; breakdown by MFA method (TOTP, WebAuthn, SMS)"],
        ["Session Activity Timeline", "Redis + Elasticsearch", "30 seconds", "Timeline visualization of login/logout events over past 24 hours; zoomable; hover shows user and IP"],
        ["Pending Invitations", "PostgreSQL invitations", "2 minutes", "List of outstanding invitations with sent date, expiry, resend option, and revocation capability"],
    ]
    elements.append(create_table(user_widgets, col_widths=[1.4*inch, 1.4*inch, 0.9*inch, 2.8*inch]))
    elements.append(Spacer(1, 0.15*inch))
    
    # License & Revenue Dashboard
    elements.append(create_section_header("3.3 License & Revenue Dashboard"))
    
    license_dashboard_text = """
    The License and Revenue Dashboard provides Billing Administrators and Super Administrators with 
    comprehensive visibility into the platform's commercial operations. This dashboard aggregates 
    data from the Licensing Management System (LMS), payment processor webhooks, and usage metering 
    pipelines to present real-time insights into license utilization, revenue recognition, churn 
    risk, and growth opportunities. All financial figures can be displayed in multiple currencies 
    with daily exchange rate updates from provider APIs.
    """
    elements.append(create_body_text(license_dashboard_text))
    
    license_widgets = [
        ["Widget Name", "Data Source", "Refresh Rate", "Description"],
        ["Revenue Summary Cards", "LMS + Stripe/PayPal", "Hourly", "Monthly Recurring Revenue (MRR), Annual Run Rate, Average Revenue Per User (ARPU), Lifetime Value; period comparison"],
        ["License Inventory Grid", "LMS license pool", "5 minutes", "Visual grid showing license slots by tier and status (allocated, available, expired, reserved); color-coded occupancy"],
        ["Utilization Trend Line", "Usage metering DB", "Hourly", "Line chart showing seat utilization over time with forecast projection; configurable granularity (hour/day/week/month)"],
        ["Tier Distribution", "LMS subscriptions", "Hourly", "Donut chart showing subscriber distribution across Free/Professional/Business/Enterprise/Government tiers"],
        ["Churn Risk Indicator", "ML scoring pipeline", "Daily", "Scorecard showing at-risk accounts with churn probability scores; drill-down to individual account health metrics"],
        ["Revenue Waterfall", "Financial data warehouse", "Daily", "Waterfall chart showing MRR movements (new, expansion, contraction, churn) for selected period"],
    ]
    elements.append(create_table(license_widgets, col_widths=[1.4*inch, 1.4*inch, 0.9*inch, 2.8*inch]))
    elements.append(Spacer(1, 0.15*inch))
    
    # Usage Analytics Dashboard
    elements.append(create_section_header("3.4 Usage Analytics Dashboard"))
    
    usage_dashboard_text = """
    The Usage Analytics Dashboard delivers deep insights into how platform features are consumed, 
    enabling data-driven decisions about capacity planning, feature adoption, and user training 
    priorities. This dashboard processes telemetry events from client applications, API gateway 
    logs, and backend service metrics to construct comprehensive usage profiles. Administrators 
    can slice data by time period, user segment, organization, feature category, or geographic 
    region to identify patterns, anomalies, and optimization opportunities.
    """
    elements.append(create_body_text(usage_dashboard_text))
    
    usage_widgets = [
        ["Widget Name", "Data Source", "Refresh Rate", "Description"],
        ["Feature Adoption Heatmap", "Telemetry events", "Hourly", "Matrix showing adoption rate (users who used / total eligible) for each feature; rows=features, columns=time periods"],
        ["API Call Volume", "API gateway logs", "5 minutes", "Time series chart of API calls broken down by endpoint category; anomaly detection highlights unusual spikes"],
        ["Data Ingestion Rates", "Pipeline metrics", "Real-time", "Gauges showing EPS (events per second) for SIEM, EDR, threat intel feeds; alerts when approaching throughput limits"],
        ["Storage Consumption", "Object storage metrics", "Hourly", "Stacked area chart showing storage usage by data type (logs, PCAPs, artifacts, reports); projection based on growth rate"],
        ["Concurrent Sessions Graph", "Session store", "30 seconds", "Area chart showing concurrent active sessions over time; breakdown by user type (analyst, admin, API, service account)"],
        ["Query Performance", "Query engine metrics", "5 minutes", "Distribution histogram of query execution times; p50, p95, p99 markers; slow query leaderboard"],
    ]
    elements.append(create_table(usage_widgets, col_widths=[1.4*inch, 1.4*inch, 0.9*inch, 2.8*inch]))
    
    elements.append(PageBreak())
    return elements

def build_user_management_module():
    """Build User Management Module section"""
    elements = []
    
    elements.append(Paragraph("4. USER MANAGEMENT MODULE", styles['ChapterTitle']))
    elements.append(Spacer(1, 0.2*inch))
    
    intro_text = """
    The User Management Module provides complete lifecycle administration for platform user accounts, 
    spanning initial creation through eventual deactivation and data retention. This module implements 
    the Create, Read, Update, Delete (CRUD) paradigm with comprehensive validation, audit logging, 
    and notification workflows. All operations respect the principle of least privilege, ensuring 
    administrators can only modify accounts within their authorized scope.
    """
    elements.append(create_body_text(intro_text))
    
    # CRUD Operations
    elements.append(create_section_header("4.1 User CRUD Operations"))
    
    crud_text = """
    Each user account operation follows a defined workflow with validation gates, side effects, and 
    audit trail generation. The following specifications detail the data requirements, business logic, 
    and API contracts for each operation. Implementations must ensure atomicity of state changes, 
    meaning that either all side effects of an operation complete successfully, or none do, leaving 
    the system in a consistent state even under failure conditions.
    """
    elements.append(create_body_text(crud_text))
    
    crud_specs = [
        ["Operation", "Required Fields", "Validation Rules", "Side Effects"],
        ["CREATE", "email (unique), display_name, role_id, org_id, initial_password", "Email format valid; domain not blocked; password meets policy; role exists; org quota not exceeded; no duplicate email", "Send welcome email; create default API key; initialize MFA enrollment record; write audit event; increment org user count"],
        ["READ (Single)", "user_id OR email", "User exists; caller has visibility scope (same org or super admin); user not soft-deleted", "Log access if viewing PII fields; update last-accessed timestamp"],
        ["READ (List)", "filter params (role, status, org, search)", "Pagination required (max 250/page); filter values validated; search string sanitized (SQL injection prevention)", "Apply row-level security filter; log list access with filter parameters"],
        ["UPDATE", "user_id + fields to modify", "User exists; caller has edit权限; field-specific validations (e.g., email uniqueness); immutable fields rejected", "Write audit event for each changed field; send notification for sensitive changes (password, role, status); invalidate cached sessions if permissions changed"],
        ["DELETE (Soft)", "user_id", "User exists; caller has delete权限; cannot delete self; cannot delete last super admin", "Set deleted_at timestamp; revoke all sessions/tokens; release license seat; send deactivation notification; archive user data per retention policy"],
        ["DELETE (Hard)", "user_id + justification", "Soft-deleted > 90 days; retention policy allows; super admin only; MFA re-authentication required", "Permanently remove PII; anonymize referenced records; write compliance event; irreversible"],
    ]
    elements.append(create_table(crud_specs, col_widths=[0.9*inch, 1.5*inch, 1.8*inch, 1.8*inch]))
    elements.append(Spacer(1, 0.15*inch))
    
    # Bulk Operations
    elements.append(create_section_header("4.2 Bulk User Operations"))
    
    bulk_text = """
    Bulk operations enable efficient management of user populations at scale, supporting scenarios 
    such as onboarding entire departments, applying policy changes across user segments, and 
    offboarding departing personnel. All bulk operations execute asynchronously with progress 
    tracking, partial failure handling, and rollback capabilities. Administrators initiate bulk 
    operations via file upload (CSV template) or filtered selection from the user directory, then 
    monitor progress through a dedicated job queue interface.
    """
    elements.append(create_body_text(bulk_text))
    
    bulk_ops = [
        ["Operation", "Input Method", "Max Batch Size", "Processing", "Error Handling"],
        ["Bulk Create", "CSV upload (template)", "1,000 users", "Async job queue; parallel validation; batch insert (100/chunk)", "Continue on individual failures; collect errors in result report; rollback all if >50% fail"],
        ["Bulk Update", "Filtered selection + CSV", "500 users", "Async job; row-by-row update with validation; checkpoint every 50", "Skip invalid rows; log warnings; include skipped count in completion notification"],
        ["Bulk Role Change", "Selection + target role", "250 users", "Async job; validate role assignment permissions; apply in transaction batches", "Rollback entire batch if any assignment fails; notify affected users of role change"],
        ["Bulk Disable", "Selection + reason", "1,000 users", "Async job; immediate session revocation; license release", "Force-disable if session revocation fails (log warning); send bulk notification"],
        ["Bulk Export", "Filter criteria + fields", "10,000 users", "Async generation; encrypted download link (expires 24hr); PII masking per role", "Rate limit exports (3/hour per admin); log all export events with requester"],
    ]
    elements.append(create_table(bulk_ops, col_widths=[1.1*inch, 1.3*inch, 0.9*inch, 1.7*inch, 1.5*inch]))
    elements.append(Spacer(1, 0.15*inch))
    
    # Session Management
    elements.append(create_section_header("4.3 User Session Management"))
    
    session_text = """
    Session management capabilities allow administrators to monitor active user sessions, force 
    logout for security reasons, and investigate suspicious access patterns. The session store 
    maintains real-time visibility into authenticated connections across all access methods 
    (web console, API tokens, SSO sessions, service accounts). Session data includes client 
    information (IP address, user agent, geolocation), authentication method, session age, and 
    last activity timestamp, enabling informed decisions about session termination.
    """
    elements.append(create_body_text(session_text))
    
    session_features = [
        ["Feature", "Description", "Permissions Required", "Audit Impact"],
        ["Active Sessions View", "Real-time list of all active sessions for a user; shows device, IP, location, duration, auth method", "users.sessions.view", "Logged on access"],
        ["Force Logout", "Immediately invalidate specified session(s); user must re-authenticate; optional reason code for audit", "users.sessions.terminate", "High-sensitivity event; includes reason, affected sessions count"],
        ["Global User Logout", "Terminate ALL sessions for a user across all devices and methods; used for compromised account response", "users.sessions.terminate_global", "Critical event; triggers security alert; notifies user via email/SMS"],
        ["Session Anomaly Detection", "ML model flags sessions with unusual characteristics (impossible travel, new device, atypical hours)", "users.sessions.view", "Model inference logged; alerts generated for high-confidence anomalies"],
        ["Session History Report", "Historical listing of past sessions for user; includes login/logout times, durations, IPs; exportable", "users.sessions.history", "Export events logged; PII handling per data retention policy"],
    ]
    elements.append(create_table(session_features, col_widths=[1.3*inch, 2.3*inch, 1.3*inch, 1.6*inch]))
    
    elements.append(PageBreak())
    return elements

def build_role_permission_management():
    """Build Role & Permission Management section"""
    elements = []
    
    elements.append(Paragraph("5. ROLE & PERMISSION MANAGEMENT", styles['ChapterTitle']))
    elements.append(Spacer(1, 0.2*inch))
    
    intro_text = """
    The Role and Permission Management subsystem implements the authorization layer that governs 
    all access control decisions within the CyberSOC Platform. Built on a fine-grained permission 
    model with 47 discrete permissions across eight functional domains, this subsystem supports 
    both the predefined roles described in Section 2 and organization-defined custom roles. 
    Permission checks are enforced at the API gateway layer, ensuring that authorization decisions 
    are applied consistently regardless of which client application or integration initiates the 
    request.
    """
    elements.append(create_body_text(intro_text))
    
    # Role Definition Framework
    elements.append(create_section_header("5.1 Role Definition Framework"))
    
    framework_text = """
    Each role definition comprises a unique identifier, human-readable metadata, a set of granted 
    permissions, and optional constraint parameters. Roles exist within a flat namespace globally 
    (for system roles) or within an organization scope (for custom roles). The system prevents 
    creation of roles that would grant equivalent or exceeding privileges to existing roles without 
    explicit administrative intent, reducing the risk of privilege creep through redundant role 
    definitions.
    """
    elements.append(create_body_text(framework_text))
    
    role_schema = [
        ["Field", "Type", "Constraints", "Description"],
        ["id", "UUID (auto-generated)", "Immutable after creation", "Unique identifier for role reference in assignments and audit logs"],
        ["name", "String (3-100 chars)", "Unique within scope; alphanumeric, hyphens, underscores", "Machine-readable identifier for programmatic references (e.g., 'org_security_analyst')"],
        ["display_name", "String (3-200 chars)", "Required; UTF-8 supported", "Human-readable name shown in UI dropdowns and reports"],
        ["description", "Text (max 2000 chars)", "Optional", "Detailed explanation of role purpose and intended use cases"],
        ["scope", "Enum: [global, organization]", "Default: organization; only super admins can create global", "Determines visibility and assignment scope of the role"],
        ["is_system_role", "Boolean", "Immutable; only set during migration/seeding", "Flags predefined roles that cannot be deleted or have permissions removed below baseline"],
        ["permissions", "Array of permission strings", "Must reference valid permission IDs; no duplicates", "The set of permissions granted to users assigned this role"],
        ["created_at", "Timestamp (ISO 8601)", "Auto-set; immutable", "Record creation timestamp for auditing and ordering"],
        ["updated_at", "Timestamp (ISO 8601)", "Auto-updated on change", "Last modification timestamp for change detection and caching"],
    ]
    elements.append(create_table(role_schema, col_widths=[1.2*inch, 1.3*inch, 1.5*inch, 2.5*inch]))
    elements.append(Spacer(1, 0.15*inch))
    
    # Permission Assignment
    elements.append(create_section_header("5.2 Permission Assignment Workflow"))
    
    assignment_text = """
    Modifying the permission set associated with a role triggers a structured approval workflow 
    when the changes affect privileges that could impact security posture or compliance status. 
    The workflow enforces separation of duties by requiring a second administrator (with equal or 
    higher privileges) to approve sensitive permission grants. This two-person control prevents 
    single-administrator privilege escalation attacks and creates clear accountability chains for 
    audit purposes.
    """
    elements.append(create_body_text(assignment_text))
    
    workflow_steps = [
        ["Step", "Actor", "Action", "System Behavior"],
        ["1. Request", "Administrator", "Submits permission change proposal via Admin UI or API", "Validate proposed permissions exist; check for conflicts; calculate impact (affected users count); create pending change record"],
        ["2. Review", "Approver (different user)", "Examines proposal; approves, rejects, or requests modifications", "If approve: proceed to step 3; If reject: close with reason; If modify: return to requester"],
        ["3. Apply", "System (automated)", "Executes approved changes against role definition", "Update role in database; invalidate permission caches for affected users; write audit event with full diff"],
        ["4. Notify", "System (automated)", "Sends notifications to stakeholders", "Email to requester and approver; in-app notification to affected users if their permissions changed; webhook to SIEM if configured"],
    ]
    elements.append(create_table(workflow_steps, col_widths=[0.8*inch, 1.3*inch, 2.2*inch, 2.2*inch]))
    elements.append(Spacer(1, 0.15*inch))
    
    # Custom Role Creation
    elements.append(create_section_header("5.3 Custom Role Creation"))
    
    custom_role_text = """
    Organizations may define custom roles to address specific operational requirements not covered 
    by the predefined roles. Custom roles are scoped to the creating organization and cannot be 
    assigned to users in other tenants. The creation process guides administrators through 
    permission selection using a domain-grouped interface that explains each permission's implications 
    in plain language. Recommended permission combinations are offered as starting points for common 
    use cases (e.g., "Security Analyst", "Compliance Viewer", "Help Desk Operator").
    """
    elements.append(create_body_text(custom_role_text))
    
    custom_guidance = [
        ["Use Case", "Recommended Base Permissions", "Rationale"],
        ["Tier 1 SOC Analyst", "alerts.view, alerts.acknowledge, incidents.view, incidents.create, cases.view, threats.view", "Core triage and investigation capabilities without modification rights"],
        ["Senior Incident Responder", "All Tier 1 + incidents.update, incidents.resolve, cases.update, playbooks.execute, evidence.upload", "Adds ability to drive incidents to resolution and contribute to case artifacts"],
        ["SOC Shift Lead", "All Senior + alerts.manage, incidents.assign, cases.assign, users.view (org), reports.create", "Coordination and oversight capabilities for shift management duties"],
        ["Compliance Auditor", "audit.view, audit.export, configs.view, policies.view, reports.view, users.view (PII masked)", "Read-only access to configuration and activity data for audit procedures"],
        ["MSSP Customer Admin", "users.manage (org), configs.manage (org), integrations.manage (org), dashboards.customize", "Tenant-scoped administration for MSSP customers managing their own instance"],
    ]
    elements.append(create_table(custom_guidance, col_widths=[1.4*inch, 2.8*inch, 2.3*inch]))
    
    elements.append(PageBreak())
    return elements

def build_tenant_management():
    """Build Tenant/Organization Management section"""
    elements = []
    
    elements.append(Paragraph("6. TENANT/ORGANIZATION MANAGEMENT", styles['ChapterTitle']))
    elements.append(Spacer(1, 0.2*inch))
    
    intro_text = """
    The Tenant Management subsystem implements the multi-tenancy architecture that enables the 
    CyberSOC Platform to serve multiple independent organizations from a single deployment. This 
    capability is fundamental to the Managed Security Service Provider (MSSP) operating model, 
    where a single platform instance hosts dozens or hundreds of customer organizations, each 
    with isolated data, dedicated configurations, and independent user populations. The tenant 
    model also supports enterprise deployments where internal departments operate as separate 
    tenants for administrative and compliance purposes.
    """
    elements.append(create_body_text(intro_text))
    
    # MSSP Multi-Tenancy Model
    elements.append(create_section_header("6.1 MSSP Multi-Tenancy Model"))
    
    mssp_text = """
    In the MSSP operating model, the platform operator (the MSSP) maintains a privileged "provider" 
    tenant that has cross-tenant visibility and management capabilities. Customer organizations 
    exist as child tenants with strictly isolated data and limited visibility into the provider 
    environment or sibling tenants. This hierarchy enables the MSSP to deliver branded, customized 
    SOC services to each customer while maintaining operational efficiency through shared 
    infrastructure and centralized management tools.
    """
    elements.append(create_body_text(mssp_text))
    
    mssp_model = [
        ["Characteristic", "Provider Tenant (MSSP)", "Customer Tenant", "Technical Implementation"],
        ["Data Visibility", "Cross-tenant aggregate views plus own data", "Own data only; no visibility to other customers", "Database row-level security with tenant_id predicate; Elasticsearch index aliases per tenant"],
        ["User Management", "Can create/manage users in any tenant including own", "Can only manage users within own tenant", "User records linked to tenant_id; foreign key constraints enforce scope"],
        ["Configuration", "Platform defaults; can override per-tenant", "Inherits provider defaults; can customize within allowed range", "Hierarchical config system: platform -> tenant -> user; merge at evaluation time"],
        ["Branding", "Full white-label control; sets defaults for customers", "Can customize within provider-defined boundaries", "Branding templates with locked vs. editable elements; CSS scoping by tenant"],
        ["Support Access", "Can access customer tenants for support (audited)", "Cannot access provider or other customers", "Impersonation mechanism requires ticket ID; full audit trail; time-limited sessions"],
        ["Billing Visibility", "Sees all customer billing; manages invoicing", "Sees own invoices and usage; can view cost allocation", "LMS tenant_scoping flag controls data access; aggregated views for provider"],
    ]
    elements.append(create_table(mssp_model, col_widths=[1.2*inch, 1.5*inch, 1.5*inch, 2.3*inch]))
    elements.append(Spacer(1, 0.15*inch))
    
    # Tenant Configuration
    elements.append(create_section_header("6.2 Tenant Configuration Options"))
    
    config_text = """
    Each tenant maintains a configuration record that controls platform behavior within that 
    organization's scope. Configuration options span functional areas including security policies, 
    data retention, integration settings, user experience customization, and operational parameters. 
    The provider tenant can set platform-wide defaults that customer tenants inherit, while allowing 
    customers to customize permitted options to match their specific requirements and preferences.
    """
    elements.append(create_body_text(config_text))
    
    config_categories = [
        ["Category", "Example Settings", "Provider Control", "Customer Override"],
        ["Security Policies", "Password complexity, session timeout, MFA requirement, IP allowlist, brute-force lockout threshold", "Sets minimum requirements; can enforce stricter policies", "Can strengthen but not weaken below provider minimum"],
        ["Data Retention", "Log retention (days), PCAP storage duration, case closure archival, evidence retention after deletion", "Defines maximum retention limits (storage cost control)", "Can reduce retention period (cost savings) but not exceed maximum"],
        ["Alert Configuration", "Severity thresholds, noise suppression rules, escalation paths, notification channels, quiet hours", "Provides default rule sets; can push mandatory rules", "Can add custom rules; cannot disable provider-mandatory rules"],
        ["Integrations", "SIEM connection, EDR console, threat intel feeds, ticketing system, SOAR platform", "Pre-configures integrations; manages shared credentials", "Can input customer-specific credentials; select from provider-approved list"],
        ["Branding & UX", "Logo, color scheme, login page text, support contact info, documentation links", "Sets template and locked elements", "Can customize unlocked elements within brand guidelines"],
        ["Operational", "Timezone, date format, number format, default dashboard layout, feature flags", "Controls feature availability per pricing tier", "Can select among enabled features; cannot activate disabled features"],
    ]
    elements.append(create_table(config_categories, col_widths=[1.2*inch, 2.0*inch, 1.5*inch, 1.8*inch]))
    elements.append(Spacer(1, 0.15*inch))
    
    # Resource Quotas
    elements.append(create_section_header("6.3 Resource Quotas and Limits"))
    
    quota_text = """
    Resource quotas prevent any single tenant from consuming disproportionate platform resources, 
    ensuring fair distribution and predictable costs for the MSSP operator. Quotas are defined at 
    the provider level and assigned to tenant plans (Free, Professional, Business, Enterprise). The 
    system enforces quotas in real-time at the point of resource consumption, providing clear 
    feedback when limits are approached or exceeded. Quota excess triggers alerting to both the 
    affected tenant administrator and the provider operations team.
    """
    elements.append(create_body_text(quota_text))
    
    quota_table = [
        ["Resource", "Free Tier", "Professional", "Business", "Enterprise", "Enforcement Point"],
        ["User Seats", "5", "25", "100", "Unlimited", "User creation API; UI shows X/Y used"],
        ["Daily API Calls", "1,000", "50,000", "500,000", "Unlimited", "API gateway rate limiter; 429 response"],
        ["Storage (GB)", "10", "100", "1,000", "10,000+", "Object storage bucket policies; upload rejection"],
        ["Concurrent Sessions", "5", "25", "100", "500", "Session creation; oldest session terminated if at limit"],
        ["Custom Dashboards", "3", "25", "100", "Unlimited", "Dashboard save endpoint; list/delete to free slot"],
        ["Integrations", "2 (built-in only)", "10", "25", "Unlimited", "Integration creation endpoint"],
        ["Retention Days", "30", "90", "365", "730+", "Config save validator; cannot exceed max"],
        ["SSO/SAML", "Not available", "Available", "Included", "Advanced (IdP-initiated)", "Feature flag check at authentication"],
    ]
    elements.append(create_table(quota_table, col_widths=[1.3*inch, 0.7*inch, 0.8*inch, 0.8*inch, 0.9*inch, 1.5*inch]))
    
    elements.append(PageBreak())
    return elements

def build_system_configuration():
    """Build System Configuration section"""
    elements = []
    
    elements.append(Paragraph("7. SYSTEM CONFIGURATION", styles['ChapterTitle']))
    elements.append(Spacer(1, 0.2*inch))
    
    intro_text = """
    The System Configuration module provides Super Administrators with centralized control over 
    platform-wide settings that affect all tenants and users. These configurations govern core 
    platform behaviors including authentication mechanisms, external integrations, security 
    policies, and operational parameters. Changes to system configuration take effect according 
    to defined propagation rules, with some settings applied immediately and others requiring 
    service restarts or gradual rollout across the cluster.
    """
    elements.append(create_body_text(intro_text))
    
    # Global Settings
    elements.append(create_section_header("7.1 Global Platform Settings"))
    
    global_settings_text = """
    Global settings establish the baseline behavior of the CyberSOC Platform, providing defaults 
    that tenant-specific configurations can optionally override within defined bounds. These 
    settings are persisted in the platform configuration store with full version history, enabling 
    rollback to previous states if a configuration change causes operational issues. The 
    configuration UI presents settings in logical groups with inline documentation explaining 
    the purpose and implications of each option.
    """
    elements.append(create_body_text(global_settings_text))
    
    global_settings = [
        ["Setting Group", "Key Settings", "Change Impact", "Rollback Support"],
        ["Authentication", "Default session timeout (min), Password policy (length, complexity, rotation), MFA enforcement level, SSO provider configuration, LDAP/AD connection strings", "Immediate for new sessions; existing sessions expire naturally; credential changes require re-auth", "Instant rollback; sessions created under old policy remain valid until expiry"],
        ["Email/Notifications", "SMTP server settings, sender addresses, template defaults, rate limits, delivery retry policy, webhook URLs", "Immediate for new notifications; queued messages use old settings", "Instant rollback; does not affect already-sent messages"],
        ["Data Processing", "Default retention periods, PII redaction rules, anonymization thresholds, aggregation windows, sampling rates", "Applied to new data ingest; historical data unaffected until reprocessing", "Config version stored with processed data; can reprocess with old config"],
        ["API Gateway", "Rate limit defaults, CORS policies, request size limits, timeout values, TLS version requirements", "Immediate for API gateway pods; requires config reload (hot-reload supported)", "Hot-reload to previous config; ~5 second switchover"],
        ["Feature Flags", "Feature availability by tier, beta feature toggles, deprecation flags, maintenance mode switches", "Immediate (feature flag service polls every 30 seconds)", "Instant rollback; feature availability restored immediately"],
    ]
    elements.append(create_table(global_settings, col_widths=[1.2*inch, 2.3*inch, 1.5*inch, 1.5*inch]))
    elements.append(Spacer(1, 0.15*inch))
    
    # Integration Configuration
    elements.append(create_section_header("7.2 Integration Configuration"))
    
    integration_text = """
    The CyberSOC Platform integrates with numerous external systems to provide comprehensive 
    security operations capabilities. The Integration Configuration panel centralizes the management 
    of connection credentials, synchronization schedules, data mapping rules, and health monitoring 
    for all integrated systems. Each integration type has a specific configuration schema validated 
    against a JSON Schema definition, ensuring that required fields are present and values fall 
    within acceptable ranges before the connection is activated.
    """
    elements.append(create_body_text(integration_text))
    
    integrations = [
        ["Integration Type", "Configuration Parameters", "Authentication", "Health Check"],
        ["SIEM (Wazuh/Elastic)", "Server URL, indices, query templates, sync interval, field mappings, certificate pinning", "API key or client certificate; optional TLS mutual auth", "Query test index; measure round-trip latency; verify field presence"],
        ["EDR (GRR/osquery)", "Server URL, client labels, fetch ranges, artifact signatures", "API key + secret; optional mTLS certificate", "List connected clients; execute sample query; verify response parsing"],
        ["Threat Intel (MISP/OpenCTI)", "Server URL, taxonomies to sync, attribute types, correlation rules, score thresholds", "API key; optional IP restriction", "Fetch recent attributes; verify taxonomy parsing; check score calculation"],
        ["SOAR (TheHive/Cortex)", "Server URL, case templates, analyzer configurations, webhook callbacks", "API key + organization header; optional 2FA", "Create test case; trigger sample analyzer; verify callback receipt"],
        ["Ticketing (Jira/ServiceNow)", "Server URL, project/queue mappings, priority mappings, custom fields, SLA thresholds", "Personal access token or OAuth 2.0", "Create test ticket; verify field mapping; check SLA timer start"],
        ["Vulnerability (DefectDojo)", "Server URL, product/type mappings, severity calculations, scan import formats", "API key; optional SAML SSO", "Import sample scan; verify product creation; check severity mapping"],
        ["Identity Provider (SAML 2.0)", "Metadata URL or manual entry, attribute mappings, signature algorithms, NameID format", "X.509 certificate for assertion encryption/signing", "Initiate test login flow; verify attribute reception; check group mapping"],
    ]
    elements.append(create_table(integrations, col_widths=[1.2*inch, 2.0*inch, 1.4*inch, 1.4*inch]))
    elements.append(Spacer(1, 0.15*inch))
    
    # Security Policies
    elements.append(create_section_header("7.3 Security Policy Configuration"))
    
    security_policy_text = """
    Security policies define the protective measures that the platform enforces automatically to 
    safeguard data, prevent unauthorized access, and detect malicious activity. Policy configuration 
    balances security effectiveness with operational usability, avoiding overly restrictive settings 
    that would hinder legitimate security operations while maintaining strong defenses against 
    real-world attack vectors. The policy editor provides preset profiles (Standard, High Security, 
    Compliance-Focused) that can serve as starting points for customization.
    """
    elements.append(create_body_text(security_policy_text))
    
    security_policies = [
        ["Policy Domain", "Configurable Parameters", "Standard Preset", "High Security Preset"],
        ["Account Lockout", "Threshold (failed attempts), Duration (minutes), Cooldown (minutes)", "5 attempts, 30 min lock, 15 min cooldown", "3 attempts, 60 min lock, 30 min cooldown"],
        ["Password Policy", "Min length, uppercase, lowercase, digits, special chars, history (unique), age (days)", "12 chars, 3/4 categories, 12 history, 90 days", "16 chars, 4/4 categories, 24 history, 45 days"],
        ["Session Security", "Timeout idle (min), timeout absolute (hours), concurrent limit, re-auth for sensitive ops", "30 min idle, 8 hr absolute, 5 concurrent, re-auth for role changes", "15 min idle, 4 hr absolute, 3 concurrent, re-auth for PII access"],
        ["IP Restrictions", "Allowlist mode, allowed CIDRs, geo-blocking countries, VPN detection", "No restrictions by default", "Require allowlist; block high-risk countries; flag VPN IPs"],
        ["API Security", "Rate limit (req/min), payload size (MB), TLS minimum version, cipher suite whitelist", "1000/min, 10MB, TLS 1.2, modern ciphers", "300/min, 2MB, TLS 1.3, restricted ciphers"],
        ["Data Protection", "PII fields list, encryption at rest algorithm, backup encryption, key rotation (days)", "Standard PII list, AES-256, AES-256, 90 days", "Extended PII list, AES-256-GCM, AES-256-GCM, 30 days"],
    ]
    elements.append(create_table(security_policies, col_widths=[1.2*inch, 1.8*inch, 1.5*inch, 1.5*inch]))
    
    elements.append(PageBreak())
    return elements

def build_audit_compliance():
    """Build Audit Logging & Compliance section"""
    elements = []
    
    elements.append(Paragraph("8. AUDIT LOGGING & COMPLIANCE", styles['ChapterTitle']))
    elements.append(Spacer(1, 0.2*inch))
    
    intro_text = """
    Comprehensive audit logging forms the foundation of the CyberSOC Platform's compliance and 
    forensics capabilities. Every state-changing administrative action generates an immutable 
    audit event capturing the actor identity, action performed, target entity, before/after state 
    diff, timestamp, and source context (IP address, user agent, session ID). Audit events are 
    written to a dedicated Elasticsearch cluster with append-only semantics, preventing retroactive 
    modification or deletion by any user including Super Administrators.
    """
    elements.append(create_body_text(intro_text))
    
    # Audit Event Taxonomy
    elements.append(create_section_header("8.1 Audit Event Taxonomy"))
    
    taxonomy_text = """
    Audit events are classified into a hierarchical taxonomy that supports efficient querying, 
    compliance reporting, and alert rule configuration. The taxonomy comprises eight top-level 
    categories aligned with functional domains, each containing specific action types that capture 
    the semantic intent of the recorded operation. This structure enables compliance officers to 
    quickly locate relevant events (e.g., "all user permission changes in Q3") and security 
    analysts to detect suspicious patterns (e.g., "multiple failed login attempts followed by 
    successful authentication and mass data export").
    """
    elements.append(create_body_text(taxonomy_text))
    
    event_taxonomy = [
        ["Category", "Event Types", "Key Attributes", "Retention"],
        ["AUTHENTICATION", "LOGIN_SUCCESS, LOGIN_FAILURE, LOGOUT, PASSWORD_CHANGE, MFA_ENROLL, MFA_VERIFY, SSO_LOGIN, TOKEN_REFRESH, SESSION_IMPERSONATE", "user_id, auth_method, mfa_method, ip_address, user_agent, outcome (success/failure/reason)", "730 days (2 years)"],
        ["USER_MANAGEMENT", "USER_CREATE, USER_UPDATE, USER_DELETE, USER_DISABLE, USER_ENABLE, USER_UNLOCK, PASSWORD_RESET, ROLE_ASSIGN, ROLE_REVOKE, API_KEY_CREATE, API_KEY_REVOKE", "target_user_id, changed_fields (diff), actor_role, justification (if required)", "730 days (2 years)"],
        ["ROLE_MANAGEMENT", "ROLE_CREATE, ROLE_UPDATE, ROLE_DELETE, PERMISSION_GRANT, PERMISSION_REVOKE, ROLE_APPROVE, ROLE_REJECT", "role_id, permission_id, approval_workflow_id, approver_id", "2555 days (7 years)"],
        ["TENANT_MANAGEMENT", "TENANT_CREATE, TENANT_UPDATE, TENANT_SUSPEND, TENANT_RESUME, QUOTA_CHANGE, CONFIG_CHANGE, BRANDING_UPDATE", "tenant_id, config_key, old_value, new_value, business_justification", "2555 days (7 years)"],
        ["CONFIGURATION", "SYSTEM_CONFIG_CHANGE, INTEGRATION_CREATE, INTEGRATION_UPDATE, INTEGRATION_DELETE, FEATURE_FLAG_TOGGLE, POLICY_CHANGE", "config_path, old_value, new_value, rollout_percentage (if phased)", "2555 days (7 years)"],
        ["DATA_ACCESS", "DATA_EXPORT, DATA_VIEW_PII, REPORT_GENERATE, BULK_DOWNLOAD, SEARCH_QUERY (sensitive)", "data_type, record_count, query_params, export_format, destination", "730 days (2 years)"],
        ["SECURITY_EVENT", "ALERT_ACKNOWLEDGE, INCIDENT_ESCALATE, CASE_CLOSE, THREAT_INTEL_CONSUME, PLAYBOOK_EXECUTE, FORENSIC_ACCESS", "alert/incident_id, action_taken, outcome, artifacts_created", "2555 days (7 years)"],
        ["BILLING_OPERATION", "LICENSE_ALLOCATE, LICENSE_RELEASE, TIER_CHANGE, INVOICE_GENERATE, CREDIT_APPLY, REFUND_PROCESS", "license_id, quantity, amount, currency, payment_reference", "2555 days (7 years) - SOX relevant"],
    ]
    elements.append(create_table(event_taxonomy, col_widths=[1.2*inch, 2.0*inch, 1.8*inch, 1.0*inch]))
    elements.append(Spacer(1, 0.15*inch))
    
    # Log Retention & Export
    elements.append(create_section_header("8.2 Log Retention and Export"))
    
    retention_text = """
    Audit log retention periods align with regulatory requirements across multiple compliance 
    frameworks including SOC 2 Type II, GDPR, HIPAA, and FedRAMP. The system implements tiered 
    storage with hot storage (Elasticsearch, 90 days for active investigation), warm storage 
    (compressed Elasticsearch snapshots, 2 years for compliance queries), and cold storage 
    (object archive with immutable WORM protection, 7 years for legal hold). Automated policies 
    manage tier transitions based on age, with options to extend retention for specific event 
    categories or in response to legal hold requests.
    """
    elements.append(create_body_text(retention_text))
    
    retention_tiers = [
        ["Storage Tier", "Technology", "Age Range", "Access Latency", "Query Capability", "Cost Tier"],
        ["Hot", "Elasticsearch cluster (SSD)", "0 - 90 days", "< 1 second", "Full-text search, aggregations, real-time dashboards", "$$$$ (highest)"],
        ["Warm", "Elasticsearch frozen indices (HDD)", "90 - 730 days", "5-30 seconds", "Search, limited aggregations, no real-time", "$$ (moderate)"],
        ["Cold", "Object storage (WORM, compressed)", "730 - 2555 days", "Minutes to hours", "Batch query via restore job; full-text unavailable", "$ (lowest)"],
        ["Archive", "Glacier Deep Archive (optional)", "> 2555 hours", "Hours", "Full index restore required; significant lead time", "$ (minimal)"],
    ]
    elements.append(create_table(retention_tiers, col_widths=[0.9*inch, 1.6*inch, 0.9*inch, 1.0*inch, 1.8*inch, 0.9*inch]))
    elements.append(Spacer(1, 0.15*inch))
    
    # Compliance Reporting
    elements.append(create_section_header("8.3 Compliance Reporting"))
    
    compliance_text = """
    The platform provides built-in compliance report templates that aggregate audit data into 
    formats suitable for regulator submissions, auditor requests, and internal governance reviews. 
    Reports can be generated on-demand or scheduled for automatic delivery (email, SFTP, cloud 
    storage). Each report template maps to specific control requirements within major compliance 
    frameworks, with coverage matrices maintained as framework versions update.
    """
    elements.append(create_body_text(compliance_text))
    
    compliance_reports = [
        ["Report Template", "Framework Mapping", "Content Description", "Typical Audience", "Generation Frequency"],
        ["User Access Review", "SOC 2 CC6.1-6.3, ISO 27001 A.9.2", "Complete user list with roles, permissions, last login, manager certification status", "IT Managers, Auditors", "Quarterly (pre-certification)"],
        ["Privileged Activity Summary", "SOC 2 CC6.6-6.7, HIPAA 164.308(a)(5)", "All actions by privileged users (admins); grouped by user with counts and samples", "Security Team, Compliance", "Monthly"],
        ["Data Access Log", "GDPR Art. 28-32, CCPA 1798.185", "All instances of PII access including viewer, data accessed, purpose, legal basis", "DPO, Legal Counsel", "On-demand + quarterly"],
        ["Configuration Change Log", "SOC 2 CC8.1, ISO 27001 A.12.1.2", "Chronological list of system config changes with approver, justification, rollback status", "Change Advisory Board", "Per change window (weekly)"],
        ["Security Incident Timeline", "SOC 2 CC7.2-7.4, NIST IR", "Detailed incident timeline from detection through resolution; actions taken, notifications sent", "Incident Responders, Regulators", "Per incident + monthly summary"],
        ["Authentication Anomalies", "SOC 2 CC7.1, NIST AC-7", "Failed logins, impossible travel detections, unusual access patterns, brute-force attempts", "Security Operations", "Real-time alert + daily digest"],
    ]
    elements.append(create_table(compliance_reports, col_widths=[1.3*inch, 1.4*inch, 1.8*inch, 1.1*inch, 1.0*inch]))
    
    elements.append(PageBreak())
    return elements

def build_api_reference():
    """Build API Reference section"""
    elements = []
    
    elements.append(Paragraph("9. API REFERENCE", styles['ChapterTitle']))
    elements.append(Spacer(1, 0.2*inch))
    
    intro_text = """
    All administrative capabilities are exposed via RESTful APIs following OpenAPI 3.0 specification 
    standards. This API-first design ensures that any function accessible through the administrative 
    user interface can also be executed programmatically, enabling automation, integration with 
    external systems, and custom tooling development. The API gateway handles authentication, 
    authorization, rate limiting, request validation, and response formatting consistently across 
    all endpoints.
    """
    elements.append(create_body_text(intro_text))
    
    # Authentication Endpoints
    elements.append(create_section_header("9.1 Authentication and Authorization APIs"))
    
    auth_api_text = """
    Authentication endpoints handle user login, token refresh, session management, and multi-factor 
    authentication flows. The API uses JWT (JSON Web Tokens) for stateless authentication with 
    short-lived access tokens (15 minutes) and longer-lived refresh tokens (7 days). All sensitive 
    endpoints require valid authentication, and privileged operations additionally require recent 
    re-authentication (within 15 minutes) to confirm the operator's identity and intent.
    """
    elements.append(create_body_text(auth_api_text))
    
    auth_endpoints = [
        ["Method", "Endpoint", "Description", "Request Body", "Response", "Auth Required"],
        ["POST", "/api/v1/auth/login", "Authenticate user; return tokens", "{email, password, mfa_code?}", "{access_token, refresh_token, expires_in, user_summary}", "No"],
        ["POST", "/api/v1/auth/refresh", "Obtain new access token", "{refresh_token}", "{access_token, expires_in}", "No (valid refresh)"],
        ["POST", "/api/v1/auth/logout", "Invalidate current session", "{}", "{message: 'logged out'}", "Yes"],
        ["POST", "/api/v1/auth/mfa/enroll", "Begin MFA enrollment", "{method: 'totp'|'webauthn'}", "{secret (TOTP) | challenge (WebAuthn)}", "Yes + Re-auth"],
        ["POST", "/api/v1/auth/mfa/verify", "Complete MFA enrollment", "{code | response}", "{recovery_codes, confirmed: true}", "Yes + Re-auth"],
        ["GET", "/api/v1/auth/sessions", "List active sessions for user", "-", "[{session_id, ip, device, created_at, last_activity}]", "Yes"],
        ["DELETE", "/api/v1/auth/sessions/:id", "Terminate specific session", "-", "{message: 'session revoked'}", "Yes + Re-auth"],
        ["POST", "/api/v1/auth/impersonate", "Start impersonation session (super admin only)", "{target_user_id, ticket_id, reason}", "{impersonation_token, expires_in (1hr)}", "Yes + Super Admin"],
    ]
    elements.append(create_table(auth_endpoints, col_widths=[0.5*inch, 1.6*inch, 1.3*inch, 1.3*inch, 1.3*inch, 0.8*inch]))
    elements.append(Spacer(1, 0.15*inch))
    
    # User Management APIs
    elements.append(create_section_header("9.2 User Management APIs"))
    
    user_api_text = """
    User management endpoints provide programmatic access to all user lifecycle operations. These 
    APIs support the same validation, audit logging, and notification workflows as the UI-based 
    operations, making them suitable for automated provisioning/deprovisioning integrations with 
    HR systems, identity providers, and IT service management platforms. Bulk operations accept 
    arrays of user objects or reference a previously uploaded CSV file via job ID.
    """
    elements.append(create_body_text(user_api_text))
    
    user_endpoints = [
        ["Method", "Endpoint", "Description", "Key Parameters", "Notes"],
        ["GET", "/api/v1/admin/users", "List users with filtering", "?role=&status=&org_id=&search=&page=&limit=&sort=", "Returns paginated results; respects caller's scope"],
        ["POST", "/api/v1/admin/users", "Create new user", "{email, display_name, role_id, org_id, password, ...optional}", "Returns created user with ID; sends welcome email"],
        ["GET", "/api/v1/admin/users/:id", "Get user details", ":id (UUID)", "Includes role assignments, group membership, MFA status"],
        ["PATCH", "/api/v1/admin/users/:id", "Update user fields", "{fields to update}; supports partial updates", "Validates each field; audits changes; notifies on sensitive fields"],
        ["DELETE", "/api/v1/admin/users/:id", "Soft-delete user", "?reason=&force=", "Requires reason; force=true skips validation (super admin only)"],
        ["POST", "/api/v1/admin/users/bulk-create", "Batch create users", "{users: [...]} or {job_id: 'csv-upload-id'}", "Async; returns job ID for progress tracking"],
        ["POST", "/api/v1/admin/users/bulk-update", "Batch update users", "{user_ids: [], updates: {...}}", "Async; validates all before applying any"],
        ["POST", "/api/v1/admin/users/:id/unlock", "Unlock locked account", "-", "Clears failed login counters; resets lockout timers"],
        ["POST", "/api/v1/admin/users/:id/reset-password", "Force password reset", "{new_password, require_change_on_login: bool}", "Invalidates existing sessions; sends notification"],
        ["GET", "/api/v1/admin/users/:id/sessions", "List user sessions", "-", "For session management; returns active session details"],
    ]
    elements.append(create_table(user_endpoints, col_widths=[0.55*inch, 1.7*inch, 1.2*inch, 1.8*inch, 1.4*inch]))
    elements.append(Spacer(1, 0.15*inch))
    
    # Tenant Management APIs
    elements.append(create_section_header("9.3 Tenant Management APIs"))
    
    tenant_api_text = """
    Tenant management APIs enable programmatic creation, configuration, and administration of 
    organization tenants. These endpoints are primarily used by Super Administrators for MSSP 
    customer onboarding, automated tenant provisioning, and cross-tenant operations. Most tenant 
    endpoints require Super Administrator privileges due to the platform-wide impact of tenant 
    configuration changes.
    """
    elements.append(create_body_text(tenant_api_text))
    
    tenant_endpoints = [
        ["Method", "Endpoint", "Description", "Key Parameters", "Permissions"],
        ["GET", "/api/v1/admin/tenants", "List tenants", "?status=&plan=&created_after=", "Super Admin: all; Org Admin: own only"],
        ["POST", "/api/v1/admin/tenants", "Create new tenant", "{name, display_name, plan_id, admin_user, config: {...}}", "Super Admin only"],
        ["GET", "/api/v1/admin/tenants/:id", "Get tenant details", ":id (UUID)", "Super Admin: full; Org Admin: own (restricted)"],
        ["PATCH", "/api/v1/admin/tenants/:id", "Update tenant config", "{config_changes: {...}}", "Super Admin: all; Org Admin: allowed subset"],
        ["POST", "/api/v1/admin/tenants/:id/suspend", "Suspend tenant", "?reason=&duration=", "Super Admin only; terminates all user sessions"],
        ["POST", "/api/v1/admin/tenants/:id/resume", "Resume suspended tenant", "-", "Super Admin only; re-enables authentication"],
        ["PUT", "/api/v1/admin/tenants/:id/quotas", "Update tenant quotas", "{resource_limits: {...}}", "Super Admin only; cannot reduce below current usage"],
        ["GET", "/api/v1/admin/tenants/:id/usage", "Get usage statistics", "?period=&granularity=", "Super Admin: detailed; Org Admin: own summary"],
        ["GET", "/api/v1/admin/tenants/:id/audit", "Get tenant audit log", "?category=&start=&end=&limit=", "Super Admin: all; Org Admin: own events only"],
    ]
    elements.append(create_table(tenant_endpoints, col_widths=[0.55*inch, 1.7*inch, 1.2*inch, 1.8*inch, 1.4*inch]))
    elements.append(Spacer(1, 0.15*inch))
    
    # System Configuration APIs
    elements.append(create_section_header("9.4 System Configuration APIs"))
    
    sysconfig_api_text = """
    System configuration APIs provide access to platform-wide settings, integration management, 
    and operational controls. These are the most sensitive endpoints in the administrative API, 
    requiring Super Administrator privileges, recent re-authentication, and in some cases, explicit 
    approval workflow completion before changes take effect. Configuration changes are versioned 
    with full diff history, supporting immediate rollback if issues arise.
    """
    elements.append(create_body_text(sysconfig_api_text))
    
    sysconfig_endpoints = [
        ["Method", "Endpoint", "Description", "Key Parameters", "Approval Required"],
        ["GET", "/api/v1/admin/config", "Get all system config", "?group=&include_defaults=", "No"],
        ["GET", "/api/v1/admin/config/:key", "Get specific config value", ":key (dot-notation path)", "No"],
        ["PUT", "/api/v1/admin/config/:key", "Update config value", "{value:, justification:}", "For sensitive keys (auth, security, billing)"],
        ["POST", "/api/v1/admin/config/rollback", "Rollback to previous version", "{config_key:, version:, reason:}", "Yes (auto-approved if < 1 hour old)"],
        ["GET", "/api/v1/admin/integrations", "List integrations", "?type=&status=", "No"],
        ["POST", "/api/v1/admin/integrations", "Create integration", "{type:, name:, config:{...}, credentials:{...}}", "For credential-bearing integrations"],
        ["PUT", "/api/v1/admin/integrations/:id", "Update integration", "{config changes}", "For credential or endpoint changes"],
        ["POST", "/api/v1/admin/integrations/:id/test", "Test integration connectivity", "-", "No (read-only test)"],
        ["DELETE", "/api/v1/admin/integrations/:id", "Remove integration", "?force=&migrate_data_to=", "Yes (data loss implication)"],
        ["GET", "/api/v1/admin/health", "System health status", "?deep=&component=", "No (public endpoint with limited detail)"],
    ]
    elements.append(create_table(sysconfig_endpoints, col_widths=[0.55*inch, 1.65*inch, 1.2*inch, 1.75*inch, 1.4*inch]))
    
    elements.append(PageBreak())
    return elements

def build_billing_integration():
    """Build Billing/Licensing Integration section"""
    elements = []
    
    elements.append(Paragraph("10. BILLING/LICENSE INTEGRATION", styles['ChapterTitle']))
    elements.append(Spacer(1, 0.2*inch))
    
    intro_text = """
    The administrative interface integrates deeply with the CyberSOC Licensing Management System 
    (LMS) to provide real-time visibility into license inventory, automate usage-based metering, 
    enforce tier-specific limits, and support revenue operations. This integration ensures that 
    administrative actions affecting licensed capacity (user creation, tier changes, feature 
    enablement) are validated against the current license state before execution, preventing 
    over-allocation and ensuring accurate billing.
    """
    elements.append(create_body_text(intro_text))
    
    # License Inventory Sync
    elements.append(create_section_header("10.1 License Inventory Synchronization"))
    
    inventory_text = """
    The LMS maintains the authoritative record of license allocations across all tiers and tenants. 
    The administrative interface synchronizes with the LMS in near-real-time (cache TTL: 60 seconds) 
    to present accurate license availability data. When an administrator performs an action that 
    consumes license capacity (creating a user, upgrading a tier), the interface pre-validates 
    against the cached license state and holds a temporary reservation while the action completes, 
    preventing race conditions that could result in over-allocation.
    """
    elements.append(create_body_text(inventory_text))
    
    inventory_details = [
        ["License Attribute", "Data Source", "Sync Frequency", "Display Context", "Validation Rule"],
        ["Total Seats (per tier)", "LMS subscription table", "60 seconds cache", "License dashboard; user creation dialog", "Cannot allocate seat if available <= 0"],
        ["Allocated Seats", "LMS allocation table (sum)", "60 seconds cache", "License dashboard; tenant detail", "Calculated as sum of active user assignments"],
        ["Available Seats", "Computed: Total - Allocated", "Real-time (derived)", "License dashboard (prominent display)", "Warning if < 20%; Block if = 0"],
        ["Expiration Date", "LMS subscription record", "Cache + webhook events", "License list; tenant settings; alerts", "Warn 60/30/7 days before; Block operations if expired"],
        ["Entitlement Features", "LMS product catalog", "5 minutes cache", "Feature flags; integration availability", "Hide/disable features not included in tier"],
        ["Custom Limits", "LMS amendment records", "Cache + webhook", "Quota display; enforcement points", "Enforce as floor (cannot go below even if default higher)"],
    ]
    elements.append(create_table(inventory_details, col_widths=[1.2*inch, 1.3*inch, 1.0*inch, 1.5*inch, 1.5*inch]))
    elements.append(Spacer(1, 0.15*inch))
    
    # Usage Metering
    elements.append(create_section_header("10.2 Usage Metering and Analytics"))
    
    metering_text = """
    The usage metering pipeline collects telemetry on consumable resources (API calls, storage, 
    compute hours, data ingest volume) and reports aggregated metrics to the LMS for billing 
    calculation. Administrative interfaces expose usage data through dashboards and reports, 
    enabling both the platform operator (to track revenue) and tenant administrators (to manage 
    costs) to understand consumption patterns and optimize resource utilization.
    """
    elements.append(create_body_text(metering_text))
    
    metering_metrics = [
        ["Metric Name", "Unit", "Collection Method", "Granularity", "Billing Relevance"],
        ["Active User Seats", "count (daily snapshot)", "Session store query at midnight", "Daily", "Primary billing metric for seat-based tiers"],
        ["API Calls", "count", "API gateway access logs", "Per-request (aggregated hourly)", "Overage calculation for API-tiered plans"],
        ["Data Ingest (EPS)", "events per second average", "Pipeline metrics (Prometheus)", "1-minute averages (rolled hourly)", "Capacity planning; potential overage metric"],
        ["Storage Consumed", "gigabyte-hours", "Object storage metrics", "Hourly snapshots", "Storage tier billing; retention cost attribution"],
        ["Concurrent Sessions", "session-minutes", "Session store duration tracking", "Per-session (summed hourly)", "SLA metric; capacity planning"],
        ["Compute Hours", "vCPU-hours", "Kubernetes resource metrics", "Pod-level (summed hourly)", "Reserved instance utilization; cost allocation"],
        ["Report Generations", "count", "Report service logs", "Per-generation", "Feature usage tracking; potential metered feature"],
        ["Data Exports", "count + volume", "Export service logs", "Per-export", "Premium feature; potential volume limits"],
    ]
    elements.append(create_table(metering_metrics, col_widths=[1.2*inch, 0.9*inch, 1.4*inch, 1.3*inch, 1.7*inch]))
    elements.append(Spacer(1, 0.15*inch))
    
    # Tier Enforcement
    elements.append(create_section_header("10.3 Tier-Based Feature Enforcement"))
    
    enforcement_text = """
    Feature enforcement ensures that tenant organizations can only access capabilities included in 
    their subscribed tier. The enforcement operates at multiple layers: UI element visibility 
    (hiding inaccessible features), API gateway rejection (blocking direct API calls to gated 
    endpoints), and backend service validation (double-checking before executing restricted 
    operations). This defense-in-depth approach ensures tier compliance regardless of the access 
    method employed.
    """
    elements.append(create_body_text(enforcement_text))
    
    tier_features = [
        ["Feature/Capability", "Free", "Professional ($149/u/mo)", "Business ($299/u/mo)", "Enterprise ($50K+/yr)", "Enforcement Layer"],
        ["User Seats", "5", "25", "100", "Unlimited", "DB constraint + API validation"],
        ["SIEM Integration", "Basic (10 GB/day)", "Standard (500 GB/day)", "High (2 TB/day)", "Custom", "Ingest pipeline throttle"],
        ["EDR Connectivity", "Read-only", "Full management", "Full + RIR", "Custom + API", "EDR client capability token"],
        ["SOAR Playbooks", "10 built-in", "100 built-in + 25 custom", "Unlimited custom", "Unlimited + shared", "Playbook execution service"],
        ["Threat Intel Feeds", "Open source only", "Commercial + OSINT", "Premium commercial", "Custom feeds", "Feed connector license check"],
        ["API Access Rate", "1,000 req/min", "10,000 req/min", "50,000 req/min", "Custom SLA", "API gateway rate limiter"],
        ["SSO/SAML 2.0", "Not available", "Available", "Included", "Advanced (IdP-initiated, JIT)", "Auth middleware feature flag"],
        ["Custom Branding", "None", "Logo + colors", "Full white-label", "Full + custom domain", "Theme resolver + CDN routing"],
        ["Support Level", "Community", "Business hours", "24/7", "Dedicated CSM", "Routing tag in ticketing system"],
        ["Audit Log Retention", "30 days", "90 days", "1 year", "7+ years", "Index lifecycle policy"],
        ["Compliance Reports", "Basic (self-service)", "Standard templates", "Custom + mapping", "Full consultancy", "Report generator feature gate"],
    ]
    elements.append(create_table(tier_features, col_widths=[1.3*inch, 0.8*inch, 1.1*inch, 1.0*inch, 1.1*inch, 1.2*inch]))
    
    elements.append(PageBreak())
    return elements

def build_security_requirements():
    """Build Security Requirements section"""
    elements = []
    
    elements.append(Paragraph("11. SECURITY REQUIREMENTS", styles['ChapterTitle']))
    elements.append(Spacer(1, 0.2*inch))
    
    intro_text = """
    The administrative interface represents a high-value target for adversaries due to the extensive 
    privileges it controls. Security requirements for the admin interface exceed those for general 
    platform functionality, implementing defense-in-depth controls across authentication, 
    authorization, data protection, and monitoring dimensions. This section specifies mandatory 
    security controls that must be implemented and verified before the admin interface can be 
    deployed to production environments.
    """
    elements.append(create_body_text(intro_text))
    
    # Authentication Security
    elements.append(create_section_header("11.1 Authentication Security Controls"))
    
    auth_security_text = """
    Administrative access requires stronger authentication than standard user access, reflecting 
    the elevated risk profile of administrative actions. All administrators must enroll in 
    multi-factor authentication (MFA) using hardware security keys (WebAuthn/FIDO2) or Time-based 
    One-Time Password (TOTP) applications. Session lifetimes are shorter for administrative 
    contexts, and sensitive operations require step-up authentication to confirm the operator's 
    identity and intent immediately before execution.
    """
    elements.append(create_body_text(auth_security_text))
    
    auth_controls = [
        ["Control", "Requirement", "Implementation", "Verification Method"],
        ["MFA Enforcement", "100% of admin accounts must have active MFA; cannot disable or bypass", "Auth middleware blocks access if user.mfa_enabled != true; no exception paths", "Automated audit scan; penetration test"],
        ["Session Timeout", "Maximum 15 minutes idle; 8 hours absolute regardless of activity", "JWT claims: iat + exp <= 480 min; activity check extends idle but not absolute", "Session timing tests; token inspection"],
        ["Step-Up Auth", "Re-authenticate for: role changes, user deletion, config modifications, PII export", "Sensitive endpoints check last_auth_timestamp; reject if > 15 minutes ago", "Integration test suite; pen test"],
        ["Password Policy", "Minimum 16 characters; 3 of 4 character types; no common passwords; 45-day rotation", "Zxcvbn strength score >= 4; bcrypt cost factor 12; history check (24 passwords)", "Password acceptance tests; dictionary attack simulation"],
        ["Brute Force Protection", "Account lockout after 3 failures; 30-minute cooldown; exponential backoff", "Rate limiter keyed by IP + username; CAPTCHA after 2 failures; permanent lock after 5 cycles", "Lockout timing verification; bypass attempt testing"],
        ["Device Trust", "Remember trusted devices for 30 days; require MFA on new/unrecognized devices", "Device fingerprint stored with session; challenge new devices; admin can revoke devices", "New device login flow testing; fingerprint manipulation attempts"],
    ]
    elements.append(create_table(auth_controls, col_widths=[1.1*inch, 1.8*inch, 2.0*inch, 1.4*inch]))
    elements.append(Spacer(1, 0.15*inch))
    
    # Authorization Controls
    elements.append(create_section_header("11.2 Authorization and Access Controls"))
    
    authz_text = """
    Authorization decisions follow the principle of least privilege, granting administrators only 
    the minimum permissions necessary to perform their assigned duties. Permission checks occur 
    at the API gateway layer before any business logic executes, ensuring that unauthorized requests 
    are rejected early with minimal information disclosure. The authorization engine caches 
    permission decisions with short TTL (30 seconds) to balance performance with responsiveness 
    to permission changes.
    """
    elements.append(create_body_text(authz_text))
    
    authz_controls = [
        ["Control", "Requirement", "Implementation", "Verification Method"],
        ["Permission Granularity", "47 discrete permissions across 8 domains; no wildcard or 'admin' bypass", "Each endpoint mapped to specific permission(s); RBAC middleware enforces before handler", "Permission matrix review; bypass attempt testing"],
        ["Scope Isolation", "Org admins cannot access other tenants' data; row-level security enforced", "Database queries include tenant_id predicate; Elasticsearch queries use index aliases", "Cross-tenant access attempt testing; SQL injection with tenant bypass"],
        ["Separation of Duties", "Sensitive actions require second approver (different user, equal/higher role)", "Workflow engine routes approval requests; action blocked until approved; timeout after 24 hours", "Self-approval attempt testing; workflow bypass attempts"],
        ["Privilege Escalation Prevention", "Users cannot grant permissions they don't possess; no recursive role elevation", "Permission check: actor.hasPermission(target_permission) before granting; cycle detection in role graph", "Escalation path analysis; graph traversal testing"],
        ["API Security", "All admin APIs authenticated; rate limited; input validated; output sanitized", "Gateway middleware chain: auth -> rate_limit -> validate -> rbac -> handler -> sanitize -> respond", "API security scanning (OWASP ZAP); fuzz testing"],
        ["Console Access Control", "No direct database or server access from web console; all via API", "Backend services connect to infra using service accounts; no user-cred paths to data stores", "Network segmentation verification; credential path analysis"],
    ]
    elements.append(create_table(authz_controls, col_widths=[1.2*inch, 1.7*inch, 2.0*inch, 1.4*inch]))
    elements.append(Spacer(1, 0.15*inch))
    
    # Data Protection
    elements.append(create_section_header("11.3 Data Protection Requirements"))
    
    data_protection_text = """
    Administrative interfaces handle sensitive data including personally identifiable information 
    (PII), authentication credentials, security configurations, and audit logs. Data protection 
    controls ensure confidentiality (encryption at rest and in transit), integrity (tamper detection), 
    and availability (appropriate access controls and backup) for all data classes processed by 
    the admin interface.
    """
    elements.append(create_body_text(data_protection_text))
    
    data_controls = [
        ["Data Class", "Examples", "Encryption at Rest", "Encryption in Transit", "Access Logging"],
        ["Highly Restricted", "Passwords, MFA secrets, API keys, private certificates", "AES-256-GCM; HSM for root keys; key rotation 90 days", "TLS 1.3 required; certificate pinning for admin clients", "Every access logged with user ID, IP, timestamp, purpose"],
        ["Restricted", "PII (SSN, passport), biometric templates, recovery codes", "AES-256; application-level encryption; separate key per tenant", "TLS 1.2 minimum; mutual TLS for service-to-service", "Access logged; PII access triggers additional notification"],
        ["Internal", "User names, email addresses, phone numbers, addresses", "AES-256; database transparent data encryption (TDE)", "TLS 1.2 minimum", "Access logged on view/export; aggregate access OK"],
        ["Internal (Operational)", "Configurations, audit logs, system metrics, job statuses", "AES-256 TDE; volume encryption for object storage", "TLS 1.2 minimum for admin; internal network otherwise", "Modification logged; view access sampled (10%)"],
        ["Public", "Documentation, help content, marketing materials", "Not required (no sensitive data)", "TLS recommended; integrity verification via signatures", "No access logging required"],
    ]
    elements.append(create_table(data_controls, col_widths=[1.0*inch, 1.4*inch, 1.4*inch, 1.4*inch, 1.3*inch]))
    
    elements.append(PageBreak())
    return elements

def build_implementation_roadmap():
    """Build Implementation Roadmap section"""
    elements = []
    
    elements.append(Paragraph("12. IMPLEMENTATION ROADMAP", styles['ChapterTitle']))
    elements.append(Spacer(1, 0.2*inch))
    
    intro_text = """
    The following roadmap outlines the phased approach for implementing the administrative 
    interface, sequencing work items to deliver incremental value while managing dependencies 
    between components. The timeline assumes a dedicated team of 2-3 frontend developers, 1-2 
    backend developers, and 0.5 QA engineer working over approximately 12-16 weeks. Adjustments 
    may be needed based on team capacity, existing codebase familiarity, and integration complexity.
    """
    elements.append(create_body_text(intro_text))
    
    phases = [
        ["Phase", "Duration", "Deliverables", "Dependencies", "Success Criteria"],
        ["Phase 1: Foundation\n(Weeks 1-3)", "3 weeks", "- Auth middleware hardening\n- RBAC engine core\n- Basic user CRUD\n- Audit logging infrastructure\n- Admin layout shell", "Database schema finalized\nAuth service stable\nDesign system established", "Users can be created/edited/deleted via API;\nPermission checks enforced;\nAudit events written for all mutations"],
        ["Phase 2: Core Modules\n(Weeks 4-7)", "4 weeks", "- User management UI (list, detail, forms)\n- Role management (CRUD + permissions)\n- Session management views\n- Dashboard framework\n- System overview dashboard", "Phase 1 complete\nUI component library ready\nAPI specs finalized", "All user operations available in UI;\nRoles can be created and assigned;\nDashboard renders with real data"],
        ["Phase 3: Advanced Features\n(Weeks 8-10)", "3 weeks", "- Tenant management (CRUD + config)\n- Bulk operations (upload, progress)\n- License integration (display)\n- Usage analytics dashboard\n- Notification system", "Phase 2 complete\nLMS API available\nTelemetry pipeline active", "Tenants can be provisioned;\nBulk user operations work;\nLicense data displays accurately"],
        ["Phase 4: Security Hardening\n(Weeks 11-12)", "2 weeks", "- Step-up authentication flows\n- Approval workflows\n- Session anomaly detection\n- Security policy UI\n- Penetration test remediation", "Phase 3 complete\nSecurity review completed\nPen test scheduled", "All security controls per Section 11 implemented;\nNo critical/high findings from pen test"],
        ["Phase 5: Polish & Launch\n(Weeks 13-14)", "2 weeks", "- Performance optimization\n- Accessibility (WCAG 2.1 AA)\n- Documentation (user guide, API ref)\n- Training materials\n- Production deployment", "Phase 4 complete\nStaging environment validated\nSign-off from security/compliance", "Page load < 3 seconds;\nAccessibility audit passes;\nDocs published;\nGo-live approved"],
    ]
    elements.append(create_table(phases, col_widths=[1.0*inch, 0.7*inch, 1.7*inch, 1.3*inch, 1.8*inch]))
    elements.append(Spacer(1, 0.2*inch))
    
    # Risk Mitigation
    elements.append(create_section_header("12.1 Risk Factors and Mitigations"))
    
    risks = [
        ["Risk", "Probability", "Impact", "Mitigation Strategy", "Contingency"],
        ["Scope creep from stakeholder requests", "High", "Medium", "Strict change control; defer non-MVP features to post-GA backlog; reference this spec as baseline", "Prioritize by user value; cut lowest-value items if timeline pressured"],
        ["Integration delays (LMS, auth providers)", "Medium", "High", "Early integration testing (Week 2); mock services for development; dedicated integration sprints", "Implement stubbed responses; ship with reduced integration; fast-follow patch"],
        ["Security findings delay launch", "Medium", "High", "Embed security engineer in team; continuous security scanning; pen test at end of Phase 3 (not post-launch)", "Launch with mitigating controls (monitoring, enhanced logging); harden in hotfix"],
        ["Performance issues at scale", "Medium", "Medium", "Load testing from Week 10; performance budgets for each page; profiling in staging", "Implement pagination, lazy loading, caching; defer heavy computations to background jobs"],
        ["Team availability/capacity constraints", "Low", "High", "Buffer time in estimates (20%); cross-training on critical path items; documented runbooks", "Reduce scope to Phase 1-3 essentials; defer Phase 4-5 items to post-GA sprint"],
    ]
    elements.append(create_table(risks, col_widths=[1.5*inch, 0.7*inch, 0.6*inch, 2.0*inch, 1.7*inch]))
    
    elements.append(PageBreak())
    return elements

def build_appendices():
    """Build Appendix sections"""
    elements = []
    
    # Appendix A: UI Mockup Descriptions
    elements.append(Paragraph("APPENDIX A: UI MOCKUP DESCRIPTIONS", styles['ChapterTitle']))
    elements.append(Spacer(1, 0.2*inch))
    
    appendix_a_text = """
    This appendix provides detailed textual descriptions of the key administrative interface 
    screens, serving as specifications for UI/UX designers and frontend developers. Each screen 
    description includes the layout structure, component inventory, interaction patterns, and 
    responsive behavior breakpoints. The design follows the CyberSOC Cascade Palette design 
    system established in previous platform deliverables, ensuring visual consistency with 
    existing dashboard and analyst interfaces.
    """
    elements.append(create_body_text(appendix_a_text))
    
    ui_screens = [
        ["Screen Name", "Layout", "Key Components", "Interactions"],
        ["Login Page", "Centered card (480px wide); logo above; form fields stacked vertically; footer links", "Email input, Password input (toggle visibility), MFA code input (conditional), Remember me checkbox, Login button, Forgot password link, SSO button (if configured)", "Form validation (inline errors); Enter submits; Tab navigates fields; MFA appears after valid creds; Loading spinner on submit"],
        ["Admin Dashboard", "4-column grid (responsive: 4->2->1); header with user menu + notifications; sidebar navigation", "Stat cards (4-6), Chart widgets (2-3), Activity feed (1), Quick actions bar (1), Alert banner (conditional)", "Cards clickable for drill-down; Charts have time range selector; Feed auto-refreshes (30s); Quick actions open modals"],
        ["User List", "Full-width table with toolbar above; pagination below; detail drawer slides in from right", "Search bar, Filter dropdowns (status, role, org), Bulk actions toolbar, Column selector, Data table (selectable rows), Pagination (showing X-Y of Z), Export button", "Row click opens detail drawer; Checkbox selection enables bulk actions; Search debounces 300ms; Sort by column header; Filters combine with AND logic"],
        ["User Detail", "Two-column layout (2:1 ratio); left column = main content; right = context/related", "Header (avatar, name, status badge, action buttons), Tab navigation (Profile, Roles, Sessions, Audit), Form fields per tab, Related cards (tenant, manager, created/updated)", "Tabs switch content without navigation; Save button persists changes; Cancel discards; Confirmation modal for destructive actions"],
        ["Role Editor", "Modal dialog (large, 800px wide); header with drag handle; body scrolls; footer with actions", "Role name/description fields, Permission tree (domain groups expandable), Affected users counter, Preview changes button, Save/Cancel buttons", "Permission tree checkboxes with indeterminate state; Parent group checks children; Counter updates in real-time; Preview shows diff from current state"],
        ["Tenant Wizard", "Multi-step wizard (stepper header; content area; footer with Back/Next/Finish)", "Step 1: Basic info (name, plan, admin user), Step 2: Configuration (inherit or customize), Step 3: Quotas (review/edit defaults), Step 4: Review & Confirm (summary with edit links)", "Steps validate before proceeding; Back preserves entries; Finish creates tenant (async with progress); Success screen with next steps"],
    ]
    elements.append(create_table(ui_screens, col_widths=[1.1*inch, 1.5*inch, 1.8*inch, 2.1*inch]))
    
    elements.append(PageBreak())
    
    # Appendix B: Database Schema Reference
    elements.append(Paragraph("APPENDIX B: DATABASE SCHEMA REFERENCE", styles['ChapterTitle']))
    elements.append(Spacer(1, 0.2*inch))
    
    appendix_b_text = """
    This appendix defines the core database tables required to support the administrative interface. 
    The schema is designed for PostgreSQL 15+ with considerations for query performance, data 
    integrity, and auditability. Tables are organized by functional domain with foreign key 
    relationships explicitly defined. Index recommendations balance read performance against 
    write overhead for the expected workload patterns.
    """
    elements.append(create_body_text(appendix_b_text))
    
    schema_tables = [
        ["Table Name", "Purpose", "Key Columns", "Indexes", "Est. Rows"],
        ["users", "User account master record", "id (PK, UUID), email (unique, indexed), display_name, password_hash, org_id (FK), status, mfa_enabled, created_at, updated_at, deleted_at", "UNIQUE(email) WHERE deleted_at IS NULL; INDEX(org_id); INDEX(status); INDEX(created_at)", "10K - 1M+"],
        ["roles", "Role definitions", "id (PK, UUID), name (unique within scope), display_name, description, scope (global/org), is_system_role, created_by (FK), created_at", "UNIQUE(name, scope); INDEX(scope)", "20 - 100"],
        ["permissions", "Permission registry (seeded)", "id (PK, UUID), code (unique), domain, description, is_system (immutable)", "UNIQUE(code); INDEX(domain)", "~47 (static)"],
        ["role_permissions", "Many-to-many role-permission mapping", "role_id (FK, PK part), permission_id (FK, PK part), granted_by (FK), granted_at", "PRIMARY KEY(role_id, permission_id); INDEX(permission_id)", "100 - 500"],
        ["user_roles", "User role assignments", "id (PK, UUID), user_id (FK), role_id (FK), assigned_by (FK), assigned_at, expires_at (nullable)", "INDEX(user_id); INDEX(role_id); UNIQUE(user_id, role_id) WHERE expires_at IS NULL", "1:1 with users (avg 1-2 roles)"],
        ["tenants", "Organization/tenant records", "id (PK, UUID), name, display_name, slug (unique), plan_id (FK), status, config (JSONB), branding (JSONB), created_at, suspended_at", "UNIQUE(slug); INDEX(plan_id); INDEX(status)", "1 - 10K"],
        ["tenant_quotas", "Resource limits per tenant", "id (PK), tenant_id (FK, unique), resource_type (enum), limit_value, used_value (computed), updated_at", "UNIQUE(tenant_id, resource_type); INDEX(resource_type)", "5-8 rows per tenant"],
        ["audit_events", "Immutable audit log", "id (PK, UUID), event_type, actor_id (FK), actor_ip, target_type, target_id, diff (JSONB), metadata (JSONB), timestamp (indexed, partition key)", "INDEX(timestamp); INDEX(event_type); INDEX(actor_id); INDEX(target_type, target_id); PARTITION BY RANGE (timestamp)", "Millions - billions"],
        ["config_entries", "System/Tenant configuration", "id (PK), key (unique), value (JSONB), scope (system/tenant), tenant_id (FK nullable), version, updated_by (FK), updated_at", "UNIQUE(key, scope, COALESCE(tenant_id, '00000000-...')); INDEX(scope)", "100 - 500"],
        ["integration_configs", "External integration definitions", "id (PK), tenant_id (FK), type (enum), name, config (JSONB, encrypted), credentials (JSONB, encrypted), status, health_status, health_checked_at, created_at", "INDEX(tenant_id); INDEX(type); INDEX(status)", "5 - 50 per tenant"],
    ]
    elements.append(create_table(schema_tables, col_widths=[1.0*inch, 1.2*inch, 2.0*inch, 1.3*inch, 0.9*inch]))
    
    elements.append(PageBreak())
    
    # Appendix C: Error Code Catalog
    elements.append(Paragraph("APPENDIX C: ERROR CODE CATALOG", styles['ChapterTitle']))
    elements.append(Spacer(1, 0.2*inch))
    
    appendix_c_text = """
    The administrative API uses structured error codes to enable programmatic error handling and 
    clear user communication. Errors follow the RFC 7807 Problem Details format with a custom 
    `code` field for machine readability. This catalog enumerates all error codes that admin 
    API clients should anticipate and handle appropriately. Codes are organized by HTTP status 
    code and functional domain to facilitate quick lookup during integration development.
    """
    elements.append(create_body_text(appendix_c_text))
    
    error_codes = [
        ["HTTP Status", "Error Code", "Message Template", "When Returned", "Client Action"],
        ["400", "INVALID_REQUEST_BODY", "Request body validation failed: {details}", "Required fields missing; wrong data types; enum values invalid", "Fix request body per validation errors; re-submit"],
        ["400", "DUPLICATE_VALUE", "A record with this {field} already exists", "Creating user with existing email; creating role with existing name", "Check for existing record; use different value or update existing"],
        ["400", "QUOTA_EXCEEDED", "Resource quota exceeded for {resource}: {current}/{limit}", "Creating user would exceed seat limit; storage would exceed cap", "Upgrade plan; free up resources; contact admin"],
        ["401", "AUTHENTICATION_REQUIRED", "Authentication credentials required", "Missing or invalid Authorization header; expired token", "Obtain fresh token via login or refresh endpoint"],
        ["401", "INVALID_CREDENTIALS", "Invalid email or password", "Login attempt with wrong password", "Verify credentials; offer password reset flow"],
        ["401", "MFA_REQUIRED", "Multi-factor authentication required", "User has MFA enrolled but didn't provide code", "Prompt for MFA code; restart auth flow with MFA"],
        ["401", "TOKEN_EXPIRED", "Authentication token has expired", "Using access token past expiry (15 min)", "Refresh token; if refresh fails, re-login"],
        ["403", "INSUFFICIENT_PERMISSIONS", "Permission denied: requires {required_permission}", "Authenticated user lacks permission for action", "Request elevated privileges; inform user of limitation"],
        ["403", "SCOPE_VIOLATION", "Operation not permitted in current scope", "Org admin trying to access other tenant's data", "Verify correct tenant context; use appropriate credentials"],
        ["403", "ACCOUNT_LOCKED", "User account is locked: {reason}", "Too many failed logins; admin manually locked", "Contact administrator; wait for lockout expiry"],
        ["403", "TENANT_SUSPENDED", "Tenant account is suspended: {reason}", "Organization suspended for non-payment or ToS violation", "Contact platform operator; resolve suspension cause"],
        ["404", "RESOURCE_NOT_FOUND", "{resource_type} with id '{id}' not found", "Referenced user/role/tenant doesn't exist or was deleted", "Verify resource ID; handle gracefully in UI"],
        ["409", "CONCURRENT_MODIFICATION", "Resource was modified since retrieval: {conflict_details}", "Optimistic concurrency failure; another update occurred", "Refresh resource; present conflict to user; merge or overwrite"],
        ["422", "BUSINESS_RULE_VIOLATION", "Business rule violation: {rule}: {details}", "Deleting last super admin; assigning role beyond own perms", "Inform user of rule; suggest alternative action"],
        ["429", "RATE_LIMIT_EXCEEDED", "Rate limit exceeded: try again after {retry_after_seconds}s", "Too many requests in time window", "Exponential backoff; display countdown to user"],
        ["500", "INTERNAL_ERROR", "An unexpected error occurred; reference: {incident_id", "Unhandled exception; downstream service failure", "Retry with exponential backoff; report incident ID to support"],
        ["503", "SERVICE_UNAVAILABLE", "Service temporarily unavailable: {service_name}", "Dependency (database, LMS, auth provider) down or unhealthy", "Retry after delay; display maintenance message"],
    ]
    elements.append(create_table(error_codes, col_widths=[0.6*inch, 1.2*inch, 1.8*inch, 1.5*inch, 1.4*inch]))
    
    return elements

# ============================================================================
# MAIN DOCUMENT BUILD
# ============================================================================
def build_document():
    """Assemble the complete PDF document"""
    
    # Create document with margins
    doc = SimpleDocTemplate(
        OUTPUT_PATH,
        pagesize=A4,
        rightMargin=1*cm,
        leftMargin=1*cm,
        topMargin=1.5*cm,
        bottomMargin=1.5*cm,
        title=DOC_TITLE,
        subject=DOC_SUBTITLE,
        author="CyberSOC Platform Team",
        creator="CyberSOC Specification Generator v1.0"
    )
    
    # Build all sections
    story = []
    
    # Cover page
    story.extend(build_cover_page())
    
    # Table of Contents
    story.extend(build_toc())
    
    # Main content chapters
    story.extend(build_executive_summary())
    story.extend(build_role_matrix())
    story.extend(build_dashboard_architecture())
    story.extend(build_user_management_module())
    story.extend(build_role_permission_management())
    story.extend(build_tenant_management())
    story.extend(build_system_configuration())
    story.extend(build_audit_compliance())
    story.extend(build_api_reference())
    story.extend(build_billing_integration())
    story.extend(build_security_requirements())
    story.extend(build_implementation_roadmap())
    
    # Appendices
    story.extend(build_appendices())
    
    # Build PDF
    doc.build(story)
    print(f"Document generated successfully: {OUTPUT_PATH}")
    return OUTPUT_PATH

if __name__ == "__main__":
    output_file = build_document()
    print(f"\nOutput: {output_file}")
