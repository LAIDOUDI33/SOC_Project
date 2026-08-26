#!/usr/bin/env python3
"""
CyberSOC Platform - Production Deployment Playbook Generator
Generates comprehensive step-by-step cutover procedure document
"""

import os
import sys
from datetime import datetime
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, cm, mm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, ListFlowable, ListItem, KeepTogether, Image
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# Font registration
FONT_DIR = '/usr/share/fonts'

# Register Chinese fonts
pdfmetrics.registerFont(TTFont('NotoSerifSC', f'{FONT_DIR}/truetype/noto-serif-sc/NotoSerifSC-Regular.ttf'))
pdfmetrics.registerFont(TTFont('NotoSerifSC-Bold', f'{FONT_DIR}/truetype/noto-serif-sc/NotoSerifSC-Bold.ttf'))
pdfmetrics.registerFontFamily('NotoSerifSC', normal='NotoSerifSC', bold='NotoSerifSC-Bold')

# Color palette (Cascade - Business Blue)
COLORS = {
    'primary': colors.HexColor('#1a365d'),
    'primary_light': colors.HexColor('#2a5298'),
    'accent': colors.HexColor('#4a7ac7'),
    'bg_light': colors.HexColor('#f5f8fc'),
    'bg_section': colors.HexColor('#dce6f5'),
    'text_dark': colors.HexColor('#1a202c'),
    'text_muted': colors.HexColor('#4a5568'),
    'success': colors.HexColor('#2d6b4a'),
    'warning': colors.HexColor('#c05621'),
    'error': colors.HexColor('#c53030'),
    'border': colors.HexColor('#e2e8f0'),
}

# Output path
OUTPUT_DIR = '/home/z/my-project/download'
OUTPUT_FILE = f'{OUTPUT_DIR}/Cybersoc_Production_Deployment_Playbook.pdf'


def create_styles():
    """Create custom paragraph styles"""
    styles = getSampleStyleSheet()
    
    # Title style
    styles.add(ParagraphStyle(
        name='CustomTitle',
        fontName='NotoSerifSC-Bold',
        fontSize=28,
        leading=34,
        textColor=COLORS['primary'],
        alignment=1,  # Center
        spaceAfter=20,
    ))
    
    # Subtitle style
    styles.add(ParagraphStyle(
        name='CustomSubtitle',
        fontName='NotoSerifSC',
        fontSize=14,
        leading=18,
        textColor=COLORS['text_muted'],
        alignment=1,
        spaceAfter=30,
    ))
    
    # Section heading (H1)
    styles.add(ParagraphStyle(
        name='SectionHeading',
        fontName='NotoSerifSC-Bold',
        fontSize=18,
        leading=24,
        textColor=COLORS['primary'],
        spaceBefore=20,
        spaceAfter=12,
        borderPadding=(0, 0, 5, 0),
    ))
    
    # Subsection heading (H2)
    styles.add(ParagraphStyle(
        name='SubsectionHeading',
        fontName='NotoSerifSC-Bold',
        fontSize=14,
        leading=18,
        textColor=COLORS['primary_light'],
        spaceBefore=15,
        spaceAfter=8,
    ))
    
    # Body text
    styles.add(ParagraphStyle(
        name='CustomBodyText',
        fontName='NotoSerifSC',
        fontSize=10,
        leading=15,
        textColor=COLORS['text_dark'],
        spaceBefore=4,
        spaceAfter=8,
        firstLineIndent=0,
    ))
    
    # Code/Command style
    styles.add(ParagraphStyle(
        name='CodeText',
        fontName='Courier',
        fontSize=9,
        leading=12,
        textColor=COLORS['text_dark'],
        backColor=COLORS['bg_light'],
        borderColor=COLORS['border'],
        borderWidth=1,
        borderPadding=8,
        spaceBefore=4,
        spaceAfter=8,
    ))
    
    # Note/Warning style
    styles.add(ParagraphStyle(
        name='NoteText',
        fontName='NotoSerifSC',
        fontSize=9,
        leading=13,
        textColor=COLORS['text_muted'],
        leftIndent=20,
        rightIndent=20,
        spaceBefore=8,
        spaceAfter=8,
    ))
    
    # Table header style
    styles.add(ParagraphStyle(
        name='TableHeader',
        fontName='NotoSerifSC-Bold',
        fontSize=10,
        leading=13,
        textColor=colors.white,
        alignment=1,
    ))
    
    # Table cell style
    styles.add(ParagraphStyle(
        name='TableCell',
        fontName='NotoSerifSC',
        fontSize=9,
        leading=12,
        textColor=COLORS['text_dark'],
    ))
    
    return styles


