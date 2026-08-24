#!/usr/bin/env python3
"""
CyberSOC Platform - API Gateway & Authentication Architecture
=============================================================
Complete authentication system design with OAuth 2.0/OIDC,
API gateway configuration, and security infrastructure.
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

FONT_DIR = '/usr/share/fonts'
pdfmetrics.registerFont(TTFont('NotoSerifSC', f'{FONT_DIR}/truetype/noto-serif-sc/NotoSerifSC-Regular.ttf'))
pdfmetrics.registerFont(TTFont('NotoSerifSC-Bold', f'{FONT_DIR}/truetype/noto-serif-sc/NotoSerifSC-Bold.ttf'))
registerFontFamily('NotoSerifSC', normal='NotoSerifSC', bold='NotoSerifSC-Bold')
pdfmetrics.registerFont(TTFont('SarasaMonoSC', f'{FONT_DIR}/truetype/chinese/SarasaMonoSC-Regular.ttf'))

PAGE_BG       = colors.HexColor('#f2f1f0')
SECTION_BG    = colors.HexColor('#ebeae9')
CARD_BG       = colors.HexColor('#efeeec')
TABLE_STRIPE  = colors.HexColor('#f5f5f3')
HEADER_FILL   = colors.HexColor('#6f6751')
BORDER        = colors.HexColor('#cfc9b8')
ICON          = colors.HexColor('#9e8847')
ACCENT        = colors.HexColor('#8d7325')
TEXT_PRIMARY   = colors.HexColor('#242320')
TEXT_MUTED     = colors.HexColor('#8a8881')

styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name='DocTitle', fontName='NotoSerifSC-Bold', fontSize=24, leading=32,
    alignment=TA_CENTER, textColor=TEXT_PRIMARY, spaceAfter=10*mm))
styles.add(ParagraphStyle(name='Subtitle', fontName='NotoSerifSC', fontSize=12, leading=17,
    alignment=TA_CENTER, textColor=TEXT_MUTED, spaceAfter=6*mm))
styles.add(ParagraphStyle(name='SectionHeading', fontName='NotoSerifSC-Bold', size=15, leading=22,
    textColor=HEADER_FILL, spaceBefore=14*pt, spaceAfter=8*pt))
styles.add(ParagraphStyle(name='SubsectionHeading', fontName='NotoSerifSC-Bold', size=12, leading=17,
    textColor=ICON, spaceBefore=10*pt, spaceAfter=6*pt))
styles.add(ParagraphStyle(name='CustomBody', fontName='NotoSerifSC', size=9.5, leading=16,
    alignment=TA_JUSTIFY, textColor=TEXT_PRIMARY, spaceBefore=3*pt, spaceAfter=6*pt, firstLineIndent=16*pt))
styles.add(ParagraphStyle(name='BodyNoIndent', fontName='NotoSerifSC', size=9.5, leading=16,
    alignment=TA_JUSTIFY, textColor=TEXT_PRIMARY, spaceBefore=3*pt, spaceAfter=6*pt))
styles.add(ParagraphStyle(name='TableHeader', fontName='NotoSerifSC-Bold', size=8.5, leading=11,
    alignment=TA_CENTER, textColor=colors.white))
styles.add(ParagraphStyle(name='TableCell', fontName='NotoSerifSC', size=8.5, leading=11,
    alignment=TA_LEFT, textColor=TEXT_PRIMARY))
styles.add(ParagraphStyle(name='TableCellCenter', fontName='NotoSerifSC', size=8.5, leading=11,
    alignment=TA_CENTER, textColor=TEXT_PRIMARY))
styles.add(ParagraphStyle(name='TechText', fontName='SarasaMonoSC', size=8, leading=11,
    alignment=TA_LEFT, textColor=TEXT_PRIMARY, backColor=CARD_BG, borderPadding=4*pt))
styles.add(ParagraphStyle(name='BulletText', fontName='NotoSerifSC', size=9, leading=14,
    alignment=TA_LEFT, textColor=TEXT_PRIMARY, leftIndent=12*pt, bulletIndent=4*pt))
styles.add(ParagraphStyle(name='Caption', fontName='NotoSerifSC', size=8, leading=11,
    alignment=TA_CENTER, textColor=TEXT_MUTED, spaceAfter=6*pt))

OUTPUT_DIR = '/home/z/my-project/download'
output_path = os.path.join(OUTPUT_DIR, 'Cybersoc_API_Gateway_Auth_Architecture.pdf')

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

# COVER PAGE
story.append(Spacer(1, 30*mm))
story.append(Paragraph("CyberSOC Platform", styles['DocTitle']))
story.append(Spacer(1, 3*mm))
story.append(Paragraph("API Gateway & Authentication Architecture", styles['DocTitle']))
story.append(Spacer(1, 5*mm))
story.append(Paragraph(
    "Secure Access Infrastructure Design<br/>"
    "OAuth 2.0 | OIDC | SSO | mTLS | API Security",
    styles['Subtitle']
))
story.append(Spacer(1, 10*mm))

cover_info = [
    [Paragraph("<b>Document Type</b>", styles['TableHeader']), 
     Paragraph("Technical Architecture", styles['TableCellCenter'])],
    [Paragraph("<b>Version</b>", styles['TableHeader']), 
     Paragraph("1.0.0", styles['TableCellCenter'])],
    [Paragraph("<b>Date</b>", styles['TableHeader']), 
     Paragraph(datetime.now().strftime("%Y-%m-%d"), styles['TableCellCenter'])],
    [Paragraph("<b>Component</b>", styles['TableHeader']), 
     Paragraph("Phase 1 - Critical Path Item #2", styles['TableCellCenter'])],
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

# SECTION 1: INTRODUCTION
story.append(Paragraph("1. Introduction & Architecture Overview", styles['SectionHeading']))

add_paragraph(
    "The API Gateway and Authentication Architecture forms the security foundation for all CyberSOC Platform access, "
    "implementing zero-trust principles where every request carries verifiable credentials and authorization decisions "
    "occur at multiple enforcement points throughout the request lifecycle. This architecture addresses authentication "
    "(verifying identity), authorization (determining permitted actions), and accounting (logging all access for audit "
    "and compliance). The design supports diverse client types including browser-based admin interfaces, mobile applications, "
    "partner integrations via APIs, and service-to-service communication within the platform microservices architecture."
)

add_paragraph(
    "The architecture follows industry best practices for identity and access management while addressing specific "
    "requirements of cybersecurity platforms handling sensitive operational data. Multi-factor authentication is mandatory "
    "for all administrative access, session management implements appropriate timeouts and secure token handling, and "
    "the API gateway provides unified enforcement of rate limiting, request validation, and threat mitigation rules. "
    "Integration with enterprise identity providers through standard protocols (OAuth 2.0, OpenID Connect, SAML) enables "
    "seamless adoption within existing corporate identity management infrastructures."
)

arch_overview = [
    [Paragraph("<b>Layer</b>", styles['TableHeader']),
     Paragraph("<b>Components</b>", styles['TableHeader']),
     Paragraph("<b>Protocol/Technology</b>", styles['TableHeader']),
     Paragraph("<b>Function</b>", styles['TableHeader'])],
    ["Identity Providers", "Okta, Azure AD, Auth0, LDAP", "OIDC, SAML 2.0, LDAP", "External identity verification"],
    ["Authentication Service", "IDP Proxy, MFA Provider", "OAuth 2.0, TOTP, FIDO2", "Token issuance, credential validation"],
    ["Session Management", "Redis Cluster, JWT Store", "JWT, Refresh Tokens", "Session state, SSO coordination"],
    ["API Gateway", "Kong / Ambassador / AWS API GW", "REST, gRPC, WebSocket", "Request routing, policy enforcement"],
    ["Authorization Engine", "OPA / Casbin / Custom", "Rego, ABAC policies", "Permission evaluation"],
    ["Service Mesh", "Istio Linkerd", "mTLS, SPIFFE", "Service-to-service auth"],
    ["Audit Layer", "Event Pipeline", "Async logging", "Immutable access records"],
]

arch_table = create_section_table(arch_overview,
    col_widths=[35*mm, 48*mm, 42*mm, 45*mm])
story.append(arch_table)
story.append(Paragraph("Table 1.1: Authentication Architecture Layers", styles['Caption']))
story.append(PageBreak())

# SECTION 2: AUTHENTICATION FLOWS
story.append(Paragraph("2. Authentication Flows", styles['SectionHeading']))

add_paragraph(
    "The CyberSOC platform supports multiple authentication flows optimized for different client types and use cases. "
    "Browser-based applications utilize Authorization Code Flow with PKCE for enhanced security, preventing token "
    "interception during the OAuth dance. Server-side and machine-to-machine clients employ Client Credentials flow "
    "obtaining tokens directly without user interaction. Mobile applications may use Authorization Code Flow with PKCE "
    "or device authorization grant depending on device capabilities. All flows produce JWT access tokens containing "
    "standardized claims (sub, iss, exp, aud, scope) plus CyberSOC-specific claims encoding role, tenant context, "
    "and feature entitlements."
)

story.append(Paragraph("2.1 Browser Authentication (Authorization Code + PKCE)", styles['SubsectionHeading']))

browser_flow = [
    [Paragraph("<b>Step</b>", styles['TableHeader']),
     Paragraph("<b>Action</b>", styles['TableHeader']),
     Paragraph("<b>Details</b>", styles['TableHeader']),
     Paragraph("<b>Security Measures</b>", styles['TableHeader'])],
    ["1", "Initiate Login", "Redirect to IDP with code_challenge", "State parameter, nonce"],
    ["2", "User Authenticates", "IDP handles credentials + MFA", "IDP-specific (TOTP, WebAuthn)"],
    ["3", "Authorization Grant", "IDP redirects with authorization code", "Short-lived code (60s), HTTPS only"],
    ["4", "Token Exchange", "Backend exchanges code for tokens", "PKCE verification, client auth"],
    ["5", "Session Established", "Access + refresh tokens stored securely", "HttpOnly, Secure, SameSite cookies"],
    ["6", "API Access", "Requests include Bearer token", "Token validation per request"],
]

browser_table = create_section_table(browser_flow,
    col_widths=[15*mm, 32*mm, 52*mm, 52*mm])
story.append(browser_table)
story.append(Paragraph("Table 2.1: Browser Authentication Flow", styles['Caption']))

story.append(Paragraph("2.2 Service-to-Service Authentication (mTLS)", styles['SubsectionHeading']))

add_paragraph(
    "Internal microservices authenticate using mutual TLS (mTLS) where both client and server present certificates "
    "verified against a common trust anchor. The service mesh (Istio or Linkerd) manages certificate lifecycle "
    "including automatic rotation, eliminating manual key management overhead. Each service receives a SPIFFE-verifiable "
    "identity document encoding service name, namespace, and trust domain in X.509 certificate extensions. This "
    "identity propagates upstream enabling end-to-end attribution of requests to originating service without "
    "additional authentication headers that could be spoofed."
)

mtls_details = [
    [Paragraph("<b>Aspect</b>", styles['TableHeader']),
     Paragraph("<b>Implementation</b>", styles['TableHeader']),
     Paragraph("<b>Configuration</b>", styles['TableHeader']),
     Paragraph("<b>Rotation Policy</b>", styles['TableHeader'])],
    ["CA Hierarchy", "Istio Citadel or custom PKI", "Root CA → Intermediate → Leaf", "Intermediate: 30 days, Root: 1 year"],
    ["Certificate Format", "X.509 v3 with SPIFFE SANs", "URI: spiffe://cybersoc/ns/svc/name", "Leaf: 24 hours automatic"],
    ["Trust Domain", "cybersoc.platform.internal", "Mesh-wide shared trust", "Manual rotation required"],
    ["Key Length", "ECDSA P-256 or RSA 2048+", "Configurable per workload", "On rotation event"],
    ["Revocation", "OCSP stapling or CRL distribution", "Short cert lifetime reduces need", "Immediate on compromise"],
]

mtls_table = create_section_table(mtls_details,
    col_widths=[30*mm, 50*mm, 48*mm, 38*mm])
story.append(mtls_table)
story.append(Paragraph("Table 2.2: mTLS Configuration Details", styles['Caption']))
story.append(PageBreak())

# SECTION 3: API GATEWAY CONFIGURATION
story.append(Paragraph("3. API Gateway Configuration", styles['SectionHeading']))

add_paragraph(
    "The API Gateway serves as the unified entry point for all external traffic to CyberSOC platform services, "
    "implementing cross-cutting concerns including authentication verification, rate limiting, request routing, response "
    "caching, and request/response transformation. Gateway configuration defines routes to backend services along "
    "with associated plugins enforcing policies. The recommended implementation uses Kong (open-source or enterprise) "
    "deployed within the Kubernetes cluster with horizontal scaling for high availability. Alternative options include "
    "Ambassador (edge-focused), AWS API Gateway (managed), or Traefik (cloud-native simplicity)."
)

story.append(Paragraph("3.1 Route Configuration", styles['SubsectionHeading']))

routes_data = [
    [Paragraph("<b>Path Prefix</b>", styles['TableHeader']),
     Paragraph("<b>Backend Service</b>", styles['TableHeader']),
     Paragraph("<b>Authentication</b>", styles['TableHeader']),
     Paragraph("<b>Rate Limit</b>", styles['TableHeader']),
     Paragraph("<b>Notes</b>", styles['TableHeader'])],
    ["/api/v1/auth/*", "auth-service", "None (login endpoint)", "100/min", "Public endpoints only"],
    ["/api/v1/admin/*", "admin-api", "JWT + RBAC check", "50/min", "Admin operations"],
    ["/api/v1/siem/*", "siem-engine", "JWT validated", "500/min", "Core SIEM functions"],
    ["/api/v1/soar/*", "soar-engine", "JWT + action scope", "200/min", "Automation execution"],
    ["/api/v1/ti/*", "threat-intel", "JWT validated", "300/min", "Threat data access"],
    ["/api/v1/ai/*", "ai-copilot", "JWT + AI license", "100/min", "AI features gated"],
    ["/api/v1/mssp/*", "mssp-service", "JWT + tenant admin", "100/min", "Multi-tenant ops"],
    ["/api/v1/integrations/*", "integration-gw", "JWT + integration secret", "200/min", "Third-party proxy"],
    ["/api/v1/reports/*", "report-service", "JWT validated", "50/min", "Report generation"],
]

routes_table = create_section_table(routes_data,
    col_widths=[32*mm, 32*mm, 36*mm, 22*mm, 40*mm])
story.append(routes_table)
story.append(Paragraph("Table 3.1: API Route Configuration", styles['Caption']))

story.append(Paragraph("3.2 Rate Limiting Policies", styles['SubsectionHeading']))

rate_limits = [
    [Paragraph("<b>Tier</b>", styles['TableHeader']),
     Paragraph("<b>Global Limit</b>", styles['TableHeader']),
     Paragraph("<b>Per-User Limit</b>", styles['TableHeader']),
     Paragraph("<b>Burst Allowance</b>", styles['TableHeader']),
     Paragraph("<b>Throttling Response</b>", styles['TableHeader'])],
    ["Anonymous", "100 req/min", "N/A", "20", "429 Retry-After header"],
    ["Authenticated User", "500 req/min", "200 req/min", "50", "429 + quota headers"],
    ["Admin User", "300 req/min", "300 req/min", "30", "429 + warning email"],
    ["Service Account", "2000 req/min", "N/A", "200", "429 + circuit breaker"],
    ["API Key (Basic)", "1000 req/min", "Per key limit", "100", "429 + usage dashboard"],
    ["Partner Integration", "Custom SLA", "Per contract", "Per contract", "429 + escalation contact"],
]

rate_table = create_section_table(rate_limits,
    col_widths=[34*mm, 30*mm, 32*mm, 28*mm, 42*mm])
story.append(rate_table)
story.append(Paragraph("Table 3.2: Rate Limiting Tiers", styles['Caption']))

story.append(PageBreak())

# SECTION 4: MULTI-FACTOR AUTHENTICATION
story.append(Paragraph("4. Multi-Factor Authentication (MFA)", styles['SectionHeading']))

add_paragraph(
    "Multi-factor authentication is mandatory for all CyberSOC administrative access and strongly recommended for analyst "
    "accounts. The MFA implementation supports multiple factor types accommodating different security requirements and "
    "user preferences: Time-based One-Time Passwords (TOTP) via authenticator applications, WebAuthn/FIDO2 hardware keys "
    "providing phishing-resistant authentication, SMS/Voice delivery for accessibility scenarios, and backup codes for "
    "recovery when primary factors are unavailable. Administrators can enforce MFA policies at organizational level, "
    "requiring specific factors for certain roles or sensitivity levels."
)

mfa_methods = [
    [Paragraph("<b>Method</b>", styles['TableHeader']),
     Paragraph("<b>Security Level</b>", styles['TableHeader']),
     Paragraph("<b>Setup UX</b>", styles['TableHeader']),
     Paragraph("<b>Recovery Options</b>", styles['TableHeader']),
     Paragraph("<b>Recommended For</b>", styles['TableHeader'])],
    ["TOTP (Authenticator App)", "High", "QR Code scan", "Backup codes", "All users (default)"],
    ["WebAuthn (Hardware Key)", "Very High", "USB/NFC tap", "Another MFA method", "Security-sensitive roles"],
    ["SMS (Text Message)", "Medium", "Phone number entry", "Voice call fallback", "Accessibility backup"],
    ["Email OTP", "Low-Medium", "Verified email", "Alternative MFA", "Not recommended alone"],
    ["Push Notification", "High", "App approval", "OTP fallback", "Mobile-first orgs"],
    ["Biometric (Device)", "High", "Device enrollment", "PIN/password fallback", "Mobile apps"],
]

mfa_table = create_section_table(mfa_methods,
    col_widths=[38*mm, 28*mm, 28*mm, 32*mm, 32*mm])
story.append(mfa_table)
story.append(Paragraph("Table 4.1: MFA Methods Comparison", styles['Caption']))

story.append(Paragraph("4.2 MFA Policy Configuration", styles['SubsectionHeading']))

policies = [
    [Paragraph("<b>Policy Setting</b>", styles['TableHeader']),
     Paragraph("<b>Options</b>", styles['TableHeader']),
     Paragraph("<b>Default</b>", styles['TableHeader']),
     Paragraph("<b>Enforcement</b>", styles['TableHeader'])],
    ["MFA Required For", "None/Admins/All Users/Roles", "Admins only", "Login gate check"],
    ["Allowed Methods", "Method whitelist selection", "All available", "Setup time filtering"],
    ["Remember Device", "Days (0/7/14/30)", "7 days", "Cookie-based bypass"],
    ["Grace Period", "Days for enrollment", "3 days", "One-time skip allowed"],
    ["Step-up Auth", "Sensitive actions trigger re-auth", "Enabled", "Action-level policy"],
    ["Location-Based", "Require MFA for new locations", "Disabled", "IP geolocation check"],
]

policy_table = create_section_table(policies,
    col_widths=[36*mm, 46*mm, 28*mm, 40*mm])
story.append(policy_table)
story.append(Paragraph("Table 4.2: MFA Policy Settings", styles['Caption']))
story.append(PageBreak())

# SECTION 5: SESSION MANAGEMENT
story.append(Paragraph("5. Session Management", styles['SectionHeading']))

add_paragraph(
    "Session management governs the lifecycle of authenticated sessions from creation through expiration and revocation, "
    "balancing security (preventing unauthorized access via stale sessions) with usability (avoiding frequent "
    "re-authentication that disrupts workflow). The implementation uses short-lived JWT access tokens (15-minute default) "
    "combined with longer-lived refresh tokens (7-day default, revocable) stored in HTTP-only secure cookies for browser "
    "clients or secure storage for programmatic clients. Session state maintained server-side in Redis enables immediate "
    "revocation on security events (password change, admin deactivation, suspicious activity detection) without waiting "
    "for natural token expiration."
)

session_config = [
    [Paragraph("<b>Parameter</b>", styles['TableHeader']),
     Paragraph("<b>Access Token</b>", styles['TableHeader']),
     Paragraph("<b>Refresh Token</b>", styles['TableHeader']),
     Paragraph("<b>ID Token</b>", styles['TableHeader']),
     Paragraph("<b>Session Cookie</b>", styles['TableHeader'])],
    ["Format", "JWT (JWS)", "Opaque (stored)", "JWT (JWS)", "Session ID reference"],
    ["Lifetime", "15 minutes", "7 days", "15 minutes", "Configurable (default 8h)"],
    ["Storage", "Client memory", "Redis cluster", "Client memory", "HttpOnly Secure cookie"],
    ["Revocation", "Wait expiry", "Immediate (delete)", "Wait expiry", "Immediate (delete)"],
    ["Rotation", "N/A", "Per-use (sliding)", "N/A", "Activity-based refresh"],
    ["Claims", "scope, roles, tenant", "token_type, jti", "profile, email", "csrf_token, created_at"],
]

session_table = create_section_table(session_config,
    col_widths=[28*mm, 32*mm, 32*mm, 28*mm, 36*mm])
story.append(session_table)
story.append(Paragraph("Table 5.1: Token and Session Configuration", styles['Caption']))

story.append(Paragraph("5.1 Concurrent Session Limits", styles['SubsectionHeading']))

add_paragraph(
    "To prevent credential sharing and detect potential account compromise, the platform enforces configurable limits on "
    "concurrent active sessions per user. When a new login would exceed the limit, administrators choose between denying "
    "the new login (requiring logout of an existing session first) or terminating the oldest/stalest session automatically. "
    "Session lists visible to users show active devices with last activity timestamp and ability to remotely terminate "
    "suspicious sessions. High-assurance configurations for privileged accounts may enforce single-session-only mode "
    "ensuring exclusive access that must be explicitly released before another device can authenticate."
)

story.append(PageBreak())

# SECTION 6: SECURITY HEADERS & PROTECTION
story.append(Paragraph("6. Security Headers & Threat Protection", styles['SectionHeading']))

add_paragraph(
    "The API Gateway and application layer implement defense-in-depth through multiple security mechanisms protecting "
    "against common web vulnerabilities and attack vectors. HTTP security headers instruct browsers on appropriate content "
    "handling restrictions. Input validation and output encoding prevent injection attacks. Request size limits and "
    "content-type restrictions mitigate denial-of-service vectors. The Web Application Firewall (WAF) layer provides "
    "virtual patching for known CVEs before underlying services can be updated, buying critical response time during "
    "security incident remediation."
)

security_headers = [
    [Paragraph("<b>Header</b>", styles['TableHeader']),
     Paragraph("<b>Value</b>", styles['TableHeader']),
     Paragraph("<b>Purpose</b>", styles['TableHeader']),
     Paragraph("<b>Protection Against</b>", styles['TableHeader'])],
    ["Strict-Transport-Security", "max-age=31536000; includeSubDomains", "Force HTTPS", "SSL stripping"],
    ["Content-Security-Policy", "default-src 'self'; script-src 'self'", "Resource loading control", "XSS injection"],
    ["X-Content-Type-Options", "nosniff", "Prevent MIME sniffing", "Drive-by downloads"],
    ["X-Frame-Options", "DENY", "Prevent iframe embedding", "Clickjacking"],
    ["X-XSS-Protection", "1; mode=block", "Browser XSS filter", "Reflected XSS"],
    ["Referrer-Policy", "strict-origin-when-cross-origin", "Control referrer leakage", "Privacy exposure"],
    ["Permissions-Policy", "camera=(), microphone=()", "Feature restriction", "Unauthorized access"],
    ["Cache-Control", "no-store for auth, public for static", "Response caching", "Sensitive data caching"],
]

headers_table = create_section_table(security_headers,
    col_widths=[40*mm, 55*mm, 38*mm, 38*mm])
story.append(headers_table)
story.append(Paragraph("Table 6.1: Security Headers Configuration", styles['Caption']))

story.append(Paragraph("6.1 WAF Rules Configuration", styles['SubsectionHeading']))

waf_rules = [
    [Paragraph("<b>Rule Category</b>", styles['TableHeader']),
     Paragraph("<b>Protected Vulnerabilities</b>", styles['TableHeader']),
     Paragraph("<b>Action</b>", styles['TableHeader']),
     Paragraph("<b>Severity Threshold</b>", styles['TableHeader'])],
    ["SQL Injection", "SQLi in parameters, body, headers", "Block + Alert", "Any detection"],
    ["Cross-Site Scripting", "Reflected, stored XSS vectors", "Sanitize + Block", "High confidence"],
    ["Remote Code Execution", "Command injection, path traversal", "Block immediately", "Any detection"],
    ["SSRF Prevention", "Internal IP/url access attempts", "Block + Validate", "Private ranges"],
    ["Authentication Abuse", "Brute force, credential stuffing", "Rate limit + CAPTCHA", ">5 failures/min"],
    ["Bot Mitigation", "Scrapers, automated abuse", "Challenge/Block", "Behavioral score <50"],
    ["File Upload Safety", "Malicious file type uploads", "Validate + Quarantine", "Executable types"],
]

waf_table = create_section_table(waf_rules,
    col_widths=[36*mm, 52*mm, 32*mm, 38*mm])
story.append(waf_table)
story.append(Paragraph("Table 6.2: WAF Rule Categories", styles['Caption']))
story.append(PageBreak())

# SECTION 7: INTEGRATION WITH IDENTITY PROVIDERS
story.append(Paragraph("7. Identity Provider Integration", styles['SectionHeading']))

add_paragraph(
    "CyberSOC integrates with enterprise identity providers through standard protocols, enabling organizations to leverage "
    "existing identity management investments and user provisioning workflows. Primary integration uses OpenID Connect "
    "(OIDC) for modern identity providers (Okta, Azure AD, Auth0, Google Workspace) providing rich user profile data "
    "and standardized authentication flows. Legacy SAML 2.0 support accommodates enterprise environments where SAML remains "
    "the standard for federated authentication. LDAP/Active Directory integration supports hybrid deployments requiring "
    "direct directory authentication without cloud identity provider dependency."
)

idp_integration = [
    [Paragraph("<b>IDP Type</b>", styles['TableHeader']),
     Paragraph("<b>Protocol</b>", styles['TableHeader']),
     Paragraph("<b>Use Case</b>", styles['TableHeader']),
     Paragraph("<b>Mapping Complexity</b>", styles['TableHeader']),
     Paragraph("<b>MFA Handling</b>", styles['TableHeader'])],
    ["Okta", "OIDC", "Enterprise SaaS standard", "Low (standard claims)", "Delegated to Okta"],
    ["Azure AD", "OIDC/SAML", "Microsoft ecosystem", "Medium (Graph API)", "Azure AD Conditional Access"],
    ["Google Workspace", "OIDC", "Google-centric orgs", "Low (standard claims)", "Google 2SV"],
    ["Auth0", "OIDC", "Customizable IDP needs", "Medium (rules engine)", "Auth0 MFA factors"],
    ["Active Directory", "LDAP/SAML", "On-prem legacy", "High (schema mapping)", "AD CS / RSA SecurID"],
    ["Custom OIDC", "OIDC", "Specialized providers", "Variable", "Provider-dependent"],
]

idp_table = create_section_table(idp_integration,
    col_widths=[32*mm, 26*mm, 36*mm, 34*mm, 38*mm])
story.append(idp_table)
story.append(Paragraph("Table 7.1: Identity Provider Integration Matrix", styles['Caption']))

story.append(Paragraph("7.1 SCIM Provisioning Integration", styles['SubsectionHeading']))

add_paragraph(
    "Automated user provisioning through SCIM (System for Cross-domain Identity Management) ensures CyberSOC user "
    "directories stay synchronized with authoritative identity sources (typically the corporate HR system or Active "
    "Directory). When employees join, leave, or change roles, those changes propagate automatically to CyberSOC without "
    "manual administrator intervention. The SCIM integration supports bidirectional sync: pushing CyberSOC-specific "
    "attributes back to the identity provider where custom schema extension is supported, and importing changes from "
    "the identity provider on scheduled intervals or via webhook notifications."
)

scim_features = [
    [Paragraph("<b>Operation</b>", styles['TableHeader']),
     Paragraph("<b>Direction</b>", styles['TableHeader']),
     Paragraph("<b>Trigger</b>", styles['TableHeader']),
     Paragraph("<b>Attributes Synced</b>", styles['TableHeader'])],
    ["User Create", "IDP -> CyberSOC", "HR hire event / AD create", "name, email, department, manager"],
    ["User Update", "Bidirectional", "Attribute change detected", "name, email, phone, title"],
    ["User Deactivate", "IDP -> CyberSOC", "Termination / AD disable", "status, deactivation date"],
    ["Group Sync", "IDP -> CyberSOC", "Group membership change", "groups, role mappings"],
    ["License Assignment", "CyberSOC -> IDP", "Entitlement change", "custom cybersoc:license attribute"],
]

scim_table = create_section_table(scim_features,
    col_widths=[32*mm, 28*mm, 38*mm, 58*mm])
story.append(scim_table)
story.append(Paragraph("Table 7.2: SCIM Provisioning Operations", styles['Caption']))
story.append(PageBreak())

# SECTION 8: IMPLEMENTATION CHECKLIST
story.append(Paragraph("8. Implementation Checklist", styles['SectionHeading']))

add_paragraph(
    "This checklist provides a comprehensive task list for implementing the API Gateway and Authentication Architecture. "
    "Items are organized by functional area with dependencies noted where applicable. Each item should be verified complete "
    "with evidence (configuration screenshot, test result, documentation reference) before marking done. The checklist "
    "supports both initial implementation and subsequent audits verifying continued compliance with security requirements."
)

impl_checklist = [
    [Paragraph("<b>#</b>", styles['TableHeader']),
     Paragraph("<b>Task</b>", styles['TableHeader']),
     Paragraph("<b>Area</b>", styles['TableHeader']),
     Paragraph("<b>Priority</b>", styles['TableHeader']),
     Paragraph("<b>Verification</b>", styles['TableHeader'])],
    ["1", "Deploy API Gateway (Kong/Ambassador)", "Infrastructure", "Critical", "Health endpoint responding"],
    ["2", "Configure TLS termination with valid cert", "Infrastructure", "Critical", "A+ SSL Labs score"],
    ["3", "Implement OIDC client registration", "Auth", "Critical", "Token issuance working"],
    ["4", "Configure MFA providers (TOTP, WebAuthn)", "Auth", "Critical", "Enrollment flow tested"],
    ["5", "Set up Redis cluster for sessions", "Infrastructure", "High", "Failover tested"],
    ["6", "Implement JWT validation middleware", "Auth", "Critical", "Invalid tokens rejected"],
    ["7", "Configure rate limiting by tier", "Gateway", "High", "429 responses verified"],
    ["8", "Set up mTLS for service mesh", "Infrastructure", "High", "Inter-service calls authenticated"],
    ["9", "Implement OPA policy decision", "AuthZ", "High", "Deny policies enforced"],
    ["10", "Configure security headers", "Security", "Medium", "SecurityHeaders.com pass"],
    ["11", "Set up WAF rule sets", "Security", "High", "OWASP Top 10 covered"],
    ["12", "Implement SCIM endpoint", "Integration", "Medium", "Provisioning sync working"],
    ["13", "Configure audit logging pipeline", "Compliance", "High", "All auth events captured"],
    ["14", "Document emergency break-glass procedure", "Operations", "Medium", "Runbook written"],
    ["15", "Load test authentication endpoints", "Performance", "High", "<100ms p99 at scale"],
]

checklist_table = create_section_table(impl_checklist,
    col_widths=[12*mm, 62*mm, 26*mm, 22*mm, 48*mm])
story.append(checklist_table)
story.append(Paragraph("Table 8.1: Implementation Checklist", styles['Caption']))

story.append(Spacer(1, 8*mm))

add_paragraph(
    "This API Gateway and Authentication Architecture specification establishes the security foundation upon which all "
    "other CyberSOC platform components depend. Proper implementation of these capabilities is prerequisite to production "
    "deployment, as weaknesses in authentication or API security undermine the protections implemented throughout the rest "
    "of the platform. Regular security review of this layer, including penetration testing focused on authentication "
    "bypass and API abuse vectors, should occur at minimum annually and following any significant configuration changes.",
    'BodyNoIndent'
)

print(f"Building PDF: {output_path}")
doc.build(story)
print(f"Successfully generated: {output_path}")
print(f"File size: {os.path.getsize(output_path)} bytes")
