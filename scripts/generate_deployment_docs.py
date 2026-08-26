#!/usr/bin/env python3
"""
Djezzy SOC Platform - Comprehensive Deployment Documentation Generator
Generates PDF with: Hardware Architecture Guide, Operations Manual, Quick-Start Cheat Sheet, Wazuh+TheHive Integration
"""

import os
import sys
from datetime import datetime
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, mm
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY, TA_RIGHT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, Image, ListFlowable, ListItem, KeepTogether
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily
from reportlab.platypus.flowables import HRFlowable

# Register fonts
FONT_DIR = '/usr/share/fonts'
pdfmetrics.registerFont(TTFont('NotoSerifSC', f'{FONT_DIR}/truetype/noto-serif-sc/NotoSerifSC-Regular.ttf'))
pdfmetrics.registerFont(TTFont('NotoSerifSC-Bold', f'{FONT_DIR}/truetype/noto-serif-sc/NotoSerifSC-Bold.ttf'))
pdfmetrics.registerFont(TTFont('NotoSansSC', f'{FONT_DIR}/truetype/chinese/LiberationSans-Regular.ttf'))
pdfmetrics.registerFont(TTFont('NotoSansSC-Bold', f'{FONT_DIR}/truetype/liberation/LiberationSans-Bold.ttf'))
pdfmetrics.registerFont(TTFont('Liberation Mono', f'{FONT_DIR}/truetype/dejavu/DejaVuSansMono.ttf'))
registerFontFamily('NotoSansSC', normal='NotoSansSC', bold='NotoSansSC-Bold')

# Cascade Palette (Djezzy SOC Technical Documentation)
PAGE_BG       = colors.HexColor('#f2f2f1')
SECTION_BG    = colors.HexColor('#f3f2f1')
CARD_BG       = colors.HexColor('#e8e7e4')
TABLE_STRIPE  = colors.HexColor('#edecea')
HEADER_FILL   = colors.HexColor('#6c603e')
COVER_BLOCK   = colors.HexColor('#7e7455')
BORDER        = colors.HexColor('#c2baa5')
ICON          = colors.HexColor('#736743')
ACCENT        = colors.HexColor('#96781b')
ACCENT_2      = colors.HexColor('#42aacd')
TEXT_PRIMARY  = colors.HexColor('#262522')
TEXT_MUTED    = colors.HexColor('#7a7871')
SEM_SUCCESS   = colors.HexColor('#467a58')
SEM_WARNING   = colors.HexColor('#897348')
SEM_ERROR     = colors.HexColor('#9b5953')
SEM_INFO      = colors.HexColor('#4d78a3')

# Page setup
PAGE_WIDTH, PAGE_HEIGHT = A4
MARGIN = 0.75 * inch

def create_styles():
    """Create custom paragraph styles for the document."""
    styles = getSampleStyleSheet()
    
    # Title style
    styles.add(ParagraphStyle(
        name='DocTitle',
        fontName='NotoSerifSC-Bold',
        fontSize=28,
        leading=34,
        alignment=TA_CENTER,
        textColor=HEADER_FILL,
        spaceAfter=12
    ))
    
    # Subtitle style
    styles.add(ParagraphStyle(
        name='DocSubtitle',
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
        borderPadding=(0, 0, 4, 0)
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
    
    # H3 heading
    styles.add(ParagraphStyle(
        name='H3Heading',
        fontName='NotoSansSC-Bold',
        fontSize=12,
        leading=15,
        textColor=TEXT_PRIMARY,
        spaceBefore=12,
        spaceAfter=6
    ))
    
    # Body text
    styles.add(ParagraphStyle(
        name='DocBodyText',
        fontName='NotoSansSC',
        fontSize=10,
        leading=15,
        alignment=TA_JUSTIFY,
        textColor=TEXT_PRIMARY,
        spaceAfter=8,
        wordWrap='CJK'
    ))
    
    # Code/Config style
    styles.add(ParagraphStyle(
        name='CodeText',
        fontName='Liberation Mono',
        fontSize=8,
        leading=11,
        textColor=TEXT_PRIMARY,
        backColor=CARD_BG,
        leftIndent=10,
        rightIndent=10,
        spaceBefore=4,
        spaceAfter=4
    ))
    
    # Bullet item style
    styles.add(ParagraphStyle(
        name='BulletItem',
        fontName='NotoSansSC',
        fontSize=10,
        leading=14,
        textColor=TEXT_PRIMARY,
        leftIndent=20,
        bulletIndent=10
    ))
    
    # Table header style
    styles.add(ParagraphStyle(
        name='TableHeader',
        fontName='NotoSansSC-Bold',
        fontSize=9,
        leading=12,
        alignment=TA_CENTER,
        textColor=colors.white
    ))
    
    # Table cell style
    styles.add(ParagraphStyle(
        name='TableCell',
        fontName='NotoSansSC',
        fontSize=8,
        leading=11,
        textColor=TEXT_PRIMARY,
        wordWrap='CJK'
    ))
    
    # Note/Tip style
    styles.add(ParagraphStyle(
        name='NoteText',
        fontName='NotoSansSC',
        fontSize=9,
        leading=13,
        textColor=SEM_INFO,
        leftIndent=15,
        rightIndent=15,
        spaceBefore=8,
        spaceAfter=8,
        borderColor=SEM_INFO,
        borderWidth=1,
        borderPadding=8
    ))
    
    # Warning style
    styles.add(ParagraphStyle(
        name='WarningText',
        fontName='NotoSansSC',
        fontSize=9,
        leading=13,
        textColor=SEM_ERROR,
        leftIndent=15,
        rightIndent=15,
        spaceBefore=8,
        spaceAfter=8
    ))
    
    return styles


def add_header_footer(canvas, doc):
    """Add header and footer to each page."""
    canvas.saveState()
    
    # Footer with page number
    canvas.setFont('NotoSansSC', 8)
    canvas.setFillColor(TEXT_MUTED)
    page_num = canvas.getPageNumber()
    footer_text = f"Djezzy SOC Platform Deployment Documentation | Page {page_num}"
    canvas.drawCentredString(PAGE_WIDTH / 2, 0.5 * inch, footer_text)
    
    # Header line
    canvas.setStrokeColor(HEADER_FILL)
    canvas.setLineWidth(0.5)
    canvas.line(MARGIN, PAGE_HEIGHT - 0.5 * inch, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 0.5 * inch)
    
    canvas.restoreState()


def build_cover_page(styles):
    """Build the cover page elements."""
    elements = []
    elements.append(Spacer(1, 1.5 * inch))
    
    # Main title
    elements.append(Paragraph("Djezzy National SOC Platform", styles['DocTitle']))
    elements.append(Spacer(1, 0.2 * inch))
    elements.append(Paragraph("Comprehensive Deployment Documentation", styles['DocSubtitle']))
    elements.append(Spacer(1, 0.3 * inch))
    
    # Subtitle details
    cover_info = """
    <b>Hardware Architecture Guide</b> | <b>Operations Manual</b> | <b>Quick-Start Cheat Sheet</b><br/>
    <b>Wazuh + TheHive Integration Setup</b>
    """
    elements.append(Paragraph(cover_info, ParagraphStyle(
        'CoverInfo',
        fontName='NotoSansSC',
        fontSize=11,
        leading=16,
        alignment=TA_CENTER,
        textColor=TEXT_MUTED
    )))
    
    elements.append(Spacer(1, 0.5 * inch))
    
    # Decorative line
    elements.append(HRFlowable(width="60%", thickness=2, color=ACCENT, spaceBefore=20, spaceAfter=20))
    
    elements.append(Spacer(1, 0.3 * inch))
    
    # Key specs box
    specs_data = [
        ['Platform Scale', 'Technology Stack', 'Deployment Model'],
        ['39 Microservices', 'Next.js 16 / React 19 / TypeScript', '100% On-Premises'],
        ['15 Security Tools', 'PostgreSQL 16 / Redis 7 / Kafka', 'Air-Gap Capable'],
        ['22 Servers (768GB RAM)', 'Docker / Kubernetes / Helm', 'Zero Cloud Dependencies'],
        ['50B+ Events/Year', 'Prisma ORM / Grafana / Prometheus', 'Primary + DR Site']
    ]
    
    specs_table = Table(specs_data, colWidths=[2.2*inch, 2.4*inch, 2.2*inch])
    specs_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), HEADER_FILL),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'NotoSansSC-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 9),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('FONTNAME', (0, 1), (-1, -1), 'NotoSansSC'),
        ('FONTSIZE', (0, 1), (-1, -1), 9),
        ('BACKGROUND', (0, 1), (-1, -1), CARD_BG),
        ('TEXTCOLOR', (0, 1), (-1, -1), TEXT_PRIMARY),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(specs_table)
    
    elements.append(Spacer(1, 0.6 * inch))
    
    # Document info
    doc_info = f"""
    <b>Document Version:</b> 1.0<br/>
    <b>Generated:</b> {datetime.now().strftime('%Y-%m-%d %H:%M')} UTC<br/>
    <b>Classification:</b> Internal Operations Document<br/>
    <b>Repository:</b> https://github.com/LAIDOUDI33/NetOP
    """
    elements.append(Paragraph(doc_info, ParagraphStyle(
        'DocInfo',
        fontName='NotoSansSC',
        fontSize=9,
        leading=14,
        alignment=TA_CENTER,
        textColor=TEXT_MUTED
    )))
    
    elements.append(PageBreak())
    return elements


