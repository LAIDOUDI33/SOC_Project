#!/usr/bin/env python3
"""
CyberSOC Platform Specification Expansion Document
===============================================
Expands three critical areas needing improvement:
1. Kubernetes Deployment (Helm charts, K8s operators)
2. Known Limitations (Consolidated formal register)
3. Technical Debt Register (Template and format)

Generated for CyberSOC Platform v1.0 Specification Enhancement
"""

import os
from datetime import datetime
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm, cm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, ListFlowable, ListItem, KeepTogether
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY

# =============================================================================
# FONT REGISTRATION
# =============================================================================
FONT_DIR = '/usr/share/fonts'

# Register Chinese fonts
pdfmetrics.registerFont(TTFont('NotoSerifSC', f'{FONT_DIR}/truetype/noto-serif-sc/NotoSerifSC-Regular.ttf'))
pdfmetrics.registerFont(TTFont('NotoSerifSC-Bold', f'{FONT_DIR}/truetype/noto-serif-sc/NotoSerifSC-Bold.ttf'))
# Use Sarasa Mono SC for sans-serif (no static Noto Sans SC available)
pdfmetrics.registerFont(TTFont('NotoSansSC', f'{FONT_DIR}/truetype/chinese/SarasaMonoSC-Regular.ttf'))
pdfmetrics.registerFont(TTFont('NotoSansSC-Bold', f'{FONT_DIR}/truetype/chinese/SarasaMonoSC-Bold.ttf'))

registerFontFamily('NotoSerifSC', normal='NotoSerifSC', bold='NotoSerifSC-Bold')

# =============================================================================
# CASCADE PALETTE (Auto-generated)
# =============================================================================
PAGE_BG       = colors.HexColor('#f5f5f4')
SECTION_BG    = colors.HexColor('#f0f0ee')
CARD_BG       = colors.HexColor('#eae9e7')
TABLE_STRIPE  = colors.HexColor('#f1f0ef')
HEADER_FILL   = colors.HexColor('#5c543c')
COVER_BLOCK   = colors.HexColor('#6c654f')
BORDER        = colors.HexColor('#d9d4c5')
ICON          = colors.HexColor('#938456')
ACCENT        = colors.HexColor('#a48834')
ACCENT_2      = colors.HexColor('#5eabc4')
TEXT_PRIMARY  = colors.HexColor('#171615')
TEXT_MUTED    = colors.HexColor('#87847d')
SEM_SUCCESS   = colors.HexColor('#407452')
SEM_WARNING   = colors.HexColor('#ad8e50')
SEM_ERROR     = colors.HexColor('#93463f')
SEM_INFO      = colors.HexColor('#4e7dad')

# =============================================================================
# CUSTOM STYLES
# =============================================================================
styles = getSampleStyleSheet()

# Title style
styles.add(ParagraphStyle(
    name='DocTitle',
    fontName='NotoSerifSC-Bold',
    fontSize=24,
    leading=30,
    alignment=TA_CENTER,
    textColor=TEXT_PRIMARY,
    spaceAfter=20*mm
))

# Subtitle style
styles.add(ParagraphStyle(
    name='DocSubtitle',
    fontName='NotoSerifSC',
    fontSize=12,
    leading=16,
    alignment=TA_CENTER,
    textColor=TEXT_MUTED,
    spaceAfter=10*mm
))

# Section heading (H1)
styles.add(ParagraphStyle(
    name='SectionHeading',
    fontName='NotoSerifSC-Bold',
    fontSize=16,
    leading=22,
    textColor=HEADER_FILL,
    spaceBefore=15*mm,
    spaceAfter=8*mm,
    borderPadding=(0, 0, 3*mm, 0),
    borderWidth=0,
    borderColor=ACCENT
))

# Subsection heading (H2)
styles.add(ParagraphStyle(
    name='SubsectionHeading',
    fontName='NotoSerifSC-Bold',
    fontSize=13,
    leading=18,
    textColor=TEXT_PRIMARY,
    spaceBefore=8*mm,
    spaceAfter=4*mm
))

# Body text
styles.add(ParagraphStyle(
    name='CustomBody',
    fontName='NotoSerifSC',
    fontSize=10,
    leading=15,
    alignment=TA_JUSTIFY,
    textColor=TEXT_PRIMARY,
    spaceBefore=2*mm,
    spaceAfter=2*mm,
    firstLineIndent=0
))

# Code/technical text
styles.add(ParagraphStyle(
    name='CodeText',
    fontName='NotoSansSC',
    fontSize=8.5,
    leading=12,
    textColor=TEXT_PRIMARY,
    backColor=CARD_BG,
    borderPadding=3*mm,
    spaceBefore=2*mm,
    spaceAfter=2*mm
))

# Table header style
styles.add(ParagraphStyle(
    name='TableHeader',
    fontName='NotoSerifSC-Bold',
    fontSize=9,
    leading=12,
    alignment=TA_CENTER,
    textColor=colors.white
))

# Table cell style
styles.add(ParagraphStyle(
    name='TableCell',
    fontName='NotoSerifSC',
    fontSize=8.5,
    leading=11,
    textColor=TEXT_PRIMARY
))

# Bullet point style
styles.add(ParagraphStyle(
    name='BulletText',
    fontName='NotoSerifSC',
    fontSize=10,
    leading=14,
    textColor=TEXT_PRIMARY,
    leftIndent=8*mm,
    bulletIndent=0
))

# =============================================================================
# DOCUMENT CONTENT
# =============================================================================

def create_cover_page():
    """Create cover page elements."""
    elements = []
    
    elements.append(Spacer(1, 60*mm))
    
    elements.append(Paragraph(
        "CyberSOC Platform",
        styles['DocTitle']
    ))
    
    elements.append(Paragraph(
        "Specification Expansion Document",
        ParagraphStyle(
            'CoverSubtitle',
            fontName='NotoSerifSC',
            fontSize=18,
            leading=24,
            alignment=TA_CENTER,
            textColor=HEADER_FILL
        )
    ))
    
    elements.append(Spacer(1, 20*mm))
    
    elements.append(Paragraph(
        "Kubernetes Deployment | Known Limitations | Technical Debt Register",
        ParagraphStyle(
            'CoverTopics',
            fontName='NotoSansSC',
            fontSize=11,
            leading=16,
            alignment=TA_CENTER,
            textColor=TEXT_MUTED
        )
    ))
    
    elements.append(Spacer(1, 40*mm))
    
    # Document metadata table
    meta_data = [
        ['Document Version', '1.0 Expansion'],
        ['Classification', 'Internal Technical'],
        ['Date', datetime.now().strftime('%Y-%m-%d')],
        ['Status', 'Production Ready'],
    ]
    
    meta_table = Table(meta_data, colWidths=[100, 150])
    meta_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'NotoSerifSC-Bold'),
        ('FONTNAME', (1, 0), (1, -1), 'NotoSerifSC'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('TEXTCOLOR', (0, 0), (0, -1), TEXT_MUTED),
        ('TEXTCOLOR', (1, 0), (1, -1), TEXT_PRIMARY),
        ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
        ('ALIGN', (1, 0), (1, -1), 'LEFT'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
    ]))
    
    elements.append(meta_table)
    elements.append(PageBreak())
    
    return elements


def create_toc():
    """Create table of contents."""
    elements = []
    
    elements.append(Paragraph("Table of Contents", styles['SectionHeading']))
    elements.append(Spacer(1, 5*mm))
    
    toc_items = [
        ("1. Executive Summary", "Overview of expansion scope and objectives"),
        ("2. Kubernetes Deployment", "Complete K8s architecture, Helm charts, operators"),
        ("  2.1 Architecture Overview", "Microservices deployment topology"),
        ("  2.2 Helm Chart Structure", "Chart organization and values"),
        ("  2.3 Custom Operators", "CyberSOC-specific K8s operators"),
        ("  2.4 Deployment Workflows", "CI/CD integration and GitOps"),
        ("  2.5 Security Hardening", "Pod security, network policies, secrets"),
        ("3. Known Limitations Register", "Consolidated limitations with severity"),
        ("  3.1 Limitation Categories", "Classification framework"),
        ("  3.2 Complete Register", "All documented limitations"),
        ("  3.3 Mitigation Strategies", "Risk treatment approaches"),
        ("4. Technical Debt Register", "Tracking template and format"),
        ("  4.1 Register Structure", "Fields and metadata"),
        ("  4.2 Debt Categories", "Classification taxonomy"),
        ("  4.3 Tracking Workflow", "Review and remediation process"),
        ("5. Implementation Roadmap", "Phased improvement plan"),
    ]
    
    for item, desc in toc_items:
        if item.startswith("  "):
            style = ParagraphStyle(
                'TOCSubItem',
                fontName='NotoSerifSC',
                fontSize=10,
                leading=14,
                leftIndent=15*mm,
                textColor=TEXT_PRIMARY
            )
        else:
            style = ParagraphStyle(
                'TOCItem',
                fontName='NotoSerifSC-Bold',
                fontSize=11,
                leading=16,
                textColor=TEXT_PRIMARY
            )
        
        elements.append(Paragraph(f"{item}", style))
        elements.append(Paragraph(f"<font color='{TEXT_MUTED.hexval()}'>{desc}</font>", 
                                  ParagraphStyle('TOCDesc', fontName='NotoSerifSC', fontSize=9, 
                                                leftIndent=20*mm if item.startswith("  ") else 15*mm,
                                                textColor=TEXT_MUTED)))
    
    elements.append(PageBreak())
    return elements


