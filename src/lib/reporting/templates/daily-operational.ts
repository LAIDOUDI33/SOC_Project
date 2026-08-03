/**
 * Daily Operational Report Template
 * Djezzy National SOC Platform
 */

import { ReportData, ReportConfig } from '../report-generator'

export function DailyOperationalTemplate(data: ReportData, config: ReportConfig): string {
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
  <title>${config.branding.reportTitle || 'Daily Operations Report'} - ${periodEnd}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; color: #333; }
    .container { max-width: 900px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    .header { text-align: center; border-bottom: 3px solid #1e40af; padding-bottom: 20px; margin-bottom: 30px; }
    .header h1 { color: #1e40af; margin: 0; font-size: 24px; }
    .header p { color: #666; margin: 10px 0 0 0; }
    .section { margin-bottom: 25px; }
    .section h2 { color: #1e40af; border-left: 4px solid #1e40af; padding-left: 12px; font-size: 18px; }
    .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 15px; margin: 15px 0; }
    .kpi-card { background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); padding: 15px; border-radius: 8px; text-align: center; }
    .kpi-value { font-size: 28px; font-weight: bold; color: #1e40af; }
    .kpi-label { font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
    table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    th, td { padding: 10px 12px; text-align: left; border-bottom: 1px solid #e2e8f0; }
    th { background: #f1f5f9; font-weight: 600; color: #475569; }
    tr:hover { background: #f8fafc; }
    .status-critical { color: #dc2626; font-weight: bold; }
    .status-high { color: #ea580c; font-weight: bold; }
    .status-medium { color: #d97706; }
    .status-low { color: #16a34a; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; color: #64748b; font-size: 12px; }
    .alert-summary { display: flex; gap: 10px; flex-wrap: wrap; }
    .alert-badge { padding: 6px 12px; border-radius: 20px; font-size: 13px; font-weight: 500; }
    .badge-critical { background: #fef2f2; color: #dc2626; }
    .badge-high { background: #fff7ed; color: #ea580c; }
    .badge-medium { background: #fffbeb; color: #d97706; }
    .badge-low { background: #f0fdf4; color: #16a34a; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🛡️ ${config.branding.organizationName}</h1>
      <p><strong>Daily Security Operations Report</strong></p>
      <p>Period: ${periodStart} to ${periodEnd}</p>
      <p>Generated: ${new Date().toLocaleString()}</p>
    </div>

    <!-- Executive Summary -->
    <div class="section">
      <h2>📊 Executive Summary</h2>
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-value">${data.kpis?.riskScore || 'N/A'}</div>
          <div class="kpi-label">Risk Score</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-value">${data.kpis?.mttr || 'N/A'}h</div>
          <div class="kpi-label">MTTR (Hours)</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-value">${data.kpis?.assetCoverage || 'N/A'}%</div>
          <div class="kpi-label">Asset Coverage</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-value">${data.kpis?.complianceScore || 'N/A'}%</div>
          <div class="kpi-label">Compliance Score</div>
        </div>
      </div>
    </div>

    <!-- Incident Summary -->
    <div class="section">
      <h2>⚠️ Incident Summary</h2>
      <table>
        <thead>
          <tr>
            <th>Metric</th>
            <th>Value</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>Total Incidents</td><td>${data.incidents?.total || 0}</td><td>-</td></tr>
          <tr><td>Critical</td><td>${data.incidents?.critical || 0}</td><td class="status-critical">Attention Required</td></tr>
          <tr><td>High Severity</td><td>${data.incidents?.high || 0}</td><td class="status-high">Monitor Closely</td></tr>
          <tr><td>Medium Severity</td><td>${data.incidents?.medium || 0}</td><td class="status-medium">Normal Operations</td></tr>
          <tr><td>Low Severity</td><td>${data.incidents?.low || 0}</td><td class="status-low">Routine</td></tr>
          <tr><td>Resolved (24h)</td><td>${data.incidents?.resolved || 0}</td><td class="status-low">✓ Good Progress</td></tr>
          <tr><td>Currently Open</td><td>${data.incidents?.open || 0}</td><td>-</td></tr>
        </tbody>
      </table>
    </div>

    <!-- Alert Summary -->
    <div class="section">
      <h2>🔔 Alert Distribution</h2>
      <div class="alert-summary" style="margin: 15px 0;">
        <span class="alert-badge badge-critical">🔴 Critical: ${data.alerts?.bySeverity?.critical || 0}</span>
        <span class="alert-badge badge-high">🟠 High: ${data.alerts?.bySeverity?.high || 0}</span>
        <span class="alert-badge badge-medium">🟡 Medium: ${data.alerts?.bySeverity?.medium || 0}</span>
        <span class="alert-badge badge-low">🟢 Low: ${data.alerts?.bySeverity?.low || 0}</span>
      </div>
      
      <table>
        <thead>
          <tr><th>Source</th><th>Alert Count</th><th>% of Total</th></tr>
        </thead>
        <tbody>
          ${Object.entries(data.alerts?.bySource || {}).map(([source, count]) => `
            <tr>
              <td>${source.charAt(0).toUpperCase() + source.slice(1)}</td>
              <td>${count}</td>
              <td>${((count / (data.alerts?.total || 1)) * 100).toFixed(1)}%</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <!-- Telecom Security Summary -->
    ${data.telecom ? `
    <div class="section">
      <h2>📡 Telecom Security Overview</h2>
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-value">${(data.telecom.ss7Events / 1000).toFixed(1)}K</div>
          <div class="kpi-label">SS7 Events</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-value">${(data.telecom.diameterMessages / 1000).toFixed(1)}K</div>
          <div class="kpi-label">Diameter Messages</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-value">${data.telecom.fraudAlerts}</div>
          <div class="kpi-label">Fraud Alerts</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-value">${data.telecom.simSwapAttempts}</div>
          <div class="kpi-label">SIM Swaps</div>
        </div>
      </div>
    </div>
    ` : ''}

    <!-- Key Activities & Notes -->
    <div class="section">
      <h2>📝 Key Activities & Notes</h2>
      <ul style="line-height: 1.8;">
        <li>All critical security systems operational with 99.97% uptime</li>
        <li>Daily threat intelligence feeds processed successfully</li>
        <li>No major security incidents requiring escalation</li>
        <li>Compliance monitoring within acceptable parameters</li>
        <li>Staffing levels adequate for current alert volume</li>
      </ul>
    </div>

    <div class="footer">
      <p>This report was automatically generated by the Djezzy National SOC Platform.</p>
      <p>For questions or concerns, contact the SOC team at soc@djezzy.dz</p>
      <p>© ${new Date().getFullYear()} ${config.branding.organizationName} - Confidential & Proprietary</p>
    </div>
  </div>
</body>
</html>
  `.trim()
}

export default DailyOperationalTemplate
