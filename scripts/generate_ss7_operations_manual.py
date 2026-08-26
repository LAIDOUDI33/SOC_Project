#!/usr/bin/env python3
"""
Djezzy SOC Platform - SS7 Security Operations Manual Generator
Generates operational procedures and runbooks for SS7 security monitoring.
"""

import os
import hashlib
from datetime import datetime
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm, cm
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, HRFlowable
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# Font Registration
FONT_DIR = '/usr/share/fonts'
pdfmetrics.registerFont(TTFont('NotoSerifSC', f'{FONT_DIR}/truetype/noto-serif-sc/NotoSerifSC-Regular.ttf'))
pdfmetrics.registerFont(TTFont('NotoSerifSC-Bold', f'{FONT_DIR}/truetype/noto-serif-sc/NotoSerifSC-Bold.ttf'))
pdfmetrics.registerFont(TTFont('LiberationSans', f'{FONT_DIR}/truetype/liberation/LiberationSans-Regular.ttf'))
pdfmetrics.registerFont(TTFont('LiberationSans-Bold', f'{FONT_DIR}/truetype/liberation/LiberationSans-Bold.ttf'))
pdfmetrics.registerFont(TTFont('LiberationMono', f'{FONT_DIR}/truetype/dejavu/DejaVuSansMono.ttf'))
pdfmetrics.registerFont(TTFont('BodyFont', f'{FONT_DIR}/truetype/chinese/LiberationSans-Regular.ttf'))
pdfmetrics.registerFont(TTFont('BodyFontBold', f'{FONT_DIR}/truetype/liberation/LiberationSans-Bold.ttf'))

# Palette
PAGE_BG       = colors.HexColor('#f4f5f5')
SECTION_BG    = colors.HexColor('#edeeef')
CARD_BG       = colors.HexColor('#e4e7e9')
TABLE_STRIPE  = colors.HexColor('#ecedee')
HEADER_FILL   = colors.HexColor('#384a53')
BORDER        = colors.HexColor('#c4d2d9')
ICON          = colors.HexColor('#417a97')
ACCENT        = colors.HexColor('#2f95c7')
TEXT_PRIMARY  = colors.HexColor('#181a1b')
TEXT_MUTED    = colors.HexColor('#7e8588')
SEM_SUCCESS   = colors.HexColor('#3b8253')
SEM_WARNING   = colors.HexColor('#988051')
SEM_ERROR     = colors.HexColor('#914c46')
SEM_INFO      = colors.HexColor('#486888')

# Styles
styles = getSampleStyleSheet()

styles.add(ParagraphStyle(name='DocTitle', fontName='NotoSerifSC-Bold', fontSize=26, leading=32, alignment=TA_CENTER, textColor=TEXT_PRIMARY, spaceAfter=10))
styles.add(ParagraphStyle(name='DocSubtitle', fontName='NotoSerifSC', fontSize=14, leading=18, alignment=TA_CENTER, textColor=TEXT_MUTED, spaceAfter=25))
styles.add(ParagraphStyle(name='ChapterTitle', fontName='NotoSerifSC-Bold', fontSize=18, leading=24, textColor=HEADER_FILL, spaceBefore=18, spaceAfter=10))
styles.add(ParagraphStyle(name='SectionHeading', fontName='NotoSerifSC-Bold', fontSize=13, leading=17, textColor=HEADER_FILL, spaceBefore=14, spaceAfter=8))
styles.add(ParagraphStyle(name='SubsectionHeading', fontName='BodyFontBold', fontSize=11, leading=14, textColor=ICON, spaceBefore=10, spaceAfter=6))
styles.add(ParagraphStyle(name='DocBody', fontName='BodyFont', fontSize=9.5, leading=14, alignment=TA_JUSTIFY, textColor=TEXT_PRIMARY, spaceBefore=3, spaceAfter=6, firstLineIndent=16))
styles.add(ParagraphStyle(name='DocBodyNoIndent', fontName='BodyFont', fontSize=9.5, leading=14, alignment=TA_JUSTIFY, textColor=TEXT_PRIMARY, spaceBefore=3, spaceAfter=6))
styles.add(ParagraphStyle(name='CodeBlock', fontName='LiberationMono', fontSize=7.5, leading=10, textColor=TEXT_PRIMARY, backColor=CARD_BG, borderColor=BORDER, borderWidth=0.5, borderPadding=6, leftIndent=8, rightIndent=8, spaceBefore=5, spaceAfter=5))
styles.add(ParagraphStyle(name='StepNumber', fontName='NotoSerifSC-Bold', fontSize=11, leading=14, textColor=ACCENT, spaceBefore=8, spaceAfter=4))
styles.add(ParagraphStyle(name='WarningText', fontName='BodyFontBold', fontSize=9, leading=13, textColor=SEM_ERROR, leftIndent=15, rightIndent=15, spaceBefore=8, spaceAfter=8, borderColor=SEM_ERROR, borderWidth=1, borderPadding=8))
styles.add(ParagraphStyle(name='InfoText', fontName='BodyFont', fontSize=9, leading=13, textColor=SEM_INFO, leftIndent=15, rightIndent=15, spaceBefore=8, spaceAfter=8, borderColor=SEM_INFO, borderWidth=1, borderPadding=8))

toc_level0 = ParagraphStyle(name='TOCLevel0', fontName='BodyFontBold', fontSize=10.5, leading=15, leftIndent=0, textColor=TEXT_PRIMARY)
toc_level1 = ParagraphStyle(name='TOCLevel1', fontName='BodyFont', fontSize=9.5, leading=13, leftIndent=18, textColor=TEXT_MUTED)

def add_heading(text, style, level=0):
    key = f'h_{hashlib.md5(text.encode()).hexdigest()[:8]}'
    p = Paragraph(f'<a name="{key}"/>{text}', style)
    p.bookmark_name = key
    p.bookmark_level = level
    p.bookmark_text = text
    return p

def create_table(data, col_widths=None, header_rows=1):
    table = Table(data, colWidths=col_widths, repeatRows=header_rows)
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, header_rows-1), HEADER_FILL),
        ('TEXTCOLOR', (0, 0), (-1, header_rows-1), colors.white),
        ('FONTNAME', (0, 0), (-1, header_rows-1), 'BodyFontBold'),
        ('FONTSIZE', (0, 0), (-1, header_rows-1), 8.5),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('FONTNAME', (0, header_rows), (-1, -1), 'BodyFont'),
        ('FONTSIZE', (0, header_rows), (-1, -1), 8),
        ('TEXTCOLOR', (0, header_rows), (-1, -1), TEXT_PRIMARY),
        ('ROWBACKGROUNDS', (0, header_rows), (-1, -1), [colors.white, TABLE_STRIPE]),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
        ('LINEBELOW', (0, header_rows-1), (-1, header_rows-1), 1.5, HEADER_FILL),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]))
    return table

def create_callout(title, content, box_type='info'):
    if box_type == 'warning':
        bg, border, title_fc = colors.HexColor('#fdf3f2'), SEM_ERROR, SEM_ERROR
    elif box_type == 'success':
        bg, border, title_fc = colors.HexColor('#f4faf6'), SEM_SUCCESS, SEM_SUCCESS
    else:
        bg, border, title_fc = colors.HexColor('#f4f8fb'), SEM_INFO, SEM_INFO
    
    ts = ParagraphStyle(f'Title_{box_type}', fontName='BodyFontBold', fontSize=9, textColor=title_fc)
    bs = ParagraphStyle(f'Body_{box_type}', fontName='BodyFont', fontSize=8.5, textColor=TEXT_PRIMARY, leading=12)
    
    data = [[Paragraph(f'<b>{title}</b>', ts)], [Paragraph(content, bs)]]
    t = Table(data, colWidths=[460])
    t.setStyle(TableStyle([('BACKGROUND', (0, 0), (-1, -1), bg), ('BOX', (0, 0), (-1, -1), 1.5, border), ('TOPPADDING', (0, 0), (-1, -1), 6), ('BOTTOMPADDING', (0, 0), (-1, -1), 6), ('LEFTPADDING', (0, 0), (-1, -1), 10), ('RIGHTPADDING', (0, 0), (-1, -1), 10)]))
    return t