def create_executive_summary():
    """Create executive summary section."""
    elements = []
    
    elements.append(Paragraph("1. Executive Summary", styles['SectionHeading']))
    
    summary_text = """
    This document provides comprehensive expansions for three critical areas identified in the CyberSOC Platform 
    specification audit. The original specification document encompasses 97 sections covering 41 distinct modules, 
    representing one of the most complete Security Operations Platform specifications in the industry. However, 
    the audit identified three specific areas requiring enhanced detail and formalized documentation structures 
    to achieve production readiness.
    """
    elements.append(Paragraph(summary_text.strip(), styles['CustomBody']))
    
    # Scope overview table
    scope_data = [
        [Paragraph('<b>Expansion Area</b>', styles['TableHeader']), 
         Paragraph('<b>Original Coverage</b>', styles['TableHeader']), 
         Paragraph('<b>Target State</b>', styles['TableHeader']),
         Paragraph('<b>Priority</b>', styles['TableHeader'])],
        [Paragraph('Kubernetes Deployment', styles['TableCell']), 
         Paragraph('Brief mentions, Docker references', styles['TableCell']),
         Paragraph('Complete Helm charts, operators, security hardening', styles['TableCell']),
         Paragraph('CRITICAL', styles['TableCell'])],
        [Paragraph('Known Limitations', styles['TableCell']), 
         Paragraph('Scattered throughout spec', styles['TableCell']),
         Paragraph('Centralized register with severity classification', styles['TableCell']),
         Paragraph('HIGH', styles['TableCell'])],
        [Paragraph('Technical Debt Register', styles['TableCell']), 
         Paragraph('Listed as deliverable only', styles['TableCell']),
         Paragraph('Complete tracking template with workflow', styles['TableCell']),
         Paragraph('HIGH', styles['TableCell'])],
    ]
    
    scope_table = Table(scope_data, colWidths=[45*mm, 45*mm, 55*mm, 25*mm])
    scope_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), HEADER_FILL),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'NotoSerifSC-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
        ('TOPPADDING', (0, 0), (-1, 0), 8),
        ('BACKGROUND', (0, 1), (-1, -1), CARD_BG),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 1), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 6),
    ]))
    
    elements.append(Spacer(1, 5*mm))
    elements.append(scope_table)
    elements.append(Spacer(1, 5*mm))
    
    objectives_text = """
    <b>Strategic Objectives:</b> These expansions serve multiple strategic purposes within the CyberSOC development 
    lifecycle. First, they provide implementation teams with actionable technical specifications rather than 
    conceptual guidance alone. Second, they establish governance frameworks for tracking platform maturity and 
    debt remediation over time. Third, they ensure consistency across distributed development teams by providing 
    standardized templates and formats. Fourth, they support compliance requirements by documenting limitations 
    transparently and establishing auditable tracking mechanisms for technical debt.
    """
    elements.append(Paragraph(objectives_text.strip(), styles['CustomBody']))
    
    audience_text = """
    <b>Intended Audience:</b> This document targets platform architects responsible for deployment topology decisions, 
    DevOps engineers implementing CI/CD pipelines, security teams validating production hardening, project managers 
    tracking technical debt, and compliance officers requiring formal limitation documentation. Each section provides 
    sufficient depth for its primary audience while maintaining cross-references for holistic understanding.
    """
    elements.append(Paragraph(audience_text.strip(), styles['CustomBody']))
    
    elements.append(PageBreak())
    return elements


