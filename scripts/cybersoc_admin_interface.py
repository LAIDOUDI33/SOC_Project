#!/usr/bin/env python3
"""
CyberSOC Platform - Admin Interface Specification
==================================================
Comprehensive administrative interface design with full CRUD operations,
RBAC, tenant management, and system administration capabilities.
"""

import os
from datetime import datetime
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm, cm

pt = 1

from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, ListFlowable, ListItem
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY

# Font Registration
FONT_DIR = '/usr/share/fonts'
pdfmetrics.registerFont(TTFont('NotoSerifSC', f'{FONT_DIR}/truetype/noto-serif-sc/NotoSerifSC-Regular.ttf'))
pdfmetrics.registerFont(TTFont('NotoSerifSC-Bold', f'{FONT_DIR}/truetype/noto-serif-sc/NotoSerifSC-Bold.ttf'))
registerFontFamily('NotoSerifSC', normal='NotoSerifSC', bold='NotoSerifSC-Bold')
pdfmetrics.registerFont(TTFont('SarasaMonoSC', f'{FONT_DIR}/truetype/chinese/SarasaMonoSC-Regular.ttf'))

# Cascade Palette V2
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

# Styles
styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name='DocTitle', fontName='NotoSerifSC-Bold', fontSize=24, leading=32,
    alignment=TA_CENTER, textColor=TEXT_PRIMARY, spaceAfter=10*mm))
styles.add(ParagraphStyle(name='Subtitle', fontName='NotoSerifSC', fontSize=12, leading=17,
    alignment=TA_CENTER, textColor=TEXT_MUTED, spaceAfter=6*mm))
styles.add(ParagraphStyle(name='SectionHeading', fontName='NotoSerifSC-Bold', fontSize=15, leading=22,
    textColor=HEADER_FILL, spaceBefore=14*pt, spaceAfter=8*pt))
styles.add(ParagraphStyle(name='SubsectionHeading', fontName='NotoSerifSC-Bold', fontSize=12, leading=17,
    textColor=ICON, spaceBefore=10*pt, spaceAfter=6*pt))
styles.add(ParagraphStyle(name='CustomBody', fontName='NotoSerifSC', fontSize=9.5, leading=16,
    alignment=TA_JUSTIFY, textColor=TEXT_PRIMARY, spaceBefore=3*pt, spaceAfter=6*pt, firstLineIndent=16*pt))
styles.add(ParagraphStyle(name='BodyNoIndent', fontName='NotoSerifSC', fontSize=9.5, leading=16,
    alignment=TA_JUSTIFY, textColor=TEXT_PRIMARY, spaceBefore=3*pt, spaceAfter=6*pt))
styles.add(ParagraphStyle(name='TableHeader', fontName='NotoSerifSC-Bold', fontSize=8.5, leading=11,
    alignment=TA_CENTER, textColor=colors.white))
styles.add(ParagraphStyle(name='TableCell', fontName='NotoSerifSC', fontSize=8.5, leading=11,
    alignment=TA_LEFT, textColor=TEXT_PRIMARY))
styles.add(ParagraphStyle(name='TableCellCenter', fontName='NotoSerifSC', fontSize=8.5, leading=11,
    alignment=TA_CENTER, textColor=TEXT_PRIMARY))
styles.add(ParagraphStyle(name='TechText', fontName='SarasaMonoSC', fontSize=8, leading=11,
    alignment=TA_LEFT, textColor=TEXT_PRIMARY, backColor=CARD_BG, borderPadding=4*pt))
styles.add(ParagraphStyle(name='BulletText', fontName='NotoSerifSC', fontSize=9, leading=14,
    alignment=TA_LEFT, textColor=TEXT_PRIMARY, leftIndent=12*pt, bulletIndent=4*pt))
styles.add(ParagraphStyle(name='Caption', fontName='NotoSerifSC', fontSize=8, leading=11,
    alignment=TA_CENTER, textColor=TEXT_MUTED, spaceAfter=6*pt))

OUTPUT_DIR = '/home/z/my-project/download'
os.makedirs(OUTPUT_DIR, exist_ok=True)
output_path = os.path.join(OUTPUT_DIR, 'Cybersoc_Admin_Interface_Specification.pdf')

doc = SimpleDocTemplate(output_path, pagesize=A4, leftMargin=18*mm, rightMargin=18*mm,
    topMargin=16*mm, bottomMargin=16*mm)
story = []

def create_section_table(data, col_widths=None, header_rows=1):
    if col_widths is None:
        col_widths = [doc.width / len(data[0])] * len(data[0])
    table = Table(data, colWidths=col_widths, repeatRows=header_rows)
    style_commands = [
        ('BACKGROUND', (0, 0), (-1, header_rows-1), HEADER_FILL),
        ('TEXTCOLOR', (0, 0), (-1, header_rows-1), colors.white),
        ('FONTNAME', (0, 0), (-1, header_rows-1), 'NotoSerifSC-Bold'),
        ('FONTSIZE', (0, 0), (-1, header_rows-1), 8.5),
        ('ALIGN', (0, 0), (-1, header_rows-1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, header_rows-1), 7),
        ('TOPPADDING', (0, 0), (-1, header_rows-1), 7),
        ('FONTNAME', (0, header_rows), (-1, -1), 'NotoSerifSC'),
        ('FONTSIZE', (0, header_rows), (-1, -1), 8),
        ('TEXTCOLOR', (0, header_rows), (-1, -1), TEXT_PRIMARY),
        ('GRID', (0, 0), (-1, -1), 0.4, BORDER),
        ('LINEBELOW', (0, header_rows-1), (-1, header_rows-1), 1.1, ACCENT),
        ('LEFTPADDING', (0, 0), (-1, -1), 5),
        ('RIGHTPADDING', (0, 0), (-1, -1), 5),
        ('TOPPADDING', (0, header_rows), (-1, -1), 4),
        ('BOTTOMPADDING', (0, header_rows), (-1, -1), 4),
        ('ROWBACKGROUNDS', (0, header_rows), (-1, -1), [colors.white, TABLE_STRIPE]),
    ]
    table.setStyle(TableStyle(style_commands))
    return table