def build_toc(styles):
    """Build table of contents."""
    elements = []
    elements.append(Paragraph("Table of Contents", styles['SectionHeading']))
    elements.append(HRFlowable(width="100%", thickness=1, color=BORDER, spaceBefore=5, spaceAfter=15))
    
    toc_items = [
        ("PART I: Hardware Architecture Guide", "3"),
        ("    1.1 Primary Site Infrastructure (14 Servers)", "3"),
        ("    1.2 Disaster Recovery Site (8 Servers)", "4"),
        ("    1.3 AI & Geomarketing Resource Allocation", "5"),
        ("    1.4 Network Topology & Connectivity", "6"),
        ("PART II: Operations Manual", "7"),
        ("    2.1 Daily Operational Procedures", "7"),
        ("    2.2 Monitoring & Alerting", "8"),
        ("    2.3 Backup & Recovery Procedures", "9"),
        ("    2.4 Security Patch Management", "10"),
        ("    2.5 Incident Response Workflow", "11"),
        ("PART III: Quick-Start Cheat Sheet", "12"),
        ("    3.1 Pre-Deployment Checklist", "12"),
        ("    3.2 Docker Compose Deployment", "13"),
        ("    3.3 Kubernetes Deployment", "14"),
        ("    3.4 Environment Variables Reference", "15"),
        ("    3.5 Common Commands Quick Reference", "16"),
        ("PART IV: Wazuh + TheHive Integration Setup", "17"),
        ("    4.1 Integration Architecture Overview", "17"),
        ("    4.2 Wazuh Configuration for TheHive", "18"),
        ("    4.3 TheHive Receiver Configuration", "19"),
        ("    4.4 Automated Case Creation Workflow", "20"),
        ("    4.5 Testing & Validation Procedures", "21"),
        ("Appendix A: Port Mapping Reference", "22"),
        ("Appendix B: Troubleshooting Guide", "23"),
    ]
    
    toc_data = []
    for item, page in toc_items:
        is_main = not item.startswith("    ")
        style = 'SubsectionHeading' if is_main else 'BulletItem'
        toc_data.append([
            Paragraph(item, ParagraphStyle(
                'TOCItem' if is_main else 'TOCSubItem',
                fontName='NotoSerifSC-Bold' if is_main else 'NotoSansSC',
                fontSize=11 if is_main else 10,
                leading=16 if is_main else 14,
                textColor=HEADER_FILL if is_main else TEXT_PRIMARY
            )),
            Paragraph(page, ParagraphStyle(
                'TOCPage',
                fontName='NotoSansSC',
                fontSize=10 if is_main else 9,
                alignment=TA_RIGHT,
                textColor=TEXT_MUTED
            ))
        ])
    
    toc_table = Table(toc_data, colWidths=[5.5*inch, 0.8*inch])
    toc_table.setStyle(TableStyle([
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    elements.append(toc_table)
    
    elements.append(PageBreak())
    return elements


def build_hardware_architecture_guide(styles):
    """Build Part I: Hardware Architecture Guide."""
    elements = []
    
    # Part Header
    elements.append(Paragraph("PART I: Hardware Architecture Guide", styles['SectionHeading']))
    elements.append(HRFlowable(width="100%", thickness=2, color=HEADER_FILL, spaceBefore=5, spaceAfter=15))
    
    intro_text = """
    This section provides comprehensive hardware specifications for the Djezzy National SOC Platform deployment. 
    The architecture follows a dual-site design with a primary production site and a disaster recovery site, 
    ensuring business continuity and high availability for critical security operations. All infrastructure 
    is designed for 100% on-premises deployment with zero cloud dependencies, meeting strict data sovereignty 
    requirements while supporting air-gap capable operation scenarios.
    """
    elements.append(Paragraph(intro_text.strip(), styles['DocBodyText']))
    elements.append(Spacer(1, 0.15 * inch))
    
    # 1.1 Primary Site Infrastructure
    elements.append(Paragraph("1.1 Primary Site Infrastructure (14 Servers)", styles['SubsectionHeading']))
    
    primary_intro = """
    The primary site houses the core operational infrastructure for the SOC platform, comprising 14 dedicated 
    servers organized into functional clusters. Each server role is carefully defined to optimize resource 
    utilization while maintaining redundancy for critical components. The primary site handles all real-time 
    security monitoring, event processing, and analyst operations during normal operations.
    """
    elements.append(Paragraph(primary_intro.strip(), styles['DocBodyText']))
    
    primary_servers = [
        ['Server ID', 'Role', 'Specification', 'Services Hosted', 'Network'],
        ['SOC-DB-01', 'Primary Database', '2x Intel Xeon Gold 6348 (56 cores)\n512GB DDR4 ECC\n8TB NVMe RAID10\n10Gbps x4 bonded', 'PostgreSQL 16 (Primary)\nPgBouncer Connection Pooler', 'soc-backend'],
        ['SOC-DB-02', 'Database Replica', '2x Intel Xeon Gold 6348 (56 cores)\n512GB DDR4 ECC\n8TB NVMe RAID10\n10Gbps x4 bonded', 'PostgreSQL 16 (Hot Standby)\n WAL Streaming Replica', 'soc-backend'],
        ['SOC-CACHE-01', 'Cache & Session Store', 'Intel Xeon Silver 4314 (32 cores)\n256GB DDR4 ECC\n4TB NVMe RAID1\n10Gbps x2 bonded', 'Redis 7 (Master)\nRedis Sentinel Leader', 'soc-backend'],
        ['SOC-CACHE-02', 'Cache Replica', 'Intel Xeon Silver 4314 (32 cores)\n256GB DDR4 ECC\n4TB NVMe RAID1\n10Gbps x2 bonded', 'Redis 7 (Replica)\nRedis Sentinel Node', 'soc-backend'],
        ['SOC-ES-01', 'Elasticsearch Master', '2x Intel Xeon Gold 6348 (56 cores)\n512GB DDR4 ECC\n12TB NVMe RAID10\n25Gbps x2', 'Elasticsearch 8.x (Master)\nKibana Visualizations', 'soc-backend'],
        ['SOC-ES-02', 'Elasticsearch Data 1', '2x Intel Xeon Gold 6348 (56 cores)\n512GB DDR4 ECC\n24TB NVMe RAID10\n25Gbps x2', 'Elasticsearch 8.x (Data-Hot)\nWazuh Indexer', 'soc-backend'],
        ['SOC-ES-03', 'Elasticsearch Data 2', '2x Intel Xeon Gold 6348 (56 cores)\n512GB DDR4 ECC\n24TB NVMe RAID10\n25Gbps x2', 'Elasticsearch 8.x (Data-Warm)\nLog Archive Indexing', 'soc-backend'],
        ['SOC-KAFKA-01', 'Event Bus Broker 1', 'Intel Xeon Gold 5318Y (24 cores)\n128GB DDR4 ECC\n4TB NVMe RAID1\n25Gbps x2', 'Apache Kafka (Broker-1)\nZooKeeper Ensemble', 'soc-events'],
        ['SOC-KAFKA-02', 'Event Bus Broker 2', 'Intel Xeon Gold 5318Y (24 cores)\n128GB DDR4 ECC\n4TB NVMe RAID1\n25Gbps x2', 'Apache Kafka (Broker-2)\nZooKeeper Ensemble', 'soc-events'],
        ['SOC-KAFKA-03', 'Event Bus Broker 3', 'Intel Xeon Gold 5318Y (24 cores)\n128GB DDR4 ECC\n4TB NVMe RAID1\n25Gbps x2', 'Apache Kafka (Broker-3)\nZooKeeper Ensemble', 'soc-events'],
        ['SOC-SIEM-01', 'SIEM & EDR Core', '2x Intel Xeon Gold 6348 (56 cores)\n384GB DDR4 ECC\n8TB NVMe RAID10\n25Gbps x2', 'Wazuh Manager\nGRR Server\nOsquery Fleet', 'soc-backend'],
        ['SOC-NSM-01', 'Network Security Monitor', '2x Intel Xeon Gold 6348 (56 cores)\n256GB DDR4 ECC\n8TB NVMe RAID10\n100Gbps (SPAN)', 'Suricata IDS\nZeek Controller\nArkime PCAP', 'soc-events'],
        ['SOC-SOAR-01', 'SOAR & Threat Intel', '2x Intel Xeon Gold 5318Y (48 cores)\n256GB DDR4 ECC\n8TB NVMe RAID10\n10Gbps x4', 'TheHive Project\nCortex Analyzers\nMISP\nOpenCTI', 'soc-backend'],
        ['SOC-APP-01', 'Application & API', '2x Intel Xeon Gold 5318Y (48 cores)\n256GB DDR4 ECC\n4TB NVMe RAID10\n10Gbps x4', 'SOC Platform (Next.js)\nKong API Gateway\nNginx Reverse Proxy', 'soc-frontend'],
    ]
    
    primary_table = Table(primary_servers, colWidths=[0.85*inch, 1.1*inch, 1.75*inch, 1.55*inch, 0.85*inch])
    primary_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), HEADER_FILL),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'NotoSansSC-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 8),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('FONTNAME', (0, 1), (-1, -1), 'NotoSansSC'),
        ('FONTSIZE', (0, 1), (-1, -1), 7),
        ('BACKGROUND', (0, 1), (-1, -1), colors.white),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, TABLE_STRIPE]),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 4),
        ('RIGHTPADDING', (0, 0), (-1, -1), 4),
    ]))
    elements.append(primary_table)
    elements.append(Spacer(1, 0.15 * inch))
    
    # Primary site summary
    primary_summary = """
    <b>Primary Site Resource Summary:</b> Total of ~140 vCPUs (with hyperthreading: ~280 threads), 
    ~4,864GB RAM, ~125TB NVMe storage across 14 servers. Network capacity ranges from 10Gbps for 
    management traffic to 100Gbps for SPAN/mirror ports on the NSM server. All database and cache 
    layers implement synchronous replication with automatic failover capabilities.
    """
    elements.append(Paragraph(primary_summary.strip(), styles['NoteText']))
    elements.append(Spacer(1, 0.2 * inch))
    
    # 1.2 Disaster Recovery Site
    elements.append(Paragraph("1.2 Disaster Recovery Site (8 Servers)", styles['SubsectionHeading']))
    
    dr_intro = """
    The disaster recovery (DR) site provides geographic redundancy and business continuity capability 
    for the SOC platform. Located at a minimum distance of 50km from the primary site to avoid regional 
    disaster overlap, the DR site maintains warm standby instances that can assume full operational 
    load within the defined RTO (Recovery Time Objective) of 4 hours and RPO (Recovery Point Objective) 
    of 1 hour for transactional data.
    """
    elements.append(Paragraph(dr_intro.strip(), styles['DocBodyText']))
    
    dr_servers = [
        ['Server ID', 'Role', 'Specification', 'Services Hosted', 'Replication Mode'],
        ['DR-DB-01', 'DR Database', '2x Intel Xeon Gold 5318Y (48 cores)\n384GB DDR4 ECC\n8TB NVMe RAID10\n10Gbps x4', 'PostgreSQL 16 (DR Standby)\nPgBouncer DR Instance', 'Async Streaming\n(RPO: 1hr)'],
        ['DR-CACHE-01', 'DR Cache Layer', 'Intel Xeon Silver 4314 (32 cores)\n128GB DDR4 ECC\n2TB NVMe RAID1\n10Gbps x2', 'Redis 7 (DR Replica)\nSentinel DR Node', 'Async Replication\n(RPO: 5min)'],
        ['DR-ES-01', 'DR Elasticsearch', '2x Intel Xeon Gold 5318Y (48 cores)\n256GB DDR4 ECC\n12TB NVMe RAID10\n10Gbps x4', 'Elasticsearch 8.x (DR)\nCross-Cluster Replication', 'CCR (RPO: 15min)'],
        ['DR-KAFKA-01', 'DR Event Bus', 'Intel Xeon Gold 5318Y (24 cores)\n64GB DDR4 ECC\n2TB NVMe RAID1\n10Gbps x2', 'Kafka MirrorMaker\nDR Consumer Group', 'Mirror (RPO: 5min)'],
        ['DR-SIEM-01', 'DR SIEM Stack', '2x Intel Xeon Gold 5318Y (48 cores)\n256GB DDR4 ECC\n4TB NVMe RAID10\n10Gbps x4', 'Wazuh Manager (DR)\nGRR Server (DR)', 'Config Sync\n(Event Replay)'],
        ['DR-SOAR-01', 'DR SOAR Stack', 'Intel Xeon Gold 5318Y (24 cores)\n128GB DDR4 ECC\n4TB NVMe RAID10\n10Gbps x2', 'TheHive (DR)\nCortex (DR)\nMISP (DR)', 'DB Replication\n(Config Sync)'],
        ['DR-MON-01', 'DR Monitoring', 'Intel Xeon Silver 4314 (32 cores)\n64GB DDR4 ECC\n2TB NVMe RAID1\n10Gbps x2', 'Prometheus (DR)\nGrafana (DR)\nAlertmanager (DR)', 'Federation\n(RT: 30s)'],
        ['DR-APP-01', 'DR Application', '2x Intel Xeon Gold 5318Y (48 cores)\n128GB DDR4 ECC\n2TB NVMe RAID10\n10Gbps x4', 'SOC Platform (DR)\nKong (DR)\nNginx (DR)', 'Container Sync\n(Config Sync)'],
    ]
    
    dr_table = Table(dr_servers, colWidths=[0.85*inch, 0.95*inch, 1.65*inch, 1.45*inch, 1.0*inch])
    dr_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), HEADER_FILL),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'NotoSansSC-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 8),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('FONTNAME', (0, 1), (-1, -1), 'NotoSansSC'),
        ('FONTSIZE', (0, 1), (-1, -1), 7),
        ('BACKGROUND', (0, 1), (-1, -1), colors.white),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, TABLE_STRIPE]),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 4),
        ('RIGHTPADDING', (0, 0), (-1, -1), 4),
    ]))
    elements.append(dr_table)
    elements.append(Spacer(1, 0.15 * inch))
    
    dr_summary = """
    <b>DR Site Resource Summary:</b> Total of ~80 vCPUs (~160 threads), ~1,280GB RAM, ~36TB NVMe storage 
    across 8 servers. The DR site operates at approximately 40% of primary site capacity, sufficient to 
    maintain essential security monitoring functions during failover scenarios. Full capacity restoration 
    through auto-scaling or manual provisioning can be achieved within 8 hours of declaring a disaster event.
    """
    elements.append(Paragraph(dr_summary.strip(), styles['NoteText']))
    elements.append(Spacer(1, 0.2 * inch))
    
    # 1.3 AI & Geomarketing Resources
    elements.append(Paragraph("1.3 AI & Geomarketing Resource Allocation", styles['SubsectionHeading']))
    
    ai_intro = """
    The SOC platform incorporates advanced AI-driven analytics and geomarketing capabilities that require 
    specialized resource allocation. These workloads are distributed across existing infrastructure with 
    dedicated resource pools to ensure performance isolation and predictable response times for both 
    real-time security operations and batch analytical processing tasks.
    """
    elements.append(Paragraph(ai_intro.strip(), styles['DocBodyText']))
    
    elements.append(Paragraph("1.3.1 AI/ML Service Resource Requirements", styles['H3Heading']))
    
    ai_resources = [
        ['Service Component', 'CPU Allocation', 'Memory', 'GPU/Accelerator', 'Storage', 'Host Server'],
        ['AI Automation Engine', '16 vCPU reserved', '64GB RAM', 'Optional: NVIDIA T4 (16GB)', '500GB SSD (models)', 'SOC-APP-01'],
        ['Threat Intelligence NLP', '8 vCPU reserved', '32GB RAM', 'None (CPU inference)', '200GB SSD (corpus)', 'SOC-SOAR-01'],
        ['Anomaly Detection ML', '12 vCPU reserved', '48GB RAM', 'Optional: NVIDIA A10 (24GB)', '300GB SSD (training)', 'SOC-SIEM-01'],
        ['Behavioral Analytics', '8 vCPU reserved', '32GB RAM', 'None (CPU inference)', '150GB SSD (profiles)', 'SOC-ES-02'],
        ['Predictive Alert Scoring', '6 vCPU reserved', '24GB RAM', 'None (CPU inference)', '100GB SSD (models)', 'SOC-KAFKA-01'],
        ['Natural Language Query', '4 vCPU reserved', '16GB RAM', 'None (CPU inference)', '50GB SSD (embeddings)', 'SOC-APP-01'],
    ]
    
    ai_table = Table(ai_resources, colWidths=[1.35*inch, 1.0*inch, 0.85*inch, 1.3*inch, 1.05*inch, 0.95*inch])
    ai_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), ACCENT),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'NotoSansSC-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 8),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('FONTNAME', (0, 1), (-1, -1), 'NotoSansSC'),
        ('FONTSIZE', (0, 1), (-1, -1), 7),
        ('BACKGROUND', (0, 1), (-1, -1), colors.white),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, TABLE_STRIPE]),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]))
    elements.append(ai_table)
    elements.append(Spacer(1, 0.15 * inch))
    
    elements.append(Paragraph("1.3.2 Geomarketing & Location Analytics Resources", styles['H3Heading']))
    
    geo_resources = [
        ['Component', 'Purpose', 'Resource Requirement', 'Data Volume', 'Update Frequency'],
        ['GeoIP Enrichment', 'Real-time IP geolocation lookup', '4 vCPU, 16GB RAM, 100GB SSD', 'MaxMind DB (~200MB)', 'Weekly'],
        ['Tower/Cell Mapping', 'Subscriber location via cell towers', '8 vCPU, 32GB RAM, 500GB SSD', '~50K tower records', 'Daily'],
        ['Heat Map Engine', 'Security incident visualization', '4 vCPU, 16GB RAM, 200GB SSD', 'Aggregated events', 'Real-time'],
        ['Coverage Analysis', 'Network coverage gap detection', '6 vCPU, 24GB RAM, 300GB SSD', 'CDR + GIS data', 'Hourly'],
        ['Location Intelligence', 'Pattern analysis by region', '8 vCPU, 32GB RAM, 400GB SSD', 'Historical + live', 'On-demand'],
    ]
    
    geo_table = Table(geo_resources, colWidths=[1.15*inch, 1.65*inch, 1.35*inch, 1.1*inch, 0.95*inch])
    geo_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), ACCENT_2),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'NotoSansSC-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 8),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('FONTNAME', (0, 1), (-1, -1), 'NotoSansSC'),
        ('FONTSIZE', (0, 1), (-1, -1), 7),
        ('BACKGROUND', (0, 1), (-1, -1), colors.white),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, TABLE_STRIPE]),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]))
    elements.append(geo_table)
    elements.append(Spacer(1, 0.2 * inch))
    
    # 1.4 Network Topology
    elements.append(Paragraph("1.4 Network Topology & Connectivity", styles['SubsectionHeading']))
    
    network_text = """
    The SOC platform network architecture implements defense-in-depth principles with four isolated network 
    segments, each serving specific functional purposes. Network segmentation prevents lateral movement, 
    contains potential breaches, and ensures compliance with telecommunications security regulations. 
    All inter-network communication flows through controlled gateways with mandatory authentication and encryption.
    """
    elements.append(Paragraph(network_text.strip(), styles['DocBodyText']))
    
    networks = [
        ['Network Name', 'CIDR Range', 'Purpose', 'VLAN ID', 'Security Level', 'Bandwidth'],
        ['soc-frontend', '10.0.1.0/24', 'User-facing services, API gateway, web UI', 'VLAN 101', 'DMZ', '10Gbps'],
        ['soc-backend', '10.0.2.0/23', 'Application servers, databases, cache layer', 'VLAN 102-103', 'Internal', '25Gbps'],
        ['soc-events', '10.0.4.0/22', 'Event streaming, NSM tools, packet capture', 'VLAN 104-107', 'Restricted', '100Gbps'],
        ['soc-monitoring', '10.0.8.0/24', 'Monitoring, logging, metrics collection', 'VLAN 108', 'Management', '10Gbps'],
    ]
    
    net_table = Table(networks, colWidths=[1.0*inch, 0.95*inch, 1.85*inch, 0.75*inch, 0.85*inch, 0.7*inch])
    net_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), HEADER_FILL),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'NotoSansSC-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 8),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('FONTNAME', (0, 1), (-1, -1), 'NotoSansSC'),
        ('FONTSIZE', (0, 1), (-1, -1), 8),
        ('BACKGROUND', (0, 1), (-1, -1), colors.white),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, TABLE_STRIPE]),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]))
    elements.append(net_table)
    
    elements.append(PageBreak())
    return elements


