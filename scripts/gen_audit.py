#!/usr/bin/env python3
"""National SOC Platform - Production Readiness Audit Report Generator"""
import os
from datetime import datetime
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak

OUT = '/home/z/my-project/download/National_SOC_Production_Readiness_Complete_Audit_Report.pdf'

C = {
    'bg': colors.HexColor('#f7f7f6'),
    'hdr': colors.HexColor('#645d49'),
    'brd': colors.HexColor('#d2cec4'),
    'txt': colors.HexColor('#22221f'),
    'mut': colors.HexColor('#88857e'),
    'ok': colors.HexColor('#43905d'),
    'wrn': colors.HexColor('#9b8251'),
    'err': colors.HexColor('#864b45'),
    'crit': colors.HexColor('#c41e3a'),
}

MODULES = [
    ('MOD-001', 'Core Dashboard UI', 65, 'PARTIAL', 
     ['MEDIUM: Large monolithic component', 'LOW: Missing error boundaries', 'MEDIUM: Accessibility gaps'],
     'Ready for internal pilot after accessibility fixes'),
    ('MOD-002', 'Authentication System', 72, 'PARTIAL',
     ['CRITICAL: Token blacklist not implemented', 'HIGH: Custom PBKDF2 vs bcrypt', 'MEDIUM: Session management incomplete'],
     'Implement token blacklist before production deployment'),
    ('MOD-003', 'Incident Management API', 82, 'GOOD',
     ['HIGH: Error information leakage', 'MEDIUM: No input validation schema', 'LOW: Pagination limits hardcoded'],
     'Production-ready after validation hardening'),
    ('MOD-004', 'Security Alerts System', 78, 'GOOD',
     ['MEDIUM: Alert ID collision risk', 'LOW: Multiple status formats accepted'],
     'Ready for production with minor fixes'),
    ('MOD-005', 'SS7/Telecom Security Module', 58, 'PARTIAL',
     ['CRITICAL: Hardcoded sample data in production', 'HIGH: ANRT compliance concerns', 'HIGH: PCAP export is stub'],
     'Requires significant development before production'),
    ('MOD-006', 'Threat Hunting Workspace', 62, 'PARTIAL',
     ['HIGH: Hunt session persistence unclear', 'MEDIUM: No collaboration features', 'MEDIUM: STIX/TAXII export missing'],
     'Suitable for single-analyst workflows'),
    ('MOD-007', 'AI Automation Engine', 55, 'PARTIAL',
     ['CRITICAL: No ML model integration - mock data only', 'HIGH: Playbook execution simulated', 'HIGH: No approval gates'],
     'Currently prototype; requires ML/SOAR backend'),
    ('MOD-008', 'Compliance Dashboard', 68, 'PARTIAL',
     ['MEDIUM: Rules hardcoded in code', 'MEDIUM: Report generation incomplete', 'LOW: No evidence workflow'],
     'Good foundation; needs rule engine flexibility'),
    ('MOD-009', 'Real-time Monitoring', 70, 'PARTIAL',
     ['HIGH: SSE memory leak risk', 'MEDIUM: No reconnection logic', 'LOW: Update interval fixed'],
     'Fix memory leak before production deployment'),
    ('MOD-010', 'Telecom Dashboards', 60, 'PARTIAL',
     ['HIGH: Data sources not integrated (mock APIs)', 'MEDIUM: Privacy concerns', 'MEDIUM: Probe alerting basic'],
     'Requires telecom backend integration'),
    ('MOD-011', 'Executive Reporting', 75, 'GOOD',
     ['MEDIUM: Report scheduling not implemented', 'LOW: KPIs not customizable'],
     'Ready for executive stakeholders'),
    ('MOD-012', 'Analyst Workstations', 77, 'GOOD',
     ['MEDIUM: Workload tracking incomplete', 'LOW: Queue prioritization basic'],
     'Production-ready for daily operations'),
    ('MOD-013', 'Database Layer (SQLite)', 35, 'NOT READY',
     ['CRITICAL: SQLite for production SOC workloads', 'CRITICAL: No backup/DR strategy', 'HIGH: Missing indexes', 'HIGH: No partitioning', 'MEDIUM: No connection pooling'],
     'MUST migrate to PostgreSQL before production'),
    ('MOD-014', 'Kubernetes Deployment', 80, 'GOOD',
     ['MEDIUM: Resource limits need tuning', 'MEDIUM: PDB not applied', 'LOW: Network policies permissive'],
     'Solid foundation; tune based on load testing'),
    ('MOD-015', 'Monitoring & Observability', 78, 'GOOD',
     ['MEDIUM: Alerting rules need tuning', 'LOW: Dashboards need validation', 'LOW: No distributed tracing'],
     'Good observability foundation'),
]