def create_cover_page(styles):
    """Create cover page elements"""
    elements = []
    
    elements.append(Spacer(1, 2*inch))
    
    # Main title
    elements.append(Paragraph(
        "CyberSOC Platform",
        styles['CustomTitle']
    ))
    
    elements.append(Paragraph(
        "Production Deployment Playbook",
        ParagraphStyle(
            'CoverSubtitle',
            fontName='NotoSerifSC-Bold',
            fontSize=22,
            leading=28,
            textColor=COLORS['accent'],
            alignment=1,
            spaceAfter=30,
        )
    ))
    
    elements.append(Spacer(1, 0.5*inch))
    
    # Subtitle info
    elements.append(Paragraph(
        "Step-by-Step Cutover Procedure for General Availability<br/>"
        "Djezzy Algeria | National SOC Operations Center",
        styles['CustomSubtitle']
    ))
    
    elements.append(Spacer(1, 1*inch))
    
    # Document metadata table
    meta_data = [
        ['Document Version:', '2.0.0-GA'],
        ['Classification:', 'Internal - Operational'],
        ['Effective Date:', datetime.now().strftime('%Y-%m-%d')],
        ['Review Cycle:', 'Quarterly or After Major Changes'],
        ['Owner:', 'CyberSOC Platform Team'],
    ]
    
    meta_table = Table(meta_data, colWidths=[2*inch, 3*inch])
    meta_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'NotoSerifSC-Bold'),
        ('FONTNAME', (1, 0), (1, -1), 'NotoSerifSC'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('TEXTCOLOR', (0, 0), (0, -1), COLORS['text_muted']),
        ('TEXTCOLOR', (1, 0), (1, -1), COLORS['text_dark']),
        ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
        ('ALIGN', (1, 0), (1, -1), 'LEFT'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(meta_table)
    
    elements.append(PageBreak())
    return elements


def create_toc(styles):
    """Create table of contents"""
    elements = []
    
    elements.append(Paragraph("Table of Contents", styles['SectionHeading']))
    elements.append(Spacer(1, 0.3*inch))
    
    toc_items = [
        ("1.", "Executive Summary", "3"),
        ("2.", "Pre-Deployment Checklist", "4"),
        ("3.", "Phase 1: Infrastructure Preparation (T-7 days)", "6"),
        ("4.", "Phase 2: Database Migration (T-3 days)", "8"),
        ("5.", "Phase 3: Application Deployment (T-Day)", "11"),
        ("6.", "Phase 4: Validation & Testing (T+1 day)", "14"),
        ("7.", "Phase 5: Cutover & Go-Live (T+2 days)", "16"),
        ("8.", "Phase 6: Hypercare Support (T+3 to T+30 days)", "18"),
        ("9.", "Rollback Procedures", "20"),
        ("10.", "Emergency Contacts & Escalation", "22"),
        ("A.", "Appendix: Command Reference", "23"),
        ("B.", "Appendix: Configuration Templates", "25"),
    ]
    
    for num, title, page in toc_items:
        toc_row = Table(
            [[num, title, '.' * 50, page]],
            colWidths=[0.4*inch, 3*inch, 2*inch, 0.5*inch]
        )
        toc_row.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (0, 0), 'NotoSerifSC-Bold'),
            ('FONTNAME', (1, 0), (1, 0), 'NotoSerifSC'),
            ('FONTNAME', (2, 0), (2, 0), 'NotoSerifSC'),
            ('FONTNAME', (3, 0), (3, 0), 'NotoSerifSC'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('TEXTCOLOR', (0, 0), (-1, -1), COLORS['text_dark']),
            ('TEXTCOLOR', (2, 0), (2, 0), COLORS['border']),
            ('ALIGN', (3, 0), (3, 0), 'RIGHT'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
        ]))
        elements.append(toc_row)
    
    elements.append(PageBreak())
    return elements


def create_executive_summary(styles):
    """Create executive summary section"""
    elements = []
    
    elements.append(Paragraph("1. Executive Summary", styles['SectionHeading']))
    
    summary_text = """
    This Deployment Playbook provides a comprehensive, step-by-step guide for executing the production 
    cutover of the CyberSOC Platform to General Availability (GA) status for Djezzy Algeria's National 
    Security Operations Center. The document outlines all critical procedures, validation checkpoints, 
    rollback mechanisms, and escalation paths necessary to ensure a successful deployment with minimal 
    service disruption and zero data loss.
    """
    elements.append(Paragraph(summary_text.strip(), styles['CustomBodyText']))
    
    elements.append(Paragraph("1.1 Scope and Objectives", styles['SubsectionHeading']))
    
    scope_text = """
    The primary objective of this deployment is to transition the CyberSOC Platform from its current 
    staging environment to a fully operational production state capable of handling enterprise-grade 
    security operations at scale. The platform must achieve sustained throughput of 10,000 events per 
    second (EPS) while maintaining sub-second response times for critical alert triage workflows. 
    Additionally, the deployment must ensure compliance with ANRT (Autorite de Regulation de la 
    Poste et des Communications Electroniques) regulatory requirements, including mandatory audit 
    logging with 7-year retention periods and real-time threat intelligence sharing capabilities.
    """
    elements.append(Paragraph(scope_text.strip(), styles['CustomBodyText']))
    
    elements.append(Paragraph("1.2 Key Success Criteria", styles['SubsectionHeading']))
    
    success_criteria = [
        ['Criterion', 'Target Value', 'Measurement Method'],
        ['System Availability', '99.95% uptime', 'Prometheus / Grafana monitoring'],
        ['Event Processing Rate', '>10,000 EPS sustained', 'Kafka consumer lag metrics'],
        ['API Response Time (P95)', '<500ms', 'Application performance monitoring'],
        ['Database Query Performance', '<100ms P95', 'PostgreSQL query statistics'],
        ['Security Posture Score', '>95%', 'Automated security scanning'],
        ['Data Loss Tolerance', 'ZERO data loss', 'Transaction log verification'],
        ['Recovery Time Objective (RTO)', '<15 minutes', 'DR drill execution time'],
        ['Recovery Point Objective (RPO)', '<1 hour', 'Backup replication lag'],
    ]
    
    criteria_table = Table(success_criteria, colWidths=[2*inch, 1.5*inch, 2.5*inch])
    criteria_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), COLORS['primary']),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'NotoSerifSC-Bold'),
        ('FONTNAME', (0, 1), (-1, -1), 'NotoSerifSC'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('ALIGN', (0, 1), (0, -1), 'LEFT'),
        ('GRID', (0, 0), (-1, -1), 0.5, COLORS['border']),
        ('BACKGROUND', (0, 1), (-1, -1), COLORS['bg_light']),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [COLORS['bg_light'], colors.white]),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(criteria_table)
    elements.append(Spacer(1, 0.2*inch))
    
    elements.append(Paragraph("1.3 Deployment Timeline Overview", styles['SubsectionHeading']))
    
    timeline_text = """
    The complete deployment timeline spans approximately two weeks, structured into six distinct phases 
    with built-in validation gates between each phase. Phase 1 begins at T-7 days (seven days before 
    target go-live date) with infrastructure preparation activities including Kubernetes cluster 
    provisioning, network policy configuration, and storage class setup. Phase 2 covers database 
    migration from SQLite development databases to PostgreSQL HA clusters with read replica 
    configuration and connection pooling via PgBouncer. Phase 3 represents the actual application 
    deployment on T-Day, involving container image promotion, rolling updates across all microservices, 
    and ingress controller configuration. Phase 4 focuses on comprehensive validation testing including 
    integration tests, load testing at target EPS rates, and security penetration testing. Phase 5 
    executes the actual traffic cutover from staging to production endpoints. Finally, Phase 6 
    establishes the hypercare support period with enhanced monitoring, rapid incident response, and 
    stakeholder communication protocols.
    """
    elements.append(Paragraph(timeline_text.strip(), styles['CustomBodyText']))
    
    return elements