def page_template(canvas, doc):
    canvas.saveState()
    canvas.setFont('LiberationSans', 7.5)
    canvas.setFillColor(TEXT_MUTED)
    canvas.drawString(A4[0]/2 - 75, 22*mm, "Djezzy SOC | SS7 Security Operations Manual")
    canvas.drawRightString(A4[0] - 20*mm, 22*mm, f"Page {doc.page}")
    canvas.setStrokeColor(BORDER)
    canvas.setLineWidth(0.5)
    canvas.line(18*mm, A4[1] - 13*mm, A4[0] - 18*mm, A4[1] - 13*mm)
    canvas.restoreState()

# ============================================================================
# CONTENT BUILDERS
# ============================================================================

def build_cover():
    story = []
    story.append(Spacer(1, 50))
    story.append(Paragraph("Djezzy National SOC Platform", styles['DocTitle']))
    story.append(Spacer(1, 8))
    story.append(Paragraph("SS7 Security Module", ParagraphStyle('MainSub', fontName='NotoSerifSC-Bold', fontSize=20, leading=26, alignment=TA_CENTER, textColor=ACCENT)))
    story.append(Spacer(1, 12))
    story.append(Paragraph("Security Operations Manual", styles['DocSubtitle']))
    story.append(Spacer(1, 30))
    
    info = [
        ['Document Type', 'Operations Manual'],
        ['Version', '2.0'],
        ['Effective Date', datetime.now().strftime('%Y-%m-%d')],
        ['Classification', 'Internal Operations'],
        ['Target Audience', 'SOC Analysts, NOC Engineers, Security Operators'],
    ]
    t = Table(info, colWidths=[120, 200])
    t.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'BodyFontBold'), ('FONTNAME', (1, 0), (1, -1), 'BodyFont'),
        ('FONTSIZE', (0, 0), (-1, -1), 9.5), ('TEXTCOLOR', (0, 0), (-1, -1), TEXT_PRIMARY),
        ('ALIGN', (0, 0), (0, -1), 'RIGHT'), ('TOPPADDING', (0, 0), (-1, -1), 7), ('BOTTOMPADDING', (0, 0), (-1, -1), 7),
        ('LINEBELOW', (0, 0), (-1, -2), 0.5, BORDER),
    ]))
    story.append(t)
    story.append(PageBreak())
    return story

def build_toc():
    story = []
    from reportlab.platypus.tableofcontents import TableOfContents
    story.append(Paragraph("Table of Contents", ParagraphStyle('TOCH', fontName='NotoSerifSC-Bold', fontSize=14, leading=18, textColor=HEADER_FILL, spaceBefore=15, spaceAfter=10)))
    toc = TableOfContents()
    toc.levelStyles = [toc_level0, toc_level1]
    story.append(toc)
    story.append(PageBreak())
    return story

def build_ch1_introduction():
    story = []
    story.append(add_heading("1. Introduction & Scope", styles['ChapterTitle'], level=0))
    story.append(HRFlowable(width="100%", thickness=1, color=HEADER_FILL, spaceAfter=10))
    
    story.append(Paragraph(
        "This Security Operations Manual provides standardized procedures for operating the Djezzy SOC "
        "Platform's SS7 Security Module. It is designed for frontline security analysts, NOC engineers, "
        "and operations staff responsible for day-to-day monitoring, incident response, and maintenance "
        "of telecommunications signaling security capabilities. The manual establishes consistent workflows "
        "that ensure operational excellence while maintaining compliance with ANRT regulatory requirements.",
        styles['DocBody']
    ))
    
    story.append(add_heading("1.1 Purpose of This Manual", styles['SectionHeading']))
    story.append(Paragraph(
        "The primary purpose of this manual is to document repeatable procedures that enable operations "
        "staff to effectively monitor, analyze, and respond to SS7-specific security threats. By following "
        "these standardized procedures, Djezzy ensures consistent response quality regardless of which "
        "analyst is on shift, reduces mean-time-to-detect (MTTD) and mean-time-to-respond (MTTR) for "
        "signaling attacks, maintains audit trails suitable for regulatory examination, and supports "
        "continuous improvement through documented feedback loops.",
        styles['DocBody']
    ))
    
    story.append(add_heading("1.2 Target Audience & Prerequisites", styles['SectionHeading']))
    
    audience_data = [
        ['Role', 'Required Knowledge', 'Manual Sections'],
        ['SOC Analyst (SS7 Specialist)', 'SS7/MAP protocol basics, signaling attack types, TheHive usage', 'All sections with focus on Ch 4-6'],
        ['NOC Engineer', 'Linux administration, Docker, Kafka basics, monitoring tools', 'Ch 2-3, Ch 8 (health checks)'],
        ['Shift Lead / Supervisor', 'Incident escalation, team coordination, reporting', 'Ch 5-7, Ch 10 (escalation)'],
        ['Security Architect', 'Full stack knowledge, compliance requirements, capacity planning', 'All sections for review/audit'],
    ]
    story.append(create_table(audience_data, col_widths=[110, 180, 150]))
    story.append(Spacer(1, 8))
    
    story.append(create_callout(
        "Training Prerequisite",
        "Before performing independent SS7 monitoring duties, analysts must complete: (1) SS7 Protocol "
        "Fundamentals course (16 hours), (2) SS7 Attack Vectors workshop (8 hours), (3) TheHive case "
        "management certification (4 hours), (4) Supervised shift operations (40 hours minimum). "
        "Contact the Security Training Coordinator for enrollment.",
        'info'
    ))
    story.append(PageBreak())
    return story

