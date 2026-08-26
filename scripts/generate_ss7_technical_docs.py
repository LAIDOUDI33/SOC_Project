#!/usr/bin/env python3
"""
Djezzy SOC Platform - SS7 Security Module Technical Documentation Generator
Generates comprehensive PDF documentation for the SS7/Diameter security monitoring module.
"""

import os
import re
import hashlib
from datetime import datetime
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm, cm, inch
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, ListFlowable, ListItem, KeepTogether,
    HRFlowable, CondPageBreak
)
from reportlab.platypus.tableofcontents import TableOfContents
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily

# ============================================================================
# FONT REGISTRATION
# ============================================================================
FONT_DIR = '/usr/share/fonts'

# Register Chinese fonts
pdfmetrics.registerFont(TTFont('NotoSerifSC', f'{FONT_DIR}/truetype/noto-serif-sc/NotoSerifSC-Regular.ttf'))
pdfmetrics.registerFont(TTFont('NotoSerifSC-Bold', f'{FONT_DIR}/truetype/noto-serif-sc/NotoSerifSC-Bold.ttf'))
registerFontFamily('NotoSerifSC', normal='NotoSerifSC', bold='NotoSerifSC-Bold')

# Register fallback fonts
pdfmetrics.registerFont(TTFont('LiberationSans', f'{FONT_DIR}/truetype/liberation/LiberationSans-Regular.ttf'))
pdfmetrics.registerFont(TTFont('LiberationSans-Bold', f'{FONT_DIR}/truetype/liberation/LiberationSans-Bold.ttf'))
pdfmetrics.registerFont(TTFont('LiberationMono', f'{FONT_DIR}/truetype/dejavu/DejaVuSansMono.ttf'))

# Register fonts for body text (using LiberationSans for reliability)
pdfmetrics.registerFont(TTFont('BodyFont', f'{FONT_DIR}/truetype/chinese/LiberationSans-Regular.ttf'))
pdfmetrics.registerFont(TTFont('BodyFontBold', f'{FONT_DIR}/truetype/liberation/LiberationSans-Bold.ttf'))

# ============================================================================
# CASCADE PALETTE (Auto-generated)
# ============================================================================
PAGE_BG       = colors.HexColor('#f4f5f5')
SECTION_BG    = colors.HexColor('#edeeef')
CARD_BG       = colors.HexColor('#e4e7e9')
TABLE_STRIPE  = colors.HexColor('#ecedee')
HEADER_FILL   = colors.HexColor('#384a53')
COVER_BLOCK   = colors.HexColor('#5c737f')
BORDER        = colors.HexColor('#c4d2d9')
ICON          = colors.HexColor('#417a97')
ACCENT        = colors.HexColor('#2f95c7')
ACCENT_2      = colors.HexColor('#d37353')
TEXT_PRIMARY  = colors.HexColor('#181a1b')
TEXT_MUTED    = colors.HexColor('#7e8588')
SEM_SUCCESS   = colors.HexColor('#3b8253')
SEM_WARNING   = colors.HexColor('#988051')
SEM_ERROR     = colors.HexColor('#914c46')
SEM_INFO      = colors.HexColor('#486888')

TABLE_HEADER_COLOR = HEADER_FILL
TABLE_HEADER_TEXT = colors.white

# ============================================================================
# CUSTOM STYLES
# ============================================================================
styles = getSampleStyleSheet()

styles.add(ParagraphStyle(
    name='DocTitle',
    fontName='NotoSerifSC-Bold',
    fontSize=28,
    leading=34,
    alignment=TA_CENTER,
    textColor=TEXT_PRIMARY,
    spaceAfter=12
))

styles.add(ParagraphStyle(
    name='DocSubtitle',
    fontName='NotoSerifSC',
    fontSize=14,
    leading=18,
    alignment=TA_CENTER,
    textColor=TEXT_MUTED,
    spaceAfter=30
))

styles.add(ParagraphStyle(
    name='ChapterTitle',
    fontName='NotoSerifSC-Bold',
    fontSize=20,
    leading=26,
    textColor=HEADER_FILL,
    spaceBefore=20,
    spaceAfter=12,
    borderPadding=(0, 0, 8, 0)
))

styles.add(ParagraphStyle(
    name='SectionHeading',
    fontName='NotoSerifSC-Bold',
    fontSize=14,
    leading=18,
    textColor=HEADER_FILL,
    spaceBefore=16,
    spaceAfter=8
))

styles.add(ParagraphStyle(
    name='SubsectionHeading',
    fontName='BodyFontBold',
    fontSize=12,
    leading=15,
    textColor=ICON,
    spaceBefore=12,
    spaceAfter=6
))

styles.add(ParagraphStyle(
    name='DocBody',
    fontName='BodyFont',
    fontSize=10,
    leading=15,
    alignment=TA_JUSTIFY,
    textColor=TEXT_PRIMARY,
    spaceBefore=4,
    spaceAfter=8,
    firstLineIndent=18
))

styles.add(ParagraphStyle(
    name='DocBodyNoIndent',
    fontName='BodyFont',
    fontSize=10,
    leading=15,
    alignment=TA_JUSTIFY,
    textColor=TEXT_PRIMARY,
    spaceBefore=4,
    spaceAfter=8
))

styles.add(ParagraphStyle(
    name='CodeBlock',
    fontName='LiberationMono',
    fontSize=8,
    leading=11,
    textColor=TEXT_PRIMARY,
    backColor=CARD_BG,
    borderColor=BORDER,
    borderWidth=0.5,
    borderPadding=8,
    leftIndent=10,
    rightIndent=10,
    spaceBefore=6,
    spaceAfter=6
))

styles.add(ParagraphStyle(
    name='Callout',
    fontName='NotoSerifSC',
    fontSize=10,
    leading=14,
    textColor=SEM_INFO,
    leftIndent=20,
    rightIndent=20,
    spaceBefore=10,
    spaceAfter=10,
    borderColor=SEM_INFO,
    borderWidth=1,
    borderPadding=10
))

styles.add(ParagraphStyle(
    name='Warning',
    fontName='BodyFontBold',
    fontSize=10,
    leading=14,
    textColor=SEM_ERROR,
    leftIndent=20,
    rightIndent=20,
    spaceBefore=10,
    spaceAfter=10,
    borderColor=SEM_ERROR,
    borderWidth=1,
    borderPadding=10
))

styles.add(ParagraphStyle(
    name='TOCHeading',
    fontName='NotoSerifSC-Bold',
    fontSize=16,
    leading=20,
    textColor=HEADER_FILL,
    spaceBefore=20,
    spaceAfter=12
))

toc_level0 = ParagraphStyle(
    name='TOCLevel0',
    fontName='BodyFontBold',
    fontSize=11,
    leading=16,
    leftIndent=0,
    textColor=TEXT_PRIMARY
)

toc_level1 = ParagraphStyle(
    name='TOCLevel1',
    fontName='BodyFont',
    fontSize=10,
    leading=14,
    leftIndent=20,
    textColor=TEXT_MUTED
)

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def add_heading(text, style, level=0):
    """Create heading with bookmark for TOC."""
    key = f'h_{hashlib.md5(text.encode()).hexdigest()[:8]}'
    p = Paragraph(f'<a name="{key}"/>{text}', style)
    p.bookmark_name = key
    p.bookmark_level = level
    p.bookmark_text = text
    p.bookmark_key = key
    return p

def create_table(data, col_widths=None, header_rows=1):
    """Create a styled table."""
    table = Table(data, colWidths=col_widths, repeatRows=header_rows)
    
    style_commands = [
        ('BACKGROUND', (0, 0), (-1, header_rows-1), TABLE_HEADER_COLOR),
        ('TEXTCOLOR', (0, 0), (-1, header_rows-1), TABLE_HEADER_TEXT),
        ('FONTNAME', (0, 0), (-1, header_rows-1), 'BodyFontBold'),
        ('FONTSIZE', (0, 0), (-1, header_rows-1), 9),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('FONTNAME', (0, header_rows), (-1, -1), 'BodyFont'),
        ('FONTSIZE', (0, header_rows), (-1, -1), 8),
        ('TEXTCOLOR', (0, header_rows), (-1, -1), TEXT_PRIMARY),
        ('ROWBACKGROUNDS', (0, header_rows), (-1, -1), [colors.white, TABLE_STRIPE]),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
        ('LINEBELOW', (0, header_rows-1), (-1, header_rows-1), 1.5, HEADER_FILL),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]
    
    table.setStyle(TableStyle(style_commands))
    return table

def create_info_box(title, content, box_type='info'):
    """Create an information callout box."""
    if box_type == 'warning':
        bg_color = colors.HexColor('#fdf3f2')
        border_color = SEM_ERROR
        title_style = ParagraphStyle('WarnTitle', fontName='BodyFontBold', fontSize=10, textColor=SEM_ERROR)
        body_style = ParagraphStyle('WarnBody', fontName='BodyFont', fontSize=9, textColor=TEXT_PRIMARY, leading=13)
    elif box_type == 'success':
        bg_color = colors.HexColor('#f4faf6')
        border_color = SEM_SUCCESS
        title_style = ParagraphStyle('SuccessTitle', fontName='BodyFontBold', fontSize=10, textColor=SEM_SUCCESS)
        body_style = ParagraphStyle('SuccessBody', fontName='BodyFont', fontSize=9, textColor=TEXT_PRIMARY, leading=13)
    else:
        bg_color = colors.HexColor('#f4f8fb')
        border_color = SEM_INFO
        title_style = ParagraphStyle('InfoTitle', fontName='BodyFontBold', fontSize=10, textColor=SEM_INFO)
        body_style = ParagraphStyle('InfoBody', fontName='BodyFont', fontSize=9, textColor=TEXT_PRIMARY, leading=13)
    
    data = [
        [Paragraph(f'<b>{title}</b>', title_style)],
        [Paragraph(content, body_style)]
    ]
    
    table = Table(data, colWidths=[450])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), bg_color),
        ('BOX', (0, 0), (-1, -1), 1.5, border_color),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 12),
        ('RIGHTPADDING', (0, 0), (-1, -1), 12),
    ]))
    return table