def build_operations_manual(styles):
    """Build Part II: Operations Manual."""
    elements = []
    
    # Part Header
    elements.append(Paragraph("PART II: Operations Manual", styles['SectionHeading']))
    elements.append(HRFlowable(width="100%", thickness=2, color=HEADER_FILL, spaceBefore=5, spaceAfter=15))
    
    ops_intro = """
    This Operations Manual establishes standardized procedures for day-to-day management of the Djezzy SOC Platform. 
    It covers routine operational tasks, monitoring protocols, backup procedures, patch management workflows, and 
    incident response coordination. All procedures are designed to ensure consistent, reliable operation while 
    maintaining security posture and regulatory compliance requirements specific to Algerian telecommunications operators.
    """
    elements.append(Paragraph(ops_intro.strip(), styles['DocBodyText']))
    elements.append(Spacer(1, 0.15 * inch))
    
    # 2.1 Daily Operations
    elements.append(Paragraph("2.1 Daily Operational Procedures", styles['SubsectionHeading']))
    
    daily_intro = """
    Daily operations follow a structured shift-handover protocol with documented checklists for each operational period. 
    The SOC operates on a 24/7 schedule with three 8-hour shifts, each staffed by a minimum of two Level 1 analysts 
    and one Level 2 senior analyst. Shift handovers must include verbal briefing plus written documentation in the 
    shift log system covering ongoing incidents, pending tasks, and any anomalies observed during the previous shift.
    """
    elements.append(Paragraph(daily_intro.strip(), styles['DocBodyText']))
    
    elements.append(Paragraph("2.1.1 Morning Shift Start (08:00 UTC+1)", styles['H3Heading']))
    
    morning_tasks = [
        ['Task', 'Description', 'Frequency', 'Responsible Role', 'SLA Target'],
        ['System Health Check', 'Verify all 39 services showing HEALTHY status in dashboard', 'Every shift', 'L1 Analyst', '15 min completion'],
        ['Queue Review', 'Process overnight alerts, triage by severity', 'Every shift', 'L1 Analyst', '30 min review'],
        ['Backup Verification', 'Confirm nightly backups completed successfully', 'Daily', 'L2 Senior', 'Check within 1hr'],
        ['Capacity Review', 'Review CPU/Memory/Disk utilization trends', 'Daily', 'L2 Senior', 'Document anomalies'],
        ['Threat Feed Update', 'Verify MISP/OpenCTI feeds updated in last 24h', 'Daily', 'L1 Analyst', 'Flag if stale >48h'],
        ['Ticket Aging', 'Escalate tickets open >72hr without progress', 'Daily', 'L2 Senior', 'Escalate by 09:00'],
    ]
    
    morning_table = Table(morning_tasks, colWidths=[1.15*inch, 2.0*inch, 0.85*inch, 1.0*inch, 1.0*inch])
    morning_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), SEM_SUCCESS),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'NotoSansSC-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 8),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('FONTNAME', (0, 1), (-1, -1), 'NotoSansSC'),
        ('FONTSIZE', (0, 1), (-1, -1), 7),
        ('BACKGROUND', (0, 1), (-1, -1), colors.white),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, TABLE_STRIPE]),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    elements.append(morning_table)
    elements.append(Spacer(1, 0.15 * inch))
    
    elements.append(Paragraph("2.1.2 End-of-Day Procedures (20:00 UTC+1)", styles['H3Heading']))
    
    eod_tasks = [
        ['Task', 'Details', 'Documentation Required'],
        ['Shift Summary Report', 'Compile metrics: alerts processed, incidents opened/closed, escalations', 'Auto-generated + analyst notes'],
        ['Handover Briefing', 'Verbal handover to night shift with priority items highlighted', 'Handover checklist signed'],
        ['Pending Work Log', 'Document all incomplete tasks with status and next steps', 'Ticket updates required'],
        ['Anomaly Log', 'Record any unusual patterns or behaviors requiring follow-up', 'Incident ticket if needed'],
        ['Resource Utilization', 'Snapshot current resource usage for trend analysis', 'Automated dashboard export'],
    ]
    
    eod_table = Table(eod_tasks, colWidths=[1.3*inch, 2.8*inch, 1.8*inch])
    eod_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), SEM_WARNING),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'NotoSansSC-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 8),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('FONTNAME', (0, 1), (-1, -1), 'NotoSansSC'),
        ('FONTSIZE', (0, 1), (-1, -1), 8),
        ('BACKGROUND', (0, 1), (-1, -1), colors.white),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, TABLE_STRIPE]),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]))
    elements.append(eod_table)
    elements.append(Spacer(1, 0.2 * inch))
    
    # 2.2 Monitoring & Alerting
    elements.append(Paragraph("2.2 Monitoring & Alerting Framework", styles['SubsectionHeading']))
    
    monitor_intro = """
    The monitoring framework employs a multi-layer approach combining infrastructure metrics, application performance 
    monitoring, and security-specific alerting. Prometheus serves as the primary metrics collection engine with 15-second 
    scrape intervals for critical infrastructure and 30-second intervals for standard services. Grafana provides unified 
    dashboards with role-based access controlling visibility into different operational tiers based on analyst clearance level.
    """
    elements.append(Paragraph(monitor_intro.strip(), styles['DocBodyText']))
    
    elements.append(Paragraph("2.2.1 Critical Alerts (Immediate Response Required)", styles['H3Heading']))
    
    critical_alerts = [
        ['Alert Name', 'Condition', 'Threshold', 'Response Time', 'Escalation Path'],
        ['Service Down', 'Any of 39 services status != RUNNING', 'Immediate', '< 5 minutes', 'On-call -> Manager -> Director'],
        ['Database Connection Fail', 'PostgreSQL connection pool exhausted', '> 95% usage', '< 10 minutes', 'DBA -> Infrastructure Lead'],
        ['EPS Spike', 'Events per second exceeds baseline', '> 2x normal (100K EPS)', '< 15 minutes', 'L1 -> L2 -> Incident Commander'],
        ['Disk Critical', 'Storage utilization on any node', '> 90%', '< 30 minutes', 'Ops -> Storage Team'],
        ['Authentication Failure', 'Failed login attempts spike', '> 50/min per source', '< 5 minutes', 'Security -> IR Team'],
        ['Replication Lag', 'PostgreSQL or Kafka replication delay', '> 5 minutes', '< 15 minutes', 'DBA -> Infrastructure Lead'],
    ]
    
    crit_table = Table(critical_alerts, colWidths=[1.2*inch, 1.6*inch, 1.1*inch, 0.9*inch, 1.3*inch])
    crit_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), SEM_ERROR),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'NotoSansSC-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 8),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('FONTNAME', (0, 1), (-1, -1), 'NotoSansSC'),
        ('FONTSIZE', (0, 1), (-1, -1), 7),
        ('BACKGROUND', (0, 1), (-1, -1), colors.white),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, TABLE_STRIPE]),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    elements.append(crit_table)
    elements.append(Spacer(1, 0.15 * inch))
    
    elements.append(Paragraph("2.2.2 Dashboard Inventory", styles['H3Heading']))
    
    dashboards = [
        ['Dashboard Name', 'Purpose', 'Refresh Rate', 'Access Level', 'Key Panels'],
        ['SOC Overview', 'Executive summary of all systems', '30s', 'All roles', 'Service health, EPS, queue depth'],
        ['SIEM Operations', 'Wazuh alerts and investigations', '15s', 'L1+', 'Alert volume, top rules, MITRE map'],
        ['Infrastructure', 'Server and container health', '30s', 'L2+', 'CPU, memory, disk, network I/O'],
        ['Event Pipeline', 'Kafka and data flow metrics', '15s', 'L2+', 'Consumer lag, throughput, errors'],
        ['Threat Intelligence', 'MISP/OpenCTI feed status', '5min', 'L1+', 'Feed health, IOC counts, last update'],
        ['Geospatial', 'Security events by location', '60s', 'L1+', 'Heat map, regional breakdown, towers'],
    ]
    
    dash_table = Table(dashboards, colWidths=[1.15*inch, 1.55*inch, 0.75*inch, 0.75*inch, 1.8*inch])
    dash_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), SEM_INFO),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'NotoSansSC-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 8),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('FONTNAME', (0, 1), (-1, -1), 'NotoSansSC'),
        ('FONTSIZE', (0, 1), (-1, -1), 7),
        ('BACKGROUND', (0, 1), (-1, -1), colors.white),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, TABLE_STRIPE]),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    elements.append(dash_table)
    elements.append(Spacer(1, 0.2 * inch))
    
    # 2.3 Backup & Recovery
    elements.append(Paragraph("2.3 Backup & Recovery Procedures", styles['SubsectionHeading']))
    
    backup_intro = """
    Data protection strategy implements the 3-2-1 backup rule: three copies of data, two different media types, 
    one copy off-site (DR location). Backups are encrypted at rest using AES-256 encryption with keys managed 
    through HashiCorp Vault. Recovery procedures are tested quarterly during scheduled maintenance windows to 
    validate RPO/RPO targets and identify any procedure gaps before actual disaster scenarios occur.
    """
    elements.append(Paragraph(backup_intro.strip(), styles['DocBodyText']))
    
    backup_schedule = [
        ['Data Type', 'Backup Method', 'Frequency', 'Retention', 'RPO Target', 'Storage Location'],
        ['PostgreSQL DB', 'pg_basebackup + WAL archiving', 'Continuous (WAL)\nFull: Daily', '30 days\n7 days', '1 hour', 'NAS Primary + DR sync'],
        ['Elasticsearch Indices', 'Snapshot to S3-compatible', 'Incremental: Hourly\nFull: Weekly', '90 days\n30 days', '1 hour', 'Object Storage (local + DR)'],
        ['Redis Cache', 'RDB snapshot + AOF', 'RDB: Hourly\nAOF: Continuous', '24 hours\n1 hour', '5 minutes', 'Local NVMe + replica sync'],
        ['Kafka Topics', 'MirrorMaker to DR + S3', 'Real-time mirror\nBatch archive', '7 days\n90 days', '5 minutes', 'DR Cluster + Object Storage'],
        ['Configuration', 'Git repository backup', 'On change + Daily push', '365 days', 'Instant', 'GitLab + off-site backup'],
        ['Container Images', 'Registry replication', 'On push + Daily sync', 'Version history', 'Instant', 'Harbor Registry (primary + DR)'],
    ]
    
    backup_table = Table(backup_schedule, colWidths=[1.0*inch, 1.35*inch, 1.05*inch, 0.8*inch, 0.7*inch, 1.2*inch])
    backup_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), HEADER_FILL),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'NotoSansSC-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 7),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('FONTNAME', (0, 1), (-1, -1), 'NotoSansSC'),
        ('FONTSIZE', (0, 1), (-1, -1), 7),
        ('BACKGROUND', (0, 1), (-1, -1), colors.white),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, TABLE_STRIPE]),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    elements.append(backup_table)
    elements.append(Spacer(1, 0.2 * inch))
    
    # 2.4 Patch Management
    elements.append(Paragraph("2.4 Security Patch Management", styles['SubsectionHeading']))
    
    patch_intro = """
    Security patch management follows a risk-based prioritization matrix aligned with CVSS scores and threat 
    intelligence context. Critical patches (CVSS 9.0+) must be deployed within 72 hours of vendor release, high 
    severity (CVSS 7.0-8.9) within 14 days, and medium severity (CVSS 4.0-6.9) within 30 days. All patches undergo 
    testing in a staging environment mirroring production configuration before deployment to minimize operational risk.
    """
    elements.append(Paragraph(patch_intro.strip(), styles['DocBodyText']))
    
    patch_workflow = [
        ['Phase', 'Activities', 'Duration', 'Approvals Required', 'Rollback Plan'],
        ['1. Assessment', 'Identify affected systems, assess exploitability, check vendor advisories', '4-8 hours', 'Security Team Lead', 'Document impact scope'],
        ['2. Testing', 'Deploy to staging environment, run regression tests, validate functionality', '8-24 hours', 'QA Engineer', 'Staging snapshot restore'],
        ['3. Scheduling', 'Coordinate maintenance window, notify stakeholders, prepare communications', '2-4 hours', 'Operations Manager', 'Schedule rollback window'],
        ['4. Deployment', 'Apply patches using rolling updates, monitor health checks, verify services', '1-4 hours', 'Change Advisory Board', 'Automatic rollback on failure'],
        ['5. Validation', 'Run post-deployment checks, confirm vulnerability remediation, document results', '2-4 hours', 'Security Team Lead', 'Previous version available 7 days'],
    ]
    
    patch_table = Table(patch_workflow, colWidths=[0.85*inch, 2.0*inch, 0.8*inch, 1.2*inch, 1.2*inch])
    patch_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), ACCENT),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'NotoSansSC-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 8),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('FONTNAME', (0, 1), (-1, -1), 'NotoSansSC'),
        ('FONTSIZE', (0, 1), (-1, -1), 7),
        ('BACKGROUND', (0, 1), (-1, -1), colors.white),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, TABLE_STRIPE]),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    elements.append(patch_table)
    elements.append(Spacer(1, 0.2 * inch))
    
    # 2.5 Incident Response
    elements.append(Paragraph("2.5 Incident Response Workflow", styles['SubsectionHeading']))
    
    ir_intro = """
    The incident response workflow integrates directly with TheHive case management system and follows the NIST 
    Incident Response framework adapted for telecommunications SOC environments. All security incidents are classified 
    according to severity levels that determine response timelines, escalation paths, and communication requirements. 
    The workflow supports both automated response playbooks for common scenarios and manual investigation procedures 
    for complex or novel threats requiring human judgment and forensic analysis expertise.
    """
    elements.append(Paragraph(ir_intro.strip(), styles['DocBodyText']))
    
    ir_workflow = [
        ['Severity', 'Definition', 'Response SLA', 'Escalation', 'Communication', 'Example'],
        ['P1 - Critical', 'Active breach, data exfiltration, ransomware', '15 min acknowledge\n1 hour containment', 'IR Commander -> CISO -> CEO', 'Executive + Regulatory', 'APT with C2 established'],
        ['P2 - High', 'Confirmed compromise attempt, malware execution', '30 min acknowledge\n4 hours containment', 'IR Team Lead -> CISO', 'Management + Affected teams', 'Phishing with credential theft'],
        ['P3 - Medium', 'Suspicious activity, policy violation, recon', '2 hour acknowledge\n24 hours resolution', 'L2 Senior -> IR Team Lead', 'SOC team + Department head', 'Brute force attack detected'],
        ['P4 - Low', 'Informational, benign false positive, minor misconfig', '8 hour acknowledge\n72 hours resolution', 'L1 Analyst -> L2 Senior', 'SOC team only', 'Single failed login from VPN'],
    ]
    
    ir_table = Table(ir_workflow, colWidths=[0.85*inch, 1.4*inch, 1.1*inch, 1.15*inch, 1.1*inch, 1.2*inch])
    ir_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), SEM_ERROR),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'NotoSansSC-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 7),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('FONTNAME', (0, 1), (-1, -1), 'NotoSansSC'),
        ('FONTSIZE', (0, 1), (-1, -1), 7),
        ('BACKGROUND', (0, 1), (-1, -1), colors.white),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, TABLE_STRIPE]),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    elements.append(ir_table)
    
    elements.append(PageBreak())
    return elements