def build_ch2_daily_ops():
    story = []
    story.append(add_heading("2. Daily Operations Procedures", styles['ChapterTitle'], level=0))
    story.append(HRFlowable(width="100%", thickness=1, color=HEADER_FILL, spaceAfter=10))
    
    story.append(Paragraph(
        "Daily operations form the foundation of effective SS7 security monitoring. This chapter details "
        "the standard operating procedures (SOPs) that must be executed during each shift to maintain "
        "visibility into signaling threats, ensure system health, and prepare for potential incidents. "
        "Procedures are organized chronologically from shift start to handover completion.",
        styles['DocBody']
    ))
    
    story.append(add_heading("2.1 Shift Start Procedures (First 30 Minutes)", styles['SectionHeading']))
    
    story.append(Paragraph("<b>Step 1: System Health Verification (Minutes 0-10)</b>", styles['StepNumber']))
    story.append(Paragraph(
        "Begin each shift by verifying all SS7 module components are operational. Access the Grafana "
        "SS7 Health dashboard and confirm: (a) All three services show GREEN status (ss7-collector, "
        "ss7-analyzer, diameter-monitor), (b) Kafka consumer lag is below 1000 messages for all topics, "
        "(Elasticsearch cluster status is GREEN with no relocating or initializing shards, (d) TheHive API "
        "responds within 500ms latency. Document any anomalies in the shift log before proceeding.",
        styles['DocBodyNoIndent']
    ))
    
    health_check = [
        ['Component', 'Health Check Command/URL', 'Expected Result', 'If Abnormal'],
        ['ss7-collector', 'curl -s http://ss7-collector:7000/health', '{"status":"healthy","uptime":...}', 'Check logs, restart if needed'],
        ['ss7-analyzer', 'curl -s http://ss7-analyzer:7001/health', '{"status":"healthy","rules_loaded":...}', 'Verify rule files, restart'],
        ['Kafka clusters', 'kafka-broker-api --cluster-info', '3 brokers, healthy', 'Check broker logs, network'],
        ['Elasticsearch', 'curl -s es-master:9200/_cluster/health?pretty', '"status" : "green"', 'Check shard allocation, disk'],
        ['TheHive', 'curl -s -H "X-API-Key: KEY" thehive:9000/api/status', '{"status":"OK"}', 'Check TheHive service'],
    ]
    story.append(create_table(health_check, col_widths=[80, 155, 130, 105]))
    story.append(Spacer(1, 8))
    
    story.append(Paragraph("<b>Step 2: Overnight Alert Review (Minutes 10-20)</b>", styles['StepNumber']))
    story.append(Paragraph(
        "Review all alerts generated since previous shift handover. In TheHive, filter cases by tag 'ss7-*' "
        "created in the last 8 hours. For each CRITICAL or HIGH severity case: (a) Read full case description "
        "and observables, (b) Verify assigned analyst has begun investigation, (c) Check if escalation criteria "
        "were met and properly executed, (d) Note any cases requiring follow-up during current shift. Update "
        "the shift tracking spreadsheet with overnight summary statistics.",
        styles['DocBodyNoIndent']
    ))
    
    story.append(Paragraph("<b>Step 3: Baseline Metrics Capture (Minutes 20-30)</b>", styles['StepNumber']))
    story.append(Paragraph(
        "Record baseline metrics for comparison throughout the shift. Capture from Grafana dashboards: (a) "
        "Current messages per second by type (MAP, ISUP, Diameter), (b) Alert rate (alerts/hour) compared to "
        "7-day average at same time, (c) Top 5 source Global Titles by message volume, (d) Active TheHive case "
        "count by severity, (e) Kafka consumer group lag per topic. These baselines enable rapid detection of "
        "anomalies developing during the shift.",
        styles['DocBodyNoIndent']
    ))
    
    story.append(add_heading("2.2 Ongoing Monitoring Tasks (Throughout Shift)", styles['SectionHeading']))
    
    ongoing_tasks = [
        ['Task', 'Frequency', 'Tool', 'Action Threshold'],
        ['Alert queue monitoring', 'Every 15 minutes', 'TheHive UI', '>5 unassigned HIGH alerts: immediate triage'],
        ['Message volume tracking', 'Hourly', 'Grafana SS7 Overview', '>20% deviation from baseline: investigate'],
        ['Kafka consumer lag check', 'Every 30 minutes', 'Kafka UI or CLI', 'Lag >10000: notify NOC, consider scaling'],
        ['GT blacklist updates', 'Per intel feed receipt', 'MISP/OpenCTI', 'New IOCs: update analyzer rules within 1 hour'],
        ['PCAP storage utilization', 'Every 2 hours', 'df -h /var/capture/ss7', '>85%: request storage expansion'],
        ['Rule effectiveness review', 'End of each 4-hour block', 'ES query alert/dismissal ratio', 'FP rate >30%: flag for tuning'],
    ]
    story.append(create_table(ongoing_tasks, col_widths=[115, 70, 85, 200]))
    story.append(Spacer(1, 8))
    
    story.append(add_heading("2.3 Shift End & Handover Procedures", styles['SectionHeading']))
    
    story.append(Paragraph(
        "Proper shift handover is critical for maintaining continuous situational awareness. The outgoing analyst "
        "must prepare comprehensive documentation enabling seamless transition to incoming personnel. Rushed or "
        "incomplete handovers directly contribute to delayed threat detection and response failures.",
        styles['DocBody']
    ))
    
    handover_items = [
        ['Handover Item', 'Format', 'Location', 'Completion Criteria'],
        ['Shift summary narrative', 'Free text (2-3 paragraphs)', 'Shift log system', 'All significant events documented'],
        ['Active cases list', 'Table: Case ID, Title, Severity, Status', 'Shift tracking sheet', 'All open cases listed with notes'],
        ['Pending actions', 'Bullet list with owners/deadlines', 'Shift tracking sheet', 'Each action has clear owner and due time'],
        ['Anomaly observations', 'Structured notes with timestamps', 'Shift log + anomaly log', 'Unexplained patterns flagged for investigation'],
        ['Metrics snapshot', 'Key metrics at handover time', 'Automated dashboard export', 'Snapshot saved with timestamp'],
        ['Tool/system issues', 'List with workarounds applied', 'Issue tracker + shift log', 'Open issues referenced by ticket number'],
    ]
    story.append(create_table(handover_items, col_widths=[100, 125, 100, 145]))
    story.append(Spacer(1, 8))
    
    story.append(create_callout(
        "Handover Meeting Requirement",
        "For shifts experiencing CRITICAL alerts or ongoing major incidents, a verbal handover meeting "
        "(minimum 15 minutes) is MANDATORY between outgoing and incoming analysts. Schedule via calendar "
        "invite with video conference link. Document meeting attendees and key discussion points in the "
        "shift log. Skip only when both leads explicitly agree written handover is sufficient.",
        'warning'
    ))
    story.append(PageBreak())
    return story

def build_ch3_monitoring():
    story = []
    story.append(add_heading("3. Dashboard Monitoring Guide", styles['ChapterTitle'], level=0))
    story.append(HRFlowable(width="100%", thickness=1, color=HEADER_FILL, spaceAfter=10))
    
    story.append(Paragraph(
        "Effective monitoring relies on proper interpretation of Grafana dashboards configured for the SS7 "
        "module. This chapter explains each dashboard's panels, normal operating ranges, and specific "
        "indicators that require analyst attention. Analysts should develop muscle memory for these dashboards "
        "through regular practice, enabling rapid anomaly detection without conscious calculation.",
        styles['DocBody']
    ))
    
    story.append(add_heading("3.1 SS7 Security Overview Dashboard", styles['SectionHeading']))
    
    story.append(Paragraph(
        "The primary operational dashboard providing real-time visibility into all SS7 module components. "
        "This dashboard should be displayed prominently in the SOC operations center and checked minimum every "
        "15 minutes during normal operations, more frequently during active incidents.",
        styles['DocBody']
    ))
    
    overview_panels = [
        ['Panel Name', 'Position', 'Data Source', 'Normal Range', 'Warning Indicator'],
        ['Messages/sec - Total', 'Top-left, large', 'Elasticsearch ss7-raw-events', '35K-50K EPS', '<25K or >60K EPS'],
        ['Messages/sec by Protocol', 'Below total', 'Elasticsearch ss7-raw-events', 'MAP 55%, ISUP 25%, Diameter 15%, Other 5%', 'Any protocol >10% deviation'],
        ['Alert Timeline (24h)', 'Top-right', 'Elasticsearch ss7-alerts', 'Steady low baseline with occasional spikes', 'Sustained elevation >2x baseline'],
        ['Top 10 Source GTs', 'Middle-left', 'Elasticsearch ss7-raw-events', 'Known internal GTs dominate', 'Unknown/unexpected GT in top 10'],
        ['Active Cases by Severity', 'Middle-center', 'TheHive API', 'Mostly LOW/MEDIUM', 'HIGH/CRITICAL increasing trend'],
        ['Geographic Threat Map', 'Middle-right', 'Elasticsearch geo_point', 'Concentrated in Algeria (home)', 'Unexpected international hotspots'],
        ['Detection Rule Effectiveness', 'Bottom-left', 'Prometheus custom metrics', 'FP rate <20% for all rules', 'Any rule FP rate >30%'],
        ['System Resource Usage', 'Bottom-right', 'Node exporter / Docker', 'CPU <70%, Memory <80%', 'Any resource >85% sustained'],
    ]
    story.append(create_table(overview_panels, col_widths=[105, 70, 100, 95, 100]))
    story.append(Spacer(1, 8))
    
    story.append(add_heading("3.2 IRSF Fraud Detection Dashboard", styles['SectionHeading']))
    
    story.append(Paragraph(
        "Specialized dashboard focused on International Revenue Share Fraud detection and prevention. This "
        "dashboard aggregates financial risk indicators and blocking rule effectiveness metrics. Review this "
        "dashboard at minimum twice per shift (mid-shift and near end) even when no fraud indicators are "
        "present, as early detection of emerging patterns enables proactive blocking before significant "
        "revenue loss occurs.",
        styles['DocBody']
    ))
    
    irsf_panels = [
        ['Panel Name', 'Purpose', 'Key Metric', 'Normal State', 'Action Trigger'],
        ['High-Risk Destination Ranking', 'Identify premium-rate targets', 'Countries by call volume', 'No premium destinations in top 20', 'Premium destination appears in ranking'],
        ['Call Duration Distribution', 'Detect revenue-generation calls', 'Avg duration histogram', 'Peak at 120-300 seconds', 'Secondary peak <10 seconds (IRSF signature)'],
        ['Revenue at Risk (24h)', 'Quantify financial exposure', '$ amount based on rates', '<$1,000/day estimated', '>$5,000/day: immediate investigation'],
        ['Blocked GT Count', 'Measure response effectiveness', 'Currently blocked source GTs', 'Stable or slowly increasing', 'Sharp increase suggests campaign'],
        ['Blocking Rule Hit Rate', 'Evaluate rule precision', '% of calls matching blocked GTs', '>90% legitimate blocks', '<80%: possible over-blocking, review rules'],
        ['Time-to-Block Metric', 'Measure response speed', 'Avg seconds from detection to block', '<300 seconds (5 min)', '>900 seconds: process bottleneck'],
    ]
    story.append(create_table(irsf_panels, col_widths=[105, 95, 100, 100, 80]))
    story.append(Spacer(1, 8))
    
    story.append(add_heading("3.3 Interpreting Anomalous Indicators", styles['SectionHeading']))
    
    story.append(Paragraph(
        "Not all dashboard deviations indicate security threats. Many variations reflect normal business "
        "cycles such as promotional campaigns, holiday traffic patterns, or scheduled maintenance windows. "
        "Analysts must develop contextual judgment to distinguish benign anomalies from genuine threats. When "
        "in doubt, investigate rather than ignore - the cost of a false positive investigation is far lower "
        "than a missed attack detection.",
        styles['DocBody']
    ))
    
    anomaly_guide = [
        ['Observation', 'Possible Benign Cause', 'Possible Threat Indication', 'Investigation Action'],
        ['Sudden MAP volume spike 09:00', 'Morning registration peak', 'Location tracking campaign launch', 'Check SRI4SM vs normal registration ratio'],
        ['ISUP increase to country X', 'New roaming agreement active', 'IRSF test probe or active fraud', 'Cross-reference with destination blacklist'],
        ['Diameter S6a errors increase', 'HSS maintenance window', 'IMSI catcher or fake base station', 'Verify HSS maintenance schedule, check geo'],
        ['New Global Title in top sources', 'New STP or interconnect partner', 'Compromised signaling point', 'Query GT against known partner list'],
        ['Alert FP rate increase overnight', 'Rule threshold needs recalibration', 'Attack pattern evolution evading detection', 'Review recent rule changes, sample alerts'],
    ]
    story.append(create_table(anomaly_guide, col_widths=[110, 115, 125, 120]))
    story.append(PageBreak())
    return story