def create_pre_deployment_checklist(styles):
    """Create pre-deployment checklist section"""
    elements = []
    
    elements.append(Paragraph("2. Pre-Deployment Checklist", styles['SectionHeading']))
    
    intro_text = """
    Before initiating any deployment activities, the deployment team must verify that all prerequisite 
    conditions have been met and all stakeholders have provided necessary approvals. This section provides 
    a comprehensive checklist organized by category to ensure nothing is overlooked during the high-pressure 
    deployment window. Each item must be explicitly checked off by the responsible party with timestamp 
    and signature documentation retained for audit purposes.
    """
    elements.append(Paragraph(intro_text.strip(), styles['CustomBodyText']))
    
    elements.append(Paragraph("2.1 Infrastructure Readiness", styles['SubsectionHeading']))
    
    infra_checklist = [
        ['Item', 'Status', 'Owner', 'Verified'],
        ['Kubernetes cluster (production) provisioned and accessible', '[ ]', 'Platform Team', ''],
        ['All node pools configured with correct labels and taints', '[ ]', 'Platform Team', ''],
        ['Storage classes created (premium-ssd, premium-nvme)', '[ ]', 'Storage Team', ''],
        ['Network policies reviewed and approved by security', '[ ]', 'Security Team', ''],
        ['TLS certificates provisioned via cert-manager', '[ ]', 'Security Team', ''],
        ['External DNS records configured for production domains', '[ ]', 'Network Team', ''],
        ['Load balancer IPs reserved and configured', '[ ]', 'Network Team', ''],
        ['Monitoring stack (Prometheus/Grafana) deployed', '[ ]', 'Observability', ''],
        ['Alertmanager routes configured with PagerDuty/Slack', '[ ]', 'Observability', ''],
    ]
    
    infra_table = Table(infra_checklist, colWidths=[3.2*inch, 0.6*inch, 1.2*inch, 1*inch])
    infra_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), COLORS['primary']),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'NotoSerifSC-Bold'),
        ('FONTNAME', (0, 1), (-1, -1), 'NotoSerifSC'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('ALIGN', (1, 0), (2, -1), 'CENTER'),
        ('GRID', (0, 0), (-1, -1), 0.5, COLORS['border']),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [COLORS['bg_light'], colors.white]),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(infra_table)
    elements.append(Spacer(1, 0.15*inch))
    
    elements.append(Paragraph("2.2 Database Readiness", styles['SubsectionHeading']))
    
    db_checklist = [
        ['Item', 'Status', 'Owner', 'Verified'],
        ['PostgreSQL HA cluster (3 primary + 2 replicas) running', '[ ]', 'DBA Team', ''],
        ['PgBouncer connection pooling configured and tested', '[ ]', 'DBA Team', ''],
        ['Database backups verified (full + WAL)', '[ ]', 'DBA Team', ''],
        ['Migration scripts tested against staging clone', '[ ]', 'DBA Team', ''],
        ['Connection strings documented in secrets manager', '[ ]', 'Security Team', ''],
        ['Performance tuning parameters applied', '[ ]', 'DBA Team', ''],
        ['Replication lag < 1 second confirmed', '[ ]', 'DBA Team', ''],
        ['Row-Level Security policies enabled', '[ ]', 'Security Team', ''],
    ]
    
    db_table = Table(db_checklist, colWidths=[3.2*inch, 0.6*inch, 1.2*inch, 1*inch])
    db_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), COLORS['primary']),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'NotoSerifSC-Bold'),
        ('FONTNAME', (0, 1), (-1, -1), 'NotoSerifSC'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('ALIGN', (1, 0), (2, -1), 'CENTER'),
        ('GRID', (0, 0), (-1, -1), 0.5, COLORS['border']),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [COLORS['bg_light'], colors.white]),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(db_table)
    elements.append(Spacer(1, 0.15*inch))
    
    elements.append(Paragraph("2.3 Application & Security Readiness", styles['SubsectionHeading']))
    
    app_checklist = [
        ['Item', 'Status', 'Owner', 'Verified'],
        ['Container images built and pushed to registry (tagged v2.0.0-prod)', '[ ]', 'DevOps', ''],
        ['Helm chart values-production.yaml reviewed', '[ ]', 'DevOps', ''],
        ['.env.production template completed and validated', '[ ]', 'Security Team', ''],
        ['JWT secrets generated and stored in Vault/K8s Secrets', '[ ]', 'Security Team', ''],
        ['Rate limiting configuration tested', '[ ]', 'Security Team', ''],
        ['CORS policies configured for production domains', '[ ]', 'Security Team', ''],
        ['WAF rules imported and activated', '[ ]', 'Security Team', ''],
        ['Audit logging enabled with correct retention', '[ ]', 'Compliance', ''],
        ['All API endpoints passing security scan', '[ ]', 'Security Team', ''],
        ['Penetration test completed with no critical findings', '[ ]', 'Security Team', ''],
    ]
    
    app_table = Table(app_checklist, colWidths=[3.2*inch, 0.6*inch, 1.2*inch, 1*inch])
    app_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), COLORS['primary']),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'NotoSerifSC-Bold'),
        ('FONTNAME', (0, 1), (-1, -1), 'NotoSerifSC'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('ALIGN', (1, 0), (2, -1), 'CENTER'),
        ('GRID', (0, 0), (-1, -1), 0.5, COLORS['border']),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [COLORS['bg_light'], colors.white]),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(app_table)
    
    return elements


