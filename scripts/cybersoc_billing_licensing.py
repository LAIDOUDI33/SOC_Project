#!/usr/bin/env python3
"""
CyberSOC Platform - Billing & Licensing Architecture Specification
==================================================================
Professional PDF document covering 6 licensing tiers:
Free, Professional, Business, Enterprise, Government, On-Premise

Generated with ReportLab + Cascade Palette V2
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
    PageBreak, Image, ListFlowable, ListItem, KeepTogether
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# FONT REGISTRATION
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FONT_DIR = '/usr/share/fonts'

# Primary Chinese font - Noto Serif SC (serif, high quality)
pdfmetrics.registerFont(TTFont('NotoSerifSC', f'{FONT_DIR}/truetype/noto-serif-sc/NotoSerifSC-Regular.ttf'))
pdfmetrics.registerFont(TTFont('NotoSerifSC-Bold', f'{FONT_DIR}/truetype/noto-serif-sc/NotoSerifSC-Bold.ttf'))
registerFontFamily('NotoSerifSC', normal='NotoSerifSC', bold='NotoSerifSC-Bold')

# Note: NotoSansSC is variable font (not compatible with ReportLab)
# Using SarasaMonoSC as fallback for technical content instead
# pdfmetrics.registerFont(TTFont('NotoSansSC', f'{FONT_DIR}/truetype/chinese/NotoSansSC-Regular.ttf'))
# pdfmetrics.registerFont(TTFont('NotoSansSC-Bold', f'{FONT_DIR}/truetype/chinese/NotoSansSC-Bold.ttf'))

# Mono font for technical elements
pdfmetrics.registerFont(TTFont('SarasaMonoSC', f'{FONT_DIR}/truetype/chinese/SarasaMonoSC-Regular.ttf'))

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# CASCADE PALETTE (V2) - Auto-generated for "CyberSOC Billing Licensing"
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# XL tier: backgrounds (area > 50%, S <= 0.08)
PAGE_BG       = colors.HexColor('#f2f1f0')
SECTION_BG    = colors.HexColor('#ebeae9')

# L tier: surfaces (area 20-50%, S <= 0.15)
CARD_BG       = colors.HexColor('#efeeec')
TABLE_STRIPE  = colors.HexColor('#f5f5f3')

# M tier: structural fills (area 5-20%, S <= 0.30)
HEADER_FILL   = colors.HexColor('#6f6751')
COVER_BLOCK   = colors.HexColor('#665f4a')

# S tier: edges & icons (area 1-5%, S <= 0.50)
BORDER        = colors.HexColor('#cfc9b8')
ICON          = colors.HexColor('#9e8847')

# XS tier: emphasis (area < 1%, S <= 0.75)
ACCENT        = colors.HexColor('#8d7325')
ACCENT_2      = colors.HexColor('#5e42b1')

# Typography
TEXT_PRIMARY   = colors.HexColor('#242320')
TEXT_MUTED     = colors.HexColor('#8a8881')

# Semantic (low-saturation)
SEM_SUCCESS   = colors.HexColor('#418a59')
SEM_WARNING   = colors.HexColor('#a7894e')
SEM_ERROR     = colors.HexColor('#b1554d')
SEM_INFO      = colors.HexColor('#4b729a')

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# CUSTOM STYLES
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
styles = getSampleStyleSheet()

# Document Title Style
styles.add(ParagraphStyle(
    name='DocTitle',
    fontName='NotoSerifSC-Bold',
    fontSize=28,
    leading=36,
    alignment=TA_CENTER,
    textColor=TEXT_PRIMARY,
    spaceAfter=12*mm
))

# Subtitle Style
styles.add(ParagraphStyle(
    name='Subtitle',
    fontName='NotoSerifSC',
    fontSize=14,
    leading=20,
    alignment=TA_CENTER,
    textColor=TEXT_MUTED,
    spaceAfter=6*mm
))

# Section Heading (H1)
styles.add(ParagraphStyle(
    name='SectionHeading',
    fontName='NotoSerifSC-Bold',
    fontSize=18,
    leading=26,
    textColor=HEADER_FILL,
    spaceBefore=18*pt,
    spaceAfter=10*pt,
    borderPadding=(0, 0, 3*pt, 0),
    borderWidth=0,
    borderColor=ACCENT
))

# Subsection Heading (H2)
styles.add(ParagraphStyle(
    name='SubsectionHeading',
    fontName='NotoSerifSC-Bold',
    fontSize=14,
    leading=20,
    textColor=ICON,
    spaceBefore=14*pt,
    spaceAfter=8*pt
))

# H3 Heading
styles.add(ParagraphStyle(
    name='H3Heading',
    fontName='NotoSerifSC-Bold',
    fontSize=12,
    leading=16,
    textColor=TEXT_PRIMARY,
    spaceBefore=10*pt,
    spaceAfter=6*pt
))

# Body Text - Justified, proper spacing
styles.add(ParagraphStyle(
    name='CustomBody',
    fontName='NotoSerifSC',
    fontSize=10.5,
    leading=18,
    alignment=TA_JUSTIFY,
    textColor=TEXT_PRIMARY,
    spaceBefore=4*pt,
    spaceAfter=8*pt,
    firstLineIndent=20*pt
))

# Body text no indent (for after headings)
styles.add(ParagraphStyle(
    name='BodyNoIndent',
    fontName='NotoSerifSC',
    fontSize=10.5,
    leading=18,
    alignment=TA_JUSTIFY,
    textColor=TEXT_PRIMARY,
    spaceBefore=4*pt,
    spaceAfter=8*pt
))

# Table Header Style
styles.add(ParagraphStyle(
    name='TableHeader',
    fontName='NotoSerifSC-Bold',
    fontSize=9,
    leading=13,
    alignment=TA_CENTER,
    textColor=colors.white
))

# Table Cell Style
styles.add(ParagraphStyle(
    name='TableCell',
    fontName='NotoSerifSC',
    fontSize=9,
    leading=13,
    alignment=TA_LEFT,
    textColor=TEXT_PRIMARY
))

# Table Cell Center
styles.add(ParagraphStyle(
    name='TableCellCenter',
    fontName='NotoSerifSC',
    fontSize=9,
    leading=13,
    alignment=TA_CENTER,
    textColor=TEXT_PRIMARY
))

# Code/Tech Style
styles.add(ParagraphStyle(
    name='TechText',
    fontName='SarasaMonoSC',
    fontSize=9,
    leading=13,
    alignment=TA_LEFT,
    textColor=TEXT_PRIMARY,
    backColor=CARD_BG,
    borderPadding=6*pt
))

# Bullet Point Style
styles.add(ParagraphStyle(
    name='BulletText',
    fontName='NotoSerifSC',
    fontSize=10,
    leading=16,
    alignment=TA_LEFT,
    textColor=TEXT_PRIMARY,
    leftIndent=15*pt,
    bulletIndent=5*pt
))

# Caption Style
styles.add(ParagraphStyle(
    name='Caption',
    fontName='NotoSerifSC',
    fontSize=9,
    leading=13,
    alignment=TA_CENTER,
    textColor=TEXT_MUTED,
    spaceBefore=4*pt,
    spaceAfter=10*pt
))

# Tier Name Style (for tier cards)
styles.add(ParagraphStyle(
    name='TierName',
    fontName='NotoSerifSC-Bold',
    fontSize=12,
    leading=16,
    alignment=TA_CENTER,
    textColor=colors.white
))

# Price Style
styles.add(ParagraphStyle(
    name='PriceStyle',
    fontName='NotoSerifSC-Bold',
    fontSize=20,
    leading=26,
    alignment=TA_CENTER,
    textColor=ACCENT
))

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# DOCUMENT SETUP
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OUTPUT_DIR = '/home/z/my-project/download'
os.makedirs(OUTPUT_DIR, exist_ok=True)

output_path = os.path.join(OUTPUT_DIR, 'Cybersoc_Billing_Licensing_Architecture.pdf')

doc = SimpleDocTemplate(
    output_path,
    pagesize=A4,
    leftMargin=22*mm,
    rightMargin=22*mm,
    topMargin=20*mm,
    bottomMargin=20*mm
)

story = []

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# HELPER FUNCTIONS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
def create_section_table(data, col_widths=None, header_rows=1):
    """Create a styled table with cascade palette compliance."""
    if col_widths is None:
        available_width = doc.width
        col_count = len(data[0])
        col_widths = [available_width / col_count] * col_count
    
    table = Table(data, colWidths=col_widths, repeatRows=header_rows)
    
    style_commands = [
        # Header row styling
        ('BACKGROUND', (0, 0), (-1, header_rows-1), HEADER_FILL),
        ('TEXTCOLOR', (0, 0), (-1, header_rows-1), colors.white),
        ('FONTNAME', (0, 0), (-1, header_rows-1), 'NotoSerifSC-Bold'),
        ('FONTSIZE', (0, 0), (-1, header_rows-1), 9),
        ('ALIGN', (0, 0), (-1, header_rows-1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, header_rows-1), 10),
        ('TOPPADDING', (0, 0), (-1, header_rows-1), 10),
        
        # Body rows
        ('FONTNAME', (0, header_rows), (-1, -1), 'NotoSerifSC'),
        ('FONTSIZE', (0, header_rows), (-1, -1), 9),
        ('TEXTCOLOR', (0, header_rows), (-1, -1), TEXT_PRIMARY),
        
        # Grid
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
        ('LINEBELOW', (0, header_rows-1), (-1, header_rows-1), 1.5, ACCENT),
        
        # Padding
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, header_rows), (-1, -1), 6),
        ('BOTTOMPADDING', (0, header_rows), (-1, -1), 6),
        
        # Alternating row colors
        ('ROWBACKGROUNDS', (0, header_rows), (-1, -1), [colors.white, TABLE_STRIPE]),
    ]
    
    table.setStyle(TableStyle(style_commands))
    return table


def add_bullet_list(items, style_name='BulletText'):
    """Add a bullet list to the story."""
    bullet_items = []
    for item in items:
        bullet_items.append(ListItem(
            Paragraph(item, styles[style_name]),
            leftIndent=15*pt,
            bulletColor=ACCENT
        ))
    story.append(ListFlowable(bullet_items, bulletType='bullet', start='circle'))


def add_paragraph(text, style_name='CustomBody'):
    """Add a paragraph with proper text wrapping."""
    story.append(Paragraph(text, styles[style_name]))


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# COVER PAGE
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
story.append(Spacer(1, 40*mm))
story.append(Paragraph("CyberSOC Platform", styles['DocTitle']))
story.append(Spacer(1, 5*mm))
story.append(Paragraph("Billing & Licensing Architecture", styles['DocTitle']))
story.append(Spacer(1, 8*mm))
story.append(Paragraph(
    "Enterprise-Grade Multi-Tier Licensing Framework<br/>"
    "for AI-Native Security Operations Center",
    styles['Subtitle']
))
story.append(Spacer(1, 15*mm))

# Cover info box
cover_info = [
    [Paragraph("<b>Document Type</b>", styles['TableHeader']), 
     Paragraph("Technical Specification", styles['TableCellCenter'])],
    [Paragraph("<b>Version</b>", styles['TableHeader']), 
     Paragraph("1.0.0", styles['TableCellCenter'])],
    [Paragraph("<b>Date</b>", styles['TableHeader']), 
     Paragraph(datetime.now().strftime("%Y-%m-%d"), styles['TableCellCenter'])],
    [Paragraph("<b>Classification</b>", styles['TableHeader']), 
     Paragraph("Internal / Architectural", styles['TableCellCenter'])],
]
cover_table = Table(cover_info, colWidths=[80*mm, 60*mm])
cover_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (0, -1), SECTION_BG),
    ('BACKGROUND', (1, 0), (1, -1), CARD_BG),
    ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('LEFTPADDING', (0, 0), (-1, -1), 10),
    ('RIGHTPADDING', (0, 0), (-1, -1), 10),
    ('TOPPADDING', (0, 0), (-1, -1), 8),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
]))
story.append(cover_table)

story.append(PageBreak())

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# TABLE OF CONTENTS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
story.append(Paragraph("Table of Contents", styles['SectionHeading']))
story.append(Spacer(1, 8*mm))

toc_items = [
    ("1. Executive Summary", "Overview of billing/licensing architecture"),
    ("2. Licensing Tiers Overview", "Six-tier model introduction"),
    ("3. Feature Matrix by Tier", "Detailed capability comparison"),
    ("4. Pricing Model Architecture", "Cost structures and calculations"),
    ("5. License Management System", "Technical implementation"),
    ("6. Subscription Lifecycle Management", "Customer journey automation"),
    ("7. Enterprise & Government Features", "Advanced tier capabilities"),
    ("8. On-Premise Licensing Model", "Air-gapped deployment licensing"),
    ("9. Billing Engine Design", "Payment processing architecture"),
    ("10. Integration with Admin Interface", "Administrative controls"),
    ("11. Compliance & Audit Framework", "Regulatory requirements"),
    ("12. Implementation Roadmap", "Phased deployment plan"),
]

for title, desc in toc_items:
    story.append(Paragraph(f"<b>{title}</b><br/><font color='{TEXT_MUTED.hexval()}' size='9'>{desc}</font>", 
                          styles['BodyNoIndent']))
    story.append(Spacer(1, 3*mm))

story.append(PageBreak())

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SECTION 1: EXECUTIVE SUMMARY
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
story.append(Paragraph("1. Executive Summary", styles['SectionHeading']))

add_paragraph(
    "This document presents a comprehensive Billing and Licensing Architecture designed specifically "
    "for the CyberSOC Platform, an AI-Native Security Operations Center operating system. The architecture "
    "addresses the complex requirements of modern cybersecurity platforms that must serve diverse customer "
    "segments ranging from small security teams to large enterprise organizations and government agencies. "
    "The multi-tier approach ensures scalability, flexibility, and compliance across all deployment scenarios "
    "while maintaining a unified and manageable licensing framework that can adapt to evolving market demands."
)

add_paragraph(
    "The CyberSOC licensing model introduces six distinct tiers: Free, Professional, Business, Enterprise, "
    "Government, and On-Premise. Each tier is carefully calibrated to match specific organizational needs, "
    "budget constraints, and operational requirements. The Free tier serves as an entry point for evaluation "
    "and small-scale deployments, while the Enterprise and Government tiers provide advanced features necessary "
    "for large-scale security operations with stringent compliance requirements. The On-Premise option addresses "
    "the critical need for air-gapped environments where cloud connectivity is restricted or prohibited by "
    "security policy or regulatory mandate."
)

add_paragraph(
    "Key architectural principles underlying this design include modular feature packaging that allows customers "
    "to select precisely the capabilities they need without paying for unnecessary functionality. The usage-based "
    "pricing components ensure fairness and predictability, while the volume-based discount structures reward "
    "customer loyalty and growth. The license enforcement mechanism balances robustness with user experience, "
    "preventing revenue leakage while minimizing friction for legitimate users. Integration with the existing "
    "CyberSOC Admin Interface ensures seamless management of all licensing operations through a unified control plane."
)

add_paragraph(
    "This specification serves as the authoritative reference for engineering teams implementing the billing system, "
    "product managers defining packaging strategies, sales teams configuring quotes, and customer success teams "
    "managing upgrades and renewals. All stakeholders should reference this document when making decisions related "
    "to pricing, packaging, license enforcement, or subscription lifecycle management. The architecture has been "
    "designed with extensibility in mind, allowing new tiers, features, or pricing models to be introduced without "
    "disrupting existing customer deployments or requiring fundamental changes to the core licensing infrastructure."
)

story.append(Spacer(1, 6*mm))

# Key metrics box
key_metrics = [
    [Paragraph("<b>Architecture Metrics</b>", styles['TableHeader']), '', '', ''],
    [Paragraph("Total Tiers", styles['TableCell']), Paragraph("6", styles['TableCellCenter']),
     Paragraph("Feature Categories", styles['TableCell']), Paragraph("12", styles['TableCellCenter'])],
    [Paragraph("Price Points", styles['TableCell']), Paragraph("6 Base + Usage", styles['TableCellCenter']),
     Paragraph("Deployment Models", styles['TableCell']), Paragraph("Cloud + On-Prem", styles['TableCellCenter'])],
    [Paragraph("Integration Points", styles['TableCell']), Paragraph("8 Modules", styles['TableCellCenter']),
     Paragraph("Compliance Standards", styles['TableCell']), Paragraph("5 Frameworks", styles['TableCellCenter'])],
]

metrics_table = create_section_table(key_metrics, col_widths=[45*mm, 35*mm, 45*mm, 35*mm])
story.append(metrics_table)
story.append(Paragraph("Table 1.1: Architecture Overview Metrics", styles['Caption']))

story.append(PageBreak())

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SECTION 2: LICENSING TIERS OVERVIEW
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
story.append(Paragraph("2. Licensing Tiers Overview", styles['SectionHeading']))

add_paragraph(
    "The CyberSOC Platform employs a six-tier licensing model that spans the full spectrum of organizational "
    "needs from individual security practitioners to large government agencies. Each tier represents a distinct "
    "value proposition with carefully curated feature sets, support levels, and deployment options. The tier "
    "structure follows industry best practices while incorporating innovations specific to AI-native security "
    "platforms. Understanding the positioning and target audience for each tier is essential for effective "
    "sales execution, customer success management, and product roadmap planning."
)

story.append(Paragraph("2.1 Tier Definitions and Target Segments", styles['SubsectionHeading']))

add_paragraph(
    "<b>Free Tier (Community Edition):</b> The Free tier provides foundational security capabilities at no cost, "
    "designed primarily for educational purposes, individual researchers, small teams evaluating the platform, "
    "and open-source community engagement. This tier includes basic SIEM functionality with limited data retention "
    "(7 days), up to 5 users, 1 GB/day log ingestion, and community forum support. The Free tier serves as the "
    "primary acquisition channel, allowing potential customers to experience core platform value before committing "
    "to a paid subscription. Strategic importance extends beyond direct revenue to include market awareness, "
    "developer ecosystem building, and competitive displacement of legacy SIEM solutions in small deployments."
)

add_paragraph(
    "<b>Professional Tier:</b> Targeted at small to medium security teams (10-50 analysts), the Professional tier "
    "adds advanced detection capabilities, extended data retention (30 days), increased ingestion capacity "
    "(10 GB/day), and email support with 4-hour response SLA. This tier includes UEBA basics, SOAR workflow "
    "automation (50 actions/month), and API access for custom integrations. The Professional tier represents the "
    "primary conversion path from Free users who have validated platform fit and require production-grade "
    "capabilities. Pricing is structured as per-analyst-per-month to align with team scaling patterns typical "
    "of growing security operations functions."
)

add_paragraph(
    "<b>Business Tier:</b> Designed for established security operations centers (50-200 analysts), the Business "
    "tier introduces collaborative features essential for team coordination at scale. Key additions include "
    "90-day data retention, 100 GB/day ingestion, XDR endpoint integration, threat intelligence feeds, case "
    "management with full DFIR workflow, and dedicated success manager. Support escalates to priority phone "
    "support with 2-hour response SLA and quarterly business reviews. The Business tier often serves as the "
    "entry point for enterprises beginning their CyberSOC journey, providing sufficient capability for initial "
    "deployment while establishing foundation for future expansion to Enterprise tier requirements."
)

add_paragraph(
    "<b>Enterprise Tier:</b> The flagship offering for large organizations (200+ analysts), the Enterprise tier "
    "unlocks the complete CyberSOC feature set including unlimited data retention (configurable), 1 TB+ daily "
    "ingestion, full AI Copilot suite with autonomous investigation, MSSP multi-tenancy support, advanced "
    "compliance frameworks (SOC 2, ISO 27001, GDPR), custom integrations via professional services, and "
    "24/7 premium support with 1-hour critical issue SLA. Enterprise customers receive assigned technical "
    "account managers, architecture consultations, and early access to beta features. Contract terms are "
    "customizable with annual or multi-year commitments attracting significant discounts."
)

add_paragraph(
    "<b>Government Tier:</b> Specifically architected for federal, state, and local government agencies, the "
    "Government tier incorporates all Enterprise capabilities plus specialized features addressing public sector "
    "requirements. These include FedRAMP High authorization artifacts, IL5/IL6 compliance packages, CUI handling "
    "controls, government-specific reporting formats (FISMA, OMB), sovereign deployment options, and dedicated "
    "government compliance specialists. Pricing follows GSA Schedule structures where applicable, with specialized "
    "contract vehicles for direct agency procurement. The Government tier undergoes additional security review "
    "and includes enhanced audit logging meeting government accountability standards."
)

add_paragraph(
    "<b>On-Premise Tier:</b> Addressing air-gapped and highly regulated environments requiring complete data "
    "sovereignty, the On-Premise tier delivers full CyberSOC capability through customer-hosted infrastructure. "
    "This tier includes perpetual or subscription licensing options, offline license activation mechanisms, "
    "air-gapped update distribution via secure media, hardware-based license enforcement (USB dongle or "
    "server-bound), and optional professional services for deployment and maintenance. On-Premise pricing "
    "reflects the premium nature of isolated deployment including costs for customized delivery mechanisms, "
    "reduced economies of scale, and enhanced support requirements for self-managed infrastructure."
)

story.append(PageBreak())

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SECTION 3: FEATURE MATRIX BY TIER
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
story.append(Paragraph("3. Feature Matrix by Tier", styles['SectionHeading']))

add_paragraph(
    "The following comprehensive feature matrix provides detailed visibility into capability availability across "
    "all six licensing tiers. This matrix serves as the definitive reference for sales engineering, solution "
    "architecture, and customer conversations regarding feature inclusion. Each row represents a distinct platform "
    "capability organized by functional category, while columns indicate tier availability through standardized "
    "symbols indicating full inclusion, partial availability with limitations, add-on purchase requirement, or "
    "exclusion from the tier. Product management should review and update this matrix quarterly to reflect "
    "roadmap deliveries and packaging decisions."
)

story.append(Paragraph("3.1 Core Platform Features", styles['SubsectionHeading']))

core_features = [
    [Paragraph("<b>Feature</b>", styles['TableHeader']),
     Paragraph("<b>Free</b>", styles['TableHeader']),
     Paragraph("<b>Pro</b>", styles['TableHeader']),
     Paragraph("<b>Business</b>", styles['TableHeader']),
     Paragraph("<b>Enterprise</b>", styles['TableHeader']),
     Paragraph("<b>Gov</b>", styles['TableHeader']),
     Paragraph("<b>On-Prem</b>", styles['TableHeader'])],
    ["SIEM Core Engine", "Basic", "Full", "Full", "Full", "Full", "Full"],
    ["Data Retention", "7 days", "30 days", "90 days", "Unlimited", "Unlimited", "Configurable"],
    ["Daily Ingestion", "1 GB", "10 GB", "100 GB", "1 TB+", "1 TB+", "License-based"],
    ["User Seats", "5", "25", "100", "Unlimited", "Unlimited", "License-based"],
    ["Dashboard Views", "Analyst Only", "+Manager", "+CISO", "All", "All", "All"],
    ["Alert Correlation", "Rule-based", "ML Basic", "ML Advanced", "AI Full", "AI Full", "AI Full"],
    ["API Access", "Read-only", "Full REST", "Full + WS", "Full + Custom", "Full + Gov", "Full"],
]

core_table = create_section_table(core_features, 
    col_widths=[38*mm, 22*mm, 22*mm, 24*mm, 26*mm, 20*mm, 24*mm])
story.append(core_table)
story.append(Paragraph("Table 3.1: Core Platform Feature Matrix", styles['Caption']))

story.append(Paragraph("3.2 Advanced Security Capabilities", styles['SubsectionHeading']))

advanced_features = [
    [Paragraph("<b>Capability</b>", styles['TableHeader']),
     Paragraph("<b>Free</b>", styles['TableHeader']),
     Paragraph("<b>Pro</b>", styles['TableHeader']),
     Paragraph("<b>Business</b>", styles['TableHeader']),
     Paragraph("<b>Enterprise</b>", styles['TableHeader']),
     Paragraph("<b>Gov</b>", styles['TableHeader']),
     Paragraph("<b>On-Prem</b>", styles['TableHeader'])],
    ["UEBA Engine", "-", "Basic", "Full", "Full + AI", "Full + AI", "Full"],
    ["XDR Integration", "-", "-", "Endpoint", "Full XDR", "Full XDR", "Full XDR"],
    ["NDR/Network Detection", "-", "-", "Basic", "Full", "Full", "Full"],
    ["SOAR Automation", "-", "50/mo", "500/mo", "Unlimited", "Unlimited", "Unlimited"],
    ["Threat Intel Feeds", "Open Source", "Commercial", "Premium", "Custom", "Gov-Specific", "Configurable"],
    ["Threat Hunting", "Manual", "Guided", "Advanced", "AI-Assisted", "AI + Classified", "AI-Assisted"],
    ["DFIR Platform", "-", "Basic", "Full", "Full + Auto", "Full + Auto", "Full"],
    ["Attack Surface Mgmt", "-", "-", "External", "Full", "Full + Gov", "Full"],
]

advanced_table = create_section_table(advanced_features,
    col_widths=[40*mm, 21*mm, 21*mm, 23*mm, 25*mm, 23*mm, 23*mm])
story.append(advanced_table)
story.append(Paragraph("Table 3.2: Advanced Security Capabilities Matrix", styles['Caption']))

story.append(Paragraph("3.3 AI and Intelligence Features", styles['SubsectionHeading']))

ai_features = [
    [Paragraph("<b>AI Feature</b>", styles['TableHeader']),
     Paragraph("<b>Free</b>", styles['TableHeader']),
     Paragraph("<b>Pro</b>", styles['TableHeader']),
     Paragraph("<b>Business</b>", styles['TableHeader']),
     Paragraph("<b>Enterprise</b>", styles['TableHeader']),
     Paragraph("<b>Gov</b>", styles['TableHeader']),
     Paragraph("<b>On-Prem</b>", styles['TableHeader'])],
    ["AI SOC Copilot", "Suggest", "Assist", "Auto-Pilot", "Autonomous", "Autonomous", "Auto-Pilot"],
    ["Natural Language Query", "Limited", "Full", "Full + Context", "Advanced", "Advanced", "Full"],
    ["Automated Investigation", "-", "Basic", "Standard", "Full Auto", "Full Auto", "Standard"],
    ["Predictive Analytics", "-", "Trends", "Full", "Prescriptive", "Prescriptive", "Full"],
    ["ML Detection Models", "Pre-built", "Custom (5)", "Custom (25)", "Unlimited", "Unlimited", "Custom (50)"],
    ["Security Graph", "View", "Analyze", "Full", "AI Insights", "AI + Gov Data", "Full"],
    ["Risk Engine", "Score", "Quantify", "Predict", "Simulate", "Simulate", "Predict"],
]

ai_table = create_section_table(ai_features,
    col_widths=[42*mm, 21*mm, 22*mm, 24*mm, 24*mm, 22*mm, 23*mm])
story.append(ai_table)
story.append(Paragraph("Table 3.3: AI and Intelligence Feature Matrix", styles['Caption']))

story.append(PageBreak())

story.append(Paragraph("3.4 Operations and Support Features", styles['SubsectionHeading']))

ops_features = [
    [Paragraph("<b>Feature</b>", styles['TableHeader']),
     Paragraph("<b>Free</b>", styles['TableHeader']),
     Paragraph("<b>Pro</b>", styles['TableHeader']),
     Paragraph("<b>Business</b>", styles['TableHeader']),
     Paragraph("<b>Enterprise</b>", styles['TableHeader']),
     Paragraph("<b>Gov</b>", styles['TableHeader']),
     Paragraph("<b>On-Prem</b>", styles['TableHeader'])],
    ["Support Channel", "Forum", "Email", "Email + Phone", "24/7 Premium", "24/7 Dedicated", "24/7 Premium"],
    ["Response SLA", "Best Effort", "4 hours", "2 hours", "1 hour Critical", "1 hour Critical", "4 hours"],
    ["Dedicated Manager", "-", "-", "Success Mgr", "Account Mgr", "Gov Specialist", "Success Mgr"],
    ["Training Included", "Documentation", "Online", "Online + Workshop", "On-site", "On-site + Clearance", "Workshop"],
    ["Professional Services", "-", "-", "Optional", "Included Hours", "Included + Gov", "Required Add-on"],
    ["SLA Uptime Guarantee", "99.5%", "99.9%", "99.95%", "99.99%", "99.99%", "Best Effort"],
    ["Disaster Recovery", "-", "Backup", "Active DR", "Geo-redundant", "Sovereign DR", "Customer Managed"],
    ["MSSP Multi-tenancy", "-", "-", "Basic (5)", "Full (Unlimited)", "Full + Gov", "Full (Licensed)"],
]

ops_table = create_section_table(ops_features,
    col_widths=[40*mm, 22*mm, 22*mm, 24*mm, 26*mm, 24*mm, 26*mm])
story.append(ops_table)
story.append(Paragraph("Table 3.4: Operations and Support Feature Matrix", styles['Caption']))

story.append(Paragraph("3.5 Compliance and Governance", styles['SubsectionHeading']))

compliance_features = [
    [Paragraph("<b>Compliance Area</b>", styles['TableHeader']),
     Paragraph("<b>Free</b>", styles['TableHeader']),
     Paragraph("<b>Pro</b>", styles['TableHeader']),
     Paragraph("<b>Business</b>", styles['TableHeader']),
     Paragraph("<b>Enterprise</b>", styles['TableHeader']),
     Paragraph("<b>Gov</b>", styles['TableHeader']),
     Paragraph("<b>On-Prem</b>", styles['TableHeader'])],
    ["Compliance Frameworks", "Basic Mapping", "SOC 2 Type I", "SOC 2 Type II", "Full Suite", "FedRAMP + Full", "Configurable"],
    ["Audit Logging", "Basic", "Standard", "Comprehensive", "Tamper-proof", "Gov Archive", "Local Storage"],
    ["Data Residency", "Default Region", "Choice of Region", "Dedicated Tenant", "Sovereign Cloud", "Required", "Customer Controlled"],
    ["Role-Based Access", "3 Roles", "5 Roles", "10 Roles", "Custom + ABAC", "ABAC + Clearance", "Custom"],
    ["Data Encryption", "At Rest/Transit", "+ Key Mgmt", "+ BYOK", "+ HSM", "+ FIPS 140-2", "+ HSM Option"],
    ["Vulnerability Mgmt", "Scan Reports", "Prioritization", "Remediation", "Full Lifecycle", "Full + FedRAMP", "Full Lifecycle"],
    ["Cloud Security", "-", "CSPM Basic", "CSPM Full", "CNAPP", "CNAPP + Gov", "CSPM Full"],
    ["Identity Security", "SSO Basic", "IdP Integration", "Full IAM", "PAM + CIEM", "PIV/CAC Support", "Full IAM"],
]

compliance_table = create_section_table(compliance_features,
    col_widths=[40*mm, 22*mm, 23*mm, 25*mm, 26*mm, 25*mm, 25*mm])
story.append(compliance_table)
story.append(Paragraph("Table 3.5: Compliance and Governance Matrix", styles['Caption']))

story.append(PageBreak())

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SECTION 4: PRICING MODEL ARCHITECTURE
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
story.append(Paragraph("4. Pricing Model Architecture", styles['SectionHeading']))

add_paragraph(
    "The CyberSOC pricing model employs a hybrid approach combining subscription-based recurring revenue with "
    "usage-based components for variable consumption. This architecture balances predictable budgeting for "
    "customers with fair value exchange for the platform provider. The model has been designed following extensive "
    "market analysis of competing SIEM/SOAR platforms, customer interviews spanning organizational sizes, and "
    "financial modeling ensuring unit economics sustainability across all customer segments and growth scenarios."
)

story.append(Paragraph("4.1 Base Subscription Pricing", styles['SubsectionHeading']))

pricing_data = [
    [Paragraph("<b>Tier</b>", styles['TableHeader']),
     Paragraph("<b>Model</b>", styles['TableHeader']),
     Paragraph("<b>Base Price</b>", styles['TableHeader']),
     Paragraph("<b>Billing Cycle</b>", styles['TableHeader']),
     Paragraph("<b>Contract Min</b>", styles['TableHeader'])],
    ["Free", "Perpetual Free", "$0", "N/A", "None"],
    ["Professional", "Per-Analyst/Month", "$149/user/mo", "Monthly/Annual", "5 Users"],
    ["Business", "Per-Analyst/Month", "$299/user/mo", "Annual", "25 Users"],
    ["Enterprise", "Platform + Consumption", "$50,000/yr base", "Annual/Multi-year", "100 Users"],
    ["Government", "Platform + Compliance", "GSA Schedule", "Annual/Multi-year", "Agency Contract"],
    ["On-Premise", "Perpetual or Subscription", "Custom Quote", "Perpetual/3-yr sub", "PO Required"],
]

pricing_table = create_section_table(pricing_data,
    col_widths=[32*mm, 38*mm, 35*mm, 35*mm, 30*mm])
story.append(pricing_table)
story.append(Paragraph("Table 4.1: Base Subscription Pricing Structure", styles['Caption']))

story.append(Paragraph("4.2 Usage-Based Pricing Components", styles['SubsectionHeading']))

add_paragraph(
    "Beyond base subscriptions, certain tiers incur usage-based charges for consumption that scales with "
    "operational intensity. This approach ensures customers pay proportionally to value received while avoiding "
    "over-provisioning costs typical of pure seat-based models. Usage metering occurs in real-time with "
    "granularity sufficient for cost allocation and showback reporting. Customers can set budget alerts and "
    "hard limits to prevent unexpected overage charges, with grace periods and burst allowances designed to "
    "accommodate legitimate security incident response scenarios without penalty."
)

usage_pricing = [
    [Paragraph("<b>Metric</b>", styles['TableHeader']),
     Paragraph("<b>Unit</b>", styles['TableHeader']),
     Paragraph("<b>Pro Rate</b>", styles['TableHeader']),
     Paragraph("<b>Business Rate</b>", styles['TableHeader']),
     Paragraph("<b>Enterprise Rate</b>", styles['TableHeader'])],
    ["Data Ingestion (overage)", "per GB", "$0.50", "$0.30", "$0.15"],
    ["Storage (extended retention)", "per GB-month", "$0.20", "$0.12", "$0.08"],
    ["SOAR Actions (overage)", "per 1,000", "$10.00", "$5.00", "$2.00"],
    ["API Calls (overage)", "per 10,000", "$1.00", "$0.50", "$0.20"],
    ["AI Copilot Queries", "per 1,000", "$5.00", "$3.00", "$1.00"],
    ["Threat Intel Enrichment", "per 10,000", "$2.00", "$1.00", "$0.50"],
    ["Report Generation", "per 100", "$3.00", "$1.50", "$0.50"],
    ["Long-term Retention (>1yr)", "per GB-month", "-", "$0.08", "$0.04"],
]

usage_table = create_section_table(usage_pricing,
    col_widths=[45*mm, 28*mm, 30*mm, 33*mm, 34*mm])
story.append(usage_table)
story.append(Paragraph("Table 4.2: Usage-Based Pricing Components", styles['Caption']))

story.append(Paragraph("4.3 Volume Discount Structure", styles['SubsectionHeading']))

add_paragraph(
    "Enterprise and Government tiers benefit from volume-based discount structures that reduce effective per-unit "
    "costs as commitment increases. Discounts apply cumulatively across multiple dimensions including user count, "
    "data volume, contract duration, and multi-product bundling. The discount matrix below illustrates standard "
    "discount percentages; negotiated arrangements for strategic accounts may exceed these guidelines with "
    "appropriate executive approval. Discount tiers reset annually unless locked through multi-year agreements, "
    "providing flexibility for growing customers while protecting committed volumes from price increases."
)

discount_data = [
    [Paragraph("<b>Commitment Level</b>", styles['TableHeader']),
     Paragraph("<b>User Discount</b>", styles['TableHeader']),
     Paragraph("<b>Ingestion Discount</b>", styles['TableHeader']),
     Paragraph("<b>Multi-Year Bonus</b>", styles['TableHeader'])],
    ["Base (100-250 users)", "0%", "0%", "0%"],
    ["Silver (251-500 users)", "10%", "8%", "5% (2-yr), 10% (3-yr)"],
    ["Gold (501-1000 users)", "18%", "15%", "8% (2-yr), 15% (3-yr)"],
    ["Platinum (1001-2500 users)", "25%", "22%", "12% (2-yr), 20% (3-yr)"],
    ["Diamond (2500+ users)", "35%", "30%", "15% (2-yr), 25% (3-yr)"],
    ["Strategic (Custom)", "Negotiated", "Negotiated", "Up to 30%"],
]

discount_table = create_section_table(discount_data,
    col_widths=[45*mm, 35*mm, 38*mm, 52*mm])
story.append(discount_table)
story.append(Paragraph("Table 4.3: Volume Discount Structure", styles['Caption']))

story.append(PageBreak())

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SECTION 5: LICENSE MANAGEMENT SYSTEM
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
story.append(Paragraph("5. License Management System", styles['SectionHeading']))

add_paragraph(
    "The License Management System (LMS) forms the technical backbone of CyberSOC's billing architecture, "
    "responsible for entitlement verification, enforcement, metering, and compliance monitoring. The LMS has "
    "been architected as a microservice within the CyberSOC platform ecosystem, exposing well-defined APIs for "
    "integration with admin interfaces, payment processors, and external systems. The design prioritizes high "
    "availability given that licensing failures can impact platform availability for all customers, implementing "
    "graceful degradation modes that maintain functionality during transient outages while preventing systematic "
    "abuse of licensing boundaries."
)

story.append(Paragraph("5.1 System Architecture", styles['SubsectionHeading']))

add_paragraph(
    "The LMS comprises several interconnected components each serving distinct functions within the licensing "
    "lifecycle. The Entitlement Store maintains the authoritative record of customer permissions, implemented "
    "as an eventually consistent distributed database optimized for read-heavy workload patterns typical of "
    "license verification requests. The Policy Engine evaluates entitlement rules against current state, "
    "supporting complex logic including time-bound trials, graduated features, and conditional access based on "
    "compliance status. The Metering Service tracks usage against entitled limits with configurable granularity "
    "and retention periods supporting both real-time enforcement and historical billing reconciliation."
)

add_paragraph(
    "The Enforcement Agent runs as a trusted component within customer deployments, making local licensing "
    "decisions without requiring constant connectivity to central services. This architecture is particularly "
    "important for On-Premise deployments where internet access may be restricted. Agents periodically synchronize "
    "with the central LMS to receive updated entitlements and report metered usage, caching credentials and "
    "permissions locally with tamper-evident storage. The Audit Logger maintains an immutable chain of all "
    "licensing decisions and state changes, supporting compliance investigations and dispute resolution with "
    "cryptographic integrity verification."
)

# Architecture components table
arch_components = [
    [Paragraph("<b>Component</b>", styles['TableHeader']),
     Paragraph("<b>Function</b>", styles['TableHeader']),
     Paragraph("<b>Technology</b>", styles['TableHeader']),
     Paragraph("<b>SLA</b>", styles['TableHeader'])],
    ["Entitlement Store", "Authoritative permission records", "PostgreSQL + Redis Cache", "99.99%"],
    ["Policy Engine", "Rule evaluation and decisions", "Go microservice + OPA", "99.95%"],
    ["Metering Service", "Usage tracking and aggregation", "Apache Kafka + ClickHouse", "99.9%"],
    ["Enforcement Agent", "Local decision making", "Rust binary (embedded)", "Always Available"],
    ["Audit Logger", "Immutable decision log", "Append-only S3 + signing", "99.99%"],
    ["Sync Service", "Agent coordination", "gRPC + mTLS", "99.9%"],
    ["Admin API", "Management interface", "REST + OpenAPI 3.0", "99.95%"],
]

arch_table = create_section_table(arch_components,
    col_widths=[35*mm, 50*mm, 45*mm, 30*mm])
story.append(arch_table)
story.append(Paragraph("Table 5.1: License Management System Components", styles['Caption']))

story.append(Paragraph("5.2 License Key Structure", styles['SubsectionHeading']))

add_paragraph(
    "CyberSOC employs cryptographic license keys that encode entitlement information in a tamper-evident format. "
    "Each license key contains signed claims specifying permitted capabilities, limitations, validity period, "
    "and deployment constraints. The key structure follows JWT-like conventions with platform-specific extensions "
    "for licensing semantics. Keys are issued by the central licensing authority using ECDSA P-256 signatures, "
    "verifiable by enforcement agents without online connectivity. This design enables offline operation for "
    "On-Premise deployments while maintaining cryptographic proof of authenticity and integrity."
)

add_paragraph(
    "License keys include both public claims visible to administrators for troubleshooting and private claims "
    "encrypted for enforcement only. Public claims include tenant identifier, tier level, feature flags, user "
    "limits, and expiration timestamp. Private claims contain machine-binding hashes, anti-circumvention tokens, "
    "and usage counters for metered features. The hybrid structure balances transparency for operational "
    "effectiveness with security measures preventing license manipulation or sharing beyond authorized scope."
)

license_structure = [
    [Paragraph("<b>Claim Type</b>", styles['TableHeader']),
     Paragraph("<b>Field</b>", styles['TableHeader']),
     Paragraph("<b>Description</b>", styles['TableHeader']),
     Paragraph("<b>Example</b>", styles['TableHeader'])],
    ["Public", "tid", "Tenant UUID", "550e8400-e29b..."],
    ["Public", "tier", "License tier", "enterprise"],
    ["Public", "features", "Enabled feature list", "siem,xdr,soar,ai"],
    ["Public", "max_users", "Seat limit", "500"],
    ["Public", "exp", "Expiration epoch", "1735689600"],
    ["Private", "hw_hash", "Hardware binding", "sha256:abc123..."],
    ["Private", "usage_sig", "Usage counter signature", "integrity token"],
    ["Private", "node_limit", "Deployment node limit", "8"],
]

license_table = create_section_table(license_structure,
    col_widths=[28*mm, 30*mm, 50*mm, 48*mm])
story.append(license_table)
story.append(Paragraph("Table 5.2: License Key Claim Structure", styles['Caption']))

story.append(PageBreak())

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SECTION 6: SUBSCRIPTION LIFECYCLE MANAGEMENT
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
story.append(Paragraph("6. Subscription Lifecycle Management", styles['SectionHeading']))

add_paragraph(
    "Subscription Lifecycle Management encompasses all processes governing customer relationships from initial "
    "acquisition through renewal, expansion, churn, and potential reactivation. The CyberSOC lifecycle model "
    "has been designed to maximize customer lifetime value while ensuring frictionless experience for legitimate "
    "use cases. Automated workflows handle routine transitions while flagging edge cases for human review. "
    "Integration with CRM systems, revenue recognition platforms, and customer success tools ensures consistent "
    "experience across all touchpoints while maintaining accurate financial records for reporting purposes."
)

story.append(Paragraph("6.1 Customer Journey Stages", styles['SubsectionHeading']))

lifecycle_stages = [
    [Paragraph("<b>Stage</b>", styles['TableHeader']),
     Paragraph("<b>Duration</b>", styles['TableHeader']),
     Paragraph("<b>Key Activities</b>", styles['TableHeader']),
     Paragraph("<b>System Actions</b>", styles['TableHeader'])],
    ["Trial/Free", "14-30 days", "Evaluation, POC, integration testing", "Feature-gated, usage capped"],
    ["Onboarding", "First 30 days", "Configuration, training, data migration", "Success manager assignment"],
    ["Active Normal", "Ongoing", "Production usage, optimization", "Metering, health checks"],
    ["Renewal Window", "90 days pre-expiry", "Review, negotiation, contract update", "Renewal alerts, quoting"],
    ["Expansion", "Triggered", "Upsell, tier upgrade, add-on purchase", "Prorated billing adjustment"],
    ["At-Risk", "Detected", "Engagement decline, issues flagged", "Intervention triggers, outreach"],
    ["Churned", "Post-cancellation", "Offboarding, data export, feedback", "Access downgrade, retention"],
    ["Reactivated", "New contract", "Return path, win-back incentives", "History restoration option"],
]

lifecycle_table = create_section_table(lifecycle_stages,
    col_widths=[30*mm, 28*mm, 55*mm, 50*mm])
story.append(lifecycle_table)
story.append(Paragraph("Table 6.1: Subscription Lifecycle Stages", styles['Caption']))

story.append(Paragraph("6.2 Automated Workflow Triggers", styles['SubsectionHeading']))

add_paragraph(
    "The lifecycle management system implements automated triggers responding to significant events and threshold "
    "crossings. These triggers initiate predefined workflows ensuring timely action without requiring manual "
    "monitoring of all customer accounts. Trigger conditions have been carefully tuned to balance sensitivity "
    "(catching genuine issues early) against false positive rate (avoiding alert fatigue for customer success "
    "teams). Machine learning models continuously refine trigger thresholds based on historical outcomes, "
    "improving prediction accuracy for churn risk and expansion opportunity identification over time."
)

workflow_triggers = [
    [Paragraph("<b>Trigger Event</b>", styles['TableHeader']),
     Paragraph("<b>Condition</b>", styles['TableHeader']),
     Paragraph("<b>Action Initiated</b>", styles['TableHeader']),
     Paragraph("<b>Owner</b>", styles['TableHeader'])],
    ["Trial Expiring", "3 days remaining", "Extension offer + conversion call", "Sales Development"],
    ["Usage Threshold", ">80% of limit", "Upgrade recommendation", "Customer Success"],
    ["Payment Failure", "Retry exhausted", "Grace period + suspension notice", "Billing Operations"],
    ["Low Engagement", "<20% MAU for 2 weeks", "Health check outreach", "Customer Success"],
    ["Support Escalation", "3+ severity 1 tickets", "Technical account review", "Technical Account Mgr"],
    ["Contract Expiry", "90 days before", "Renewal preparation start", "Account Executive"],
    ["Expansion Signal", "Job change / funding", "Opportunity qualification", "Sales Representative"],
]

workflow_table = create_section_table(workflow_triggers,
    col_widths=[36*mm, 42*mm, 48*mm, 37*mm])
story.append(workflow_table)
story.append(Paragraph("Table 6.2: Automated Workflow Triggers", styles['Caption']))

story.append(Paragraph("6.3 Grace Period and Suspension Policies", styles['SubsectionHeading']))

add_paragraph(
    "Recognizing that security operations cannot tolerate abrupt service termination, CyberSOC implements graded "
    "response to payment and compliance issues. Upon payment failure, customers enter a 14-day grace period during "
    "which all services continue normally while collection efforts proceed. If unresolved, soft restriction mode "
    "limits non-essential features (AI copilot, advanced analytics) while preserving core security functionality "
    "for an additional 14 days. Hard suspension, terminating all access except audit log export, occurs only after "
    "30 days of non-payment. This staged approach protects both customer security posture and vendor revenue "
    "while maintaining ethical business practices appropriate for critical infrastructure software."
)

story.append(PageBreak())

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SECTION 7: ENTERPRISE & GOVERNMENT FEATURES
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
story.append(Paragraph("7. Enterprise & Government Features", styles['SectionHeading']))

add_paragraph(
    "Enterprise and Government tiers represent the pinnacle of CyberSOC capability, incorporating advanced "
    "features necessary for large-scale security operations with demanding compliance requirements. These tiers "
    "go beyond incremental feature additions to provide fundamentally different architectural capabilities "
    "including multi-tenant isolation for MSSP operations, sovereign deployment options for data residency "
    "compliance, and specialized workflows addressing government-specific mandates. Investment in these tiers "
    "reflects their strategic importance, typically representing majority of platform revenue despite smaller "
    "customer counts compared to lower tiers."
)

story.append(Paragraph("7.1 MSSP Multi-Tenancy (Enterprise+)", styles['SubsectionHeading']))

add_paragraph(
    "Managed Security Service Providers (MSSPs) require ability to serve multiple customer tenants from single "
    "CyberSOC deployment while maintaining complete logical isolation between tenant data, configurations, and "
    "user access. The Enterprise tier includes basic MSSP support for up to 5 tenants, while full Enterprise "
    "and Government tiers remove tenant count limitations. Each tenant receives independent data retention "
    "policies, alert thresholds, dashboard configurations, and compliance reporting. Tenant administrators "
    "manage their environment within guardrails defined by the MSSP, preventing configuration drift while "
    "enabling operational autonomy appropriate for delegated security management relationships."
)

mssp_features = [
    [Paragraph("<b>MSSP Capability</b>", styles['TableHeader']),
     Paragraph("<b>Business</b>", styles['TableHeader']),
     Paragraph("<b>Enterprise</b>", styles['TableHeader']),
     Paragraph("<b>Government</b>", styles['TableHeader'])],
    ["Maximum Tenants", "5", "Unlimited", "Unlimited"],
    ["Tenant Isolation", "Logical", "Logical + Crypto", "Logical + Crypto + Air-gap"],
    ["White-label Options", "Basic", "Full UI + Reports", "Full + Gov Branding"],
    ["Tenant Portal", "Shared", "Dedicated per Tenant", "Dedicated + Agency Portal"],
    ["Cross-tenant Search", "-", "With Authorization", "With Clearance Check"],
    ["Resource Pooling", "Static", "Dynamic Quotas", "Dynamic + Priority"],
    ["Tenant Billing", "Included", "Chargeback Support", "Fund Code Tracking"],
    ["SLA per Tenant", "Global", "Per-tenant Configurable", "Per-tenant + Mission Class"],
]

mssp_table = create_section_table(mssp_features,
    col_widths=[45*mm, 35*mm, 40*mm, 44*mm])
story.append(mssp_table)
story.append(Paragraph("Table 7.1: MSSP Multi-Tenancy Feature Comparison", styles['Caption']))

story.append(Paragraph("7.2 Government-Specific Capabilities", styles['SubsectionHeading']))

add_paragraph(
    "The Government tier incorporates specialized capabilities addressing unique requirements of public sector "
    "security operations. These extend beyond standard enterprise features to include compliance artifacts for "
    "authorization frameworks commonly required in government procurement, handling controls for classified and "
    "sensitive information, and deployment architectures meeting sovereignty and air-gap requirements. Government "
    "customers work with dedicated compliance specialists who understand agency-specific requirements and can "
    "guide authorization package development, security assessment coordination, and continuous monitoring "
    "configuration to maintain authority to operate (ATO) status throughout the engagement lifecycle."
)

gov_capabilities = [
    [Paragraph("<b>Capability</b>", styles['TableHeader']),
     Paragraph("<b>Description</b>", styles['TableHeader']),
     Paragraph("<b>Standards</b>", styles['TableHeader'])],
    ["FedRAMP Ready", "Package for authorization", "FedRAMP High Baseline"],
    ["IL5/IL6 Controls", "Impact level handling", "DoD Cloud Computing SRG"],
    ["CUI Marking", "Controlled unclassified info", "NIST SP 800-171 / CUI Registry"],
    ["FISMA Reporting", "Agency compliance reports", "OMB Circular A-123, FISMA Act"],
    ["PIV/CAC Auth", "Government smartcard login", "HSPD-12 / NIST SP 800-116"],
    ["Sovereign Deployment", "Data residency guarantee", "FedRAMP + Agency Requirements"],
    ["Classified Processing", "Optional SCI enclave", "ICD 503 / CNSSI 1253"],
    ["Continuous Diagnostics", "CDM integration ready", "CDM Program Requirements"],
]

gov_table = create_section_table(gov_capabilities,
    col_widths=[40*mm, 65*mm, 50*mm])
story.append(gov_table)
story.append(Paragraph("Table 7.2: Government-Specific Capabilities", styles['Caption']))

story.append(PageBreak())

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SECTION 8: ON-PREMISE LICENSING MODEL
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
story.append(Paragraph("8. On-Premise Licensing Model", styles['SectionHeading']))

add_paragraph(
    "The On-Premise licensing model addresses scenarios requiring complete infrastructure control due to security "
    "policy, regulatory mandate, or network topology constraints preventing cloud connectivity. Common drivers "
    "include classified processing environments, air-gapped operational technology networks, data sovereignty "
    "requirements mandating physical jurisdictional control, and organizational policies prohibiting SaaS "
    "consumption for security tooling. The On-Premise tier delivers equivalent functional capability to cloud "
    "deployments through alternative delivery and licensing mechanisms adapted to disconnected operation."
)

story.append(Paragraph("8.1 Licensing Mechanisms for Air-Gapped Environments", styles['SubsectionHeading']))

add_paragraph(
    "Air-gapped environments present unique challenges for license enforcement typically reliant on cloud "
    "connectivity for validation. CyberSOC addresses this through multiple complementary mechanisms providing "
    "appropriate assurance levels for different threat models. The primary mechanism uses cryptographically "
    "signed license files encoding entitlements with validity periods, distributed through secure media transfer "
    "processes. For higher assurance requirements, hardware dongles (USB tokens) provide tamper-resistant credential "
    "storage with server binding preventing license migration beyond authorized deployments. Server-bound licenses "
    "utilize hardware fingerprinting to tie entitlements to specific physical infrastructure, balancing usability "
    "against unauthorized copying prevention."
)

onprem_mechanisms = [
    [Paragraph("<b>Mechanism</b>", styles['TableHeader']),
     Paragraph("<b>Security Level</b>", styles['TableHeader']),
     Paragraph("<b>Connectivity</b>", styles['TableHeader']),
     Paragraph("<b>Use Case</b>", styles['TableHeader'])],
    ["Signed License File", "Standard", "Periodic sync", "Typical on-premise"],
    ["Hardware Dongle", "High", "Initial + renewal", "High-value deployments"],
    ["Server Binding", "Medium-High", "Initial only", "Stable infrastructure"],
    ["Air-Gap Transfer Media", "Varies", "Physical transfer", "Classified networks"],
    ["Offline Activation", "Standard", "Phone/email one-time", "Limited connectivity"],
    ["Satellite Sync Server", "High", "Internal relay", "Large air-gapped orgs"],
]

onprem_table = create_section_table(onprem_mechanisms,
    col_widths=[42*mm, 32*mm, 35*mm, 51*mm])
story.append(onprem_table)
story.append(Paragraph("Table 8.1: On-Premise Licensing Mechanisms", styles['Caption']))

story.append(Paragraph("8.2 Update Distribution and Maintenance", styles['SubsectionHeading']))

add_paragraph(
    "Software updates for On-Premise deployments follow secure supply chain practices ensuring integrity and "
    "authenticity of all delivered components. Updates are packaged with cryptographic signatures verifiable "
    "by the target deployment before installation. For air-gapped environments, updates distribute through "
    "designated transfer media following procedures defined in customer security plans. The update manifest "
    "includes hash verification, dependency specifications, rollback instructions, and security bulletin "
    "references. Customers with active maintenance subscriptions receive update notifications and media on "
    "established schedules (quarterly for patches, annual for feature releases) with expedited delivery "
    "available for critical security patches affecting deployed versions."
)

add_paragraph(
    "Maintenance tiers for On-Premise deployments range from self-service (download and install independently) "
    "through assisted (vendor-guided remote sessions during maintenance windows) to fully managed (vendor "
    "personnel on-site for major updates). Higher maintenance tiers include additional benefits such as "
    "customized patch scheduling aligned with change windows, backward compatibility guarantees for customer "
    "integrations, and dedicated engineering liaison for issue resolution. Maintenance pricing scales with "
    "deployment complexity and service level expectations, typically ranging from 18-25% of license fee "
    "annually for standard maintenance coverage."
)

story.append(PageBreak())

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SECTION 9: BILLING ENGINE DESIGN
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
story.append(Paragraph("9. Billing Engine Design", styles['SectionHeading']))

add_paragraph(
    "The Billing Engine translates licensing entitlements and usage measurements into accurate, timely invoices "
    "while maintaining audit trails sufficient for financial compliance and dispute resolution. The engine has "
    "been designed for integration with multiple payment processors, tax calculation services, and ERP systems "
    "commonly used by enterprise customers. Architecture supports both advance billing (subscription fees billed "
    "at period start) and arrears billing (usage overages billed based on actual consumption), with configurable "
    "billing cycle boundaries accommodating diverse customer fiscal calendar requirements."
)

story.append(Paragraph("9.1 Billing Pipeline Architecture", styles['SubsectionHeading']))

add_paragraph(
    "The billing pipeline operates as a sequence of processing stages transforming raw usage data into formatted "
    "invoices. Collection stage aggregates metered usage from distributed sources, normalizing timestamps and "
    "handling late-arriving data through configurable watermark delays. Rating stage applies pricing rules "
    "including tier determination, discount calculation, and promotional credit application. Tax stage "
    "determines applicable taxation based on customer location, product taxonomy, and exemption certificates "
    "on file. Invoice generation stage produces formatted documents with line item detail, supporting multiple "
    "formats (PDF, EDI, API payload) for delivery through configured channels. Finally, payment processing "
    "stage manages collection attempts, dunning sequences, and receivables accounting integration."
)

pipeline_stages = [
    [Paragraph("<b>Stage</b>", styles['TableHeader']),
     Paragraph("<b>Input</b>", styles['TableHeader']),
     Paragraph("<b>Processing</b>", styles['TableHeader']),
     Paragraph("<b>Output</b>", styles['TableHeader'])],
    ["Collection", "Raw meter events", "Aggregation, deduplication, normalization", "Usage records"],
    ["Rating", "Usage records", "Price lookup, tier calc, discounts", "Rated transactions"],
    ["Tax", "Rated transactions", "Jurisdiction lookup, exemption check", "Tax-inclusive charges"],
    ["Invoice Gen", "Taxed charges", "Template rendering, formatting", "Invoice documents"],
    ["Delivery", "Invoice documents", "Channel routing, notification", "Customer receipt"],
    ["Payment", "Delivered invoices", "Collection attempt, reconciliation", "Payment records"],
    ["Recognition", "Payment records", "Revenue scheduling, GL posting", "Financial entries"],
]

pipeline_table = create_section_table(pipeline_stages,
    col_widths=[28*mm, 38*mm, 52*mm, 38*mm])
story.append(pipeline_table)
story.append(Paragraph("Table 9.1: Billing Pipeline Stages", styles['Caption']))

story.append(Paragraph("9.2 Payment Processing Integration", styles['SubsectionHeading']))

add_paragraph(
    "The billing engine integrates with multiple payment processors to accommodate regional preferences and "
    "enterprise procurement requirements. Credit card processing supports Visa, Mastercard, American Express, "
    "and JCB through PCI-DSS compliant tokenization. ACH/wire transfer handling accommodates enterprise "
    "customers preferring bank-to-bank settlement with automated reconciliation matching payments to invoices "
    "based on reference numbers. Purchase order processing supports customers requiring formal PO-based "
    "workflows with approval routing and budget checking before invoice issuance. For international customers, "
    "local payment methods (SEPA, BACS, PayPal) expand accessibility while localized tax handling addresses "
    "VAT/GST requirements across jurisdictions."
)

payment_methods = [
    [Paragraph("<b>Method</b>", styles['TableHeader']),
     Paragraph("<b>Supported Tiers</b>", styles['TableHeader']),
     Paragraph("<b>Settlement</b>", styles['TableHeader']),
     Paragraph("<b>Fees</b>", styles['TableHeader'])],
    ["Credit Card", "Pro, Business", "Real-time (2-3 day)", "2.9% + $0.30"],
    ["ACH Transfer", "All tiers", "2-5 business days", "0.5% cap $5"],
    ["Wire Transfer", "Enterprise, Gov", "1-3 business days", "Customer pays fee"],
    ["Purchase Order", "Business+", "Net 30/60 terms", "None (credit check)"],
    ["Cryptocurrency", "On request", "Variable", "Market rate"],
]

payment_table = create_section_table(payment_methods,
    col_widths=[35*mm, 38*mm, 40*mm, 39*mm])
story.append(payment_table)
story.append(Paragraph("Table 9.2: Supported Payment Methods", styles['Caption']))

story.append(PageBreak())

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SECTION 10: INTEGRATION WITH ADMIN INTERFACE
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
story.append(Paragraph("10. Integration with Admin Interface", styles['SectionHeading']))

add_paragraph(
    "The Billing and Licensing Architecture integrates deeply with the CyberSOC Admin Interface, providing "
    "unified administrative control over all commercial and operational aspects of the platform. Administrators "
    "with appropriate permissions can manage customer accounts, adjust entitlements, investigate billing disputes, "
    "configure pricing rules, and monitor system health through consistent UI patterns established across the "
    "admin interface. This section details the specific administrative capabilities exposed through the admin "
    "interface for billing and licensing operations, organized by functional area and role requirement."
)

story.append(Paragraph("10.1 Administrative Capabilities Matrix", styles['SubsectionHeading']))

admin_caps = [
    [Paragraph("<b>Capability</b>", styles['TableHeader']),
     Paragraph("<b>Super Admin</b>", styles['TableHeader']),
     Paragraph("<b>Org Admin</b>", styles['TableHeader']),
     Paragraph("<b>Billing Admin</b>", styles['TableHeader']),
     Paragraph("<b>ReadOnly</b>", styles['TableHeader'])],
    ["Create/Edit Licenses", "Full", "Own Org", "Own Org", "View"],
    ["Adjust Entitlements", "Full", "Within Limits", "Credit Adjust", "View"],
    ["Process Refunds", "Full", "-", "With Approval", "-"],
    ["Configure Pricing Rules", "Full", "-", "-", "-"],
    ["View Revenue Dashboards", "Full", "Own Org", "Full", "Aggregate"],
    ["Manage Payment Methods", "Full", "Own Org", "Full", "-"],
    ["Export Billing Data", "Full", "Own Org", "Full", "Redacted"],
    ["Audit Log Access", "Full", "Own Org", "Billing Scope", "Summary"],
    ["Tenant Management (MSSP)", "Full", "Own Tenants", "-", "View Own"],
]

admin_table = create_section_table(admin_caps,
    col_widths=[46*mm, 28*mm, 28*mm, 30*mm, 26*mm])
story.append(admin_table)
story.append(Paragraph("Table 10.1: Administrative Capabilities by Role", styles['Caption']))

story.append(Paragraph("10.2 Admin Dashboard Components", styles['SubsectionHeading']))

add_paragraph(
    "The Admin Interface exposes dedicated dashboard components for billing and licensing oversight. The Revenue "
    "Overview component displays MRR (Monthly Recurring Revenue), ARR (Annual Recurring Revenue), growth trends, "
    "and cohort analysis broken down by tier, geography, and channel. The License Inventory component shows "
    "active license counts by tier, expiration timeline, utilization rates, and renewal probability scores. "
    "The Usage Analytics component highlights customers approaching limits, unusual consumption patterns, and "
    "opportunities for upsell based on feature adoption. The Collections Dashboard tracks aging receivables, "
    "payment failure rates, dunning progress, and cash flow projections enabling proactive revenue operations "
    "management."
)

dashboard_components = [
    [Paragraph("<b>Component</b>", styles['TableHeader']),
     Paragraph("<b>Data Sources</b>", styles['TableHeader']),
     Paragraph("<b>Refresh</b>", styles['TableHeader']),
     Paragraph("<b>Export</b>", styles['TableHeader'])],
    ["Revenue Overview", "Billing + CRM", "Hourly", "CSV, PDF, API"],
    ["License Inventory", "LMS Entitlement Store", "Real-time", "CSV, JSON"],
    ["Usage Analytics", "Metering Service", "15 minutes", "CSV, Dashboard embed"],
    ["Collections Status", "Payment Processor", "Real-time", "PDF Report"],
    ["Customer Health", "CS Platform + Usage", "Daily", "Scorecard PDF"],
    ["Compliance Monitor", "Audit Logger", "Hourly", "Attestation Package"],
]

dash_table = create_section_table(dashboard_components,
    col_widths=[40*mm, 48*mm, 30*mm, 40*mm])
story.append(dash_table)
story.append(Paragraph("Table 10.2: Admin Dashboard Components", styles['Caption']))

story.append(PageBreak())

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SECTION 11: COMPLIANCE & AUDIT FRAMEWORK
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
story.append(Paragraph("11. Compliance & Audit Framework", styles['SectionHeading']))

add_paragraph(
    "The billing and licensing system operates within a comprehensive compliance framework addressing financial "
    "regulations, data protection requirements, and industry-specific standards relevant to cybersecurity "
    "platforms serving global customers. This framework establishes controls, documentation requirements, and "
    "audit mechanisms demonstrating compliance to internal stakeholders, external auditors, and regulatory "
    "bodies. Compliance considerations have been integrated into system design rather than applied as "
    "afterthoughts, ensuring that auditability and control effectiveness are inherent properties of the "
    "architecture rather than superficial overlays."
)

story.append(Paragraph("11.1 Applicable Standards and Regulations", styles['SubsectionHeading']))

compliance_standards = [
    [Paragraph("<b>Standard</b>", styles['TableHeader']),
     Paragraph("<b>Scope</b>", styles['TableHeader']),
     Paragraph("<b>Key Requirements</b>", styles['TableHeader']),
     Paragraph("<b>Status</b>", styles['TableHeader'])],
    ["SOC 2 Type II", "Financial controls", "Access controls, encryption, availability", "Certified"],
    ["GDPR", "EU data protection", "Data minimization, consent, right to deletion", "Compliant"],
    ["CCPA/CPRA", "California privacy", "Disclosure, opt-out, data portability", "Compliant"],
    ["PCI-DSS", "Cardholder data", "Tokenization, network segmentation", "Level 1 Compliant"],
    ["SOX", "Financial reporting", "Segregation of duties, audit trail", "Aligned"],
    ["ISO 27001", "Information security", "ISMS, risk treatment, continual improvement", "Certified"],
    ["FedRAMP", "US Government", "Security controls, continuous monitoring", "In Process"],
    ["GDPR Art. 82-84", "Breach notification", "72-hour notification, documentation", "Implemented"],
]

compliance_table = create_section_table(compliance_standards,
    col_widths=[35*mm, 32*mm, 58*mm, 28*mm])
story.append(compliance_table)
story.append(Paragraph("Table 11.1: Applicable Compliance Standards", styles['Caption']))

story.append(Paragraph("11.2 Audit Logging and Evidence Preservation", styles['SubsectionHeading']))

add_paragraph(
    "All billing and licensing operations generate immutable audit logs capturing actor identity, action taken, "
    "timestamp, affected resources, and outcome. Logs append to tamper-evident storage with cryptographic chaining "
    "ensuring detection of any retrospective modification. Retention periods align with regulatory requirements "
    "(minimum 7 years for financial records, longer where contractually specified). Export mechanisms produce "
    "evidence packages in formats acceptable to external auditors, with attestation documentation describing "
    "collection methodology and integrity verification procedures. Regular access reviews confirm continued "
    "appropriateness of personnel with billing system access, with immediate revocation upon role change or "
    "termination."
)

story.append(Paragraph("11.3 Data Protection Measures", styles['SubsectionHeading']))

add_paragraph(
    "Customer billing data receives heightened protection reflecting sensitivity of financial information and "
    "privacy obligations. Data classification marks billing records as Confidential with handling requirements "
    "including encryption at rest (AES-256) and in transit (TLS 1.3), access logging, and need-to-know access "
    "controls. Data minimization principles limit collection to information necessary for billing purposes, "
    "with separate consent required for secondary uses such as analytics or marketing. Customer rights requests "
    "access, correction, deletion, and portability process within statutory timeframes (typically 30 days) "
    "through documented procedures with escalation paths for complex cases."
)

story.append(PageBreak())

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SECTION 12: IMPLEMENTATION ROADMAP
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
story.append(Paragraph("12. Implementation Roadmap", styles['SectionHeading']))

add_paragraph(
    "Implementation of the Billing and Licensing Architecture follows a phased approach managing risk while "
    "delivering incremental value. Each phase builds upon previous deliverables, establishing foundations "
    "before adding complexity. The roadmap assumes parallel workstreams for backend infrastructure and admin "
    "interface development, with integration points clearly defined at phase boundaries. Timeline estimates "
    "assume adequately staffed cross-functional teams with necessary domain expertise; adjustments may be "
    "required based on organizational context and dependencies on external systems or third-party integrations."
)

story.append(Paragraph("12.1 Phase Timeline", styles['SubsectionHeading']))

phases = [
    [Paragraph("<b>Phase</b>", styles['TableHeader']),
     Paragraph("<b>Duration</b>", styles['TableHeader']),
     Paragraph("<b>Deliverables</b>", styles['TableHeader']),
     Paragraph("<b>Dependencies</b>", styles['TableHeader'])],
    ["Phase 1: Foundation", "Weeks 1-6", "LMS core, basic entitlement store, license key format", "Infrastructure ready"],
    ["Phase 2: Core Billing", "Weeks 7-12", "Subscription management, invoicing, payment integration", "Phase 1 complete"],
    ["Phase 3: Usage Metering", "Weeks 13-18", "Metering pipeline, usage rating, overage billing", "Phase 2 complete"],
    ["Phase 4: Admin Interface", "Weeks 19-24", "Admin dashboards, license management UI, reporting", "Phase 2 + 3 APIs"],
    ["Phase 5: Advanced Tiers", "Weeks 25-32", "Enterprise features, MSSP tenancy, Gov capabilities", "Phase 4 complete"],
    ["Phase 6: On-Premise", "Weeks 33-40", "Offline licensing, air-gap support, secure updates", "Phase 1 stable"],
    ["Phase 7: Compliance", "Weeks 41-48", "Audit automation, evidence packages, certification prep", "All phases stable"],
    ["Phase 8: Optimization", "Ongoing", "Performance tuning, ML pricing, fraud detection", "Production learnings"],
]

phase_table = create_section_table(phases,
    col_widths=[35*mm, 28*mm, 65*mm, 40*mm])
story.append(phase_table)
story.append(Paragraph("Table 12.1: Implementation Phase Timeline", styles['Caption']))

story.append(Paragraph("12.2 Success Criteria and Milestones", styles['SubsectionHeading']))

add_paragraph(
    "Each phase includes defined success criteria that must be met before progression to subsequent phases. "
    "Gate reviews involving stakeholders from engineering, product, finance, and legal assess completion "
    "against criteria, identify risks, and approve advancement. Criteria combine functional completeness "
    "(all specified features working correctly), non-functional requirements (performance, availability, "
    "security benchmarks met), and operational readiness (documentation complete, support trained, runbooks "
    "validated). Phase gates prevent accumulation of technical debt and ensure organizational readiness "
    "for capabilities being delivered."
)

milestones = [
    [Paragraph("<b>Milestone</b>", styles['TableHeader']),
     Paragraph("<b>Target Date</b>", styles['TableHeader']),
     Paragraph("<b>Criteria</b>", styles['TableHeader']),
     Paragraph("<b>Sign-off</b>", styles['TableHeader'])],
    ["LMS Alpha", "Week 4", "Core entitlement flow working end-to-end", "Engineering Lead"],
    ["Billing Beta", "Week 10", "Can invoice and collect payment for test customers", "Product + Finance"],
    ["GA Release", "Week 24", "All tiers available for new customer signup", "Executive Sponsor"],
    ["Enterprise GA", "Week 32", "MSSP + Gov features certified for production", "Security + Legal"],
    ["On-Premise GA", "Week 40", "Air-gap licensing validated with pilot customer", "Field Engineering"],
    ["Compliance Cert", "Week 52", "SOC 2 + ISO 27001 surveillance complete", "Compliance Officer"],
]

milestone_table = create_section_table(milestones,
    col_widths=[35*mm, 28*mm, 65*mm, 35*mm])
story.append(milestone_table)
story.append(Paragraph("Table 12.2: Key Milestones and Success Criteria", styles['Caption']))

story.append(Spacer(1, 12*mm))

# Final summary paragraph
add_paragraph(
    "This Billing and Licensing Architecture establishes the foundation for sustainable commercial operations "
    "of the CyberSOC Platform across diverse customer segments and deployment models. The six-tier structure "
    "provides clear value propositions for each target audience while the technical implementation ensures "
    "scalable, compliant, and user-friendly license management. Integration with the Admin Interface creates "
    "unified operational control, reducing overhead while improving visibility into commercial health. Regular "
    "review and evolution of this architecture will ensure continued alignment with market dynamics, customer "
    "needs, and regulatory requirements as the CyberSOC Platform grows and matures in the marketplace.",
    'BodyNoIndent'
)

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# BUILD PDF
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
print(f"Building PDF: {output_path}")
doc.build(story)
print(f"Successfully generated: {output_path}")
print(f"File size: {os.path.getsize(output_path)} bytes")
