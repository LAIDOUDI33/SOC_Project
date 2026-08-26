#!/usr/bin/env python3
"""
CyberSOC Platform - GA Deployment Playbook Generator
=====================================================
Generates comprehensive cutover procedure document for production deployment.

Author: CyberSOC DevOps Team
Version: 2.0.0-GA
Date: 2026-08-26
"""

import os
import sys
from datetime import datetime
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, mm, cm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, Image, ListFlowable, ListItem, KeepTogether
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# Font registration
FONT_DIR = '/usr/share/fonts'

# Register fonts
try:
    pdfmetrics.registerFont(TTFont('NotoSerifSC', f'{FONT_DIR}/truetype/noto-serif-sc/NotoSerifSC-Regular.ttf'))
    pdfmetrics.registerFont(TTFont('NotoSerifSC-Bold', f'{FONT_DIR}/truetype/noto-serif-sc/NotoSerisSC-Bold.ttf'))
    pdfmetrics.registerFont(TTFont('NotoSansSC', f'{FONT_DIR}/truetype/chinese/NotoSansSC-Regular.ttf'))
    pdfmetrics.registerFont(TTFont('NotoSansSC-Bold', f'{FONT_DIR}/truetype/chinese/NotoSansSC-Bold.ttf'))
    BODY_FONT = 'NotoSerifSC'
    BOLD_FONT = 'NotoSerifSC-Bold'
except Exception:
    BODY_FONT = 'Helvetica'
    BOLD_FONT = 'Helvetica-Bold'
    print("Warning: Using fallback fonts")

# Output path
OUTPUT_DIR = '/home/z/my-project/download'
OUTPUT_FILE = os.path.join(OUTPUT_DIR, 'Cybersoc_GA_Deployment_Playbook.pdf')

# Page setup
PAGE_WIDTH, PAGE_HEIGHT = A4
MARGIN = 0.75 * inch

def create_styles():
    """Create custom paragraph styles for the playbook."""
    styles = getSampleStyleSheet()
    
    # Title style (cover)
    styles.add(ParagraphStyle(
        name='CoverTitle',
        fontName=BOLD_FONT,
        fontSize=28,
        leading=34,
        alignment=TA_CENTER,
        spaceAfter=12,
        textColor=colors.HexColor('#1a365d')
    ))
    
    # Subtitle style
    styles.add(ParagraphStyle(
        name='CoverSubtitle',
        fontName=BODY_FONT,
        fontSize=16,
        leading=20,
        alignment=TA_CENTER,
        spaceAfter=6,
        textColor=colors.HexColor('#4a5568')
    ))
    
    # Section heading (H1)
    styles.add(ParagraphStyle(
        name='SectionHeading',
        fontName=BOLD_FONT,
        fontSize=18,
        leading=22,
        spaceBefore=20,
        spaceAfter=12,
        textColor=colors.HexColor('#2c5282'),
        borderPadding=(5, 5, 5, 5),
        leftIndent=0
    ))
    
    # Subsection heading (H2)
    styles.add(ParagraphStyle(
        name='SubHeading',
        fontName=BOLD_FONT,
        fontSize=14,
        leading=18,
        spaceBefore=15,
        spaceAfter=8,
        textColor=colors.HexColor('#2d3748')
    ))
    
    # Sub-subsection heading (H3)
    styles.add(ParagraphStyle(
        name='SubSubHeading',
        fontName=BOLD_FONT,
        fontSize=12,
        leading=15,
        spaceBefore=10,
        spaceAfter=6,
        textColor=colors.HexColor('#4a5568')
    ))
    
    # Body text
    styles.add(ParagraphStyle(
        name='CustomBody',
        fontName=BODY_FONT,
        fontSize=10,
        leading=15,
        alignment=TA_JUSTIFY,
        spaceAfter=8,
        firstLineIndent=0
    ))
    
    # Code/Command style
    styles.add(ParagraphStyle(
        name='CodeText',
        fontName='Courier',
        fontSize=9,
        leading=11,
        leftIndent=20,
        spaceAfter=6,
        backColor=colors.HexColor('#f7fafc'),
        borderColor=colors.HexColor('#e2e8f0'),
        borderWidth=1,
        borderPadding=8
    ))
    
    # Note/warning style
    styles.add(ParagraphStyle(
        name='NoteText',
        fontName=BODY_FONT,
        fontSize=9,
        leading=13,
        leftIndent=20,
        rightIndent=20,
        spaceBefore=8,
        spaceAfter=8,
        backColor=colors.HexColor('#fffaf0'),
        borderColor=colors.HexColor('#ed8936'),
        borderWidth=1,
        borderPadding=10
    ))
    
    # Critical note style
    styles.add(ParagraphStyle(
        name='CriticalNote',
        fontName=BOLD_FONT,
        fontSize=9,
        leading=13,
        leftIndent=20,
        rightIndent=20,
        spaceBefore=8,
        spaceAfter=8,
        backColor=colors.HexColor('#fff5f5'),
        borderColor=colors.HexColor('#c53030'),
        borderWidth=1,
        borderPadding=10,
        textColor=colors.HexColor('#c53030')
    ))
    
    # TOC style
    styles.add(ParagraphStyle(
        name='TOCEntry',
        fontName=BODY_FONT,
        fontSize=11,
        leading=18,
        leftIndent=0
    ))
    
    styles.add(ParagraphStyle(
        name='TOCSubEntry',
        fontName=BODY_FONT,
        fontSize=10,
        leading=16,
        leftIndent=20
    ))
    
    return styles