def page_template(canvas, doc):
    """Add header/footer to each page."""
    canvas.saveState()
    
    canvas.setFont('LiberationSans', 8)
    canvas.setFillColor(TEXT_MUTED)
    canvas.drawString(A4[0]/2 - 80, 25*mm, "Djezzy SOC Platform | SS7 Security Module")
    canvas.drawRightString(A4[0] - 20*mm, 25*mm, f"Page {doc.page}")
    
    canvas.setStrokeColor(BORDER)
    canvas.setLineWidth(0.5)
    canvas.line(20*mm, A4[1] - 15*mm, A4[0] - 20*mm, A4[1] - 15*mm)
    
    canvas.restoreState()

# ============================================================================
# DOCUMENT CONTENT BUILDER
# ============================================================================

def build_cover_page():
    """Build cover page elements."""
    story = []
    
    story.append(Spacer(1, 60))
    
    story.append(Paragraph("Djezzy National SOC Platform", styles['DocTitle']))
    story.append(Spacer(1, 10))
    
    story.append(Paragraph(
        "SS7 Security Module",
        ParagraphStyle('MainSubtitle', fontName='NotoSerifSC-Bold', fontSize=22, leading=28, alignment=TA_CENTER, textColor=ACCENT)
    ))
    
    story.append(Spacer(1, 15))
    story.append(Paragraph("Technical Implementation & Operations Documentation", styles['DocSubtitle']))
    story.append(Spacer(1, 40))
    
    doc_info = [
        ['Document Classification', 'Internal Operations'],
        ['Version', '2.0'],
        ['Date', datetime.now().strftime('%Y-%m-%d')],
        ['Status', 'Production Ready'],
        ['Compliance', 'ANRT / ITU-T Q.700 Series'],
    ]
    
    info_table = Table(doc_info, colWidths=[150, 200])
    info_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'BodyFontBold'),
        ('FONTNAME', (1, 0), (1, -1), 'BodyFont'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('TEXTCOLOR', (0, 0), (-1, -1), TEXT_PRIMARY),
        ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
        ('ALIGN', (1, 0), (1, -1), 'LEFT'),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LINEBELOW', (0, 0), (-1, -2), 0.5, BORDER),
    ]))
    story.append(info_table)
    story.append(Spacer(1, 60))
    
    story.append(Paragraph(
        "<i>This document contains proprietary information related to Djezzy's "
        "telecommunications security infrastructure. Distribution is limited to "
        "authorized personnel with operational need-to-know.</i>",
        ParagraphStyle('ConfNotice', fontName='BodyFont', fontSize=9, leading=13, alignment=TA_CENTER, textColor=TEXT_MUTED)
    ))
    
    story.append(PageBreak())
    return story

def build_toc():
    """Build table of contents."""
    story = []
    story.append(Paragraph("Table of Contents", styles['TOCHeading']))
    story.append(Spacer(1, 12))
    
    toc = TableOfContents()
    toc.levelStyles = [toc_level0, toc_level1]
    story.append(toc)
    story.append(PageBreak())
    return story

def build_executive_summary():
    """Build executive summary chapter."""
    story = []
    
    story.append(add_heading("1. Executive Summary", styles['ChapterTitle'], level=0))
    story.append(HRFlowable(width="100%", thickness=1, color=HEADER_FILL, spaceAfter=12))
    
    story.append(Paragraph(
        "The SS7 (Signaling System No. 7) Security Module represents a critical enhancement "
        "to the Djezzy National Security Operations Center (SOC) platform, providing dedicated "
        "monitoring, detection, and response capabilities for telecommunications signaling "
        "infrastructure. As mobile networks increasingly face sophisticated attacks targeting "
        "the SS7 protocol stack, this module delivers enterprise-grade protection against "
        "location tracking, fraud interception, and signaling-based denial-of-service threats.",
        styles['DocBody']
    ))
    
    story.append(Paragraph(
        "This documentation provides comprehensive technical specifications for implementing, "
        "operating, and maintaining the complete SS7 security monitoring solution within Djezzy's "
        "on-premises infrastructure. The module integrates seamlessly with existing SOC components "
        "including Wazuh SIEM, TheHive case management, Kafka event streaming, and Elasticsearch "
        "log aggregation, creating a unified defense posture across both IP and signaling domains.",
        styles['DocBody']
    ))
    
    story.append(add_heading("1.1 Strategic Objectives", styles['SectionHeading']))
    
    objectives_data = [
        ['Objective', 'Description', 'Priority'],
        ['Signaling Visibility', 'Complete capture and normalization of SS7/MAP/ISUP/Diameter messages from STPs and HLR/VLR nodes', 'Critical'],
        ['Attack Detection', 'Real-time identification of location tracking, IRSF fraud, USSD abuse, and SMS interception patterns', 'Critical'],
        ['Regulatory Compliance', 'Automated ANRT reporting, audit trail maintenance, and lawful intercept support', 'High'],
        ['Active Response', 'Automated blocking rules, rate limiting, and fraud team notification integration', 'High'],
        ['Operational Efficiency', 'Grafana dashboards, analyst playbooks, and streamlined investigation workflows', 'Medium'],
    ]
    
    story.append(create_table(objectives_data, col_widths=[100, 280, 60]))
    story.append(Spacer(1, 12))
    
    story.append(add_heading("1.2 Document Scope", styles['SectionHeading']))
    
    story.append(Paragraph(
        "This technical documentation covers all aspects of the SS7 Security Module including "
        "three core services (ss7-collector, ss7-analyzer, diameter-monitor), detection rule "
        "specifications, Kafka topic schemas, Elasticsearch index templates, Grafana dashboard "
        "configurations, deployment procedures, operations guidelines, and compliance mappings. "
        "The document is intended for security engineers, network architects, SOC analysts, and "
        "compliance officers responsible for telecommunications security at Djezzy.",
        styles['DocBody']
    ))
    
    story.append(create_info_box(
        "Implementation Note",
        "The SS7 module requires dedicated hardware resources (16+ vCPU, 64GB RAM, 2TB NVMe) "
        "and network mirror access from Signal Transfer Points (STPs). Ensure infrastructure "
        "prerequisites are met before beginning deployment. Refer to Chapter 3 for complete "
        "hardware specifications and network requirements.",
        'info'
    ))
    
    story.append(PageBreak())
    return story

def build_architecture_chapter():
    """Build architecture overview chapter."""
    story = []
    
    story.append(add_heading("2. Architecture Overview", styles['ChapterTitle'], level=0))
    story.append(HRFlowable(width="100%", thickness=1, color=HEADER_FILL, spaceAfter=12))
    
    story.append(Paragraph(
        "The SS7 Security Module follows a microservices architecture pattern consistent with "
        "the broader Djezzy SOC platform design philosophy. Three specialized services handle "
        "distinct aspects of the signaling security pipeline: message collection, threat analysis, "
        "and Diameter/LTE interface monitoring. Each service operates as an independent Docker "
        "container with well-defined interfaces, enabling horizontal scaling and fault isolation.",
        styles['DocBody']
    ))
    
    story.append(add_heading("2.1 System Architecture", styles['SectionHeading']))
    
    arch_data = [
        ['Component', 'Technology Stack', 'Role', 'Network'],
        ['ss7-collector', 'Python 3.11 + Kamailio + libss7', 'SIGTRAN/M3UA capture, message normalization', 'soc-events'],
        ['ss7-analyzer', 'Python 3.11 + Scikit-learn', 'Rule engine, ML scoring, alert generation', 'soc-backend/soc-events'],
        ['diameter-monitor', 'Python 3.11 + pyDiameter', 'LTE/EPS S6a/S6d/Gx/Rx/Cx decoding', 'soc-events'],
        ['Kafka Cluster', 'Apache Kafka 3.x', 'Event streaming, buffer layer', 'soc-events'],
        ['Elasticsearch', 'OpenSearch 2.x', 'Indexing, search, retention', 'soc-backend'],
        ['TheHive', 'TheHive 5.x', 'Case management, investigation tracking', 'soc-backend'],
        ['Grafana', 'Grafana 10.x', 'Visualization, dashboards, alerting', 'soc-monitoring'],
    ]
    
    story.append(create_table(arch_data, col_widths=[85, 120, 170, 70]))
    story.append(Spacer(1, 12))
    
    story.append(add_heading("2.2 Data Flow Architecture", styles['SectionHeading']))
    
    story.append(Paragraph(
        "The data flow through the SS7 module follows a structured pipeline designed for high "
        "throughput (target: 50K events per second) and low-latency detection (sub-second alerting). "
        "Raw signaling messages enter through the ss7-collector service via port mirroring from STPs, "
        "undergo protocol parsing and normalization, then stream into Kafka topics for distributed "
        "consumption by downstream analysis services.",
        styles['DocBody']
    ))
    
    flow_data = [
        ['Stage', 'Input', 'Processing', 'Output', 'Latency'],
        ['1. Capture', 'SCTP/M3UA packets', 'Protocol decode, PCAP write', 'Normalized JSON', '<10ms'],
        ['2. Buffer', 'JSON messages', 'Kafka partitioning, replication', 'Kafka topics', '<50ms'],
        ['3. Analyze', 'Kafka streams', 'Rule matching, ML scoring', 'Alerts, scores', '<500ms'],
        ['4. Store', 'Alerts, raw events', 'Elasticsearch indexing', 'Searchable indices', '<2s'],
        ['5. Respond', 'High-severity alerts', 'Case creation, blocking', 'TheHive, firewall', '<5s'],
    ]
    
    story.append(create_table(flow_data, col_widths=[55, 90, 130, 90, 50]))
    story.append(Spacer(1, 12))
    
    story.append(add_heading("2.3 Network Integration Points", styles['SectionHeading']))
    
    story.append(Paragraph(
        "The SS7 module integrates with Djezzy's core network at multiple points to achieve "
        "comprehensive visibility. Primary data sources include Signal Transfer Points (STPs) "
        "for inter-network signaling, Home Location Registers (HLR) for subscriber database queries, "
        "Visitor Location Registers (VLR) for roaming subscriber tracking, and Mobile Switching "
        "Centers (MSC) for call setup telemetry. Network taps or SPAN ports provide passive "
        "monitoring capability without impacting production traffic.",
        styles['DocBody']
    ))
    
    network_data = [
        ['Source Node', 'Protocol', 'Port', 'Data Type', 'Volume Estimate'],
        ['STP Primary', 'M3UA/SCTP', '2904/2905', 'Inter-network MAP/ISUP', '15K msg/s'],
        ['STP Secondary', 'M3UA/SCTP', '2904/2905', 'Redundant path messages', '15K msg/s'],
        ['HLR', 'MAP', 'Internal', 'Subscriber queries, updates', '8K msg/s'],
        ['VLR', 'MAP', 'Internal', 'Location updates, roaming', '5K msg/s'],
        ['MSC', 'ISUP/TUP', 'Internal', 'Call setup, teardown', '7K msg/s'],
        ['HSS (LTE)', 'Diameter', '3868', 'S6a authentication', '3K msg/s'],
        ['PCRF', 'Diameter', '3868', 'Gx/Rx policy', '2K msg/s'],
    ]
    
    story.append(create_table(network_data, col_widths=[75, 70, 50, 140, 80]))
    story.append(Spacer(1, 12))
    
    story.append(create_info_box(
        "Network Security Requirement",
        "All SS7 monitoring interfaces MUST be deployed on isolated VLANs with strict "
        "access controls. The collector service should receive only mirrored traffic (RX-only) "
        "to prevent any possibility of injected packets affecting production signaling. "
        "Refer to the network policies in Appendix A for detailed ACL configurations.",
        'warning'
    ))
    
    story.append(PageBreak())
    return story