def build_quick_start_cheatsheet(styles):
    """Build Part III: Quick-Start Cheat Sheet."""
    elements = []
    
    # Part Header
    elements.append(Paragraph("PART III: Quick-Start Cheat Sheet", styles['SectionHeading']))
    elements.append(HRFlowable(width="100%", thickness=2, color=HEADER_FILL, spaceBefore=5, spaceAfter=15))
    
    qs_intro = """
    This Quick-Start Cheat Sheet provides rapid reference information for deployment teams installing or maintaining 
    the Djezzy SOC Platform. Commands are optimized for bash shell environments running Ubuntu 22.04 LTS or RHEL 9. 
    All commands assume appropriate sudo privileges and network connectivity to package repositories (or local mirrors 
    for air-gapped deployments). Keep this section accessible during initial deployment and troubleshooting sessions.
    """
    elements.append(Paragraph(qs_intro.strip(), styles['DocBodyText']))
    elements.append(Spacer(1, 0.15 * inch))
    
    # 3.1 Pre-Deployment Checklist
    elements.append(Paragraph("3.1 Pre-Deployment Checklist", styles['SubsectionHeading']))
    
    predep_items = [
        ['Category', 'Check Item', 'Command / Verification', 'Required Value'],
        ['OS', 'Operating System version', 'cat /etc/os-release | grep PRETTY_NAME', 'Ubuntu 22.04 LTS / RHEL 9.x'],
        ['OS', 'Kernel version (for BPF/ebpf)', 'uname -r', '>= 5.15 (prefer 6.x)'],
        ['Hardware', 'Total memory available', 'free -h | grep Mem:', 'Per server spec (min 64GB)'],
        ['Hardware', 'CPU cores available', 'nproc', 'Per server spec (min 16)'],
        ['Storage', 'Disk space for /var/lib/docker', 'df -h /var/lib/docker', 'Min 500GB free'],
        ['Network', 'DNS resolution working', 'dig github.com +short', 'Returns IP address'],
        ['Network', 'Connectivity to registry', 'curl -I https://registry-1.docker.io/v2/', 'HTTP 401 or 200'],
        ['Security', 'SELinux/AppArmor status', 'getenforce / aa-status', 'Enforcing (document exception)'],
        ['Security', 'Firewall rules reviewed', 'iptables -L -n | head -20', 'Ports documented below open'],
        ['Docker', 'Docker installed', 'docker --version', '>= 24.0'],
        ['Docker', 'Docker Compose plugin', 'docker compose version', '>= 2.20'],
        ['Docker', 'Daemon running', 'systemctl is-active docker', 'active'],
        ['Prerequisites', 'Git installed', 'git --version', '>= 2.40'],
        ['Prerequisites', 'Make installed', 'make --version', '>= 4.3'],
        ['Repository', 'Code cloned', 'ls -la docker-compose.prod.yml', 'File exists'],
    ]
    
    predep_table = Table(predep_items, colWidths=[0.85*inch, 1.7*inch, 2.1*inch, 1.45*inch])
    predep_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), SEM_SUCCESS),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'NotoSansSC-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 8),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('FONTNAME', (0, 1), (-1, -1), 'NotoSansSC'),
        ('FONTSIZE', (0, 1), (-1, -1), 7),
        ('BACKGROUND', (0, 1), (-1, -1), colors.white),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, TABLE_STRIPE]),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
    ]))
    elements.append(predep_table)
    elements.append(Spacer(1, 0.2 * inch))
    
    # 3.2 Docker Compose Deployment
    elements.append(Paragraph("3.2 Docker Compose Deployment", styles['SubsectionHeading']))
    
    dc_intro = """
    The Docker Compose deployment method is recommended for initial installations, development environments, and 
    single-site deployments. Production deployments should consider Kubernetes for improved orchestration, scaling, 
    and self-healing capabilities. The following commands assume you are in the project root directory containing 
    the docker-compose.prod.yml file cloned from the official repository.
    """
    elements.append(Paragraph(dc_intro.strip(), styles['DocBodyText']))
    
    elements.append(Paragraph("3.2.1 Initial Deployment Sequence", styles['H3Heading']))
    
    deploy_commands = [
        ['# Step 1: Create required directories for persistent volumes', ''],
        ['mkdir -p /data/soc/{postgres,redis,elasticsearch,kafka,wazuh,suricata,thehive,misp,grafana}', ''],
        ['chmod 750 /data/soc/*', ''],
        ['', ''],
        ['# Step 2: Copy environment template and configure', ''],
        ['cp .env.example .env', ''],
        ['vim .env  # Edit with your specific values (see Section 3.4)', ''],
        ['', ''],
        ['# Step 3: Pull all images (pre-download to reduce downtime)', ''],
        ['docker compose -f docker-compose.prod.yml pull', ''],
        ['', ''],
        ['# Step 4: Start infrastructure services first (databases, cache, message bus)', ''],
        ['docker compose -f docker-compose.prod.yml up -d postgresql redis-master pgbouncer \\', ''],
        ['  elasticsearch-data elasticsearch-master kafka-broker-1 kafka-broker-2 kafka-broker-3 zookeeper-1 zookeeper-2 zookeeper-3', ''],
        ['', ''],
        ['# Step 5: Wait for infrastructure readiness (approx 2-3 minutes)', ''],
        ['sleep 180 && docker compose -f docker-compose.prod.yml ps', ''],
        ['', ''],
        ['# Step 6: Start security tool services', ''],
        ['docker compose -f docker-compose.prod.yml up -d wazuh-manager wazuh-indexer grr-server \\', ''],
        ['  suricata zeek-controller arkime thehive cortex misp opencti openvas defectdojo', ''],
        ['', ''],
        ['# Step 7: Start application layer last', ''],
        ['docker compose -f docker-compose.prod.yml up -d kong nginx soc-platform', ''],
        ['', ''],
        ['# Step 8: Verify all services are healthy', ''],
        ['docker compose -f docker-compose.prod.yml ps --format "table {{.Name}}\\t{{.Status}}"', ''],
    ]
    
    cmd_table = Table(deploy_commands, colWidths=[6.3*inch])
    cmd_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, -1), 'Liberation Mono'),
        ('FONTSIZE', (0, 0), (-1, -1), 7.5),
        ('BACKGROUND', (0, 0), (-1, -1), CARD_BG),
        ('TEXTCOLOR', (0, 0), (-1, -1), TEXT_PRIMARY),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 2),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
        ('BOX', (0, 0), (-1, -1), 0.5, BORDER),
    ]))
    elements.append(cmd_table)
    elements.append(Spacer(1, 0.15 * inch))
    
    elements.append(Paragraph("3.2.2 Common Operations Commands", styles['H3Heading']))
    
    ops_commands = [
        ['Operation', 'Command'],
        ['View service logs (follow)', 'docker compose -f docker-compose.prod.yml logs -f --tail=100 <service-name>'],
        ['Restart single service', 'docker compose -f docker-compose.prod.yml restart <service-name>'],
        ['Scale a service', 'docker compose -f docker-compose.prod.yml up -d --scale <service-name>=<replicas>'],
        ['Stop all services', 'docker compose -f docker-compose.prod.yml down'],
        ['Stop and remove volumes', 'docker compose -f docker-compose.prod.yml down -v'],
        ['Check resource usage', 'docker stats --no-stream --format "table {{.Name}}\\t{{.CPUPerc}}\\t{{.MemUsage}}"'],
        ['Execute command in container', 'docker compose -f docker-compose.prod.yml exec <service-name> <command>'],
        ['View network connections', 'docker network inspect soc-frontend soc-backend soc-events soc-monitoring'],
    ]
    
    ops_table = Table(ops_commands, colWidths=[1.6*inch, 4.7*inch])
    ops_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), HEADER_FILL),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'NotoSansSC-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 8),
        ('FONTNAME', (0, 1), (0, -1), 'NotoSansSC-Bold'),
        ('FONTSIZE', (0, 1), (-1, -1), 7.5),
        ('FONTNAME', (1, 1), (1, -1), 'Liberation Mono'),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BACKGROUND', (0, 1), (-1, -1), colors.white),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, TABLE_STRIPE]),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(ops_table)
    elements.append(Spacer(1, 0.2 * inch))
    
    # 3.3 Kubernetes Deployment
    elements.append(Paragraph("3.3 Kubernetes Deployment (Helm Charts)", styles['SubsectionHeading']))
    
    k8s_intro = """
    For production deployments requiring high availability, automatic scaling, and advanced orchestration features, 
    the SOC platform provides Helm charts for Kubernetes deployment. The following procedures assume a working 
    Kubernetes cluster (version 1.28+) with kubectl configured and Helm 3.x installed. The charts support both 
    standalone installation and dependency-based deployment ordering.
    """
    elements.append(Paragraph(k8s_intro.strip(), styles['DocBodyText']))
    
    k8s_commands = [
        ['# Add the Djezzy SOC Helm repository', ''],
        ['helm repo add djezzy-soc https://charts.djezzy.dz/soc', ''],
        ['helm repo update', ''],
        ['', ''],
        ['# Install infrastructure dependencies first', ''],
        ['helm install postgresql djezzy-soc/postgresql -n soc-infrastructure --create-namespace \\', ''],
        ['  --set primary.persistence.size=8Ti,replica.enabled=true', ''],
        ['helm install redis djezzy-soc/redis -n soc-infrastructure \\', ''],
        ['  --set master.resources.requests.memory=256Gi,sentinel.enabled=true', ''],
        ['helm install kafka djezzy-soc/kafka -n soc-events --create-namespace \\', ''],
        ['  --set broker.replicaCount=3,zookeeper.replicaCount=3', ''],
        ['helm install elasticsearch djezzy-soc/elasticsearch -n soc-infrastructure \\', ''],
        ['  --set master.replicaCount=1,data.replicaCount=2,data.persistence.size=24Ti', ''],
        ['', ''],
        ['# Install security tools', ''],
        ['helm install wazuh djezzy-soc/wazuh -n soc-security --create-namespace', ''],
        ['helm install suricata djezzy-soc/suricata -n soc-security', ''],
        ['helm install thehive djezzy-soc/thehive -n soc-security', ''],
        ['helm install cortex djezzy-soc/cortex -n soc-security', ''],
        ['helm install misp djezzy-soc/misp -n soc-security', ''],
        ['', ''],
        ['# Install application layer', ''],
        ['helm install kong djezzy-soc/kong -n soc-frontend --create-namespace', ''],
        ['helm install soc-platform djezzy-soc/soc-platform -n soc-frontend \\', ''],
        ['  --set ingress.enabled=true,ingress.hostname=soc.djezzy.dz', ''],
        ['', ''],
        ['# Verify deployment status', ''],
        ['kubectl get pods -n soc-infrastructure,soc-events,soc-security,soc-frontend', ''],
    ]
    
    k8s_cmd_table = Table(k8s_commands, colWidths=[6.3*inch])
    k8s_cmd_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, -1), 'Liberation Mono'),
        ('FONTSIZE', (0, 0), (-1, -1), 7.5),
        ('BACKGROUND', (0, 0), (-1, -1), CARD_BG),
        ('TEXTCOLOR', (0, 0), (-1, -1), TEXT_PRIMARY),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 2),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
        ('BOX', (0, 0), (-1, -1), 0.5, BORDER),
    ]))
    elements.append(k8s_cmd_table)
    elements.append(Spacer(1, 0.2 * inch))
    
    # 3.4 Environment Variables
    elements.append(Paragraph("3.4 Environment Variables Reference", styles['SubsectionHeading']))
    
    env_intro = """
    The following environment variables must be configured in the .env file before deployment. Values shown are 
    examples only; replace them with production-appropriate credentials, certificates, and connection strings. 
    Never commit the .env file to version control; use secrets management (HashiCorp Vault, Kubernetes Secrets) 
    for sensitive values in production environments.
    """
    elements.append(Paragraph(env_intro.strip(), styles['DocBodyText']))
    
    env_vars = [
        ['Variable Name', 'Example Value', 'Description', 'Sensitive'],
        ['NODE_ENV', 'production', 'Application environment mode', 'No'],
        ['TZ', 'Africa/Algiers', 'Timezone for all containers', 'No'],
        ['POSTGRES_HOST', 'postgresql', 'PostgreSQL service hostname', 'No'],
        ['POSTGRES_PORT', '5432', 'PostgreSQL port', 'No'],
        ['POSTGRES_DB', 'soc_platform', 'Database name', 'No'],
        ['POSTGRES_USER', 'soc_admin', 'Database username', 'Yes'],
        ['POSTGRES_PASSWORD', '<generated-strong-password>', 'Database password (min 32 chars)', 'Yes'],
        ['REDIS_HOST', 'redis-master', 'Redis master hostname', 'No'],
        ['REDIS_PORT', '6379', 'Redis port', 'No'],
        ['REDIS_PASSWORD', '<generated-strong-password>', 'Redis auth password', 'Yes'],
        ['ELASTICSEARCH_HOSTS', 'http://elasticsearch-master:9200', 'ES cluster endpoints', 'No'],
        ['ELASTIC_PASSWORD', '<generated-strong-password>', 'ES built-in user password', 'Yes'],
        ['KAFKA_BOOTSTRAP_SERVERS', 'kafka-broker-1:9092,kafka-broker-2:9092,kafka-broker-3:9092', 'Kafka broker list', 'No'],
        ['WAZUH_API_URL', 'https://wazuh-manager:55000', 'Wazuh API endpoint', 'No'],
        ['WAZUH_API_USERNAME', 'wazuh-wui', 'Wazuh API username', 'Yes'],
        ['WAZUH_API_PASSWORD', '<generated-strong-password>', 'Wazuh API password', 'Yes'],
        ['THEHIVE_URL', 'http://thehive:9000', 'TheHive instance URL', 'No'],
        ['THEHIVE_API_KEY', '<generated-api-key>', 'TheHive API key (min 64 chars)', 'Yes'],
        ['CORTEX_URL', 'http://cortex:9001', 'Cortex analyzer URL', 'No'],
        ['MISP_URL', 'https://misp:443', 'MISP instance URL', 'No'],
        ['MISP_API_KEY', '<generated-api-key>', 'MISP authorization key', 'Yes'],
        ['OPENCTI_URL', 'http://opencti:8080', 'OpenCTI instance URL', 'No'],
        ['OPENCTI_API_KEY', '<generated-api-key>', 'OpenCTI API key', 'Yes'],
        ['GRAFANA_ADMIN_USER', 'admin', 'Grafana admin username', 'Yes'],
        ['GRAFANA_ADMIN_PASSWORD', '<generated-strong-password>', 'Grafana admin password', 'Yes'],
        ['KONG_PG_HOST', 'postgresql', 'Kong database host', 'No'],
        ['KONG_PG_PASSWORD', '<generated-strong-password>', 'Kong database password', 'Yes'],
        ['JWT_SECRET', '<random-256-bit-hex>', 'JWT signing secret', 'Yes'],
        ['ENCRYPTION_KEY', '<random-256-bit-hex>', 'Data-at-rest encryption key', 'Yes'],
    ]
    
    env_table = Table(env_vars, colWidths=[1.5*inch, 1.85*inch, 1.85*inch, 0.7*inch])
    env_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), ACCENT),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'NotoSansSC-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 7.5),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('FONTNAME', (0, 1), (-1, -1), 'NotoSansSC'),
        ('FONTSIZE', (0, 1), (-1, -1), 7),
        ('BACKGROUND', (0, 1), (-1, -1), colors.white),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, TABLE_STRIPE]),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
    ]))
    elements.append(env_table)
    
    elements.append(PageBreak())
    return elements