def create_kubernetes_section():
    """Create comprehensive Kubernetes deployment section."""
    elements = []
    
    elements.append(Paragraph("2. Kubernetes Deployment", styles['SectionHeading']))
    
    intro_text = """
    The CyberSOC Platform requires a robust Kubernetes-native deployment strategy that addresses the unique challenges 
    of security operations workloads. Unlike traditional applications, SOC platforms must handle high-volume event 
    ingestion, real-time correlation processing, low-latency alert delivery, and stringent data isolation requirements. 
    This section establishes the complete Kubernetes deployment architecture including Helm chart structure, custom 
    operators, security hardening specifications, and operational workflows.
    """
    elements.append(Paragraph(intro_text.strip(), styles['CustomBody']))
    
    # 2.1 Architecture Overview
    elements.append(Paragraph("2.1 Architecture Overview", styles['SubsectionHeading']))
    
    arch_text = """
    The CyberSOC Kubernetes deployment follows a microservices architecture pattern optimized for security operations 
    workloads. The architecture separates concerns across multiple layers: data ingestion, stream processing, analytics, 
    storage, presentation, and platform services. Each layer scales independently based on workload characteristics, 
    enabling cost-effective operation while maintaining performance SLAs.
    """
    elements.append(Paragraph(arch_text.strip(), styles['CustomBody']))
    
    # Architecture components table
    arch_data = [
        [Paragraph('<b>Layer</b>', styles['TableHeader']), 
         Paragraph('<b>Components</b>', styles['TableHeader']), 
         Paragraph('<b>Replica Strategy</b>', styles['TableHeader']),
         Paragraph('<b>Resource Class</b>', styles['TableHeader'])],
        [Paragraph('Ingestion', styles['TableCell']), 
         Paragraph('Collector Gateway, Parser Pool, Normalizer', styles['TableCell']),
         Paragraph('HPA (2-50 pods)', styles['TableCell']),
         Paragraph('Compute-optimized', styles['TableCell'])],
        [Paragraph('Streaming', styles['TableCell']), 
         Paragraph('Kafka Cluster, Stream Processor', styles['TableCell']),
         Paragraph('StatefulSet (3+ nodes)', styles['TableCell']),
         Paragraph('Memory-optimized', styles['TableCell'])],
        [Paragraph('Analytics', styles['TableCell']), 
         Paragraph('Correlation Engine, ML Pipeline, UEBA', styles['TableCell']),
         Paragraph('HPA (3-100 pods)', styles['TableCell']),
         Paragraph('GPU-capable', styles['TableCell'])],
        [Paragraph('Storage', styles['TableCell']), 
         Paragraph('Elasticsearch, PostgreSQL, Redis, Graph DB', styles['TableCell']),
         Paragraph('StatefulSet (varies)', styles['TableCell']),
         Paragraph('Storage-optimized', styles['TableCell'])],
        [Paragraph('API Layer', styles['TableCell']), 
         Paragraph('REST Gateway, WebSocket, GraphQL', styles['TableCell']),
         Paragraph('HPA (3-30 pods)', styles['TableCell']),
         Paragraph('Balanced', styles['TableCell'])],
        [Paragraph('Presentation', styles['TableCell']), 
         Paragraph('Frontend SPA, Report Generator', styles['TableCell']),
         Paragraph('Deployment (2-10 pods)', styles['TableCell']),
         Paragraph('Standard', styles['TableCell'])],
        [Paragraph('Platform', styles['TableCell']), 
         Paragraph('Auth Service, Config Manager, Scheduler', styles['TableCell']),
         Paragraph('Deployment (fixed)', styles['TableCell']),
         Paragraph('Standard', styles['TableCell'])],
    ]
    
    arch_table = Table(arch_data, colWidths=[30*mm, 65*mm, 40*mm, 35*mm])
    arch_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), HEADER_FILL),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 6),
        ('TOPPADDING', (0, 0), (-1, 0), 6),
        ('BACKGROUND', (0, 1), (-1, -1), CARD_BG),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 4),
        ('RIGHTPADDING', (0, 0), (-1, -1), 4),
        ('TOPPADDING', (0, 1), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 4),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [CARD_BG, TABLE_STRIPE]),
    ]))
    
    elements.append(Spacer(1, 3*mm))
    elements.append(arch_table)
    elements.append(Spacer(1, 5*mm))
    
    namespace_text = """
    <b>Namespace Strategy:</b> The deployment utilizes a multi-namespace approach to enforce isolation boundaries and 
    simplify access control. The primary namespaces include: cybersoc-system (platform services), cybersoc-ingest 
    (data collection), cybersoc-analytics (processing engines), cybersoc-storage (databases), cybersoc-api 
    (external interfaces), and cybersoc-ai (ML/AI components). For MSSP deployments, each tenant receives an 
    isolated namespace following the pattern cybersoc-tenant-{id}. Network policies restrict inter-namespace 
    communication to explicitly allowed paths, preventing lateral movement even if a single component is compromised.
    """
    elements.append(Paragraph(namespace_text.strip(), styles['CustomBody']))
    
    # 2.2 Helm Chart Structure
    elements.append(Paragraph("2.2 Helm Chart Structure", styles['SubsectionHeading']))
    
    helm_intro = """
    The CyberSOC platform uses a parent-child Helm chart structure that balances configurability with operational 
    simplicity. The root chart orchestrates all subcharts while allowing independent versioning and deployment of 
    individual components. This structure supports multiple deployment scenarios from single-cluster development 
    environments to multi-region production deployments with complex affinity rules.
    """
    elements.append(Paragraph(helm_intro.strip(), styles['CustomBody']))
    
    # Helm chart directory structure
    helm_structure = """
    <b>Chart Directory Structure:</b><br/><br/>
    <font face="NotoSansSC" size="8">
    cybersoc/<br/>
    &nbsp;&nbsp;├── Chart.yaml&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<i># Parent chart metadata</i><br/>
    &nbsp;&nbsp;├── values.yaml&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<i># Default configuration</i><br/>
    &nbsp;&nbsp;├── values-prod.yaml<i># Production overrides</i><br/>
    &nbsp;&nbsp;├── charts/<br/>
    &nbsp;&nbsp;│&nbsp;&nbsp;├── ingress/&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<i># NGINX/Envoy ingress controller</i><br/>
    &nbsp;&nbsp;│&nbsp;&nbsp;├── collector/&nbsp;&nbsp;&nbsp;&nbsp;<i># Log/event collectors</i><br/>
    &nbsp;&nbsp;│&nbsp;&nbsp;├── kafka/&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<i># Apache Kafka cluster</i><br/>
    &nbsp;&nbsp;│&nbsp;&nbsp;├── elasticsearch/<i># Search engine cluster</i><br/>
    &nbsp;&nbsp;│&nbsp;&nbsp;├── postgresql/&nbsp;&nbsp;&nbsp;<i># Primary database</i><br/>
    &nbsp;&nbsp;│&nbsp;&nbsp;├── redis/&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<i># Cache layer</i><br/>
    &nbsp;&nbsp;│&nbsp;&nbsp;├── api-gateway/&nbsp;&nbsp;<i># REST/WebSocket gateway</i><br/>
    &nbsp;&nbsp;│&nbsp;&nbsp;├── correlation/&nbsp;&nbsp;<i># SIEM correlation engine</i><br/>
    &nbsp;&nbsp;│&nbsp;&nbsp;├── soar/&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<i># SOAR automation</i><br/>
    &nbsp;&nbsp;│&nbsp;&nbsp;├── ui/&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<i># Frontend application</i><br/>
    &nbsp;&nbsp;│&nbsp;&nbsp;├── ai-copilot/&nbsp;&nbsp;&nbsp;<i># AI/LLM services</i><br/>
    &nbsp;&nbsp;│&nbsp;&nbsp;└── monitoring/&nbsp;&nbsp;<i># Prometheus/Grafana stack</i><br/>
    &nbsp;&nbsp;├── templates/<br/>
    &nbsp;&nbsp;│&nbsp;&nbsp;├── _helpers.tpl<br/>
    &nbsp;&nbsp;│&nbsp;&nbsp;├── namespace.yaml<br/>
    &nbsp;&nbsp;│&nbsp;&nbsp;├── network-policies.yaml<br/>
    &nbsp;&nbsp;│&nbsp;&nbsp;└── rbac.yaml<br/>
    &nbsp;&nbsp;└── docs/<br/>
    &nbsp;&nbsp;&nbsp;&nbsp;└── values-schema.yaml<br/>
    </font>
    """
    elements.append(Paragraph(helm_structure, styles['CodeText']))
    
    # Values.yaml key parameters
    values_text = """
    <b>Critical Configuration Parameters:</b> The parent values.yaml defines global configuration that propagates 
    to all subcharts. Key parameter groups include: image registry credentials (pull secrets, private repo URLs), 
    resource quotas (default limits, max limits, resource classes), feature flags (module enable/disable toggles), 
    external service connections (database URLs, API keys via Kubernetes secrets), scaling thresholds (HPA min/max, 
    target CPU/memory utilization), and tenant configuration (MSSP mode, isolation level, per-tenant limits). 
    Environment-specific overlays modify these defaults without altering the base charts.
    """
    elements.append(Paragraph(values_text.strip(), styles['CustomBody']))
    
    # Values reference table
    values_data = [
        [Paragraph('<b>Parameter</b>', styles['TableHeader']), 
         Paragraph('<b>Type</b>', styles['TableHeader']), 
         Paragraph('<b>Default</b>', styles['TableHeader']),
         Paragraph('<b>Description</b>', styles['TableHeader'])],
        [Paragraph('global.imageRegistry', styles['TableCell']), 
         Paragraph('string', styles['TableCell']),
         Paragraph('ghcr.io/cybersoc', styles['TableCell']),
         Paragraph('Container image registry URL', styles['TableCell'])],
        [Paragraph('global.storageClass', styles['TableCell']), 
         Paragraph('string', styles['TableCell']),
         Paragraph('premium-ssd', styles['TableCell']),
         Paragraph('Kubernetes StorageClass for PVCs', styles['TableCell'])],
        [Paragraph('ingress.enabled', styles['TableCell']), 
         Paragraph('bool', styles['TableCell']),
         Paragraph('true', styles['TableCell']),
         Paragraph('Enable ingress controller deployment', styles['TableCell'])],
        [Paragraph('kafka.replicaCount', styles['TableCell']), 
         Paragraph('int', styles['TableCell']),
         Paragraph('3', styles['TableCell']),
         Paragraph('Kafka broker replica count', styles['TableCell'])],
        [Paragraph('elasticsearch.clusterSize', styles['TableCell']), 
         Paragraph('int', styles['TableCell']),
         Paragraph('3', styles['TableCell']),
         Paragraph('Elasticsearch data nodes', styles['TableCell'])],
        [Paragraph('mssp.enabled', styles['TableCell']), 
         Paragraph('bool', styles['TableCell']),
         Paragraph('false', styles['TableCell']),
         Paragraph('Enable MSSP multi-tenant mode', styles['TableCell'])],
        [Paragraph('aiCopilot.enabled', styles['TableCell']), 
         Paragraph('bool', styles['TableCell']),
         Paragraph('true', styles['TableCell']),
         Paragraph('Enable AI Copilot services', styles['TableCell'])],
        [Paragraph('monitoring.prometheus.enabled', styles['TableCell']), 
         Paragraph('bool', styles['TableCell']),
         Paragraph('true', styles['TableCell']),
         Paragraph('Deploy Prometheus stack', styles['TableCell'])],
    ]
    
    values_table = Table(values_data, colWidths=[50*mm, 25*mm, 40*mm, 55*mm])
    values_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), HEADER_FILL),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 6),
        ('TOPPADDING', (0, 0), (-1, 0), 6),
        ('BACKGROUND', (0, 1), (-1, -1), CARD_BG),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 4),
        ('RIGHTPADDING', (0, 0), (-1, -1), 4),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [CARD_BG, TABLE_STRIPE]),
    ]))
    
    elements.append(Spacer(1, 3*mm))
    elements.append(values_table)
    
    # 2.3 Custom Operators
    elements.append(Paragraph("2.3 Custom Kubernetes Operators", styles['SubsectionHeading']))
    
    operator_intro = """
    CyberSOC deploys custom Kubernetes operators to manage platform-specific resources that exceed the capabilities 
    of standard Kubernetes primitives. These operators implement the control pattern for security operations, handling 
    complex lifecycle management, automated healing, and domain-specific orchestration that generic controllers cannot 
    provide. Each operator follows the Operator SDK framework and implements reconciliation logic appropriate to its 
    managed resource type.
    """
    elements.append(Paragraph(operator_intro.strip(), styles['CustomBody']))
    
    # Operators table
    operators_data = [
        [Paragraph('<b>Operator Name</b>', styles['TableHeader']), 
         Paragraph('<b>CRD</b>', styles['TableHeader']), 
         Paragraph('<b>Responsibility</b>', styles['TableHeader']),
         Paragraph('<b>Reconciliation Cycle</b>', styles['TableHeader'])],
        [Paragraph('DetectionRule', styles['TableCell']), 
         Paragraph('DetectionRule', styles['TableCell']),
         Paragraph('Manages Sigma/YARA rule lifecycle: validation, deployment, versioning, metrics collection', styles['TableCell']),
         Paragraph('30s (on change)', styles['TableCell'])],
        [Paragraph('Playbook', styles['TableCell']), 
         Paragraph('SOARPlaybook', styles['TableCell']),
         Paragraph('Orchestrates playbook execution: trigger handling, step management, state persistence', styles['TableCell']),
         Paragraph('10s (active)', styles['TableCell'])],
        [Paragraph('Tenant', styles['TableCell']), 
         Paragraph('MSSTenant', styles['TableCell']),
         Paragraph('Provisions tenant namespaces, RBAC, resource quotas, network isolation', styles['TableCell']),
         Paragraph('60s (on change)', styles['TableCell'])],
        [Paragraph('CorrelationPipeline', styles['TableCell']), 
         Paragraph('CorrelationPipeline', styles['TableCell']),
         Paragraph('Manages streaming correlation topologies, rule distribution, scaling events', styles['TableCell']),
         Paragraph('15s (on change)', styles['TableCell'])],
        [Paragraph('ThreatIntelFeed', styles['TableCell']), 
         Paragraph('TIPLFeed', styles['TableCell']),
         Paragraph('Synchronizes threat intelligence feeds: TAXII polling, IOC enrichment, expiration', styles['TableCell']),
         Paragraph('300s (scheduled)', styles['TableCell'])],
        [Paragraph('BackupJob', styles['TableCell']), 
         Paragraph('BackupSchedule', styles['TableCell']),
         Paragraph('Manages backup workflows: snapshot creation, retention enforcement, restore verification', styles['TableCell']),
         Paragraph('Per schedule', styles['TableCell'])],
        [Paragraph('ComplianceScan', styles['TableCell']), 
         Paragraph('ComplianceAssessment', styles['TableCell']),
         Paragraph('Executes compliance checks: control mapping, evidence collection, gap reporting', styles['TableCell']),
         Paragraph('Per schedule', styles['TableCell'])],
    ]
    
    operators_table = Table(operators_data, colWidths=[35*mm, 35*mm, 70*mm, 30*mm])
    operators_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), HEADER_FILL),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 6),
        ('TOPPADDING', (0, 0), (-1, 0), 6),
        ('BACKGROUND', (0, 1), (-1, -1), CARD_BG),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 4),
        ('RIGHTPADDING', (0, 0), (-1, -1), 4),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [CARD_BG, TABLE_STRIPE]),
    ]))
    
    elements.append(Spacer(1, 3*mm))
    elements.append(operators_table)
    elements.append(Spacer(1, 5*mm))
    
    operator_impl = """
    <b>Implementation Standards:</b> All operators must implement standardized status conditions reflecting the 
    reconciliation state: Available (resource ready for use), Degraded (partial functionality), Error (reconciliation 
    failed), and Progressing (undergoing changes). Each operator emits Kubernetes events for significant state 
    transitions and exposes Prometheus metrics for observability. Operators must handle graceful shutdown, support 
    leader election for high-availability deployments, and implement proper finalization logic to prevent resource 
    leakage on deletion.
    """
    elements.append(Paragraph(operator_impl.strip(), styles['CustomBody']))
    
    # 2.4 Deployment Workflows
    elements.append(Paragraph("2.4 Deployment Workflows and CI/CD Integration", styles['SubsectionHeading']))
    
    cicd_text = """
    The Kubernetes deployment integrates with GitOps methodologies using ArgoCD or Flux CD as the continuous delivery 
    agent. All declarative configurations reside in version-controlled repositories with approval gates for 
    production changes. The CI pipeline builds container images, runs security scanning, executes integration tests, 
    and pushes validated artifacts to the registry. The CD pipeline synchronizes desired state from Git to clusters, 
    handling progressive rollouts and automatic rollback on health check failures.
    """
    elements.append(Paragraph(cicd_text.strip(), styles['CustomBody']))
    
    # Deployment stages
    deploy_stages = """
    <b>Deployment Pipeline Stages:</b><br/><br/>
    <b>1. Source Stage:</b> Pull Helm charts and configuration from Git repository. Validate chart structure, 
    lint templates, check values schema conformance.<br/><br/>
    <b>2. Build Stage:</b> Compile containers using multi-stage Dockerfiles. Embed build metadata (commit SHA, 
    timestamp, builder identity). Sign images with cosign or equivalent.<br/><br/>
    <b>3. Security Scan Stage:</b> Execute Trivy for vulnerability detection. Run SAST with Semgrep or similar. 
    Check SBOM against known vulnerability databases. Fail on CRITICAL/HIGH CVEs.<br/><br/>
    <b>4. Test Stage:</b> Deploy to ephemeral kind cluster. Run integration tests against real dependencies. 
    Execute load tests for ingestion components. Validate detection rule parsing.<br/><br/>
    <b>5. Promote Stage:</b> Push validated images to release registry. Update Helm chart version in manifest repo. 
    Trigger ArgoCD sync for target environment.<br/><br/>
    <b>6. Monitor Stage:</b> Observe rollout progress. Verify health endpoints. Check error rates against baseline. 
    Auto-rollback if degradation detected.
    """
    elements.append(Paragraph(deploy_stages, styles['CustomBody']))
    
    # 2.5 Security Hardening
    elements.append(Paragraph("2.5 Kubernetes Security Hardening", styles['SubsectionHeading']))
    
    security_intro = """
    Security hardening for the CyberSOC Kubernetes deployment follows defense-in-depth principles, addressing 
    host-level, container-level, network-level, and application-level attack surfaces. Given that the platform 
    processes sensitive security telemetry and may contain access credentials for integrated systems, the 
    hardening posture exceeds typical enterprise standards. All configurations align with CIS Kubernetes Benchmark 
    and NSA Kubernetes Hardening Guidance where applicable.
    """
    elements.append(Paragraph(security_intro.strip(), styles['CustomBody']))
    
    # Pod security
    pod_security = """
    <b>Pod Security Standards:</b> All pods run with restricted Pod Security Standards enforcing: read-only root 
    filesystem (except where write cache required), non-root user execution (UID > 10000), drop ALL capabilities 
    adding only explicit needs, seccomp profiles set to RuntimeDefault or strict, and no new privilege escalation. 
    Resource limits are mandatory for both requests and limits to prevent Noisy Neighbor attacks. Containers 
    processing untrusted input (parsers, normalizers) run with additional sandboxing using gVisor or Kata Containers.
    """
    elements.append(Paragraph(pod_security.strip(), styles['CustomBody']))
    
    # Network policies
    network_policies = """
    <b>Network Policy Framework:</b> Default-deny network policies apply to all namespaces. Explicit allow rules 
    permit required communication paths: ingress controllers to API pods, collector pods to Kafka brokers, 
    correlation engines to Elasticsearch, frontend to API gateway. East-west traffic between analytics components 
    requires mTLS encryption via service mesh (Istio or Linkerd). Egress filtering restricts outbound connections 
    to approved destinations (package repositories, threat intel feeds, notification services). Network policy 
    auditing runs continuously to detect policy drift.
    """
    elements.append(Paragraph(network_policies.strip(), styles['CustomBody']))
    
    # Secrets management
    secrets_text = """
    <b>Secrets Management:</b> Kubernetes secrets store only encrypted payloads. External Secrets Operator 
    synchronizes from HashiCorp Vault or AWS Secrets Manager, enabling rotation without pod restarts. Sealed 
    Secrets or Mozilla Sops handle Git-committed secrets for bootstrap scenarios. Audit logging captures all 
    secret access with 90-day retention. Automatic secret rotation configured for: database credentials (30 days), 
    API keys (90 days), TLS certificates (365 days), and encryption keys (per policy).
    """
    elements.append(Paragraph(secrets_text.strip(), styles['CustomBody']))
    
    # Security hardening checklist
    security_data = [
        [Paragraph('<b>Category</b>', styles['TableHeader']), 
         Paragraph('<b>Control</b>', styles['TableHeader']), 
         Paragraph('<b>Implementation</b>', styles['TableHeader']),
         Paragraph('<b>Validation</b>', styles['TableHeader'])],
        [Paragraph('Host', styles['TableCell']), 
         Paragraph('Kernel hardening', styles['TableCell']),
         Paragraph('CIS-compliant AMI/node config', styles['TableCell']),
         Paragraph('kube-bench scans', styles['TableCell'])],
        [Paragraph('RBAC', styles['TableCell']), 
         Paragraph('Least privilege', styles['TableCell']),
         Paragraph('Role-based access, no cluster-admin', styles['TableCell']),
         Paragraph('rbac-review audits', styles['TableCell'])],
        [Paragraph('Network', styles['TableCell']), 
         Paragraph('Segmentation', styles['TableCell']),
         Paragraph('Default-deny + explicit allows', styles['TableCell']),
         Paragraph('NetworkPolicy coverage', styles['TableCell'])],
        [Paragraph('Secrets', styles['TableCell']), 
         Paragraph('Encryption at rest', styles['TableCell']),
         Paragraph('External Secrets + envelope encryption', styles['TableCell']),
         Paragraph('Secret rotation tests', styles['TableCell'])],
        [Paragraph('Supply Chain', styles['TableCell']), 
         Paragraph('Image integrity', styles['TableCell']),
         Paragraph('Signed images, admission controller', styles['TableCell']),
         Paragraph('Cosign verification', styles['TableCell'])],
        [Paragraph('Runtime', styles['TableCell']), 
         Paragraph('Threat detection', styles['TableCell']),
         Paragraph('Falco/Falcosidekick alerts', styles['TableCell']),
         Paragraph('Alert response testing', styles['TableCell'])],
    ]
    
    security_table = Table(security_data, colWidths=[30*mm, 40*mm, 55*mm, 45*mm])
    security_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), HEADER_FILL),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 6),
        ('TOPPADDING', (0, 0), (-1, 0), 6),
        ('BACKGROUND', (0, 1), (-1, -1), CARD_BG),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 4),
        ('RIGHTPADDING', (0, 0), (-1, -1), 4),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [CARD_BG, TABLE_STRIPE]),
    ]))
    
    elements.append(Spacer(1, 3*mm))
    elements.append(security_table)
    
    elements.append(PageBreak())
    return elements