def add_paragraph(text, style_name='CustomBody'):
    story.append(Paragraph(text, styles[style_name]))

def add_bullet_list(items):
    bullet_items = []
    for item in items:
        bullet_items.append(ListItem(Paragraph(item, styles['BulletText']),
            leftIndent=12*pt, bulletColor=ACCENT))
    story.append(ListFlowable(bullet_items, bulletType='bullet', start='circle'))

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# COVER PAGE
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
story.append(Spacer(1, 30*mm))
story.append(Paragraph("CyberSOC Platform", styles['DocTitle']))
story.append(Spacer(1, 3*mm))
story.append(Paragraph("Admin Interface Specification", styles['DocTitle']))
story.append(Spacer(1, 5*mm))
story.append(Paragraph(
    "Complete Administrative Control Plane Design<br/>"
    "Full Actions | RBAC | Tenant Management | System Operations",
    styles['Subtitle']
))
story.append(Spacer(1, 10*mm))

cover_info = [
    [Paragraph("<b>Document Type</b>", styles['TableHeader']), 
     Paragraph("Technical Specification", styles['TableCellCenter'])],
    [Paragraph("<b>Version</b>", styles['TableHeader']), 
     Paragraph("1.0.0", styles['TableCellCenter'])],
    [Paragraph("<b>Date</b>", styles['TableHeader']), 
     Paragraph(datetime.now().strftime("%Y-%m-%d"), styles['TableCellCenter'])],
    [Paragraph("<b>Component</b>", styles['TableHeader']), 
     Paragraph("Phase 1 - Critical Path Item", styles['TableCellCenter'])],
]
cover_table = Table(cover_info, colWidths=[65*mm, 55*mm])
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
# SECTION 1: INTRODUCTION & OVERVIEW
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
story.append(Paragraph("1. Introduction & Overview", styles['SectionHeading']))

add_paragraph(
    "The CyberSOC Admin Interface serves as the central control plane for all platform management operations, "
    "providing authorized administrators with comprehensive capabilities to configure, monitor, and maintain the "
    "security operations platform. This specification defines the complete functional requirements, architectural "
    "design, user experience patterns, and integration points necessary for implementing a production-grade "
    "administrative interface that supports the full spectrum of operational activities from initial system "
    "configuration through ongoing management of multi-tenant deployments at enterprise scale."
)

add_paragraph(
    "The Admin Interface addresses a critical gap identified during the Go-Live readiness assessment: without "
    "centralized administrative controls, operational teams lack self-service capabilities for routine management "
    "tasks, creating dependency on engineering resources for activities that should be operator-executable. This "
    "specification establishes the foundation for empowering administrators while maintaining security through "
    "role-based access controls, audit logging of all administrative actions, and workflow approvals for high-impact "
    "operations that could affect platform stability or customer data."
)

story.append(Paragraph("1.1 Scope and Objectives", styles['SubsectionHeading']))

objectives = [
    "<b>User Management:</b> Complete lifecycle management for all user accounts including creation, modification, "
    "deactivation, and deletion with appropriate approval workflows for sensitive operations",
    "<b>Role-Based Access Control:</b> Granular permission management supporting hierarchical roles, custom role "
    "definition, and attribute-based access control policies for complex authorization scenarios",
    "<b>Tenant Administration:</b> Multi-tenant management capabilities enabling MSSP operators to create, "
    "configure, and isolate customer tenants with resource quotas and white-label customization",
    "<b>System Configuration:</b> Centralized management of platform settings including detection rules, "
    "integration endpoints, notification channels, and feature flags controlling module availability",
    "<b>Licensing Operations:</b> License key management, entitlement viewing, usage monitoring, and "
    "integration with billing systems for financial operations",
    "<b>Audit & Compliance:</b> Comprehensive audit logging, compliance reporting, and evidence export "
    "supporting regulatory requirements and internal governance processes",
]
add_bullet_list(objectives)

story.append(Paragraph("1.2 Target User Personas", styles['SubsectionHeading']))

personas_data = [
    [Paragraph("<b>Persona</b>", styles['TableHeader']),
     Paragraph("<b>Description</b>", styles['TableHeader']),
     Paragraph("<b>Primary Needs</b>", styles['TableHeader']),
     Paragraph("<b>Access Level</b>", styles['TableHeader'])],
    ["Super Administrator", "Platform owner with full system access", "System config, tenant mgmt, billing", "Full Access"],
    ["Organization Admin", "Manages users within their org", "User mgmt, role assignment, reports", "Org-scoped"],
    ["Billing Administrator", "Handles financial operations", "Invoices, payments, credits", "Financial scope"],
    ["Security Administrator", "Manages security configurations", "Detection rules, integrations, alerts", "Security scope"],
    ["Read-Only Observer", "Views dashboards and reports", "Monitoring, auditing, read-only access", "View Only"],
]

personas_table = create_section_table(personas_data,
    col_widths=[35*mm, 50*mm, 50*mm, 28*mm])
story.append(personas_table)
story.append(Paragraph("Table 1.1: Admin Interface User Personas", styles['Caption']))
story.append(PageBreak())

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SECTION 2: ARCHITECTURE DESIGN
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
story.append(Paragraph("2. Architecture Design", styles['SectionHeading']))

add_paragraph(
    "The Admin Interface architecture follows a modern web application pattern separating presentation logic from "
    "backend services through well-defined APIs. The frontend implements a single-page application using React or "
    "Vue.js framework with component-based UI construction enabling consistent interaction patterns across "
    "administrative modules. Backend services expose RESTful APIs following OpenAPI 3.0 specification with "
    "authentication via JWT tokens issued after OAuth 2.0/OIDC authentication flow. All administrative actions "
    "generate audit events captured in immutable log storage supporting compliance investigations and operational "
    "review."
)

story.append(Paragraph("2.1 Component Architecture", styles['SubsectionHeading']))