def build_wazuh_thehive_integration(styles):
    """Build Part IV: Wazuh + TheHive Integration Setup."""
    elements = []
    
    # Part Header
    elements.append(Paragraph("PART IV: Wazuh + TheHive Integration Setup", styles['SectionHeading']))
    elements.append(HRFlowable(width="100%", thickness=2, color=HEADER_FILL, spaceBefore=5, spaceAfter=15))
    
    integration_intro = """
    This section provides detailed implementation guidance for integrating Wazuh SIEM with TheHive case management 
    platform to enable automated incident creation, alert enrichment, and streamlined security operations workflows. 
    The integration uses Wazuh's active response mechanism combined with TheHive's REST API to automatically create 
    cases for high-severity alerts, attach relevant context (IOCs, affected assets, timeline), and optionally trigger 
    Cortex analyzers for automated threat intelligence enrichment.
    """
    elements.append(Paragraph(integration_intro.strip(), styles['DocBodyText']))
    elements.append(Spacer(1, 0.15 * inch))
    
    # 4.1 Architecture Overview
    elements.append(Paragraph("4.1 Integration Architecture Overview", styles['SubsectionHeading']))
    
    arch_text = """
    The Wazuh-TheHive integration follows an event-driven architecture where Wazuh alerts matching predefined criteria 
    are forwarded to TheHive via a webhook or custom integration script. The integration layer sits between the two 
    systems, performing alert filtering, deduplication, field mapping, and enrichment before creating TheHive cases. 
    This design ensures that only actionable, high-fidelity alerts reach the case management system while reducing 
    noise and analyst fatigue from low-priority informational events.
    """
    elements.append(Paragraph(arch_text.strip(), styles['DocBodyText']))
    
    arch_components = [
        ['Component', 'Technology', 'Function', 'Configuration Location'],
        ['Alert Source', 'Wazuh Manager', 'Generates security alerts from agents, logs, FIM, etc.', '/var/ossec/etc/ossec.conf'],
        ['Integration Script', 'Python (integration_helper.py)', 'Filters alerts, maps fields, calls TheHive API', '/var/ossec/integrations/thehive.py'],
        ['Case Management', 'TheHive Project', 'Stores cases, observables, tasks for analyst workflow', 'TheHive application.conf'],
        ['Analysis Engine', 'Cortex (optional)', 'Enriches IOCs with threat intel feeds', 'Cortex analyzer configurations'],
        ['Message Queue', 'Apache Kafka (optional)', 'Decouples alert generation from case creation for scale', 'Kafka topic: wazuh-alerts'],
    ]
    
    arch_table = Table(arch_components, colWidths=[1.1*inch, 1.35*inch, 2.0*inch, 1.65*inch])
    arch_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), HEADER_FILL),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'NotoSansSC-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 8),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('FONTNAME', (0, 1), (-1, -1), 'NotoSansSC'),
        ('FONTSIZE', (0, 1), (-1, -1), 7.5),
        ('BACKGROUND', (0, 1), (-1, -1), colors.white),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, TABLE_STRIPE]),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]))
    elements.append(arch_table)
    elements.append(Spacer(1, 0.2 * inch))
    
    # 4.2 Wazuh Configuration
    elements.append(Paragraph("4.2 Wazuh Configuration for TheHive Integration", styles['SubsectionHeading']))
    
    wazuh_config_text = """
    Configure Wazuh to forward alerts to TheHive by modifying the main ossec.conf file to include the integration 
    definition and setting up alert rules that trigger the integration. The configuration below shows the minimal 
    setup required; customize rule IDs and severity thresholds based on your organization's risk tolerance and 
    operational capacity for handling incoming cases.
    """
    elements.append(Paragraph(wazuh_config_text.strip(), styles['DocBodyText']))
    
    elements.append(Paragraph("4.2.1 Integration Definition in ossec.conf", styles['H3Heading']))
    
    wazuh_config = [
        ['<!-- Add inside <ossec_config> block in /var/ossec/etc/ossec.conf -->', ''],
        ['<integration>', ''],
        ['  <!-- TheHive integration endpoint -->', ''],
        ['  <name>thehive</name>', ''],
        ['  <!-- Hook URL for TheHive API -->', ''],
        ['  <hook_url>http://thehive:9000</hook_url>', ''],
        ['  <!-- TheHive API key (generate in TheHive UI) -->', ''],
        ['  <api_key>YOUR_THEHIVE_API_KEY_HERE</api_key>', ''],
        ['  <!-- Only forward alerts with severity >= 10 (adjust as needed) -->', ''],
        ['  <level>10</level>', ''],
        ['  <!-- Alert rules to integrate (comma-separated) -->', ''],
        ['  <rule_id>5501,5502,5503,5510,5512,5515,5540,5550,5553,5560,5570</rule_id>', ''],
        ['  <!-- Group filter (optional, restrict to specific agent groups) -->', ''],
        ['  <group>webserver,database,critical_servers</group>', ''],
        ['  <!-- Enable alert deduplication (group similar alerts) -->', ''],
        ['  <alert_format>json</alert_format>', ''],
        ['  <max_alerts_per_group>10</max_alerts_per_group>', ''],
        ['  <group_timeout>300</group_timeout>', ''],
        ['</integration>', ''],
    ]
    
    wazuh_cfg_table = Table(wazuh_config, colWidths=[6.3*inch])
    wazuh_cfg_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, -1), 'Liberation Mono'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('BACKGROUND', (0, 0), (-1, -1), CARD_BG),
        ('TEXTCOLOR', (0, 0), (-1, -1), TEXT_PRIMARY),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 2),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
        ('BOX', (0, 0), (-1, -1), 0.5, BORDER),
    ]))
    elements.append(wazuh_cfg_table)
    elements.append(Spacer(1, 0.15 * inch))
    
    elements.append(Paragraph("4.2.2 Custom Rules for TheHive Triggering", styles['H3Heading']))
    
    rules_text = """
    Define custom rules in /var/ossec/etc/rules/local_rules.xml to categorize alerts that should automatically 
    create TheHive cases. The example rules below cover common attack patterns; extend these based on your threat 
    model and historical incident data. Each rule should have a clear description that becomes part of the case title 
    in TheHive for analyst context.
    """
    elements.append(Paragraph(rules_text.strip(), styles['DocBodyText']))
    
    custom_rules = [
        ['<!-- Local rules for TheHive integration -->', ''],
        ['<group name="thehive_auto_create">', ''],
        ['', ''],
        ['  <!-- Rule: Authentication brute force detected -->', ''],
        ['  <rule id="100101" level="12" maxsize="2048">', ''],
        ['    <if_sid>5501</if_sid>', ''],
        ['    <field name="authentication.failure">^.*$</field>', ''],
        ['    <description>Brute-force authentication attack detected from srcip: $(src.ip)</description>', ''],
        ['    <group>authentication_attack,brute_force,thehive_critical</group>', ''],
        ['  </rule>', ''],
        ['', ''],
        ['  <!-- Rule: Web application attack (SQL injection pattern) -->', ''],
        ['  <rule id="100102" level="13" maxsize="4096">', ''],
        ['    <if_sid>31151</if_sid>', ''],
        ['    <field name="web.attack">(?i)(union.*select|select.*from|insert.*into)</field>', ''],
        ['    <description>Potential SQL injection attack on $(data.url)</description>', ''],
        ['    <group>webapp_attack,sqli,thehive_critical</group>', ''],
        ['  </rule>', ''],
        ['', ''],
        ['  <!-- Rule: File integrity modification on critical path -->', ''],
        ['  <rule id="100103" level="11" maxsize="1024">', ''],
        ['    <if_sid>554</if_sid>', ''],
        ['    <field name="syscheck.path">(?:/etc|/bin|/usr/bin|/usr/sbin)</field>', ''],
        ['    <description>Critical system file modified: $(syscheck.path)</description>', ''],
        ['    <group>fim_integrity,thehive_high</group>', ''],
        ['  </rule>', ''],
        ['', ''],
        ['  <!-- Rule: Malware detection by rootcheck -->', ''],
        ['  <rule id="100104" level="14" maxsize="2048">', ''],
        ['    <if_sid>530</if_sid>', ''],
        ['    <description>Rootkit or malware indicator detected: $(rootcheck.malware)</description>', ''],
        ['    <group>malware,rootkit,thehive_critical</group>', ''],
        ['  </rule>', ''],
        ['', ''],
        ['  <!-- Rule: Suspicious process execution -->', ''],
        ['  <rule id="100105" level="10" maxsize="2048">', ''],
        ['    <if_sid>594</if_sid>', ''],
        ['    <field name="audit.executable">(?:nc|ncat|nmap|nikto|sqlmap)</field>', ''],
        ['    <description>Suspicious security tool executed: $(audit.executable)</description>', ''],
        ['    <group>suspicious_process,thehive_medium</group>', ''],
        ['  </rule>', ''],
        ['', ''],
        ['</group>', ''],
    ]
    
    rules_table = Table(custom_rules, colWidths=[6.3*inch])
    rules_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, -1), 'Liberation Mono'),
        ('FONTSIZE', (0, 0), (-1, -1), 7.5),
        ('BACKGROUND', (0, 0), (-1, -1), CARD_BG),
        ('TEXTCOLOR', (0, 0), (-1, -1), TEXT_PRIMARY),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 2),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
        ('BOX', (0, 0), (-1, -1), 0.5, BORDER),
    ]))
    elements.append(rules_table)
    elements.append(Spacer(1, 0.2 * inch))
    
    # 4.3 TheHive Configuration
    elements.append(Paragraph("4.3 TheHive Receiver Configuration", styles['SubsectionHeading']))
    
    thehive_intro = """
    TheHive must be configured to accept incoming alerts from Wazuh and properly route them to the correct case 
    templates. Configuration involves creating a dedicated organization for Wazuh alerts, configuring the case 
    template with appropriate custom fields, and setting up the webhook receiver endpoint that parses incoming 
    JSON payloads and creates cases with proper taxonomy and observable extraction.
    """
    elements.append(Paragraph(thehive_intro.strip(), styles['DocBodyText']))
    
    elements.append(Paragraph("4.3.1 TheHive Application Configuration", styles['H3Heading']))
    
    thehive_config = [
        ['# In /etc/thehive/application.conf', ''],
        ['', ''],
        ['# Enable CORS for Wazuh manager origin (if needed)', ''],
        ['play.filters.cors.allowedOrigins = ["http://wazuh-manager:5601"]', ''],
        ['', ''],
        ['# Configure case template for Wazuh alerts', ''],
        ['# Fields: severity, category, source_ip, target_host, rule_id, mitre_technique', ''],
        ['', ''],
        ['# Increase maximum case title length for detailed alert descriptions', ''],
        ['case.title.maxSize = 200', ''],
        ['', ''],
        ['# Configure observable types to extract from alerts', ''],
        ['observable.types = ["ip","domain","hash","filename","url","user-agent"]', ''],
        ['', ''],
        ['# Enable Cortex integration for auto-analysis', ''],
        ['cortex.servers = [{"name":"cortex-local","url":"http://cortex:9001"}]', ''],
        ['', ''],
        ['# Auto-run analyzers on new cases from Wazuh', ''],
        ['cortex.autoAnalyzers = [" VirusTotal_GetReport_2_0",', ''],
        ['                          " MISP_Search_v2",', ''],
        ['                          " AbuseIPDB_Query",', ''],
        ['                          " ThreatFox_IntelligenceSearch" ]', ''],
    ]
    
    thehive_cfg_table = Table(thehive_config, colWidths=[6.3*inch])
    thehive_cfg_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, -1), 'Liberation Mono'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('BACKGROUND', (0, 0), (-1, -1), CARD_BG),
        ('TEXTCOLOR', (0, 0), (-1, -1), TEXT_PRIMARY),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 2),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
        ('BOX', (0, 0), (-1, -1), 0.5, BORDER),
    ]))
    elements.append(thehive_cfg_table)
    elements.append(Spacer(1, 0.15 * inch))
    
    elements.append(Paragraph("4.3.2 Integration Script (thehive.py)", styles['H3Heading']))
    
    script_intro = """
    Place this Python script in /var/ossec/integrations/thehive.py on the Wazuh manager server. The script receives 
    alerts from Wazuh's integration framework, extracts relevant fields, constructs TheHive API requests, and creates 
    cases with observables attached. Customize the severity mapping and field extraction logic to match your operational requirements.
    """
    elements.append(Paragraph(script_intro.strip(), styles['DocBodyText']))
    
    integration_script = [
        ['#!/usr/bin/env python3', ''],
        ['"""Wazuh to TheHive Integration Script"""', ''],
        ['', ''],
        ['import json', ''],
        ['import sys', ''],
        ['import requests', ''],
        ['import socket', ''],
        ['from datetime import datetime', ''],
        ['', ''],
        ['# Configuration - Update with your TheHive details', ''],
        ['THEHIVE_URL = "http://thehive:9000"', ''],
        ['THEHIVE_API_KEY = "${THEHIVE_API_KEY}"  # From environment variable', ''],
        ['', ''],
        ['# Severity mapping: Wazuh level -> TheHive severity (1-4)', ''],
        ['SEVERITY_MAP = {', ''],
        ['    range(0, 5): 1,   # Low', ''],
        ['    range(5, 8): 2,   # Medium', ''],
        ['    range(8, 11): 3,  # High', ''],
        ['    range(11, 16): 4, # Critical', ''],
        ['}', ''],
        ['', ''],
        ['# TLP (Traffic Light Protocol) default', ''],
        ['DEFAULT_TLP = 2  # Amber', ''],
        ['', ''],
        ['def get_severity(level):', ''],
        ['    """Map Wazuh alert level to TheHive severity."""', ''],
        ['    for levels, sev in SEVERITY_MAP.items():', ''],
        ['        if int(level) in levels:', ''],
        ['            return sev', ''],
        ['    return 2  # Default medium', ''],
        ['', ''],
        ['def extract_observables(alert):', ''],
        ['    """Extract observables from Wazuh alert data."""', ''],
        ['    observables = []', ''],
        ['    data = alert.get("data", {})', ''],
        ['    ', ''],
        ['    # Source IP address', ''],
        ['    src_ip = data.get("srcip") or alert.get("srcip")', ''],
        ['    if src_ip:', ''],
        ['        observables.append({', ''],
        ['            "dataType": "ip",', ''],
        ['            "data": src_ip,', ''],
        ["            \"tlp\": DEFAULT_TLP,", ""],
        ['            "tags": ["source-ip", "wazuh"]', ''],
        ['        })', ''],
        ['    ', ''],
        ['    # Destination IP/hostname', ''],
        ['    dst_ip = data.get("dstip") or alert.get("dstip")', ''],
        ['    if dst_ip:', ''],
        ['        observables.append({', ''],
        ['            "dataType": "ip",', ''],
        ['            "data": dst_ip,', ''],
        ["            \"tlp\": DEFAULT_TLP,", ""],
        ['            "tags": ["destination-ip", "wazuh"]', ''],
        ['        })', ''],
        ['    ', ''],
        ['    # URL (from web attacks)', ''],
        ['    url = data.get("url")', ''],
        ['    if url:', ''],
        ['        observables.append({', ''],
        ['            "dataType": "url",', ''],
        ['            "data": url,', ''],
        ["            \"tlp\": DEFAULT_TLP,", ""],
        ['            "tags": ["attack-url", "wazuh"]', ''],
        ['        })', ''],
        ['    ', ''],
        ['    # File hash (from FIM alerts)', ''],
        ['    file_hash = data.get("syscheck.md5_after") or data.get("syscheck.sha256_after")', ''],
        ['    if file_hash:', ''],
        ['        dtype = "md5" if len(file_hash) == 32 else "sha256"', ''],
        ['        observables.append({', ''],
        ['            "dataType": dtype,', ''],
        ['            "data": file_hash,', ''],
        ["            \"tlp\": DEFAULT_TLP,", ""],
        ['            "tags": ["file-hash", "wazuh"]', ''],
        ['        })', ''],
        ['    ', ''],
        ['    return observables', ''],
        ['', ''],
        ['def build_case_title(alert):', ''],
        ['    """Generate descriptive case title from alert."""', ''],
        ['    rule_desc = alert.get("rule", {}).get("description", "Unknown alert")', ''],
        ['    agent_name = alert.get("agent", {}).get("name", "unknown-agent")', ''],
        ['    timestamp = alert.get("timestamp", "")[:19]', ''],
        ['    return f"[Wazuh] {rule_desc} on {agent_name} ({timestamp})"', ''],
        ['', ''],
        ['def build_case_description(alert):', ''],
        ['    """Generate detailed case description with full alert context."""', ''],
        ['    rule = alert.get("rule", {})', ''],
        ['    agent = alert.get("agent", {})', ''],
        ['    ', ''],
        ['    desc = f"""## Wazuh Alert Details', ''],
        ['', ''],
        ['**Rule ID:** {rule.get("id")}  ', ''],
        ['**Level:** {rule.get("level")}  ', ''],
        ['**Description:** {rule.get("description")}  ', ''],
        ['', ''],
        ['### Agent Information', ''],
        ['- **Hostname:** {agent.get("name")}  ', ''],
        ['- **IP Address:** {agent.get("ip")}  ', ''],
        ['- **ID:** {agent.get("id")}  ', ''],
        ['', ''],
        ['### Full Alert Payload', ''],
        ['```json', ''],
        ['{json.dumps(alert, indent=2)}', ''],
        ['```', ''],
        ['', ''],
        ['---', ''],
        ['*Automatically created by Wazuh-TheHive integration*', ''],
        ['"""', ''],
        ['    return desc', ''],
        ['', ''],
        ['def create_case(alert):', ''],
        ['    """Create a new case in TheHive from Wazuh alert."""', ''],
        ['    headers = {', ''],
        ['        "Authorization": f"Bearer {THEHIVE_API_KEY}",', ''],
        ['        "Content-Type": "application/json"', ''],
        ['    }', ''],
        ['    ', ''],
        ['    case_payload = {', ''],
        ['        "title": build_case_title(alert),', ''],
        ['        "description": build_case_description(alert),', ''],
        ['        "severity": get_severity(alert.get("rule", {}).get("level", 0)),', ''],
        ["        \"tlp\": DEFAULT_TLP,", ""],
        ['        "tags": ["wazuh", "auto-created", f"rule-{alert.get(\"rule\", {}).get(\"id\")}"],', ''],
        ['        "observables": extract_observables(alert),', ''],
        ['    }', ''],
        ['    ', ''],
        ['    try:', ''],
        ['        response = requests.post(', ''],
        ['            f"{THEHIVE_URL}/api/case",', ''],
        ['            headers=headers,', ''],
        ['            json=case_payload,', ''],
        ['            timeout=30', ''],
        ['        )', ''],
        ['        response.raise_for_status()', ''],
        ['        case_id = response.json().get("_id")', ''],
        ['        print(f"Successfully created case: {case_id}", file=sys.stderr)', ''],
        ['        return True', ''],
        ['    except Exception as e:', ''],
        ['        print(f"Error creating case: {str(e)}", file=sys.stderr)', ''],
        ['        return False', ''],
        ['', ''],
        ['def main():', ''],
        ['    """Main entry point called by Wazuh integration framework."""', ''],
        ['    if len(sys.argv) < 2:', ''],
        ['        print("Usage: thehive.py <alert_json_file>", file=sys.stderr)', ''],
        ['        sys.exit(1)', ''],
        ['    ', ''],
        ['    alert_file = sys.argv[1]', ''],
        ['    try:', ''],
        ['        with open(alert_file) as f:', ''],
        ['            alert = json.load(f)', ''],
        ['        success = create_case(alert)', ''],
        ['        sys.exit(0 if success else 1)', ''],
        ['    except Exception as e:', ''],
        ['        print(f"Fatal error: {str(e)}", file=sys.stderr)', ''],
        ['        sys.exit(2)', ''],
        ['', ''],
        ['if __name__ == "__main__":', ''],
        ['    main()', ''],
    ]
    
    script_table = Table(integration_script, colWidths=[6.3*inch])
    script_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, -1), 'Liberation Mono'),
        ('FONTSIZE', (0, 0), (-1, -1), 7),
        ('BACKGROUND', (0, 0), (-1, -1), CARD_BG),
        ('TEXTCOLOR', (0, 0), (-1, -1), TEXT_PRIMARY),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 1),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 1),
        ('BOX', (0, 0), (-1, -1), 0.5, BORDER),
    ]))
    elements.append(script_table)
    elements.append(Spacer(1, 0.2 * inch))
    
    # 4.4 Automated Workflow
    elements.append(Paragraph("4.4 Automated Case Creation Workflow", styles['SubsectionHeading']))
    
    workflow_text = """
    The complete automated workflow from alert generation to analyst-ready case involves multiple stages of 
    processing, enrichment, and routing. Understanding this flow helps troubleshoot integration issues and 
    optimize the pipeline for reduced latency between alert occurrence and analyst notification. The typical 
    end-to-end latency from Wazuh alert generation to TheHive case creation should be under 5 seconds under 
    normal load conditions.
    """
    elements.append(Paragraph(workflow_text.strip(), styles['DocBodyText']))
    
    workflow_steps = [
        ['Stage', 'Component', 'Action', 'Duration', 'Error Handling'],
        ['1. Detection', 'Wazuh Agent', 'Detects anomaly, generates alert locally', '< 1 sec', 'Buffer locally if manager unreachable'],
        ['2. Collection', 'Wazuh Manager', 'Receives alert, evaluates rules, assigns level', '< 500ms', 'Queue for retry on failure'],
        ['3. Filtering', 'Integration Config', 'Checks rule_id, level, group against filters', '< 100ms', 'Drop non-matching alerts silently'],
        ['4. Transformation', 'thehive.py', 'Maps fields, extracts observables, builds payload', '< 1 sec', 'Log error, continue next alert'],
        ['5. Transmission', 'HTTP Client', 'POST to TheHive /api/case endpoint', '< 2 sec', 'Retry with exponential backoff'],
        ['6. Creation', 'TheHive Server', 'Validates payload, creates case, assigns ID', '< 500ms', 'Return 400/500 with error details'],
        ['7. Enrichment', 'Cortex (async)', 'Runs analyzers on observables (background)', '30s - 5min', 'Queue for retry on timeout'],
        ['8. Notification', 'TheHive', 'Sends notification to assigned analysts', '< 5 sec', 'Queue if notification fails'],
    ]
    
    workflow_table = Table(workflow_steps, colWidths=[0.85*inch, 1.1*inch, 1.85*inch, 0.75*inch, 1.65*inch])
    workflow_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), ACCENT_2),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'NotoSansSC-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 8),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('FONTNAME', (0, 1), (-1, -1), 'NotoSansSC'),
        ('FONTSIZE', (0, 1), (-1, -1), 7),
        ('BACKGROUND', (0, 1), (-1, -1), colors.white),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, TABLE_STRIPE]),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    elements.append(workflow_table)
    elements.append(Spacer(1, 0.2 * inch))
    
    # 4.5 Testing & Validation
    elements.append(Paragraph("4.5 Testing & Validation Procedures", styles['SubsectionHeading']))
    
    test_intro = """
    After completing the integration configuration, execute the following validation procedures to confirm 
    correct operation. Testing should be performed in a staging environment before production deployment, 
    and re-executed after any configuration changes or software updates to prevent regressions.
    """
    elements.append(Paragraph(test_intro.strip(), styles['DocBodyText']))
    
    test_procedures = [
        ['Test Case', 'Procedure', 'Expected Result', 'Validation Command'],
        ['API Connectivity', 'Test HTTP connectivity from Wazuh to TheHive', 'HTTP 200 from /api/status', 'curl -s -o /dev/null -w "%{http_code}" http://thehive:9000/api/status'],
        ['Authentication', 'Validate API key works for case creation', 'HTTP 201 with case ID', 'curl -X POST http://thehive:9000/api/case -H "Authorization: Bearer $KEY" -d \'{"title":"test"}\''],
        ['Alert Generation', 'Trigger test alert on Wazuh agent', 'Alert appears in Wazuh dashboard', 'Generate test event matching integrated rule'],
        ['Case Creation', 'Verify case created in TheHive', 'New case visible with correct title', 'Check TheHive Cases tab for "[Wazuh]" prefix'],
        ['Observable Extraction', 'Verify IOCs extracted correctly', 'Observables attached to case', 'Open case, check Observables tab'],
        ['Cortex Enrichment', 'Confirm analyzers ran successfully', 'Reports attached to observables', 'Wait 2-5min, refresh observables'],
        ['High Volume Load', 'Send 100 alerts/second for 5 minutes', 'No dropped alerts, <10s latency', 'Monitor Wazuh queues and TheHive response times'],
        ['Error Handling', 'Stop TheHive, send test alert', 'Wazuh logs error, retries gracefully', 'Check /var/ossec/logs/integrations.log'],
    ]
    
    test_table = Table(test_procedures, colWidths=[1.05*inch, 1.6*inch, 1.5*inch, 2.0*inch])
    test_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), SEM_SUCCESS),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'NotoSansSC-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 7.5),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('FONTNAME', (0, 1), (-1, -1), 'NotoSansSC'),
        ('FONTSIZE', (0, 1), (-1, -1), 7),
        ('BACKGROUND', (0, 1), (-1, -1), colors.white),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, TABLE_STRIPE]),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    elements.append(test_table)
    
    elements.append(PageBreak())
    return elements