def build_services_chapter():
    """Build service specifications chapter."""
    story = []
    
    story.append(add_heading("3. Service Specifications", styles['ChapterTitle'], level=0))
    story.append(HRFlowable(width="100%", thickness=1, color=HEADER_FILL, spaceAfter=12))
    
    story.append(Paragraph(
        "This chapter provides detailed technical specifications for each service in the SS7 "
        "Security Module. Each service is designed as a containerized microservice with explicit "
        "configuration parameters, resource allocations, and operational characteristics. Services "
        "communicate through well-defined interfaces using Apache Kafka for asynchronous messaging "
        "and REST APIs for synchronous management operations.",
        styles['DocBody']
    ))
    
    # Service 1: SS7 Collector
    story.append(add_heading("3.1 SS7 Collector Service (ss7-collector)", styles['SectionHeading']))
    
    story.append(Paragraph(
        "The ss7-collector service serves as the primary ingestion point for all SS7 and SIGTRAN "
        "traffic. Built on Python 3.11 with Kamailio integration for SIP/SS7 translation and libss7 "
        "for low-level MTP3 processing, this service captures signaling packets from mirrored network "
        "interfaces, decodes protocol layers (MTP2, MTP3, SCCP, TCAP, MAP, ISUP, CAP), normalizes "
        "message structures to JSON format, and publishes to Kafka topics for downstream analysis.",
        styles['DocBody']
    ))
    
    story.append(add_heading("3.1.1 Container Configuration", styles['SubsectionHeading']))
    
    collector_config = [
        ['Parameter', 'Value', 'Description'],
        ['Image', 'djezzy-soc/ss7-collector:latest', 'Custom-built image based on python:3.11-slim'],
        ['CPU Limit', '8.0 cores', 'Dedicated processing for packet decoding'],
        ['Memory Limit', '16 GB', 'Message buffering, state tables, PCAP buffers'],
        ['Storage Mount', '/var/capture/ss7 (2TB NVMe)', 'PCAP retention, rotated daily'],
        ['Config Volume', '/etc/ss7-collector', 'Rule files, GT translations, whitelists'],
        ['Listen Ports', '2904 (M3UA), 2905 (SCTP), 3868 (Diameter)', 'Passive monitoring only'],
        ['Network', 'soc-events (isolated)', 'No external connectivity required'],
        ['Health Check', ':7000/health', 'HTTP endpoint, 30s interval, 5s timeout'],
    ]
    
    story.append(create_table(collector_config, col_widths=[80, 130, 240]))
    story.append(Spacer(1, 10))
    
    story.append(add_heading("3.1.2 Environment Variables", styles['SubsectionHeading']))
    
    env_data = [
        ['Variable', 'Required', 'Default', 'Description'],
        ['SS7_LISTEN_INTERFACE', 'Yes', 'eth0', 'Network interface for packet capture'],
        ['SS7_M3UA_PORT', 'Yes', '2904', 'M3UA (MTP3 User Adaptation) port'],
        ['SS7_SCTP_PORT', 'Yes', '2905', 'SCTP transport layer port'],
        ['DIAMETER_PORT', 'No', '3868', 'Diameter protocol listener port'],
        ['KAFKA_BOOTSTRAP_SERVERS', 'Yes', '-', 'Comma-separated broker list'],
        ['OUTPUT_TOPIC', 'Yes', 'ss7-raw-events', 'Primary Kafka output topic'],
        ['PCAP_RETENTION_DAYS', 'No', '30', 'Local PCAP file retention period'],
        ['MESSAGE_BUFFER_SIZE', 'No', '100000', 'In-memory message buffer capacity'],
        ['DEBUG_LOG_LEVEL', 'No', 'INFO', 'Logging verbosity (DEBUG/INFO/WARN/ERROR)'],
    ]
    
    story.append(create_table(env_data, col_widths=[120, 50, 80, 200]))
    story.append(Spacer(1, 10))
    
    # Service 2: SS7 Analyzer
    story.append(add_heading("3.2 SS7 Analyzer Service (ss7-analyzer)", styles['SectionHeading']))
    
    story.append(Paragraph(
        "The ss7-analyzer service performs real-time threat detection on normalized SS7 messages "
        "consumed from Kafka. It implements a multi-layer detection engine combining signature-based "
        "rule matching (YAML-configurable), behavioral anomaly detection (Scikit-learn models), and "
        "correlation analysis across message streams. Detected threats generate alerts with risk scores, "
        "MITRE ATT&CK technique classifications, and automated response recommendations.",
        styles['DocBody']
    ))
    
    story.append(add_heading("3.2.1 Detection Engine Architecture", styles['SubsectionHeading']))
    
    engine_data = [
        ['Layer', 'Technique', 'Detection Capability', 'Latency'],
        ['Layer 1 - Signature', 'Pattern matching (YAML rules)', 'Known attack signatures, fraud patterns', '<10ms/msg'],
        ['Layer 2 - Behavioral', 'Statistical profiling, ML models', 'Anomalous query volumes, unusual patterns', '<50ms/window'],
        ['Layer 3 - Correlation', 'Temporal/spatial correlation', 'Multi-stage attack sequences', '<500ms/correlation'],
        ['Layer 4 - Contextual', 'Threat intelligence enrichment', 'IOC matching, reputation scoring', '<2s/enrichment'],
    ]
    
    story.append(create_table(engine_data, col_widths=[80, 120, 160, 80]))
    story.append(Spacer(1, 10))
    
    story.append(add_heading("3.2.2 Alert Classification Schema", styles['SubsectionHeading']))
    
    alert_data = [
        ['Severity', 'Criteria', 'Auto-Response', 'Notification'],
        ['CRITICAL', 'Confirmed attack pattern, financial impact >$10K/hour', 'Block source GT, create P1 case', 'Fraud team + SOC manager + on-call'],
        ['HIGH', 'Strong indicator, potential privacy violation', 'Rate limit source, create P2 case', 'SOC analysts + shift lead'],
        ['MEDIUM', 'Suspicious pattern, requires investigation', 'Log for forensics, flag analyst', 'SOC analyst queue'],
        ['LOW', 'Informational anomaly, baseline deviation', 'Metric collection only', 'Dashboard update only'],
    ]
    
    story.append(create_table(alert_data, col_widths=[60, 180, 120, 100]))
    story.append(Spacer(1, 10))
    
    # Service 3: Diameter Monitor
    story.append(add_heading("3.3 Diameter Monitor Service (diameter-monitor)", styles['SectionHeading']))
    
    story.append(Paragraph(
        "The diameter-monitor service extends SS7 security coverage to LTE/EPS (Evolved Packet System) "
        "signaling interfaces. As Djezzy deploys 4G/LTE infrastructure, Diameter-based protocols replace "
        "traditional SS7 for authentication (S6a), subscriber data (S6d), policy control (Gx/Rx), and "
        "interconnect (Cx). This service decodes AVP (Attribute-Value Pair) structures, monitors for "
        "LTE-specific attacks including IMSI catchers, fake base station detection, and subscriber data "
        "exfiltration attempts.",
        styles['DocBody']
    ))
    
    diameter_interfaces = [
        ['Interface', 'Application', 'Monitored Operations', 'Attack Vectors'],
        ['S6a', 'Home Subscriber Server (HSS)', 'Authentication, location update, subscriber data', 'IMSI catcher, tracking, data theft'],
        ['S6d', 'Subscription Data Repository', 'Profile retrieval, service authorization', 'Unauthorized profile access'],
        ['Gx', 'Policy and Charging Rules (PCRF)', 'QoS policy installation, charging rules', 'Policy injection, free data fraud'],
        ['Rx', 'Application Function (AF)', 'Session binding, media authorization', 'Session hijacking, bypass'],
        ['Cx', 'Call Session Control (IMS)', 'User registration, route lookup', 'Registration hijacking, intercept'],
    ]
    
    story.append(create_table(diameter_interfaces, col_widths=[45, 130, 150, 135]))
    story.append(Spacer(1, 12))
    
    story.append(create_info_box(
        "Scaling Recommendation",
        "For production deployments handling peak traffic (>40K EPS), deploy multiple instances "
        "of each service behind Kafka consumer groups. The ss7-analyzer benefits most from "
        "horizontal scaling as CPU-bound rule evaluation can be partitioned by message type "
        "or source GT range. Target 3-5 analyzer instances for full coverage.",
        'success'
    ))
    
    story.append(PageBreak())
    return story