def build_ch4_incident_response():
    story = []
    story.append(add_heading("4. Incident Response Runbooks", styles['ChapterTitle'], level=0))
    story.append(HRFlowable(width="100%", thickness=1, color=HEADER_FILL, spaceAfter=10))
    
    story.append(Paragraph(
        "This chapter provides detailed runbooks for responding to SS7-specific security incidents. Each "
        "runbook follows a standardized structure: trigger conditions, initial assessment steps, investigation "
        "procedure, containment actions, resolution criteria, and post-incident requirements. Analysts should "
        "familiarize themselves with all runbooks before an incident occurs, as real-world scenarios leave no "
        "time for reading documentation.",
        styles['DocBody']
    ))
    
    # Runbook 1: Location Tracking
    story.append(add_heading("4.1 Runbook: Location Tracking Detection (SS7-LocTrack-001)", styles['SectionHeading']))
    
    story.append(Paragraph("<b>Trigger Condition:</b>", styles['DocBodyNoIndent']))
    story.append(Paragraph(
        "Alert rule SS7_LOCATION_TRACKING_SUSPICIOUS fires when a single MSISDN receives >10 SRI4SM (Send "
        "Routing Info For SM) requests within a 60-second window from the same or related source Global Title(s). "
        "Severity defaults to HIGH; escalates to CRITICAL if target subscriber is high-value (VIP, corporate "
        "account, government) or if source GT is untrusted/unknown.",
        styles['DocBodyNoIndent']
    ))
    
    story.append(Paragraph("<b>Initial Assessment (T+0 to T+5 minutes):</b>", styles['DocBodyNoIndent']))
    
    loc_steps = [
        ['Step', 'Action', 'Tool/Command', 'Expected Output', 'Decision Point'],
        ['1', 'Open TheHive alert, review observables', 'TheHive Web UI', 'Source GT, target MSISDN, timestamps', 'Is target VIP/government? -> Escalate'],
        ['2', 'Query source GT reputation', 'MISP/OpenCTI lookup', 'IOC match or clean', 'Known bad GT? -> Skip to containment'],
        ['3', 'Check target subscriber profile', 'CRM/HLR query (authorized)', 'Subscriber type, account value', 'Normal subscriber? -> Standard flow'],
        ['4', 'Review historical SRI pattern for target', 'ES query last 30 days', 'Prior location queries count', 'History of similar queries? -> Pattern analysis'],
        ['5', 'Assess source GT legitimacy', 'Network topology database', 'Known partner/interconnect GT?', 'Unknown GT? -> Elevated suspicion'],
    ]
    story.append(create_table(loc_steps, col_widths=[25, 140, 100, 105, 100]))
    story.append(Spacer(1, 8))
    
    story.append(Paragraph("<b>Containment Actions (T+5 to T+30 minutes):</b>", styles['DocBodyNoIndent']))
    story.append(Paragraph(
        "If assessment confirms likely tracking attack: (1) Create P1/P2 TheHive case with all observables "
        "attached, (2) Notify Privacy Officer via PagerDuty for subscriber notification decision, (3) Prepare "
        "source GT blocking recommendation for network security team (do NOT block without approval), (4) Begin "
        "PCAP extraction for evidence preservation with hash integrity verification, (5) If target is VIP, "
        "immediately escalate to SOC Manager and Legal liaison.",
        styles['DocBodyNoIndent']
    ))
    
    story.append(Paragraph("<b>Resolution Criteria:</b>", styles['DocBodyNoIndent']))
    story.append(Paragraph(
        "Case may be closed when: (a) Source GT is blocked or rate-limited, (b) Target subscriber (if affected) "
        "has been notified per legal guidance, (c) Root cause analysis documents how attacker obtained SS7 access, "
        "(d) Preventive controls implemented to prevent recurrence, (e) Post-incident review completed with lessons "
        "learned captured. Typical resolution time: 4-72 hours depending on complexity.",
        styles['DocBodyNoIndent']
    ))
    
    # Runbook 2: IRSF Campaign
    story.append(add_heading("4.2 Runbook: IRSF Fraud Campaign (SS7-IrsfFraud-002)", styles['SectionHeading']))
    
    story.append(Paragraph("<b>Trigger Condition:</b>", styles['DocBodyNoIndent']))
    story.append(Paragraph(
        "Alert rule SS7_IRSF_PATTERN_DETECTED fires when ISUP Initial Address Messages (IAM) show pattern of: "
        "(a) Calls to high-risk premium-rate destinations (configurable country list), (b) Short call durations "
        "<10 seconds characteristic of revenue generation, (c) Volume >100 calls within 5 minutes from same "
        "calling number range, (d) Calling numbers show premium-rate or recently-ported characteristics. "
        "Severity is always CRITICAL due to direct financial impact.",
        styles['DocBodyNoIndent']
    ))
    
    irsf_response = [
        ['Phase', 'Timeline', 'Actions', 'Responsible', 'Deliverable'],
        ['Detection', 'T+0', 'Alert fires, auto-case created, initial data gathered', 'SS7 Analyzer (auto)', 'TheHive case with observables'],
        ['Triage', 'T+0 to T+15min', 'Validate IRSF signature, estimate exposure, identify source', 'SOC Analyst', 'Triage assessment document'],
        ['Containment', 'T+15min to T+1hr', 'Block destination ranges, isolate source if internal, preserve CDRs', 'Network Ops + Fraud Team', 'Blocking rules applied, CDRs secured'],
        ['Investigation', 'T+1hr to T+24hr', 'Trace attack path, calculate actual loss, identify accomplices', 'Fraud Team + Legal', 'Investigation report with findings'],
        ['Recovery', 'T+24hr to T+72hr', 'Reverse unauthorized changes, recover lost revenue if possible', 'Finance + Network Ops', 'Recovery action log'],
        ['Closure', 'T+72hr+', 'Document lessons learned, update controls, close case', 'SOC Lead', 'Post-incident report, updated rules'],
    ]
    story.append(create_table(irsf_response, col_widths=[60, 70, 195, 85, 110]))
    story.append(Spacer(1, 8))
    
    story.append(create_callout(
        "Financial Impact Documentation",
        "For all IRSF incidents, maintain precise records of: (a) Number of fraudulent calls detected, "
        "(b) Average call duration and destination rate, (c) Total estimated revenue loss, (d) Revenue "
        "saved by blocking actions, (e) Costs incurred for investigation and recovery. These figures are "
        "required for insurance claims, regulatory reports, and law enforcement referrals.",
        'warning'
    ))
    
    # Runbook 3: Signaling DoS
    story.append(add_heading("4.3 Runbook: Signaling Denial-of-Service (SS7-SigDoS-003)", styles['SectionHeading']))
    
    story.append(Paragraph("<b>Trigger Condition:</b>", styles['DocBodyNoIndent']))
    story.append(Paragraph(
        "Signaling DoS is indicated by: (a) Message flood exceeding 3x baseline EPS from single source GT, "
        "(b) Error responses (abort, release) flooding back to originators, (c) STP CPU/memory utilization "
        "spiking on nodes receiving traffic, (d) Legitimate call setup failures increasing in correlation with "
        "flood timing. This is CRITICAL severity as it impacts network availability for all subscribers.",
        styles['DocBodyNoIndent']
    ))
    
    dos_actions = [
        ['Priority', 'Action', 'Details', 'Authority Level'],
        ['1 (Immediate)', 'Activate traffic filtering at STP edge', 'Work with Network Ops to apply ACLs limiting suspicious GT traffic', 'NOC Manager + SOC Manager jointly'],
        ['2 (Immediate)', 'Scale SS7 collector/analyser capacity', 'Add consumer instances, increase partition counts', 'SOC Engineer (auto-scale if configured)'],
        ['3 (Urgent)', 'Preserve all PCAPs during attack window', 'Ensure capture continues, verify storage sufficient', 'NOC Engineer'],
        ['4 (Urgent)', 'Notify carrier peers if attack originates externally', 'Use established GSMA security contact channels', 'Security Liaison'],
        ['5 (Follow-up)', 'Post-attack forensics', 'Analyze attack source, method, motivation for attribution', 'Intel Team + Security Architect'],
    ]
    story.append(create_table(dos_actions, col_widths=[70, 175, 210, 85]))
    story.append(Spacer(1, 8))
    
    story.append(PageBreak())
    return story

