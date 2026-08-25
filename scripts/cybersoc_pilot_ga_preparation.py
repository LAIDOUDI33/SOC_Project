#!/usr/bin/env python3
"""
CyberSOC Platform - Pilot/Beta Program & General Availability (GA) Preparation
Phase 6 of Go-Live Roadmap - FINAL PHASE
Complete go-to-market preparation, pilot program execution, and GA launch materials
"""

import os
import sys
from datetime import datetime, timedelta
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, cm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, ListFlowable, ListItem, KeepTogether, Preformatted
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY, TA_RIGHT
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus.flowables import HRFlowable

# Constants
FONT_DIR = '/usr/share/fonts'
OUTPUT_DIR = '/home/z/my-project/download'
pt = 1

# Register fonts
pdfmetrics.registerFont(TTFont('NotoSerifSC', f'{FONT_DIR}/truetype/noto-serif-sc/NotoSerifSC-Regular.ttf'))
pdfmetrics.registerFont(TTFont('NotoSerifSC-Bold', f'{FONT_DIR}/truetype/noto-serif-sc/NotoSerifSC-Bold.ttf'))
pdfmetrics.registerFont(TTFont('SarasaMonoSC', f'{FONT_DIR}/truetype/chinese/SarasaMonoSC-Regular.ttf'))

# Cascade Palette for CyberSOC
PAGE_BG       = colors.HexColor('#f2f2f1')
SECTION_BG    = colors.HexColor('#ebeae8')
CARD_BG       = colors.HexColor('#f0efec')
TABLE_STRIPE  = colors.HexColor('#f5f5f3')
HEADER_FILL   = colors.HexColor('#5c543c')
COVER_BLOCK   = colors.HexColor('#595343')
BORDER        = colors.HexColor('#d7d3c7')
ICON          = colors.HexColor('#907b3a')
ACCENT        = colors.HexColor('#866f2c')
ACCENT_2      = colors.HexColor('#735bb9')
TEXT_PRIMARY  = colors.HexColor('#161614')
TEXT_MUTED    = colors.HexColor('#807e76')
SEM_SUCCESS   = colors.HexColor('#3c8956')
SEM_WARNING   = colors.HexColor('#b59048')
SEM_ERROR     = colors.HexColor('#8c504b')
SEM_INFO      = colors.HexColor('#42678d')


def create_styles():
    """Create custom paragraph styles"""
    styles = getSampleStyleSheet()
    
    styles.add(ParagraphStyle(name='CyberSOCTitle', fontName='NotoSerifSC-Bold', fontSize=28, leading=34, alignment=TA_CENTER, textColor=HEADER_FILL, spaceAfter=20))
    styles.add(ParagraphStyle(name='CyberSOCSubtitle', fontName='NotoSerifSC', fontSize=16, leading=22, alignment=TA_CENTER, textColor=TEXT_MUTED, spaceAfter=30))
    styles.add(ParagraphStyle(name='CyberSOCH1', fontName='NotoSerifSC-Bold', fontSize=18, leading=24, textColor=HEADER_FILL, spaceBefore=20, spaceAfter=12))
    styles.add(ParagraphStyle(name='CyberSOCH2', fontName='NotoSerifSC-Bold', fontSize=14, leading=19, textColor=ACCENT, spaceBefore=15, spaceAfter=8))
    styles.add(ParagraphStyle(name='CyberSOCH3', fontName='NotoSerifSC-Bold', fontSize=12, leading=16, textColor=TEXT_PRIMARY, spaceBefore=12, spaceAfter=6))
    styles.add(ParagraphStyle(name='CyberSOCBody', fontName='NotoSerifSC', fontSize=10, leading=15, alignment=TA_JUSTIFY, textColor=TEXT_PRIMARY, spaceBefore=4, spaceAfter=8))
    styles.add(ParagraphStyle(name='CyberSOCBodyNoIndent', fontName='NotoSerifSC', fontSize=10, leading=15, alignment=TA_JUSTIFY, textColor=TEXT_PRIMARY, spaceBefore=4, spaceAfter=8))
    styles.add(ParagraphStyle(name='CyberSOCCode', fontName='SarasaMonoSC', fontSize=8, leading=11, textColor=TEXT_PRIMARY, backColor=CARD_BG, borderColor=BORDER, borderWidth=1, borderPadding=8, spaceBefore=6, spaceAfter=6))
    styles.add(ParagraphStyle(name='CyberSOCBullet', fontName='NotoSerifSC', fontSize=10, leading=14, textColor=TEXT_PRIMARY, leftIndent=20, spaceBefore=2, spaceAfter=2))
    styles.add(ParagraphStyle(name='CyberSOCCaption', fontName='NotoSerifSC', fontSize=9, leading=12, alignment=TA_CENTER, textColor=TEXT_MUTED, spaceBefore=4, spaceAfter=12))

    return styles


def create_section_table(data, col_widths, styles):
    """Create styled table with CyberSOC theme"""
    table = Table(data, colWidths=col_widths, repeatRows=1)
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), HEADER_FILL),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'NotoSerifSC-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 9),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('FONTNAME', (0, 1), (-1, -1), 'NotoSerifSC'),
        ('FONTSIZE', (0, 1), (-1, -1), 8),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [CARD_BG, TABLE_STRIPE]),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    return table