arch_data = [
    [Paragraph("<b>Layer</b>", styles['TableHeader']),
     Paragraph("<b>Components</b>", styles['TableHeader']),
     Paragraph("<b>Technology</b>", styles['TableHeader']),
     Paragraph("<b>Responsibility</b>", styles['TableHeader'])],
    ["Presentation", "Admin SPA, Component Library", "React/Vue + TailwindCSS", "UI rendering, user interactions"],
    ["State Management", "Redux/Pinia Store", "Redux Toolkit / Pinia", "Client state, caching, optimistic updates"],
    ["API Gateway", "Kong / Ambassador", "Kubernetes Ingress", "Auth, rate limiting, routing"],
    ["Admin API Services", "User/Role/Tenant/Config APIs", "Go / Python FastAPI", "Business logic, validation"],
    ["Authorization Engine", "OPA / Casbin", "Open Policy Agent", "Policy evaluation, ABAC"],
    ["Data Layer", "PostgreSQL + Redis", "Relational + Cache", "Persistent data, sessions"],
    ["Audit Service", "Event Logger", "Apache Kafka + S3", "Immutable audit trail"],
    ["Integration Bus", "Webhook/Event Emitter", "NATS / Redis Streams", "Async notifications"],
]

arch_table = create_section_table(arch_data,
    col_widths=[30*mm, 45*mm, 40*mm, 50*mm])
story.append(arch_table)
story.append(Paragraph("Table 2.1: Admin Interface Architecture Layers", styles['Caption']))

story.append(Paragraph("2.2 Navigation Structure", styles['SubsectionHeading']))

nav_data = [
    [Paragraph("<b>Module</b>", styles['TableHeader']),
     Paragraph("<b>Sections</b>", styles['TableHeader']),
     Paragraph("<b>Key Pages</b>", styles['TableHeader']),
     Paragraph("<b>Icon</b>", styles['TableHeader'])],
    ["Dashboard", "Overview, Quick Actions, Recent Activity", "Main Dashboard, Widgets Config", "grid-view"],
    ["Users", "List, Create, Edit, Bulk Import", "User Profile, Permissions, Activity", "users"],
    ["Roles & Permissions", "Roles List, Role Editor, Permission Matrix", "Role Detail, Custom Policies", "shield"],
    ["Tenants", "Tenant List, Tenant Editor, Quotas", "Tenant Portal Preview, White-label", "building"],
    ["Configuration", "General, Security, Integrations, Features", "Setting Groups, Test Connections", "settings"],
    ["Licensing", "Overview, Keys, Usage, Billing Sync", "License Detail, Entitlement View", "key"],
    ["Integrations", "Catalog, Active, Configuration", "Integration Health, Logs", "puzzle-piece"],
    ["Audit Log", "Search, Export, Attestation", "Event Detail, Session Replay", "clipboard-list"],
    ["Monitoring", "Health, Metrics, Alerts Status", "Service Dashboard, Incident View", "activity"],
    ["Help & Support", "Documentation, API Explorer, Tickets", "KB Search, Support Chat", "help-circle"],
]

nav_table = create_section_table(nav_data,
    col_widths=[32*mm, 52*mm, 48*mm, 26*mm])
story.append(nav_table)
story.append(Paragraph("Table 2.2: Admin Navigation Structure", styles['Caption']))

story.append(PageBreak())

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SECTION 3: USER MANAGEMENT MODULE
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
story.append(Paragraph("3. User Management Module", styles['SectionHeading']))

add_paragraph(
    "The User Management module provides complete lifecycle administration for all platform user accounts. This "
    "includes creating new accounts with appropriate default configurations, modifying existing account attributes "
    "such as role assignments and contact information, managing authentication factors and credentials, handling "
    "account status transitions (activation, suspension, deactivation), and processing permanent deletions with "
    "appropriate data handling for retention requirements. The module supports both individual operations through "
    "form-based interfaces and bulk operations through CSV import/export for efficient large-scale administration."
)

story.append(Paragraph("3.1 User CRUD Operations", styles['SubsectionHeading']))

user_crud = [
    [Paragraph("<b>Operation</b>", styles['TableHeader']),
     Paragraph("<b>Description</b>", styles['TableHeader']),
     Paragraph("<b>Validation</b>", styles['TableHeader']),
     Paragraph("<b>Approval</b>", styles['TableHeader']),
     Paragraph("<b>Audit Level</b>", styles['TableHeader'])],
    ["Create User", "Provision new user account", "Email unique, role valid, quota check", "Auto/Optional", "High"],
    ["Read User", "View user details and activity", "Access scope verification", "None", "Standard"],
    ["Update User", "Modify user attributes", "Field-specific rules", "Sensitive fields", "Medium"],
    ["Deactivate User", "Disable login access", "No active sessions critical", "Required", "Critical"],
    ["Delete User", "Permanent removal", "Data retention check, no assignments", "Required + Delay", "Critical"],
    ["Bulk Import", "CSV upload multiple users", "Row validation, duplicate check", "Batch approval", "High"],
    ["Bulk Export", "Download user list", "Scope filtering, PII masking", "None", "Standard"],
    ["Password Reset", "Force password change", "MFA verification", "Self/Admin", "High"],
]

user_crud_table = create_section_table(user_crud,
    col_widths=[24*mm, 45*mm, 42*mm, 28*mm, 24*mm])
story.append(user_crud_table)
story.append(Paragraph("Table 3.1: User CRUD Operations Matrix", styles['Caption']))

story.append(Paragraph("3.2 User Profile Schema", styles['SubsectionHeading']))