def create_phase1_infrastructure(styles):
    """Create Phase 1: Infrastructure Preparation"""
    elements = []
    
    elements.append(Paragraph("3. Phase 1: Infrastructure Preparation (T-7 days)", styles['SectionHeading']))
    
    phase_intro = """
    Phase 1 establishes the foundational infrastructure required for the production deployment. This phase 
    begins seven days before the target go-live date to provide adequate buffer time for addressing any 
    unexpected issues that may arise during cluster provisioning or network configuration. All activities in 
    this phase should be performed during business hours to ensure maximum availability of vendor support 
    and internal subject matter experts.
    """
    elements.append(Paragraph(phase_intro.strip(), styles['CustomBodyText']))
    
    elements.append(Paragraph("3.1 Kubernetes Cluster Setup", styles['SubsectionHeading']))
    
    k8s_steps = """
    The production Kubernetes cluster must be provisioned according to the specifications defined in the 
    values-production.yaml Helm chart configuration. The cluster should consist of a minimum of nine worker 
    nodes distributed across three availability zones for high availability. Node pools should be 
    dedicated by workload type: critical workloads (API servers, SIEM processors) run on nodes with 
    premium NVMe storage attached, while batch processing workloads (reporting, analytics) utilize 
    standard SSD storage classes. Each node pool must have appropriate taints and tolerations configured 
    to prevent resource contention between latency-sensitive and batch workloads.
    """
    elements.append(Paragraph(k8s_steps.strip(), styles['CustomBodyText']))
    
    # K8s commands
    k8s_commands = """
    <b>Key Commands:</b><br/>
    <font face="Courier" size="8">
    # Create production namespace<br/>
    kubectl create namespace cybersoc<br/><br/>
    
    # Apply network policies (zero-trust model)<br/>
    kubectl apply -f k8s/cert-manager/certificates.yaml<br/><br/>
    
    # Verify cluster nodes<br/>
    kubectl get nodes -L node-type -L workload-class<br/><br/>
    
    # Check resource quotas<br/>
    kubectl describe resourcequota -n cybersoc<br/>
    </font>
    """
    elements.append(Paragraph(k8s_commands, styles['CodeText']))
    
    elements.append(Paragraph("3.2 Storage Configuration", styles['SubsectionHeading']))
    
    storage_text = """
    Persistent storage must be provisioned using Kubernetes StorageClass resources mapped to your cloud 
    provider's block storage offerings. For the CyberSOC Platform, three distinct storage classes are 
    required: premium-nvme for hot Elasticsearch data and PostgreSQL WAL files requiring maximum IOPS; 
    premium-ssd for warm data, application logs, and Redis persistence; and standard storage for backup 
    repositories and cold archive data. Each StorageClass should be configured with appropriate retention 
    policies, encryption-at-rest enabled using cloud provider KMS keys, and snapshot schedules aligned 
    with the RPO requirements defined in the success criteria.
    """
    elements.append(Paragraph(storage_text.strip(), styles['CustomBodyText']))
    
    elements.append(Paragraph("3.3 TLS Certificate Provisioning", styles['SubsectionHeading']))
    
    tls_text = """
    TLS certificates for all production domains must be provisioned using cert-manager with the 
    Let's Encrypt production CA (or an internal enterprise CA if operating in an air-gapped environment). 
    The certificate resources defined in k8s/cert-manager/certificates.yaml should be applied to create 
    Certificate resources for soc.djezzy.dz, api-soc.djezzy.dz, grafana.soc.djezzy.dz, and internal 
    service mesh communication. Certificates should be configured with automatic renewal 15 days before 
    expiration, and monitoring alerts should be configured to notify the security team if any certificate 
    approaches expiry within 30 days.
    """
    elements.append(Paragraph(tls_text.strip(), styles['CustomBodyText']))
    
    # Validation gate
    elements.append(Paragraph("3.4 Phase 1 Validation Gate", styles['SubsectionHeading']))
    
    validation_text = """
    Before proceeding to Phase 2, the following validation checks must pass successfully. Any failure 
    requires immediate remediation and re-execution of the affected step before advancement can be 
    approved. The deployment lead and platform architect must jointly sign off on Phase 1 completion.
    """
    elements.append(Paragraph(validation_text.strip(), styles['CustomBodyText']))
    
    validation_criteria = [
        ['Validation Check', 'Expected Result', 'Actual', 'Pass/Fail'],
        ['Cluster health check', 'All nodes Ready', '', ''],
        ['DNS resolution for prod domains', 'Resolves to LB IP', '', ''],
        ['TLS certificate issuance', 'Certificates Ready', '', ''],
        ['StorageClass provisioning', '3 SCs available', '', ''],
        ['Network policy enforcement', 'Default-deny active', '', ''],
        ['Resource quota limits', 'Quotas applied', '', ''],
    ]
    
    val_table = Table(validation_criteria, colWidths=[2.2*inch, 1.8*inch, 1.2*inch, 0.8*inch])
    val_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), COLORS['success']),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'NotoSerifSC-Bold'),
        ('FONTNAME', (0, 1), (-1, -1), 'NotoSerifSC'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('ALIGN', (2, 0), (-1, -1), 'CENTER'),
        ('GRID', (0, 0), (-1, -1), 0.5, COLORS['border']),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, COLORS['bg_light']]),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(val_table)
    
    return elements


def create_phase2_database_migration(styles):
    """Create Phase 2: Database Migration"""
    elements = []
    
    elements.append(Paragraph("4. Phase 2: Database Migration (T-3 days)", styles['SectionHeading']))
    
    db_intro = """
    Phase 2 executes the critical database migration from SQLite (development/staging) to PostgreSQL 
    HA (production). This phase begins three days before go-live to allow sufficient time for data 
    validation, performance tuning, and potential rollback if issues are discovered. The migration uses 
    the execute-staging-migration.sh script which has been specifically designed for idempotent execution 
    and includes comprehensive error handling and rollback capabilities at each step.
    """
    elements.append(Paragraph(db_intro.strip(), styles['CustomBodyText']))
    
    elements.append(Paragraph("4.1 Pre-Migration Backup", styles['SubsectionHeading']))
    
    backup_text = """
    Before initiating any migration activities, a complete backup of the existing SQLite database must be 
    created and verified. The backup includes both the raw database file and a SQL dump for human-readable 
    inspection. Additionally, all application state including sessions, cache entries, and queued jobs 
    should be captured to enable exact point-in-time restoration if required. Backup integrity must be 
    verified by performing a test restore to a temporary location and comparing row counts against the 
    source database.
    """
    elements.append(Paragraph(backup_text.strip(), styles['CustomBodyText']))
    
    backup_commands = """
    <font face="Courier" size="8">
    # Execute the staging migration script<br/>
    chmod +x scripts/database/execute-staging-migration.sh<br/>
    ./scripts/database/execute-staging-migration.sh<br/><br/>
    
    # Verify backup creation<br/>
    ls -lah backups/staging_migration_*/<br/><br/>
    
    # Check migration report<br/>
    cat backups/staging_migration_*/migration_report.txt<br/>
    </font>
    """
    elements.append(Paragraph(backup_commands, styles['CodeText']))
    
    elements.append(Paragraph("4.2 Schema Migration", styles['SubsectionHeading']))
    
    schema_text = """
    Schema migration converts the Prisma schema from SQLite provider to PostgreSQL provider, accounting 
    for dialect-specific differences in data types, indexing strategies, and constraint definitions. The 
    migration process generates a PostgreSQL-optimized schema file (schema-postgresql.prisma) and executes 
    Prisma's db push command to synchronize the database structure. For production deployments, it is 
    strongly recommended to use Prisma Migrate with versioned migration files rather than db push to 
    maintain an auditable history of schema changes and enable deterministic rollbacks.
    """
    elements.append(Paragraph(schema_text.strip(), styles['CustomBodyText']))
    
    elements.append(Paragraph("4.3 Data Migration & Verification", styles['SubsectionHeading']))
    
    data_text = """
    Data migration transfers existing records from SQLite tables to their PostgreSQL counterparts while 
    preserving referential integrity and data fidelity. The migration script handles common type conversions 
    automatically (INTEGER PRIMARY KEY to SERIAL, BLOB to BYTEA, DATETIME to TIMESTAMPTZ) but manual 
    intervention may be required for complex data types or custom SQL functions. Post-migration verification 
    compares row counts between source and destination tables, samples random records for content accuracy, 
    and validates that all foreign key relationships remain intact.
    """
    elements.append(Paragraph(data_text.strip(), styles['CustomBodyText']))
    
    # Row count verification table
    elements.append(Paragraph("<b>Migration Verification Table Example:</b>", styles['CustomBodyText']))
    
    row_counts = [
        ['Table Name', 'SQLite Rows', 'PostgreSQL Rows', 'Match', 'Notes'],
        ['users', '1,247', '1,247', 'YES', ''],
        ['sessions', '5,891', '5,891', 'YES', ''],
        ['alerts', '127,453', '127,453', 'YES', ''],
        ['incidents', '3,291', '3,291', 'YES', ''],
        ['audit_logs', '892,104', '892,104', 'YES', 'Large table - verify sample'],
    ]
    
    row_table = Table(row_counts, colWidths=[1.5*inch, 1.1*inch, 1.3*inch, 0.7*inch, 1.4*inch])
    row_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), COLORS['primary']),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'NotoSerifSC-Bold'),
        ('FONTNAME', (0, 1), (-1, -1), 'NotoSerifSC'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('ALIGN', (1, 0), (3, -1), 'CENTER'),
        ('GRID', (0, 0), (-1, -1), 0.5, COLORS['border']),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [COLORS['bg_light'], colors.white]),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
    ]))
    elements.append(row_table)
    
    return elements