def build_appendices(styles):
    """Build appendices: Port mapping and troubleshooting guide."""
    elements = []
    
    # Appendix A: Port Mapping
    elements.append(Paragraph("Appendix A: Port Mapping Reference", styles['SectionHeading']))
    elements.append(HRFlowable(width="100%", thickness=2, color=HEADER_FILL, spaceBefore=5, spaceAfter=15))
    
    port_intro = """
    Complete port reference for all 39 services in the SOC platform. Use this table when configuring firewall rules, 
    network policies, or troubleshooting connectivity issues between services. Internal ports are used for 
    inter-service communication within Docker networks; external ports are exposed to the host for access from 
    outside the container environment or from other network segments.
    """
    elements.append(Paragraph(port_intro.strip(), styles['DocBodyText']))
    elements.append(Spacer(1, 0.1 * inch))
    
    ports = [
        ['Service', 'Internal Port', 'External Port', 'Protocol', 'Network', 'Purpose'],
        ['PostgreSQL', '5432', '5432', 'TCP', 'soc-backend', 'Primary database'],
        ['PgBouncer', '6432', '6432', 'TCP', 'soc-backend', 'Connection pooling'],
        ['Redis Master', '6379', '6379', 'TCP', 'soc-backend', 'Cache/session store'],
        ['Redis Sentinel', '26379', '26379', 'TCP', 'soc-backend', 'Redis HA monitoring'],
        ['Elasticsearch', '9200', '9200', 'TCP', 'soc-backend', 'Search/index API'],
        ['ES Transport', '9300', '-', 'TCP', 'soc-backend', 'Inter-node communication'],
        ['Kibana', '5601', '5601', 'TCP', 'soc-frontend', 'Visualization UI'],
        ['Kafka Broker', '9092', '9092', 'TCP', 'soc-events', 'Message broker clients'],
        ['Kafka Internal', '9093', '-', 'TCP', 'soc-events', 'Inter-broker communication'],
        ['Zookeeper', '2181', '2181', 'TCP', 'soc-events', 'Kafka coordination'],
        ['Wazuh Manager', '1514', '1514', 'UDP/TCP', 'soc-backend', 'Agent data ingestion'],
        ['Wazuh API', '55000', '55000', 'TCP', 'soc-frontend', 'REST API'],
        ['Wazuh Indexer', '9200', '-', 'TCP', 'soc-backend', 'Wazuh ES backend'],
        ['GRR Server', '8000', '8000', 'TCP', 'soc-backend', 'EDR administration'],
        ['GRR Agent', '8080', '-', 'TCP', 'soc-backend', 'Agent communication'],
        ['Suricata', '7736', '7736', 'TCP', 'soc-events', 'EVE JSON output'],
        ['Suricata Stats', '7737', '7737', 'TCP', 'soc-events', 'Statistics socket'],
        ['Zeek Controller', '50000', '-', 'TCP', 'soc-events', 'Management interface'],
        ['Arkime Viewer', '8005', '8005', 'TCP', 'soc-frontend', 'PCAP viewer UI'],
        ['Arkime Capture', '-', '-', 'TCP', 'soc-events', 'Packet capture (transparent)'],
        ['TheHive', '9000', '9000', 'TCP', 'soc-frontend', 'Case management UI/API'],
        ['Cortex', '9001', '9001', 'TCP', 'soc-backend', 'Analyzer engine API'],
        ['MISP', '443', '443', 'TCP', 'soc-frontend', 'Threat intelligence platform'],
        ['OpenCTI', '8080', '8080', 'TCP', 'soc-frontend', 'Threat intelligence (STIX)'],
        ['OpenVAS/GVM', '9392', '9392', 'TCP', 'soc-backend', 'Vulnerability scanner'],
        ['DefectDojo', '8080', '8080', 'TCP', 'soc-frontend', 'Vulnerability management'],
        ['Prometheus', '9090', '9090', 'TCP', 'soc-monitoring', 'Metrics collection'],
        ['Grafana', '3000', '3000', 'TCP', 'soc-frontend', 'Dashboards/alerting'],
        ['Alertmanager', '9093', '9093', 'TCP', 'soc-monitoring', 'Alert routing/deduplication'],
        ['Kong Admin', '8001', '8001', 'TCP', 'soc-frontend', 'Gateway administration'],
        ['Kong Proxy', '8000', '80/443', 'TCP', 'soc-frontend', 'API proxy (public)'],
        ['Nginx', '80/443', '80/443', 'TCP', 'soc-frontend', 'Reverse proxy (public)'],
        ['SOC Platform', '3000', '-', 'TCP', 'soc-frontend', 'Next.js application'],
    ]
    
    port_table = Table(ports, colWidths=[1.1*inch, 0.8*inch, 0.8*inch, 0.7*inch, 1.0*inch, 1.8*inch])
    port_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), HEADER_FILL),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'NotoSansSC-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 7.5),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('FONTNAME', (0, 1), (-1, -1), 'NotoSansSC'),
        ('FONTSIZE', (0, 1), (-1, -1), 7),
        ('BACKGROUND', (0, 1), (-1, -1), colors.white),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, TABLE_STRIPE]),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
        ('TOPPADDING', (0, 0), (-1, -1), 2),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
    ]))
    elements.append(port_table)
    elements.append(Spacer(1, 0.2 * inch))
    
    # Appendix B: Troubleshooting
    elements.append(Paragraph("Appendix B: Troubleshooting Guide", styles['SectionHeading']))
    elements.append(HRFlowable(width="100%", thickness=2, color=HEADER_FILL, spaceBefore=5, spaceAfter=15))
    
    troubleshoot_intro = """
    This troubleshooting guide addresses common issues encountered during deployment and operation of the Djezzy SOC Platform. 
    Each issue includes symptoms, diagnostic steps, and recommended resolutions. For issues not covered here, consult the 
    component-specific documentation or escalate to the platform engineering team with relevant logs collected.
    """
    elements.append(Paragraph(troubleshoot_intro.strip(), styles['DocBodyText']))
    elements.append(Spacer(1, 0.1 * inch))
    
    issues = [
        ['Issue', 'Symptoms', 'Diagnostic Steps', 'Resolution'],
        ['Service fails to start', 'Container exits immediately, Exit code 1', 'docker logs <service>, Check .env variables, Verify volume permissions', 'Fix config errors, chown volumes to correct UID'],
        ['Database connection refused', 'Cannot connect to PostgreSQL on port 5432', 'docker ps | grep postgresql, Check pg_isready, Verify network connectivity', 'Wait for DB ready state, Check pg_hba.conf'],
        ['Kafka consumer lag increasing', 'Alerts delayed, Events backlog growing', 'kafka-consumer-groups --describe, Check broker health, Monitor network I/O', 'Scale consumers, Increase partition count, Check topic retention'],
        ['Elasticsearch cluster red', 'Some indices unavailable, Search failures', '_cluster/health?pretty, _cat/allocation?v, Check disk watermarks', 'Add nodes, Clear disk space, _cluster/reroute'],
        ['Wazuh agents disconnected', 'Agents show "Never connected" or "Disconnected"', 'List agents in Wazuh UI, Check agent.log on endpoint, Verify firewall rules', 'Restart agent service, Check 1514/1515 port access'],
        ['TheHive cases not created', 'Wazuh alerts present but no corresponding cases', 'Check integrations.log, Test API key manually, Verify webhook URL', 'Update THEHIVE_API_KEY, Restart wazuh-manager'],
        ['High memory usage', 'OOM kills, System swapping', 'docker stats, free -h, Check JVM heap settings', 'Adjust container limits, Tune JVM -Xmx, Scale horizontally'],
        ['SSL/TLS certificate errors', 'HTTPS connections failing, Certificate warnings', 'openssl s_client -connect host:port, Check cert expiry, Verify CA chain', 'Renew certificates, Update truststore, Regenerate with correct SANs'],
        ['Kong gateway 502/504', 'Upstream errors, Timeout responses', 'kong logs, Check upstream health, Verify DNS resolution', 'Restart upstream service, Adjust Kong timeouts'],
        ['Grafana dashboards empty', 'No data displayed, Panel errors', 'Check Prometheus datasource, Verify query syntax, Inspect browser console', 'Fix datasource URL, Update queries, Check time range'],
    ]
    
    issue_table = Table(issues, colWidths=[1.2*inch, 1.35*inch, 1.85*inch, 1.8*inch])
    issue_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), SEM_ERROR),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'NotoSansSC-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 7.5),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('FONTNAME', (0, 1), (-1, -1), 'NotoSansSC'),
        ('FONTSIZE', (0, 1), (-1, -1), 7),
        ('BACKGROUND', (0, 1), (-1, -1), colors.white),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, TABLE_STRIPE]),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    elements.append(issue_table)
    
    return elements