def build_detection_rules_chapter():
    """Build detection rules reference chapter."""
    story = []
    
    story.append(add_heading("4. Detection Rules Reference", styles['ChapterTitle'], level=0))
    story.append(HRFlowable(width="100%", thickness=1, color=HEADER_FILL, spaceAfter=12))
    
    story.append(Paragraph(
        "The SS7 Security Module implements a comprehensive rule set designed to detect known attack "
        "patterns specific to telecommunications signaling infrastructure. Rules are defined in YAML "
        "format for human readability and rapid modification, then compiled to optimized internal "
        "structures at service startup. This chapter catalogs all production rules organized by "
        "attack category, with technical details on detection logic, threshold configuration, and "
        "response actions.",
        styles['DocBody']
    ))
    
    # Rule Set 1: Location Tracking
    story.append(add_heading("4.1 Location Tracking Detection", styles['SectionHeading']))
    
    story.append(Paragraph(
        "Location tracking attacks exploit the Send Routing Info For SM (SRI4SM) MAP operation to "
        "determine a subscriber's current serving MSC/VLR address without authorization. Attackers "
        "may be stalkers, private investigators, or state actors targeting individuals of interest. "
        "The detection rule identifies suspicious query patterns including excessive queries to a "
        "single MSISDN, queries from untrusted Global Titles, and timing correlations suggesting "
        "tracking behavior rather than legitimate SMS delivery attempts.",
        styles['DocBody']
    ))
    
    loc_rule_data = [
        ['Parameter', 'Configuration', 'Rationale'],
        ['Rule ID', 'SS7_LOCATION_TRACKING_SUSPICIOUS', 'Unique identifier for alert correlation'],
        ['Message Type', 'MAP_SEND_ROUTING_INFO_FOR_SM', 'Primary target operation'],
        ['Threshold Count', '10 requests', 'Per-subscriber, per 60-second window'],
        ['Aggregation Key', 'source_global_title + imsi_prefix', 'Group by originator'],
        ['Severity', 'HIGH', 'Privacy violation risk'],
        ['MITRE Technique', 'T1419 (SIM Card Swap)', 'ATT&CK framework mapping'],
        ['Action 1', 'create_thehive_case', 'Automatic incident creation'],
        ['Action 2', 'send_alert_wazuh', 'SIEM notification'],
        ['Action 3', 'block_source_gt_if_repeated', 'Conditional blocking (>50/hour)'],
    ]
    
    story.append(create_table(loc_rule_data, col_widths=[90, 150, 210]))
    story.append(Spacer(1, 10))
    
    # Rule Set 2: IRSF Fraud
    story.append(add_heading("4.2 International Revenue Share Fraud (IRSF)", styles['SectionHeading']))
    
    story.append(Paragraph(
        "IRSF represents one of the most financially damaging telecom fraud types, costing the global "
        "industry billions annually. Attackers compromise PBX systems or exploit weak SIP passwords "
        "to generate high-volume international calls to premium-rate numbers they control, sharing "
        "revenue with complicit destination carriers. The SS7 module detects IRSF by analyzing ISUP "
        "Initial Address Messages (IAM) for high-risk destination patterns, short-duration calls "
        "(characteristic of revenue-generation rather than conversation), and abnormal calling patterns.",
        styles['DocBody']
    ))
    
    irsf_rule_data = [
        ['Parameter', 'Configuration', 'Rationale'],
        ['Rule ID', 'SS7_IRSF_PATTERN_DETECTED', 'Fraud-specific identifier'],
        ['Message Type', 'ISUP_IAM (Initial Address Message)', 'Call setup initiation'],
        ['Destination Filter', 'high_risk_countries list', 'Configurable country blacklist'],
        ['Duration Pattern', 'short_calls (<10 seconds)', 'Revenue generation signature'],
        ['Calling Number Type', 'premium_rate detection', 'Source number analysis'],
        ['Volume Threshold', '100 calls / 300 seconds', 'Bulk fraud detection'],
        ['Severity', 'CRITICAL', 'Financial impact classification'],
        ['Actions', 'P1 case, fraud notify, block, CDR report', 'Full response chain'],
    ]
    
    story.append(create_table(irsf_rule_data, col_widths=[100, 145, 205]))
    story.append(Spacer(1, 10))
    
    # Rule Set 3: USSD Attacks
    story.append(add_heading("4.3 USSD Brute Force Detection", styles['SectionHeading']))
    
    story.append(Paragraph(
        "Unstructured Supplementary Service Data (USSD) sessions enable interactive services such as "
        "balance inquiries, mobile money transfers, and account management. Attackers may brute-force "
        "USSD codes to enumerate valid accounts, probe service availability, or trigger unintended "
        "operations. The detection rule monitors for excessive USSD request rates per MSISDN, focusing "
        "on sensitive service codes (*100# balance, *101# transfer, *123# services) that could indicate "
        "account enumeration or service abuse attempts.",
        styles['DocBody']
    ))
    
    ussd_rule_data = [
        ['Parameter', 'Configuration', 'Notes'],
        ['Rule ID', 'SS7_USSD_BRUTE_FORCE', 'USSD-specific detection'],
        ['Message Type', 'MAP_PROCESS_UNSTRUCTURED_SS_REQUEST', 'USSD invocation'],
        ['Monitored Codes', '*100#, *101#, *123#, *124#, *150#', 'Sensitive service codes'],
        ['Threshold', '30 requests / 60 seconds', 'Per-MSISDN rate limit'],
        ['Severity', 'MEDIUM', 'Service abuse, not critical infrastructure'],
        ['Actions', 'rate_limit_msisdn, alert_analyst, log_forensics', 'Progressive response'],
    ]
    
    story.append(create_table(ussd_rule_data, col_widths=[110, 165, 175]))
    story.append(Spacer(1, 10))
    
    # Rule Set 4: SMS Interception
    story.append(add_heading("4.4 SMS Interception Indicators", styles['SectionHeading']))
    
    story.append(Paragraph(
        "SMS interception attacks forward victim messages to attacker-controlled destinations, enabling "
        "content theft (OTP codes, banking alerts) and surveillance. Detection focuses on the MAP Forward "
        "Short Message operation, identifying suspicious forwarding patterns including multiple distinct "
        "destinations, international high-risk countries, business-hours-only activity (suggesting "
        "automated systems), and content matching sensitive patterns like OTP formats or banking keywords.",
        styles['DocBody']
    ))
    
    sms_rule_data = [
        ['Indicator', 'Threshold', 'Detection Logic'],
        ['Multiple Destinations', '>5 unique in 300s', 'Distribution attack pattern'],
        ['International High-Risk', 'Country code match', 'Geographic risk scoring'],
        ['Timing Anomaly', 'Business hours only', 'Automated system indicator'],
        ['Content Match', 'OTP/banking regex', 'Payload inspection (privacy note)'],
        ['Severity', 'HIGH', 'Subscriber privacy violation'],
        ['MITRE Technique', 'T1421 (SMS Interception)', 'Framework alignment'],
    ]
    
    story.append(create_table(sms_rule_data, col_widths=[110, 115, 225]))
    story.append(Spacer(1, 12))
    
    story.append(create_info_box(
        "Privacy Consideration for Content Inspection",
        "SMS content inspection for OTP/banking pattern matching requires careful legal review. "
        "In Algeria, ANRT regulations permit fraud-related content analysis but mandate encryption "
        "at rest and strict access logging. Implement content scanning only after obtaining proper "
        "legal authorization and ensure all inspected payloads are encrypted in Elasticsearch.",
        'warning'
    ))
    
    story.append(PageBreak())
    return story