def create_phase3_application_deployment(styles):
    """Create Phase 3: Application Deployment (T-Day)"""
    elements = []
    
    elements.append(Paragraph("5. Phase 3: Application Deployment (T-Day)", styles['SectionHeading']))
    
    deploy_intro = """
    Phase 3 represents the main deployment event where containerized applications are rolled out to the 
    production Kubernetes cluster. This phase occurs on T-Day (the target go-live date) and follows a 
    carefully choreographed sequence designed to minimize downtime and enable rapid rollback if any 
    anomalies are detected. The deployment utilizes Kubernetes rolling update strategy with configurable 
    surge and unavailable parameters to maintain service capacity throughout the update process.
    """
    elements.append(Paragraph(deploy_intro.strip(), styles['CustomBodyText']))
    
    elements.append(Paragraph("5.1 Pre-Deployment Final Checks", styles['SubsectionHeading']))
    
    final_checks = """
    In the hours immediately preceding the deployment window, conduct a final verification of all systems. 
    Confirm that the production Helm release does not currently exist (or is in a safe state for upgrade). 
    Verify that all container images tagged v2.0.0-prod are available in the registry and pullable by all 
    worker nodes. Validate that external dependencies (PostgreSQL, Redis, Elasticsearch, Kafka) are reachable 
    from the cluster network and responding within acceptable latency thresholds. Ensure that all team 
    members are available via the designated communication channel (Slack bridge line or video conference).
    """
    elements.append(Paragraph(final_checks.strip(), styles['CustomBodyText']))
    
    elements.append(Paragraph("5.2 Helm Deployment Execution", styles['SubsectionHeading']))
    
    helm_commands = """
    <font face="Courier" size="8">
    # Add/update Helm repository<br/>
    helm repo add cybersoc https://charts.soc.djezzy.dz<br/>
    helm repo update<br/><br/>
    
    # Deploy with production values<br/>
    helm install soc-platform ./k8s/helm/soc-platform \\<br/>
    &nbsp;&nbsp;-f ./k8s/helm/soc-platform/values-production.yaml \\<br/>
    &nbsp;&nbsp;--namespace cybersoc \\<br/>
    &nbsp;&nbsp;--create-namespace \\<br/>
    &nbsp;&nbsp;--wait --timeout 600s<br/><br/>
    
    # Monitor rollout status<br/>
    helm status soc-platform -n cybersoc<br/>
    kubectl rollout status deployment/soc-platform-api -n cybersoc<br/><br/>
    
    # Check pod health<br/>
    kubectl get pods -n cybersoc -l app.kubernetes.io/name=soc-platform<br/>
    </font>
    """
    elements.append(Paragraph(helm_commands, styles['CodeText']))
    
    elements.append(Paragraph("5.3 Health Check Validation", styles['SubsectionHeading']))
    
    health_text = """
    Following the Helm chart installation, validate that all pods have reached the Ready state and are 
    passing liveness and readiness probes. Execute the application-level health check endpoint to verify 
    database connectivity, cache availability, and inter-service communication. Confirm that metrics are 
    being exported to Prometheus and that no error alerts are firing in Alertmanager. Document the exact 
    timestamps when each component entered the Ready state for post-deployment analysis.
    """
    elements.append(Paragraph(health_text.strip(), styles['CustomBodyText']))
    
    health_checks = [
        ['Component', 'Health Endpoint', 'Expected Response', 'Status'],
        ['API Server', '/api/health/live', '{"status":"ok"}', ''],
        ['Readiness Probe', '/api/health/ready', '{"db":"ok","redis":"ok"}', ''],
        ['PostgreSQL', 'port 5432 TCP', 'Connection accepted', ''],
        ['Redis', 'port 6379 TCP', 'PONG response', ''],
        ['Elasticsearch', 'port 9200 HTTP', 'cluster_name returned', ''],
        ['Kafka', 'port 9092 TCP', 'Metadata response', ''],
    ]
    
    health_table = Table(health_checks, colWidths=[1.4*inch, 1.6*inch, 1.8*inch, 0.8*inch])
    health_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), COLORS['primary']),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'NotoSerifSC-Bold'),
        ('FONTNAME', (0, 1), (-1, -1), 'NotoSerifSC'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('ALIGN', (3, 0), (3, -1), 'CENTER'),
        ('GRID', (0, 0), (-1, -1), 0.5, COLORS['border']),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [COLORS['bg_light'], colors.white]),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(health_table)
    
    return elements


