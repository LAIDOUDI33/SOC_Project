#!/usr/bin/env python3
"""Simplified Audit Report Generator"""
import os
from datetime import datetime
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak

OUT = '/home/z/my-project/download/National_SOC_Production_Readiness_Complete_Audit_Report.pdf'

C = {
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
    ('MOD-001', 'Core Dashboard UI', 65, 'PARTIAL', 3, 'Ready for pilot after accessibility fixes'),
    ('MOD-002', 'Authentication System', 72, 'PARTIAL', 3, 'Implement token blacklist first'),
    ('MOD-003', 'Incident Management API', 82, 'GOOD', 2, 'Ready after validation hardening'),
    ('MOD-004', 'Security Alerts System', 78, 'GOOD', 2, 'Ready with minor fixes'),
    ('MOD-005', 'SS7/Telecom Module', 58, 'PARTIAL', 3, 'Needs significant development'),
    ('MOD-006', 'Threat Hunting', 62, 'PARTIAL', 3, 'Good for single-analyst only'),
    ('MOD-007', 'AI Automation', 55, 'PARTIAL, 3, 'Prototype - needs ML/SOAR backend'),
    ('MOD-008', 'Compliance Dashboard', 68, 'PARTIAL, 3, 'Good foundation; needs flexibility'),
    ('MOD-009', 'Real-time Monitoring', 70, 'PARTIAL', 3, 'Fix memory leak before production'),
    ('MOD-010', 'Telecom Dashboards', 60, 'PARTIAL, 3, 'Needs telecom backend integration'),
    ('MOD-011', 'Executive Reporting', 75, 'GOOD', 2, 'Ready for executives'),
    ('MOD-012', 'Analyst Workstations', 77, 'GOOD', 2, 'Production-ready for daily ops'),
    ('MOD-013', 'Database (SQLite)', 35, 'NOT READY', 5, 'MUST migrate to PostgreSQL'),
    ('MOD-014', 'Kubernetes Deployment', 80, 'GOOD', 3, 'Solid foundation; tune resources'),
    ('MOD-015', 'Monitoring & Observability', 78, 'GOOD', 3, 'Good observability foundation'),
]

CC_FINDINGS = [
    ('F048', 'Secrets Mgmt', 'CRITICAL', 'Exposed secrets in version control'),
    ('F049', 'Security Headers', 'CRITICAL', 'Missing CSP/HSTS headers'),
    ('F050', 'API Security', 'HIGH', 'Rate limiter not applied to endpoints'),
    ('F051', 'Input Validation', 'HIGH', 'Validation inconsistently applied'),
    ('F052', 'Disaster Recovery', 'HIGH', 'DR framework absent'),
    ('F053', 'Testing', 'MEDIUM', 'Zero test coverage exists'),
    ('F054', 'Documentation', 'MEDIUM', 'Runbooks incomplete'),
    ('F055', 'Performance', 'MEDIUM', 'Redis not integrated'),
    ('F056', 'CI/CD', 'LOW', 'Pipeline lacks security scanning'),
    ('F057', 'Logging', 'LOW', 'No centralized logging'),
]

def styles():
    s = getSampleStyleSheet()
    s.add(ParagraphStyle('T', fontName='Helvetica-Bold', fontSize=26, leading=32, alignment=1, textColor=C['txt'], spaceAfter=6))
    s.add(ParagraphStyle('ST', fontName='Helvetica', fontSize=12, leading=16, alignment=1, textColor=C['mut'], spaceAfter=20))
    s.add(ParagraphStyle('H', fontName='Helvetica-Bold', fontSize=16, leading=20, textColor=C['hdr'], spaceBefore=18, spaceAfter=10))
    s.add(ParagraphStyle('SH', fontName='Helvetica-Bold', fontSize=13, leading=16, textColor=C['txt'], spaceBefore=14, spaceAfter=6))
    s.add(ParagraphStyle('B', fontName='Helvetica', fontSize=10, leading=14, textColor=C['txt'], alignment=3, spaceBefore=4, spaceAfter=6))
    s.add(ParagraphStyle('D', fontName='Helvetica', fontSize=9, leading=12, textColor=C['txt'], leftIndent=10, spaceBefore=2, spaceAfter=4))
    s.add(ParagraphStyle('MH', fontName='Helvetica-Bold', fontSize=11, leading=14, textColor=colors.white, backColor=C['hdr'], leftIndent=6, rightIndent=6, spaceBefore=10, spaceAfter=6))
    return s

def sev_color(s):
    return {'CRITICAL': C['crit'], 'HIGH': C['err'], 'MEDIUM': C['wrn'], 'LOW': colors.HexColor('#476b8f')}.get(s, C['mut'])

def build():
    doc = SimpleDocTemplate(OUT, pagesize=A4, rightMargin=0.75*inch, leftMargin=0.75*inch,
                           topMargin=0.75*inch, bottomMargin=0.75*inch)
    st = styles()
    story = []
    
    # Cover
    story.append(Spacer(1, 80))
    story.append(Paragraph("PRODUCTION READINESS AUDIT REPORT", st['T']))
    story.append(Spacer(1, 15))
    story.append(Paragraph("National SOC Platform", st['ST']))
    story.append(Paragraph("Djezzy Telecommunications - Algeria", st['ST']))
    story.append(Spacer(1, 30))
    story.append(Paragraph(f"Audit Date: {datetime.now().strftime('%B %d, %Y')}", st['ST']))
    story.append(Paragraph("Classification: INTERNAL - CONFIDENTIAL", st['ST']))
    story.append(Spacer(1, 50))
    
    # Summary box
    summ = [
        ['Assessment', 'NOT PRODUCTION READY'],
        ['Findings', '57 total (8 CRITICAL, 14 HIGH, 21 MEDIUM, 14 LOW)'],
        ['Readiness', '68% average'],
        ['Timeline', '6-10 weeks estimated'],
        ['Risk Level', 'MODERATE-HIGH'],
    ]
    t = Table(summ, colWidths=[160, 260])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), C['hdr']), ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'), ('FONTNAME', (1, 0), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 10), ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
        ('GRID', (0, 0), (-1, -1), 1, C['brd']), ('VALIGN', (0, 0), (-1, -1), 10),
    ]))
    story.append(t)
    story.append(PageBreak())
    
    # TOC
    story.append(Paragraph("Table of Contents", st['H']))
    for item in ["1. Executive Summary", "2. Module Analysis", "3. Cross-Cutting Concerns",
                "4. Remediation Roadmap", "5. Conclusion"]:
        story.append(Paragraph(item, st['B']))
    story.append(PageBreak())
    
    # Executive Summary
    story.append(Paragraph("1. Executive Summary", st['H']))
    story.append(Paragraph("""This audit evaluated 15 modules against enterprise standards.
57 findings identified: 8 CRITICAL, 14 HIGH, 21 MEDIUM, 14 LOW.

Strong architectural foundations exist but critical gaps prevent production deployment:
- SQLite database unsuitable for production SOC workloads
- Exposed secrets in version control
- Incomplete security headers configuration
- No disaster recovery framework

Honest Assessment: Platform is 68% ready. Requires 6-10 weeks remediation.""", st['B']))
    
    story.append(Spacer(1, 12))
    story.append(Paragraph("Module Readiness Summary", st['SH']))
    
    data = [['Module', 'ID', 'Score', 'Status', 'Issues']]
    for mid, name, score, status, nfinds, rec in MODULES:
        data.append([name[:28], mid, f"{score}%", status, f"{nfinds} issues"])
    data.append(['TOTAL', '', '68%', '', '57 findings'])
    
    t = Table(data, colWidths=[155, 48, 48, 52, 105])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), C['hdr']), ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'), ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'), ('FONTSIZE', (0, 1), (-1, -1), 7),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'), ('GRID', (0, 0), (-1, -1), 0.5, C['brd']),
        ('ROWBACKGROUNDS', (0, 1), (-1, -2), [colors.HexColor('#f0f0ed'), colors.white]),
        ('BACKGROUND', (0, -1), (-1, -1), C['bg']),
    ]))
    story.append(t)
    story.append(PageBreak())
    
    # Modules
    story.append(Paragraph("2. Module-by-Module Analysis", st['H']))
    
    for idx, (mid, name, score, status, nfinds, rec) in enumerate(MODULES):
        story.append(Paragraph(f"{mid}: {name} [{status}] {score}%", st['MH']))
        
        fd = [['Sev', 'Key Finding']]
        # Show only first 3 findings to save space
        all_finds = []
        if mid == 'MOD-013':  # Database - show all 5
            all_finds = ['CRITICAL: SQLite cannot handle production loads', 'CRITICAL: No backup/DR strategy',
                        'HIGH: Missing composite indexes', 'HIGH: No table partitioning', 'MEDIUM: No connection pooling']
        elif mid == 'MOD-007':  # AI - show all 3
            all_finds = ['CRITICAL: No ML model integration', 'HIGH: Playbooks simulated', 'HIGH: No approval gates']
        else:
            all_finds = ['CRITICAL: See details' if any(f.startswith('CRITICAL') for f in finds) else finds[0]]
        
        for f in all_finds:
            fd.append([f.split(':')[0] if ':' in f else 'MEDIUM', f.split(':', 1)[1].strip() if ':' in f else f])
        
        ft = Table(fd, colWidths=[55, 430])
        ft.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), C['brd']), ('TEXTCOLOR', (0, 0), (-1, 0), C['txt']),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'), ('FONTSIZE', (0, 0), (-1, 0), 7),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'), ('FONTSIZE', (0, 1), (-1, -1), 7),
            ('GRID', (0, 0), (-1, -1), 0.25, C['brd']),
        ]))
        story.append(ft)
        story.append(Paragraph(f"Recommendation: {rec}", st['D']))
        story.append(Spacer(1, 6))
        
        if (idx + 1) % 4 == 0:
            story.append(PageBreak())
    
    story.append(PageBreak())
    
    # Cross-cutting
    story.append(Paragraph("3. Cross-Cutting Concerns", st['H']))
    
    ccd = [['ID', 'Area', 'Sev', 'Issue']]
    for fid, area, sev, issue in CC_FINDINGS:
        ccd.append([fid, area[:16], sev, issue[:85]])
    
    ct = Table(ccd, colWidths=[35, 72, 50, 320])
    ct.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), C['err']), ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'), ('FONTSIZE', (0, 0), (-1, 0), 8),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'), ('FONTSIZE', (0, 1), (-1, -1), 7),
        ('ALIGN', (0, 0), (2, -1), 'CENTER'), ('GRID', (0, 0), (-1, -1), 0.5, C['brd']),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.HexColor('#f0f0ed'), colors.white]),
    ]))
    story.append(ct)
    story.append(PageBreak())
    
    # Roadmap
    story.append(Paragraph("4. Remediation Roadmap", st['H']))
    
    story.append(Paragraph("<b>Phase 1: CRITICAL (1-2 weeks)</b>", st['B']))
    for item in ["PostgreSQL migration from SQLite", "Secret rotation & Vault implementation", 
                "Token blacklist implementation", "Security headers (CSP/HSTS)", "Rate limiting on all endpoints"]:
        story.append(Paragraph(f"  * {item}", st['D']))
    
    story.append(Paragraph("<b>Phase 2: HIGH (2-4 weeks)</b>", st['B']))
    for item in ["Zod validation schemas", "Structured logging with correlation IDs", 
                "Redis caching integration", "DR framework establishment", "ML/SOAR backend connection"]:
        story.append(Paragraph(f"  * {item}", st['D']))
    
    story.append(Paragraph("<b>Phase 3: MEDIUM (1-2 months)</b>", st['B']))
    for item in ["Collaboration features for Threat Hunting", "Compliance rule engine", 
                "Automated report scheduling", "OpenTelemetry tracing", "Runbook completion"]:
        story.append(Paragraph(f"  * {item}", st['D']))
    
    story.append(PageBreak())
    
    # Conclusion
    story.append(Paragraph("5. Conclusion", st['H']))
    story.append(Paragraph("<b>VERDICT: NOT PRODUCTION READY</b>", st['B']))
    story.append(Paragraph("""Critical blockers must be addressed:

1. Database: PostgreSQL migration is MANDATORY
2. Secrets: Immediate rotation required
3. Security Headers: CSP/HSTS implementation needed
4. Disaster Recovery: Framework must be established
5. Data Integrity: Replace mock data with real integrations

Recommended: Option A (Full Hardening) - 8-10 weeks
Alternative: Option B (Phased Pilot) - 4-6 weeks for limited deployment""", st['B']))
    
    doc.build(story)
    print(f"\nReport: {OUT}")
    print(f"Size: {os.path.getsize(OUT)/1024:.1f} KB")
    return OUT

if __name__ == "__main__":
    build()