def build_ch5_investigation():
    story = []
    story.append(add_heading("5. Investigation Procedures", styles['ChapterTitle'], level=0))
    story.append(HRFlowable(width="100%", thickness=1, color=HEADER_FILL, spaceAfter=10))
    
    story.append(Paragraph(
        "Beyond structured runbooks for common incident types, analysts frequently encounter unusual patterns "
        "requiring open-ended investigation methodology. This chapter establishes the investigative framework "
        "for analyzing SS7 security events, including data sources, analytical techniques, evidence handling, "
        "and reporting standards applicable across all investigation types.",
        styles['DocBody']
    ))
    
    story.append(add_heading("5.1 Investigation Data Sources", styles['SectionHeading']))
    
    data_sources = [
        ['Data Source', 'Content', 'Access Method', 'Retention', 'Primary Use Case'],
        ['Raw PCAP files', 'Complete packet capture with payloads', '/var/capture/ss7/ (collector node)', '30 days hot, 7 years cold', 'Deep packet inspection, court evidence'],
        ['Elasticsearch ss7-raw-events', 'Normalized JSON messages', 'Kibana/ES Query API', '7 days searchable, 90 days warm', 'Pattern search, aggregation, statistics'],
        ['Elasticsearch ss7-alerts', 'Generated alerts with context', 'Kibana/ES Query API', '30 days searchable', 'Alert disposition, trending analysis'],
        ['TheHive cases', 'Investigation records with artifacts', 'TheHive Web UI / API', 'Permanent', 'Case management, workflow tracking'],
        ['Kafka topic replay', 'Original event stream (if retained)', 'kafka-console-consumer --from-beginning', '7 days (configurable)', 'Re-analysis with new rules, debugging'],
        ['CDR (Call Detail Records)', 'Billing records from switches', 'Billing system API (authorized access)', '90 days minimum', 'Correlation with fraud, revenue impact calc'],
        ['HLR/VLR logs', 'Subscriber database queries', 'Core network logs (via NetOps)', 'Varies (typically 30 days)', 'Subscriber targeting verification'],
    ]
    story.append(create_table(data_sources, col_widths=[80, 125, 110, 85, 100]))
    story.append(Spacer(1, 8))
    
    story.append(add_heading("5.2 Analytical Techniques", styles['SectionHeading']))
    
    story.append(Paragraph(
        "Effective SS7 investigation combines multiple analytical approaches to build comprehensive understanding "
        "of threats. No single technique suffices for complex attacks; analysts should systematically apply "
        "multiple methods to cross-validate findings and avoid cognitive biases that lead to incorrect conclusions.",
        styles['DocBody']
    ))
    
    techniques = [
        ['Technique', 'Description', 'Application Example', 'Tools Required'],
        ['Temporal Analysis', 'Examine timing patterns, intervals, correlations between events', 'Identify automated vs manual attacks, detect campaign phases', 'ELK time-series, Python pandas/matplotlib'],
        ['Spatial/Geo Analysis', 'Map source/destination locations, identify geographic anomalies', 'Detect impossible roaming (subscriber in two places), spot foreign-origin attacks', 'Grafana geo maps, QGIS for deep analysis'],
        ['Behavioral Profiling', 'Compare current behavior against established baselines for entities', 'Identify compromised accounts deviating from normal usage patterns', 'ML scoring outputs, statistical outlier detection'],
        ['Graph Analysis', 'Build relationship networks between GTs, MSISDNs, IMSIs', 'Uncover coordinated attack infrastructure, identify command-and-control', 'Neo4j (optional), network visualization tools'],
        ['Protocol State Machine', 'Trace MAP/ISUP dialog state transitions for protocol correctness', 'Detect malformed messages indicating protocol fuzzing or tool-based attacks', 'Wireshark SS7 dissectors, custom parsers'],
        ['Correlation Analysis', 'Link SS7 events with IP/network security events', 'Connect signaling attack to initial compromise vector', 'SIEM cross-domain search, timeline visualization'],
    ]
    story.append(create_table(techniques, col_widths=[85, 155, 135, 105]))
    story.append(Spacer(1, 8))
    
    story.append(add_heading("5.3 Evidence Handling Procedures", styles['SectionHeading']))
    
    story.append(Paragraph(
        "SS7 investigations frequently produce evidence subject to legal proceedings, regulatory inquiries, or "
        "internal disciplinary actions. Proper evidence handling from moment of detection ensures admissibility "
        "and prevents challenges to investigation integrity. Follow chain-of-custody procedures rigorously for "
        "all incidents with potential legal ramifications.",
        styles['DocBody']
    ))
    
    evidence_procedures = [
        ['Procedure Step', 'Requirement', 'Implementation', 'Verification'],
        ['Immediate Preservation', 'Secure raw data before any modification', 'Copy PCAPs to evidence store, export ES documents with timestamps', 'Hash verification (SHA-256)'],
        ['Access Logging', 'Record who accessed evidence and when', 'Evidence management system access logs, TheHive audit trail', 'Log review during case closure'],
        ['Integrity Verification', 'Ensure evidence not tampered', 'Periodic hash recomparison, write-once storage for final evidence', 'Hash mismatch triggers incident'],
        ['Secure Storage', 'Encrypt evidence at rest, restrict access', 'AES-256 encryption, role-based access control', 'Access attempt logging'],
        ['Documentation', 'Maintain clear provenance record', 'Evidence custody form with transfer signatures', 'Manager sign-off on transfers'],
    ]
    story.append(create_table(evidence_procedures, col_widths=[100, 120, 145, 105]))
    story.append(Spacer(1, 8))
    
    story.append(create_callout(
        "Legal Hold Requirements",
        "When any investigation potentially involves: (a) fraud exceeding $10,000, (b) government officials "
        "or regulated entities as victims, (c) indications of organized crime involvement, or (d) employee "
        "misconduct - immediately issue legal hold preserving ALL related data regardless of apparent "
        "relevance. Consult Legal before deleting any data in connected systems.",
        'warning'
    ))
    story.append(PageBreak())
    return story