profile_schema = [
    [Paragraph("<b>Field</b>", styles['TableHeader']),
     Paragraph("<b>Type</b>", styles['TableHeader']),
     Paragraph("<b>Required</b>", styles['TableHeader']),
     Paragraph("<b>Editable By</b>", styles['TableHeader']),
     Paragraph("<b>Notes</b>", styles['TableHeader'])],
    ["user_id", "UUID", "System", "Read-only", "Primary identifier"],
    ["email", "Email", "Yes", "Admin/Self", "Unique, verified"],
    ["display_name", "String(100)", "Yes", "Admin/Self", "Shown in UI"],
    ["role_id", "FK", "Yes", "Admin only", "Determines permissions"],
    ["tenant_id", "FK", "Yes", "Super Admin", "Multi-tenancy scope"],
    ["status", "Enum", "System", "Admin only", "active/suspended/deleted"],
    ["mfa_enabled", "Boolean", "No", "Self/Admin", "Security requirement"],
    ["last_login", "Timestamp", "System", "Read-only", "Activity tracking"],
    ["created_at", "Timestamp", "System", "Read-only", "Audit trail"],
    ["custom_attrs", "JSON", "No", "Admin", "Extensible metadata"],
]

schema_table = create_section_table(profile_schema,
    col_widths=[28*mm, 22*mm, 20*mm, 28*mm, 40*mm])
story.append(schema_table)
story.append(Paragraph("Table 3.2: User Profile Data Schema", styles['Caption']))

story.append(Paragraph("3.3 Bulk Operations", styles['SubsectionHeading']))

add_paragraph(
    "Bulk operations enable efficient administration at scale, particularly valuable during initial tenant setup, "
    "organizational restructuring, or periodic maintenance activities. The bulk import function accepts CSV files "
    "with validated headers, performing row-by-row validation before committing changes. A preview mode shows "
    "anticipated results including any warnings or errors before final confirmation. Bulk export supports filtering "
    "by various criteria (role, status, last activity date) and includes options for PII redaction when exporting "
    "for analysis or backup purposes. Both operations generate detailed audit records capturing the initiating user, "
    "timestamp, affected record counts, and individual row outcomes for traceability."
)

story.append(PageBreak())

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SECTION 4: ROLE-BASED ACCESS CONTROL
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
story.append(Paragraph("4. Role-Based Access Control Module", styles['SectionHeading']))

add_paragraph(
    "The RBAC module implements granular permission management enabling administrators to define roles containing "
    "specific capability sets, assign roles to users, and evaluate authorization requests consistently across all "
    "platform components. The implementation supports hierarchical role inheritance where child roles automatically "
    "acquire parent role permissions, custom role creation for organization-specific needs, and attribute-based "
    "access control (ABAC) policies addressing complex authorization scenarios requiring context-aware decisions "
    "based on environmental factors such as time of day, location, or device trust level."
)

story.append(Paragraph("4.1 Built-in Role Hierarchy", styles['SubsectionHeading']))

roles_data = [
    [Paragraph("<b>Role</b>", styles['TableHeader']),
     Paragraph("<b>Level</b>", styles['TableHeader']),
     Paragraph("<b>Scope</b>", styles['TableHeader']),
     Paragraph("<b>Capabilities</b>", styles['TableHeader']),
     Paragraph("<b>Limitations</b>", styles['TableHeader'])],
    ["super_admin", "0 (Highest)", "Global", "All operations", "None"],
    ["org_admin", "1", "Organization", "Org users, settings, reports", "Cannot modify system config"],
    ["billing_admin", "1", "Financial", "Invoices, credits, payment methods", "Cannot access user data"],
    ["security_admin", "1", "Security", "Rules, integrations, alerts", "Cannot manage users"],
    ["analyst_manager", "2", "Team", "Team assignments, case mgmt", "Cannot manage org settings"],
    ["senior_analyst", "3", "Personal+", "Investigate, respond, escalate", "Cannot manage other users"],
    ["analyst", "4 (Base)", "Personal", "View assigned, basic actions", "Limited configuration"],
    ["readonly_viewer", "5 (Lowest)", "Assigned", "View only, export reports", "No write operations"],
]

roles_table = create_section_table(roles_data,
    col_widths=[30*mm, 22*mm, 22*mm, 48*mm, 38*mm])
story.append(roles_table)
story.append(Paragraph("Table 4.1: Built-in Role Hierarchy", styles['Caption']))

story.append(Paragraph("4.2 Permission Model", styles['SubsectionHeading']))

permissions_data = [
    [Paragraph("<b>Resource</b>", styles['TableHeader']),
     Paragraph("<b>Create</b>", styles['TableHeader']),
     Paragraph("<b>Read</b>", styles['TableHeader']),
     Paragraph("<b>Update</b>", styles['TableHeader']),
     Paragraph("<b>Delete</b>", styles['TableHeader']),
     Paragraph("<b>Special</b>", styles['TableHeader'])],
    ["users", "admin", "admin,self", "admin,self", "admin", "password_reset, deactivate"],
    ["roles", "super_admin", "admin", "super_admin", "super_admin", "permission_grant"],
    ["tenants", "super_admin", "admin", "admin", "super_admin", "quota_adjust, suspend"],
    ["config", "super_admin", "-", "super_admin", "-", "feature_flags"],
    ["licenses", "billing_admin", "billing_admin", "billing_admin", "-", "credit_issue, refund"],
    ["audit_log", "-", "admin", "-", "-", "export, attest"],
    ["integrations", "security_admin", "security_admin", "security_admin", "security_admin", "test_connection"],
    ["reports", "-", "admin+", "self", "-", "schedule, share"],
]

perms_table = create_section_table(permissions_data,
    col_widths=[28*mm, 25*mm, 28*mm, 28*mm, 26*mm, 42*mm])
story.append(perms_table)
story.append(Paragraph("Table 4.2: Permission Matrix by Resource", styles['Caption']))

story.append(Paragraph("4.3 Custom Role Creation", styles['SubsectionHeading']))

add_paragraph(
    "Organizations requiring specialized permission sets beyond built-in roles can create custom roles with precise "
    "capability selection. The role editor presents available permissions organized by resource category with "
    "checkbox selection for each operation type (Create, Read, Update, Delete, Special). Custom roles can optionally "
    "inherit from existing roles as a base, adding or removing specific capabilities as needed. Role naming conventions "
    "enforce uniqueness within organizational scope and prevent confusion with built-in roles. Changes to custom "
    "role definitions take effect immediately for assigned users, with optional notification to affected individuals "
    "when significant permission changes occur."
)