def create_phase4_validation_testing(styles):
    """Create Phase 4: Validation & Testing"""
    elements = []
    
    elements.append(Paragraph("6. Phase 4: Validation & Testing (T+1 day)", styles['SectionHeading']))
    
    validation_intro = """
    Phase 4 focuses on comprehensive validation of the deployed system to confirm that all components are 
    functioning correctly under realistic load conditions. This phase begins on T+1 (one day after initial 
    deployment) to allow the system to stabilize and for initial telemetry baselines to be established. 
    Testing activities progress from basic smoke tests through integration validation to full-scale load 
    testing and security assessment.
    """
    elements.append(Paragraph(validation_intro.strip(), styles['CustomBodyText']))
    
    elements.append(Paragraph("6.1 Smoke Testing", styles['SubsectionHeading']))
    
    smoke_text = """
    Smoke tests verify basic functionality across all major user journeys without requiring extensive test 
    data setup. These tests should complete within 30 minutes and provide immediate confidence that the core 
    application is operational. Test scenarios include user authentication (including MFA flow), dashboard 
    loading with real-time data feeds, alert creation and acknowledgment workflow, incident creation from 
    an alert, and report generation export functionality. Any smoke test failure blocks progression to 
    deeper testing levels until root cause is identified and remediated.
    """
    elements.append(Paragraph(smoke_text.strip(), styles['CustomBodyText']))
    
    elements.append(Paragraph("6.2 Integration Testing", styles['SubsectionHeading']))
    
    integration_text = """
    Integration testing validates end-to-end workflows that span multiple system components and external 
    integrations. Key test scenarios include SS7 message ingestion and fraud rule evaluation pipeline, 
    threat intelligence feed synchronization (MISP, OpenCTI), SOAR playbook execution with external ticketing 
    system integration, ANRT compliance report generation and submission, and real-time SSE stream delivery 
    to connected dashboard clients. Each integration test should validate both the happy path and common error 
    conditions to ensure proper error handling and graceful degradation.
    """
    elements.append(Paragraph(integration_text.strip(), styles['CustomBodyText']))
    
    elements.append(Paragraph("6.3 Load Testing", styles['SubsectionHeading']))
    
    load_text = """
    Load testing validates that the system can sustain the target throughput of 10,000 events per second 
    while maintaining acceptable response times. Use the k6 load testing scripts located in 
    performance/load-testing/ to simulate realistic traffic patterns including burst scenarios (2x baseline 
    for 5 minutes) and sustained peak load (1.5x baseline for 1 hour). Monitor key metrics including API 
    response time percentiles (P50, P95, P99), error rates, database connection pool utilization, Kafka 
    consumer lag, and Elasticsearch indexing latency. Document baseline performance metrics for ongoing 
    comparison and capacity planning.
    """
    elements.append(Paragraph(load_text.strip(), styles['CustomBodyText']))
    
    load_commands = """
    <font face="Courier" size="8">
    # Run load test targeting 10K EPS<br/>
    k6 run performance/load-testing/k6-10k-eps-target.js \\<br/>
    &nbsp;&nbsp;--env BASE_URL=https://soc.djezky.dz \\<br/>
    &nbsp;&nbsp;--env TARGET_EPS=10000 \\<br/>
    &nbsp;&nbsp;--duration 1h<br/><br/>
    
    # Run dashboard load test<br/>
    k6 run performance/load-testing/k6-dashboard-load.js \\<br/>
    &nbsp;&nbsp;--env BASE_URL=https://soc.djezky.dz \\<br/>
    &nbsp;&nbsp;--vus 100 --duration 30m<br/>
    </font>
    """
    elements.append(Paragraph(load_commands, styles['CodeText']))
    
    return elements


def create_phase5_cutover_golive(styles):
    """Create Phase 5: Cutover & Go-Live"""
    elements = []
    
    elements.append(Paragraph("7. Phase 5: Cutover & Go-Live (T+2 days)", styles['SectionHeading']))
    
    cutover_intro = """
    Phase 5 executes the actual traffic cutover from the old system (or staging environment) to the newly 
    deployed production instance. This phase requires careful coordination with network teams, DNS 
    administrators, and application stakeholders to ensure a smooth transition with minimal user impact. 
    The cutover window should be scheduled during low-traffic periods (typically 02:00-04:00 local time) 
    unless business requirements dictate otherwise.
    """
    elements.append(Paragraph(cutover_intro.strip(), styles['CustomBodyText']))
    
    elements.append(Paragraph("7.1 DNS Cutover Procedure", styles['SubsectionHeading']))
    
    dns_text = """
    DNS cutover involves updating DNS records to point production domains (soc.djezzy.dz, api-soc.djezzy.dz) 
    to the new load balancer IPs. If using a global DNS provider with geo-based routing (such as Route53 or 
    Cloudflare), update records in a controlled manner starting with low-TTL (60 seconds) changes that can 
    be quickly reverted if issues arise. Monitor DNS propagation using multiple resolver locations to confirm 
    global visibility of updated records before announcing the cutover to users.
    """
    elements.append(Paragraph(dns_text.strip(), styles['CustomBodyText']))
    
    dns_commands = """
    <font face="Courier" size="8">
    # Update DNS A record (example using Route53 CLI)<br/>
    aws route53 change-resource-record-sets \\<br/>
    &nbsp;&nbsp;--hosted-zone-id Z3ABCDEFGHIJKLM \\<br/>
    &nbsp;&nbsp;--change-batch file://dns-cutover.json<br/><br/>
    
    # Verify DNS propagation<br/>
    dig soc.djezzy.dz @8.8.8.8 +short<br/>
    dig soc.djezzy.dz @1.1.1.1 +short<br/><br/>
    
    # Monitor TTL countdown<br/>
    watch -n 5 dig soc.djezzy.dz +noall +answer
    </font>
    """
    elements.append(Paragraph(dns_commands, styles['CodeText']))
    
    elements.append(Paragraph("7.2 Traffic Verification", styles['SubsectionHeading']))
    
    traffic_text = """
    Following DNS propagation, verify that user traffic is reaching the new production infrastructure by 
    monitoring access logs, request metrics, and active session counts. Confirm that SSL/TLS termination 
    is functioning correctly and that clients are not receiving certificate warnings. Validate that 
    authentication flows complete successfully and that existing user sessions (if migrated) remain valid. 
    Enable verbose logging temporarily to capture any client-side errors that may indicate compatibility 
    issues with the new deployment.
    """
    elements.append(Paragraph(traffic_text.strip(), styles['CustomBodyText']))
    
    elements.append(Paragraph("7.3 Stakeholder Communication", styles['SubsectionHeading']))
    
    comm_text = """
    Once traffic verification confirms successful cutover, initiate the stakeholder communication plan. Send 
    notifications to all user groups announcing the production launch, including links to documentation, 
    support contacts, and known issues or feature differences from the previous system. Schedule kickoff 
    calls with key stakeholder groups (SOC analysts, management, compliance officers) to demonstrate new 
    capabilities and gather initial feedback. Update status dashboards and internal wikis to reflect the 
    production state.
    """
    elements.append(Paragraph(comm_text.strip(), styles['CustomBodyText']))
    
    return elements


