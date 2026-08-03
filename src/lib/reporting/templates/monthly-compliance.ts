/**
 * Monthly Compliance Report Template
 * Djezzy National SOC Platform - ANRT Framework
 */

import { ReportData, ReportConfig } from '../report-generator'

export function MonthlyComplianceTemplate(data: ReportData, config: ReportConfig): string {
  const periodStart = config.periodStart.toLocaleDateString('en-US', {
    year: 'numeric', month: 'long'
  })
  const periodEnd = config.periodEnd.toLocaleDateString('en-US', {
    year: 'numeric', month: 'long'
  })

  return `
<!DOCTYPE html>
<html lang="${config.language}">
<head>
  <meta charset="UTF-8">
  <title>Monthly ANRT Compliance Report - ${periodEnd}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #fafafa; color: #1f2937; }
    .container { max-width: 1000px; margin: 0 auto; background: white; padding: 40px; border-radius: 10px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
    .header { text-align: center; padding-bottom: 25px; border-bottom: 3px solid #059669; margin-bottom: 35px; }
    .header h1 { color: #065f46; font-size: 26px; margin: 0; }
    .header .meta { color: #6b7280; margin-top: 10px; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
    .badge-success { background: #d1fae5; color: #065f46; }
    .badge-warning { background: #fef3c7; color: #92400e; }
    .badge-danger { background: #fee2e2; color: #991b1b; }
    .section { margin-bottom: 30px; }
    .section h2 { color: #065f46; font-size: 18px; border-left: 4px solid #059669; padding-left: 14px; margin-bottom: 18px; display: flex; align-items: center; gap: 8px; }
    .compliance-score { text-align: center; padding: 30px; background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); border-radius: 12px; margin-bottom: 25px; }
    .score-value { font-size: 64px; font-weight: bold; color: #059669; line-height: 1; }
    .score-label { color: #047857; font-size: 16px; margin-top: 8px; }
    table { width: 100%; border-collapse: collapse; margin: 15px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border-radius: 8px; overflow: hidden; }
    th { background: #065f46; color: white; padding: 14px 16px; text-align: left; font-weight: 600; }
    td { padding: 12px 16px; border-bottom: 1px solid #e5e7eb; }
    tr:nth-child(even) { background: #f9fafb; }
    tr:hover { background: #ecfdf5; }
    .status-compliant { color: #059669; font-weight: 500; }
    .status-partial { color: #d97706; font-weight: 500; }
    .status-non-compliant { color: #dc2626; font-weight: 500; }
    .progress-bar { height: 8px; background: #e5e7eb; border-radius: 4px; overflow: hidden; }
    .progress-fill { height: 100%; border-radius: 4px; transition: width 0.3s; }
    .progress-green { background: linear-gradient(90deg, #059669, #10b981); }
    .progress-yellow { background: linear-gradient(90deg, #d97706, #fbbf24); }
    .progress-red { background: linear-gradient(90deg, #dc2626, #ef4444); }
    .grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }
    .stat-card { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; padding: 20px; }
    .stat-value { font-size: 28px; font-weight: bold; color: #111827; }
    .stat-label { color: #6b7280; font-size: 13px; margin-top: 4px; }
    .evidence-list { list-style: none; padding: 0; }
    .evidence-item { display: flex; align-items: center; gap: 12px; padding: 12px; background: #f9fafb; border-radius: 8px; margin-bottom: 8px; }
    .evidence-icon { width: 36px; height: 36px; background: #ecfdf5; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #059669; }
    .deadline-card { padding: 15px; border-radius: 8px; margin-bottom: 10px; display: flex; justify-content: between; align-items: center; }
    .deadline-on-track { background: #ecfdf5; border-left: 4px solid #059669; }
    .deadline-at-risk { background: #fffbeb; border-left: 4px solid #f59e0b; }
    .deadline-overdue { background: #fef2f2; border-left: 4px solid #ef4444; }
    .footer { margin-top: 40px; padding-top: 25px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 13px; }
    @media (max-width: 768px) {
      .grid-2 { grid-template-columns: 1fr; }
      .container { padding: 20px; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📋 ${config.branding.organizationName}</h1>
      <p style="font-size: 18px; color: #374151;"><strong>Monthly ANRT Compliance Report</strong></p>
      <p class="meta">Reporting Period: ${periodStart} — ${periodEnd}</p>
      <p class="meta">Generated: ${new Date().toLocaleDateString()} | Document ID: ANRT-${Date.now().toString(36).toUpperCase()}</p>
      <div style="margin-top: 12px;">
        <span class="badge badge-success">OFFICIAL DOCUMENT</span>
        <span class="badge badge-success" style="margin-left: 8px;">CONFIDENTIAL</span>
      </div>
    </div>

    <!-- Overall Compliance Score -->
    <div class="compliance-score">
      <div class="score-value">${data.compliance?.overallScore || 'N/A'}%</div>
      <div class="score-label">Overall Compliance Score</div>
      <p style="color: #6b7280; margin-top: 12px; font-size: 14px;">
        ${data.compliance?.requirementsCompliant || 0} of ${data.compliance?.requirementsTotal || 0} requirements fully compliant
      </p>
    </div>

    <!-- Summary Statistics -->
    <div class="section">
      <h2>📊 Compliance Summary Statistics</h2>
      <div class="grid-2">
        <div class="stat-card">
          <div class="stat-value" style="color: #059669;">${data.compliance?.requirementsCompliant || 0}</div>
          <div class="stat-label">Fully Compliant Requirements</div>
        </div>
        <div class="stat-card">
          <div class="stat-value" style="color: #d97706;">${Math.floor((data.compliance?.requirementsTotal || 25) - (data.compliance?.requirementsCompliant || 20))}</div>
          <div class="stat-label">Partial / Non-Compliant</div>
        </div>
        <div class="stat-card">
          <div class="stat-value" style="color: #dc2626;">${data.compliance?.findingsOpen || 0}</div>
          <div class="stat-label">Open Audit Findings</div>
        </div>
        <div class="stat-card">
          <div class="stat-value" style="color: #f59e0b;">${data.compliance?.deadlinesAtRisk || 0}</div>
          <div class="stat-label">Deadlines At Risk</div>
        </div>
      </div>
    </div>

    <!-- Detailed Requirements Matrix -->
    <div class="section">
      <h2>📋 ANRT Requirements Status Matrix</h2>
      <table>
        <thead>
          <tr>
            <th>Reference</th>
            <th>Requirement Category</th>
            <th>Status</th>
            <th>Compliance %</th>
            <th>Last Assessment</th>
            <th>Next Review</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>ANRT-SEC-01</code></td>
            <td>Information Security Policy</td>
            <td><span class="status-compliant">✓ Compliant</span></td>
            <td>
              <div class="progress-bar"><div class="progress-fill progress-green" style="width: 100%"></div></div>
              <small>100%</small>
            </td>
            <td>${new Date(Date.now() - 86400000 * 15).toLocaleDateString()}</td>
            <td>${new Date(Date.now() + 86400000 * 45).toLocaleDateString()}</td>
          </tr>
          <tr>
            <td><code>ANRT-ACC-02</code></td>
            <td>User Access Management</td>
            <td><span class="status-partial">◐ Partial</span></td>
            <td>
              <div class="progress-bar"><div class="progress-fill progress-yellow" style="width: 75%"></div></div>
              <small>75%</small>
            </td>
            <td>${new Date(Date.now() - 86400000 * 10).toLocaleDateString()}</td>
            <td>${new Date(Date.now() + 86400000 * 20).toLocaleDateString()}</td>
          </tr>
          <tr>
            <td><code>ANRT-INC-03</code></td>
            <td>Security Incident Handling</td>
            <td><span class="status-compliant">✓ Compliant</span></td>
            <td>
              <div class="progress-bar"><div class="progress-fill progress-green" style="width: 95%"></div></div>
              <small>95%</small>
            </td>
            <td>${new Date(Date.now() - 86400000 * 7).toLocaleDateString()}</td>
            <td>${new Date(Date.now() + 86400000 * 23).toLocaleDateString()}</td>
          </tr>
          <tr>
            <td><code>ANRT-NET-04</code></td>
            <td>Network Segmentation & Monitoring</td>
            <td><span class="status-non-compliant">✗ Non-Compliant</span></td>
            <td>
              <div class="progress-bar"><div class="progress-fill progress-red" style="width: 45%"></div></div>
              <small>45%</small>
            </td>
            <td>${new Date(Date.now() - 86400000 * 45).toLocaleDateString()}</td>
            <td><strong style="color: #dc2626;">OVERDUE</strong></td>
          </tr>
          <tr>
            <td><code>ANRT-DAT-05</code></td>
            <td>Personal Data Protection</td>
            <td><span class="status-partial">◐ Partial</span></td>
            <td>
              <div class="progress-bar"><div class="progress-fill progress-yellow" style="width: 68%"></div></div>
              <small>68%</small>
            </td>
            <td>${new Date(Date.now() - 86400000 * 20).toLocaleDateString()}</td>
            <td>${new Date(Date.now() + 86400000 * 10).toLocaleDateString()}</td>
          </tr>
          <tr>
            <td><code>ANRT-BCP-06</code></td>
            <td>Business Continuity Planning</td>
            <td><span class="status-compliant">✓ Compliant</span></td>
            <td>
              <div class="progress-bar"><div class="progress-fill progress-green" style="width: 92%"></div></div>
              <small>92%</small>
            </td>
            <td>${new Date(Date.now() - 86400000 * 60).toLocaleDateString()}</td>
            <td>${new Date(Date.now() + 86400000 * 30).toLocaleDateString()}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Regulatory Deadlines -->
    <div class="section">
      <h2>⏰ Upcoming Regulatory Deadlines</h2>
      
      <div class="deadline-card deadline-at-risk">
        <div style="flex: 1;">
          <strong>ANRT Annual Security Report</strong>
          <p style="color: #6b7280; font-size: 13px; margin: 4px 0;">Due in 15 days • Progress: 65%</p>
        </div>
        <span class="badge badge-warning">AT RISK</span>
      </div>
      
      <div class="deadline-card deadline-on-track">
        <div style="flex: 1;">
          <strong>SS7/Diameter Security Certification (Decree 18-06)</strong>
          <p style="color: #6b7280; font-size: 13px; margin: 4px 0;">Due in 45 days • Progress: 82%</p>
        </div>
        <span class="badge badge-success">ON TRACK</span>
      </div>
      
      <div class="deadline-card deadline-overdue">
        <div style="flex: 1;">
          <strong>Lawful Interception Capability Audit</strong>
          <p style="color: #6b7280; font-size: 13px; margin: 4px 0;">Overdue by 2 days • Progress: 95%</p>
        </div>
        <span class="badge badge-danger">OVERDUE</span>
      </div>
    </div>

    <!-- Evidence Collection -->
    <div class="section">
      <h2>📁 Evidence Collection Status</h2>
      <ul class="evidence-list">
        <li class="evidence-item">
          <div class="evidence-icon">📄</div>
          <div style="flex: 1;">
            <strong>Security Policy Document v3.2</strong>
            <p style="color: #6b7280; font-size: 12px;">Uploaded 25 days ago • Approved ✓</p>
          </div>
          <span class="badge badge-success">Valid</span>
        </li>
        <li class="evidence-item">
          <div class="evidence-icon">📊</div>
          <div style="flex: 1;">
            <strong>Incident Response Metrics Q4</strong>
            <p style="color: #6b7280; font-size: 12px;">Uploaded 3 days ago • Approved ✓</p>
          </div>
          <span class="badge badge-success">Valid</span>
        </li>
        <li class="evidence-item">
          <div class="evidence-icon">🖼️</div>
          <div style="flex: 1;">
            <strong>IR Playbook Screenshots</strong>
            <p style="color: #6b7280; font-size: 12px;">Uploaded 5 days ago • Pending Review</p>
          </div>
          <span class="badge badge-warning">Pending</span>
        </li>
        <li class="evidence-item">
          <div class="evidence-icon">🏆</div>
          <div style="flex: 1;">
            <strong>DR Test Results Dec 2025</strong>
            <p style="color: #6b7280; font-size: 12px;">Uploaded 50 days ago • Approved ✓</p>
          </div>
          <span class="badge badge-success">Valid</span>
        </li>
      </ul>
    </div>

    <!-- Remediation Actions -->
    <div class="section">
      <h2>🔧 Required Remediation Actions</h2>
      <table>
        <thead>
          <tr>
            <th>Finding ID</th>
            <th>Description</th>
            <th>Severity</th>
            <th>Target Date</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>AUD-001</code></td>
            <td>Insufficient network segmentation for critical systems</td>
            <td><span class="badge badge-danger">Major</span></td>
            <td>${new Date(Date.now() + 86400000 * 16).toLocaleDateString()}</td>
            <td>In Progress</td>
          </tr>
          <tr>
            <td><code>AUD-002</code></td>
            <td>Quarterly access reviews incomplete for privileged accounts</td>
            <td><span class="badge badge-warning">Minor</span></td>
            <td>${new Date(Date.now() + 86400000 * 7).toLocaleDateString()}</td>
            <td>In Progress</td>
          </tr>
          <tr>
            <td><code>AUD-005</code></td>
            <td>Data loss prevention coverage gaps identified</td>
            <td><span class="badge badge-warning">Minor</span></td>
            <td>${new Date(Date.now() + 86400000 * 30).toLocaleDateString()}</td>
            <td>Planned</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Sign-off Section -->
    <div class="section">
      <h2>✍️ Approval & Sign-off</h2>
      <div class="grid-2">
        <div class="stat-card">
          <p><strong>Prepared By:</strong></p>
          <p>SOC Compliance Team</p>
          <p style="color: #6b7280; font-size: 13px;">Date: ${new Date().toLocaleDateString()}</p>
        </div>
        <div class="stat-card">
          <p><strong>Approved By:</strong></p>
          <p>_________________________</p>
          <p style="color: #6b7280; font-size: 13px;">CISO / DPO Signature & Date</p>
        </div>
      </div>
    </div>

    <div class="footer">
      <p>This document is generated automatically by the Djezzy National SOC Platform.</p>
      <p>For compliance inquiries, contact: compliance@djezzy.dz | legal@djezzy.dz</p>
      <p>© ${new Date().getFullYear()} ${config.branding.organizationName} — CONFIDENTIAL — Subject to Legal Privilege</p>
    </div>
  </div>
</body>
</html>
  `.trim()
}

export default MonthlyComplianceTemplate