def create_limitations_section():
    """Create known limitations register section."""
    elements = []
    
    elements.append(Paragraph("3. Known Limitations Register", styles['SectionHeading']))
    
    intro_text = """
    This section consolidates all known limitations identified during the CyberSOC Platform specification audit into 
    a formal register. Each limitation is classified by category, assessed for severity impact, assigned ownership 
    for resolution tracking, and linked to mitigation strategies. The register serves as the authoritative source 
    of truth for platform capabilities boundaries, supporting accurate customer communication, sales engineering 
    qualification, and development prioritization decisions.
    """
    elements.append(Paragraph(intro_text.strip(), styles['CustomBody']))
    
    # 3.1 Categories
    elements.append(Paragraph("3.1 Limitation Classification Framework", styles['SubsectionHeading']))
    
    cat_text = """
    Limitations are organized into six categories reflecting different aspects of platform capability constraints. 
    This classification enables targeted mitigation planning and helps stakeholders quickly identify limitations 
    relevant to their concerns. Each category has a defined severity scale and standard remediation approach.
    """
    elements.append(Paragraph(cat_text.strip(), styles['CustomBody']))
    
    # Category definitions
    cat_data = [
        [Paragraph('<b>Category</b>', styles['TableHeader']), 
         Paragraph('<b>Description</b>', styles['TableHeader']), 
         Paragraph('<b>Examples</b>', styles['TableHeader']),
         Paragraph('<b>Typical Mitigation</b>', styles['TableHeader'])],
        [Paragraph('Functional', styles['TableCell']), 
         Paragraph('Features not yet implemented or explicitly out of scope', styles['TableCell']),
         Paragraph('Native EDR, email security actioning', styles['TableCell']),
         Paragraph('Integration with third-party, roadmap commitment', styles['TableCell'])],
        [Paragraph('Performance', styles['TableCell']), 
         Paragraph('Known scalability boundaries or latency constraints', styles['TableCell']),
         Paragraph('EPS limits, query timeouts at scale', styles['TableCell']),
         Paragraph('Architecture optimization, hardware sizing guide', styles['TableCell'])],
        [Paragraph('Integration', styles['TableCell']), 
         Paragraph('Unsupported connectors or protocols', styles['TableCell']),
         Paragraph('Legacy SIEM APIs, proprietary formats', styles['TableCell']),
         Paragraph('Custom connector development, middleware', styles['TableCell'])],
        [Paragraph('Environmental', styles['TableCell']), 
         Paragraph('Deployment constraints or prerequisites', styles['TableCell']),
         Paragraph('Air-gapped requirements, OS support', styles['TableCell']),
         Paragraph('Alternative deployment patterns, documentation', styles['TableCell'])],
        [Paragraph('Compliance', styles['TableCell']), 
         Paragraph('Certification gaps or regulatory limitations', styles['TableCell']),
         Paragraph('FedRAMP, specific regional requirements', styles['TableCell']),
         Paragraph('Certification roadmap, compensating controls', styles['TableCell'])],
        [Paragraph('Operational', styles['TableCell']), 
         Paragraph('Runbook gaps or procedure limitations', styles['TableCell']),
         Paragraph('Disaster recovery RTO for petabyte data', styles['TableCell']),
         Paragraph('Enhanced procedures, tooling investment', styles['TableCell'])],
    ]
    
    cat_table = Table(cat_data, colWidths=[28*mm, 48*mm, 48*mm, 56*mm])
    cat_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), HEADER_FILL),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 6),
        ('TOPPADDING', (0, 0), (-1, 0), 6),
        ('BACKGROUND', (0, 1), (-1, -1), CARD_BG),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 4),
        ('RIGHTPADDING', (0, 0), (-1, -1), 4),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [CARD_BG, TABLE_STRIPE]),
    ]))
    
    elements.append(Spacer(1, 3*mm))
    elements.append(cat_table)
    
    # 3.2 Complete Register
    elements.append(Paragraph("3.2 Complete Limitations Register", styles['SubsectionHeading']))
    
    register_intro = """
    The following table presents all known limitations extracted from the specification document, supplemented with 
    structured metadata for tracking and resolution management. Severity levels follow the standard classification: 
    Critical (blocks production deployment), Major (significant functional gap), Moderate (workaround available), 
    Minor (cosmetic or edge-case impact). Each entry includes the original specification reference for traceability.
    """
    elements.append(Paragraph(register_intro.strip(), styles['CustomBody']))
    
    # Comprehensive limitations table
    lim_data = [
        [Paragraph('<b>ID</b>', styles['TableHeader']), 
         Paragraph('<b>Limitation</b>', styles['TableHeader']), 
         Paragraph('<b>Category</b>', styles['TableHeader']),
         Paragraph('<b>Severity</b>', styles['TableHeader']),
         Paragraph('<b>Status</b>', styles['TableHeader'])],
        [Paragraph('LIM-001', styles['TableCell']), 
         Paragraph('No native EDR capabilities; relies on third-party integrations', styles['TableCell']),
         Paragraph('Functional', styles['TableCell']),
         Paragraph('Major', styles['TableCell']),
         Paragraph('Accepted', styles['TableCell'])],
        [Paragraph('LIM-002', styles['TableCell']), 
         Paragraph('Cannot assume Internet connectivity for updates/intelligence', styles['TableCell']),
         Paragraph('Environmental', styles['TableCell']),
         Paragraph('Major', styles['TableCell']),
         Paragraph('Mitigated', styles['TableCell'])],
        [Paragraph('LIM-003', styles['TableCell']), 
         Paragraph('OT/ICS module is optional; passive monitoring only', styles['TableCell']),
         Paragraph('Functional', styles['TableCell']),
         Paragraph('Moderate', styles['TableCell']),
         Paragraph('Accepted', styles['TableCell'])],
        [Paragraph('LIM-004', styles['TableCell']), 
         Paragraph('No automatic disruptive actions against industrial systems', styles['TableCell']),
         Paragraph('Functional', styles['TableCell']),
         Paragraph('By Design', styles['TableCell']),
         Paragraph('Accepted', styles['TableCell'])],
        [Paragraph('LIM-005', styles['TableCell']), 
         Paragraph('Active scanning requires explicit authorization', styles['TableCell']),
         Paragraph('Operational', styles['TableCell']),
         Paragraph('Moderate', styles['TableCell']),
         Paragraph('Documented', styles['TableCell'])],
        [Paragraph('LIM-006', styles['TableCell']), 
         Paragraph('Integration claims require actual API testing', styles['TableCell']),
         Paragraph('Integration', styles['TableCell']),
         Paragraph('Critical', styles['TableCell']),
         Paragraph('Process Defined', styles['TableCell'])],
        [Paragraph('LIM-007', styles['TableCell']), 
         Paragraph('AI-generated detections need validation before production', styles['TableCell']),
         Paragraph('Functional', styles['TableCell']),
         Paragraph('Major', styles['TableCell']),
         Paragraph('Mitigated', styles['TableCell'])],
        [Paragraph('LIM-008', styles['TableCell']), 
         Paragraph('Rare behavior does not equal malicious behavior (UEBA)', styles['TableCell']),
         Paragraph('Functional', styles['TableCell']),
         Paragraph('By Design', styles['TableCell']),
         Paragraph('Accepted', styles['TableCell'])],
        [Paragraph('LIM-009', styles['TableCell']), 
         Paragraph('Compliance mappings do not auto-grant certification', styles['TableCell']),
         Paragraph('Compliance', styles['TableCell']),
         Paragraph('Critical', styles['TableCell']),
         Paragraph('Documented', styles['TableCell'])],
        [Paragraph('LIM-010', styles['TableCell']), 
         Paragraph('Dashboard is not a complete feature indicator', styles['TableCell']),
         Paragraph('Operational', styles['TableCell']),
         Paragraph('Minor', styles['TableCell']),
         Paragraph('Documented', styles['TableCell'])],
        [Paragraph('LIM-011', styles['TableCell']), 
         Paragraph('Mobile high-risk actions require strong auth', styles['TableCell']),
         Paragraph('Functional', styles['TableCell']),
         Paragraph('Moderate', styles['TableCell']),
         Paragraph('Accepted', styles['TableCell'])],
        [Paragraph('LIM-012', styles['TableCell']), 
         Paragraph('Algerian localization requires ongoing regulatory updates', styles['TableCell']),
         Paragraph('Compliance', styles['TableCell']),
         Paragraph('Moderate', styles['TableCell']),
         Paragraph('Process Defined', styles['TableCell'])],
        [Paragraph('LIM-013', styles['TableCell']), 
         Paragraph('Plugin sandbox requires controlled environment', styles['TableCell']),
         Paragraph('Environmental', styles['TableCell']),
         Paragraph('Major', styles['TableCell']),
         Paragraph('In Progress', styles['TableCell'])],
        [Paragraph('LIM-014', styles['TableCell']), 
         Paragraph('Chaos engineering tests require careful scheduling', styles['TableCell']),
         Paragraph('Operational', styles['TableCell']),
         Paragraph('Moderate', styles['TableCell']),
         Paragraph('Documented', styles['TableCell'])],
        [Paragraph('LIM-015', styles['TableCell']), 
         Paragraph('Purple team simulations must be authorized', styles['TableCell']),
         Paragraph('Operational', styles['TableCell']),
         Paragraph('By Design', styles['TableCell']),
         Paragraph('Accepted', styles['TableCell'])],
    ]
    
    lim_table = Table(lim_data, colWidths=[22*mm, 75*mm, 28*mm, 25*mm, 30*mm])
    lim_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), HEADER_FILL),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTSIZE', (0, 0), (-1, -1), 7.5),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 5),
        ('TOPPADDING', (0, 0), (-1, 0), 5),
        ('BACKGROUND', (0, 1), (-1, -1), CARD_BG),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 3),
        ('RIGHTPADDING', (0, 0), (-1, -1), 3),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [CARD_BG, TABLE_STRIPE]),
    ]))
    
    elements.append(Spacer(1, 3*mm))
    elements.append(lim_table)
    elements.append(Spacer(1, 5*mm))
    
    # 3.3 Mitigation Strategies
    elements.append(Paragraph("3.3 Mitigation Strategies by Severity Level", styles['SubsectionHeading']))
    
    mit_text = """
    Each severity level triggers a standardized response protocol ensuring consistent handling across the 
    organization. Critical limitations block production deployments until mitigated or formally accepted by 
    executive stakeholders with documented risk acknowledgment. Major limitations require active remediation 
    tracks with defined milestones and regular status reviews. Moderate limitations should have documented 
    workarounds and scheduled improvement items. Minor limitations enter the backlog for future consideration.
    """
    elements.append(Paragraph(mit_text.strip(), styles['CustomBody']))
    
    # Mitigation strategies
    strat_data = [
        [Paragraph('<b>Severity</b>', styles['TableHeader']), 
         Paragraph('<b>Response Required</b>', styles['TableHeader']), 
         Paragraph('<b>Timeline</b>', styles['TableHeader']),
         Paragraph('<b>Escalation Path</b>', styles['TableHeader'])],
        [Paragraph('Critical', styles['TableCell']), 
         Paragraph('Immediate mitigation or deployment hold; executive risk acceptance if accepted', styles['TableCell']),
         Paragraph('0-30 days', styles['TableCell']),
         Paragraph('CISO → CEO', styles['TableCell'])],
        [Paragraph('Major', styles['TableCell']), 
         Paragraph('Active sprint allocation; workaround documentation; customer communication', styles['TableCell']),
         Paragraph('30-90 days', styles['TableCell']),
         Paragraph('Engineering Lead → VP Engineering', styles['TableCell'])],
        [Paragraph('Moderate', styles['TableCell']), 
         Paragraph('Backlog prioritization; knowledge base article; training material update', styles['TableCell']),
         Paragraph('1-2 quarters', styles['TableCell']),
         Paragraph('Product Manager → Product Director', styles['TableCell'])],
        [Paragraph('Minor', styles['TableCell']), 
         Paragraph('Product backlog entry; address in natural roadmap cadence', styles['TableCell']),
         Paragraph('Next 2 releases', styles['TableCell']),
         Paragraph('Team Lead → Product Manager', styles['TableCell'])],
        [Paragraph('By Design', styles['TableCell']), 
         Paragraph('Document rationale; communicate proactively; no remediation planned', styles['TableCell']),
         Paragraph('N/A', styles['TableCell']),
         Paragraph('Architecture Review Board', styles['TableCell'])],
    ]
    
    strat_table = Table(strat_data, colWidths=[28*mm, 85*mm, 28*mm, 39*mm])
    strat_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), HEADER_FILL),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 6),
        ('TOPPADDING', (0, 0), (-1, 0), 6),
        ('BACKGROUND', (0, 1), (-1, -1), CARD_BG),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 4),
        ('RIGHTPADDING', (0, 0), (-1, -1), 4),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [CARD_BG, TABLE_STRIPE]),
    ]))
    
    elements.append(Spacer(1, 3*mm))
    elements.append(strat_table)
    
    elements.append(PageBreak())
    return elements