def build_pilot_ga_preparation_guide():
    """Build the Pilot Program & GA Preparation Guide"""
    
    output_path = os.path.join(OUTPUT_DIR, 'Cybersoc_Pilot_Beta_GA_Preparation_Guide.pdf')
    doc = SimpleDocTemplate(output_path, pagesize=A4, rightMargin=2*cm, leftMargin=2*cm, topMargin=2.5*cm, bottomMargin=2*cm)
    
    styles = create_styles()
    story = []
    
    # ==================== COVER PAGE ====================
    story.append(Spacer(1, 80))
    story.append(Paragraph("CyberSOC Platform", styles['CyberSOCTitle']))
    story.append(Spacer(1, 10))
    story.append(Paragraph("Pilot/Beta Program & GA Preparation Guide", styles['CyberSOCTitle']))
    story.append(Spacer(1, 30))
    story.append(Paragraph("Phase 6: Final Go-Live Phase", styles['CyberSOCSubtitle']))
    story.append(Spacer(1, 20))
    story.append(HRFlowable(width="60%", thickness=2, color=ACCENT, spaceBefore=10, spaceAfter=10))
    story.append(Spacer(1, 30))
    
    meta_data = [
        ['Document Type', 'Go-to-Market Execution Plan'],
        ['Version', '1.0.0 - Launch Ready'],
        ['Classification', 'Internal / Customer-Facing'],
        ['Date', datetime.now().strftime('%Y-%m-%d')],
        ['Target GA Date', (datetime.now() + timedelta(days=90)).strftime('%Y-%m-%d')],
        ['Program Owner', 'Product + GTM Leadership'],
    ]
    meta_table = Table(meta_data, colWidths=[150, 250])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), SECTION_BG),
        ('FONTNAME', (0, 0), (0, -1), 'NotoSerifSC-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('TEXTCOLOR', (0, 0), (-1, -1), TEXT_PRIMARY),
        ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
        ('ALIGN', (1, 0), (1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 12),
        ('RIGHTPADDING', (0, 0), (-1, -1), 12),
    ]))
    story.append(meta_table)
    
    story.append(PageBreak())
    
    # ==================== TABLE OF CONTENTS ====================
    story.append(Paragraph("Table of Contents", styles['CyberSOCH1']))
    story.append(Spacer(1, 15))
    
    toc_items = [
        ("Part A: Pilot Program Framework", ""),
        ("1. Program Objectives and Success Criteria", "What we aim to validate"),
        ("2. Participant Selection and Onboarding", "Customer qualification criteria"),
        ("3. Pilot Timeline and Milestones", "8-week program schedule"),
        ("4. Feedback Collection Mechanisms", "Surveys, interviews, metrics"),
        ("5. Success Metrics and Exit Criteria", "Go/No-Go decision framework"),
        ("", ""),
        ("Part B: Beta Program Expansion", ""),
        ("6. Beta Program Structure", "Scaled validation approach"),
        ("7. Participant Communication Plan", "Updates and engagement"),
        ("8. Issue Triage and Resolution", "Bug handling workflow"),
        ("", ""),
        ("Part C: General Availability Preparation", ""),
        ("9. GA Launch Checklist", "Pre-launch requirements"),
        ("10. Go-to-Market Strategy", "Positioning, messaging, channels"),
        ("11. Sales Enablement", "Training and collateral"),
        ("12. Support Readiness", "Team, tools, processes"),
        ("13. Customer Onboarding Materials", "Getting started resources"),
        ("14. Launch Day Playbook", "Execution runbook"),
    ]
    
    for item, desc in toc_items:
        if item == "":
            story.append(Spacer(1, 5))
        elif desc == "":
            story.append(Paragraph(f"<b>{item}</b>", styles['CyberSOCBodyNoIndent']))
        else:
            story.append(Paragraph(f"{item} — {desc}", styles['CyberSOCBodyNoIndent']))
    
    story.append(PageBreak())
    
    # ==================== PART A: PILOT PROGRAM ====================
    story.append(Paragraph("PART A: Pilot Program Framework", styles['CyberSOCTitle']))
    story.append(HRFlowable(width="100%", thickness=2, color=ACCENT, spaceBefore=5, spaceAfter=20))
    
    # Section 1: Objectives
    story.append(Paragraph("1. Program Objectives and Success Criteria", styles['CyberSOCH1']))
    story.append(HRFlowable(width="100%", thickness=1, color=BORDER, spaceBefore=5, spaceAfter=15))
    
    objectives_intro = """
The CyberSOC Pilot Program represents a controlled production validation phase where selected customers deploy the platform in realistic operational environments under enhanced support engagement. The program's primary objective is validating product-market fit through real-world usage patterns while gathering actionable feedback informing final GA refinements. Secondary objectives include building reference customer relationships, creating case study material for marketing leverage, and stress-testing support infrastructure at limited scale before broader market exposure. Clear success criteria enable objective Go/No-Go decisions preventing premature GA launch with unresolved critical issues or insufficient market validation.
"""
    story.append(Paragraph(objectives_intro.strip(), styles['CyberSOCBodyNoIndent']))
    
    story.append(Paragraph("1.1 Primary Validation Objectives", styles['CyberSOCH2']))
    
    objectives_data = [
        ['Objective ID', 'Objective Description', 'Validation Method', 'Success Measure'],
        ['OBJ-001', 'Core workflow usability validation', 'Task completion observation', '> 80% tasks completed without assistance'],
        ['OBJ-002', 'Performance at customer scale', 'Metrics collection, interviews', 'SLAs met in > 90% of measurement periods'],
        ['OBJ-003', 'Integration compatibility', 'Integration workshop outcomes', '> 70% planned integrations successful'],
        ['OBJ-004', 'Security posture acceptance', 'Security questionnaire, audit', 'Zero critical findings, < 3 high'],
        ['OBJ-005', 'Support process effectiveness', 'Ticket analysis, CSAT surveys', 'MTTR < 4 hours, CSAT > 4.0/5.0'],
        ['OBJ-006', 'Value proposition confirmation', 'ROI interviews, usage analytics', '> 75% pilots report positive ROI indicators'],
        ['OBJ-007', 'Reference willingness assessment', 'Explicit commitment request', '> 50% agree to reference participation'],
    ]
    story.append(create_section_table(objectives_data, [60, 155, 115, 130], styles))
    story.append(Paragraph("Table 1.1: Pilot Program Validation Objectives", styles['CyberSOCCaption']))
    
    # Section 2: Participant Selection
    story.append(Paragraph("2. Participant Selection and Onboarding", styles['CyberSOCH1']))
    story.append(HRFlowable(width="100%", thickness=1, color=BORDER, spaceBefore=5, spaceAfter=15))
    
    selection_intro = """
Pilot participant selection balances representativeness across target market segments against practical constraints including geographic distribution, technical capability alignment, and engagement availability during the intensive pilot period. Ideal candidates demonstrate genuine pain points the platform addresses, possess organizational influence extending beyond immediate deployment scope, and commit dedicated resources including named primary contacts, backup contacts, and executive sponsors ensuring sustained engagement throughout the program duration.
"""
    story.append(Paragraph(selection_intro.strip(), styles['CyberSOCBodyNoIndent']))
    
    story.append(Paragraph("2.1 Candidate Qualification Criteria", styles['CyberSOCH2']))
    
    criteria_data = [
        ['Criterion', 'Required Profile', 'Preferred Profile', 'Disqualifying Factors'],
        ['Company Size', '500+ employees', '2000+ employees', '< 200 employees (for initial cohort)'],
        ['Industry', 'Any regulated industry', 'Financial services, healthcare', 'None (all industries welcome)'],
        ['SOC Maturity', 'Existing SOC team (5+ analysts)', 'Mature SOC (20+ analysts)', 'No security operations function'],
        ['Technical Capability', 'Kubernetes experience', 'Cloud-native expertise', 'Unable to deploy containerized apps'],
        ['Executive Sponsor', 'CISO or VP Security', 'CISO direct involvement', 'No executive sponsor committed'],
        ['Time Commitment', 'Weekly check-in availability', 'Dedicated pilot resource', '< 2 hours/week available'],
        ['Use Case Fit', 'Clear pain point match', 'Strategic initiative driver', 'Unclear use case or timeline'],
        ['Reference Willingness', 'Willing to provide feedback', 'Agree to case study/public ref', 'Cannot share any information publicly'],
    ]
    story.append(create_section_table(criteria_data, [85, 120, 115, 140], styles))
    story.append(Paragraph("Table 2.1: Pilot Candidate Qualification Matrix", styles['CyberSOCCaption']))
    
    story.append(Paragraph("2.2 Target Pilot Cohort Composition", styles['CyberSOCH2']))
    
    cohort_text = """
The initial pilot cohort targets 8-12 participants providing statistically meaningful feedback while maintaining high-touch support engagement feasible for the pilot program team. Cohort composition intentionally diversifies across industry verticals, company sizes, geographic regions, and use case emphases ensuring broad validation rather than over-optimization for a narrow segment. Each participant receives designated success manager coordination, weekly office hour access to engineering leadership, and priority escalation path to product management for critical issues discovered during pilot operation.
"""
    story.append(Paragraph(cohort_text.strip(), styles['CyberSOCBodyNoIndent']))
    
    cohort_composition = [
        ['Segment', 'Target Count', 'Industries', 'Company Size', 'Primary Use Case'],
        ['Enterprise Security', '3-4', 'Finance, Healthcare, Retail', '5000+ employees', 'Enterprise SOC consolidation'],
        ['Mid-Market SOC', '3-4', 'Manufacturing, Tech, Professional Services', '500-5000 employees', 'SOC efficiency improvement'],
        ['MSSP/Managed Sec', '2-3', 'MSSP industry', 'Varied', 'Platform for managed service delivery'],
        ['Government/Public', '1-2', 'Federal, State/Local', 'Varied', 'Compliance-driven security ops'],
        ['TOTAL COHORT', '8-12', '-', '-', '-'],
    ]
    story.append(create_section_table(cohort_composition, [95, 55, 145, 80, 110], styles))
    story.append(Paragraph("Table 2.2: Target Pilot Cohort Composition", styles['CyberSOCCaption']))
    
    # Section 3: Timeline
    story.append(Paragraph("3. Pilot Timeline and Milestones", styles['CyberSOCH1']))
    story.append(HRFlowable(width="100%", thickness=1, color=BORDER, spaceBefore=5, spaceAfter=15))
    
    timeline_intro = """
The pilot program spans an 8-week intensive engagement period structured into distinct phases progressing from initial deployment through production validation to transition planning. Weekly milestones provide regular checkpoint opportunities for course correction based on emerging findings, while the overall timeline maintains urgency driving toward concrete conclusions supporting GA timing decisions. Flexible extension provisions accommodate participants requiring additional time for specific validations without delaying cohort-wide progression.
"""
    story.append(Paragraph(timeline_intro.strip(), styles['CyberSOCBodyNoIndent']))
    
    story.append(Paragraph("3.1 Week-by-Week Program Schedule", styles['CyberSOCH2']))
    
    schedule_data = [
        ['Week', 'Phase', 'Participant Activities', 'CyberSOC Activities', 'Deliverables'],
        ['W1', 'Onboarding', 'Environment prep, kickoff meeting', 'Deployment support, training', 'Signed pilot agreement, access provisioned'],
        ['W2', 'Installation', 'Platform deployment, basic config', 'Hands-on install support, issue resolution', 'Running platform instance'],
        ['W3', 'Core Workflow', 'Primary use case execution', 'Workflow guidance, best practices', 'Initial usage data collected'],
        ['W4', 'Integration', 'Connect existing tools/data sources', 'Integration engineering support', 'Working integrations documented'],
        ['W5', 'Scale Validation', 'Expand to additional teams/use cases', 'Performance tuning, optimization', 'Scaled usage metrics'],
        ['W6', 'Deep Dive', 'Advanced features exploration', 'Feature workshops, power user training', 'Advanced feature feedback'],
        ['W7', 'Assessment', 'Evaluation, ROI calculation support', 'Data collection, interview scheduling', 'Feedback surveys completed'],
        ['W8', 'Transition', 'Decision discussion, next steps planning', 'GA preview, roadmap input', 'Go/No-Go recommendation, case study draft'],
    ]
    story.append(create_section_table(schedule_data, [30, 65, 125, 120, 110], styles))
    story.append(Paragraph("Table 3.1: 8-Week Pilot Program Schedule", styles['CyberSOCCaption']))
    
    # Section 4: Feedback Collection
    story.append(Paragraph("4. Feedback Collection Mechanisms", styles['CyberSOCH1']))
    story.append(HRFlowable(width="100%", thickness=1, color=BORDER, spaceBefore=5, spaceAfter=15))
    
    feedback_intro = """
Systematic feedback collection ensures comprehensive understanding of pilot experiences capturing both quantitative satisfaction measurements and qualitative insights revealing improvement opportunities invisible from internal perspectives alone. Multi-channel feedback approaches accommodate different communication preferences and capture data at appropriate granularity levels ranging from continuous sentiment monitoring through periodic structured assessments to deep-dive exploratory discussions. All feedback feeds into centralized tracking enabling cross-pilot pattern identification and prioritization of enhancement requests reflecting aggregate customer voice.
"""
    story.append(Paragraph(feedback_intro.strip(), styles['CyberSOCBodyNoIndent']))
    
    story.append(Paragraph("4.1 Feedback Channel Inventory", styles['CyberSOCH2']))
    
    feedback_channels = [
        ['Channel', 'Frequency', 'Participants', 'Output', 'Analysis Method'],
        ['Weekly Check-in Calls', 'Weekly (30 min)', 'Primary contact', 'Discussion notes', 'Thematic coding'],
        ['Usage Analytics Dashboard', 'Continuous', 'Automated', 'Adoption metrics', 'Funnel analysis, cohort comparison'],
        ['CSAT Survey (NPS)', 'Bi-weekly', 'All pilot users', 'Quantitative scores', 'Statistical trending'],
        ['Feature Request Portal', 'Continuous', 'All pilot users', 'Request tickets', 'Duplication clustering, voting'],
        ['Bug Report Form', 'As needed', 'All pilot users', 'Bug reports', 'Severity triage, root cause'],
        ['Exit Interview', 'End of pilot', 'Primary + sponsor', 'Interview transcript', 'Qualitative analysis'],
        ['Executive Business Review', 'Week 7', 'Executive sponsor', 'Business outcome assessment', 'ROI framework application'],
        ['Support Ticket Analysis', 'Continuous', 'All interactions', 'Ticket metadata', 'Category trending, MTTR'],
    ]
    story.append(create_section_table(feedback_channels, [105, 70, 80, 85, 105], styles))
    story.append(Paragraph("Table 4.1: Feedback Collection Channels", styles['CyberSOCCaption']))
    
    # Section 5: Success Metrics
    story.append(Paragraph("5. Success Metrics and Exit Criteria", styles['CyberSOCH1']))
    story.append(HRFlowable(width="100%", thickness=1, color=BORDER, spaceBefore=5, spaceAfter=15))
    
    success_intro = """
Clear success metrics and exit criteria transform subjective "how did it go?" assessments into objective Go/No-Go decisions grounded in measurable evidence. The framework distinguishes between must-have criteria (blocking conditions preventing GA launch until resolved) and nice-to-have criteria (desirable achievements strengthening launch confidence but not individually blocking). Weighted scoring enables holistic evaluation balancing strengths against weaknesses, recognizing that perfect scores across all dimensions are unrealistic while identifying areas requiring risk mitigation strategies if GA proceeds despite specific gaps.
"""
    story.append(Paragraph(success_intro.strip(), styles['CyberSOCBodyNoIndent']))
    
    story.append(Paragraph("5.1 Go/No-Go Decision Matrix", styles['CyberSOCH2']))
    
    gonogo_data = [
        ['Metric Category', 'Specific Metric', 'Target', 'Weight', 'Actual (to be filled)'],
        ['Product Quality', 'Critical bug count', '< 3 total', 'Must-have', '[ ]'],
        ['Product Quality', 'P1/P2 resolution rate', '> 95%', 'Must-have', '[ ]'],
        ['User Satisfaction', 'Overall NPS score', '> 40', '15%', '[ ]'],
        ['User Satisfaction', 'Would recommend (%)', '> 80%', '10%', '[ ]'],
        ['Adoption Depth', 'Daily active users (% invited)', '> 70%', '15%', '[ ]'],
        ['Adoption Depth', 'Core workflows adopted', '> 3 per org', '10%', '[ ]'],
        ['Value Realization', 'Reported efficiency gain', '> 20% improvement', '15%', '[ ]'],
        ['Value Realization', 'Positive ROI indication', '> 60% pilots', '15%', '[ ]'],
        ['Operational Readiness', 'Support MTTR average', '< 4 hours', 'Must-have', '[ ]'],
        ['Operational Readiness', 'Documentation gap count', '< 10 critical', '10%', '[ ]'],
        ['Reference Potential', 'Case study willing (%)', '> 50%', '10%', '[ ]'],
        ['', '', 'WEIGHTED TOTAL', '100%', '[ ]'],
    ]
    story.append(create_section_table(gonogo_data, [95, 120, 80, 60, 90], styles))
    story.append(Paragraph("Table 5.1: Go/No-Go Decision Scoring Matrix", styles['CyberSOCCaption']))
    
    story.append(PageBreak())
    
    # ==================== PART B: BETA PROGRAM ====================
    story.append(Paragraph("PART B: Beta Program Expansion", styles['CyberSOCTitle']))
    story.append(HRFlowable(width="100%", thickness=2, color=ACCENT, spaceBefore=5, spaceAfter=20))
    
    beta_intro = """
The Beta Program expands validated learnings from the Pilot Program to a larger participant base (30-50 organizations) providing scaled validation before full General Availability release. Beta participants experience reduced touch intensity compared to pilot engagement, receiving self-service onboarding resources, community support channels, and standard (non-priority) escalation paths more closely approximating the GA customer experience. This phase validates scalability of support processes, documentation completeness, and platform stability under increased diversity of deployment configurations and usage patterns.
"""
    story.append(Paragraph(beta_intro.strip(), styles['CyberSOCBodyNoIndent']))
    
    # Section 6: Beta Structure
    story.append(Paragraph("6. Beta Program Structure", styles['CyberSOCH1']))
    story.append(HRFlowable(width="100%", thickness=1, color=BORDER, spaceBefore=5, spaceAfter=15))
    
    beta_structure = [
        ['Element', 'Pilot Program', 'Beta Program', 'GA (Future)'],
        ['Participant Count', '8-12', '30-50', 'Unlimited'],
        ['Selection Rigor', 'High (application + interview)', 'Medium (application only)', 'Self-service signup'],
        ['Support Model', 'Dedicated success manager', 'Shared support queue', 'Standard support tiers'],
        ['Onboarding', 'White-glove, hands-on', 'Guided self-service', 'Fully self-service'],
        ['Engagement Duration', '8 weeks fixed', '12 weeks flexible', 'Ongoing subscription'],
        ['Fee Structure', 'Free (exchange for feedback)', 'Discounted licensing', 'Full pricing'],
        ['Feedback Intensity', 'Weekly calls, interviews', 'Bi-weekly surveys, optional calls', 'Community forums, NPS surveys'],
        ['SLA Commitment', 'Best effort, rapid response', 'Published SLAs (beta tier)', 'Contractual SLAs'],
        ['Platform Stability', 'May include hotfixes', 'Release candidate quality', 'Production quality'],
    ]
    story.append(create_section_table(beta_structure, [90, 115, 115, 120], styles))
    story.append(Paragraph("Table 6.1: Pilot vs Beta vs GA Comparison", styles['CyberSOCCaption']))
    
    # Section 7: Communication Plan
    story.append(Paragraph("7. Participant Communication Plan", styles['CyberSOCH1']))
    story.append(HRFlowable(width="100%", thickness=1, color=BORDER, spaceBefore=5, spaceAfter=15))
    
    comm_plan_text = """
Effective communication maintains participant engagement throughout the beta period, setting clear expectations about program progress, known issues under investigation, and upcoming feature releases. Communication cadence balances information freshness against notification fatigue; too-frequent updates cause disengagement while sparse communication leaves participants feeling abandoned. The plan defines standard communication templates for routine updates, issue notifications, and milestone celebrations while preserving flexibility for ad-hoc communications addressing emergent situations requiring immediate participant awareness.
"""
    story.append(Paragraph(comm_plan_text.strip(), styles['CyberSOCBodyNoIndent']))
    
    comm_schedule = [
        ['Communication Type', 'Channel', 'Frequency', 'Owner', 'Content Focus'],
        ['Welcome/Onboarding', 'Email + Portal', 'Once at start', 'Customer Success', 'Getting started, resources, expectations'],
        ['Weekly Digest', 'Email newsletter', 'Weekly (Monday)', 'Product Marketing', 'Tips, highlights, community spotlight'],
        ['Known Issues Update', 'In-app banner + Email', 'As needed', 'Engineering', 'Workarounds, fix timelines'],
        ['New Release Notes', 'Email + Changelog', 'Per release', 'Product Management', 'Features, fixes, migration notes'],
        ['Office Hours', 'Video call (Zoom)', 'Bi-weekly', 'Product/Engineering', 'Q&A, roadmap preview, demos'],
        ['Survey Requests', 'Email + In-app', 'Monthly', 'Customer Success', 'CSAT, NPS, specific feedback'],
        ['Program Milestone', 'Email + Call', 'Month 1, 2, 3', 'Program Manager', 'Progress, appreciation, next steps'],
        ['Transition/GA Notice', 'Email + Call', 'End of beta', 'Leadership', 'GA details, pricing, migration path'],
    ]
    story.append(create_section_table(comm_schedule, [100, 85, 70, 85, 130], styles))
    story.append(Paragraph("Table 7.1: Beta Communication Schedule", styles['CyberSOCCaption']))
    
    # Section 8: Issue Triage
    story.append(Paragraph("8. Issue Triage and Resolution Workflow", styles['CyberSOCH1']))
    story.append(HRFlowable(width="100%", thickness=1, color=BORDER, spaceBefore=5, spaceAfter=15))
    
    issue_triage_text = """
Beta program issue handling balances responsiveness demonstrating customer value against resource constraints preventing unlimited engineering allocation to individual participant problems. The triage workflow classifies incoming issues by severity, impact scope, and reproduction clarity, routing critical production-affecting bugs to emergency resolution paths while queuing enhancement requests and nice-to-have improvements for normal sprint consideration. Transparent status communication keeps submitters informed regardless of resolution timeline, maintaining engagement even when immediate fixes prove impractical.
"""
    story.append(Paragraph(issue_triage_text.strip(), styles['CyberSOCBodyNoIndent']))
    
    issue_workflow = [
        ['Issue Type', 'Examples', 'Response SLA', 'Resolution Target', 'Communication'],
        ['P0 - Critical', 'Data loss, security breach, complete outage', '< 1 hour', '< 24 hours', 'Real-time updates'],
        ['P1 - Major', 'Core feature broken, significant workaround', '< 4 hours', '< 1 week', 'Daily status'],
        ['P2 - Moderate', 'Feature impaired, easy workaround', '< 1 business day', '< 2 sprints', 'Weekly update'],
        ['P3 - Minor', 'Cosmetic, edge case, enhancement request', '< 3 business days', 'Backlog prioritization', 'Triage result'],
        ['Question/How-to', 'Documentation gap, usage confusion', '< 8 hours', 'KB article creation', 'Direct answer'],
        ['Enhancement', 'New feature request', '< 1 week', 'Roadmap consideration', 'Product input acknowledgment'],
    ]
    story.append(create_section_table(issue_workflow, [80, 135, 70, 85, 100], styles))
    story.append(Paragraph("Table 8.1: Beta Issue Classification and Handling", styles['CyberSOCCaption']))
    
    story.append(PageBreak())
    
    # ==================== PART C: GA PREPARATION ====================
    story.append(Paragraph("PART C: General Availability Preparation", styles['CyberSOCTitle']))
    story.append(HRFlowable(width="100%", thickness=2, color=ACCENT, spaceBefore=5, spaceAfter=20))
    
    ga_intro = """
General Availability (GA) marks the transition from controlled release programs to unrestricted market availability, representing contractual commitments to service levels, support response times, and platform stability that customers rely upon for production security operations. GA preparation encompasses cross-functional readiness spanning product maturity, sales enablement, support infrastructure, marketing collateral, legal/compliance documentation, and operational playbooks. This section provides comprehensive checklists and guidance ensuring no critical preparation element is overlooked before flipping the GA switch.
"""
    story.append(Paragraph(ga_intro.strip(), styles['CyberSOCBodyNoIndent']))
    
    # Section 9: GA Launch Checklist
    story.append(Paragraph("9. GA Launch Checklist", styles['CyberSOCH1']))
    story.append(HRFlowable(width="100%", thickness=1, color=BORDER, spaceBefore=5, spaceAfter=15))
    
    ga_checklist_intro = """
The GA Launch Checklist consolidates all prerequisite activities into a single comprehensive reference enabling launch readiness assessment and gap identification. Items span functional domains including product, engineering, sales, marketing, support, legal, finance, and operations. Each item requires explicit sign-off from the responsible owner with evidence references demonstrating completion. The checklist undergoes progressive review cycles starting 90 days pre-GA with increasing frequency as launch date approaches, culminating in final Go/No-Go review 7 days before target GA date.
"""
    story.append(Paragraph(ga_checklist_intro.strip(), styles['CyberSOCBodyNoIndent']))
    
    story.append(Paragraph("9.1 Product & Engineering Readiness", styles['CyberSOCH2']))
    
    product_checklist = [
        ['#', 'Checklist Item', 'Owner', 'Status', 'Evidence', 'Due Date'],
        ['1', 'All P0/P1 bugs from pilot/beta resolved', 'Eng Lead', '[ ]', 'Jira query', 'GA-30'],
        ['2', 'Performance benchmarks meet published SLAs', 'Perf Eng', '[ ]', 'Test report', 'GA-21'],
        ['3', 'Security audit completed with acceptable findings', 'Sec Eng', '[ ]', 'Audit report', 'GA-30'],
        ['4', 'Documentation complete (Admin, User, API, KB)', 'Tech Writer', '[ ]', 'Doc site', 'GA-14'],
        ['5', 'Onboarding flow tested end-to-end', 'PM', '[ ]', 'Test results', 'GA-14'],
        ['6', 'Backup/disaster recovery validated', 'SRE Lead', '[ ]', 'DR test report', 'GA-21'],
        ['7', 'Monitoring/alerting production-ready', 'SRE', '[ ]', 'Dashboard access', 'GA-7'],
        ['8', 'Scaling tested beyond expected Day 1 load', 'Perf Eng', '[ ]', 'Load test report', 'GA-14'],
        ['9', 'Feature flags ready for gradual rollout', 'Eng', '[ ]', 'Config verified', 'GA-7'],
        ['10', 'Rollback procedure tested and documented', 'SRE', '[ ]', 'Runbook link', 'GA-7'],
    ]
    story.append(create_section_table(product_checklist, [25, 210, 55, 35, 65, 50], styles))
    story.append(Paragraph("Table 9.1: Product & Engineering GA Checklist", styles['CyberSOCCaption']))
    
    story.append(Paragraph("9.2 Commercial & Go-to-Market Readiness", styles['CyberSOCH2']))
    
    gtm_checklist = [
        ['#', 'Checklist Item', 'Owner', 'Status', 'Evidence', 'Due Date'],
        ['1', 'Pricing finalized and in CRM/Sales tools', 'Rev Ops', '[ ]', 'Screenshot', 'GA-30'],
        ['2', 'Sales deck updated with GA positioning', 'PMM', '[ ]', 'Slide deck', 'GA-21'],
        ['3', 'Competitive battlecard completed', 'PMM', '[ ]', 'Battlecard doc', 'GA-21'],
        ['4', 'Website GA landing page live', 'Web Team', '[ ]', 'URL', 'GA-7'],
        ['5', 'Press release drafted and approved', 'PR/Comms', '[ ]', 'Draft doc', 'GA-14'],
        ['6', 'Analyst briefing scheduled', 'Product Mktg', '[ ]', 'Calendar invite', 'GA-7'],
        ['7', 'Customer case studies (minimum 3)', 'Customer Mktg', '[ ]', 'Published links', 'GA-14'],
        ['8', 'Demo environment stable for sales use', 'Sales Ops', '[ ]', 'Access verified', 'GA-7'],
        ['9', 'Partner channel briefed (if applicable)', 'Partner Mgr', '[ ]', 'Briefing notes', 'GA-21'],
        ['10', 'Trial/free tier mechanism working', 'Product/Growth', '[ ]', 'Tested flow', 'GA-7'],
    ]
    story.append(create_section_table(gtm_checklist, [25, 205, 60, 35, 65, 50], styles))
    story.append(Paragraph("Table 9.2: Go-to-Market GA Checklist", styles['CyberSOCCaption']))
    
    story.append(Paragraph("9.3 Support & Operations Readiness", styles['CyberSOCH2']))
    
    support_checklist = [
        ['#', 'Checklist Item', 'Owner', 'Status', 'Evidence', 'Due Date'],
        ['1', 'Support team trained on GA product', 'Support Mgr', '[ ]', 'Training records', 'GA-14'],
        ['2', 'Knowledge base articles published (>100)', 'Tech Writer', '[ ]', 'KB URL', 'GA-7'],
        ['3', 'Support ticket queues configured', 'Support Ops', '[ ]', 'Queue list', 'GA-7'],
        ['4', 'Escalation paths tested end-to-end', 'Support Mgr', '[ ]', 'Test ticket', 'GA-7'],
        ['5', 'SLA definitions published and in system', 'Support Ops', '[ ]', 'SLA document', 'GA-14'],
        ['6', 'Customer health scoring dashboard live', 'CS Ops', '[ ]', 'Dashboard', 'GA-7'],
        ['7', 'Onboarding call script finalized', 'CSM Team', '[ ]', 'Script doc', 'GA-14'],
        ['8', 'Churn risk playbook documented', 'CSM Team', '[ ]', 'Playbook link', 'GA-21'],
        ['9', '24/7 on-call rotation established (if applicable)', 'Support Mgr', '[ ]', 'Schedule', 'GA-7'],
        ['10', 'Vendor management contacts shared', 'Support Ops', '[ ]', 'Contact list', 'GA-7'],
    ]
    story.append(create_section_table(support_checklist, [25, 200, 60, 35, 65, 50], styles))
    story.append(Paragraph("Table 9.3: Support & Operations GA Checklist", styles['CyberSOCCaption']))
    
    # Section 10: GTM Strategy
    story.append(Paragraph("10. Go-to-Market Strategy", styles['CyberSOCH1']))
    story.append(HRFlowable(width="100%", thickness=1, color=BORDER, spaceBefore=5, spaceAfter=15))
    
    gtm_strategy_text = """
The CyberSOC Platform go-to-market strategy positions the solution as an AI-Native Security Operations Center Operating System addressing the growing complexity challenge facing modern security operations teams. Core messaging emphasizes three value pillars: intelligent automation reducing analyst workload through AI-assisted threat detection and correlation, unified visibility consolidating fragmented security tools into a single pane of glass, and operational excellence providing enterprise-grade reliability, compliance support, and seamless integration capabilities. Target customer profile focuses on mid-market to enterprise organizations (500-50,000 employees) with mature security operations functions experiencing pain points around tool sprawl, analyst efficiency constraints, or detection coverage gaps.
"""
    story.append(Paragraph(gtm_strategy_text.strip(), styles['CyberSOCBodyNoIndent']))
    
    story.append(Paragraph("10.1 Positioning and Messaging Framework", styles['CyberSOCH2']))
    
    positioning_data = [
        ['Element', 'Statement/Description'],
        ['Elevator Pitch', 'CyberSOC is the AI-Native Security Operations Center OS that unifies threat detection, incident response, and security operations into one intelligent platform, enabling SOC teams to detect threats 10x faster while reducing alert fatigue by 80%.'],
        ['Core Value Prop', 'Transform your SOC from reactive alert-chasing to proactive threat hunting with AI-powered automation that handles the noise so your analysts can focus on what matters.'],
        ['Target Customer', 'Security leaders at mid-market to enterprise organizations (500-50K employees) with established SOC teams (5+ analysts) struggling with tool complexity, analyst burnout, or missed detections.'],
        ['Key Differentiators', '(1) True AI-native architecture vs. bolted-on ML (2) Unified platform vs. point solution integration (3) Enterprise-grade compliance built-in vs. add-on modules (4) Open ecosystem vs. vendor lock-in'],
        ['Competitive Positioning', 'vs. Legacy SIEM: Modern UX, AI-first, 10x faster deployment | vs. XDR native: Broader visibility, flexible integration | vs. SOAR platforms: Native intelligence, lower complexity'],
    ]
    story.append(create_section_table(positioning_data, [100, 365], styles))
    story.append(Paragraph("Table 10.1: GTM Messaging Framework", styles['CyberSOCCaption']))
    
    # Section 11: Sales Enablement
    story.append(Paragraph("11. Sales Enablement Package", styles['CyberSOCH1']))
    story.append(HRFlowable(width="100%", thickness=1, color=BORDER, spaceBefore=5, spaceAfter=15))
    
    sales_enable_text = """
Sales enablement equips customer-facing teams with knowledge, tools, and resources required to effectively communicate value, navigate competitive situations, and guide prospects through evaluation to purchase decision. The enablement package addresses multiple learning styles combining self-paced e-learning modules for foundational knowledge, live workshop sessions for interactive skill development, and just-in-time reference materials supporting specific selling scenarios. Certification requirements ensure minimum competency standards before customer-facing activity, protecting both customer experience and brand reputation.
"""
    story.append(Paragraph(sales_enable_text.strip(), styles['CyberSOCBodyNoIndent']))
    
    sales_package = [
        ['Asset Type', 'Description', 'Audience', 'Availability', 'Update Frequency'],
        ['Product Training (LMS)', 'Self-paced certification course', 'All sales/pre-sales', 'Learning portal', 'Quarterly'],
        ['Sales Deck (PPT)', 'Customer-facing presentation', 'Sales reps', 'Sales enablement tool', 'Monthly'],
        ['Technical Deep Dive', 'Architecture and integration details', 'SEs/Solutions Architects', 'SharePoint', 'Per release'],
        ['Demo Script & Environment', 'Step-by-step demo guide + sandbox', 'Pre-sales/Sales', 'Demo portal', 'Monthly'],
        ['Competitive Battlecard', 'Positioning vs key competitors', 'All customer-facing', 'Sales wiki', 'Quarterly'],
        ['Pricing Calculator', 'Deal pricing configuration tool', 'Sales/SEs', 'CRM integrated', 'Per pricing change'],
        ['ROI Calculator', 'Customer business case builder', 'Sales/SEs', 'Demo portal', 'Annually'],
        ['Objection Handlers', 'Common concerns and responses', 'All customer-facing', 'Sales wiki', 'Monthly'],
        ['Reference Customer Database', 'Contactable reference accounts', 'Sales/CSM', 'CRM + Gainsight', 'Continuous'],
        ['RFP Response Library', 'Standard question templates', 'Sales/SEs/Legal', 'SharePoint', 'Quarterly'],
    ]
    story.append(create_section_table(sales_package, [105, 145, 90, 85, 70], styles))
    story.append(Paragraph("Table 11.1: Sales Enablement Asset Inventory", styles['CyberSOCCaption']))
    
    # Section 12: Support Readiness
    story.append(Paragraph("12. Support Readiness Verification", styles['CyberSOCH1']))
    story.append(HRFlowable(width="100%", thickness=1, color=BORDER, spaceBefore=5, spaceAfter=15))
    
    support_readiness_text = """
Support readiness ensures customer-facing support teams possess product knowledge, tool access, and procedural guidance necessary to deliver excellent customer experience from day one of GA. Readiness verification combines formal training completion tracking with practical assessments including mock support scenarios, product certification exams, and supervised initial customer interactions. Support tier definitions clarify escalation paths and resolution authority boundaries, while capacity planning ensures staffing levels align with projected ticket volumes based on pilot/beta support demand extrapolation to GA customer base projections.
"""
    story.append(Paragraph(support_readiness_text.strip(), styles['CyberSOCBodyNoIndent']))
    
    story.append(Paragraph("12.1 Support Tier Structure", styles['CyberSOCH2']))
    
    support_tiers = [
        ['Tier', 'Name', 'Staffing Model', 'Response SLA', 'Scope', 'Escalation Authority'],
        ['T1', 'First Response', 'Shift-based (global)', 'P1: 15 min, P2: 1 hr', 'FAQ, password resets, status', 'Reassign to T2'],
        ['T2', 'Technical Support', 'Regional specialists', 'P1: 1 hr, P2: 4 hr', 'Troubleshooting, config', 'Escalate to T3'],
        ['T3', 'Senior Engineering', 'Product specialists', 'P1: 4 hr, P2: 8 hr', 'Complex issues, bugs', 'Engage Engineering'],
        ['T4', 'Engineering Escalation', 'R&D team members', 'Per SLA contract', 'Code-level debugging', 'Product Management'],
    ]
    story.append(create_section_table(support_tiers, [35, 85, 95, 95, 100, 75], styles))
    story.append(Paragraph("Table 12.1: Support Tier Definitions", styles['CyberSOCCaption']))
    
    # Section 13: Customer Onboarding
    story.append(Paragraph("13. Customer Onboarding Materials", styles['CyberSOCH1']))
    story.append(HRFlowable(width="100%", thickness=1, color=BORDER, spaceBefore=5, spaceAfter=15))
    
    onboarding_text = """
Customer onboarding materials guide new customers from purchase decision through successful initial deployment and adoption of core workflows. Effective onboarding accelerates time-to-value realization, reduces early-stage churn risk, and establishes foundation for long-term customer success. Materials address multiple stakeholder audiences including technical implementers requiring installation and configuration guidance, administrators needing setup and customization instructions, and end users performing daily security operations tasks who need role-specific training on relevant platform capabilities.
"""
    story.append(Paragraph(onboarding_text.strip(), styles['CyberSOCBodyNoIndent']))
    
    onboarding_materials = [
        ['Material', 'Format', 'Audience', 'Timing', 'Owner'],
        ['Welcome Email Sequence', 'Email (5-part series)', 'All stakeholders', 'Day 0-14 post-purchase', 'CSM Team'],
        ['Getting Started Guide', 'PDF + Interactive tutorial', 'Administrators', 'Day 1 access', 'Documentation'],
        ['Quick Start Video Series', 'Video (10 x 5 min)', 'End users', 'Week 1', 'Product Marketing'],
        ['Implementation Workbook', 'Interactive PDF/Notion', 'Project managers', 'Day 1', 'Professional Services'],
        ['Integration Guides (per tool)', 'PDF documentation', 'Technical implementers', 'As needed', 'Solutions Architecture'],
        ['Administrator Certification', 'LMS course + exam', 'Platform admins', 'Week 2-4', 'Enablement'],
        ['Best Practices Webinar', 'Live webinar (recorded)', 'Power users', 'Week 2', 'Customer Success'],
        ['Health Check Template', 'Assessment form', 'CSM + Customer', 'Day 30, 60, 90', 'CSM Team'],
        ['Success Milestone Plan', 'Joint document', 'CSM + Customer Sponsor', 'Week 1', 'CSM Team'],
    ]
    story.append(create_section_table(onboarding_materials, [115, 100, 95, 85, 80], styles))
    story.append(Paragraph("Table 13.1: Customer Onboarding Material Library", styles['CyberSOCCaption']))
    
    # Section 14: Launch Day Playbook
    story.append(Paragraph("14. Launch Day Playbook", styles['CyberSOCH1']))
    story.append(HRFlowable(width="100%", thickness=1, color=BORDER, spaceBefore=5, spaceAfter=15))
    
    launch_playbook_text = """
The Launch Day Playbook provides minute-by-minute execution guidance for the GA launch event, coordinating activities across all functional teams to ensure flawless execution of this critical milestone. The playbook assumes all pre-launch checklist items are complete (verified via final Go/No-Go review) and focuses exclusively on launch day execution including website updates, press release distribution, internal communications, social media activation, sales team briefing, and customer notification sequences. Contingency procedures address common launch day issues including website performance degradation, ordering system errors, and media inquiry handling.
"""
    story.append(Paragraph(launch_playbook_text.strip(), styles['CyberSOCBodyNoIndent']))
    
    story.append(Paragraph("14.1 Launch Day Timeline", styles['CyberSOCH2']))
    
    launch_timeline = [
        ['Time (UTC)', 'Activity', 'Owner', 'Dependencies', 'Verification'],
        ['T-24h', 'Final systems health check', 'SRE/Eng', 'All systems green', 'Health dashboard'],
        ['T-24h', 'Launch content pre-staged (draft)', 'Web/Marketing', 'Content approved', 'Staging site review'],
        ['T-4h', 'Support team briefing complete', 'Support Mgr', 'Team assembled', 'Attendance confirmed'],
        ['T-2h', 'Sales enablement briefing complete', 'Sales Ops', 'Materials distributed', 'Acknowledgment received'],
        ['T-1h', 'Final Go/No-Go confirmation', 'Exec Sponsor', 'All checks pass', 'Written approval'],
        ['T-0', 'WEBSITE GO LIVE - GA page published', 'Web Team', 'DNS propagation', 'Public accessibility'],
        ['T+0:05', 'Press release distributed', 'PR/Comms', 'Approved release', 'Wire confirmation'],
        ['T+0:15', 'Social media posts published', 'Social Media', 'Approved content', 'Post URLs captured'],
        ['T+0:30', 'Internal all-hands announcement', 'Exec/HR', 'Prepared remarks', 'Recording available'],
        ['T+1h', 'Customer email blast sent', 'Marketing', 'Segmented lists', 'Delivery stats'],
        ['T+2h', 'Partner/channel notification', 'Partner Mgr', 'Partner list', 'Read receipts'],
        ['T+4h', 'First order/test transaction', 'Rev Ops', 'E-commerce live', 'Order confirmed'],
        ['T+8h', 'End-of-day status review', 'Program Mgr', 'All channels', 'Status report issued'],
        ['T+24h', 'Day 1 metrics review', 'Analytics', 'Tracking active', 'Dashboard reviewed'],
        ['T+72h', 'Week 1 retrospective', 'Cross-functional', 'Issues logged', 'Improvement actions'],
    ]
    story.append(create_section_table(launch_timeline, [65, 175, 70, 85, 85], styles))
    story.append(Paragraph("Table 14.1: Launch Day Execution Timeline", styles['CyberSOCCaption']))
    
    story.append(Paragraph("14.2 Launch Day Command Center", styles['CyberSOCH2']))
    command_center_text = """
The Launch Day Command Center provides centralized coordination hub for real-time issue resolution and communication during the critical launch window. Staffed by representatives from engineering, support, marketing, and product management, the command center monitors key health metrics, customer feedback channels, and media/social mentions enabling rapid response to any issues arising. Communication protocols define escalation triggers ensuring appropriate stakeholder notification for issues exceeding predefined severity thresholds. Post-launch debrief captures lessons learned improving future launch execution.
"""
    story.append(Paragraph(command_center_text.strip(), styles['CyberSOCBodyNoIndent']))
    
    command_center_roles = [
        ['Role', 'Responsibilities', 'Tools Monitored', 'Authority'],
        ['Launch Commander', 'Overall coordination, Go/No-Go decisions', 'All dashboards', 'Final decision maker'],
        ['Engineering Lead', 'System health, incident response', 'Grafana, PagerDuty, K8s dashboard', 'Engineering decisions'],
        ['Support Lead', 'Customer inquiries, issue triage', 'Zendesk, chat, phone queue', 'Customer communication'],
        ['Marketing Lead', 'Channel performance, social monitoring', 'Google Analytics, Sprout Social', 'Marketing adjustments'],
        ['Communications Lead', 'Media inquiries, internal comms', 'Media inbox, Slack announcements', 'Spokesperson authority'],
        ['Scribe', 'Timeline documentation, action items', 'Shared document', 'Record keeper'],
    ]
    story.append(create_section_table(command_center_roles, [90, 160, 120, 100], styles))
    story.append(Paragraph("Table 14.2: Launch Command Center Roles", styles['CyberSOCCaption']))
    
    # Build PDF
    doc.build(story)
    print(f"Successfully generated: {output_path}")
    return output_path


if __name__ == "__main__":
    output_file = build_pilot_ga_preparation_guide()
    print(f"\nPilot/Beta Program & GA Preparation Guide generated successfully!")
    print(f"Output: {output_file}")