def create_phase6_hypercare(styles):
    """Create Phase 6: Hypercare Support"""
    elements = []
    
    elements.append(Paragraph("8. Phase 6: Hypercare Support (T+3 to T+30 days)", styles['SectionHeading']))
    
    hypercare_intro = """
    The hypercare period provides enhanced monitoring and rapid response capability during the critical first 
    30 days following production launch. During this period, the deployment team maintains elevated 
    availability for incident response, conducts daily health reviews, and implements quick-turn fixes for 
    any issues discovered under real production load. Hypercare ends when the system demonstrates stable 
    operation for 30 consecutive days with no severity-1 or severity-2 incidents.
    """
    elements.append(Paragraph(hypercare_intro.strip(), styles['CustomBodyText']))
    
    elements.append(Paragraph("8.1 Enhanced Monitoring", styles['SubsectionHeading']))
    
    monitor_text = """
    During hypercare, reduce all alert thresholds to 50% of normal values to detect anomalies earlier and 
    provide more time for investigation before user impact occurs. Enable additional logging verbosity for 
    troubleshooting purposes, particularly around authentication flows, database queries, and external 
    integration calls. Create dedicated dashboards for hypercare-specific metrics including deployment-
    related errors, new user signups, feature adoption rates, and performance regression detection. Conduct 
    twice-daily reviews of all dashboards with the full deployment team present.
    """
    elements.append(Paragraph(monitor_text.strip(), styles['CustomBodyText']))
    
    elements.append(Paragraph("8.2 Incident Response Protocol", styles['SubsectionHeading']))
    
    ir_text = """
    Establish a dedicated hypercare war room (virtual or physical) with continuous coverage during business 
    hours and on-call rotation for after-hours incidents. Define escalated SLAs for hypercare period: 
    Severity-1 (service down) targets 5-minute response and 30-minute resolution; Severity-2 (degraded) 
    targets 15-minute response and 2-hour resolution; Severity-3 (minor) targets 1-hour response and 
    24-hour resolution. All incidents must be documented with post-mortem follow-up required for any 
    severity-1 or severity-2 event regardless of resolution time.
    """
    elements.append(Paragraph(ir_text.strip(), styles['CustomBodyText']))
    
    # Hypercare schedule table
    elements.append(Paragraph("8.3 Daily Health Review Agenda", styles['SubsectionHeading']))
    
    agenda_items = [
        ['Time', 'Topic', 'Owner', 'Duration'],
        ['09:00', 'Overnight incident review', 'On-call Lead', '15 min'],
        ['09:15', 'Dashboard metric walkthrough', 'SRE Team', '20 min'],
        ['09:35', 'User feedback and tickets review', 'Support Lead', '15 min'],
        ['09:50', 'Capacity and performance trends', 'Platform Team', '15 min'],
        ['10:05', 'Action items and blockers', 'All', '10 min'],
    ]
    
    agenda_table = Table(agenda_items, colWidths=[0.8*inch, 2.4*inch, 1.2*inch, 1*inch])
    agenda_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), COLORS['warning']),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'NotoSerifSC-Bold'),
        ('FONTNAME', (0, 1), (-1, -1), 'NotoSerifSC'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('ALIGN', (0, 0), (0, -1), 'CENTER'),
        ('ALIGN', (3, 0), (3, -1), 'CENTER'),
        ('GRID', (0, 0), (-1, -1), 0.5, COLORS['border']),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, COLORS['bg_light']]),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(agenda_table)
    
    return elements


def create_rollback_procedures(styles):
    """Create Rollback Procedures section"""
    elements = []
    
    elements.append(Paragraph("9. Rollback Procedures", styles['SectionHeading']))
    
    rollback_intro = """
    Rollback procedures provide a safety net for reverting to a known-good state if the deployment 
    encounters critical issues that cannot be quickly resolved. Three tiers of rollback are defined, 
    each with increasing scope and recovery time objective. The decision to execute rollback rests with 
    the deployment lead in consultation with the product owner, considering factors such as user impact, 
    data loss risk, and estimated time to fix forward versus rollback.
    """
    elements.append(Paragraph(rollback_intro.strip(), styles['CustomBodyText']))
    
    elements.append(Paragraph("9.1 Tier 1: Application Rollback (RTO: 5 minutes)", styles['SubsectionHeading']))
    
    tier1_text = """
    Tier 1 rollback reverts the application to the previous Helm release version while preserving the 
    current infrastructure and database state. This is the fastest rollback option and should be the first 
    choice for application-level issues such as crashing pods, failed health checks, or obvious code defects. 
    Execute `helm rollback soc-platform 1` to revert to the prior release version, then verify pod health 
    and application functionality. Document the reason for rollback and preserve logs for post-mortem analysis.
    """
    elements.append(Paragraph(tier1_text.strip(), styles['CustomBodyText']))
    
    tier1_commands = """
    <font face="Courier" size="8">
    # Check available rollback versions<br/>
    helm history soc-platform -n cybersoc<br/><br/>
    
    # Rollback to previous version<br/>
    helm rollback soc-platform 1 -n cybersoc --wait<br/><br/>
    
    # Verify rollback success<br/>
    helm status soc-platform -n cybersoc<br/>
    kubectl rollout status deployment/soc-platform-api -n cybersoc<br/>
    </font>
    """
    elements.append(Paragraph(tier1_commands, styles['CodeText']))
    
    elements.append(Paragraph("9.2 Tier 2: Database Rollback (RTO: 30 minutes)", styles['SubsectionHeading']))
    
    tier2_text = """
    Tier 2 rollback addresses data corruption or migration failure scenarios by restoring the PostgreSQL 
    database from the pre-migration backup taken at the start of Phase 2. This procedure requires application 
    downtime while the database is restored and consistency is verified. Before executing database rollback, 
    confirm that the issue cannot be resolved with targeted data fixes, as full database restoration is a 
    significant operation with potential for data loss if transactions occurred after the backup was taken.
    """
    elements.append(Paragraph(tier2_text.strip(), styles['CustomBodyText']))
    
    elements.append(Paragraph("9.3 Tier 3: Full Environment Rollback (RTO: 2 hours)", styles['SubsectionHeading']))
    
    tier3_text = """
    Tier 3 rollback is the nuclear option that reverts the entire environment to its pre-deployment state, 
    including infrastructure changes, application deployment, and database state. This tier is reserved for 
    catastrophic failures affecting multiple system components simultaneously or when the root cause cannot 
    be identified within acceptable downtime thresholds. Full environment rollback requires coordination 
    across all teams and should be treated as a last resort after exhausting all other options.
    """
    elements.append(Paragraph(tier3_text.strip(), styles['CustomBodyText']))
    
    return elements