story.append(PageBreak())

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SECTION 5: TENANT MANAGEMENT (MSSP)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
story.append(Paragraph("5. Tenant Management Module (MSSP)", styles['SectionHeading']))

add_paragraph(
    "The Tenant Management module provides Multi-Tenant administration capabilities essential for Managed Security "
    "Service Provider (MSSP) deployments where a single CyberSOC instance serves multiple customer organizations. "
    "Each tenant maintains logical isolation of data, configurations, and user access while sharing underlying "
    "infrastructure for operational efficiency. The module supports the complete tenant lifecycle from initial "
    "provisioning through configuration, quota management, health monitoring, and eventual decommissioning, with "
    "white-label options enabling customer-branded portal experiences."
)

story.append(Paragraph("5.1 Tenant Lifecycle States", styles['SubsectionHeading']))

lifecycle_data = [
    [Paragraph("<b>State</b>", styles['TableHeader']),
     Paragraph("<b>Description</b>", styles['TableHeader']),
     Paragraph("<b>Allowed Transitions</b>", styles['TableHeader']),
     Paragraph("<b>Data Handling</b>", styles['TableHeader']),
     Paragraph("<b>Billing Impact</b>", styles['TableHeader'])],
    ["Draft", "Initial configuration in progress", "Active, Archived", "Isolated, mutable", "Not billed"],
    ["Active", "Fully operational tenant", "Suspended, Archived", "Full access, audited", "Active billing"],
    ["Suspended", "Temporarily disabled (non-payment)", "Active, Archived", "Read-only export", "Suspended billing"],
    ["Archived", "Decommissioned but retained", "Deleted (after retention)", "Frozen, encrypted", "Final invoice"],
    ["Deleted", "Permanently removed", "Terminal state", "Purged per policy", "Credit if applicable"],
]

lifecycle_table = create_section_table(lifecycle_data,
    col_widths=[22*mm, 42*mm, 36*mm, 38*mm, 30*mm])
story.append(lifecycle_table)
story.append(Paragraph("Table 5.1: Tenant Lifecycle State Machine", styles['Caption']))

story.append(Paragraph("5.2 Tenant Configuration Options", styles['SubsectionHeading']))

tenant_config = [
    [Paragraph("<b>Category</b>", styles['TableHeader']),
     Paragraph("<b>Setting</b>", styles['TableHeader']),
     Paragraph("<b>Options</b>", styles['TableHeader']),
     Paragraph("<b>Default</b>", styles['TableHeader']),
     Paragraph("<b>Tier Requirement</b>", styles['TableHeader'])],
    ["Branding", "Logo Upload", "Image (PNG, SVG, max 200KB)", "CyberSOC logo", "Business+"],
    ["Branding", "Primary Color", "Hex color picker", "#6f6751 (cascade)", "Business+"],
    ["Branding", "Portal Name", "String (3-50 chars)", "Organization name", "Business+"],
    ["Branding", "Custom Domain", "CNAME configuration", "*.cybersoc.cloud", "Enterprise"],
    ["Data", "Retention Period", "7/30/90/365/unlimited days", "30 days", "Varies by tier"],
    ["Data", "Daily Ingestion Limit", "GB per day", "Tier base amount", "License-defined"],
    ["Data", "User Seat Limit", "Maximum concurrent users", "Tier base amount", "License-defined"],
    ["Features", "Module Enable/Disable", "Feature flag toggles", "All enabled", "License-defined"],
    ["Features", "AI Copilot Access", "Enabled/Limited/Disabled", "By tier", "Professional+"],
    ["Security", "IP Allowlist", "CIDR ranges", "Open (0.0.0.0/0)", "All tiers"],
    ["Security", "MFA Requirement", "Optional/Required/Enforced", "Optional", "Configurable"],
]

tenant_config_table = create_section_table(tenant_config,
    col_widths=[26*mm, 38*mm, 44*mm, 30*mm, 30*mm])
story.append(tenant_config_table)
story.append(Paragraph("Table 5.2: Tenant Configuration Options", styles['Caption']))

story.append(Paragraph("5.3 Resource Quota Management", styles['SubsectionHeading']))

add_paragraph(
    "Resource quotas prevent any single tenant from consuming disproportionate platform resources, ensuring fair "
    "allocation and predictable costs for MSSP operators. Quotas apply to compute resources (CPU, memory, storage), "
    "data volumes (daily ingestion, retained data size, API call frequency), and operational limits (concurrent "
    "user sessions, SOAR actions per period, AI query volume). Administrators view current utilization against "
    "quotas via dashboard gauges with color-coded indicators (green/yellow/red) approaching thresholds. Automated "
    "alerts notify operators when tenants exceed configurable threshold percentages (default 80% warning, 95% critical)."
)

story.append(PageBreak())

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SECTION 6: SYSTEM CONFIGURATION
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
story.append(Paragraph("6. System Configuration Module", styles['SectionHeading']))

add_paragraph(
    "The System Configuration module centralizes management of all platform-wide settings affecting behavior, "
    "appearance, and integration behavior. Configuration is organized into logical groups with appropriate access "
    "controls restricting modification to authorized roles. Changes to production-affecting settings require "
    "confirmation dialogs explaining potential impact, with high-risk modifications optionally requiring secondary "
    "approval before taking effect. A configuration version history enables rollback to previous states if changes "
    "cause unexpected issues, with automatic snapshot capture before each modification."
)

story.append(Paragraph("6.1 Configuration Categories", styles['SubsectionHeading']))