def build_ss7_module_appendix(styles):
    """Build Part V: SS7 Security Module - Complete Telecom Signaling Monitoring."""
    elements = []
    
    # Part Header
    elements.append(Paragraph("PART V: SS7 Security Module (Telecom Signaling)", styles['SectionHeading']))
    elements.append(HRFlowable(width="100%", thickness=2, color=HEADER_FILL, spaceBefore=5, spaceAfter=15))
    
    ss7_intro = """
    This section provides complete documentation for the SS7/Diameter security monitoring module, which is 
    **absolutely critical** for a telecommunications operator SOC. The module monitors core network signaling 
    protocols (SS7, SIGTRAN, Diameter) to detect attacks that cannot be seen at the IP layer alone, including 
    subscriber location tracking, international revenue share fraud (IRSF), SMS interception, and signaling-based 
    denial of service. Without this module, Djezzy's SOC is blind to the most damaging attack vectors targeting 
    mobile network infrastructure.
    """
    elements.append(Paragraph(ss7_intro.strip(), styles['DocBodyText']))
    elements.append(Spacer(1, 0.15 * inch))
    
    # C.1 Why SS7 Monitoring Matters
    elements.append(Paragraph("C.1 Why SS7 Monitoring is Critical for Djezzy", styles['SubsectionHeading']))
    
    why_text = """
    SS7 (Signaling System No. 7) is the backbone protocol suite for all mobile networks globally. It handles 
    every call setup, SMS delivery, subscriber roaming, and location update. Unlike IP-based attacks that can be 
    detected by standard NSM tools, SS7 attacks operate at the core network layer and can cause catastrophic damage 
    including mass privacy breaches, revenue loss in the millions of dollars, and complete service outages. For 
    an Algerian telecom operator like Djezzy, SS7 monitoring is not optional-it is a regulatory requirement under 
    ANRT (Autorite de Regulation de la Poste et des Communications lectroniques) cybersecurity frameworks.
    """
    elements.append(Paragraph(why_text.strip(), styles['DocBodyText']))
    
    threats_data = [
        ['Threat Category', 'Impact on Djezzy', 'Detection Method', 'Regulatory Requirement'],
        ['Location Tracking', 'Privacy breach, ANRT fines up to 2% revenue', 'SRI/ATI rate analysis', 'ANRT Cybersecurity Law Art 12'],
        ['Call/SMS Interception', 'Eavesdropping, corporate espionage', 'Forwarding pattern detection', 'Criminal Code Art 298-302'],
        ['IRSF Fraud', '$10M+ annual loss potential (MENA avg)', 'International call pattern analysis', 'ANRT Fraud Prevention Guidelines'],
        ['Signaling DoS', 'Network outage, 100K+ subscribers affected', 'Message flood detection', 'QoS Regulations Art 45'],
        ['SIM Cloning/Fraud', 'Identity theft, billing fraud', 'UL storm & IMEI mismatch', 'Consumer Protection Law'],
        ['USSD Service Abuse', 'Revenue loss, service degradation', 'USSD rate limiting', 'Value-Added Services Regs'],
        ['Roaming Partner Compromise', 'Supply chain attack, data exfiltration', 'Partner anomaly detection', 'Roaming Agreement Compliance'],
    ]
    
    threats_table = Table(threats_data, colWidths=[1.4*inch, 1.9*inch, 1.6*inch, 1.5*inch])
    threats_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), SEM_ERROR),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'NotoSansSC-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 8),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('FONTNAME', (0, 1), (-1, -1), 'NotoSansSC'),
        ('FONTSIZE', (0, 1), (-1, -1), 7.5),
        ('BACKGROUND', (0, 1), (-1, -1), colors.white),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, TABLE_STRIPE]),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    elements.append(threats_table)
    elements.append(Spacer(1, 0.2 * inch))
    
    # C.2 Architecture
    elements.append(Paragraph("C.2 SS7 Module Architecture", styles['SubsectionHeading']))
    
    arch_text = """
    The SS7 security module consists of three microservices that integrate seamlessly with the existing 39-service 
    architecture. The design follows the same patterns as other security tools: capture via dedicated collector, analyze 
    via rules engine with Kafka buffering, and output alerts to both Wazuh SIEM and TheHive case management. All services 
    are containerized, orchestrated via Docker Compose/Kubernetes, and monitored through Prometheus/Grafana.
    """
    elements.append(Paragraph(arch_text.strip(), styles['DocBodyText']))
    
    services_data = [
        ['Service', 'Container Name', 'Purpose', 'Ports', 'Resources', 'Network'],
        ['SS7 Collector', 'djezzy-ss7-collector', 'Capture M3UA/SCTP/Diameter from STPs', '2904, 2905, 3868, 7000', '8 CPU / 16GB RAM', 'soc-events'],
        ['SS7 Analyzer', 'djezzy-ss7-analyzer', 'Real-time attack detection with YAML rules engine', '8000', '6 CPU / 12GB RAM', 'soc-backend + soc-events'],
        ['Diameter Monitor', 'djezzy-diameter-monitor', 'LTE/EPS Diameter interface monitoring (S6a, Gx)', '3869, 8001', '2 CPU / 4GB RAM', 'soc-events'],
    ]
    
    services_table = Table(services_data, colWidths=[1.05*inch, 1.35*inch, 1.65*inch, 1.15*inch, 1.0*inch, 0.9*inch])
    services_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), ACCENT_2),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'NotoSansSC-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 8),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('FONTNAME', (0, 1), (-1, -1), 'NotoSansSC'),
        ('FONTSIZE', (0, 1), (-1, -1), 7.5),
        ('BACKGROUND', (0, 1), (-1, -1), colors.white),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, TABLE_STRIPE]),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    elements.append(services_table)
    elements.append(Spacer(1, 0.2 * inch))
    
    # C.3 Detection Rules Summary
    elements.append(Paragraph("C.3 Detection Rules Inventory (17 Rules)", styles['SubsectionHeading']))
    
    rules_summary = """
    The SS7 analyzer includes 17 built-in detection rules organized into four categories: Location Tracking/Privacy (5 rules), 
    Fraud Detection (6 rules), Network Attacks/DoS (6 rules). Each rule is defined as a YAML file in config/ss7/rules/ and supports 
    complex conditions with AND/OR/NOT logic, field comparisons, sliding window rate calculations, and MITRE ATT&CK mapping. Rules 
    can be enabled/disabled independently via API or file modification without service restart.
    """
    elements.append(Paragraph(rules_summary.strip(), styles['DocBodyText']))
    
    rules_categories = [
        ['Category', 'Rule Count', 'Key Rules', 'Primary Target Protocols'],
        ['Location Tracking & Privacy', '5', 'LOCATION_TRACKING_SUSPICIOUS, SRI_FROM_UNUSUAL_SOURCE, ROAMING_NUMBER_ANOMALY, ATI_ABUSE_DETECTED, UPDATE_LOCATION_STORM', 'MAP (SRI, PRN, ATI, UL)'],
        ['Fraud Detection', '6', 'IRSF_PATTERN_DETECTED, WANGIRI_FRAUD_PATTERN, USSD_BRUTE_FORCE, SMS_FORWARDING_SUSPICIOUS, PREMIUM_RATE_ABUSE, SIM_BOX_DETECTED', 'ISUP, MAP, USSD'],
        ['Network Attacks & DoS', '6', 'SIGNALING_DOS_DETECTED, GT_TRANSLATION_ATTACK, MALFORMED_MESSAGE_DETECTED, UNAUTHORIZED_MAP_OPERATION, DIAMETER_ANOMALY, ROAMING_PARTNER_ANOMALY', 'M3UA, SCCP, TCAP, Diameter'],
    ]
    
    rules_cat_table = Table(rules_categories, colWidths=[1.55*inch, 0.85*inch, 2.85*inch, 1.65*inch])
    rules_cat_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), ACCENT),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'NotoSansSC-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 8),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('FONTNAME', (0, 1), (-1, -1), 'NotoSansSC'),
        ('FONTSIZE', (0, 1), (-1, -1), 7.5),
        ('BACKGROUND', (0, 1), (-1, -1), colors.white),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, TABLE_STRIPE]),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    elements.append(rules_cat_table)
    elements.append(Spacer(1, 0.2 * inch))
    
    # C.4 Integration Points
    elements.append(Paragraph("C.4 Integration with Existing Stack", styles['SubsectionHeading']))
    
    integration_points = [
        ['Downstream System', 'Integration Method', 'Data Format', 'Use Case'],
        ['Wazuh SIEM', 'Kafka consumer + custom decoder', 'JSON alert + Wazuh rule XML (integrations/wazuh-ss7/wazuh_ss7_rules.xml)', 'Correlate SS7 alerts with IP-layer events, unified dashboard'],
        ['TheHive Case Mgmt', 'REST API (thehive4py client)', 'JSON alert -> TheHive case with observables', 'Auto-case creation for HIGH/CRITICAL, analyst workflow'],
        ['Grafana Dashboards', 'Prometheus metrics + Elasticsearch datasource', 'Time series + alert tables', 'Real-time SS7 security overview dashboard'],
        ['Kafka Event Bus', 'Producer/Consumer on dedicated topics', 'Avro/JSON schema (config/ss7/kafka/topics.yaml)', 'Durable buffering, replay capability, multi-consumer'],
        ['Elasticsearch', 'Index template (ss7-*)', 'Structured JSON documents', 'Long-term retention, search, investigation'],
        ['Prometheus Metrics', '/metrics endpoint (prometheus_client)', 'Counter/Gauge/Histogram', 'Service health, message rates, alert counts'],
        ['External Fraud System', 'Kafka producer to ss7-fraud-indicators topic', 'JSON fraud indicators', 'Feed IRSF/premium-rate detection to existing FMS'],
    ]
    
    int_table = Table(integration_points, colWidths=[1.25*inch, 1.45*inch, 1.75*inch, 1.95*inch])
    int_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), HEADER_FILL),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'NotoSansSC-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 8),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('FONTNAME', (0, 1), (-1, -1), 'NotoSansSC'),
        ('FONTSIZE', (0, 1), (-1, -1), 7.5),
        ('BACKGROUND', (0, 1), (-1, -1), colors.white),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, TABLE_STRIPE]),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    elements.append(int_table)
    elements.append(Spacer(1, 0.2 * inch))
    
    # C.5 Quick Reference Commands
    elements.append(Paragraph("C.5 Quick Reference Commands", styles['SubsectionHeading']))
    
    quick_commands = [
        ['# Check SS7 Collector status', 'curl -s http://localhost:7000/health | jq .', ''],
        ['# Check SS7 Analyzer status', 'curl -s http://localhost:8000/health | jq .', ''],
        ['# Check all SS7 services', 'docker compose -f docker-compose.prod.yml ps | grep ss7', ''],
        ['# View SS7 Collector logs', 'docker compose -f docker-compose.prod.yml logs -f --tail=100 ss7-collector', ''],
        ['# View SS7 Analyzer stats', 'curl -s http://localhost:8000/api/v1/stats | jq .', ''],
        ['# Reload detection rules (no restart)', 'curl -X POST http://localhost:8000/api/v1/rules/reload', ''],
        ['# List active rules', 'curl -s http://localhost:8000/api/v1/rules | jq ".[] | {name, severity, enabled}"', ''],
        ['# Inject test message (for validation)', 'curl -X POST http://localhost:7000/api/v1/message/inject -d @test_ss7.json', ''],
        ['# Check Kafka SS7 topics', 'kafka-topics.sh --list --bootstrap-server localhost:9092 | grep ss7', ''],
        ['# Consume sample SS7 alerts', 'kafka-console-consumer --topic ss7-alerts --from-beginning --max-messages 5', ''],
        ['# Check PCAP capture directory', 'ls -la /var/lib/docker/volumes/ss7_pcaps/_data/', ''],
        ['# Verify Grafana dashboard import', 'curl -s -u admin:admin "http://grafana:3000/api/dashboards/import" -d @ss7-dashboard.json', ''],
    ]
    
    cmd_table = Table(quick_commands, colWidths=[6.3*inch])
    cmd_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, -1), 'Liberation Mono'),
        ('FONTSIZE', (0, 0), (-1, -1), 7.5),
        ('BACKGROUND', (0, 0), (-1, -1), CARD_BG),
        ('TEXTCOLOR', (0, 0), (-1, -1), TEXT_PRIMARY),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 2),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
        ('BOX', (0, 0), (-1, -1), 0.5, BORDER),
    ]))
    elements.append(cmd_table)
    
    elements.append(PageBreak())
    return elements