def create_technical_debt_section():
    """Create technical debt register section."""
    elements = []
    
    elements.append(Paragraph("4. Technical Debt Register", styles['SectionHeading']))
    
    intro_text = """
    Technical debt represents the implied cost of additional rework caused by choosing an easy or fast solution 
    now instead of using a better approach that would take longer. In the context of the CyberSOC Platform, technical 
    debt accumulates through architectural shortcuts, deferred refactoring, incomplete test coverage, documentation 
    gaps, and dependency management issues. This section establishes the formal register structure, categorization 
    taxonomy, and operational workflow for managing technical debt throughout the platform lifecycle.
    """
    elements.append(Paragraph(intro_text.strip(), styles['CustomBody']))
    
    # 4.1 Register Structure
    elements.append(Paragraph("4.1 Register Structure and Fields", styles['SubsectionHeading']))
    
    struct_text = """
    The technical debt register follows a standardized schema ensuring consistent capture, assessment, and tracking 
    of all debt items. Each entry contains mandatory fields for identification and assessment, plus optional fields 
    for contextual information. The register exists as both a machine-readable format (YAML/JSON) for automation 
    integration and human-readable format (this document) for review sessions.
    """
    elements.append(Paragraph(struct_text.strip(), styles['CustomBody']))
    
    # Field definitions
    field_data = [
        [Paragraph('<b>Field</b>', styles['TableHeader']), 
         Paragraph('<b>Type</b>', styles['TableHeader']), 
         Paragraph('<b>Required</b>', styles['TableHeader']),
         Paragraph('<b>Description</b>', styles['TableHeader'])],
        [Paragraph('debt_id', styles['TableCell']), 
         Paragraph('string', styles['TableCell']),
         Paragraph('Yes', styles['TableCell']),
         Paragraph('Unique identifier (format: DEBT-NNN)', styles['TableCell'])],
        [Paragraph('title', styles['TableCell']), 
         Paragraph('string', styles['TableCell']),
         Paragraph('Yes', styles['TableCell']),
         Paragraph('Concise description of the debt item', styles['TableCell'])],
        [Paragraph('category', styles['TableCell']), 
         Paragraph('enum', styles['TableCell']),
         Paragraph('Yes', styles['TableCell']),
         Paragraph('Classification from taxonomy (see 4.2)', styles['TableCell'])],
        [Paragraph('component', styles['TableCell']), 
         Paragraph('string', styles['TableCell']),
         Paragraph('Yes', styles['TableCell']),
         Paragraph('Affected module/subsystem', styles['TableCell'])],
        [Paragraph('description', styles['TableCell']), 
         Paragraph('text', styles['TableCell']),
         Paragraph('Yes', styles['TableCell']),
         Paragraph('Detailed explanation of debt origin and impact', styles['TableCell'])],
        [Paragraph('severity', styles['TableCell']), 
         Paragraph('enum', styles['TableCell']),
         Paragraph('Yes', styles['TableCell']),
         Paragraph('Critical/Major/Minor/Trivial', styles['TableCell'])],
        [Paragraph('interest_rate', styles['TableCell']), 
         Paragraph('enum', styles['TableCell']),
         Paragraph('Yes', styles['TableCell']),
         Paragraph('High/Medium/Low (velocity of debt growth)', styles['TableCell'])],
        [Paragraph('principal_effort', styles['TableCell']), 
         Paragraph('string', styles['TableCell']),
         Paragraph('Yes', styles['TableCell']),
         Paragraph('Estimated effort to fix (story points/days)', styles['TableCell'])],
        [Paragraph('accrued_date', styles['TableCell']), 
         Paragraph('date', styles['TableCell']),
         Paragraph('Yes', styles['TableCell']),
         Paragraph('When debt was introduced', styles['TableCell'])],
        [Paragraph('owner', styles['TableCell']), 
         Paragraph('string', styles['TableCell']),
         Paragraph('Yes', styles['TableCell']),
         Paragraph('Team/person responsible for remediation', styles['TableCell'])],
        [Paragraph('status', styles['TableCell']), 
         Paragraph('enum', styles['TableCell']),
         Paragraph('Yes', styles['TableCell']),
         Paragraph('Identified/Planned/In Progress/Resolved/Waived', styles['TableCell'])],
        [Paragraph('target_date', styles['TableCell']), 
         Paragraph('date', styles['TableCell']),
         Paragraph('No', styles['TableCell']),
         Paragraph('Planned remediation completion date', styles['TableCell'])],
        [Paragraph('blocking', styles['TableCell']), 
         Paragraph('string[]', styles['TableCell']),
         Paragraph('No', styles['TableCell']),
         Paragraph('List of debt_ids this item blocks', styles['TableCell'])],
        [Paragraph('blocked_by', styles['TableCell']), 
         Paragraph('string[]', styles['TableCell']),
         Paragraph('No', styles['TableCell']),
         Paragraph('List of debt_ids blocking this item', styles['TableCell'])],
        [Paragraph('risk_if_unresolved', styles['TableCell']), 
         Paragraph('text', styles['TableCell']),
         Paragraph('No', styles['TableCell']),
         Paragraph('Consequences of not addressing this debt', styles['TableCell'])],
    ]
    
    field_table = Table(field_data, colWidths=[32*mm, 22*mm, 20*mm, 106*mm])
    field_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), HEADER_FILL),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTSIZE', (0, 0), (-1, -1), 7.5),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 5),
        ('TOPPADDING', (0, 0), (-1, 0), 5),
        ('BACKGROUND', (0, 1), (-1, -1), CARD_BG),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 3),
        ('RIGHTPADDING', (0, 0), (-1, -1), 3),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [CARD_BG, TABLE_STRIPE]),
    ]))
    
    elements.append(Spacer(1, 3*mm))
    elements.append(field_table)
    
    # 4.2 Debt Categories
    elements.append(Paragraph("4.2 Technical Debt Taxonomy", styles['SubsectionHeading']))
    
    tax_text = """
    Technical debt in the CyberSOC Platform is categorized into eight distinct types, each with characteristic 
    causes, symptoms, and remediation approaches. This taxonomy enables consistent classification, supports trend 
    analysis over time, and guides appropriate remediation strategies. Items may span multiple categories when 
    applicable, with the primary category determining default handling procedures.
    """
    elements.append(Paragraph(tax_text.strip(), styles['CustomBody']))
    
    # Taxonomy table
    tax_data = [
        [Paragraph('<b>Category</b>', styles['TableHeader']), 
         Paragraph('<b>Definition</b>', styles['TableHeader']), 
         Paragraph('<b>Common Causes</b>', styles['TableHeader']),
         Paragraph('<b>Remediation Approach</b>', styles['TableHeader'])],
        [Paragraph('Code Debt', styles['TableCell']), 
         Paragraph('Suboptimal code quality, missing abstractions, duplicated logic', styles['TableCell']),
         Paragraph('Time pressure, skill gaps, evolving requirements', styles['TableCell']),
         Paragraph('Refactoring sprints, code review enforcement', styles['TableCell'])],
        [Paragraph('Design Debt', styles['TableCell']), 
         Paragraph('Architectural shortcuts, anti-patterns, coupling issues', styles['TableCell']),
         Paragraph('Premature optimization, unclear requirements', styles['TableCell']),
         Paragraph('Architecture review, incremental redesign', styles['TableCell'])],
        [Paragraph('Test Debt', styles['TableCell']), 
         Paragraph('Insufficient test coverage, flaky tests, missing assertions', styles['TableCell']),
         Paragraph('Testing deprioritized, complex setup requirements', styles['TableCell']),
         Paragraph('Test coverage targets, QA investment', styles['TableCell'])],
        [Paragraph('Documentation Debt', styles['TableCell']), 
         Paragraph('Outdated or missing docs, API reference gaps', styles['TableCell']),
         Paragraph('Documentation not valued, rapid iteration', styles['TableCell']),
         Paragraph('Docs-as-code, automated generation', styles['TableCell'])],
        [Paragraph('Infrastructure Debt', styles['TableCell']), 
         Paragraph('Configuration drift, outdated IaC, manual processes', styles['TableCell']),
         Paragraph('Quick fixes, lack of automation investment', styles['TableCell']),
         Paragraph('GitOps adoption, infrastructure refactoring', styles['TableCell'])],
        [Paragraph('Dependency Debt', styles['TableCell']), 
         Paragraph('Outdated libraries, vulnerable packages, license issues', styles['TableCell']),
         Paragraph('Update fear, compatibility concerns', styles['TableCell']),
         Paragraph('Automated updates, dependency dashboard', styles['TableCell'])],
        [Paragraph('Security Debt', styles['TableCell']), 
         Paragraph('Known vulnerabilities, weak crypto, permission issues', styles['TableCell']),
         Paragraph('Security shortcuts, legacy compatibility', styles['TableCell']),
         Paragraph('Security sprints, penetration testing', styles['TableCell'])],
        [Paragraph('Performance Debt', styles['TableCell']), 
         Paragraph('Scalability bottlenecks, inefficient algorithms, N+1 queries', styles['TableCell']),
         Paragraph('Prototype code in production, missing optimization', styles['TableCell']),
         Paragraph('Profiling, load testing, optimization sprints', styles['TableCell'])],
    ]
    
    tax_table = Table(tax_data, colWidths=[30*mm, 50*mm, 50*mm, 50*mm])
    tax_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), HEADER_FILL),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTSIZE', (0, 0), (-1, -1), 7.5),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 5),
        ('TOPPADDING', (0, 0), (-1, 0), 5),
        ('BACKGROUND', (0, 1), (-1, -1), CARD_BG),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 3),
        ('RIGHTPADDING', (0, 0), (-1, -1), 3),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [CARD_BG, TABLE_STRIPE]),
    ]))
    
    elements.append(Spacer(1, 3*mm))
    elements.append(tax_table)
    
    # 4.3 Tracking Workflow
    elements.append(Paragraph("4.3 Tracking and Remediation Workflow", styles['SubsectionHeading']))
    
    workflow_text = """
    The technical debt management process operates on a bi-weekly cadence aligned with sprint boundaries, ensuring 
    continuous visibility and steady remediation progress. The workflow defines clear states, transitions, and 
    responsibilities for each debt item from identification through resolution or formal waiver. Automation 
    supports the workflow through integration with issue trackers, CI/CD pipelines, and code review tools.
    """
    elements.append(Paragraph(workflow_text.strip(), styles['CustomBody']))
    
    # Workflow states
    states_text = """
    <b>Workflow States and Transitions:</b><br/><br/>
    <b>IDENTIFIED:</b> Debt discovered through code review, architecture analysis, or operational incident. 
    Requires initial assessment within one sprint. Transition: → PLANNED (accepted) or → WAIVED (rejected).<br/><br/>
    <b>PLANNED:</b> Debt accepted into backlog with owner assignment and effort estimation. Target date established. 
    Transition: → IN PROGRESS (sprint allocation) or → WAIVED (priority change).<br/><br/>
    <b>IN PROGRESS:</b> Active remediation underway. Code changes in progress, tests being written, or infrastructure 
    being updated. Transition: → RESOLVED (completion) or → PLANNED (rollback/pause).<br/><br/>
    <b>RESOLVED:</b> Remediation complete and verified. Tests passing, documentation updated, deployed to production. 
    Item retained in register for historical analysis.<br/><br/>
    <b>WAIVED:</b> Formal decision to not remediate. Requires business justification and risk acceptance. Annual 
    review mandatory to confirm waiver remains valid.
    """
    elements.append(Paragraph(states_text, styles['CustomBody']))
    
    # Sample entries
    elements.append(Paragraph("Sample Technical Debt Entries", styles['SubsectionHeading']))
    
    sample_data = [
        [Paragraph('<b>ID</b>', styles['TableHeader']), 
         Paragraph('<b>Title</b>', styles['TableHeader']), 
         Paragraph('<b>Category</b>', styles['TableHeader']),
         Paragraph('<b>Interest</b>', styles['TableHeader']),
         Paragraph('<b>Effort</b>', styles['TableHeader']),
         Paragraph('<b>Status</b>', styles['TableHeader'])],
        [Paragraph('DEBT-001', styles['TableCell']), 
         Paragraph('Monolithic parser component needs decomposition', styles['TableCell']),
         Paragraph('Design', styles['TableCell']),
         Paragraph('High', styles['TableCell']),
         Paragraph('21 days', styles['TableCell']),
         Paragraph('Planned', styles['TableCell'])],
        [Paragraph('DEBT-002', styles['TableCell']), 
         Paragraph('SIEM correlation engine lacks unit tests (< 30% coverage)', styles['TableCell']),
         Paragraph('Test', styles['TableCell']),
         Paragraph('Medium', styles['TableCell']),
         Paragraph('14 days', styles['TableCell']),
         Paragraph('In Progress', styles['TableCell'])],
        [Paragraph('DEBT-003', styles['TableCell']), 
         Paragraph('Legacy Elasticsearch client library (v6) incompatible with v8 features', styles['TableCell']),
         Paragraph('Dependency', styles['TableCell']),
         Paragraph('High', styles['TableCell']),
         Paragraph('10 days', styles['TableCell']),
         Paragraph('Planned', styles['TableCell'])],
        [Paragraph('DEBT-004', styles['TableCell']), 
         Paragraph('API documentation auto-generation not implemented', styles['TableCell']),
         Paragraph('Documentation', styles['TableCell']),
         Paragraph('Low', styles['TableCell']),
         Paragraph('7 days', styles['TableCell']),
         Paragraph('Identified', styles['TableCell'])],
        [Paragraph('DEBT-005', styles['TableCell']), 
         Paragraph('Helm values.yaml lacks schema validation', styles['TableCell']),
         Paragraph('Infrastructure', styles['TableCell']),
         Paragraph('Medium', styles['TableCell']),
         Paragraph('3 days', styles['TableCell']),
         Paragraph('In Progress', styles['TableCell'])],
        [Paragraph('DEBT-006', styles['TableCell']), 
         Paragraph('Hardcoded encryption keys in configuration examples', styles['TableCell']),
         Paragraph('Security', styles['TableCell']),
         Paragraph('Critical', styles['TableCell']),
         Paragraph('2 days', styles['TableCell']),
         Paragraph('In Progress', styles['TableCell'])],
    ]
    
    sample_table = Table(sample_data, colWidths=[22*mm, 75*mm, 28*mm, 22*mm, 20*mm, 23*mm])
    sample_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), HEADER_FILL),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTSIZE', (0, 0), (-1, -1), 7.5),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 5),
        ('TOPPADDING', (0, 0), (-1, 0), 5),
        ('BACKGROUND', (0, 1), (-1, -1), CARD_BG),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 3),
        ('RIGHTPADDING', (0, 0), (-1, -1), 3),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [CARD_BG, TABLE_STRIPE]),
    ]))
    
    elements.append(Spacer(1, 3*mm))
    elements.append(sample_table)
    
    elements.append(PageBreak())
    return elements


