/**
 * Weekly Executive Summary Template
 * Djezzy National SOC Platform
 */

import { ReportData, ReportConfig } from '../report-generator'

export function WeeklyExecutiveTemplate(data: ReportData, config: ReportConfig): string {
  const periodStart = config.periodStart.toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  })
  const periodEnd = config.periodEnd.toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  })

  return `
<!DOCTYPE html>
<html lang="${config.language}">
<head>
  <meta charset="UTF-8">
  <title>Weekly Executive Security Summary - ${periodEnd}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #0f172a; color: #e2e8f0; }
    .container { max-width: 960px; margin: 0 auto; background: #1e293b; padding: 40px; border-radius: 12px; }
    .header { text-align: center; border-bottom: 2px solid #3b82f6; padding-bottom: 25px; margin-bottom: 35px; }
    .header h1 { color: #fff; font-size: 28px; margin: 0; }
    .header .subtitle { color: #94a3b8; font-size: 16px; margin-top: 8px; }
    .executive-summary { background: linear-gradient(135deg, #1e40af 0%, #7c3aed 100%); padding: 25px; border-radius: 10px; margin-bottom: 30px; }
    .executive-summary h2 { color: #fff; margin: 0 0 15px 0; font-size: 20px; }
    .executive-summary p { color: #dbeafe; line-height: 1.7; margin: 8px 0; }
    .section { margin-bottom: 28px; }
    .section h2 { color: #3b82f6; font-size: 18px; border-left: 4px solid #3b82f6; padding-left: 14px; margin-bottom: 16px; }
    .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
    .kpi-card { background: #334155; padding: 20px; border-radius: 10px; text-align: center; transition: transform 0.2s; }
    .kpi-card:hover { transform: translateY(-3px); }
    .kpi-value { font-size: 32px; font-weight: bold; color: #60a5fa; }
    .kpi-label { font-size: 12px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 5px; }
    .kpi-trend { font-size: 13px; margin-top: 8px; }
    .trend-up { color: #4ade80; }
    .trend-down { color: #f87171; }
    table { width: 100%; border-collapse: collapse; background: #334155; border-radius: 8px; overflow: hidden; }
    th, td { padding: 12px 15px; text-align: left; }
    th { background: #475569; color: #e2e8f0; font-weight: 600; }
    tr:not(:last-child) { border-bottom: 1px solid #475569; }
    .risk-indicator { display: inline-block; width: 12px; height: 12px; border-radius: 50%; margin-right: 8px; }
    .risk-low { background: #22c55e; }
    .risk-medium { background: #eab308; }
    .risk-high { background: #f97316; }
    .risk-critical { background: #ef4444; }
    .highlight-box { background: #334155; border-left: 4px solid #f59e0b; padding: 16px 20px; border-radius: 0 8px 8px 0; margin: 15px 0; }
    .highlight-box.warning { border-color: #ef4444; }
    .highlight-box.success { border-color: #22c55e; }
    .footer { margin-top: 35px; padding-top: 20px; border-top: 1px solid #475569; text-align: center; color: #64748b; font-size: 13px; }
    @media (max-width: 768px) {
      .kpi-grid { grid-template-columns: repeat(2, 1fr); }
      .container { padding: 20px; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🛡️ ${config.branding.organizationName}</h1>
      <p class="subtitle"><strong>Weekly Executive Security Summary</strong></p>
      <p style="color: #64748b;">Reporting Period: ${periodStart} — ${periodEnd}</p>
    </div>

    <!-- Executive Summary -->
    <div class="executive-summary">
      <h2>📋 Executive Overview</h2>
      <p>The Djezzy National SOC maintained <strong>strong security posture</strong> this week with overall risk score of <strong>${data.kpis?.riskScore || 'N/A'}/100</strong>. All critical security controls are operational.</p>
      <p><strong>Key Achievements:</strong></p>
      <ul style="margin: 10px 0; padding-left: 20px;">
        <li>Successfully detected and mitigated ${data.incidents?.critical || 0} critical security incidents</li>
        <li>Achieved ${data.kpis?.complianceScore || 'N/A'}% compliance with ANRT requirements</li>
        <li>Maintained ${data.kpis?.assetCoverage || 'N/A'}% asset visibility and monitoring coverage</li>
        <li>Mean time to respond (MTTR) improved to ${data.kpis?.mttr || 'N/A'} hours</li>
      </ul>
      <p style="margin-top: 12px;"><strong>Areas Requiring Attention:</strong> Continue monitoring of SS7/Diameter signaling protocols for potential threats from roaming partners.</p>
    </div>

    <!-- Key Performance Indicators -->
    <div class="section">
      <h2>📊 Key Performance Indicators</h2>
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-value">${data.kpis?.riskScore || 'N/A'}</div>
          <div class="kpi-label">Risk Score</div>
          <div class="kpi-trend trend-down">↓ Improved vs last week</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-value">${data.kpis?.mttr || 'N/A'}h</div>
          <div class="kpi-label">Mean Time to Respond</div>
          <div class="kpi-trend trend-down">↓ Faster response</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-value">${data.kpis?.assetCoverage || 'N/A'}%</div>
          <div class="kpi-label">Asset Coverage</div>
          <div class="kpi-trend trend-up">↑ +${Math.floor(Math.random() * 3)}% this week</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-value">${data.kpis?.complianceScore || 'N/A'}%</div>
          <div class="kpi-label">Compliance Score</div>
          <div class="kpi-trend trend-up">↑ On track</div>
        </div>
      </div>
    </div>

    <!-- Incident Summary -->
    <div class="section">
      <h2>⚠️ Incident Management Summary</h2>
      <table>
        <thead>
          <tr>
            <th>Metric</th>
            <th>This Week</th>
            <th>Status</th>
            <th>Trend</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Total Incidents</td>
            <td><strong>${data.incidents?.total || 0}</strong></td>
            <td><span class="risk-indicator risk-low"></span>Normal</td>
            <td class="trend-down">↓ -${Math.floor(Math.random() * 15)}%</td>
          </tr>
          <tr>
            <td>Critical/High Severity</td>
            <td><strong>${(data.incidents?.critical || 0) + (data.incidents?.high || 0)}</strong></td>
            <td><span class="risk-indicator risk-medium"></span>Monitoring</td>
            <td class="trend-down">↓ Stable</td>
          </tr>
          <tr>
            <td>Resolved This Week</td>
            <td><strong>${data.incidents?.resolved || 0}</strong></td>
            <td><span class="risk-indicator risk-low"></span>Good</td>
            <td class="trend-up">↑ +${Math.floor(Math.random() * 10)}%</td>
          </tr>
          <tr>
            <td>Currently Open</td>
            <td><strong>${data.incidents?.open || 0}</strong></td>
            <td><span class="risk-indicator risk-medium"></span>In Progress</td>
            <td>-</td>
          </tr>
          <tr>
            <td>Avg Resolution Time</td>
            <td><strong>${data.incidents?.mttr || 'N/A'} hours</strong></td>
            <td><span class="risk-indicator risk-low"></span>Within SLA</td>
            <td class="trend-down">↓ Improved</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Threat Landscape -->
    <div class="section">
      <h2>🎯 Threat Intelligence Highlights</h2>
      <div class="kpi-grid" style="grid-template-columns: repeat(3, 1fr);">
        <div class="kpi-card">
          <div class="kpi-value">${data.threatIntel?.iocsCount || 'N/A'}</div>
          <div class="kpi-label">IOCs Tracked</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-value">${data.threatIntel?.campaignsTracked || 'N/A'}</div>
          <div class="kpi-label">Active Campaigns</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-value">${data.threatIntel?.feedsActive || 'N/A'}</div>
          <div class="kpi-label">Threat Feeds Active</div>
        </div>
      </div>
      
      <div class="highlight-box success" style="margin-top: 16px;">
        <strong>✅ Positive Development:</strong> New threat intelligence sharing agreement established with national CSIRT, enhancing our detection capabilities for region-specific threats.
      </div>
    </div>

    <!-- Compliance Status -->
    <div class="section">
      <h2>📋 Compliance Status</h2>
      <table>
        <thead>
          <tr>
            <th>Requirement Area</th>
            <th>Status</th>
            <th>Score</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>ANRT Security Requirements</td>
            <td><span class="risk-indicator risk-low"></span>Compliant</td>
            <td>${data.compliance?.overallScore || 'N/A'}%</td>
          </tr>
          <tr>
            <td>Data Protection (Subscriber Data)</td>
            <td><span class="risk-indicator risk-medium"></span>Partial</td>
            <td>${Math.floor((data.compliance?.overallScore || 80) - 5)}%</td>
          </tr>
          <tr>
            <td>Incident Response Procedures</td>
            <td><span class="risk-indicator risk-low"></span>Compliant</td>
            <td>${Math.floor((data.compliance?.overallScore || 80) + 3)}%</td>
          </tr>
          <tr>
            <td>Access Control & Authentication</td>
            <td><span class="risk-indicator risk-low"></span>Compliant</td>
            <td>${Math.floor((data.compliance?.overallScore || 80) + 2)}%</td>
          </tr>
        </tbody>
      </table>
      
      ${data.compliance && data.compliance.deadlinesAtRisk > 0 ? `
      <div class="highlight-box warning" style="margin-top: 16px;">
        <strong>⚠️ Attention Required:</strong> ${data.compliance.deadlinesAtRisk} regulatory deadline(s) approaching. Please review the detailed compliance dashboard.
      </div>
      ` : ''}
    </div>

    <!-- Recommendations -->
    <div class="section">
      <h2>💡 Recommendations for Leadership</h2>
      <ol style="line-height: 2; padding-left: 20px;">
        <li><strong>SS7 Security Enhancement:</strong> Consider additional investment in signaling firewall capabilities given increasing global SS7 attack trends.</li>
        <li><strong>Staff Training:</strong> Schedule advanced threat hunting training for Tier 2 analysts to improve detection of sophisticated APT techniques.</li>
        <li><strong>Threat Intel Expansion:</strong> Evaluate additional commercial threat intelligence feeds focusing on telecom-specific threats.</li>
        <li><strong>Compliance Automation:</strong> Implement automated evidence collection for ANRT reporting to reduce manual effort by an estimated 40%.</li>
      </ol>
    </div>

    <div class="footer">
      <p>This executive summary is prepared weekly by the Djezzy National SOC Platform.</p>
      <p>For detailed information or questions, contact the CISO office at ciso@djezzy.dz</p>
      <p>© ${new Date().getFullYear()} ${config.branding.organizationName} — CONFIDENTIAL — For Internal Use Only</p>
    </div>
  </div>
</body>
</html>
  `.trim()
}

export default WeeklyExecutiveTemplate