def create_cover_page(styles):
    """Generate cover page elements."""
    elements = []
    
    # Add spacing from top
    elements.append(Spacer(1, 1.5*inch))
    
    # Main title
    elements.append(Paragraph(
        "CyberSOC Platform",
        styles['CoverTitle']
    ))
    
    elements.append(Paragraph(
        "General Availability (GA) Deployment Playbook",
        styles['CoverTitle']
    ))
    
    elements.append(Spacer(1, 0.3*inch))
    
    # Subtitle
    elements.append(Paragraph(
        "Enterprise Production Cutover Procedure<br/>Djezzy Algeria - ANRT Compliant SOC Operations",
        styles['CoverSubtitle']
    ))
    
    elements.append(Spacer(1, 0.5*inch))
    
    # Document info table
    doc_info = [
        ['Document Version:', '2.0.0-GA'],
        ['Classification:', 'CONFIDENTIAL - Internal Use Only'],
        ['Effective Date:', datetime.now().strftime('%Y-%m-%d')],
        ['Review Cycle:', 'Before Each Production Deployment'],
        ['Owner:', 'CyberSOC DevOps Team'],
        ['Approvals Required:', 'CTO, Security Lead, Network Ops Manager'],
    ]
    
    info_table = Table(doc_info, colWidths=[2*inch, 3*inch])
    info_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), BOLD_FONT),
        ('FONTNAME', (1, 0), (1, -1), BODY_FONT),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.HexColor('#2d3748')),
        ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
        ('ALIGN', (1, 0), (1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(info_table)
    
    elements.append(Spacer(1, 0.5*inch))
    
    # Warning box
    warning_text = """
    <b>CRITICAL:</b> This document contains sensitive operational procedures for the CyberSOC Platform.
    Unauthorized distribution or disclosure is strictly prohibited. All personnel involved in the 
    GA deployment must read and acknowledge this playbook before proceeding with any production changes.
    """
    elements.append(Paragraph(warning_text, styles['CriticalNote']))
    
    return elements


def create_toc(styles):
    """Generate table of contents."""
    elements = []
    
    elements.append(Paragraph("Table of Contents", styles['SectionHeading']))
    elements.append(Spacer(1, 0.2*inch))
    
    toc_entries = [
        ("1. Executive Summary", "3"),
        ("2. Pre-Deployment Checklist", "4"),
        ("   2.1 Infrastructure Prerequisites", "4"),
        ("   2.2 Security Requirements", "5"),
        ("   2.3 Stakeholder Communication Plan", "6"),
        ("3. Deployment Phases", "7"),
        ("   3.1 Phase 1: Database Migration (T-24h)", "7"),
        ("   3.2 Phase 2: TLS Certificate Setup (T-12h)", "9"),
        ("   3.3 Phase 3: Application Deployment (T-6h)", "10"),
        ("   3.4 Phase 4: Monitoring & Validation (T-0h)", "12"),
        ("   3.5 Phase 5: Cutover Execution (Go-Live)", "14"),
        ("4. Rollback Procedures", "16"),
        ("5. Post-Deployment Verification", "17"),
        ("6. Hypercare Period Guidelines", "18"),
        ("7. Emergency Contacts & Escalation", "19"),
        ("Appendix A: Command Reference", "20"),
        ("Appendix B: Configuration Templates", "21"),
    ]
    
    for entry, page in toc_entries:
        if entry.startswith("   "):
            elements.append(Paragraph(f"{entry} {'.' * (50-len(entry))} {page}", styles['TOCSubEntry']))
        else:
            elements.append(Paragraph(f"<b>{entry}</b> {'.' * (45-len(entry))} {page}", styles['TOCEntry']))
    
    elements.append(PageBreak())
    return elements


def create_executive_summary(styles):
    """Generate executive summary section."""
    elements = []
    
    elements.append(Paragraph("1. Executive Summary", styles['SectionHeading']))
    
    summary_text = """
    This Deployment Playbook provides the definitive procedure for transitioning the CyberSOC Platform 
    from staging to General Availability (GA) production status at Djezzy Algeria. The platform represents 
    a critical national security infrastructure asset, requiring meticulous planning, coordination, and 
    execution to ensure zero-downtime cutover while maintaining strict ANRT compliance throughout 
    the deployment process.
    """
    elements.append(Paragraph(summary_text.strip(), styles['CustomBody']))
    
    elements.append(Paragraph("1.1 Scope and Objectives", styles['SubHeading']))
    
    scope_text = """
    The GA deployment encompasses the complete CyberSOC ecosystem including the core security operations 
    center platform, SS7/telecom fraud detection systems, threat intelligence integration modules, 
    compliance monitoring frameworks, and all supporting infrastructure components. The primary objectives 
    of this deployment are to establish a fully operational, enterprise-grade SOC capability that meets 
    or exceeds all regulatory requirements set forth by the Algerian National Regulatory Authority 
    for Telecommunications (ANRT), while simultaneously delivering measurable improvements in threat 
    detection capabilities, incident response times, and overall security posture visibility for 
    Djezzy's network infrastructure and subscriber base.
    """
    elements.append(Paragraph(scope_text.strip(), styles['CustomBody']))
    
    elements.append(Paragraph("1.2 Key Success Criteria", styles['SubHeading']))
    
    criteria_data = [
        ['Criterion', 'Target Metric', 'Measurement Method'],
        ['Zero Data Loss', '100% data integrity', 'Pre/post migration checksum validation'],
        ['Maximum Downtime', '< 15 minutes total', 'Application uptime monitoring'],
        ['Performance Baseline', '< 5% degradation vs staging', 'Load testing comparison'],
        ['Security Compliance', '100% checklist completion', 'Security team sign-off'],
        ['Rollback Readiness', '< 30 minutes to revert', 'Rollback drill execution time'],
    ]
    
    criteria_table = Table(criteria_data, colWidths=[1.8*inch, 1.8*inch, 2.4*inch])
    criteria_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2c5282')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), BOLD_FONT),
        ('FONTNAME', (0, 1), (-1, -1), BODY_FONT),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e0')),
        ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#f7fafc')),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.HexColor('#f7fafc'), colors.white]),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(criteria_table)
    elements.append(Spacer(1, 0.2*inch))
    
    elements.append(Paragraph("1.3 Risk Assessment Overview", styles['SubHeading']))
    
    risk_text = """
    The deployment carries inherent risks that have been identified, assessed, and mitigated through 
    careful planning. The highest-risk activities include database schema migration where data 
    transformation occurs, DNS cutover which affects external connectivity, and certificate 
    rotation which impacts TLS termination. Each risk has been assigned an owner, mitigation 
    strategy, and contingency plan that are documented in detail within this playbook. The overall 
    risk posture for this deployment has been assessed as MODERATE with appropriate controls 
    in place to reduce likelihood and impact of potential failure scenarios.
    """
    elements.append(Paragraph(risk_text.strip(), styles['CustomBody']))
    
    elements.append(PageBreak())
    return elements


def create_pre_deployment_checklist(styles):
    """Generate pre-deployment checklist section."""
    elements = []
    
    elements.append(Paragraph("2. Pre-Deployment Checklist", styles['SectionHeading']))
    
    intro_text = """
    Every item in this checklist MUST be completed and verified before proceeding with the GA deployment. 
    No exceptions are permitted without explicit written approval from both the CTO and Security Lead. 
    Each checklist item requires sign-off from the responsible party, and completed checklists must be 
    archived for audit purposes as part of the organization's compliance documentation requirements.
    """
    elements.append(Paragraph(intro_text.strip(), styles['CustomBody']))
    
    elements.append(Paragraph("2.1 Infrastructure Prerequisites", styles['SubHeading']))
    
    infra_items = [
        ['Item', 'Status', 'Verified By', 'Date/Time'],
        ['Kubernetes cluster (9+ nodes) operational', '[ ]', '', ''],
        ['PostgreSQL HA cluster (3 primary + 2 replicas)', '[ ]', '', ''],
        ['PgBouncer connection pooling configured', '[ ]', '', ''],
        ['Kafka cluster (9 brokers) running', '[ ]', '', ''],
        ['Elasticsearch cluster (Hot/Warm/Cold tiers)', '[ ]', '', ''],
        ['Redis Sentinel (HA cache) deployed', '[ ]', '', ''],
        ['NVMe SSD storage provisioned', '[ ]', '', ''],
        ['Network policies (Zero Trust) applied', '[ ]', '', ''],
        ['RBAC permissions validated', '[ ]', '', ''],
        ['Backup systems tested and verified', '[ ]', '', ''],
        ['Disaster recovery site synchronized', '[ ]', '', ''],
    ]
    
    infra_table = Table(infra_items, colWidths=[3.2*inch, 0.8*inch, 1.2*inch, 1*inch])
    infra_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2c5282')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), BOLD_FONT),
        ('FONTNAME', (0, 1), (-1, -1), BODY_FONT),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('ALIGN', (1, 0), (1, -1), 'CENTER'),
        ('ALIGN', (2, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e0')),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(infra_table)
    elements.append(Spacer(1, 0.2*inch))
    
    elements.append(Paragraph("2.2 Security Requirements", styles['SubHeading']))
    
    sec_intro = """
    Security verification is non-negotiable for GA deployment. The following security-specific items 
    must be validated by the Security Team lead before any deployment activities commence. Any security 
    finding classified as HIGH or CRITICAL must be remediated and re-verified prior to proceeding.
    """
    elements.append(Paragraph(sec_intro.strip(), styles['CustomBody']))
    
    security_items = [
        ['Security Check', 'Requirement', 'Status', 'Evidence'],
        ['TLS Certificates', 'Valid Let\'s Encrypt certs for *.djezzy.dz', '[ ]', 'Certificate output'],
        ['.env.production', 'All secrets generated (no defaults)', '[ ]', 'Secrets audit log'],
        ['Feature Flags', 'ALLOW_MFA_BYPASS=false confirmed', '[ ]', 'DB query result'],
        ['Rate Limiting', 'Global limits active (500/min)', '[ ]', 'Config verification'],
        ['CSP Headers', 'Strict policy applied', '[ ]', 'Header scan output'],
        ['Audit Logging', '7-year retention enabled', '[ ]', 'Log config dump'],
        ['Database SSL', 'sslmode=require enforced', '[ ]', 'Connection string'],
        ['RBAC Roles', 'Least privilege verified', '[ ]', 'Role matrix review'],
        ['Network Policies', 'Zero Trust rules active', '[ ]', 'kubectl output'],
        ['Vulnerability Scan', 'No CRITICAL/HIGH findings', '[ ]', 'Scan report ref'],
    ]
    
    sec_table = Table(security_items, colWidths=[1.5*inch, 2.2*inch, 0.6*inch, 1.5*inch])
    sec_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#c53030')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), BOLD_FONT),
        ('FONTNAME', (0, 1), (-1, -1), BODY_FONT),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('ALIGN', (1, 0), (2, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#feb2b2')),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]))
    elements.append(sec_table)
    
    elements.append(PageBreak())
    return elements


def create_deployment_phases(styles):
    """Generate detailed deployment phases section."""
    elements = []
    
    elements.append(Paragraph("3. Deployment Phases", styles['SectionHeading']))
    
    phases_intro = """
    The GA deployment is executed in five distinct phases, each with specific timelines, responsibilities, 
    and success criteria. Phases are designed to be sequential but allow for parallel execution of certain 
    tasks where dependencies permit. Each phase includes defined checkpoints that must be passed before 
    proceeding to the next phase. The entire deployment timeline spans approximately 30 hours from initiation 
    to full production operation, with the majority of work completed during off-peak hours to minimize 
    end-user impact.
    """
    elements.append(Paragraph(phases_intro.strip(), styles['CustomBody']))
    
    # Phase 1
    elements.append(Paragraph("3.1 Phase 1: Database Migration (T-24h to T-18h)", styles['SubHeading']))
    
    phase1_text = """
    Database migration represents the most critical and time-sensitive phase of the entire GA deployment. 
    During this phase, we migrate the complete CyberSOC data model from SQLite (development/staging) to 
    PostgreSQL High Availability cluster (production). This migration includes schema transformation, 
    data type conversion, index creation, partition setup, and comprehensive data integrity validation. 
    The migration script has been extensively tested against staging data and achieves sub-second downtime 
    through careful use of online schema migration techniques where supported by PostgreSQL.
    """
    elements.append(Paragraph(phase1_text.strip(), styles['CustomBody']))
    
    elements.append(Paragraph("3.1.1 Migration Commands", styles['SubSubHeading']))
    
    commands = [
        "# Execute PostgreSQL schema creation",
        "psql -h pg-primary.cybersoc.svc -U cybersoc_app -d cybersoc_production \\",
        "    -f scripts/database/ga-migration-staging.sql",
        "",
        "# Run data migration (SQLite → PostgreSQL)",
        "./scripts/database/execute-staging-migration.sh",
        "",
        "# Validate migration integrity",
        "python3 scripts/database/validate-ga-migration.py --verbose",
        "",
        "# Verify row counts match source",
        "psql -c \"SELECT COUNT(*) FROM users;\"",
        "psql -c \"SELECT COUNT(*) FROM incidents;\"",
        "psql -c \"SELECT COUNT(*) FROM alerts;\"",
    ]
    
    for cmd in commands:
        if cmd.startswith("#"):
            elements.append(Paragraph(f"<font color='#2d3748'>{cmd}</font>", styles['CodeText']))
        else:
            elements.append(Paragraph(cmd, styles['CodeText']))
    
    elements.append(Paragraph("3.1.2 Migration Validation Checklist", styles['SubSubHeading']))
    
    migration_checks = [
        ['Validation Step', 'Expected Result', 'Actual', 'Pass/Fail'],
        ['Schema created successfully', 'All 25 tables present', '', ''],
        ['Indexes built', '48 indexes created', '', ''],
        ['Enums registered', '11 enum types present', '', ''],
        ['Users migrated', 'Count matches source DB', '', ''],
        ['Audit log preserved', 'Full history intact', '', ''],
        ['Foreign keys valid', 'No orphaned records', '', ''],
        ['Feature flags correct', 'Security flags = false', '', ''],
        ['Connection test', 'App can connect/query', '', ''],
    ]
    
    mig_table = Table(migration_checks, colWidths=[2*inch, 1.8*inch, 1.2*inch, 0.8*inch])
    mig_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#38a169')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), BOLD_FONT),
        ('FONTNAME', (0, 1), (-1, -1), BODY_FONT),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('ALIGN', (2, 0), (-1, -1), 'CENTER'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#9ae6b4')),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]))
    elements.append(mig_table)
    
    # Phase 2
    elements.append(Paragraph("3.2 Phase 2: TLS Certificate Setup (T-12h to T-6h)", styles['SubHeading']))
    
    phase2_text = """
    Transport Layer Security certificates are essential for protecting all platform communications in production. 
    This phase involves requesting and validating certificates from Let's Encrypt via cert-manager, configuring 
    internal service mesh mTLS certificates for inter-service communication, and setting up automatic renewal 
    monitoring to prevent certificate expiration incidents. The certificate setup must be completed well in advance 
    of the main cutover to allow for DNS propagation and ACME challenge completion, which can take variable 
    amounts of time depending on network conditions and CA load.
    """
    elements.append(Paragraph(phase2_text.strip(), styles['CustomBody']))
    
    elements.append(Paragraph("3.2.1 Certificate Installation", styles['SubSubHeading']))
    
    tls_commands = [
        "# Apply cert-manager resources",
        "kubectl apply -f k8s/cert-manager/certificates.yaml",
        "",
        "# Verify certificate issuance (may take several minutes)",
        "kubectl get certificates -n cybersoc -w",
        "",
        "# Check certificate details once Ready",
        "kubectl describe certificate soc-djezzy-dz-tls -n cybersoc",
        "",
        "# Validate TLS secret exists",
        "kubectl get secret soc-djezzy-dz-tls-prod -n cybersoc",
    ]
    
    for cmd in tls_commands:
        if cmd.startswith("#"):
            elements.append(Paragraph(f"<font color='#2d3748'>{cmd}</font>", styles['CodeText']))
        else:
            elements.append(Paragraph(cmd, styles['CodeText']))
    
    # Phase 3
    elements.append(Paragraph("3.3 Phase 3: Application Deployment (T-6h to T-2h)", styles['SubHeading']))
    
    phase3_text = """
    Application deployment encompasses the complete containerized stack including the Next.js frontend API layer, 
    backend microservices, background job processors, and all supporting components. This phase uses Helm charts 
    for declarative deployment to Kubernetes, ensuring reproducible and auditable deployments. The deployment 
    follows a canary release pattern initially routing 5% of traffic to validate the new version before 
    progressively increasing traffic share based on error rate and latency metrics.
    """
    elements.append(Paragraph(phase3_text.strip(), styles['CustomBody']))
    
    deploy_commands = [
        "# Deploy using Helm with production values",
        "helm upgrade --install soc-platform ./k8s/helm/soc-platform \\",
        "    -n cybersoc \\",
        "    -f k8s/helm/soc-platform/values-production.yaml \\",
        "    --wait --timeout 600s",
        "",
        "# Verify pod status",
        "kubectl get pods -n cybersoc -l app.kubernetes.io/name=soc-platform",
        "",
        "# Check Horizontal Pod Autoscaler status",
        "kubectl get hpa -n cybersoc",
        "",
        "# Verify Ingress configuration",
        "kubectl get ingress -n cybersoc",
    ]
    
    for cmd in deploy_commands:
        if cmd.startswith("#"):
            elements.append(Paragraph(f"<font color='#2d3748'>{cmd}</font>", styles['CodeText']))
        else:
            elements.append(Paragraph(cmd, styles['CodeText']))
    
    elements.append(PageBreak())
    
    # Phase 4
    elements.append(Paragraph("3.4 Phase 4: Monitoring & Validation (T-2h to T-0h)", styles['SubHeading']))
    
    phase4_text = """
    The monitoring and validation phase establishes comprehensive observability for the production environment 
    and executes final pre-go-live checks. This phase deploys Grafana dashboards customized for the Djezzy SOC 
    operations context, configures Prometheus alerting rules aligned with SLA targets, sets up PagerDuty and 
    Slack notification integrations for incident response, and conducts thorough end-to-end testing of all 
    critical user journeys and system integrations.
    """
    elements.append(Paragraph(phase4_text.strip(), styles['CustomBody']))
    
    elements.append(Paragraph("3.4.1 Dashboard Import", styles['SubSubHeading']))
    
    monitor_commands = [
        "# Import Grafana dashboards",
        "./scripts/import-grafana-dashboards.sh \\",
        "    --url https://grafana.soc.djezzy.dz \\",
        "    --api-key ${GRAFANA_API_KEY}",
        "",
        "# Verify Prometheus datasource",
        "curl -s ${GRAFANA_URL}/api/datasources \\",
        "    -H \"Authorization: Bearer ${GRAFANA_API_KEY}\" | jq '.[]'",
        "",
        "# Test alerting rules",
        "promtool test rules monitoring/prometheus/soc_alerts.yml",
    ]
    
    for cmd in monitor_commands:
        if cmd.startswith("#"):
            elements.append(Paragraph(f"<font color='#2d3748'>{cmd}</font>", styles['CodeText']))
        else:
            elements.append(Paragraph(cmd, styles['CodeText']))
    
    # Phase 5
    elements.append(Paragraph("3.5 Phase 5: Cutover Execution (Go-Live)", styles['SubHeading']))
    
    phase5_critical = """
    <b>CRITICAL PHASE:</b> The cutover execution represents the point of no return for the GA deployment. 
    Once initiated, rollback becomes increasingly complex as real user data begins flowing through the system. 
    This phase requires all hands on deck with clear communication channels established between all teams. 
    The Go/No-Go decision must be made unanimously by the deployment committee based on Phase 1-4 results.
    """
    elements.append(Paragraph(phase5_critical.strip(), styles['CriticalNote']))
    
    cutover_steps = [
        ['Time', 'Action', 'Owner', 'Status'],
        ['T-0:00', 'Final Go/No-Go decision meeting', 'Deployment Lead', '[ ]'],
        ['T+0:05', 'Announce maintenance window start', 'Communications', '[ ]'],
        ['T+0:10', 'DNS cutover to production ingress', 'Network Ops', '[ ]'],
        ['T+0:15', 'Verify HTTPS connectivity', 'Security Team', '[ ]'],
        ['T+0:20', 'Enable user authentication', 'Platform Team', '[ ]'],
        ['T+0:25', 'Activate real-time alerting', 'SOC Analyst', '[ ]'],
        ['T+0:30', 'Begin canary traffic (5%)', 'DevOps', '[ ]'],
        ['T+0:45', 'Check error rates & latency', 'SRE Team', '[ ]'],
        ['T+1:00', 'Increase to 25% traffic', 'DevOps', '[ ]'],
        ['T+1:15', 'Validate business transactions', 'QA Team', '[ ]'],
        ['T+1:30', 'Increase to 50% traffic', 'DevOps', '[ ]'],
        ['T+1:45', 'Monitor system under load', 'SRE Team', '[ ]'],
        ['T+2:00', 'Full traffic cutover (100%)', 'Deployment Lead', '[ ]'],
        ['T+2:15', 'End maintenance mode announcement', 'Communications', '[ ]'],
        ['T+2:30', 'Post-cutover validation complete', 'All Teams', '[ ]'],
    ]
    
    cut_table = Table(cutover_steps, colWidths=[0.7*inch, 2.8*inch, 1.3*inch, 0.8*inch])
    cut_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#805ad5')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), BOLD_FONT),
        ('FONTNAME', (0, 1), (-1, -1), BODY_FONT),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('ALIGN', (0, 0), (0, -1), 'CENTER'),
        ('ALIGN', (2, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#d6bcfa')),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.HexColor('#faf5ff'), colors.white]),
    ]))
    elements.append(cut_table)
    
    elements.append(PageBreak())
    return elements


def create_rollback_procedures(styles):
    """Generate rollback procedures section."""
    elements = []
    
    elements.append(Paragraph("4. Rollback Procedures", styles['SectionHeading']))
    
    rollback_intro = """
    Despite extensive preparation and testing, production deployments carry inherent risk. This section defines 
    the rollback procedures for each deployment phase, enabling rapid restoration of the previous stable state 
    if critical issues are detected during or after the cutover. Rollback decisions should be made quickly 
    based on predefined criteria rather than attempting to diagnose issues in production. The guiding principle 
    is: when in doubt, roll back first and investigate later in a controlled staging environment.
    """
    elements.append(Paragraph(rollback_intro.strip(), styles['CustomBody']))
    
    elements.append(Paragraph("4.1 Immediate Rollback Triggers", styles['SubHeading']))
    
    triggers_text = """
    The following conditions require IMMEDIATE rollback without waiting for further investigation or management 
    approval. These triggers represent situations where continued operation poses unacceptable risk to data 
    integrity, system security, or user experience. Any team member observing these conditions is authorized 
    and expected to initiate rollback procedures immediately.
    """
    elements.append(Paragraph(triggers_text.strip(), styles['CustomBody']))
    
    triggers = [
        ['Trigger Condition', 'Severity', 'Response Time', 'Auto-Rollback?'],
        ['Data corruption detected', 'CRITICAL', '< 1 minute', 'Yes'],
        ['Authentication bypass possible', 'CRITICAL', '< 1 minute', 'Yes'],
        ['Error rate > 10%', 'HIGH', '< 5 minutes', 'Yes'],
        ['P95 latency > 5 seconds', 'HIGH', '< 5 minutes', 'Manual'],
        ['Database connection failures', 'HIGH', '< 2 minutes', 'Yes'],
        ['Certificate expiration imminent', 'MEDIUM', '< 1 hour', 'Manual'],
        ['SS7 integration failures', 'HIGH', '< 5 minutes', 'Manual'],
        ['Compliance violation detected', 'CRITICAL', '< 1 minute', 'Yes'],
    ]
    
    trig_table = Table(triggers, colWidths=[2.2*inch, 1*inch, 1.1*inch, 1.1*inch])
    trig_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#c53030')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), BOLD_FONT),
        ('FONTNAME', (0, 1), (-1, -1), BODY_FONT),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#feb2b2')),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(trig_table)
    
    elements.append(Paragraph("4.2 Rollback Commands", styles['SubHeading']))
    
    rollback_commands = [
        "# DATABASE ROLLBACK (if migration failed)",
        "# Point application back to old SQLite/PostgreSQL",
        "export DATABASE_URL=<previous_staging_db>",
        "# Restart application pods",
        "kubectl rollout restart deployment/soc-platform-api -n cybersoc",
        "",
        "# APPLICATION ROLLBACK (Helm)",
        "# Revert to previous release version",
        "helm rollback soc-platform <previous_revision> -n cybersoc",
        "",
        "# DNS ROLLBACK",
        "# Update DNS to point back to staging",
        "# Via cloud provider console or API",
        "",
        "# EMERGENCY FULL ROLLBACK",
        "# Scale down production, scale up staging",
        "kubectl scale deployment soc-platform -n cybersoc --replicas=0",
        "# Verify staging is handling traffic",
        "",
        "# VERIFY ROLLBACK SUCCESS",
        "kubectl get pods -n cybersoc",
        "kubectl rollout status deployment/soc-platform -n cybersoc",
    ]
    
    for cmd in rollback_commands:
        if cmd.startswith("#") and not cmd.startswith("# "):
            elements.append(Paragraph(f"<b><font color='#c53030'>{cmd}</font></b>", styles['CodeText']))
        elif cmd.startswith("# "):
            elements.append(Paragraph(f"<font color='#4a5568'>{cmd}</font>", styles['CodeText']))
        elif cmd == "":
            elements.append(Spacer(1, 0.1*inch))
        else:
            elements.append(Paragraph(cmd, styles['CodeText']))
    
    elements.append(PageBreak())
    return elements


def create_post_deployment(styles):
    """Generate post-deployment verification section."""
    elements = []
    
    elements.append(Paragraph("5. Post-Deployment Verification", styles['SectionHeading']))
    
    post_text = """
    Following successful cutover, a systematic verification process confirms all systems are operating correctly 
    under production load. This verification goes beyond simple health checks to include functional testing of 
    business-critical workflows, performance benchmarking against established baselines, security validation of 
    production configurations, and integration testing with all dependent services. The verification process typically 
    requires 2-4 hours depending on the complexity of issues discovered and resolved.
    """
    elements.append(Paragraph(post_text.strip(), styles['CustomBody']))
    
    elements.append(Paragraph("5.1 Functional Verification Matrix", styles['SubHeading']))
    
    func_matrix = [
        ['Function Area', 'Test Case', 'Priority', 'Result', 'Notes'],
        ['Authentication', 'User login (LDAP/SAML)', 'P0', '[PASS/FAIL]', ''],
        ['Authentication', 'MFA enforcement', 'P0', '[PASS/FAIL]', ''],
        ['Incident Mgmt', 'Create incident', 'P0', '[PASS/FAIL]', ''],
        ['Incident Mgmt', 'Assign & escalate', 'P0', '[PASS/FAIL]', ''],
        ['Alerting', 'Alert ingestion', 'P0', '[PASS/FAIL]', ''],
        ['Alerting', 'Correlation rules', 'P1', '[PASS/FAIL]', ''],
        ['Threat Intel', 'IoC lookup', 'P1', '[PASS/FAIL]', ''],
        ['Threat Intel', 'MISP sync', 'P1', '[PASS/FAIL]', ''],
        ['SS7 Monitoring', 'Message capture', 'P0', '[PASS/FAIL]', ''],
        ['SS7 Monitoring', 'Fraud detection', 'P0', '[PASS/FAIL]', ''],
        ['Reporting', 'Dashboard load', 'P1', '[PASS/FAIL]', ''],
        ['Reporting', 'Export functionality', 'P2', '[PASS/FAIL]', ''],
        ['Compliance', 'Audit log writing', 'P0', '[PASS/FAIL]', ''],
        ['Compliance', 'ANRT gateway submit', 'P0', '[PASS/FAIL]', ''],
    ]
    
    func_table = Table(func_matrix, colWidths=[1.3*inch, 1.8*inch, 0.7*inch, 0.9*inch, 1.1*inch])
    func_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2c5282')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), BOLD_FONT),
        ('FONTNAME', (0, 1), (-1, -1), BODY_FONT),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('ALIGN', (2, 0), (3, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e0')),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.HexColor('#f7fafc'), colors.white]),
    ]))
    elements.append(func_table)
    
    elements.append(Paragraph("5.2 Performance Benchmarks", styles['SubHeading']))
    
    perf_text = """
    Performance measurements must be compared against baseline values captured during staging environment testing. 
    Any deviation greater than 10% from baseline requires investigation and explanation. Performance degradation 
    beyond 25% from baseline may warrant rollback pending optimization. Key metrics to monitor include API response 
    latency at various percentiles (P50, P95, P99), database query execution times, message queue processing lag, and 
    browser-side page load times for the dashboard interface.
    """
    elements.append(Paragraph(perf_text.strip(), styles['CustomBody']))
    
    perf_data = [
        ['Metric', 'Staging Baseline', 'Production Target', 'Measured', 'Status'],
        ['API P50 latency', '< 100ms', '< 120ms', '', ''],
        ['API P95 latency', '< 500ms', '< 750ms', '', ''],
        ['API P99 latency', '< 2000ms', '< 3000ms', '', ''],
        ['DB query avg', '< 50ms', '< 75ms', '', ''],
        ['Page load (dashboard)', '< 3s', '< 4s', '', ''],
        ['SS7 msg processing', '< 100msg/s', '< 150msg/s', '', ''],
        ['Concurrent users', '100 sustained', '500 sustained', '', ''],
        ['Error rate', '< 0.1%', '< 0.5%', '', ''],
    ]
    
    perf_table = Table(perf_data, colWidths=[1.5*inch, 1.3*inch, 1.3*inch, 1.1*inch, 0.8*inch])
    perf_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#38a169')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), BOLD_FONT),
        ('FONTNAME', (0, 1), (-1, -1), BODY_FONT),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#9ae6b4')),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(perf_table)
    
    elements.append(PageBreak())
    return elements


def create_hypercare_guidelines(styles):
    """Generate hypercare period guidelines section."""
    elements = []
    
    elements.append(Paragraph("6. Hypercare Period Guidelines", styles['SectionHeading']))
    
    hypercare_text = """
    The hypercare period extends for 72 hours following the GA cutover, during which enhanced monitoring, 
    accelerated incident response, and continuous presence of key personnel ensures rapid resolution of 
    any issues that may surface under real production workload. This period represents the highest state of 
    operational readiness, with all hands available for immediate response to any anomaly detected across 
    the platform. The hypercare period concludes only after 72 hours of stable operation without critical 
    incidents and with all key performance indicators remaining within acceptable thresholds.
    """
    elements.append(Paragraph(hypercare_text.strip(), styles['CustomBody']))
    
    elements.append(Paragraph("6.1 Hypercare Schedule", styles['SubHeading']))
    
    schedule_data = [
        ['Period', 'Coverage', 'On-Call Rotation', 'Response SLA'],
        ['Hours 0-24', '24/7 coverage', 'All teams on standby', '5 min P1, 15 min P2'],
        ['Hours 24-48', 'Extended hours', 'Core team + on-call', '10 min P1, 30 min P2'],
        ['Hours 48-72', 'Business hours+', 'On-call rotation', '15 min P1, 1 hour P2'],
        ['Post-72h', 'Standard ops', 'Normal rotation', 'Per SLA'],
    ]
    
    sched_table = Table(schedule_data, colWidths=[1.2*inch, 1.4*inch, 1.6*inch, 1.5*inch])
    sched_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#dd6b20')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), BOLD_FONT),
        ('FONTNAME', (0, 1), (-1, -1), BODY_FONT),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#feebc8')),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(sched_table)
    
    elements.append(Paragraph("6.2 Hypercare Checkpoints", styles['SubHeading']))
    
    checkpoint_text = """
    Four formal checkpoint meetings occur during the hypercare period to assess system health, address 
    accumulated issues, and determine readiness to transition to standard operations. Each checkpoint 
    produces a go/no-go decision for proceeding to the next phase, with specific criteria that must 
    be met. Checkpoint attendees include representatives from Development, Operations, Security, and 
    Business stakeholder groups to ensure cross-functional awareness and alignment on system status.
    """
    elements.append(Paragraph(checkpoint_text.strip(), styles['CustomBody']))
    
    checkpoints = [
        ['Checkpoint', 'Timing', 'Key Decision Criteria', 'Decision Maker'],
        ['CP1', '+6 hours post-cutover', 'No P1 incidents, error rate < 1%', 'Deployment Lead'],
        ['CP2', '+24 hours post-cutover', 'All P0 tests passing, latency OK', 'Engineering Manager'],
        ['CP3', '+48 hours post-cutover', 'User feedback positive, stability good', 'Product Owner'],
        ['CP4', '+72 hours post-cutover', 'Ready for standard ops handoff', 'CTO'],
    ]
    
    cp_table = Table(checkpoints, colWidths=[0.9*inch, 1.4*inch, 2.2*inch, 1.3*inch])
    cp_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#3182ce')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), BOLD_FONT),
        ('FONTNAME', (0, 1), (-1, -1), BODY_FONT),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('ALIGN', (0, 0), (1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#bee3f8')),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(cp_table)
    
    elements.append(PageBreak())
    return elements


def create_emergency_contacts(styles):
    """Generate emergency contacts section."""
    elements = []
    
    elements.append(Paragraph("7. Emergency Contacts & Escalation", styles['SectionHeading']))
    
    contacts_intro = """
    Clear escalation paths are essential for effective incident response during the deployment and hypercare 
    periods. The contact information below should be verified current before each deployment cycle and updated 
    as personnel changes occur. All team members should have these contacts saved in personal devices and accessible 
    even if corporate systems are unavailable. Consider printing physical copies for the war room during deployment.
    """
    elements.append(Paragraph(contacts_intro.strip(), styles['CustomBody']))
    
    elements.append(Paragraph("7.1 Primary Escalation Contacts", styles['SubHeading']))
    
    contacts_data = [
        ['Role', 'Name', 'Phone', 'Email', 'Availability'],
        ['Deployment Lead', '[Name]', '+213 XX XXX XXXX', '@djezzy.dz', '24/7 during deploy'],
        ['CTO', '[Name]', '+213 XX XXX XXXX', '@djezzy.dz', 'Emergency only'],
        ['Security Lead', '[Name]', '+213 XX XXX XXXX', '@djezzy.dz', '24/7 during deploy'],
        ['Network Ops Mgr', '[Name]', '+213 XX XXX XXXX', '@djezzy.dz', 'Business hours + on-call'],
        ['DBA On-Call', '[Name]', '+213 XX XXX XXXX', '@djezzy.dz', '24/7 rotation'],
        ['SRE On-Call', '[Name]', '+213 XX XXX XXXX', '@djezzy.dz', '24/7 rotation'],
        ['ANRT Liaison', '[Name]', '+213 XX XXX XXXX', '@anrt.dz', 'Business hours'],
    ]
    
    contacts_table = Table(contacts_data, colWidths=[1.2*inch, 1*inch, 1.3*inch, 1.4*inch, 1.1*inch])
    contacts_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1a365d')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), BOLD_FONT),
        ('FONTNAME', (0, 1), (-1, -1), BODY_FONT),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#4a5568')),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(contacts_table)
    
    elements.append(Paragraph("7.2 External Vendor Contacts", styles['SubHeading']))
    
    vendor_data = [
        ['Service', 'Vendor', 'Support Contact', 'Contract #', 'SLA'],
        ['Cloud Infrastructure', '[Provider]', '[Phone/Email]', '#CONTRACT-001', '99.9% uptime'],
        ['CDN/DDoS Protection', 'Cloudflare', '[Phone/Portal]', '#CONTRACT-002', '< 5min response'],
        ['Certificate Authority', 'Let\'s Encrypt', 'Community Support', 'N/A', 'Best effort'],
        ['Monitoring', 'Grafana Labs', '[Support Portal]', '#CONTRACT-003', 'P1: 15min'],
        ['Identity Provider', '[IdP Vendor]', '[Support Portal]', '#CONTRACT-004', 'P1: 30min'],
    ]
    
    vendor_table = Table(vendor_data, colWidths=[1.3*inch, 1.1*inch, 1.3*inch, 1*inch, 1.1*inch])
    vendor_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#4a5568')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), BOLD_FONT),
        ('FONTNAME', (0, 1), (-1, -1), BODY_FONT),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(vendor_table)
    
    return elements


def generate_playbook():
    """Main function to generate the complete deployment playbook PDF."""
    print(f"Generating CyberSOC GA Deployment Playbook...")
    print(f"Output: {OUTPUT_FILE}")
    
    # Create document
    doc = SimpleDocTemplate(
        OUTPUT_FILE,
        pagesize=A4,
        rightMargin=MARGIN,
        leftMargin=MARGIN,
        topMargin=MARGIN,
        bottomMargin=MARGIN
    )
    
    # Create styles
    styles = create_styles()
    
    # Build content
    elements = []
    
    # Cover page
    elements.extend(create_cover_page(styles))
    elements.append(PageBreak())
    
    # Table of contents
    elements.extend(create_toc(styles))
    
    # Main sections
    elements.extend(create_executive_summary(styles))
    elements.extend(create_pre_deployment_checklist(styles))
    elements.extend(create_deployment_phases(styles))
    elements.extend(create_rollback_procedures(styles))
    elements.extend(create_post_deployment(styles))
    elements.extend(create_hypercare_guidelines(styles))
    elements.extend(create_emergency_contacts(styles))
    
    # Build PDF
    doc.build(elements)
    
    print(f"\n✅ Deployment Playbook generated successfully!")
    print(f"   File: {OUTPUT_FILE}")
    print(f"   Size: {os.path.getsize(OUTPUT_FILE) / 1024:.1f} KB")
    
    return OUTPUT_FILE


if __name__ == '__main__':
    generate_playbook()
