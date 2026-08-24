#!/usr/bin/env python3
"""
CyberSOC Platform - API Gateway & Authentication Architecture
Phase 1B: Go-Live Critical Path Deliverable

This script generates a comprehensive PDF specification covering:
- OAuth 2.0 / OIDC Implementation
- API Gateway Architecture (Kong/Ambassador pattern)
- Rate Limiting Strategies
- Service Mesh Integration (Istio/Linkerd)
- JWT Token Management
- Security Controls & Threat Mitigation
"""

import os
from datetime import datetime
from reportlab.lib import colors
from reportlab.lib.units import inch, cm

# Unit fix
pt = 1

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY, TA_RIGHT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, ListFlowable, ListItem, KeepTogether
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily

# ============================================================================
# FONT REGISTRATION (CJK Support)
# ============================================================================
FONT_DIR = '/usr/share/fonts'

# Register Noto Serif SC (Primary Chinese font)
pdfmetrics.registerFont(TTFont('NotoSerifSC', f'{FONT_DIR}/truetype/noto-serif-sc/NotoSerifSC-Regular.ttf'))
pdfmetrics.registerFont(TTFont('NotoSerifSC-Bold', f'{FONT_DIR}/truetype/noto-serif-sc/NotoSerifSC-Bold.ttf'))
registerFontFamily('NotoSerifSC', normal='NotoSerifSC', bold='NotoSerifSC-Bold')

# Register Sarasa Mono SC (Monospace for code)
pdfmetrics.registerFont(TTFont('SarasaMonoSC', f'{FONT_DIR}/truetype/chinese/SarasaMonoSC-Regular.ttf'))

# ============================================================================
# CASCADE PALETTE (CyberSOC Design System)
# ============================================================================
PAGE_BG       = colors.HexColor('#f6f5f4')
SECTION_BG    = colors.HexColor('#efefee')
CARD_BG       = colors.HexColor('#ecebe7')
TABLE_STRIPE  = colors.HexColor('#ececea')
HEADER_FILL   = colors.HexColor('#615637')
COVER_BLOCK   = colors.HexColor('#695f40')
BORDER        = colors.HexColor('#c2baa3')
ICON          = colors.HexColor('#a2893e')
ACCENT        = colors.HexColor('#866f2b')
ACCENT_2      = colors.HexColor('#53b0cf')
TEXT_PRIMARY   = colors.HexColor('#1f1e1c')
TEXT_MUTED     = colors.HexColor('#85827b')
SEM_SUCCESS   = colors.HexColor('#49885e')
SEM_WARNING   = colors.HexColor('#887246')
SEM_ERROR     = colors.HexColor('#954e47')
SEM_INFO      = colors.HexColor('#5e7d9d')

# ============================================================================
# STYLE DEFINITIONS
# ============================================================================
styles = getSampleStyleSheet()

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
    spaceAfter=12
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
DOC_SUBTITLE = "API Gateway & Authentication Architecture"
DOC_VERSION = "Version 1.0"
DOC_DATE = datetime.now().strftime("%Y-%m-%d")
DOC_CLASSIFICATION = "INTERNAL - TECHNICAL SPECIFICATION"

OUTPUT_PATH = "/home/z/my-project/download/Cybersoc_API_Gateway_Auth_Architecture.pdf"

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================
def create_section_header(text, style='SectionTitle'):
    return Paragraph(text, styles[style])

def create_body_text(text, indent=True):
    style = 'CustomBody' if indent else 'CustomBodyNoIndent'
    return Paragraph(text, styles[style])

def create_table(data, col_widths=None, header_rows=1):
    if col_widths is None:
        available_width = A4[0] - 2*cm
        num_cols = len(data[0]) if data else 0
        col_widths = [available_width / num_cols] * num_cols
    
    table = Table(data, colWidths=col_widths, repeatRows=header_rows)
    
    style_commands = [
        ('BACKGROUND', (0, 0), (-1, header_rows-1), HEADER_FILL),
        ('TEXTCOLOR', (0, 0), (-1, header_rows-1), colors.white),
        ('FONTNAME', (0, 0), (-1, header_rows-1), 'NotoSerifSC-Bold'),
        ('FONTSIZE', (0, 0), (-1, header_rows-1), 9),
        ('ALIGN', (0, 0), (-1, header_rows-1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, header_rows-1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, header_rows-1), 8),
        ('TOPPADDING', (0, 0), (-1, header_rows-1), 8),
        ('FONTNAME', (0, header_rows), (-1, -1), 'NotoSerifSC'),
        ('FONTSIZE', (0, header_rows), (-1, -1), 8.5),
        ('TEXTCOLOR', (0, header_rows), (-1, -1), TEXT_PRIMARY),
        ('ALIGN', (0, header_rows), (-1, -1), 'LEFT'),
        ('VALIGN', (0, header_rows), (-1, -1), 'TOP'),
        ('BOTTOMPADDING', (0, header_rows), (-1, -1), 6),
        ('TOPPADDING', (0, header_rows), (-1, -1), 6),
        ('ROWBACKGROUNDS', (0, header_rows), (-1, -1), [CARD_BG, colors.white]),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
        ('BOX', (0, 0), (-1, -1), 1, HEADER_FILL),
    ]
    
    table.setStyle(TableStyle(style_commands))
    return table

# ============================================================================
# CONTENT SECTIONS
# ============================================================================
def build_cover_page():
    elements = []
    
    elements.append(Spacer(1, 2*inch))
    
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
    
    info_text = """
    <b>Document Purpose:</b> This specification defines the complete API Gateway and Authentication 
    architecture for the CyberSOC AI-Native Security Operations Center Operating System. It covers 
    OAuth 2.0/OIDC implementation, JWT token management, rate limiting strategies, service mesh 
    integration, and security controls required for production deployment.<br/><br/>
    <b>Target Audience:</b> Platform Architects, Backend Developers, DevOps Engineers, 
    Security Engineers, SRE Team<br/><br/>
    <b>Go-Live Phase:</b> Phase 1B - Critical Path Item (Authentication & API Infrastructure)
    """
    elements.append(Paragraph(info_text, styles['CustomBodyNoIndent']))
    
    elements.append(PageBreak())
    return elements