def build_ch6_escalation():
    story = []
    story.append(add_heading("6. Escalation Matrix & Communication", styles['ChapterTitle'], level=0))
    story.append(HRFlowable(width="100%", thickness=1, color=HEADER_FILL, spaceAfter=10))
    
    story.append(Paragraph(
        "Not all SS7 security events can or should be handled at the analyst level. This chapter defines the "
        "escalation framework specifying when and how to involve higher-level resources, external teams, and "
        "management. Proper escalation prevents both under-reaction (missing serious threats) and over-reaction "
        "(wasting leadership time on routine issues). When in doubt, escalate rather than suppress.",
        styles['DocBody']
    ))
    
    story.append(add_heading("6.1 Severity-Based Escalation Triggers", styles['SectionHeading']))
    
    escalation_matrix = [
        ['Current Severity', 'Escalation Condition', 'Escalate To', 'Response SLA', 'Notification Method'],
        ['CRITICAL', 'Always (auto-escalate on creation)', 'SOC Manager + On-call CISO', '15 minute acknowledge', 'PagerDuty P1 + Phone call + Slack @channel'],
        ['CRITICAL', 'No response from primary after 10 min', 'Deputy SOC Manager + NOC Manager', 'Immediate', 'Phone call + PagerDuty escalation'],
        ['HIGH', 'Affects VIP/government subscriber', 'Privacy Officer + SOC Manager', '30 minute acknowledge', 'PagerDuty P2 + Email + Slack'],
        ['HIGH', 'Indicates possible insider involvement', 'HR Security + Internal Audit', '1 hour acknowledge', 'Email to security-hr mailing list'],
        ['HIGH', 'External media/press awareness possible', 'Corporate Communications + Legal', 'Immediate', 'Phone call to comms on-call'],
        ['MEDIUM', 'Pattern suggests larger campaign', 'Intel Team for threat landscape review', '4 hour acknowledge', 'TheHive case assignment + Email'],
        ['MEDIUM', 'Requires network configuration change', 'Network Security Team (firewall/STP)', 'Next business day (or emergency)', 'Ticket in ServiceNow/Jira + Email'],
        ['LOW', 'Recurring false positive from rule', 'Rules Engineering Team', 'Weekly batch review', 'Jira ticket for rule tuning'],
    ]
    story.append(create_table(escalation_matrix, col_widths=[70, 140, 120, 85, 115]))
    story.append(Spacer(1, 8))
    
    story.append(add_heading("6.2 External Communication Protocols", styles['SectionHeading']))
    
    story.append(Paragraph(
        "SS7 incidents frequently require communication with external parties including peer carriers, law "
        "enforcement, regulatory bodies, and vendors. All external communication must follow established "
        "protocols to protect Djezzy's interests while maintaining cooperative relationships essential for "
        "telecom security. Never admit fault or liability in external communications without Legal review.",
        styles['DocBody']
    ))
    
    external_comms = [
        ['Party', 'Communication Channel', 'Authorized Content', 'Approval Required', 'Template Available'],
        ['Peer Carrier (abuse complaint)', 'GSMA ISG portal + email', 'Technical details of abuse from their network', 'SOC Manager', 'Yes - template ABUSE-NOTIF-001'],
        ['Peer carrier (evidence request)', 'Official legal channel only', 'Only with court order or MLAT', 'Legal Department + CISO', 'Yes - template EVIDENCE-RESP-001'],
        ['ANRT (mandatory report)', 'ANRT secure portal API', 'Incident summary, affected subscribers count, actions taken', 'Compliance Officer', 'Yes - template ANRT-REPORT-MONTHLY'],
        ['ANRT (critical incident)', 'ANRT secure portal + phone', 'Immediate notification per Circular 05/2023', 'CISO directly', 'Yes - template ANRT-CRITICAL-001'],
        ['Law Enforcement (formal request)', 'Registered legal address only', 'Only via formal legal process', 'Legal Department exclusively', 'No - Legal handles entirely'],
        ['Vendor (product defect)', 'Support portal + account manager', 'Technical details, reproduction steps', 'Procurement + Engineering', 'No - case-by-case'],
        ['Press/Media (inquiry)', 'Corporate Communications ONLY', 'Redirect all inquiries, never comment', 'Never respond directly', 'No - refer to PR immediately'],
    ]
    story.append(create_table(external_comms, col_widths=[105, 100, 140, 85, 100]))
    story.append(Spacer(1, 8))
    
    story.append(create_callout(
        "Information Classification Reminder",
        "When communicating externally, classify information appropriately: (INTERNAL) for operational details, "
        "(CONFIDENTIAL) for subscriber-identifiable data and investigation methods, (RESTRICTED) for "
        "vulnerability specifics and network architecture details. When uncertain, classify one level "
        "higher than seems necessary. Misclassification consequences favor over-classification.",
        'info'
    ))
    story.append(PageBreak())
    return story