def build_integration_chapter():
    """Build integration guide chapter."""
    story = []
    
    story.append(add_heading("5. Integration Guide", styles['ChapterTitle'], level=0))
    story.append(HRFlowable(width="100%", thickness=1, color=HEADER_FILL, spaceAfter=12))
    
    story.append(Paragraph(
        "The SS7 Security Module integrates with multiple components of the Djezzy SOC platform to "
        "provide end-to-end security monitoring capabilities. This chapter details the technical "
        "integration points including Kafka topic schemas for event streaming, Elasticsearch index "
        "templates for log storage and search, Grafana dashboard configurations for visualization, "
        "and TheHive API integrations for automated case management.",
        styles['DocBody']
    ))
    
    # Kafka Integration
    story.append(add_heading("5.1 Kafka Topic Configuration", styles['SectionHeading']))
    
    story.append(Paragraph(
        "Apache Kafka serves as the central event streaming backbone for the SS7 module, providing "
        "durable buffering, horizontal scalability, and replay capability for debugging. Four dedicated "
        "topics handle different message types with partitioning strategies optimized for throughput "
        "and consumer parallelism. All topics use replication factor 3 for fault tolerance across "
        "the three-broker Kafka cluster.",
        styles['DocBody']
    ))
    
    kafka_topics = [
        ['Topic Name', 'Partitions', 'Replication', 'Retention', 'Purpose'],
        ['ss7-raw-events', '12', '3', '7 days', 'Normalized SS7/Diameter messages from collector'],
        ['ss7-alerts', '6', '3', '30 days', 'Detected threats with scores and context'],
        ['diameter-events', '6', '3', '7 days', 'Decoded LTE/EPS Diameter AVPs'],
        ['ss7-fraud-indicators', '4', '3', '90 days', 'Aggregated fraud metrics for reporting'],
    ]
    
    story.append(create_table(kafka_topics, col_widths=[95, 55, 55, 55, 195]))
    story.append(Spacer(1, 10))
    
    # Elasticsearch Integration
    story.append(add_heading("5.2 Elasticsearch Index Template", styles['SectionHeading']))
    
    story.append(Paragraph(
        "Elasticsearch (deployed as OpenSearch 2.x for on-premises compatibility) stores indexed "
        "SS7 events for search, analytics, and compliance retention. The index template defines field "
        "mappings optimized for signaling data types including keyword fields for exact-match lookups "
        "(GT, MSISDN, IMSI prefix), date fields for time-range queries, geo_point fields for location "
        "analysis, and float fields for machine learning risk scores.",
        styles['DocBody']
    ))
    
    es_fields = [
        ['Field Name', 'Type', 'Description', 'Use Case'],
        ['timestamp', 'date', 'Message reception time', 'Time-range queries, retention'],
        ['message_type', 'keyword', 'MAP/ISUP/Diameter operation', 'Filtering by protocol operation'],
        ['calling_party', 'keyword', 'Originating address (GT/MSISDN)', 'Source tracking, blacklists'],
        ['called_party', 'keyword', 'Destination address', 'Destination analysis'],
        ['imsi', 'keyword + text', 'Subscriber identity (partial match)', 'Subscriber correlation'],
        ['global_title', 'keyword', 'SS7 signaling point address', 'Network topology mapping'],
        ['risk_score', 'float', 'ML-generated threat score (0-100)', 'Prioritization, thresholding'],
        ['attack_category', 'keyword', 'Classification (fraud/tracking/DoS)', 'Dashboard filtering'],
        ['location_info', 'geo_point', 'VLR/MSC geographic coordinates', 'Geospatial visualization'],
        ['roaming_status', 'keyword', 'Home/Visitor/International Roaming', 'Roaming fraud detection'],
    ]
    
    story.append(create_table(es_fields, col_widths=[80, 70, 155, 125]))
    story.append(Spacer(1, 10))
    
    # Grafana Integration
    story.append(add_heading("5.3 Grafana Dashboard Configuration", styles['SectionHeading']))
    
    story.append(Paragraph(
        "Two primary Grafana dashboards provide real-time visibility into SS7 security posture. "
        "The SS7 Security Overview dashboard offers operational metrics including message volume by "
        "type, top alert sources, geographic distribution of threats, and active investigation counts. "
        "The IRSF Fraud Detection dashboard focuses specifically on revenue protection with high-risk "
        "destination rankings, call duration analysis, revenue-at-risk calculations, and blocking "
        "rule effectiveness metrics.",
        styles['DocBody']
    ))
    
    dashboard_panels = [
        ['Dashboard', 'Panel', 'Data Source', 'Visualization'],
        ['SS7 Security Overview', 'Messages/sec by Type', 'Elasticsearch (ss7-*)', 'Time series bar'],
        ['SS7 Security Overview', 'Top 10 Alert Sources (GT)', 'Elasticsearch (ss7-alerts)', 'Ranking table'],
        ['SS7 Security Overview', 'Geographic Threat Heatmap', 'Elasticsearch (geo_point)', 'World map'],
        ['SS7 Security Overview', 'Active TheHive Cases', 'TheHive API', 'Stat panel'],
        ['SS7 Security Overview', '24h Alert Timeline', 'Elasticsearch (ss7-alerts)', 'Timeline'],
        ['IRSF Fraud Detection', 'High-Risk Destinations', 'Elasticsearch (ss7-fraud)', 'Ranking table'],
        ['IRSF Fraud Detection', 'Call Duration Distribution', 'Elasticsearch (ss7-raw)', 'Histogram'],
        ['IRSF Fraud Detection', 'Revenue at Risk ($)', 'Prometheus (custom)', 'Gauge + trend'],
        ['IRSF Fraud Detection', 'Blocking Rule Effectiveness', 'Elasticsearch (ss7-alerts)', 'Stat + sparkline'],
    ]
    
    story.append(create_table(dashboard_panels, col_widths=[100, 120, 110, 100]))
    story.append(Spacer(1, 10))
    
    # TheHive Integration
    story.append(add_heading("5.4 TheHive Case Management Integration", styles['SectionHeading']))
    
    story.append(Paragraph(
        "The ss7-analyzer service automatically creates TheHive cases for HIGH and CRITICAL severity "
        "alerts, enabling structured investigation workflows, evidence attachment, and status tracking. "
        "Integration uses TheHive's REST API v1 with API key authentication, mapping SS7 alert fields "
        "to case custom fields for telecom-specific investigation context.",
        styles['DocBody']
    ))
    
    hive_mapping = [
        ['SS7 Alert Field', 'TheHive Case Field', 'Mapping Logic'],
        ['alert_id', 'case.tags[]', 'Tag: ss7-{rule_id}'],
        ['severity', 'case.severity', 'CRITICAL->2, HIGH->1, MEDIUM->0.5, LOW->0.2'],
        ['attack_category', 'case.title', 'Prefix: [{category}] {summary}'],
        ['source_global_title', 'case.customFields.source_gt', 'String field'],
        ['target_msisdn', 'case.customFields.target_subscriber', 'String field'],
        ['risk_score', 'case.customFields.ml_score', 'Float field (0-100)'],
        ['raw_message', 'case.observable[]', 'Type: other, value: JSON payload'],
        ['detection_rules[]', 'case.description', 'Formatted rule list'],
    ]
    
    story.append(create_table(hive_mapping, col_widths=[100, 120, 220]))
    story.append(Spacer(1, 12))
    
    story.append(create_info_box(
        "API Rate Limiting",
        "TheHive enforces API rate limits (default: 30 requests/second). During high-volume alert "
        "periods (e.g., detected attack campaigns), implement client-side batching with 5-second "
        "intervals between case creations. Queue overflow should log to Kafka dead-letter topic "
        "for later manual review rather than dropping alerts silently.",
        'info'
    ))
    
    story.append(PageBreak())
    return story

def build_deployment_chapter():
    """Build deployment procedures chapter."""
    story = []
    
    story.append(add_heading("6. Deployment Procedures", styles['ChapterTitle'], level=0))
    story.append(HRFlowable(width="100%", thickness=1, color=HEADER_FILL, spaceAfter=12))
    
    story.append(Paragraph(
        "Deploying the SS7 Security Module requires careful orchestration across network infrastructure, "
        "container orchestration, and security tooling integration. This chapter provides step-by-step "
        "procedures organized into three phases: passive monitoring setup (weeks 1-2), rule activation "
        "(weeks 3-4), and active response enablement (weeks 5-6). The phased approach allows baseline "
        "calibration, false-positive tuning, and gradual trust-building before automated actions affect "
        "production signaling.",
        styles['DocBody']
    ))
    
    # Phase 1
    story.append(add_heading("6.1 Phase 1: Passive Monitoring Setup (Weeks 1-2)", styles['SectionHeading']))
    
    story.append(add_heading("6.1.1 Network Tap Configuration", styles['SubsectionHeading']))
    
    story.append(Paragraph(
        "Before deploying the collector service, establish network visibility to SS7 traffic flows. "
        "Coordinate with network engineering to configure SPAN ports on core switches connected to "
        "STPs, or deploy optical taps on fiber links carrying signaling traffic. Verify that mirrored "
        "traffic includes both M3UA (port 2904) and SCTP (port 2905) protocols with sufficient bandwidth "
        "headroom (recommend 2x expected peak traffic volume).",
        styles['DocBody']
    ))
    
    tap_commands = """# Configure SPAN session on Cisco Catalyst switch (example)
configure terminal
monitor session 1 source interface TenGigabitEthernet1/1 both
monitor session 1 destination interface TenGigabitEthernet1/2 encapsulation replicate
no monitor session 1 filter packet-type good
exit
show monitor session 1

# Verify traffic capture on collector server
tcpdump -i eth0 port 2904 or port 2905 -c 100"""
    
    story.append(Paragraph(tap_commands.replace('\n', '<br/>'), styles['CodeBlock']))
    
    story.append(add_heading("6.1.2 Docker Compose Deployment", styles['SubsectionHeading']))
    
    story.append(Paragraph(
        "Deploy the SS7 services using Docker Compose with the production overlay file. The compose "
        "file defines resource limits, network attachments, volume mounts, and health checks for each "
        "service. Start with the collector service first to validate message capture before enabling "
        "downstream analyzers.",
        styles['DocBody']
    ))
    
    deploy_steps = [
        ['Step', 'Command', 'Validation'],
        ['1. Pull images', 'docker compose -f docker-compose.prod.yml pull ss7-collector ss7-analyzer diameter-monitor', 'Verify image digests'],
        ['2. Create volumes', 'docker volume create ss7-pcaps && docker volume create ss7-rules', 'List volumes'],
        ['3. Start collector', 'docker compose -f docker-compose.prod.yml up -d ss7-collector', 'Check logs, health endpoint'],
        ['4. Validate capture', 'kafka-console-consumer --topic ss7-raw-events --max-messages 50', 'Confirm JSON messages'],
        ['5. Start analyzer', 'docker compose -f docker-compose.prod.yml up -d ss7-analyzer', 'Check rule loading logs'],
        ['6. Start diameter', 'docker compose -f docker-compose.prod.yml up -d diameter-monitor', 'Verify Diameter decode'],
        ['7. Full pipeline test', 'Generate test SS7 message, trace through pipeline', 'End-to-end latency <5s'],
    ]
    
    story.append(create_table(deploy_steps, col_widths=[70, 260, 110]))
    story.append(Spacer(1, 10))
    
    # Phase 2
    story.append(add_heading("6.2 Phase 2: Rule Activation (Weeks 3-4)", styles['SectionHeading']))
    
    story.append(Paragraph(
        "With passive capture validated and baseline traffic profiles established, begin activating "
        "detection rules in read-only mode (alerts only, no blocking actions). This phase focuses on "
        "threshold calibration, false-positive reduction, and analyst workflow integration. Start with "
        "lower-severity rules to generate manageable alert volumes while tuning detection sensitivity.",
        styles['DocBody']
    ))
    
    activation_checklist = [
        ['Task', 'Owner', 'Deliverable', 'Sign-off'],
        ['Enable LOW severity rules', 'SOC Engineer', 'Baseline metric comparison', 'Team Lead'],
        ['Review alert samples (Day 1-3)', 'SOC Analysts', 'False positive log', 'Security Architect'],
        ['Adjust thresholds based on FP rate', 'SOC Engineer', 'Updated rule configs', 'Team Lead'],
        ['Enable MEDIUM severity rules', 'SOC Engineer', 'Alert volume metrics', 'Manager'],
        ['Configure TheHive case templates', 'TheHive Admin', 'Custom field definitions', 'SOC Lead'],
        ['Train analysts on SS7 investigation', 'Security Trainer', 'Training completion records', 'HR/Manager'],
        ['Enable HIGH severity rules (read-only)', 'SOC Engineer', 'Alert quality assessment', 'Architect'],
    ]
    
    story.append(create_table(activation_checklist, col_widths=[140, 80, 130, 80]))
    story.append(Spacer(1, 10))
    
    # Phase 3
    story.append(add_heading("6.3 Phase 3: Active Response (Weeks 5-6)", styles['SectionHeading']))
    
    story.append(Paragraph(
        "The final phase enables automated response actions for confirmed attack patterns. Active response "
        "includes automatic TheHive case creation, source GT rate-limiting recommendations pushed to "
        "firewall policy, fraud team notifications via PagerDuty/Slack, and regulatory report generation "
        "for ANRT compliance. Enable responses incrementally, starting with notification-only actions "
        "before progressing to blocking capabilities.",
        styles['DocBody']
    ))
    
    story.append(create_info_box(
        "Change Management Requirement",
        "Active response activation requires formal change approval from Djezzy's Change Advisory Board "
        "(CAB) due to potential impact on production signaling. Prepare rollback procedures documenting "
        "how to immediately disable all automated actions and revert to monitoring-only mode. Test "
        "rollback during a scheduled maintenance window before go-live.",
        'warning'
    ))
    
    story.append(PageBreak())
    return story