config_cats = [
    [Paragraph("<b>Category</b>", styles['TableHeader']),
     Paragraph("<b>Settings Count</b>", styles['TableHeader']),
     Paragraph("<b>Access Role</b>", styles['TableHeader']),
     Paragraph("<b>Change Impact</b>", styles['TableHeader']),
     Paragraph("<b>Approval Required</b>", styles['TableHeader'])],
    ["General Platform", "~25", "super_admin", "Platform-wide", "High-risk items"],
    ["Authentication & SSO", "~15", "super_admin, security_admin", "User access", "Yes (SSO changes)"],
    ["Detection Rules", "~50+", "security_admin", "Alert generation", "Yes (production)"],
    ["Notification Channels", "~20", "org_admin+", "Alert delivery", "No"],
    ["Integration Endpoints", "~30", "security_admin", "Data flows", "Yes (credentials)"],
    ["Feature Flags", "~40", "super_admin", "Capability availability", "Yes (major)"],
    ["UI Customization", "~15", "org_admin", "Appearance only", "No"],
    ["Backup & Retention", "~10", "super_admin", "Data protection", "Yes (retention decrease)"],
    ["API Settings", "~12", "super_admin", "Developer access", "Yes (rate limits)"],
]

config_table = create_section_table(config_cats,
    col_widths=[38*mm, 28*mm, 40*mm, 32*mm, 32*mm])
story.append(config_table)
story.append(Paragraph("Table 6.1: Configuration Categories Overview", styles['Caption']))

story.append(Paragraph("6.2 Feature Flag Management", styles['SubsectionHeading']))

add_paragraph(
    "Feature flags provide runtime control over platform capability availability without code deployment, enabling "
    "gradual rollouts, A/B testing, and rapid incident response through feature disabling. The admin interface "
    "exposes flag management with toggle controls, targeting rules (enable for specific tenants, user segments, or "
    "percentage rollout), and scheduling for future activation/deactivation. Each flag maintains change history "
    "showing who modified it, when, and what value was set, supporting rollback to previous states. Integration "
    "with the licensing system ensures flags respect entitled capabilities, preventing unauthorized feature access "
    "through flag manipulation alone."
)

flags_data = [
    [Paragraph("<b>Flag Name</b>", styles['TableHeader']),
     Paragraph("<b>Module</b>", styles['TableHeader']),
     Paragraph("<b>Type</b>", styles['TableHeader']),
     Paragraph("<b>Default</b>", styles['TableHeader']),
     Paragraph("<b>Rollout Strategy</b>", styles['TableHeader'])],
    ["ai_copilot_enabled", "AI Engine", "Boolean", "By tier", "Licensed tier gates"],
    ["advanced_analytics", "Dashboard", "Boolean", "Enterprise+", "Progressive rollout"],
    ["new_detection_ui", "SIEM", "Boolean", "False", "Canary → Percentage → Full"],
    ["soar_v2_engine", "SOAR", "Boolean", "False", "Opt-in beta"],
    ["threat_hunt_workspace", "Threat Hunting", "Boolean", "Business+", "Feature-gated"],
    ["purple_team_mode", "Platform", "Boolean", "False", "Admin opt-in"],
    ["api_rate_limit_v2", "API", "Integer", "1000/min", "Gradual increase"],
    ["export_encryption", "Reports", "Boolean", "True", "Mandatory (GDPR)"],
]

flags_table = create_section_table(flags_data,
    col_widths=[40*mm, 28*mm, 22*mm, 24*mm, 46*mm])
story.append(flags_table)
story.append(Paragraph("Table 6.2: Sample Feature Flags", styles['Caption']))

story.append(PageBreak())

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SECTION 7: LICENSING OPERATIONS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
story.append(Paragraph("7. Licensing Operations Module", styles['SectionHeading']))

add_paragraph(
    "The Licensing Operations module provides administrative interfaces for managing license keys, viewing entitlement "
    "details, monitoring consumption against limits, and synchronizing with external billing systems. This module "
    "integrates closely with the Billing & Licensing Architecture defined in the companion specification document, "
    "exposing license management capabilities through the unified admin interface rather than requiring separate "
    "tools or direct database access. Role restrictions ensure sensitive licensing operations (key issuance, credit "
    "adjustments, refunds) are limited to appropriately authorized personnel with full audit trails."
)

story.append(Paragraph("7.1 License Key Management", styles['SubsectionHeading']))

license_ops = [
    [Paragraph("<b>Operation</b>", styles['TableHeader']),
     Paragraph("<b>Description</b>", styles['TableHeader']),
     Paragraph("<b>Available To</b>", styles['TableHeader']),
     Paragraph("<b>Workflow</b>", styles['TableHeader']),
     Paragraph("<b>Audit</b>", styles['TableHeader'])],
    ["View Licenses", "List all license keys with status", "Billing+, Super", "Direct access", "Standard"],
    ["Issue License", "Generate new license key", "Super Admin only", "Form → Review → Issue", "Critical"],
    ["Revoke License", "Disable active license", "Super Admin only", "Select → Reason → Confirm", "Critical"],
    ["Extend License", "Modify expiration date", "Billing Admin", "Request → Approval → Apply", "High"],
    ["Modify Entitlements", "Change feature/user limits", "Super Admin", "Form → Validation → Apply", "Critical"],
    ["Transfer License", "Move between tenants", "Super Admin", "Source → Dest → Confirm", "High"],
    ["Export Keys", "Download license inventory", "Billing Admin", "Filter → Format → Download", "Standard"],
]

license_table = create_section_table(license_ops,
    col_widths=[28*mm, 48*mm, 30*mm, 42*mm, 22*mm])
story.append(license_table)
story.append(Paragraph("Table 7.1: License Key Operations", styles['Caption']))

story.append(Paragraph("7.2 Usage Monitoring Dashboard", styles['SubsectionHeading']))

add_paragraph(
    "The Usage Monitoring dashboard provides real-time visibility into consumption patterns across all licensed "
    "dimensions: user seat utilization, data ingestion volumes, API call frequencies, AI query counts, and SOAR "
    "action executions. Visualizations include time-series charts showing trends, gauge indicators displaying "
    "current consumption against limits as percentages, and tables ranking tenants or users by consumption volume. "
    "Automated alerts trigger when consumption approaches thresholds (configurable defaults at 80% warning, 95% "
    "critical), enabling proactive outreach before hard limits cause service disruption. Historical trending supports "
    "capacity planning and identifies growth patterns informing renewal discussions."
)

story.append(PageBreak())

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SECTION 8: AUDIT LOGGING & COMPLIANCE
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
story.append(Paragraph("8. Audit Logging & Compliance Module", styles['SectionHeading']))