def create_emergency_contacts(styles):
    """Create Emergency Contacts section"""
    elements = []
    
    elements.append(Paragraph("10. Emergency Contacts & Escalation", styles['SectionHeading']))
    
    contacts_intro = """
    Maintain an up-to-date contact list for all personnel involved in the deployment and hypercare periods. 
    Contacts should include multiple communication channels (mobile phone, Slack DM, email) and clearly define 
    primary and secondary contacts for each role. Review and update this list before each deployment cycle 
    and confirm availability with all listed personnel during the pre-deployment briefing.
    """
    elements.append(Paragraph(contacts_intro.strip(), styles['CustomBodyText']))
    
    contacts_data = [
        ['Role', 'Primary Contact', 'Secondary', 'Escalation'],
        ['Deployment Lead', 'SOC Platform Lead', 'DevOps Manager', 'CTO'],
        ['Platform/SRE', 'Senior SRE Engineer', 'Platform Architect', 'VP Engineering'],
        ['Database (DBA)', 'Senior DBA', 'DBA Team Lead', 'Director of Data'],
        ['Security', 'Security Engineer', 'CISO Office', 'Chief Security Officer'],
        ['Network/Infra', 'Network Engineer', 'Infrastructure Lead', 'VP Infrastructure'],
        ['Product Owner', 'SOC Product Manager', 'Director of Product', 'CEO'],
        ['Executive Sponsor', 'VP of Engineering', 'CTO', 'CEO'],
    ]
    
    contacts_table = Table(contacts_data, colWidths=[1.4*inch, 1.6*inch, 1.4*inch, 1.4*inch])
    contacts_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), COLORS['error']),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'NotoSerifSC-Bold'),
        ('FONTNAME', (0, 1), (-1, -1), 'NotoSerifSC'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('GRID', (0, 0), (-1, -1), 0.5, COLORS['border']),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, COLORS['bg_light']]),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(contacts_table)
    
    elements.append(Spacer(1, 0.3*inch))
    
    elements.append(Paragraph("10.1 External Vendor Contacts", styles['SubsectionHeading']))
    
    vendor_contacts = [
        ['Vendor', 'Service', 'Contact Method', 'Contract Number'],
        ['Cloud Provider', 'Infrastructure Support', 'Premium Support Portal', 'CP-2024-SOC-001'],
        ['DNS Provider', 'DNS Management', 'Enterprise Support Line', 'DNS-2024-PROD-042'],
        ['Certificate Authority', 'TLS Certificates', 'cert-manager Support', 'N/A (Let\'s Encrypt)'],
        ['Security Scanner', 'Penetration Testing', 'Account Team Direct', 'SEC-2024-SCAN-015'],
    ]
    
    vendor_table = Table(vendor_contacts, colWidths=[1.4*inch, 1.5*inch, 1.6*inch, 1.5*inch])
    vendor_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), COLORS['text_muted']),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'NotoSerifSC-Bold'),
        ('FONTNAME', (0, 1), (-1, -1), 'NotoSerifSC'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('GRID', (0, 0), (-1, -1), 0.5, COLORS['border']),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [COLORS['bg_light'], colors.white]),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(vendor_table)
    
    return elements


def build_document():
    """Build the complete PDF document"""
    # Ensure output directory exists
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    # Create document
    doc = SimpleDocTemplate(
        OUTPUT_FILE,
        pagesize=A4,
        leftMargin=0.75*inch,
        rightMargin=0.75*inch,
        topMargin=0.75*inch,
        bottomMargin=0.75*inch,
        title="CyberSOC Platform - Production Deployment Playbook",
        author="CyberSOC Platform Team",
        subject="Step-by-step cutover procedure for GA deployment",
    )
    
    # Create styles
    styles = create_styles()
    
    # Build story (document content)
    story = []
    
    # Cover page
    story.extend(create_cover_page(styles))
    
    # Table of contents
    story.extend(create_toc(styles))
    
    # Main sections
    story.extend(create_executive_summary(styles))
    story.append(PageBreak())
    
    story.extend(create_pre_deployment_checklist(styles))
    story.append(PageBreak())
    
    story.extend(create_phase1_infrastructure(styles))
    story.append(PageBreak())
    
    story.extend(create_phase2_database_migration(styles))
    story.append(PageBreak())
    
    story.extend(create_phase3_application_deployment(styles))
    story.append(PageBreak())
    
    story.extend(create_phase4_validation_testing(styles))
    story.append(PageBreak())
    
    story.extend(create_phase5_cutover_golive(styles))
    story.append(PageBreak())
    
    story.extend(create_phase6_hypercare(styles))
    story.append(PageBreak())
    
    story.extend(create_rollback_procedures(styles))
    story.append(PageBreak())
    
    story.extend(create_emergency_contacts(styles))
    
    # Build PDF
    doc.build(story)
    
    print(f"✅ Deployment Playbook generated: {OUTPUT_FILE}")
    print(f"   File size: {os.path.getsize(OUTPUT_FILE) / 1024:.1f} KB")
    return OUTPUT_FILE


if __name__ == "__main__":
    output_path = build_document()
    print(f"\n📄 Document ready for download: {output_path}")