def build_ch7_maintenance():
    story = []
    story.append(add_heading("7. Maintenance Procedures", styles['ChapterTitle'], level=0))
    story.append(HRFlowable(width="100%", thickness=1, color=HEADER_FILL, spaceAfter=10))
    
    story.append(Paragraph(
        "Regular maintenance ensures the SS7 module continues operating effectively over time. This chapter "
        "documents scheduled maintenance tasks, rule update procedures, model retraining workflows, and "
        "capacity planning activities. Maintenance windows should be coordinated with NOC to minimize impact "
        "on monitoring coverage during planned work.",
        styles['DocBody']
    ))
    
    story.append(add_heading("7.1 Scheduled Maintenance Calendar", styles['SectionHeading']))
    
    maint_calendar = [
        ['Task', 'Frequency', 'Duration', 'Window', 'Owner', 'Impact'],
        ['PCAP rotation & archival', 'Daily (02:00)', '2 hours', 'Low traffic (02:00-04:00)', 'NOC Engineer', 'None (automated, redundant capture)'],
        ['Kafka log compaction', 'Daily (04:00)', '1 hour', 'Low traffic (04:00-05:00)', 'Kafka Admin', 'Brief increased latency'],
        ['Elasticsearch index optimization', 'Weekly (Sunday 03:00)', '4 hours', 'Maintenance window', 'ES Admin', 'Reduced search performance'],
        ['Detection rule review & tuning', 'Weekly (Tuesday 10:00)', '2 hours', 'Business hours', 'Rules Engineer', 'None (rules versioned, rollback available)'],
        ['Threat intelligence feed update', 'Daily (06:00, 14:00, 22:00)', '30 min each', 'Automated + validation', 'Intel Analyst', 'Brief rule reload'],
        ['ML model retraining', 'Monthly (1st of month)', '8 hours', 'Coordinated maintenance', 'ML Engineer', 'Analyzer restart required'],
        ['Backup verification drill', 'Monthly (15th)', '4 hours', 'Flexible', 'SOC Engineer + Backup Admin', 'None (read-only verification)'],
        ['Capacity planning review', 'Quarterly', '4 hours', 'Business hours', 'SOC Architect + Capacity Team', 'Planning only'],
        ['Disaster recovery test', 'Bi-annual', '8 hours', 'Weekend maintenance', 'Full SOC team + Network Ops', 'DR site active, brief coverage gap'],
    ]
    story.append(create_table(maint_calendar, col_widths=[115, 85, 50, 100, 85, 110]))
    story.append(Spacer(1, 8))
    
    story.append(add_heading("7.2 Detection Rule Update Procedure", styles['SectionHeading']))
    
    story.append(Paragraph(
        "Detection rules require regular updates to address new attack variants, reduce false positive rates, and "
        "incorporate threat intelligence from MISP/OpenCTI feeds. All rule changes follow a controlled process "
        "with testing before production deployment to prevent unintended alert floods or detection gaps.",
        styles['DocBody']
    ))
    
    rule_update_steps = [
        ['Phase', 'Steps', 'Validation', 'Rollback Plan'],
        ['Development', '1. Create rule branch in git repo\n2. Write/update YAML rule definition\n3. Add unit tests for expected matches\n4. Test against historical PCAP corpus\n5. Document rule logic and thresholds', 'Unit tests pass\nFalse positive rate <5% on test data\nNo performance regression (>10% latency)', 'Git revert to previous commit\nReload old rules from backup'],
        ['Staging', '1. Deploy to staging environment (separate Kafka cluster)\n2. Run against live traffic mirror (read-only)\n3. Monitor alert output for 24 hours\n4. Get peer analyst review of sample alerts\n5. Adjust thresholds based on FP feedback', 'Staging alert volume within 20% of production\nNo CRITICAL alerts on known-good traffic\nPeer sign-off documented', 'Switch staging to production rules\nRedeploy previous rule version'],
        ['Production', '1. Schedule change window with NOC\n2. Deploy rules to analyzer containers\n3. Monitor alert queue for 1 hour post-deploy\n4. Verify expected rule count loaded\n5. Update rule documentation version', 'Alert rate stable (+/- 20% of pre-deployment)\nNo analyzer errors in logs\nDashboard shows updated rule version', 'Instant rollback: reload previous rules file\nAuto-rollback if error rate >50% increase'],
    ]
    story.append(create_table(rule_update_steps, col_widths=[65, 220, 145, 130]))
    story.append(Spacer(1, 8))
    
    story.append(add_heading("7.3 Performance Tuning & Capacity Planning", styles['SectionHeading']))
    
    story.append(Paragraph(
        "As Djezzy's subscriber base grows and traffic patterns evolve, the SS7 module requires periodic "
        "capacity adjustments. Proactive capacity planning prevents performance degradation during traffic spikes "
        "or seasonal events (Ramadan, holidays, promotions). Monitor leading indicators to predict capacity needs "
        "before they become critical.",
        styles['DocBody']
    ))
    
    capacity_metrics = [
        ['Metric', 'Current Threshold', 'Warning At', 'Critical At', 'Scaling Action'],
        ['Kafka consumer lag (avg)', '<1000 messages', '>5000', '>20000', 'Add consumer instances'],
        ['Collector CPU utilization', '<60%', '>75%', '>90%', 'Scale horizontally or optimize decode'],
        ['Analyzer processing latency', '<500ms (p99)', '>1s', '>3s', 'Add analyzer instances, tune rules'],
        ['Elasticsearch indexing latency', '<2s', '>5s', '>10s', 'Add index nodes, reduce refresh interval'],
        ['PCAP disk utilization', '<70%', '>80%', '>90%', 'Expand storage, accelerate archival'],
        ['Memory usage per container', '<70% of limit', '>85%', '>95%', 'Increase memory limit, check for leaks'],
        ['Message buffer saturation', '<50%', '>70%', '>90%', 'Increase buffer size, speed up consumers'],
    ]
    story.append(create_table(capacity_metrics, col_widths=[115, 85, 65, 65, 145]))
    story.append(PageBreak())
    return story

def build_ch8_health_checks():
    story = []
    story.append(add_heading("8. Quick Reference: Health Checks & Diagnostics", styles['ChapterTitle'], level=0))
    story.append(HRFlowable(width="100%", thickness=1, color=HEADER_FILL, spaceAfter=10))
    
    story.append(Paragraph(
        "This chapter provides quick reference material for common diagnostic and troubleshooting tasks. Print or "
        "bookmark this section for rapid access during incident response when time pressure prevents consulting "
        "more detailed chapters. Commands assume execution from the SOC operations jump host with proper SSH "
        "keys and environment variables configured.",
        styles['DocBody']
    ))
    
    story.append(add_heading("8.1 Essential Diagnostic Commands", styles['SectionHeading']))
    
    diag_commands = [
        ['Check', 'Command', 'Healthy Output Example', 'Common Issues'],
        ['Collector health', 'curl -s http://ss7-collector:7000/health | python3 -m json.tool', '{"status":"healthy","messages_processed":1234567,"uptime":86400}', 'Connection refused: service down'],
        ['Analyzer health', 'curl -s http://ss7-analyzer:7001/health | python3 -m json.tool', '{"status":"healthy","rules_loaded":42,"ml_model_version":"2.1"}', 'Rules count 0: config mount missing'],
        ['Kafka topics', 'kafka-topics.sh --bootstrap-server kafka-1:9092 --list', 'ss7-raw-events, ss7-alerts, diameter-events...', 'Topics missing: create failed'],
        ['Consumer lag', 'kafka-consumer-groups.sh --bootstrap-server kafka-1:9092 --describe --group ss7-analyzer', 'LAG: 0 for all partitions', 'High lag: consumers slow/blocked'],
        ['ES cluster health', 'curl -s es-master:9200/_cluster/health?pretty | grep status', '"status" : "green"', 'yellow/red: shard issues'],
        ['ES index size', 'curl -s es-master:9200/_cat/indices/ss7-*?v', 'ss7-raw-2025.08.01  15GB 2000000 docs', 'Index too large: adjust retention'],
        ['Disk space (collector)', 'ssh collector "df -h /var/capture/ss7"', '/dev/nvme1n1  2.0T  800G  1.2T  40% /capture', '>90%: need expansion'],
        ['Docker container status', 'docker compose -f docker-compose.prod.yml ps ss7-ss7', 'ss7-collector Up (healthy) 0.0.0.0:2904->2904/tcp', 'Restarting: crash loop'],
        ['TheHive connectivity', 'curl -s -H "X-API-Key: $THEHIVE_KEY" thehive:9000/api/user/current | python3 -m json.tool | grep name', '"name":"soc_analyst_01"', '401 Unauthorized: expired/invalid key'],
    ]
    story.append(create_table(diag_commands, col_widths=[80, 185, 130, 115]))
    story.append(Spacer(1, 10))
    
    story.append(add_heading("8.2 Common Issues Quick Fixes", styles['SectionHeading']))
    
    quick_fixes = [
        ['Symptom', 'Quick Fix', 'If Fix Fails'],
        ['No alerts despite traffic', 'Check if analyzer rules loaded: curl analyzer:7001/health. Restart analyzer if rules_count=0.', 'Check Kafka topic permissions, verify ES index exists'],
        ['High false positive rate', 'Temporarily increase threshold in rule YAML, redeploy, monitor for 24 hours.', 'Engage Rules Engineering for fundamental fix'],
        ['Kafka consumer stuck', 'Restart consumer group: kafka-consumer-groups --reset-offsets --to-latest', 'Check for partition imbalance, rebalance cluster'],
        ['TheHive case creation failing', 'Verify API key validity, check rate limit status in TheHive admin panel', 'Queue to dead-letter, implement batching'],
        ['PCAP rotation failing', 'Check disk space, permissions on /var/capture. Manually rotate: mv capture.pcap archive/', 'Expand storage, check cron job configuration'],
        ['Grafana datasource error', 'Test connection in Grafana DataSource settings. Refresh credentials if expired.', 'Check ES/Kafka service health, network connectivity'],
    ]
    story.append(create_table(quick_fixes, col_widths=[115, 215, 160]))
    story.append(Spacer(1, 10))
    
    story.append(add_heading("8.3 Emergency Contacts Reference", styles['SectionHeading']))
    
    contacts = [
        ['Role', 'Primary Contact', 'Backup Contact', 'Escalation Path', 'Availability'],
        ['SOC Manager (shift)', 'On-call PagerDuty schedule', 'Deputy SOC Manager (phone list)', 'CISO after hours', '24/7 (primary 8am-8pm)'],
        ['NOC Engineer (infrastructure)', 'NOC PagerDuty schedule', 'NOC Manager (phone list)', 'IT Director after hours', '24/7'],
        ['Network Security (STP/firewall)', 'NetSec team email + Slack channel', 'Network Director (email)', 'CTO for emergency changes', 'Business hours + on-call weekends'],
        ['Privacy Officer', 'privacy@djezzy.dz (email)', 'DPO Deputy (email)', 'Legal Director (email)', 'Business hours, 4hr response SLA'],
        ['Fraud Team', 'fraud-team@djezzy.dz (email)', 'Fraud Manager (phone)', 'CFO office for executive issues', 'Business hours + IRSF on-call'],
        ['Legal/Law Enforcement Liaison', 'legal-security@djezzy.dz (email)', 'General Counsel (phone)', 'External counsel for litigation', 'Business hours, 2hr urgent SLA'],
        ['Vendor Support (SS7 tools)', 'Contract support portal + account manager', 'Technical account manager', 'Vendor escalation matrix', 'Per contract SLA'],
    ]
    story.append(create_table(contacts, col_widths=[105, 125, 105, 100, 85]))
    story.append(PageBreak())
    return story