add_paragraph(
    "Every action performed through the Admin Interface generates immutable audit events captured in tamper-evident "
    "storage. The Audit Logging module provides search, filter, and export capabilities for investigating incidents, "
    "demonstrating compliance, and identifying anomalous administrative patterns. Events capture actor identity, "
    "action type, target resource, timestamp, source IP address, outcome (success/failure), and before/after values "
    "for modifications. Cryptographic chaining between events enables detection of retrospective tampering attempts, "
    "while append-only storage design prevents event deletion or modification after creation."
)

story.append(Paragraph("8.1 Audit Event Schema", styles['SubsectionHeading']))

audit_schema = [
    [Paragraph("<b>Field</b>", styles['TableHeader']),
     Paragraph("<b>Type</b>", styles['TableHeader']),
     Paragraph("<b>Description</b>", styles['TableHeader']),
     Paragraph("<b>Example Value</b>", styles['TableHeader'])],
    ["event_id", "UUID (v4)", "Unique event identifier", "550e8400-e29b-..."],
    ["timestamp", "ISO 8601", "Event occurrence time", "2025-01-15T10:23:45Z"],
    ["actor_id", "UUID", "Who performed action", "user_abc123..."],
    ["actor_type", "Enum", "Actor classification", "user / service / system"],
    ["action", "String", "Operation performed", "user.create / role.update"],
    ["resource_type", "String", "Target entity category", "user / role / tenant / config"],
    ["resource_id", "UUID", "Specific target identifier", "target_xyz789..."],
    ["outcome", "Enum", "Result of operation", "success / failure / denied"],
    ["source_ip", "IPv4/IPv6", "Origin network address", "203.0.113.42"],
    ["changes", "JSON", "Before/after diff", "{\"status\":[\"active\",\"suspended\"]}"],
    ["reason", "Text", "Optional justification", "Account deactivation request"],
    ["signature", "Bytes", "Cryptographic integrity", "sha256:abcdef..."],
]

audit_schema_table = create_section_table(audit_schema,
    col_widths=[26*mm, 24*mm, 48*mm, 48*mm])
story.append(audit_schema_table)
story.append(Paragraph("Table 8.1: Audit Event Data Schema", styles['Caption']))

story.append(Paragraph("8.2 Compliance Reporting", styles['SubsectionHeading']))

compliance_reports = [
    [Paragraph("<b>Report Type</b>", styles['TableHeader']),
     Paragraph("<b>Purpose</b>", styles['TableHeader']),
     Paragraph("<b>Content</b>", styles['TableHeader']),
     Paragraph("<b>Format</b>", styles['TableHeader']),
     Paragraph("<b>Frequency</b>", styles['TableHeader'])],
    ["Admin Activity Summary", "Management oversight", "All admin actions, counts by type", "PDF, Dashboard", "Weekly/Monthly"],
    ["User Access Review", "Access governance", "User-role assignments, last login", "Spreadsheet, PDF", "Monthly (required)"],
    ["Configuration Changes", "Change management", "All setting modifications with diffs", "PDF, JSON", "On-demand/Daily"],
    ["Data Access Log", "Privacy compliance", "PII access events, exports", "Encrypted CSV", "On-demand (GDPR)"],
    ["Security Incident Timeline", "Incident response", "Related events chronologically", "PDF, Timeline view", "On-demand"],
    ["Attestation Package", "Audit support", "Evidence bundle for auditor", "Signed PDF", "Quarterly/Annual"],
    ["Tenant Isolation Report", "MSSP compliance", "Cross-tenant access attempts", "PDF", "Monthly"],
]

compliance_table = create_section_table(compliance_reports,
    col_widths=[38*mm, 34*mm, 48*mm, 26*mm, 26*mm])
story.append(compliance_table)
story.append(Paragraph("Table 8.2: Compliance Report Types", styles['Caption']))

story.append(PageBreak())

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SECTION 9: INTEGRATION WITH EXISTING PLATFORM
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
story.append(Paragraph("9. Integration with Existing Platform Modules", styles['SectionHeading']))

add_paragraph(
    "The Admin Interface integrates with existing CyberSOC modules defined in the platform specification, extending "
    "administrative control to previously specified capabilities. This section documents key integration points "
    "ensuring the Admin Interface properly leverages and manages existing platform components rather than duplicating "
    "functionality. Integration follows established API contracts defined in Section 66 (API Documentation) with "
    "authentication flowing through the OAuth/OIDC infrastructure specified throughout the security architecture."
)

integration_points = [
    [Paragraph("<b>Platform Module</b>", styles['TableHeader']),
     Paragraph("<b>Spec Section</b>", styles['TableHeader']),
     Paragraph("<b>Admin Integration</b>", styles['TableHeader']),
     Paragraph("<b>API Dependencies</b>", styles['TableHeader'])],
    ["SIEM Engine", "Sec 8-12", "Detection rule management, log source config", "/api/v1/siem/*"],
    ["XDR Architecture", "Sec 13-15", "Endpoint agent deployment, policy push", "/api/v1/xdr/*"],
    ["UEBA Engine", "Sec 16-18", "Behavior model tuning, risk scoring params", "/api/v1/ueba/*"],
    ["SOAR Engine", "Sec 19-21", "Playbook management, action approval queue", "/api/v1/soar/*"],
    ["Threat Intel", "Sec 22-24", "Feed subscription, IOC source config", "/api/v1/ti/*"],
    ["AI SOC Copilot", "Sec 46-51", "Model access controls, query limits", "/api/v1/ai/*"],
    ["MSSP Platform", "Sec 59", "Tenant lifecycle, white-label, portals", "/api/v1/mssp/*"],
    ["Monitoring", "Sec 76", "Health checks, alert thresholds, dashboards", "/api/v1/monitor/*"],
    ["API Gateway", "Sec 66", "Key management, rate limit policies", "/api/v1/admin/api-keys"],
]

integration_table = create_section_table(integration_points,
    col_widths=[38*mm, 28*mm, 58*mm, 40*mm])