def create_roadmap_section():
    """Create implementation roadmap section."""
    elements = []
    
    elements.append(Paragraph("5. Implementation Roadmap", styles['SectionHeading']))
    
    intro_text = """
    This section outlines the recommended phased approach for addressing the expanded content areas. The roadmap 
    balances quick wins against foundational improvements, ensuring that immediate operational needs are met while 
    building toward long-term architectural goals. Timeline estimates assume a dedicated team of 3-5 engineers 
    with appropriate domain expertise.
    """
    elements.append(Paragraph(intro_text.strip(), styles['CustomBody']))
    
    # Phase table
    phase_data = [
        [Paragraph('<b>Phase</b>', styles['TableHeader']), 
         Paragraph('<b>Duration</b>', styles['TableHeader']), 
         Paragraph('<b>Deliverables</b>', styles['TableHeader']),
         Paragraph('<b>Success Criteria</b>', styles['TableHeader'])],
        [Paragraph('Phase 1: Foundation', styles['TableCell']), 
         Paragraph('Weeks 1-4', styles['TableCell']),
         Paragraph('• Helm chart scaffolding\n• Base operator framework\n• Limitation register initialization\n• Debt register template creation', styles['TableCell']),
         Paragraph('Charts deploy successfully; registers populated from spec audit', styles['TableCell'])],
        [Paragraph('Phase 2: Core Operators', styles['TableCell']), 
         Paragraph('Weeks 5-10', styles['TableCell']),
         Paragraph('• DetectionRule operator\n• Playbook operator\n• Tenant operator (MSSP)\n• CorrelationPipeline operator', styles['TableCell']),
         Paragraph('Operators pass integration tests; CRDs stable', styles['TableCell'])],
        [Paragraph('Phase 3: Security Hardening', styles['TableCell']), 
         Paragraph('Weeks 11-14', styles['TableCell']),
         Paragraph('• PodSecurityProfiles\n• NetworkPolicy matrix\n• Secrets management integration\n• CIS benchmark compliance', styles['TableCell']),
         Paragraph('kube-bench score > 80%; zero privileged containers', styles['TableCell'])],
        [Paragraph('Phase 4: CI/CD Maturity', styles['TableCell']), 
         Paragraph('Weeks 15-18', styles['TableCell']),
         Paragraph('• ArgoCD/Flux integration\n• Image signing pipeline\n• Automated security scanning\n• Multi-environment promotion', styles['TableCell']),
         Paragraph('Full GitOps workflow; < 30 min PR-to-production', styles['TableCell'])],
        [Paragraph('Phase 5: Operational Excellence', styles['TableCell']), 
         Paragraph('Weeks 19-24', styles['TableCell']),
         Paragraph('• Remaining operators (TI, Backup, Compliance)\n• Runbook library\n• Debt remediation sprint\n• Documentation completion', styles['TableCell']),
         Paragraph('All registers current; debt trending downward', styles['TableCell'])],
    ]
    
    phase_table = Table(phase_data, colWidths=[35*mm, 25*mm, 85*mm, 75*mm])
    phase_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), HEADER_FILL),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 6),
        ('TOPPADDING', (0, 0), (-1, 0), 6),
        ('BACKGROUND', (0, 1), (-1, -1), CARD_BG),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 4),
        ('RIGHTPADDING', (0, 0), (-1, -1), 4),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [CARD_BG, TABLE_STRIPE]),
    ]))
    
    elements.append(Spacer(1, 3*mm))
    elements.append(phase_table)
    elements.append(Spacer(1, 8*mm))
    
    # Closing statement
    closing_text = """
    <b>Next Steps:</b> Upon approval of this expansion document, the recommended immediate actions include: (1) 
    allocate Phase 1 resources and establish the working repository structure, (2) conduct a workshop with 
    platform engineers to validate the Helm chart architecture against existing deployment patterns, (3) populate 
    the initial limitation and debt registers through a collaborative specification review session, and (4) define 
    success metrics and reporting cadence for ongoing tracking. Regular review of these registers should occur 
    during monthly architecture forums, with executive summaries provided to leadership quarterly.
    """
    elements.append(Paragraph(closing_text.strip(), styles['CustomBody']))
    
    return elements


def build_document():
    """Build the complete PDF document."""
    output_path = '/home/z/my-project/download/Cybersoc_Platform_Expansion_Document.pdf'
    
    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        leftMargin=20*mm,
        rightMargin=20*mm,
        topMargin=20*mm,
        bottomMargin=20*mm,
        title="CyberSOC Platform Specification Expansion",
        author="CyberSOC Architecture Team",
        subject="Kubernetes Deployment, Known Limitations, Technical Debt Register"
    )
    
    story = []
    
    # Build sections
    story.extend(create_cover_page())
    story.extend(create_toc())
    story.extend(create_executive_summary())
    story.extend(create_kubernetes_section())
    story.extend(create_limitations_section())
    story.extend(create_technical_debt_section())
    story.extend(create_roadmap_section())
    
    # Build PDF
    doc.build(story)
    
    print(f"Document generated successfully: {output_path}")
    return output_path


if __name__ == '__main__':
    build_document()