def build_operations_chapter():
    """Build operations and maintenance chapter."""
    story = []
    
    story.append(add_heading("7. Operations & Maintenance", styles['ChapterTitle'], level=0))
    story.append(HRFlowable(width="100%", thickness=1, color=HEADER_FILL, spaceAfter=12))
    
    story.append(Paragraph(
        "Ongoing operations of the SS7 Security Module follow established SOC procedures with "
        "telecommunications-specific adaptations. This chapter documents daily operational tasks, "
        "monitoring dashboards, backup procedures, incident response playbooks for SS7-specific "
        "threats, and routine maintenance activities including rule updates and model retraining.",
        styles['DocBody']
    ))
    
    # Daily Operations
    story.append(add_heading("7.1 Daily Operational Procedures", styles['SectionHeading']))
    
    daily_tasks = [
        ['Time', 'Task', 'Frequency', 'Owner', 'Tools'],
        ['00:00', 'Backup PCAP rotations to cold storage', 'Daily', 'NOC', 'Scripts + rsync'],
        ['06:00', 'Review overnight alert summary', 'Daily', 'Morning Shift', 'Grafana + TheHive'],
        ['09:00', 'Check Kafka consumer lag', 'Daily', 'SOC Engineer', 'Kafka UI / CLI'],
        ['10:00', 'Validate Elasticsearch index health', 'Daily', 'SOC Engineer', 'OpenSearch Dashboard'],
        ['12:00', 'Process pending TheHive cases', 'As-needed', 'SOC Analysts', 'TheHive Web UI'],
        ['14:00', 'Update threat intel feeds (GT blacklists)', 'Daily', 'Intel Team', 'MISP/OpenCTI'],
        ['16:00', 'Generate daily metrics report', 'Daily', 'SOC Lead', 'Grafana + Scripts'],
        ['18:00', 'Shift handover briefing', 'Daily', 'Shift Leads', 'Documentation'],
    ]
    
    story.append(create_table(daily_tasks, col_widths=[35, 170, 55, 65, 105]))
    story.append(Spacer(1, 10))
    
    # Monitoring
    story.append(add_heading("7.2 Health Monitoring & Alerting", styles['SectionHeading']))
    
    story.append(Paragraph(
        "Prometheus metrics exported by each SS7 service enable proactive monitoring of system health "
        "and performance degradation. Critical alerts should route to the NOC on-call rotation via "
        "PagerDuty or equivalent escalation system. Define alert thresholds based on baseline metrics "
        "collected during Phase 1 passive monitoring.",
        styles['DocBody']
    ))
    
    prometheus_alerts = [
        ['Alert Name', 'Expression', 'Threshold', 'Severity', 'Response'],
        ['Ss7CollectorDown', 'up{job="ss7-collector"} == 0', 'Any', 'CRITICAL', 'Immediate restart'],
        ['Ss7CollectorHighLatency', 'histogram_quantile(0.99, ss7_process_seconds) > 1', '>1s', 'WARNING', 'Investigate load'],
        ['KafkaConsumerLag', 'kafka_consumer_group_lag > 10000', '>10K', 'WARNING', 'Scale consumers'],
        ['ElasticsearchIndexErrors', 'rate(es_index_errors_total[5m]) > 0.1', '>0.1/s', 'WARNING', 'Check cluster'],
        ['Ss7AnalyzerErrorRate', 'rate(ss7_analyze_errors_total[5m]) > 0.05', '>5%', 'CRITICAL', 'Check rules'],
        ['DiskSpaceLow', 'ss7_pcap_disk_usage_percent > 85', '>85%', 'WARNING', 'Expand storage'],
        ['AlertBacklog', 'ss7_alert_queue_length > 1000', '>1K', 'WARNING', 'Scale analyzer'],
    ]
    
    story.append(create_table(prometheus_alerts, col_widths=[110, 185, 45, 60, 85]))
    story.append(Spacer(1, 10))
    
    # Backup Procedures
    story.append(add_heading("7.3 Backup & Retention Procedures", styles['SectionHeading']))
    
    story.append(Paragraph(
        "SS7 data requires extended retention periods for forensic investigation and regulatory compliance. "
        "Implement a tiered storage strategy balancing cost against accessibility: hot storage (NVMe SSD) "
        "for 7 days of searchable indices, warm storage (HDD array) for 90 days of compressed archives, "
        "and cold storage (tape/object storage) for 7-year regulatory retention. PCAP files capturing "
        "raw signaling packets require the longest retention as they constitute immutable evidence.",
        styles['DocBody']
    ))
    
    backup_tiers = [
        ['Tier', 'Storage', 'Retention', 'Data Types', 'Access Time'],
        ['Hot', 'NVMe SSD (local)', '7 days', 'Elasticsearch indices, recent PCAPs', '<1 second'],
        ['Warm', 'HDD NAS (network)', '90 days', 'Compressed PCAPs, aggregated metrics', '<5 minutes'],
        ['Cold', 'Object storage (S3-compatible)', '7 years', 'Encrypted archives, monthly summaries', '<4 hours'],
        ['Archive', 'WORM tape (offsite)', 'Permanent', 'Incident-related exports, ANRT reports', '<48 hours'],
    ]
    
    story.append(create_table(backup_tiers, col_widths=[45, 110, 55, 155, 65]))
    story.append(Spacer(1, 10))
    
    # Incident Response
    story.append(add_heading("7.4 SS7-Specific Incident Response Playbooks", styles['SectionHeading']))
    
    story.append(Paragraph(
        "SS7 incidents require specialized investigation procedures distinct from traditional IT security "
        "events. Analysts must understand signaling protocol semantics, network topology implications, and "
        "regulatory notification requirements. The following playbooks provide structured response "
        "guidance for common SS7 threat scenarios encountered in telecommunications environments.",
        styles['DocBody']
    ))
    
    playbook_summary = [
        ['Playbook', 'Trigger', 'Initial Response', 'Escalation', 'Resolution Criteria'],
        ['Location Tracking', 'SRI4SM threshold breach', 'Identify target/victim, block source GT', 'Privacy officer (subscriber)', 'Source blocked, victim notified'],
        ['IRSF Campaign', 'IAM volume spike to premium destinations', 'Block destination ranges, isolate source', 'Fraud team, legal', 'Revenue leak stopped, CDRs preserved'],
        ['USSD Abuse', 'Brute force threshold hit', 'Rate limit MSISDN, identify intent', 'Customer care (if subscriber)', 'Account secured, pattern documented'],
        ['SMS Intercept', 'Forwarding pattern detected', 'Preserve evidence, identify recipient', 'Law enforcement liaison', 'Attack stopped, legal process initiated'],
        ['Signaling DoS', 'Message flood from single GT', 'Traffic filtering at STP', 'Network ops, vendor support', 'Normal traffic restored, root cause fixed'],
    ]
    
    story.append(create_table(playbook_summary, col_widths=[75, 100, 115, 85, 100]))
    story.append(Spacer(1, 12))
    
    story.append(create_info_box(
        "Evidence Preservation",
        "For any incident potentially involving criminal activity (fraud, interception, stalking), "
        "immediately preserve raw PCAP files and export relevant Elasticsearch documents with hash "
        "integrity verification. Chain of custody documentation must begin at initial detection, "
        "not when law enforcement involvement becomes likely. Consult legal counsel before "
        "destroying any SS7 data regardless of standard retention policies.",
        'warning'
    ))
    
    story.append(PageBreak())
    return story