story.append(integration_table)
story.append(Paragraph("Table 9.1: Platform Module Integration Points", styles['Caption']))

story.append(Paragraph("9.1 Dashboard Integration", styles['SubsectionHeading']))

add_paragraph(
    "The Admin Interface provides dedicated dashboard views complementing the analyst, manager, and CISO dashboards "
    "specified in Section 61. While those dashboards focus on security operations content, the Admin Dashboard "
    "emphasizes operational health metrics: system resource utilization, active user counts, recent administrative "
    "actions, approaching quota thresholds, integration health status, and upcoming license expirations. Widget "
    "configuration allows administrators to customize their dashboard view prioritizing information relevant to their "
    "responsibilities. Cross-linking enables navigation from admin dashboards to relevant detail pages (clicking a "
    "user count widget navigates to User Management filtered appropriately)."
)

story.append(PageBreak())

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SECTION 10: IMPLEMENTATION PLAN
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
story.append(Paragraph("10. Implementation Plan", styles['SectionHeading']))

add_paragraph(
    "Implementing the Admin Interface follows an incremental approach delivering value progressively while managing "
    "complexity. The plan organizes work into sprints focused on cohesive capability groups, with each sprint "
    "producing deployable increments that can be validated independently. Early sprints establish foundational "
    "infrastructure (framework, auth integration, navigation) enabling subsequent sprints to focus on domain-specific "
    "functionality. The timeline assumes a team of 2-3 frontend developers and 1-2 backend developers working in "
    "parallel with close collaboration on API contracts."
)

story.append(Paragraph("10.1 Sprint Plan", styles['SubsectionHeading']))

sprint_plan = [
    [Paragraph("<b>Sprint</b>", styles['TableHeader']),
     Paragraph("<b>Duration</b>", styles['TableHeader']),
     Paragraph("<b>Deliverables</b>", styles['TableHeader']),
     Paragraph("<b>Dependencies</b>", styles['TableHeader']),
     Paragraph("<b>Acceptance Criteria</b>", styles['TableHeader'])],
    ["Sprint 0: Foundation", "1 week", "Project scaffold, CI setup, design tokens", "None", "Build pipeline green"],
    ["Sprint 1: Shell & Auth", "2 weeks", "App shell, nav, login, role-based routing", "Sprint 0", "Authenticated access works"],
    ["Sprint 2: User Mgmt", "2 weeks", "User CRUD, profile editing, bulk ops", "Sprint 1", "Full user lifecycle"],
    ["Sprint 3: RBAC Module", "2 weeks", "Role editor, permission matrix, assignment", "Sprint 1, 2", "Custom roles work"],
    ["Sprint 4: Tenant Mgmt", "2 weeks", "Tenant CRUD, config, quotas (MSSP)", "Sprint 1, 2", "Tenant isolation verified"],
    ["Sprint 5: Config Module", "2 weeks", "Settings pages, feature flags, validation", "Sprint 1", "Config changes audit logged"],
    ["Sprint 6: Licensing UI", "1 week", "License viewer, usage dashboard", "Sprint 1, Billing API", "Usage data accurate"],
    ["Sprint 7: Audit & Reports", "2 weeks", "Log viewer, search, export, compliance reports", "Sprint 1-6", "All actions logged"],
    ["Sprint 8: Polish & QA", "2 weeks", "UX refinements, accessibility, testing", "All sprints", "QA sign-off obtained"],
]

sprint_table = create_section_table(sprint_plan,
    col_widths=[30*mm, 20*mm, 48*mm, 28*mm, 42*mm])
story.append(sprint_table)
story.append(Paragraph("Table 10.1: Admin Interface Sprint Plan", styles['Caption']))

story.append(Paragraph("10.2 Technical Requirements", styles['SubsectionHeading']))

tech_reqs = [
    [Paragraph("<b>Area</b>", styles['TableHeader']),
     Paragraph("<b>Requirement</b>", styles['TableHeader']),
     Paragraph("<b>Rationale</b>", styles['TableHeader']),
     Paragraph("<b>Verification</b>", styles['TableHeader'])],
    ["Performance", "Page load <3 seconds, interactions <200ms", "User productivity", "Lighthouse audit"],
    ["Accessibility", "WCAG 2.1 AA compliance minimum", "Legal requirement, inclusivity", "Automated + manual testing"],
    ["Browser Support", "Chrome 90+, Firefox 88+, Safari 14+, Edge 90+", "Enterprise compatibility", "BrowserStack testing"],
    ["Responsive", "Desktop (1920+), Tablet (1024+), Mobile (375+)", "On-call emergency access", "Device testing"],
    ["i18n Ready", "String externalization, RTL support structure", "Global market readiness", "Code review checklist"],
    ["Error Handling", "Graceful degradation, clear error messages", "User trust, support efficiency", "Error scenario testing"],
    ["Security", "XSS/CSRF protection, CSP headers, input sanitization", "Platform integrity", "Security review pen test"],
]

tech_reqs_table = create_section_table(tech_reqs,
    col_widths=[28*mm, 54*mm, 42*mm, 40*mm])
story.append(tech_reqs_table)
story.append(Paragraph("Table 10.2: Non-Functional Technical Requirements", styles['Caption']))

story.append(Spacer(1, 8*mm))

add_paragraph(
    "This Admin Interface Specification provides the comprehensive blueprint for implementing the central administrative "
    "control plane for the CyberSOC Platform. The modular design enables phased delivery aligned with Go-Live roadmap "
    "priorities, starting with foundational user and role management capabilities that unblock other phases. Close "
    "integration with existing platform modules ensures consistency while the audit framework provides the compliance "
    "foundation required for enterprise and government deployments. Regular review against emerging requirements will "
    "ensure the Admin Interface evolves alongside platform capabilities.",
    'BodyNoIndent'
)

# Build PDF
print(f"Building PDF: {output_path}")
doc.build(story)
print(f"Successfully generated: {output_path}")
print(f"File size: {os.path.getsize(output_path)} bytes")