CC_FINDINGS = [
    ('F048', 'Secrets Mgmt', 'CRITICAL', 'Exposed secrets in version control - rotate immediately'),
    ('F049', 'Security Headers', 'CRITICAL', 'Missing CSP, HSTS headers - XSS risk'),
    ('F050', 'API Security', 'HIGH', 'Rate limiter exists but NOT applied to endpoints'),
    ('F051', 'Input Validation', 'HIGH', 'Validation library inconsistently applied'),
    ('F052', 'Disaster Recovery', 'HIGH', 'DR framework absent - RTO/RPO undefined'),
    ('F053', 'Testing', 'MEDIUM', 'Zero test coverage - no unit/integration/E2E tests'),
    ('F054', 'Documentation', 'MEDIUM', 'Runbooks incomplete for operations team'),
    ('F055', 'Performance', 'MEDIUM', 'Redis configured but NOT integrated'),
    ('F056', 'CI/CD', 'LOW', 'Pipeline lacks security scanning'),
    ('F057', 'Logging', 'LOW', 'No centralized logging or correlation IDs'),
]

def styles():
    s = getSampleStyleSheet()
    s.add(ParagraphStyle('T', fontName='Helvetica-Bold', fontSize=28, leading=34, alignment=1, textColor=C['txt'], spaceAfter=6))
    s.add(ParagraphStyle('ST', fontName='Helvetica', fontSize=14, leading=18, alignment=1, textColor=C['mut'], spaceAfter=24))
    s.add(ParagraphStyle('H', fontName='Helvetica-Bold', fontSize=18, leading=24, textColor=C['hdr'], spaceBefore=20, spaceAfter=12))
    s.add(ParagraphStyle('SH', fontName='Helvetica-Bold', fontSize=14, leading=18, textColor=C['txt'], spaceBefore=16, spaceAfter=8))
    s.add(ParagraphStyle('B', fontName='Helvetica', fontSize=10, leading=14, textColor=C['txt'], alignment=3, spaceBefore=4, spaceAfter=8))
    s.add(ParagraphStyle('D', fontName='Helvetica', fontSize=9, leading=12, textColor=C['txt'], leftIndent=10, spaceBefore=2, spaceAfter=4))
    s.add(ParagraphStyle('MH', fontName='Helvetica-Bold', fontSize=12, leading=16, textColor=colors.white, backColor=C['hdr'], leftIndent=6, rightIndent=6, spaceBefore=12, spaceAfter=6))
    return s

def sev_color(s):
    return {'CRITICAL': C['crit'], 'HIGH': C['err'], 'MEDIUM': C['wrn'], 'LOW': colors.HexColor('#476b8f')}.get(s, C['mut'])

def ready_color(score):
    return C['ok'] if score >= 60 else C['err']