def build_compliance_chapter():
    """Build compliance and audit chapter."""
    story = []
    
    story.append(add_heading("8. Regulatory Compliance", styles['ChapterTitle'], level=0))
    story.append(HRFlowable(width="100%", thickness=1, color=HEADER_FILL, spaceAfter=12))
    
    story.append(Paragraph(
        "Operating as a licensed telecommunications carrier in Algeria, Djezzy must comply with ANRT "
        "(Autorite de Regulation de la Poste et des Communications Electroniques) regulations governing "
        "network security, subscriber privacy, and fraud prevention. The SS7 Security Module directly "
        "supports multiple compliance requirements through its monitoring, detection, and reporting "
        "capabilities. This chapter maps module features to specific regulatory obligations and documents "
        "audit evidence artifacts.",
        styles['DocBody']
    ))
    
    # ANRT Requirements
    story.append(add_heading("8.1 ANRT Compliance Matrix", styles['SectionHeading']))
    
    anrt_matrix = [
        ['Requirement', 'ANRT Reference', 'Module Feature', 'Evidence Artifact', 'Audit Frequency'],
        ['Signaling attack logging', 'Art. 42-44 Cybersecurity Law', 'Full MAP/ISUP/Diameter capture', 'Elasticsearch indices, 90-day retention', 'Quarterly'],
        ['Incident reporting', 'Circular 05/2023', 'Automated ANRT portal reports', 'Monthly summary + immediate critical', 'Monthly + ad-hoc'],
        ['Subscriber privacy protection', 'Data Protection Law Art. 8', 'Location query monitoring', 'TheHive cases per suspicious SRI', 'Annual'],
        ['Fraud prevention framework', 'Telecom Regulations Art. 31', 'IRSF detection & blocking', 'Dashboard metrics, blocked GT list', 'Quarterly'],
        ['Lawful intercept support', 'CI Act implementation', 'LI interface logging', 'Separate audit trail, encrypted', 'Annual (classified)'],
        ['Staff training records', 'Cybersecurity directive 03/2022', 'Analyst certification tracking', 'Training LMS completion records', 'Annual'],
        ['Vulnerability management', 'ANRT security guidelines', 'SS7 vulnerability scanning', 'Scan reports, remediation tickets', 'Monthly'],
        ['Business continuity', 'Telecom resilience standards', 'DR site failover capability', 'Failover test results', 'Bi-annual'],
    ]
    
    story.append(create_table(anrt_matrix, col_widths=[95, 95, 100, 110, 60]))
    story.append(Spacer(1, 10))
    
    # Audit Evidence
    story.append(add_heading("8.2 Audit Evidence Generation", styles['SectionHeading']))
    
    story.append(Paragraph(
        "Regulatory audits require documentary evidence demonstrating compliance controls are operating "
        "effectively. The SS7 module automates evidence collection through scheduled report generation, "
        "tamper-evident logging, and cryptographic integrity verification. Maintain an evidence repository "
        "with version-controlled documents accessible to authorized auditors while protecting sensitive "
        "subscriber data from unauthorized exposure.",
        styles['DocBody']
    ))
    
    evidence_types = [
        ['Evidence Type', 'Generation Method', 'Format', 'Retention', 'Access Control'],
        ['Message capture logs', 'Continuous (collector service)', 'PCAP + JSON metadata', '7 years', 'SOC + Legal only'],
        ['Alert disposition records', 'On-demand + scheduled', 'PDF + CSV exports', '7 years', 'Compliance team'],
        ['Rule effectiveness metrics', 'Weekly automated script', 'Grafana dashboard snapshots', '3 years', 'SOC management'],
        ['Incident response timelines', 'TheHive case export', 'JSON + PDF case files', '7 years', 'Legal + SOC'],
        ['System configuration audits', 'Monthly diff reports', 'Git-managed config files', '3 years', 'Security architect'],
        ['Access logs (who viewed what)', 'Elasticsearch audit index', 'Structured JSON logs', '3 years', 'Compliance only'],
        ['Training completion records', 'LMS integration', 'Certificates + transcripts', 'Employee tenure + 3y', 'HR + Compliance'],
    ]
    
    story.append(create_table(evidence_types, col_widths=[100, 105, 95, 55, 95]))
    story.append(Spacer(1, 10))
    
    # Reporting
    story.append(add_heading("8.3 Regulatory Reporting Automation", styles['SubsectionHeading']))
    
    story.append(Paragraph(
        "The SS7 module includes automated report generation for ANRT submission requirements. Monthly "
        "security summaries aggregate alert statistics, incident counts, and trend analysis into standardized "
        "formats compatible with the ANRT online reporting portal API. Critical security incidents trigger "
        "immediate notification workflows with 72-hour submission deadlines as mandated by cybersecurity "
        "regulations. Report templates are version-controlled and reviewed quarterly for regulatory changes.",
        styles['DocBody']
    ))
    
    report_specs = [
        ['Report', 'Frequency', 'Deadline', 'Contents', 'Recipient'],
        ['Monthly Security Summary', 'Monthly', '5th of following month', 'Alert stats, incident count, trends', 'ANRT Portal API'],
        ['Critical Incident Notification', 'Ad-hoc', 'Within 72 hours', 'Impact assessment, response actions', 'ANRT + Internal Mgmt'],
        ['Quarterly Fraud Metrics', 'Quarterly', '15th of quarter-end month', 'IRSF attempts blocked, revenue saved', 'ANRT + Finance'],
        ['Annual Compliance Attestation', 'Annually', 'January 31', 'Control effectiveness evidence', 'ANRT + Board'],
        ['Lawful Intercept Statistics', 'Semi-annually', 'June 30 / Dec 31', 'Request counts, response times (classified)', 'ANRT (secure channel)'],
    ]
    
    story.append(create_table(report_specs, col_widths=[115, 65, 85, 140, 80]))
    story.append(Spacer(1, 12))
    
    story.append(create_info_box(
        "Classified Information Handling",
        "Lawful Intercept statistics and certain fraud investigation details contain classified "
        "information subject to Algerian national security regulations. Store these materials in "
        "separate, encrypted repositories with access restricted to cleared personnel. Never include "
        "classified content in regular audit packages shared with external auditors without proper "
        "security clearance verification and non-disclosure agreements.",
        'warning'
    ))
    
    story.append(PageBreak())
    return story

def build_troubleshooting_chapter():
    """Build troubleshooting guide chapter."""
    story = []
    
    story.append(add_heading("9. Troubleshooting Guide", styles['ChapterTitle'], level=0))
    story.append(HRFlowable(width="100%", thickness=1, color=HEADER_FILL, spaceAfter=12))
    
    story.append(Paragraph(
        "This chapter addresses common operational issues encountered during SS7 module deployment "
        "and ongoing operations. Each troubleshooting entry includes symptom description, diagnostic "
        "steps, root cause analysis, and resolution procedures. Issues are categorized by affected "
        "component to facilitate rapid lookup during incident response scenarios.",
        styles['DocBody']
    ))
    
    # Collector Issues
    story.append(add_heading("9.1 SS7 Collector Issues", styles['SectionHeading']))
    
    collector_issues = [
        ['Symptom', 'Possible Cause', 'Diagnostic Command', 'Resolution'],
        ['No messages captured', 'SPAN misconfiguration, wrong interface', 'tcpdump -i eth0 port 2904', 'Verify SPAN config, check interface'],
        ['High packet drop rate', 'Insufficient CPU, NIC ring buffer too small', 'cat /proc/net/dev; top -H', 'Increase CPU limit, tune NIC buffers'],
        ['Kafka publish failures', 'Broker unreachable, topic not created', 'kafka-console-producer --test', 'Check broker health, create topics'],
        ['PCAP rotation errors', 'Disk full, permission issues', 'df -h; ls -la /var/capture/', 'Expand storage, fix permissions'],
        ['M3UA decode errors', 'Protocol version mismatch, corrupt packets', 'Check logs for decode exceptions', 'Update decoder, verify mirror integrity'],
    ]
    
    story.append(create_table(collector_issues, col_widths=[95, 125, 115, 115]))
    story.append(Spacer(1, 10))
    
    # Analyzer Issues
    story.append(add_heading("9.2 SS7 Analyzer Issues", styles['SectionHeading']))
    
    analyzer_issues = [
        ['Symptom', 'Possible Cause', 'Diagnostic Command', 'Resolution'],
        ['High alert latency', 'Consumer lag, overloaded rules engine', 'kafka-consumer-groups --describe', 'Add consumer instances, optimize rules'],
        ['Excessive false positives', 'Thresholds too sensitive, baseline drift', 'Query ES for alert/dismissal ratio', 'Recalibrate thresholds, update baselines'],
        ['Rules not loading', 'YAML syntax error, missing dependencies', 'Check startup logs for parse errors', 'Fix YAML syntax, validate rule deps'],
        ['ML model scoring errors', 'Model file corrupted, version mismatch', 'Check model checksum, test inference', 'Retrain/redeploy model'],
        ['TheHive API errors', 'Rate limit exceeded, auth token expired', 'curl -H "Authorization: {key}" thehive/api/status', 'Implement backoff, refresh tokens'],
    ]
    
    story.append(create_table(analyzer_issues, col_widths=[95, 120, 120, 115]))
    story.append(Spacer(1, 10))
    
    # Infrastructure Issues
    story.append(add_heading("9.3 Infrastructure Issues", styles['SectionHeading']))
    
    infra_issues = [
        ['Symptom', 'Possible Cause', 'Diagnostic Command', 'Resolution'],
        ['Kafka broker down', 'Disk failure, JVM OOM', 'docker logs kafka-broker-1', 'Restart broker, check disk/JVM heap'],
        ['ES cluster yellow/red', 'Shard allocation failed, node missing', '_cluster/health?pretty', 'Fix allocation, recover node'],
        ['Grafana datasource error', 'ES/Kafka credentials expired', 'Test connection in Grafana UI', 'Rotate credentials, update datasources'],
        ['Network partition', 'Switch failure, firewall rule change', 'ping, traceroute to cluster nodes', 'Engage network ops, verify firewall'],
        ['Clock skew between nodes', 'NTP failure, VM drift', 'ntpq -p on all nodes', 'Fix NTP config, sync clocks'],
    ]
    
    story.append(create_table(infra_issues, col_widths=[95, 120, 120, 115]))
    story.append(Spacer(1, 10))
    
    # Performance Tuning
    story.append(add_heading("9.4 Performance Tuning Recommendations", styles['SectionHeading']))
    
    story.append(Paragraph(
        "When encountering performance bottlenecks, apply these tuning adjustments in order, measuring "
        "impact after each change. Avoid changing multiple parameters simultaneously as this obscures "
        "which adjustment produced observed effects. Document all tuning changes in the operations runbook "
        "for future reference and rollback capability.",
        styles['DocBody']
    ))
    
    tuning_params = [
        ['Component', 'Parameter', 'Default', 'Tuned Value', 'Effect'],
        ['Kafka', 'socket.receive.buffer.bytes', '65536', '262144', 'Higher throughput'],
        ['Kafka', 'num.io.threads', '8', '16', 'Better disk I/O utilization'],
        ['Elasticsearch', 'index.refresh_interval', '1s', '5s', 'Reduced indexing overhead (+400% throughput)'],
        ['Collector', 'pcap.snaplen', '65535', '4096', 'Smaller captures (if headers sufficient)'],
        ['Analyzer', 'rule_evaluation_threads', 'CPU count', 'CPU count x 2', 'Parallel rule execution'],
        ['JVM (all Java services)', '-Xmx', '1g', '4g', 'More heap for caching'],
        ['Linux kernel', 'net.core.somaxconn', '128', '1024', 'Higher connection backlog'],
    ]
    
    story.append(create_table(tuning_params, col_widths=[75, 120, 55, 80, 140]))
    story.append(Spacer(1, 12))
    
    story.append(create_info_box(
        "Performance Testing Protocol",
        "Before deploying to production, conduct load testing using captured PCAP replays at 1.5x "
        "expected peak traffic. Measure end-to-end latency (capture to alert), resource utilization "
        "(CPU, memory, disk I/O), and Kafka consumer lag under sustained load. Document baseline "
        "metrics and establish alert thresholds at 70% of maximum tested capacity to provide headroom "
        "for traffic spikes.",
        'success'
    ))
    
    story.append(PageBreak())
    return story