def generate_documentation_pdf(output_path):
    """Main function to generate the complete documentation PDF."""
    # Create document
    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        leftMargin=MARGIN,
        rightMargin=MARGIN,
        topMargin=MARGIN,
        bottomMargin=MARGIN,
        title="Djezzy SOC Platform - Comprehensive Deployment Documentation",
        author="Djezzy SOC Engineering Team",
        subject="Hardware Architecture, Operations Manual, Quick-Start Guide, Integration Setup",
        creator="Djezzy SOC Platform Documentation Generator"
    )
    
    # Get styles
    styles = create_styles()
    
    # Build all sections
    story = []
    
    # Cover page
    story.extend(build_cover_page(styles))
    
    # Table of Contents
    story.extend(build_toc(styles))
    
    # Part I: Hardware Architecture Guide
    story.extend(build_hardware_architecture_guide(styles))
    
    # Part II: Operations Manual
    story.extend(build_operations_manual(styles))
    
    # Part III: Quick-Start Cheat Sheet
    story.extend(build_quick_start_cheatsheet(styles))
    
    # Part IV: Wazuh + TheHive Integration
    story.extend(build_wazuh_thehive_integration(styles))
    
    # Part V: SS7 Security Module (Appendix C)
    story.extend(build_ss7_module_appendix(styles))
    
    # Appendices
    story.extend(build_appendices(styles))
    
    # Build PDF
    doc.build(story, onFirstPage=add_header_footer, onLaterPages=add_header_footer)
    
    print(f"Documentation generated successfully: {output_path}")
    return output_path


if __name__ == "__main__":
    output_file = "/home/z/my-project/download/Djezzy_SOC_Platform_Deployment_Documentation.pdf"
    generate_documentation_pdf(output_file)