def build_toc():
    elements = []
    
    elements.append(Paragraph("TABLE OF CONTENTS", styles['ChapterTitle']))
    elements.append(Spacer(1, 0.3*inch))
    
    toc_entries = [
        ("1.", "Executive Summary", "3"),
        ("2.", "Architecture Overview", "4"),
        ("   2.1", "Design Principles", "4"),
        ("   2.2", "Component Architecture", "5"),
        ("   2.3", "Technology Stack", "6"),
        ("3.", "OAuth 2.0 / OIDC Implementation", "7"),
        ("   3.1", "Authorization Flows", "7"),
        ("   3.2", "Token Management", "9"),
        ("   3.3", "Identity Provider Integration", "11"),
        ("4.", "API Gateway Architecture", "13"),
        ("   4.1", "Gateway Configuration", "13"),
        ("   4.2", "Request Processing Pipeline", "15"),
        ("   4.3", "Plugin System", "17"),
        ("5.", "Rate Limiting Strategy", "19"),
        ("   5.1", "Rate Limiting Algorithms", "19"),
        ("   5.2", "Implementation Configuration", "21"),
        ("   5.3", "Quota Management", "23"),
        ("6.", "Service Mesh Integration", "25"),
        ("   6.1", "Mesh Topology", "25"),
        ("   6.2", "Traffic Management", "26"),
        ("   6.3", "Security Policies", "27"),
        ("7.", "Security Controls", "29"),
        ("   7.1", "Threat Mitigation", "29"),
        ("   7.2", "CORS & CSP Policies", "31"),
        ("   7.3", "WAF Rules", "32"),
        ("8.", "Monitoring & Observability", "34"),
        ("   8.1", "Metrics Collection", "34"),
        ("   8.2", "Distributed Tracing", "35"),
        ("   8.3", "Alerting Rules", "36"),
        ("9.", "Implementation Roadmap", "37"),
        ("", "Appendix A: Configuration Reference", "39"),
        ("", "Appendix B: Error Response Schema", "41"),
        ("", "Appendix C: Security Checklist", "42"),
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
    elements = []
    
    elements.append(Paragraph("1. EXECUTIVE SUMMARY", styles['ChapterTitle']))
    elements.append(Spacer(1, 0.2*inch))
    
    summary_text = """
    The CyberSOC API Gateway and Authentication Architecture forms the critical security perimeter 
    and traffic management layer for the entire platform. This specification defines how all external 
    requests are authenticated, authorized, rate-limited, and routed to backend microservices, while 
    maintaining the performance, reliability, and security standards required for enterprise-grade 
    security operations. The architecture implements industry-standard protocols including OAuth 2.0, 
    OpenID Connect, and JSON Web Tokens (JWT) to ensure interoperability with existing identity 
    infrastructure while providing the granular access controls necessary for a multi-tenant SOC platform.
    """
    elements.append(create_body_text(summary_text))
    
    elements.append(create_section_header("1.1 Scope and Objectives"))
    
    scope_text = """
    This specification addresses four primary architectural domains essential to platform security 
    and scalability. First, the Identity and Access Management domain establishes secure authentication 
    mechanisms supporting multiple identity providers, multi-factor authentication enforcement, and 
    fine-grained session management across web, mobile, and API client types. Second, the API Gateway 
    domain provides centralized request handling with protocol translation, request/response 
    transformation, caching, and intelligent routing based on tenant context, user permissions, and 
    system load conditions. Third, the Traffic Control domain implements sophisticated rate limiting, 
    quota management, and abuse prevention mechanisms that protect backend services from overload 
    while ensuring fair resource allocation among tenants and user segments. Fourth, the Observability 
    domain delivers comprehensive monitoring, distributed tracing, and security analytics capabilities 
    that enable operational teams to detect anomalies, troubleshoot issues, and demonstrate compliance 
    with regulatory requirements.
    """
    elements.append(create_body_text(scope_text))
    
    elements.append(create_section_header("1.2 Key Requirements"))
    
    requirements = [
        ["Requirement Category", "Specific Requirement", "Priority", "Success Metric"],
        ["Authentication Security", "Support OAuth 2.0 + OIDC with multiple IdPs; MFA enforcement; token rotation", "Critical", "Zero authentication bypass vulnerabilities; MFA enrollment >99%"],
        ["Authorization Granularity", "RBAC with 47+ permissions; tenant isolation; attribute-based access control", "Critical", "100% API endpoint coverage; zero cross-tenant data leakage"],
        ["Performance", "P50 latency <20ms gateway overhead; P99 <100ms; support 10K RPS per instance", "High", "Load test validation; production SLO achievement"],
        ["Availability", "99.95% uptime SLA; graceful degradation; no single point of failure", "High", "Chaos engineering validation; failover testing"],
        ["Scalability", "Horizontal scaling; stateless design; handle growth to 100K users", "Medium", "Auto-scaling validation; capacity planning accuracy"],
        ["Observability", "Complete request tracing; metrics export; security event logging", "Medium", "MTTR <15min for auth issues; audit completeness >99.9%"],
        ["Compliance", "SOC 2 Type II aligned; GDPR data protection; FedRAMP ready", "High", "Audit passage; penetration test findings resolved"],
    ]
    elements.append(create_table(requirements, col_widths=[1.3*inch, 2.4*inch, 0.8*inch, 1.9*inch]))
    elements.append(Spacer(1, 0.15*inch))
    
    elements.append(create_section_header("1.3 Design Decisions"))
    
    decisions_text = """
    Several key architectural decisions shape this specification, each representing a deliberate 
    trade-off between competing concerns. The selection of Kong Gateway as the primary API gateway 
    technology prioritizes plugin extensibility, community support, and Kubernetes-native deployment 
    over alternatives like Ambassador or AWS API Gateway that would introduce vendor lock-in or 
    reduced customization capability. The decision to implement stateless JWT-based authentication 
    with short-lived access tokens (15 minutes) and longer-lived refresh tokens (7 days) balances 
    security (reduced token lifetime limits exposure window) against usability (refresh tokens enable 
    persistent sessions without frequent re-authentication). The choice of Redis as the shared state 
    store for rate limiting counters, token blacklists, and session metadata enables horizontal 
    scaling of gateway instances while maintaining consistent state across the cluster.
    """
    elements.append(create_body_text(decisions_text))
    
    elements.append(PageBreak())
    return elements

def build_architecture_overview():
    elements = []
    
    elements.append(Paragraph("2. ARCHITECTURE OVERVIEW", styles['ChapterTitle']))
    elements.append(Spacer(1, 0.2*inch))
    
    intro_text = """
    The API Gateway and Authentication system follows a layered architecture pattern, separating 
    concerns across edge infrastructure, gateway processing, service mesh communication, and 
    backend application logic. Each layer has well-defined responsibilities and interfaces, 
    enabling independent scaling, testing, and evolution of components without impacting other 
    layers. This section describes the overall architecture, component relationships, and 
    technology selections that enable the system to meet its functional and non-functional requirements.
    """
    elements.append(create_body_text(intro_text))
    
    # Design Principles
    elements.append(create_section_header("2.1 Design Principles"))
    
    principles_data = [
        ["Principle", "Description", "Application in This Architecture"],
        ["Defense in Depth", "Multiple security layers so that compromise of one control does not result in total system compromise", "Edge WAF + Gateway Auth + Service Mesh mTLS + Application Authorization; each layer independently effective"],
        ["Zero Trust", "Never trust implicitly; verify every request regardless of origin (internal or external)", "Every API call authenticated; service-to-service calls use mTLS; no internal network assumptions"],
        ["Fail Secure", "System defaults to secure state on failure; errors deny access rather than permit", "Auth failures block requests; rate limiter defaults to restrictive mode; circuit breaker opens on ambiguity"],
        ["Minimal Privilege", "Components and users have only minimum permissions required for their function", "Scoped JWT claims; RBAC at gateway before backend; service accounts with specific permissions"],
        ["Separation of Concerns", "Each component handles one aspect of processing; clear boundaries via well-defined interfaces", "Gateway handles routing/auth/rate-limit; IdP handles identity; apps handle business logic; observability handles metrics"],
        ["Statelessness", "Gateway instances maintain no session state; all state in external stores (Redis, DB)", "Horizontal scaling without sticky sessions; instance replacement without data loss; simplified disaster recovery"],
    ]
    elements.append(create_table(principles_data, col_widths=[1.2*inch, 2.3*inch, 2.9*inch]))
    elements.append(Spacer(1, 0.15*inch))
    
    # Component Architecture
    elements.append(create_section_header("2.2 Component Architecture"))
    
    components_text = """
    The system comprises eight major component groups arranged in logical layers from the network 
    edge inward. At the edge layer, CDN and DDoS protection services filter malicious traffic 
    before it reaches application infrastructure. The ingress layer manages TLS termination, 
    initial routing, and basic geo-access controls. The gateway layer performs core API management 
    functions including authentication, authorization, rate limiting, and request transformation. 
    The service mesh layer handles secure inter-service communication with mutual TLS, traffic 
    splitting, and retry logic. Finally, the application layer contains the business logic 
    microservices that implement CyberSOC functionality.
    """
    elements.append(create_body_text(components_text))
    
    components_data = [
        ["Layer", "Component", "Technology", "Responsibility", "Scaling Model"],
        ["Edge", "CDN/Static Cache", "CloudFlare Enterprise", "Static asset delivery; DDoS absorption; geographic distribution; bot mitigation", "Global anycast; auto-scales"],
        ["Edge", "WAF", "CloudFlare WAF + ModSecurity (custom rules)", "OWASP Top 10 protection; custom rule engine; virtual patching; request logging", "Inline with CDN"],
        ["Ingress", "TLS Termination", "Kubernetes Ingress (NGINX) + cert-manager", "Certificate provisioning (Let's Encrypt/enterprise); TLS 1.3 negotiation; SNI routing", "Pod-based HPA"],
        ["Ingress", "Load Balancer", "Cloud LB (GCP/AWS) or MetalLB (on-prem)", "Health check routing; weighted distribution; connection draining; failover", "Managed service"],
        ["Gateway", "API Gateway", "Kong Gateway (Enterprise or OSS)", "Auth validation; rate limiting; request transformation; plugin execution; caching", "HPA (2-50 pods)"],
        ["Gateway", "Identity Proxy", "Keycloak (or commercial IdP)", "OAuth/OIDC flows; MFA orchestration; user directory sync; federation", "HA deployment (3+ nodes)"],
        ["Mesh", "Control Plane", "Istiod (Istio)", "Service discovery; certificate issuance (mTLS); configuration distribution; telemetry collection", "Singleton HA"],
        ["Mesh", "Data Plane", "Envoy sidecars (Istio)", "Inter-service mTLS; traffic management; retry/circuit-breaker; observability injection", "Per-pod sidecar"],
        ["Application", "Backend Services", "Go/Python/Node.js microservices", "Business logic; data access; domain-specific processing; event handling", "Independent HPA per service"],
    ]
    elements.append(create_table(components_data, col_widths=[0.6*inch, 1.1*inch, 1.4*inch, 2.2*inch, 1.1*inch]))
    elements.append(Spacer(1, 0.15*inch))
    
    # Technology Stack
    elements.append(create_section_header("2.3 Technology Stack Justification"))
    
    tech_stack = [
        ["Component", "Selected Technology", "Alternatives Considered", "Rationale for Selection"],
        ["API Gateway", "Kong Gateway (OSS/Enterprise)", "Ambassador, Traefik, AWS API Gateways, Tyk", "Mature plugin ecosystem; K8s-native; Lua/plugin extensibility; good performance; active community; enterprise support available"],
        ["Identity Provider", "Keycloak (with HA PostgreSQL)", "Auth0, Okta, Azure AD (as IdP only), FusionAuth", "Open source; full OIDC/OAuth2; customizable UI; supports federation; self-hosted for data sovereignty; mature project"],
        ["Service Mesh", "Istio (with Envoy)", "Linkerd, Consul Connect, Cilium", "Feature-complete; Envoy data plane maturity; K8s integration; traffic management; security policy framework; observability built-in"],
        ["State Store", "Redis Cluster (mode: cluster)", "Memcached, Hazelcast, etcd", "Rich data structures for rate limiters/token blacklist; pub/sub for invalidations; clustering for HA; proven at scale"],
        ["Secrets Management", "HashiCorp Vault (HA mode)", "AWS Secrets Manager, Kubernetes Secrets, CipherTrust", "Dynamic secrets; encryption as service; audit logging; K8s integration; enterprise features; compliance support"],
        ["Certificate Manager", "cert-manager (K8s native)", "Vault PKI, Let's Encrypt CLI, AWS ACM", "Automatic provisioning/renewal; multiple issuer support; K8s CRDs; challenge solvers; free certs from Let's Encrypt"],
    ]
    elements.append(create_table(tech_stack, col_widths=[1.0*inch, 1.5*inch, 1.5*inch, 2.5*inch]))
    
    elements.append(PageBreak())
    return elements

def build_oauth_oidc_implementation():
    elements = []
    
    elements.append(Paragraph("3. OAUTH 2.0 / OIDC IMPLEMENTATION", styles['ChapterTitle']))
    elements.append(Spacer(1, 0.2*inch))
    
    intro_text = """
    The CyberSOC Platform implements OAuth 2.0 and OpenID Connect (OIDC) as its primary authentication 
    and authorization framework, enabling secure delegated access for web applications, mobile clients, 
    API consumers, and service accounts. The implementation supports multiple grant types optimized 
    for different client contexts, enforces strict security parameters exceeding RFC recommendations, 
    and integrates with enterprise identity providers through standard federation protocols. This 
    section details the supported authorization flows, token management policies, and identity provider 
    integration patterns.
    """
    elements.append(create_body_text(intro_text))
    
    # Authorization Flows
    elements.append(create_section_header("3.1 Supported Authorization Grant Types"))
    
    flows_intro = """
    The platform supports four OAuth 2.0 grant types, each designed for specific client types and 
    security contexts. Grant type selection is enforced based on client registration properties, 
    preventing insecure configurations such as using implicit flow for confidential clients or 
    client credentials in browser-based applications. Each flow includes additional security 
    measures beyond the base OAuth specification, including Proof Key for Code Exchange (PKCE) 
    requirement for public clients, signed refresh token rotation, and device binding verification.
    """
    elements.append(create_body_text(flows_intro))
    
    flows_data = [
        ["Grant Type", "Use Case", "Security Enhancements", "Token Lifetime", "Refresh Support"],
        ["Authorization Code + PKCE", "Web applications (server-side); Single Page Apps; Mobile native apps", "- PKCE (S256) mandatory for public clients\n- Code challenge prevents auth code interception\n- State parameter validated\n- Nonce for replay protection", "Access: 15 min\nID Token: 15 min\nCode: 60 sec", "Yes - Refresh: 7 days\nRotation: mandatory\nRe-use detection: immediate revocation"],
        ["Implicit (Deprecated)", "Legacy browser apps only; migration path existing clients", "- Not recommended for new clients\n- Short token lifetime enforced\n- Strict referrer validation\n- Planned removal Q4 2026", "Access: 5 min\nID Token: 5 min", "No - Must re-authenticate;\nMigration to code+PKCE required"],
        ["Resource Owner Password", "First-party trusted clients; legacy system migration; machine-to-machine with user context", "- Rate limited (5/min/IP)\n- Requires trusted client flag\n- MFA prompt on new device\n- Deprecation warning in response", "Access: 15 min\nRefresh: 7 days", "Yes - Same as code flow;\nTrusted client only"],
        ["Client Credentials", "Service-to-service; batch jobs; API integrations; background workers", "- Certificate-bound tokens (mtls)\n- Scoped to client's permissions only\n- No user context\n- Audited usage logging", "Access: 30 min\n(no ID token)", "No - Re-authenticate;\nShorter TTL for high-privilege scopes"],
        ["Device Authorization", "TV/apps limited input; IoT devices; headless systems", "- User code + verification URI\n- Polling interval: 5 sec (max)\n- Expiration: 10 minutes\n- Rate limited polling", "Access: 15 min\n(user-dependent)", "Yes - Standard refresh;\nDevice binding optional"],
    ]
    elements.append(create_table(flows_data, col_widths=[1.2*inch, 1.3*inch, 1.8*inch, 1.0*inch, 1.2*inch]))
    elements.append(Spacer(1, 0.15*inch))
    
    # Token Management
    elements.append(create_section_header("3.2 JWT Token Structure and Management"))
    
    token_intro = """
    JSON Web Tokens (JWT) serve as the primary credential format for authenticated sessions within 
    the CyberSOC ecosystem. Both access tokens and ID tokens follow the JWT structure with carefully 
    scoped claims that balance information richness against token size and privacy considerations. 
    Refresh tokens are opaque, server-side-only references stored securely in the identity provider's 
    database, never exposed to client applications in structured form. All tokens incorporate 
    cryptographic signatures using RS256 (RSA Signature with SHA-256) algorithm with key rotation 
    according to NIST SP 800-57 recommendations.
    """
    elements.append(create_body_text(token_intro))
    
    elements.append(create_section_header("3.2.1 Access Token Claims", style='SubSectionTitle'))
    
    access_claims = [
        ["Claim", "Type", "Required", "Description", "Example Value"],
        ["iss", "string", "Yes", "Issuer identifier (IdP URL)", "https://auth.cybersoc.platform"],
        ["sub", "UUID", "Yes", "Subject (user ID) - stable identifier", "a1b2c3d4-e5f6-7890-abcd-ef1234567890"],
        ["aud", "string[]", "Yes", "Audience(s) - intended recipients", "[\"cybersoc-api\", \"cybersoc-web\"]"],
        ["exp", "numeric", "Yes", "Expiration time (Unix timestamp)", "1690000000"],
        ["iat", "numeric", "Yes", "Issued-at time (Unix timestamp)", "1689999100"],
        ["jti", "UUID", "Yes", "Unique token ID for revocation tracking", "f1e2d3c4-b5a6-7890-1234-567890abcdef"],
        ["scope", "string", "Yes", "Space-delimited permission scopes", "read:users write:incidents admin:config"],
        ["tenant_id", "UUID", "Conditional", "Organization context (multi-tenant)", "org-12345-abcde"],
        ["role", "string", "Conditional", "Primary role assignment", "security_analyst"],
        ["amr", "string[]", "Recommended", "Authentication Methods References", "[\"pwd\", \"mfa\"]"],
        ["auth_time", "numeric", "Recommended", "Time of user authentication", "1689999000"],
    ]
    elements.append(create_table(access_claims, col_widths=[0.7*inch, 0.7*inch, 0.6*inch, 2.0*inch, 1.5*inch]))
    elements.append(Spacer(1, 0.15*inch))
    
    elements.append(create_section_header("3.2.2 Token Lifecycle Management", style='SubSectionTitle'))
    
    lifecycle_text = """
    Token lifecycle management encompasses generation, validation, renewal, and revocation processes 
    that ensure credentials remain secure throughout their useful life. The system implements proactive 
    token rotation for refresh tokens, meaning each refresh operation issues a new refresh token while 
    immediately invalidating the previous one. This detects token theft because legitimate clients will 
    present the newest token while attackers holding stolen older tokens will trigger a reuse detection 
    alert and session termination. Access tokens cannot be revoked individually (stateless nature); 
    instead, sensitive operations require recent authentication (step-up auth) and the system maintains 
    a token blacklist in Redis for emergency revocation with maximum 60-second propagation delay.
    """
    elements.append(create_body_text(lifecycle_text))
    
    lifecycle_data = [
        ["Operation", "Trigger", "Process", "Side Effects", "Propagation Delay"],
        ["Token Generation", "Successful authentication; Token refresh", "IdP creates signed JWT; JTI registered in Redis (TTL=token lifetime); Audit event written", "Login count incremented; Last login timestamp updated; Device fingerprint recorded", "< 100ms (local); < 5s (cluster-wide)"],
        ["Token Validation", "Each API request to gateway", "Signature verified (JWKS cached); Claims extracted; Expiration checked; Revocation list consulted (Redis lookup); Scope extracted for RBAC", "Validation metrics emitted; Anomaly detection fed; Request enriched with user context", "< 2ms (cached JWKS); < 10ms (revocation check)"],
        ["Token Refresh", "Access token expired; Valid refresh token presented", "Refresh token validated; New access+refresh pair issued; Old refresh invalidated (reuse detection armed); Rotation counter incremented", "Session extended; Device trust updated; Reuse alert if old token presented later", "< 200ms (IdP); < 5s (blacklist prop)"],
        ["Token Revocation", "User logout; Admin action; Security incident; Password change", "JTI added to Redis blacklist (TTL=remaining lifetime); Session cleared; Connected devices notified via WebSocket/push", "All sessions for user invalidated; Active operations interrupted; Forced re-auth next request", "< 5s (cluster-wide via Redis pub/sub)"],
        ["Key Rotation", "Scheduled (90 days) or Emergency (compromise suspected)", "New RSA key pair generated; JWKS updated with new public key; Old key retained for validation during overlap period; Overlap = 2 * max_token_lifetime", "Keys published to JWKS endpoint; Downstream caches invalidated; Monitoring alerts for rotation completion", "Immediate (new keys); 30 min (cache invalidation)"],
    ]
    elements.append(create_table(lifecycle_data, col_widths=[1.0*inch, 1.3*inch, 2.0*inch, 1.5*inch, 1.0*inch]))
    elements.append(Spacer(1, 0.15*inch))
    
    # Identity Provider Integration
    elements.append(create_section_header("3.3 Identity Provider Federation"))
    
    idp_intro = """
    The CyberSOC Platform integrates with enterprise identity providers through standard federation 
    protocols, enabling organizations to leverage existing identity investments including corporate 
    directories, MFA solutions, and governance tooling. The primary integration mechanism is SAML 2.0 
    for enterprise SSO scenarios, with OIDC federation for cloud-first identity providers. The 
    platform's bundled Keycloak instance can operate in standalone mode (managing its own user store) 
    or proxy mode (federating to upstream IdPs), with automatic user provisioning and attribute mapping.
    """
    elements.append(create_body_text(idp_intro))
    
    idp_integrations = [
        ["Protocol", "Use Case", "Supported Providers", "Configuration Complexity", "Features Supported"],
        ["SAML 2.0", "Enterprise SSO; Government/defense; High-assurance environments", "Azure AD, Okta, OneLogin, Shibboleth, ADFS, PingIdentity, Custom (metadata XML)", "Medium - Metadata exchange; certificate setup; attribute mapping; signature config", "IdP-initiated SP-initiated; Just-in-time provisioning; Attribute query; Artifact resolution; Logout propagation"],
        ["OIDC (Federation)", "Cloud-native orgs; Developer environments; Social login addition", "Google, Microsoft, GitHub, GitLab, Slack, Generic OpenID Provider", "Low - Client ID/secret; redirect URIs; scope selection; claim mapping", "Discovery endpoint; Dynamic registration; Claim customization; Prompt control; Session management"],
        ["LDAP/AD", "On-premise directory sync; Legacy system coexistence; Air-gapped deployments", "Microsoft Active Directory, OpenLDAP, FreeIPA, Oracle Directory, 389 Directory Server", "Medium-High - Connection string; bind DN; SSL/TLS; search bases; sync schedules", "User/Group synchronization; Password policy enforcement; Account status sync; Group mapping to roles"],
        ["Social Login", "Consumer-facing portals; Low-friction onboarding; Developer community", "Google, GitHub, Microsoft, Apple, Facebook, LinkedIn (via generic OIDC)", "Low - Provider console setup; OAuth app creation; callback URLs", "Account linking; Profile enrichment; Email verification bypass; Consent screen branding"],
    ]
    elements.append(create_table(idp_integrations, col_widths=[0.9*inch, 1.3*inch, 1.6*inch, 1.3*inch, 1.5*inch]))
    
    elements.append(PageBreak())
    return elements

def build_api_gateway_architecture():
    elements = []
    
    elements.append(Paragraph("4. API GATEWAY ARCHITECTURE", styles['ChapterTitle']))
    elements.append(Spacer(1, 0.2*inch))
    
    intro_text = """
    The API Gateway serves as the unified entry point for all programmatic access to the CyberSOC 
    Platform, implementing the facade pattern that shields backend services from direct external 
    exposure. Built on Kong Gateway, the gateway provides protocol translation, authentication 
    enforcement, rate limiting, request transformation, caching, and extensive observability hooks. 
    This section details the gateway configuration schema, request processing pipeline, and extensible 
    plugin architecture that enables customization for tenant-specific requirements without modifying 
    core gateway code.
    """
    elements.append(create_body_text(intro_text))
    
    # Gateway Configuration
    elements.append(create_section_header("4.1 Gateway Deployment Configuration"))
    
    config_text = """
    The gateway operates in Kubernetes as a Deployment with Horizontal Pod Autoscaler (HPA) 
    responding to CPU utilization (target 70%) and custom metrics (request latency P99, queue depth). 
    A minimum of 2 replicas ensures availability during rolling updates, with maximum replicas 
    configured based on expected peak load plus 30% headroom. Gateway pods connect to a Redis 
    cluster for distributed state (rate limit counters, cache entries, feature flags) and to the 
    PostgreSQL database for configuration persistence and analytics data.
    """
    elements.append(create_body_text(config_text))
    
    kong_config = [
        ["Parameter", "Value", "Rationale", "Tuning Guidance"],
        ["Worker Processes", "auto (matches CPU cores)", "Maximize throughput; each worker handles connections independently", "Increase if CPU underutilized with high connection count; decrease if memory pressure"],
        ["Worker Connections", "10000 per worker", "Support high concurrency; buffer for connection storms", "Monitor actual concurrent connections; reduce if consistently low to save memory"],
        ["Upstream Keepalive Pool", "64 connections per upstream", "Connection reuse reduces TLS handshake overhead to backends", "Increase for many backends; decrease if backends struggle with persistent connections"],
        ["Client Body Size", "50 MB (configurable per route)", "Allow file uploads (PCAP, evidence) but prevent abuse", "Lower for pure APIs; higher for upload endpoints (separate route)"],
        ["Client Read Timeout", "60 seconds", "Long-running queries (analytics, reports) need generous timeout", "Reduce for latency-sensitive routes; increase for heavy computation endpoints"],
        ["Upstream Connect Timeout", "10 seconds", "Allow DNS resolution + TCP + TLS handshake time", "Increase if backends in different region/AZ; decrease for local fast networks"],
        ["Upstream Send/Read Timeout", "60 seconds each", "Match client timeout; backend should respond within same window", "Align with backend SLAs; shorter timeouts enable faster failure detection"],
        ["SSL Protocols", "TLS 1.2, TLS 1.3 only", "Disable deprecated TLS 1.0/1.1; enforce modern crypto", "Remove TLS 1.2 when all clients support 1.3 (future state)"],
        ["SSL Ciphers", "ECDHE+AESGCM:ECDHE+CHACHA20", "Forward secrecy required; prefer AES-NI hardware acceleration", "Test with SSL Labs; remove weak ciphers if any slip through"],
        ["Access Log Format", "JSON (structured)", "Machine-parseable for log aggregation pipelines; includes timing fields", "Add custom fields for correlation IDs; consider sampling for high-volume"],
        ["Error Log Level", "warn (production)", "Balance visibility vs noise; info for debugging; error for alerts", "Increase temporarily during troubleshooting; revert to warn after"],
        ["Plugin Bundling", "Enabled (enterprise)", "Faster startup with pre-bundled plugins; consistent versions", "Not applicable to OSS edition; consider for performance-sensitive deploys"],
    ]
    elements.append(create_table(kong_config, col_widths=[1.3*inch, 1.4*inch, 2.0*inch, 1.8*inch]))
    elements.append(Spacer(1, 0.15*inch))
    
    # Request Processing Pipeline
    elements.append(create_section_header("4.2 Request Processing Pipeline"))
    
    pipeline_text = """
    Every incoming request traverses a deterministic sequence of processing phases, each executed 
    by specific plugins configured globally or per-route. The pipeline implements the chain-of-responsibility 
    pattern where each phase can approve the request (pass to next phase), reject it (return error 
    response immediately), or transform it (modify headers/body before passing along). Understanding 
    this pipeline is essential for debugging issues, adding custom behavior, and optimizing performance 
    by eliminating unnecessary processing for simple requests.
    """
    elements.append(create_body_text(pipeline_text))
    
    pipeline_phases = [
        ["Phase", "Position", "Plugins Executed", "Function", "Failure Action"],
        ["1. SSL Termination", "Edge (before Kong)", "Nginx SSL module, cert-manager", "Decrypt TLS; validate certificate (client cert if mTLS); extract SNI", "Terminate with TLS handshake error"],
        ["2. IP Allowlist/Denylist", "Global (pre-auth)", "ip-restriction (Kong plugin)", "Check source IP against allowlist/denylist; geo-IP evaluation", "Return 403 Forbidden with reason code"],
        ["3. Rate Limit (Global)", "Global (pre-auth)", "rate-limiting (advanced)", "Apply global rate limits (IP-based); early rejection of abusive sources", "Return 429 Too Many Requests with Retry-After"],
        ["4. CORS Handling", "Global (pre-auth)", "cors (Kong plugin)", "Validate Origin header; set appropriate CORS headers; handle preflight OPTIONS", "Block disallowed origins; return preflight response"],
        ["5. Authentication", "Route-level", "jwt (Kong plugin), oauth2, key-auth, ldap-auth", "Validate credentials; extract identity claims; attach consumer context", "Return 401 Unauthorized with WWW-Authenticate"],
        ["6. Authorization (RBAC)", "Route-level", "acl (custom plugin)", "Check JWT scopes/claims against route required permissions; tenant scoping", "Return 403 Forbidden with missing-permission detail"],
        ["7. Rate Limit (Scoped)", "Route/Consumer level", "rate-limiting (advanced)", "Apply consumer-specific or tenant-specific rate limits", "Return 429 with scope-specific Retry-After"],
        ["8. Request Transformation", "Route-level", "request-transformer, body-parser", "Modify headers/query/body per route needs; parse content-type", "Return 400 Bad Request if transformation fails"],
        ["9. Upstream Routing", "Core Kong", "Balancer (round-robin/least-conn/hash)", "Select target backend instance; apply health-check filtering", "Return 503 Service Unavailable if no healthy upstreams"],
        ["10. Proxy Forwarding", "Core Kong", "proxy (Nginx)", "Forward request to selected upstream; stream response back", "Return 502/504 if upstream fails/times out"],
        ["11. Response Transformation", "Route-level", "response-transformer", "Modify response headers/body; mask/redact sensitive fields", "Return original if transformation fails (fail-open for responses)"],
        ["12. Logging & Metrics", "Global (post-request)", "file-log, http-log, statsd, prometheus", "Write access log; emit timing metrics; increment counters", "Log write failure does not affect response (fire-and-forget)"],
    ]
    elements.append(create_table(pipeline_phases, col_widths=[1.2*inch, 1.0*inch, 1.6*inch, 1.8*inch, 1.4*inch]))
    elements.append(Spacer(1, 0.15*inch))
    
    # Plugin System
    elements.append(create_section_header("4.3 Plugin Architecture and Custom Plugins"))
    
    plugin_text = """
    Kong's plugin system provides the primary extension point for gateway behavior, enabling 
    customization without modifying core code. Plugins execute at defined phases (access, 
    header_filter, body_filter, log) and can modify requests, responses, or perform asynchronous 
    actions like calling external services. The CyberSOC deployment includes a mix of community 
    plugins (for standard functionality) and custom plugins (for domain-specific requirements 
    like tenant-aware rate limiting, step-up authentication prompts, and audit logging).
    """
    elements.append(create_body_text(plugin_text))
    
    plugins_catalog = [
        ["Plugin Name", "Type", "Scope", "Phase", "Purpose", "Configuration Highlights"],
        ["jwt", "Community", "Global/Route", "access", "Validate JWT signatures; extract claims; verify scopes", "secret_is_base64: true; claims_to_verify: [exp, iss, aud]; keyset_name: cybersoc-jwks"],
        ["acl", "Custom", "Route", "access", "Enforce RBAC permissions from JWT scopes against route requirements", "allow: array of permitted scopes; strict_mode: true; audit_log: true"],
        ["rate-limiting-advanced", "Community", "Global/Route/Consumer", "access", "Multi-dimension rate limiting with sliding window; Redis-backed", "policy: redis; window_size: [60s, 1h, 1d]; limit: [100, 1000, 10000]; redis_host/port/db"],
        ["correlation-id", "Community", "Global", "access", "Generate/propagate X-Request-ID for distributed tracing", "header_name: X-Request-ID; generator: uuid; echo_downstream: true"],
        ["request-transformer", "Community", "Route", "access", "Add/remove/modify request headers and query parameters", "add.headers: [X-Tenant-ID: $consumer_tenant_id]; rename.params: []"],
        ["response-transformer", "Community", "Route", "header_filter/body_filter", "Modify response headers and body; redact sensitive fields", "remove.headers: [X-Internal-*, Server, Date]; replace.body: patterns"],
        ["audit-log", "Custom", "Global", "log", "Write structured audit events to Elasticsearch for all authenticated requests", "es_hosts: [http://elastic:9200]; index_pattern: cybersoc-audit-{YYYY.MM.DD]; sample_rate: 1.0"],
        ["tenant-router", "Custom", "Global", "access", "Extract tenant from JWT; add routing headers; validate tenant status", "tenant_claim: tenant_id; header_name: X-Tenant-ID; check_suspension: true"],
        ["step-up-auth", "Custom", "Route", "access", "Require re-authentication for sensitive operations based on last_auth_time claim", "max_age_seconds: 900; challenge_endpoint: /api/v1/auth/re-authenticate; exempt_roles: [super_admin]"],
        ["cache", "Community", "Route", "access/response", "Cache GET responses per cache-key strategy; respect backend cache-control", "cache_strategy: [content_type: application/json]; cache_ttl: 300; method: GET"],
    ]
    elements.append(create_table(plugins_catalog, col_widths=[1.2*inch, 0.7*inch, 0.8*inch, 0.7*inch, 1.5*inch, 1.6*inch]))
    
    elements.append(PageBreak())
    return elements

def build_rate_limiting():
    elements = []
    
    elements.append(Paragraph("5. RATE LIMITING STRATEGY", styles['ChapterTitle']))
    elements.append(Spacer(1, 0.2*inch))
    
    intro_text = """
    Rate limiting protects the CyberSOC Platform from abuse, ensures fair resource allocation among 
    tenants and users, and prevents cascading failures during traffic spikes. The implementation uses 
    a multi-dimensional approach that applies limits at different granularities (global, per-tenant, 
    per-user, per-API-key) using sliding window algorithms stored in Redis for consistency across 
    gateway instances. This section details the rate limiting algorithms, configuration parameters, 
    and quota management integration with the licensing system.
    """
    elements.append(create_body_text(intro_text))
    
    # Algorithms
    elements.append(create_section_header("5.1 Rate Limiting Algorithms"))
    
    algo_text = """
    The platform employs three complementary rate limiting algorithms, each suited to different 
    protection objectives. Sliding window logarithmic (SLIW) provides smooth rate limiting without 
    the sharp boundaries of fixed windows, making it ideal for user-facing APIs where occasional 
    bursts are acceptable. Token bucket allows controlled bursting with sustained rate limits, 
    suitable for streaming and real-time data endpoints. Fixed window counter offers simplicity 
    and predictability for billing-aligned quotas where limits reset on calendar boundaries.
    """
    elements.append(create_body_text(algo_text))
    
    algorithms = [
        ["Algorithm", "Mechanism", "Best For", "Pros", "Cons", "Use Case in CyberSOC"],
        ["Sliding Window Logarithmic (SLIW)", "Maintains sorted log of request timestamps; counts entries in window; trims old entries; O(log n) per request", "General API protection; User-facing endpoints; Preventing brute force", "Smooth limiting; No burst spikes; Accurate window boundaries; Memory efficient", "Higher CPU than counter; Complex implementation; Redis SORT/ZRANGE ops", "Default for most REST APIs; Per-user auth attempts; Search/query endpoints"],
        ["Token Bucket", "Bucket holds tokens (refill rate); Each request consumes token(s); Burst up to bucket size possible; Refills continuously", "Streaming APIs; Real-time feeds; Variable-cost endpoints", "Allows controlled bursting; Predictable sustained rate; Easy to understand", "Can allow large bursts if bucket full; Needs tuning of burst size; Stateful", "SSE/event streams; File download throttling; High-value API calls (AI analysis)"],
        ["Fixed Window Counter", "Simple counter per window; Resets at boundary (minute/hour/day); Atomic INCR + EXPIRE in Redis", "Billing quotas; Calendar-aligned limits; Simple rate caps", "Extremely simple; Minimal memory; Fast (O(1)); Easy to explain", "Burst at window edges (2x limit); Not smooth; Reset predictable (gaming)", "Daily API call quotas per tier; Monthly storage limits; License seat checks"],
    ]
    elements.append(create_table(algorithms, col_widths=[1.2*inch, 1.4*inch, 1.1*inch, 1.2*inch, 1.1*inch, 1.4*inch]))
    elements.append(Spacer(1, 0.15*inch))
    
    # Configuration
    elements.append(create_section_header("5.2 Rate Limit Configuration by Tier"))
    
    config_text = """
    Rate limits are calibrated per licensing tier to align pricing with resource consumption while 
    preventing any single tenant or user from monopolizing shared infrastructure. Limits are defined 
    for multiple dimensions including requests-per-minute (throughput), concurrent connections 
    (capacity), data volume (bandwidth), and specific high-cost operations (AI analysis, report 
    generation). Administrators can adjust limits within bounds defined by the licensing agreement, 
    with changes taking effect within 60 seconds across all gateway instances.
    """
    elements.append(create_body_text(config_text))
    
    tier_limits = [
        ["Dimension", "Free Tier", "Professional ($149/u/mo)", "Business ($299/u/mo)", "Enterprise ($50K+/yr)", "Enforcement Point"],
        ["API Requests (per minute)", "1,000", "10,000", "50,000", "Custom (SLA-negotiated)", "Gateway (pre-auth + post-auth)"],
        ["API Requests (per day)", "50,000", "500,000", "5,000,000", "Unlimited", "Gateway (daily counter reset)"],
        ["Concurrent Connections", "5", "25", "100", "500", "Gateway (connection tracking)"],
        ["WebSocket Connections", "2", "10", "50", "200", "Gateway (upgrade tracking)"],
        ["Search Queries (per minute)", "10", "100", "500", "2,000", "Gateway (route-specific)"],
        ["Data Export (per hour)", "1 (max 1K rows)", "5 (max 10K rows)", "25 (max 100K rows)", "Unlimited", "Gateway + backend validation"],
        ["Report Generation (per day)", "3", "25", "100", "Unlimited", "Backend (job queue throttle)"],
        ["AI Analysis Calls (per day)", "10", "500", "5,000", "Custom", "Backend (API key gating)"],
        ["File Upload (MB per hour)", "100", "1,000", "10,000", "100,000", "Gateway (body size + backend)"],
        ["SSO/SAML Logins (per minute)", "N/A", "20", "100", "500", "IdP (authentication rate limit)"],
        ["Password Attempts (per 15 min)", "5 (lockout)", "5 (lockout)", "5 (lockout)", "Configurable", "IdP (brute-force protection)"],
    ]
    elements.append(create_table(tier_limits, col_widths=[1.4*inch, 0.9*inch, 1.1*inch, 1.0*inch, 1.2*inch, 1.2*inch]))
    elements.append(Spacer(1, 0.15*inch))
    
    # Quota Management
    elements.append(create_section_header("5.3 Quota Management and Overage Handling"))
    
    quota_text = """
    When a tenant approaches or exceeds their allocated quota, the system follows a graduated 
    response sequence designed to provide fair warning before enforcing hard blocks. At 80% 
    utilization, response headers begin including quota usage information (X-Quota-Used, 
    X-Quota-Limit, X-Quota-Reset). At 95%, the system emits administrative alerts and may 
    introduce artificial latency (exponential backoff starting at 50ms) to encourage throttling 
    without hard-blocking legitimate usage. Upon reaching 100%, subsequent requests receive HTTP 
    429 (Too Many Requests) with Retry-After header indicating when the quota resets. Enterprise 
    customers with negotiated overage terms may exceed limits with per-unit overage charges applied.
    """
    elements.append(create_body_text(quota_text))
    
    overage_flow = [
        ["Threshold", "Response Behavior", "Headers Added", "Notifications", "Admin Actions Available"],
        ["< 80%", "Normal processing; no throttling", "None (unless requested via header)", "None", "View usage dashboard; adjust limits upward (if headroom)"],
        ["80% - 94%", "Normal processing; informational headers", "X-Quota-Used, X-Quota-Limit, X-Quota-Reset, X-Quota-Percent", "Info-level alert to tenant admins (daily digest)", "Proactive outreach; upgrade discussion; optimize usage guidance"],
        ["95% - 99%", "Normal processing + increasing latency (50-200ms exponential)", "All above + Warning: 99-X-RateLimit-Warning header", "Warning alert to tenant admins + platform ops (immediate)", "Emergency contact; temporary limit increase; investigate spike cause"],
        ["100% (Hard Limit)", "HTTP 429 Too Many Requests; request rejected", "Retry-After (seconds to reset); X-Quota-Exceeded: true; Link to usage dashboard", "Critical alert to all stakeholders; incident ticket auto-created", "Immediate limit increase approval; overage terms activation; escalation to account team"],
        ["100% (Overage Enabled)", "HTTP 429 converted to 200 with X-Overage-Charged: true header", "All normal + X-Overage-Units: N; X-Overage-Rate: $0.XX/unit", "Overage notification to finance/billing teams", "Invoice adjustment; contract amendment; commercial discussion"],
    ]
    elements.append(create_table(overage_flow, col_widths=[0.9*inch, 1.6*inch, 1.5*inch, 1.4*inch, 1.5*inch]))
    
    elements.append(PageBreak())
    return elements

def build_service_mesh():
    elements = []
    
    elements.append(Paragraph("6. SERVICE MESH INTEGRATION", styles['ChapterTitle']))
    elements.append(Spacer(1, 0.2*inch))
    
    intro_text = """
    The Istio service mesh provides secure, observable, and resilient inter-service communication 
    within the CyberSOC Platform's Kubernetes deployment. By deploying Envoy proxy sidecars alongside 
    each application pod, the mesh handles transport security (mutual TLS), traffic management 
    (routing, splitting, mirroring), resilience (retries, circuit breaking, timeouts), and 
    observability (distributed tracing, metrics) transparently to application code. This section 
    defines the mesh topology, traffic management policies, and security configuration required 
    for production operation.
    """
    elements.append(create_body_text(intro_text))
    
    # Mesh Topology
    elements.append(create_section_header("6.1 Mesh Topology and Namespace Strategy"))
    
    topology_text = """
    The CyberSOC deployment uses a multi-namespace topology with selective mesh injection. Core 
    platform services (API gateway, identity provider, backend microservices) reside in mesh-enabled 
    namespaces with automatic sidecar injection. Data-intensive workloads (Elasticsearch, Kafka, 
    object storage gateways) run in mesh-disabled namespaces to avoid the overhead of double-proxying 
    large data transfers, communicating with mesh services via explicit gateway endpoints. This 
    hybrid approach optimizes performance for bulk data paths while maintaining mesh benefits for 
    API traffic.
    """
    elements.append(create_body_text(topology_text))
    
    namespaces = [
        ["Namespace", "Mesh Enabled", "Contains", "mTLS Mode", "Rationale"],
        ["istio-system", "No (control plane)", "Istiod, Kiali, Prometheus adapter", "N/A (control plane)", "Infrastructure; no sidecar needed"],
        ["cybersoc-gateway", "Yes (mandatory)", "Kong Gateway pods", "STRICT", "Entry point; must be in mesh for policy enforcement"],
        ["cybersoc-auth", "Yes (mandatory)", "Keycloak, LDAP connector", "STRICT", "Identity services; high security; mTLS required"],
        ["cybersoc-api", "Yes (default)", "All backend microservices (SIEM, EDR, SOAR, etc.)", "STRICT", "Business logic; primary beneficiaries of mesh features"],
        ["cybersoc-data", "No (disabled)", "PostgreSQL, Elasticsearch, Redis, Kafka, MinIO", "PERMISSIVE (disabled)", "Data stores; high throughput; sidecar would add latency"],
        ["cybersoc-monitoring", "Optional", "Grafana, AlertManager, custom exporters", "DISABLED", "Observability stack; outbound only; simpler without mesh"],
        ["cybersoc-batch", "No (disabled)", "Report generators, ML pipelines, ETL jobs", "DISABLED", "Batch workloads; long-running; initiate connections outward"],
    ]
    elements.append(create_table(namespaces, col_widths=[1.2*inch, 1.0*inch, 1.8*inch, 1.0*inch, 1.6*inch]))
    elements.append(Spacer(1, 0.15*inch))
    
    # Traffic Management
    elements.append(create_section_header("6.2 Traffic Management Policies"))
    
    traffic_text = """
    Istio VirtualServices and DestinationRules define how traffic flows between services, enabling 
    canary deployments, blue-green releases, fault injection testing, and intelligent routing based 
    on headers (including tenant context from the gateway). Traffic policies are version-controlled 
    alongside application code and applied via GitOps workflows to ensure reproducibility and auditability.
    """
    elements.append(create_body_text(traffic_text))
    
    traffic_policies = [
        ["Policy Type", "Applied To", "Configuration", "Purpose", "Rollback Procedure"],
        ["Canary Release", "Backend services (api-* namespaces)", "Weight-based: 90% v1, 10% v2; Header-based: X-Canary: true -> v2", "Safe rollout of new versions; gradual traffic shift; quick rollback", "Shift weight to 100% v1; or delete VirtualService to restore default routing"],
        ["Circuit Breaker", "All upstream dependencies (backend -> data stores)", "Outlier detection: 3xx5xx errors; Ejection: continuous 5 errors in 1 min; Base ejection time: 30s", "Prevent cascade failures; isolate unhealthy instances; give recovery time", "Adjust thresholds (more lenient); or remove DestinationRule to disable"],
        ["Timeout", "All inter-service calls", "Default: 10s; Database: 30s; External APIs: 60s; AI/ML: 120s", "Prevent hanging requests; bound latency; enable caller-side retries", "Increase timeout (temporary fix); or investigate slow dependency"],
        ["Retry", "Idempotent operations (GET, PUT with idempotency key)", "Attempts: 3; Per-try timeout: 80% of total timeout; Exponential backoff: 2x base", "Handle transient failures transparently; improve success rate", "Disable retries (set attempts: 1) if retries causing amplification"],
        ["Tenant-Aware Routing", "Multi-tenant services (most backends)", "Header match: X-Tenant-ID -> subset (tenant-specific pods if deployed); Default: shared pool", "Isolate noisy neighbors; dedicated resources for large tenants; compliance separation", "Remove header match rules; route all to default subset"],
        ["Fault Injection", "Testing namespace only", "Abort: 5% HTTP 500; Delay: 100ms for 10% of requests to payment service", "Chaos engineering; test resilience; validate monitoring/alerting", "Delete FaultInjection from VirtualService; traffic returns to normal"],
    ]
    elements.append(create_table(traffic_policies, col_widths=[1.0*inch, 1.3*inch, 1.8*inch, 1.5*inch, 1.4*inch]))
    elements.append(Spacer(1, 0.15*inch))
    
    # Security Policies
    elements.append(create_section_header("6.3 Mesh Security Configuration"))
    
    security_mesh_text = """
    The service mesh enforces a zero-trust security model where all inter-service communication 
    requires mutual TLS authentication, regardless of network location. Istio's PeerAuthentication 
    and Authorization policies define which identities can communicate, using SPIFFE IDs (SPIFFE 
    Verifiable Identity Documents) derived from X.509 certificates issued by the mesh CA. This 
    approach ensures that even if an attacker gains network access (e.g., container escape, 
    compromised pod), they cannot impersonate valid services or intercept traffic.
    """
    elements.append(create_body_text(security_mesh_text))
    
    mesh_security = [
        ["Policy", "Scope", "Configuration", "Enforcement", "Exceptions"],
        ["PeerAuthentication (mTLS mode)", "Namespace: cybersoc-api, cybersoc-gateway, cybersoc-auth", "mode: STRICT; All traffic must be encrypted with valid mesh certificates", "Istio sidecar enforces; unencrypted connections rejected at TCP level", "Health check probes from kubelet (use PERMISSIVE mode for /healthz port)"],
        ["PeerAuthentication (certificate lifecycle)", "Cluster-wide (root namespace)", "caCertificates: mesh CA; ttl: 24h; rotationGracePeriod: 1h; Auto-renewal enabled", "Istiod automatically rotates workload certificates; no manual intervention", "Long-lived certificates for external integrations (managed outside mesh)"],
        ["Authorization (allow-by-default)", "Namespace: cybersoc-api", "Default ALLOW; Deny rules for sensitive paths: POST:/admin/*, DELETE:/*/*", "Deny rules evaluated first; allow unless explicitly denied", "Super admin service account exempted from DELETE denies (break-glass)"],
        ["Authorization (deny-by-default)", "Namespace: cybersoc-data (databases)", "Default DENY; Allow rules for known service accounts: api-svc -> postgres:5432", "Only explicitly allowed connections succeed; defense in depth", "Database migration jobs need temporary allow-rule; revoke after completion"],
        ["Authorization (tenant isolation)", "Namespace: cybersoc-api (multi-tenant services)", "Allow: same-tenant pods communicate; Deny: cross-tenant pod communication (except admin services)", "X-Tenant-ID header matched; prevents tenant-to-tenant data access via mesh", "Platform operations service (super admin) can access all tenants for support"],
    ]
    elements.append(create_table(mesh_security, col_widths=[1.4*inch, 1.3*inch, 1.8*inch, 1.3*inch, 1.2*inch]))
    
    elements.append(PageBreak())
    return elements

def build_security_controls():
    elements = []
    
    elements.append(Paragraph("7. SECURITY CONTROLS", styles['ChapterTitle']))
    elements.append(Spacer(1, 0.2*inch))
    
    intro_text = """
    Security controls at the API gateway layer represent the first line of defense against web 
    application attacks, API abuse, and data exfiltration. This section details the specific 
    controls implemented for threat mitigation, cross-origin resource sharing policies, content 
    security provisions, and web application firewall rule sets. These controls complement 
    (but do not replace) security measures implemented within backend services and the service mesh.
    """
    elements.append(create_body_text(intro_text))
    
    # Threat Mitigation
    elements.append(create_section_header("7.1 Threat Mitigation Controls"))
    
    threat_text = """
    The gateway implements targeted mitigations for common attack vectors identified in the OWASP 
    API Security Top 10 and OWASP Web Application Security Top 10. Each control is configured to 
    block or log suspicious activity while minimizing false positives that could impact legitimate 
    users. Controls operate in blocking mode by default for high-confidence detections and logging 
    mode for heuristic checks that require tuning based on observed traffic patterns.
    """
    elements.append(create_body_text(threat_text))
    
    threats = [
        ["OWASP Category", "Attack Vector", "Mitigation Control", "Configuration", "Action on Detect"],
        ["API1: BOLA", "Broken Object-Level Authorization (accessing other users' data)", "Tenant scoping plugin + Row-level security enforcement", "Extract tenant_id from JWT; inject into all DB queries; validate resource ownership", "BLOCK (403) + Security alert"],
        ["API2: Broken Auth", "Compromised authentication mechanisms", "JWT validation + MFA enforcement + Brute-force rate limiting", "RS256 signature verification; exp/iat/nbf checks; MFA claim required for admin roles", "BLOCK (401) + Account lockout after 5 failures"],
        ["API3: Excess Data Exposure", "API returns more data than client needs", "Response transformer plugin (field filtering)", "Field-level allowlists per route/client; PII fields removed unless explicit scope; Pagination enforced", "TRANSFORM (strip fields) + Audit log"],
        ["API4: Lack of Resources", "No rate limiting leads to DoS", "Multi-dimensional rate limiting (see Section 5)", "Tier-based limits; per-user/per-tenant counters; Redis-backed sliding window", "BLOCK (429) + Graduated response"],
        ["API5: Broken Function Level", "Accessing unauthorized API endpoints (e.g., /admin as user)", "ACL plugin (scope-to-route mapping)", "Route requires specific JWT scopes; Missing scope = 403; Scope hierarchy enforced", "BLOCK (403) + Failed auth attempt logged"],
        ["API6: Mass Assignment", "Accepting raw JSON/PUT with unexpected fields", "Request validator (schema enforcement)", "Input schemas per endpoint; Unknown fields rejected; Type coercion prevented", "BLOCK (400) + Validation error details"],
        ["A03: Injection", "SQL/NoSQL/LDAP/Command injection via input", "Input sanitization + Parameterized queries (backend) + WAF rules", "Special character escaping; SQL keywords blocked in user inputs; Command patterns detected", "BLOCK (400) + WAF alert (potential exploit)"],
        ["A05: Misconfiguration", "Exposed admin panels, debug endpoints, verbose errors", "Route restrictions + Error message sanitization", "Admin routes require super_admin scope; Debug endpoints disabled in prod; Generic error messages externally", "BLOCK (404/403) + Internal details masked"],
        ["A07: XSS", "Cross-site scripting via reflected/stored input", "Output encoding + CSP headers + Input validation", "HTML entities encoded in responses; Content-Security-Policy restricts inline scripts; Input sanitized", "BLOCK (sanitize) + CSP violation report"],
        ["A09: SSRF", "Server-side request forgery via URL parameters", "URL validation + Allowlist + Outbound proxy", "Blocked schemes (file://, gopher://, etc.); Internal IP ranges blocked; Allowed domains allowlisted", "BLOCK (400) + Security incident ticket"],
    ]
    elements.append(create_table(threats, col_widths=[0.8*inch, 1.3*inch, 1.4*inch, 1.8*inch, 1.3*inch]))
    elements.append(Spacer(1, 0.15*inch))
    
    # CORS & CSP
    elements.append(create_section_header("7.2 Cross-Origin Resource Sharing (CORS) Policy"))
    
    cors_text = """
    CORS policies control which external origins can make cross-origin requests to the CyberSOC API, 
    protecting against unauthorized embedding and data extraction by malicious websites. The policy 
    distinguishes between browser-based API calls (which enforce CORS preflight) and server-to-server 
    calls (which do not). For embedded dashboard scenarios (iframe integration into customer portals), 
    specific origins are whitelisted with restricted allowed methods and headers.
    """
    elements.append(create_body_text(cors_text))
    
    cors_config = [
        ["Scenario", "Allowed Origins", "Allowed Methods", "Allowed Headers", "Credentials", "Max Age", "Notes"],
        ["Production API (direct)", "* (or specific frontend domain)", "GET, POST, PUT, PATCH, DELETE, OPTIONS", "Content-Type, Authorization, X-Request-ID, X-Tenant-ID", "true (for cookie-based auth)", "86400 (24h)", "Standard API access; Credentials for session cookies"],
        ["Embedded Dashboard (iframe)", "Explicit customer portal URLs (configured per tenant)", "GET, OPTIONS only (no writes)", "Content-Type, Authorization only", "false (no cookies)", "3600 (1h)", "Read-only embed; No auth via iframe; Tenant-specific config"],
        ["Webhook Callbacks", "N/A (server-to-server, no browser)", "POST only", "X-Webhook-Signature, X-Webhook-Timestamp, Content-Type", "N/A", "N/A", "Signature-based auth; IP allowlist also enforced"],
        ["Developer Portal / Docs", "docs.cybersoc.platform, localhost:* (dev)", "GET, OPTIONS", "Accept, Accept-Language, Content-Type", "false", "7200 (2h)", "Public documentation; Localhost for development"],
        ["Public SDK Examples", "codepen.io, jsfiddle.net, stackblitz.com (sandbox)", "GET, OPTIONS", "Content-Type, Authorization (user-provided)", "false", "3600", "Interactive demos; Limited scope; No real data access"],
    ]
    elements.append(create_table(cors_config, col_widths=[1.2*inch, 1.3*inch, 1.2*inch, 1.3*inch, 0.8*inch, 0.6*inch, 1.2*inch]))
    elements.append(Spacer(1, 0.15*inch))
    
    # WAF Rules
    elements.append(create_section_header("7.3 Web Application Firewall (WAF) Rule Set"))
    
    waf_text = """
    The WAF rule set provides an additional layer of application-layer attack prevention, operating 
    at the edge (CloudFlare) and optionally at the gateway (ModSecurity core rule set). Rules are 
    organized into tiers by severity and confidence, with high-confidence attacks blocked immediately 
    and lower-confidence detections logged for analysis and potential rule tuning. The rule set is 
    managed as code (YAML definitions) and undergoes regular review to address emerging threats and 
    reduce false positive rates based on production traffic analysis.
    """
    elements.append(create_body_text(waf_text))
    
    waf_rules = [
        ["Rule ID", "Category", "Pattern Detected", "Severity", "Action", "Paranoia Level", "False Positive Risk"],
        ["SQL Injection (union-based)", "Injection", "UNION SELECT, UNION ALL SELECT patterns in parameters", "Critical", "Block (403) + CAPTCHA challenge", "PL1 (always on)", "Low (clear attack pattern)"],
        ["SQL Injection (blind/timing)", "Injection", "SLEEP(), BENCHMARK(), WAITFOR DELAY patterns", "Critical", "Block (403) + IP reputation check", "PL1 (always on)", "Very Low (these functions rare in legit use)"],
        ["Remote Code Execution", "Injection", "system(), exec(), eval(), passthru() patterns", "Critical", "Block (403) + Immediate security alert", "PL1 (always on)", "Low (no legitimate use in API params)"],
        ["Path Traversal", "Injection", "../, ..\\, %2e%2e/, encoded variants", "High", "Block (403) + Sanitize path", "PL1 (always on)", "Medium (some file names contain .. legitimately)"],
        ["XSS (Reflected)", "XSS", "<script>, javascript:, onerror=, onload= in parameters", "High", "Sanitize (escape output) + Block if persistent pattern", "PL2 (moderate)", "Medium (rich text editors, code fields)"],
        ["Scanner/Bot Detection", "Automated Attack", "User-Agent: sqlmap, nikto, nmap, masscan, scanner fingerprints", "Medium", "Challenge (CAPTCHA) then Block if failed", "PL1 (always on)", "Low (legitimate scanners use custom UA)"],
        ["Session Fixation", "Broken Auth", "Session ID in URL parameter; Set-Cookie without HttpOnly/Secure", "High", "Strip parameter + Enforce secure cookie flags", "PL1 (always on)", "Very Low (no legit reason for session in URL)"],
        ["Sensitive File Access", "Misconfiguration", "Requests for .env, .git, .htaccess, wp-config, web.config", "Medium", "Block (404) + Log with elevated priority", "PL1 (always on)", "Very Low (never legitimate API access)"],
        ["Command Injection (cmd)", "Injection", "; | & $ ( ) ` in parameters with cmd.exe, /bin/sh context", "Critical", "Block (403) + Security incident created", "PL2 (moderate)", "Low (shell metacharacters rare in data)"],
        ["XXE (XML External Entity)", "Injection", "!ENTITY, !DOCTYPE, SYSTEM, PUBLIC in XML payloads", "High", "Block (400) + Disable XML parsing for endpoint", "PL2 (moderate)", "Low (XML rarely used in modern APIs)"],
    ]
    elements.append(create_table(waf_rules, col_widths=[1.2*inch, 0.8*inch, 1.8*inch, 0.6*inch, 1.4*inch, 0.9*inch, 1.0*inch]))
    
    elements.append(PageBreak())
    return elements

def build_monitoring():
    elements = []
    
    elements.append(Paragraph("8. MONITORING AND OBSERVABILITY", styles['ChapterTitle']))
    elements.append(Spacer(1, 0.2*inch))
    
    intro_text = """
    Comprehensive observability is essential for operating the API gateway and authentication 
    system at scale, enabling rapid detection of anomalies, efficient troubleshooting of issues, 
    and demonstration of compliance through audit-quality logs. The monitoring stack collects 
    three signal types: metrics (numerical measurements over time), traces (causal chains of 
    requests across services), and logs (discrete events with context). This section defines 
    what is collected, how it is stored, and how alerts are configured to notify operators of 
    conditions requiring attention.
    """
    elements.append(create_body_text(intro_text))
    
    # Metrics Collection
    elements.append(create_section_header("8.1 Metrics Collection and Dashboards"))
    
    metrics_text = """
    Metrics are emitted in Prometheus exposition format from Kong plugins, Istio sidecars, and 
    application code, scraped by Prometheus every 15 seconds, and stored with 15-day retention 
    for detailed analysis (aggregated data retained longer). Key metric categories include 
    request volume (counts, rates), latency distributions (histograms), error rates (by type), 
    resource utilization (CPU, memory, connections), and business metrics (active users, license 
    consumption). Grafana dashboards present these metrics with drill-down capability from summary 
    views to individual instance details.
    """
    elements.append(create_body_text(metrics_text))
    
    metrics_list = [
        ["Metric Name", "Type", "Source", "Labels", "Dashboard Use", "Alert Threshold"],
        ["kong_http_requests_total", "Counter", "Kong (statsd exporter)", "method, route, service, status_code, consumer, tenant_id", "Request volume trends; Error rate calculation; Route popularity", "Error rate > 1% (warning); > 5% (critical)"],
        ["kong_request_latency_seconds", "Histogram", "Kong (statsd exporter)", "route, service (le: 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10)", "Latency P50/P95/P99; Slow endpoint identification; SLA tracking", "P99 > 500ms (warning); P99 > 2s (critical)"],
        ["kong_upstream_health", "Gauge", "Kong (health check plugin)", "upstream, target, zone", "Backend instance health; Capacity planning; Failover visibility", "Any unhealthy target (warning); >20% unhealthy (critical)"],
        ["istio_requests_total", "Counter", "Envoy (Prometheus mixer)", "source_app, destination_app, source_version, destination_version, response_code, connection_security_policy", "Service mesh traffic matrix; mTLS coverage; Inter-service dependency map", "Non-mTLS traffic (warning); 5xx rate > 0.1% (critical)"],
        ["keycloak_logins_total", "Counter", "Keycloak (metrics endpoint)", "result (success, error), client_id, auth_method, oidc_flow", "Authentication volume; Failure analysis; Method distribution", "Failure rate > 5% (warning); > 15% (critical)"],
        ["keycloak_user_sessions_active", "Gauge", "Keycloak (session store)", "realm, client_id", "Concurrent user sessions; License utilization; Load planning", "Approaching seat limit (80% warning; 95% critical)"],
        ["redis_connected_clients", "Gauge", "Redis (exporter)", "Instance (master/replica)", "Redis connection load; Capacity headroom; Connection leak detection", "> 1000 connections (warning); Max clients * 0.8 (critical)"],
        ["ssl_cert_expiry_timestamp", "Gauge", "cert-manager (metrics)", "certificate_name, namespace", "Certificate lifecycle management; Renewal verification", "< 30 days (warning); < 7 days (critical)"],
        ["ratelimit_tokens_remaining", "Gauge", "Custom (Redis exporter)", "dimension (global/user/tenant/key), window", "Quota consumption tracking; Overage prediction; Fairness monitoring", "< 20% remaining (info); 0 (block active)"],
    ]
    elements.append(create_table(metrics_list, col_widths=[1.6*inch, 0.6*inch, 1.2*inch, 1.4*inch, 1.3*inch, 1.4*inch]))
    elements.append(Spacer(1, 0.15*inch))
    
    # Distributed Tracing
    elements.append(create_section_header("8.2 Distributed Tracing"))
    
    tracing_text = """
    Distributed tracing captures the complete journey of a request as it flows through the gateway, 
    mesh, and backend services, enabling root-cause analysis of latency issues and understanding 
    of complex service interactions. The trace context propagates via W3C Trace Context headers 
    (traceparent, tracestate) injected by Kong and carried by Istio through all downstream calls. 
    Traces are sent to Jaeger (or compatible backend like Tempo/Grafana Cloud) with configurable 
    sampling rates (100% for errors, 10% for slow requests, 1% for normal traffic in production).
    """
    elements.append(create_body_text(tracing_text))
    
    tracing_config = [
        ["Component", "Tracing Setup", "Span Attributes", "Sampling Policy", "Retention"],
        ["Kong Gateway", "OpenTelemetry plugin -> Jaeger Collector", "http.method, http.route, http.status_code, kong.consumer_id, kong.service.name, error.message", "Always sample: errors (5xx), auth failures, rate limit hits; Probabilistic: 10% success; Tail-based: specific routes/users", "7 days (hot), 30 days (warm), archive (cold)"],
        ["Istio Sidecar (Envoy)", "Built-in Jaeger tracer (enabled via mesh config)", "source.namespace, source.workload, destination.namespace, destination.workload, request.protocol, response.flags, duration", "Sample: 1% default; Override per workload via SpanAnnotations; Always: errors, faults", "Same as above (unified backend)"],
        ["Backend Services", "OpenTelemetry SDK (language-specific) -> Jaeger Collector", "service.name, operation.name, db.statement (sanitized), http.url (redacted), error.type, custom.business_fields", "Inherit parent sampling; Can override (force trace for important ops); Propagate to downstream (DB, cache, ext API)", "Same as above"],
        ["Keycloak (Auth)", "Keycloak Quarkus OTel integration -> Jaeger Collector", "event_type (login, logout, token_refresh), client_id, realm, auth_method, result (success/fail/error), user_id (hashed)", "Always: failures, MFA events, admin actions; Probabilistic: 5% successful logins", "Same as above; Extended retention for auth events (90 days)"],
    ]
    elements.append(create_table(tracing_config, col_widths=[1.2*inch, 1.4*inch, 1.8*inch, 1.5*inch, 1.2*inch]))
    elements.append(Spacer(1, 0.15*inch))
    
    # Alerting Rules
    elements.append(create_section_header("8.3 Alerting Rules and Runbooks"))
    
    alerting_text = """
    Alerting rules translate metric conditions into actionable notifications, ensuring that operators 
    are informed of conditions requiring human intervention before they impact users. Alerts are 
    defined in PrometheusRule CRDs (for Kubernetes-native workflow) with severity levels 
    (critical, warning, info) that determine notification channels (PagerDuty for critical, Slack 
    for warning, email for info). Each alert links to a runbook documenting investigation steps 
    and remediation actions.
    """
    elements.append(create_body_text(alerting_text))
    
    alerts = [
        ["Alert Name", "Severity", "Expression (simplified)", "Condition", "Notification Channel", "Runbook Summary"],
        ["KongHighErrorRate", "Critical", 'rate(kong_http_requests_total{status=~"5.."}[5m]) / rate(kong_http_requests_total[5m]) > 0.05', "5xx error rate > 5% for 5 minutes", "PagerDuty (on-call) + Slack (#platform-alerts)", "1. Check Kong logs for error patterns; 2. Identify failing upstream; 3. Verify upstream health; 4. If upstream issue, scale or failover; 5. If Kong issue, restart pods"],
        ["KongLatencyP99High", "Warning", "histogram_quantile(0.99, rate(kong_request_latency_seconds_bucket[5m])) > 2", "P99 latency > 2 seconds for 5 minutes", "Slack (#platform-alerts) + Email (team distro)", "1. Identify slow routes (top N by latency); 2. Check upstream response times; 3. Review recent deployments (regression?); 4. Check resource utilization (CPU/memory); 5. Enable detailed tracing for slow routes"],
        ["AuthFailureSpike", "Critical", 'increase(keycloak_logins_total{result="error"}[15m]) > 100 AND rate(keycloak_logins_total{result="error"}[15m]) > 0.1/sec', "Auth failures increased >100 in 15min AND rate >0.1/sec", "PagerDuty (on-call) + Slack (#security-alerts)", "1. Check for brute force (group by IP); 2. Review if legitimate (password reset campaign?); 3. If attack: enable CAPTCHA, Geo-block, rate tighten; 4. Notify affected users (password change advisory)"],
        ["CertificateExpiringSoon", "Warning", "ssl_cert_expiry_timestamp - time() < 86400 * 7", "Any certificate expires within 7 days", "Email (security team) + Slack (#ops-reminder)", "1. Identify expiring certificate (domain/name); 2. Check cert-manager renewal logs; 3. Manual renewal if auto-renewal failed; 4. Update dependencies if cert changed; 5. Schedule post-mortem if auto-renewal broken"],
        ["RateLimitBreached", "Info", 'ratelimit_tokens_remaining{dimension="global"} == 0 OR ratelimit_tokens_remaining{dimension="tenant"} < 0.1 * ratelimit_tokens_limit{dimension="tenant"}', "Global or per-tenant rate limit exhausted (>90% used or fully depleted)", "Slack (#ops-info) + Dashboard annotation", "1. Identify hitting tenant/user; 2. Check for abuse (automated scraper?) or legitimate growth; 3. If abuse: block/throttle offending IPs; 4. If growth: contact tenant about upgrade; 5. Adjust limits if warranted"],
        ["RedisMemoryHigh", "Warning", "redis_memory_used_bytes / redis_memory_max_bytes > 0.85", "Redis memory usage > 85%", "Slack (#infra-alerts) + Email (DBA team)", "1. Check Redis INFO memory breakdown; 2. Identify large keys (MEMORY USAGE); 3. Review TTL settings (expired keys not evicting?); 4. Scale Redis cluster if needed; 5. Check for memory leak (growth trend)"],
        ["MeshMTLSMismatch", "Critical", 'istio_tcp_connections_opened{connection_security_policy!="mtls"} > 0', "Non-mTLS connections detected in STRICT mode namespace", "PagerDuty (security-on-call) + Slack (#security-alerts)", "1. Identify source/destination of plaintext conn; 2. Check PeerAuthentication policy; 3. Verify sidecar injection (kubectl get pod -o jsonpath='{.spec.containers[*].name}' | grep istio-proxy); 4. If misconfigured: fix and restart; 5. If bypass attempt: security incident"],
    ]
    elements.append(create_table(alerts, col_widths=[1.2*inch, 0.7*inch, 1.8*inch, 1.3*inch, 1.3*inch, 1.3*inch]))
    
    elements.append(PageBreak())
    return elements

def build_implementation_roadmap():
    elements = []
    
    elements.append(Paragraph("9. IMPLEMENTATION ROADMAP", styles['ChapterTitle']))
    elements.append(Spacer(1, 0.2*inch))
    
    intro_text = """
    The following roadmap outlines the phased implementation approach for the API Gateway and 
    Authentication architecture, sequencing work items to deliver incremental value while managing 
    dependencies. The timeline assumes a dedicated team of 2 backend engineers, 1 DevOps/SRE engineer, 
    and 0.5 security engineer working over approximately 10-14 weeks. Integration points with the 
    Admin Interface (Phase 1A) and backend services are called out explicitly.
    """
    elements.append(create_body_text(intro_text))
    
    phases = [
        ["Phase", "Duration", "Deliverables", "Dependencies", "Success Criteria"],
        ["Phase 1: Foundation\n(Weeks 1-2)", "2 weeks", "- Kong Gateway deployment (K8s)\n- Basic auth plugin (JWT validation)\n- Redis cluster for state\n- TLS termination + cert-manager\n- Health check endpoints", "K8s cluster ready; DNS configured; Certificates (wildcard or SAN) obtained", "Gateway accepts HTTPS traffic; JWT validation works; Health endpoints return 200; Redis connected"],
        ["Phase 2: Identity Provider\n(Weeks 3-5)", "3 weeks", "- Keycloak deployment (HA PostgreSQL)\n- User import/migration scripts\n- OIDC client registrations\n- First-party login flow working\n- MFA (TOTP) enrollment and validation", "Database schema finalized; User directory source identified (LDAP/AD or fresh); Email SMTP configured", "Users can log in via Keycloak; MFA enforced; JWT tokens issued with correct claims; Refresh token flow works"],
        ["Phase 3: Gateway Hardening\n(Weeks 6-8)", "3 weeks", "- Complete plugin suite (ACL, rate-limit, audit, tenant-router)\n- Rate limiting by tier (from LMS)\n- WAF rule deployment (ModSecurity CRS)\n- CORS policy configuration\n- Request/response transformation", "Phase 2 complete (auth working); LMS API available for tier lookup; Security rule set reviewed", "All API endpoints protected; Rate limits enforced per tier; WAF blocks test attacks; CORS headers correct; Audit events flowing"],
        ["Phase 4: Service Mesh\n(Weeks 9-10)", "2 weeks", "- Istio installation (profile: demo or production)\n- Sidecar injection for api namespaces\n- mTLS (STRICT mode) for internal traffic\n- Kiali dashboard for visualization\n- Traffic policies (timeouts, retries)", "K8s cluster has sufficient resources for sidecars (~128MB per pod); Application pods tolerations configured", "mTLS working between services; Kiali shows traffic graph; Timeouts prevent hangs; Circuit breakers trip correctly"],
        ["Phase 5: Observability\n(Weeks 11-12)", "2 weeks", "- Prometheus scraping (Kong, Istio, Keycloak, apps)\n- Grafana dashboards (gateway, auth, mesh overview)\n- Jaeger tracing (sampling configured)\n- AlertManager rules (this spec)\n- Runbook documentation", "Phases 1-4 complete (things to monitor); PagerDuty/Slack webhook URLs; On-call rotation defined", "Dashboards show real data; Alerts fire for test conditions; Traces visible in Jaeger; Runbooks linked from alerts"],
        ["Phase 6: Testing & Launch\n(Weeks 13-14)", "2 weeks", "- Load testing (target: 10K RPS)\n- Penetration test (scope: gateway + auth)\n- Chaos engineering (kill pods, simulate failures)\n- Documentation (runbooks, API ref for auth)\n- Production cutover plan", "Staging environment mirrors production; Pen test vendor engaged; Load test tooling ready (k6/locust)", "Load test passes (latency SLOs met); Pen test findings resolved; Chaos tests pass; Docs reviewed; Go-live approved"],
    ]
    elements.append(create_table(phases, col_widths=[1.0*inch, 0.7*inch, 1.8*inch, 1.4*inch, 1.8*inch]))
    elements.append(Spacer(1, 0.2*inch))
    
    # Testing Strategy
    elements.append(create_section_header("9.1 Testing Strategy"))
    
    testing_text = """
    Comprehensive testing validates that the gateway and authentication system meet functional 
    requirements, performance targets, and security standards before production deployment. The 
    testing strategy spans unit tests (individual plugin logic), integration tests (end-to-end 
    flows through gateway), load tests (performance under stress), security tests (vulnerability 
    assessment and penetration testing), and chaos tests (resilience under failure conditions).
    """
    elements.append(create_body_text(testing_text))
    
    testing_matrix = [
        ["Test Type", "Tools", "Scope", "Coverage Target", "Execution Timing", "Owner"],
        ["Unit Tests", "pytest (Python for custom plugins); go test (Go services)", "Individual plugin logic; Token validation; Rate limit math; Header parsing", ">90% code coverage; Critical paths 100%", "CI/CD: Every PR; Pre-merge gate", "Backend developers"],
        ["Integration Tests", "Postman/Newman collections; k6 scripts; pytest with httpx", "Full auth flows (login->token->API call); Rate limit enforcement; Plugin chaining; Error responses", "All happy-path + error scenarios; All grant types; All error codes", "CI/CD: Every PR; Nightly regression", "QA engineer + Backend devs"],
        ["Load Tests", "k6 (recommended); Locust; wrk", "Gateway throughput (RPS); Latency percentiles under load; Connection handling; Memory/CPU scaling", "Sustain 10K RPS with P99 <200ms; Test scaling to 2x expected peak", "Pre-release (Phase 6); After significant changes", "SRE / Performance engineer"],
        ["Penetration Test", "External vendor (e.g., Coalfire, NCC Group, Synack); Internal Burp Suite scans", "OWASP API Top 10; OWASP Web Top 10; Auth bypass attempts; Business logic flaws; Data exposure", "Zero HIGH/CRITICAL findings; LOW/INFO acceptable with remediation plan", "Pre-production (Phase 6); Annually thereafter", "Security team + External vendor"],
        ["Chaos Tests", "Chaos Monkey (Gremlin or Litmus); istioctl故障注入; Manual pod deletion", "Gateway pod crash (session persistence?); Redis failure (fallback behavior); IdP outage (graceful degradation?); Network partition (split brain?)", "No data loss; Automatic recovery <5min (P0); Clear error messages to users", "Pre-release (Phase 6); Quarterly production (carefully)", "SRE / Reliability engineer"],
    ]
    elements.append(create_table(testing_matrix, col_widths=[1.0*inch, 1.4*inch, 1.6*inch, 1.4*inch, 1.2*inch, 1.0*inch]))
    
    elements.append(PageBreak())
    return elements

def build_appendices():
    elements = []
    
    # Appendix A: Configuration Reference
    elements.append(Paragraph("APPENDIX A: CONFIGURATION REFERENCE", styles['ChapterTitle']))
    elements.append(Spacer(1, 0.2*inch))
    
    appendix_a_text = """
    This appendix provides quick-reference configuration snippets for the key components described 
    in this specification. These examples illustrate typical production configurations but should be 
    adapted to specific deployment requirements, organizational policies, and environment constraints.
    All sensitive values (keys, passwords, secrets) should be externalized to Vault or Kubernetes 
    Secrets and never committed to version control.
    """
    elements.append(create_body_text(appendix_a_text))
    
    config_examples = [
        ["Component", "Configuration File/Location", "Key Parameters", "Example Snippet (redacted)"],
        ["Kong Gateway (kong.conf)", "/etc/kong/kong.conf (ConfigMap)", "worker_processes, pg_host, redis_addr, plugins, ssl_cert/ssl_cert_key", "worker_processes auto;\npg_host = postgres.cybersoc.svc.cluster.local\nredis_addr = redis.cybersoc.svc.cluster.local:6379\nplugins = bundled, custom-audit, custom-acl, custom-tenant-router"],
        ["Kong Declarative Config", "kubernetes ConfigMap or DB-less /config endpoint", "services, routes, plugins (per-route/global)", "{\n  \"services\": [{\"name\": \"cybersoc-api\", \"host\": \"api-backend\", \"port\": 8080}],\n  \"routes\": [{\"name\": \"api-v1\", \"service\": \"cybersoc-api\", \"paths\": [\"/api/v1\"]}],\n  \"plugins\": [{\"name\": \"jwt\", \"config\": {...}}, {\"name\": \"acl\", ...}]\n}"],
        ["Keycloak (realm settings)", "Keycloak Admin Console -> Realm Settings", "Enabled actions, Token lifetimes, Themes, SMTP", "Access Token Lifespan: 900 (15 min)\nRefresh Token Lifespan: 604800 (7 days)\nTheme: cyberSOC (custom)\nSMTP: smtp-relay.cybersoc.internal:587"],
        ["Keycloak (Client config)", "Keycloak Admin Console -> Clients", "Valid Redirect URIs, Web Origins, Client Auth, Protocol Mappers", "Client ID: cybersoc-web-app\nValid Redirect URIs: https://app.cybersoc.platform/*\nClient Auth: client_secret_post\nProtocol Mapper: tenant_id (from user attr)"],
        ["Istio (mesh config)", "istio-system namespace (IstioOperator CRD or yaml)", "mTLS mode, tracing sampler, outbound traffic policy", "apiVersion: install.istio.io/v1alpha1\nkind: IstioOperator\nspec:\n  meshConfig:\n    accessLogFile: /dev/stdout\n    defaultConfig:\n      tracing:\n        sampling: 100.0\n      proxyStatsMatcher: inclusionPrefixes: [...]"],
        ["Prometheus (scrape configs)", "prometheus.yml ConfigMap", "Scrape intervals, target discovery, relabeling", "scrape_configs:\n  - job_name: 'kong'\n    kubernetes_sd_configs: [...]\n    relabel_labels: [__meta_kubernetes_pod_label_app=kong]\n    scrape_interval: 15s"],
        ["AlertManager (routes)", "alertmanager.yml ConfigMap", "Routing tree, group_by, receivers, inhibit rules", "routes:\n  - receiver: 'pagerduty-critical'\n    match:\n      severity: critical\n  - receiver: 'slack-warning'\n    match:\n      severity: warning"],
    ]
    elements.append(create_table(config_examples, col_widths=[1.1*inch, 1.4*inch, 1.5*inch, 2.5*inch]))
    
    elements.append(PageBreak())
    
    # Appendix B: Error Response Schema
    elements.append(Paragraph("APPENDIX B: ERROR RESPONSE SCHEMA", styles['ChapterTitle']))
    elements.append(Spacer(1, 0.2*inch))
    
    appendix_b_text = """
    All API errors follow RFC 7807 Problem Details for HTTP APIs format, providing machine-readable 
    error structure that enables programmatic error handling by client applications. This appendix 
    documents the standard error response schema, common error types, and recommended client-side 
    handling strategies for each error category.
    """
    elements.append(create_body_text(appendix_b_text))
    
    error_schema = [
        ["Field", "Type", "Required", "Description", "Example"],
        ["type", "URI (string)", "Yes", "Error type identifier (link to docs or urn:uuid)", "\"urn:cybersoc:error:invalid-token\""],
        ["title", "string", "Yes", "Human-readable error summary", "\"Invalid or expired authentication token\""],
        ["status", "integer", "Yes", "HTTP status code (matches response)", "401"],
        ["detail", "string", "No", "Specific error details (may include PII in dev, sanitized in prod)", "\"Token expired at 2024-08-24T15:30:00Z; Issuer mismatch\""],
        ["instance", "URI (string)", "No", "Reference to specific resource occurrence (request ID for lookup)", "\"/errors/abc123-def456\""],
        ["trace_id", "string (UUID)", "Yes (tracing enabled)", "Correlation ID for log/tracing lookup", "\"a1b2c3d4-e5f6-7890-abcd-ef1234567890\""],
        ["timestamp", "datetime (ISO 8601)", "Yes", "When the error occurred", "\"2024-08-24T15:30:05.123Z\""],
        ["errors", "array (object)", "No (validation errors)", "List of field-level errors (for 400 Bad Request)", "[{\"field\": \"email\", \"message\": \"Invalid email format\"}]"],
        ["retry_after", "integer (seconds)", "No (rate limited)", "Seconds until client should retry", "60"],
        ["documentation_url", "URI (string)", "No", "Link to help documentation for this error", "\"https://docs.cybersoc.platform/errors/E001\""],
    ]
    elements.append(create_table(error_schema, col_widths=[0.9*inch, 1.0*inch, 0.6*inch, 1.8*inch, 2.2*inch]))
    elements.append(Spacer(1, 0.15*inch))
    
    error_types = [
        ["Error Type URN", "HTTP Status", "Title", "When Returned", "Client Action"],
        ["urn:cybersoc:error:invalid-token", "401", "Invalid or Expired Token", "JWT signature invalid; expired; issuer unknown; audience mismatch", "Clear stored token; Redirect to login; Obtain fresh token"],
        ["urn:cybersoc:error:insufficient-scope", "403", "Insufficient Permissions", "JWT lacks required scope for requested resource", "Inform user of missing permission; Guide to request access; Contact admin"],
        ["urn:cybersoc:error:rate-limit-exceeded", "429", "Rate Limit Exceeded", "Client exceeded configured rate limit (global/user/tenant)", "Wait Retry-After seconds; Implement exponential backoff; Display countdown"],
        ["urn:cybersoc:error:quota-exhausted", "429", "Quota Exhausted", "Tenant/user consumed entire allocated quota for period", "Wait for reset (header shows when); Request limit increase; Upgrade plan"],
        ["urn:cybersoc:error:validation-failed", "400", "Validation Error", "Request body fails schema validation; Required field missing; Type/format mismatch", "Display field errors from errors[] array; Correct and resubmit"],
        ["urn:cybersoc:error:not-found", "404", "Resource Not Found", "Requested resource (user, tenant, config) does not exist or was deleted", "Verify resource ID; Handle 404 gracefully in UI; Offer search/create alternatives"],
        ["urn:cybersoc:error:conflict", "409", "Conflict", "Create with duplicate unique field; Concurrent modification; State mismatch", "Reload resource; Merge changes manually; Inform user of conflict; Offer overwrite option"],
        ["urn:cybersoc:error:upstream-error", "502/503/504", "Upstream Service Error", "Backend service unavailable; Timeout; Connection refused; Unhealthy", "Display friendly error; Offer retry; Show estimated downtime (if known); Notify ops automatically"],
        ["urn:cybersoc:error:mfa-required", "401", "MFA Required", "User enrolled in MFA but didn't provide second factor; Step-up auth needed", "Prompt for MFA code/WebAuthn; Redirect to MFA verification page"],
        ["urn:cybersoc:error:account-locked", "403", "Account Locked", "Too many failed attempts; Admin lockout; Suspicious activity detected", "Show lockout message; Provide unlock/contact options; Log security event"],
    ]
    elements.append(create_table(error_types, col_widths=[1.5*inch, 0.7*inch, 1.1*inch, 1.8*inch, 1.6*inch]))
    
    elements.append(PageBreak())
    
    # Appendix C: Security Checklist
    elements.append(Paragraph("APPENDIX C: PRE-LAUNCH SECURITY CHECKLIST", styles['ChapterTitle']))
    elements.append(Spacer(1, 0.2*inch))
    
    appendix_c_text = """
    This checklist must be completed and signed off by the security team before the API Gateway and 
    Authentication system can be deployed to production. Items are organized by criticality, with 
    all CRITICAL items requiring explicit sign-off. WARNING items should be addressed or formally 
    accepted as risk with documented mitigation timeline. INFO items represent best practices that 
    strengthen security posture but are not blocking for launch.
    """
    elements.append(create_body_text(appendix_c_text))
    
    checklist = [
        ["#", "Item", "Criticality", "Status", "Sign-off", "Evidence/Notes"],
        ["1", "TLS 1.2/1.3 only (no SSLv3/TLS 1.0/1.1)", "CRITICAL", "☐ Pass ☐ Fail ☐ Waived", "Cipher scan results (SSL Labs A+ grade)"],
        ["2", "HSTS header enabled with max-age >= 31536000 (1 year)", "CRITICAL", "☐ Pass ☐ Fail ☐ Waived", "curl -I output showing Strict-Transport-Security header"],
        ["3", "All authentication endpoints enforce MFA for admin roles", "CRITICAL", "☐ Pass ☐ Fail ☐ Waived", "Test login with admin account; verify MFA prompt appears"],
        ["4", "JWT signing keys rotated within last 90 days; Old keys retained for validation", "CRITICAL", "☐ Pass ☐ Fail ☐ Waived", "Keycloak keys list showing issue/expiration dates; JWKS endpoint"],
        ["5", "Rate limiting enforced for all endpoints (including auth)", "CRITICAL", "☐ Pass ☐ Fail ☐ Waived", "Load test showing 429 responses after threshold; No unthrottled endpoints found"],
        ["6", "CORS policy restrictive (no wildcard * for credentialed requests)", "CRITICAL", "☐ Pass ☐ Fail ☐ Waived", "OPTIONS preflight response headers; Cross-origin test cases pass"],
        ["7", "WAF enabled with OWASP CRS (Paranoia Level 1 minimum)", "CRITICAL", "☐ Pass ☐ Fail ☐ Waived", "WAF dashboard showing rules loaded; Test attacks blocked"],
        ["8", "Security headers complete (CSP, X-Frame-Options, X-Content-Type-Options)", "WARNING", "☐ Pass ☐ Fail ☐ Waived", "securityheaders.com scan or curl -I header inspection"],
        ["9", "Error messages sanitize internal details (stack traces, SQL, IPs)", "WARNING", "☐ Pass ☐ Fail ☐ Waived", "Trigger various errors; Inspect response bodies for leaks"],
        ["10", "Audit logging enabled for all auth events and admin actions", "WARNING", "☐ Pass ☐ Fail ☐ Waived", "Elasticsearch query showing events for test actions; Log integrity verified"],
        ["11", "Brute force protection active (account lockout after N failures)", "WARNING", "☐ Pass ☐ Fail ☐ Waived", "Failed login test (N+1 times); Account locked; Timer visible"],
        ["12", "Session management: Secure; HttpOnly; SameSite cookies", "WARNING", "☐ Pass ☐ Fail ☐ Waived", "Browser DevTools > Application > Cookies; Inspect attributes"],
        ["13", "Dependency vulnerability scan completed (0 CRITICAL/HIGH)", "WARNING", "☐ Pass ☐ Fail ☐ Waived", "Trivy/Snyk scan report; Remediation or acceptance for findings"],
        ["14", "Penetration test completed (0 CRITICAL/HIGH findings)", "CRITICAL", "☐ Pass ☐ Fail ☐ Waived", "Pen test report executive summary; Findings remediation evidence"],
        ["15", "Disaster recovery tested (failover to DR site < 5 min RTO)", "INFO", "☐ Pass ☐ Fail ☐ N/A", "DR test runbook; Timestamps of failover/failback; RTO/RPO achieved"],
        ["16", "Incident response playbook exists and team trained", "INFO", "☐ Pass ☐ Fail ☐ N/A", "Playbook document link; Training attendance records; Tabletop exercise date"],
    ]
    elements.append(create_table(checklist, col_widths=[0.3*inch, 2.8*inch, 0.8*inch, 1.2*inch, 1.0*inch, 1.5*inch]))
    
    return elements

# ============================================================================
# MAIN DOCUMENT BUILD
# ============================================================================
def build_document():
    """Assemble the complete PDF document"""
    
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
    
    story = []
    
    # Cover page
    story.extend(build_cover_page())
    
    # Table of Contents
    story.extend(build_toc())
    
    # Main content chapters
    story.extend(build_executive_summary())
    story.extend(build_architecture_overview())
    story.extend(build_oauth_oidc_implementation())
    story.extend(build_api_gateway_architecture())
    story.extend(build_rate_limiting())
    story.extend(build_service_mesh())
    story.extend(build_security_controls())
    story.extend(build_monitoring())
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