def build_appendix():
    """Build appendix with reference materials."""
    story = []
    
    story.append(add_heading("Appendix A: Port Reference", styles['ChapterTitle'], level=0))
    story.append(HRFlowable(width="100%", thickness=1, color=HEADER_FILL, spaceAfter=12))
    
    port_data = [
        ['Port', 'Protocol', 'Service', 'Direction', 'Security Zone'],
        ['2904', 'M3UA', 'SS7 over SIGTRAN', 'Inbound (passive)', 'soc-events'],
        ['2905', 'SCTP', 'Transport layer', 'Inbound (passive)', 'soc-events'],
        ['3868', 'Diameter', 'LTE/EPS signaling', 'Inbound (passive)', 'soc-events'],
        ['3869', 'Diameter (alt)', 'Diameter Monitor mgmt', 'Inbound', 'soc-events'],
        ['7000', 'HTTP', 'SS7 Collector health', 'Internal', 'soc-backend'],
        ['7001', 'HTTP', 'SS7 Analyzer API', 'Internal', 'soc-backend'],
        ['9092', 'PLAINTEXT', 'Kafka broker internal', 'Internal', 'soc-events'],
        ['9200', 'HTTP', 'Elasticsearch REST', 'Internal', 'soc-backend'],
        ['9000', 'HTTP', 'TheHive web UI', 'Internal', 'soc-backend'],
        ['3000', 'HTTP', 'Grafana dashboards', 'Internal', 'soc-monitoring'],
    ]
    
    story.append(create_table(port_data, col_widths=[45, 65, 115, 90, 90]))
    story.append(Spacer(1, 20))
    
    story.append(add_heading("Appendix B: Glossary", styles['ChapterTitle'], level=0))
    story.append(HRFlowable(width="100%", thickness=1, color=HEADER_FILL, spaceAfter=12))
    
    glossary = [
        ['Term', 'Definition'],
        ['Diameter', 'IP-based protocol suite for AAA (Authentication, Authorization, Accounting) in LTE/IMS networks, successor to RADIUS. Uses AVP structure.'],
        ['Global Title (GT)', 'Address used in SS7 networks to route messages to destination, similar to phone numbers but for signaling. Format varies by national administration.'],
        ['HLR (Home Location Register)', 'Database containing subscriber profile, current location (MSC/VLR address), and service entitlements for home network subscribers.'],
        ['IMSI (International Mobile Subscriber Identity)', 'Unique subscriber identifier stored on SIM card, typically 15 digits. Used for network authentication and subscriber identification.'],
        ['IRSF (International Revenue Share Fraud)', 'Fraud scheme where attackers generate high-volume international calls to premium-rate numbers they control, sharing revenue with complicit carriers.'],
        ['ISUP (ISDN User Part)', 'SS7 protocol layer responsible for setting up and tearing down telephone calls, part of MTP3 user layer alongside MAP and CAP.'],
        ['MAP (Mobile Application Part)', 'SS7 application protocol for GSM/UMTS mobility management including location updates, authentication, SMS delivery, and handover.'],
        ['M3UA (MTP3 User Adaptation)', 'SIGTRAN adaptation layer that transports MTP3 messages over IP using SCTP instead of traditional TDM links.'],
        ['MSC (Mobile Switching Center)', 'Core network element that handles call switching, mobility management, and interfaces between radio access network and core SS7 infrastructure.'],
        ['PCAP (Packet Capture)', 'File format for storing captured network packets, used for forensic analysis and replay testing. Tools: tcpdump, Wireshark.'],
        ['SIGTRAN', 'IETF working group and protocol suite for transporting SS7 messages over IP networks, includes M3UA, SUA, M2PA, and SCTP adaptations.'],
        ['SCTP (Stream Control Transmission Protocol)', 'Transport layer protocol designed for telecommunications signaling, provides reliable ordered delivery with multi-streaming and multi-homing.'],
        ['STP (Signal Transfer Point)', 'Network node that routes SS7 messages between signaling endpoints (like IP routers but for SS7), critical infrastructure for signaling reliability.'],
        ['USSD (Unstructured Supplementary Service Data)', 'Session-based protocol for interactive services (balance inquiry, recharge) initiated by dialing service codes like *100#.'],
        ['VLR (Visitor Location Register)', 'Temporary database storing profiles of subscribers currently roaming in an MSC service area, synchronized with HLR for location updates.'],
    ]
    
    story.append(create_table(glossary, col_widths=[80, 380]))
    story.append(Spacer(1, 20))
    
    story.append(add_heading("Appendix C: Version History", styles['ChapterTitle'], level=0))
    story.append(HRFlowable(width="100%", thickness=1, color=HEADER_FILL, spaceAfter=12))
    
    version_history = [
        ['Version', 'Date', 'Author', 'Changes'],
        ['1.0', '2025-08-01', 'SOC Engineering Team', 'Initial release - architecture, services, rules'],
        ['1.1', '2025-08-10', 'SOC Engineering Team', 'Added Diameter monitoring, LTE interfaces'],
        ['2.0', datetime.now().strftime('%Y-%m-%d'), 'Documentation Team', 'Complete rewrite - operations, compliance, troubleshooting'],
    ]
    
    story.append(create_table(version_history, col_widths=[50, 80, 120, 190]))
    
    return story

# ============================================================================
# MAIN DOCUMENT GENERATION
# ============================================================================

def generate_ss7_documentation():
    """Generate the complete SS7 Technical Documentation PDF."""
    
    output_path = '/home/z/my-project/download/Djezzy_SOC_SS7_Technical_Documentation.pdf'
    
    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        rightMargin=20*mm,
        leftMargin=20*mm,
        topMargin=25*mm,
        bottomMargin=25*mm,
        title='Djezzy SOC Platform - SS7 Security Module Technical Documentation',
        author='Djezzy SOC Engineering Team',
        subject='SS7/Diameter Security Monitoring Implementation Guide',
        creator='Djezzy National SOC Platform'
    )
    
    story = []
    
    # Cover page
    story.extend(build_cover_page())
    
    # Table of Contents
    story.extend(build_toc())
    
    # Chapters
    story.extend(build_executive_summary())
    story.extend(build_architecture_chapter())
    story.extend(build_services_chapter())
    story.extend(build_detection_rules_chapter())
    story.extend(build_integration_chapter())
    story.extend(build_deployment_chapter())
    story.extend(build_operations_chapter())
    story.extend(build_compliance_chapter())
    story.extend(build_troubleshooting_chapter())
    
    # Appendices
    story.extend(build_appendix())
    
    print(f"Generating SS7 Technical Documentation...")
    doc.build(story, onFirstPage=page_template, onLaterPages=page_template)
    print(f"Document generated successfully: {output_path}")
    
    size_bytes = os.path.getsize(output_path)
    size_mb = size_bytes / (1024 * 1024)
    print(f"File size: {size_mb:.2f} MB ({size_bytes:,} bytes)")
    
    return output_path

if __name__ == '__main__':
    generate_ss7_documentation()