def build_appendix():
    story = []
    
    story.append(add_heading("Appendix A: Checklist Summary", styles['ChapterTitle'], level=0))
    story.append(HRFlowable(width="100%", thickness=1, color=HEADER_FILL, spaceAfter=10))
    
    checklists = [
        ['Checklist', 'Frequency', 'Location', 'Sign-off Required'],
        ['Shift Start Health Verification', 'Each shift', 'Section 2.1', 'Self (documented in log)'],
        ['Overnight Alert Review', 'Each shift', 'Section 2.1', 'Self (documented in log)'],
        ['Baseline Metrics Capture', 'Each shift', 'Section 2.1', 'Self (documented in log)'],
        ['Dashboard Anomaly Check', 'Every 15 min', 'Section 3.1-3.2', 'Self (alert if anomalous)'],
        ['Handover Preparation', 'End of shift', 'Section 2.3', 'Outgoing analyst'],
        ['Handover Acceptance', 'Start of shift', 'Section 2.3', 'Incoming analyst'],
        ['Weekly Rule Effectiveness Review', 'Tuesday', 'Section 7.2', 'Rules Engineer + SOC Lead'],
        ['Monthly Backup Verification', '15th of month', 'Section 7.1', 'SOC Engineer + Backup Admin'],
        ['Quarterly Capacity Planning Review', 'Quarter start', 'Section 7.3', 'SOC Architect + Capacity Team'],
        ['Bi-Annual DR Test', 'Jan / Jul', 'Section 7.1', 'Full SOC team (test report)'],
        ['Post-Incident Review (per major incident)', 'Within 1 week of closure', 'Section 4.x (runbook closure)', 'SOC Lead + involved analysts'],
    ]
    story.append(create_table(checklists, col_widths=[155, 75, 85, 130]))
    story.append(Spacer(1, 15))
    
    story.append(add_heading("Appendix B: Key Metrics Definitions", styles['ChapterTitle'], level=0))
    story.append(HRFlowable(width="100%", thickness=1, color=HEADER_FILL, spaceAfter=10))
    
    metrics_defs = [
        ['Metric', 'Definition', 'Calculation', 'Target Range'],
        ['EPS (Events Per Second)', 'Rate of SS7 messages processed by collector', 'Count(messages) / second', '35,000 - 50,000'],
        ['MTTD (Mean Time To Detect)', 'Average time from attack start to alert generation', 'Sum(detection_time - attack_start) / N alerts', '<60 seconds (automated), <15 min (behavioral)'],
        ['MTTR (Mean Time To Respond)', 'Average time from alert to initial containment action', 'Sum(response_time - alert_time) / N alerts', '<5 minutes (CRITICAL), <30 min (HIGH)'],
        ['False Positive Rate', 'Percentage of alerts dismissed as non-threats', 'Dismissed alerts / Total alerts * 100', '<20% (per rule), <15% (overall)'],
        ['Consumer Lag', 'Messages in Kafka awaiting consumption', 'Log-end offset - consumer-offset', '<10,000 (sustained)'],
        ['Detection Coverage', 'Percentage of known attack patterns with active rules', 'Rules covering attack_types / Total known types * 100', '>90% (for TPs in MITRE ATT&CK Mobile)'],
        ['Rule Precision', 'Percentage of alerts that are true positives', 'True positive alerts / Total alerts * 100', '>80% (per rule, 30-day rolling)'],
        ['Revenue Saved (IRSF)', 'Estimated fraud loss prevented by blocking', 'Blocked calls * avg_premium_rate * avg_duration', 'Track monthly, aim >$100K/month'],
    ]
    story.append(create_table(metrics_defs, col_widths=[95, 130, 130, 110]))
    story.append(Spacer(1, 15))
    
    story.append(add_heading("Appendix C: Document Control", styles['ChapterTitle'], level=0))
    story.append(HRFlowable(width="100%", thickness=1, color=HEADER_FILL, spaceAfter=10))
    
    version_info = [
        ['Property', 'Value'],
        ['Document Title', 'Djezzy SOC Platform - SS7 Security Module Operations Manual'],
        ['Document Owner', 'SOC Operations Manager'],
        ['Version', '2.0'],
        ['Effective Date', datetime.now().strftime('%Y-%m-%d')],
        ['Review Cycle', 'Quarterly (or after significant incident)'],
        ['Next Review Date', '(Calculated from effective date + 3 months)'],
        ['Approval Authority', 'CISO + SOC Director (joint sign-off)'],
        ['Distribution', 'Internal - SOC, NOC, Security Engineering, Compliance'],
        ['Classification', 'Internal Operations - Confidential'],
    ]
    story.append(create_table(version_info, col_widths=[120, 340]))
    
    return story

# ============================================================================
# MAIN
# ============================================================================

def generate_operations_manual():
    output_path = '/home/z/my-project/download/Djezzy_SOC_SS7_Operations_Manual.pdf'
    
    doc = SimpleDocTemplate(output_path, pagesize=A4, rightMargin=18*mm, leftMargin=18*mm,
                          topMargin=22*mm, bottomMargin=22*mm,
                          title='Djezzy SOC - SS7 Security Operations Manual',
                          author='Djezzy SOC Operations Team',
                          subject='SS7 Security Operations Procedures and Runbooks')
    
    story = []
    story.extend(build_cover())
    story.extend(build_toc())
    story.extend(build_ch1_introduction())
    story.extend(build_ch2_daily_ops())
    story.extend(build_ch3_monitoring())
    story.extend(build_ch4_incident_response())
    story.extend(build_ch5_investigation())
    story.extend(build_ch6_escalation())
    story.extend(build_ch7_maintenance())
    story.extend(build_ch8_health_checks())
    story.extend(build_appendix())
    
    print("Generating SS7 Operations Manual...")
    doc.build(story, onFirstPage=page_template, onLaterPages=page_template)
    print(f"Generated: {output_path}")
    
    size = os.path.getsize(output_path)
    print(f"File size: {size/(1024*1024):.2f} MB ({size:,} bytes)")
    return output_path

if __name__ == '__main__':
    generate_operations_manual()