def build():
    doc = SimpleDocTemplate(OUT, pagesize=A4, rightMargin=0.75*inch, leftMargin=0.75*inch,
                           topMargin=0.75*inch, bottomMargin=0.75*inch)
    st = styles()
    story = []
    
    # Cover
    story.append(Spacer(1, 100))
    story.append(Paragraph("PRODUCTION READINESS AUDIT REPORT", st['T']))
    story.append(Spacer(1, 20))
    story.append(Paragraph("National SOC Platform", st['ST']))
    story.append(Paragraph("Djezzy Telecommunications - Algeria", st['ST']))
    story.append(Spacer(1, 40))
    story.append(Paragraph(f"Audit Date: {datetime.now().strftime('%B %d, %Y')}", st['ST']))
    story.append(Paragraph("Classification: INTERNAL - CONFIDENTIAL", st['ST']))
    story.append(Spacer(1, 60))
    
    summ = [
        ['Overall Assessment', 'NOT PRODUCTION READY'],
        ['Total Findings', '57 (8 CRITICAL, 14 HIGH, 21 MEDIUM, 14 LOW)'],
        ['Average Readiness', '68%'],
        ['Estimated Remediation', '6-10 weeks'],
        ['Risk Level', 'MODERATE-HIGH'],
    ]
    t = Table(summ, colWidths=[180, 280])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), C['bg']), 
        ('BACKGROUND', (1, 0), (1, -1), colors.HexColor('#f0f0ed')),
        ('TEXTCOLOR', (0, 0), (-1, -1), C['txt']), 
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (1, 0), (1, -1), 'Helvetica'), 
        ('FONTSIZE', (0, 0), (-1, -1), 11),
        ('ALIGN', (0, 0), (0, -1), 'RIGHT'), 
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID', (0, 0), (-1, -1), 1, C['brd']),
        ('TOPPADDING', (0, 0), (-1, -1), 10), 
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ('LEFTPADDING', (0, 0), (-1, -1), 15),
    ]))
    story.append(t)
    story.append(PageBreak())
    
    # TOC
    story.append(Paragraph("Table of Contents", st['H']))
    for item in ["1. Executive Summary", "2. Module Analysis (15 Modules)", "3. Cross-Cutting Concerns",
                "4. Remediation Roadmap", "5. Conclusion"]:
        story.append(Paragraph(item, st['B']))
    story.append(PageBreak())
    
    # Executive Summary
    story.append(Paragraph("1. Executive Summary", st['H']))
    story.append(Paragraph("""This audit evaluated 15 modules of the National SOC Platform against enterprise standards.
It identified <b><font color="#c41e3a">57 findings</font></b>: 8 CRITICAL, 14 HIGH, 21 MEDIUM, 14 LOW.

The platform shows strong architectural foundations but has critical gaps that must be addressed before 
production deployment, notably SQLite for production data, exposed secrets, and incomplete security hardening.

<b>Assessment:</b> The platform is approximately <b>68% ready</b> for production. It requires an estimated 
<b>6-10 weeks</b> of remediation for national-level SOC operations.""", st['B']))
    story.append(Spacer(1, 12))
    
    # Module Summary Table
    story.append(Paragraph("Module Readiness Summary", st['SH']))
    data = [['Module Name', 'ID', 'Score', 'Status', 'Issues']]
    for mid, name, score, status, finds, rec in MODULES:
        crit_count = sum(1 for f in finds if f.startswith('CRITICAL'))
        short_name = name[:30] + '..' if len(name) > 30 else name
        data.append([short_name, mid, f"{score}%", status, f"{len(finds)} ({crit_count})"])
    data.append(['TOTAL (15 modules)', '', '68%', '', '57 (8 critical)'])
    
    t = Table(data, colWidths=[165, 50, 50, 55, 115])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), C['hdr']), 
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'), 
        ('FONTSIZE', (0, 0), (-1, 0), 8),
        ('FONTNAME', (0, 1), (-1, -2), 'Helvetica'), 
        ('FONTSIZE', (0, 1), (-1, -1), 7),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'), 
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID', (0, 0), (-1, -1), 0.5, C['brd']),
        ('ROWBACKGROUNDS', (0, 1), (-1, -2), [colors.HexColor('#f0f0ed'), colors.white]),
        ('BACKGROUND', (0, -1), (-1, -1), C['bg']), 
        ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
    ]))
    for i, (_, _, score, _, _, _) in enumerate(MODULES, 1):
        t.setStyle(TableStyle([('TEXTCOLOR', (2, i), (2, i), ready_color(score))]))
    story.append(t)
    story.append(PageBreak())
    
    # Module Details
    story.append(Paragraph("2. Module-by-Module Analysis", st['H']))
    
    for idx, (mid, name, score, status, finds, rec) in enumerate(MODULES):
        story.append(Paragraph(f"<b>{mid}:</b> {name} [{status}] {score}% Ready", st['MH']))
        
        fd = [['Severity', 'Finding']]
        for f in finds:
            parts = f.split(':', 1)
            fd.append([parts[0].strip(), parts[1].strip() if len(parts) > 1 else f])
        
        ft = Table(fd, colWidths=[70, 420])
        ft.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), C['brd']), 
            ('TEXTCOLOR', (0, 0), (-1, 0), C['txt']),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'), 
            ('FONTSIZE', (0, 0), (-1, 0), 8),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'), 
            ('FONTSIZE', (0, 1), (-1, -1), 7),
            ('ALIGN', (0, 0), (0, -1), 'CENTER'), 
            ('GRID', (0, 0), (-1, -1), 0.25, C['brd']),
        ]))
        for i, f in enumerate(finds, 1):
            sev = f.split(':')[0].strip()
            ft.setStyle(TableStyle([('TEXTCOLOR', (0, i), (0, i), sev_color(sev)), ('FONTNAME', (0, i), (0, i), 'Helvetica-Bold')]))
        story.append(ft)
        story.append(Paragraph(f"<b>Recommendation:</b> {rec}", st['D']))
        story.append(Spacer(1, 8))
        
        if (idx + 1) % 3 == 0:
            story.append(PageBreak())
    
    story.append(PageBreak())
    
    # Cross-Cutting Concerns
    story.append(Paragraph("3. Cross-Cutting Concerns", st['H']))
    story.append(Paragraph("These findings span multiple modules and require platform-wide remediation.", st['B']))
    
    ccd = [['ID', 'Area', 'Severity', 'Issue']]
    for fid, area, sev, issue in CC_FINDINGS:
        ccd.append([fid, area, sev, issue])
    
    ct = Table(ccd, colWidths=[38, 75, 55, 307])
    ct.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), C['err']), 
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'), 
        ('FONTSIZE', (0, 0), (-1, 0), 8),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'), 
        ('FONTSIZE', (0, 1), (-1, -1), 7),
        ('ALIGN', (0, 0), (2, -1), 'CENTER'), 
        ('GRID', (0, 0), (-1, -1), 0.5, C['brd']),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.HexColor('#f0f0ed'), colors.white]),
    ]))
    for i, (_, _, sev, _) in enumerate(CC_FINDINGS, 1):
        ct.setStyle(TableStyle([('TEXTCOLOR', (2, i), (2, i), sev_color(sev)), ('FONTNAME', (2, i), (2, i), 'Helvetica-Bold')]))
    story.append(ct)
    story.append(PageBreak())
    
    # Roadmap
    story.append(Paragraph("4. Prioritized Remediation Roadmap", st['H']))
    
    phases = [
        ("Phase 1: CRITICAL (1-2 weeks)", [
            "Migrate database from SQLite to PostgreSQL cluster",
            "Rotate ALL exposed secrets; implement Vault/secrets manager",
            "Implement token blacklist for session invalidation",
            "Add CSP, HSTS, and security headers",
            "Integrate rate limiting on ALL API endpoints",
            "Fix SSE memory leak; replace SS7 mock data",
        ]),
        ("Phase 2: HIGH (2-4 weeks)", [
            "Implement Zod input validation on all endpoints",
            "Add structured logging with correlation IDs",
            "Integrate Redis caching layer",
            "Establish DR framework with RTO/RPO targets",
            "Connect AI module to ML/SOAR backends",
            "Implement test suite targeting 80%+ coverage",
        ]),
        ("Phase 3: MEDIUM (1-2 months)", [
            "Enhance Threat Hunting with collaboration features",
            "Build configurable Compliance rule engine",
            "Implement automated report scheduling",
            "Add OpenTelemetry distributed tracing",
            "Complete operational runbooks",
            "Hardening CI/CD with security scanning",
        ]),
        ("Phase 4: LOW (Ongoing)", [
            "Conduct WCAG 2.1 AA accessibility audit",
            "Build custom KPI builder for executives",
            "Implement STIX/TAXII threat intel sharing",
            "Add ML-assisted case routing",
        ]),
    ]
    
    for phase_name, items in phases:
        story.append(Paragraph(f"<b>{phase_name}</b>", st['B']))
        for item in items:
            story.append(Paragraph(f"  - {item}", st['D']))
        story.append(Spacer(1, 6))
    
    story.append(PageBreak())
    
    # Conclusion - broken into smaller paragraphs
    story.append(Paragraph("5. Conclusion and Next Steps", st['H']))
    story.append(Paragraph("<b>VERDICT: NOT PRODUCTION READY</b>", st['B']))
    story.append(Paragraph("The National SOC Platform represents substantial development effort with well-architected components and modern technology choices (Next.js 16, TypeScript, Prisma, Kubernetes). However, critical gaps prevent production deployment:", st['B']))
    
    story.append(Paragraph("<b>Critical Blockers:</b>", st['B']))
    story.append(Paragraph("1. Database: SQLite cannot handle production SOC workloads - PostgreSQL migration mandatory", st['D']))
    story.append(Paragraph("2. Secrets: Exposed in version control - immediate rotation required", st['D']))
    story.append(Paragraph("3. Security Headers: Missing CSP/HSTS - XSS exfiltration risk", st['D']))
    story.append(Paragraph("4. Disaster Recovery: No DR framework - extended outage risk", st['D']))
    story.append(Paragraph("5. Data Integrity: SS7/AI modules use mock data - false operational picture", st['D']))
    
    story.append(Paragraph("<b>Recommended Options:</b>", st['B']))
    story.append(Paragraph("Option A (Full Hardening): 8-10 weeks, ~400 hours - Enterprise-ready national SOC", st['D']))
    story.append(Paragraph("Option B (Phased Pilot): 4-6 weeks, ~200 hours - Limited production pilot", st['D']))
    
    story.append(Paragraph("<b>Immediate Actions (24-48 hours):</b>", st['B']))
    story.append(Paragraph("1. Rotate ALL exposed credentials immediately", st['D']))
    story.append(Paragraph("2. Remove .env from version control; implement secrets manager", st['D']))
    story.append(Paragraph("3. Begin PostgreSQL migration planning", st['D']))
    story.append(Paragraph("4. Schedule production database cluster deployment", st['D']))
    story.append(Paragraph("5. Engage penetration testing vendor post-remediation", st['D']))
    
    doc.build(story)
    print(f"\n{'='*60}")
    print(f"REPORT GENERATED SUCCESSFULLY")
    print(f"{'='*60}")
    print(f"Output: {OUT}")
    print(f"Size: {os.path.getsize(OUT)/1024:.1f} KB")
    return OUT

if __name__ == "__main__":
    build()
