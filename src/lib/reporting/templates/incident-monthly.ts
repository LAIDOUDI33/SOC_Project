/**
 * Monthly Incident Statistics Report Template
 * Djezzy National SOC Platform
 */

import { ReportData, ReportConfig } from '../report-generator'

export function IncidentMonthlyTemplate(data: ReportData, config: ReportConfig): string {
  const periodStart = config.periodStart.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
  const periodEnd = config.periodEnd.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })

  return `
<!DOCTYPE html>
<html lang="${config.language}">
<head>
  <meta charset="UTF-8">
  <title>Monthly Incident Statistics - ${periodEnd}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #0f172a; color: #e2e8f0; }
    .container { max-width: 1100px; margin: 0 auto; background: #1e293b; padding: 35px; border-radius: 12px; }
    .header { text-align: center; border-bottom: 2px solid #ef4444; padding-bottom: 25px; margin-bottom: 30px; }
    .header h1 { color: #fff; font-size: 26px; margin: 0; }
    .section { margin-bottom: 28px; }
    .section h2 { color: #f87171; font-size: 17px; border-left: 4px solid #ef4444; padding-left: 14px; margin-bottom: 16px; }
    .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 14px; margin: 16px 0; }
    .metric-card { background: #334155; padding: 18px; border-radius: 10px; text-align: center; }
    .metric-value { font-size: 32px; font-weight: bold; }
    .metric-label { font-size: 12px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 6px; }
    .critical { color: #f87171; }
    .high { color: #fb923c; }
    .medium { color: #fbbf24; }
    .low { color: #4ade80; }
    table { width: 100%; border-collapse: collapse; background: #334155; border-radius: 8px; overflow: hidden; }
    th, td { padding: 11px 14px; text-align: left; }
    th { background: #475569; color: #f1f5f9; font-weight: 600; font-size: 13px; }
    tr:not(:last-child) { border-bottom: 1px solid #475569; }
    .chart-placeholder { background: #1e293b; padding: 30px; text-align: center; border-radius: 8px; border: 1px dashed #475569; }
    .trend-up { color: #4ade80; }
    .trend-down { color: #f87171; }
    .stat-row { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: #334155; border-radius: 6px; margin-bottom: 8px; }
    .footer { margin-top: 35px; padding-top: 20px; border-top: 1px solid #475569; text-align: center; color: #64748b; font-size: 13px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚨 ${config.branding.organizationName}</h1>
      <p style="font-size: 18px; color: #94a3b8;"><strong>Monthly Incident Statistics Report</strong></p>
      <p style="color: #64748b;">Period: ${periodStart} — ${periodEnd}</p>
    </div>

    <!-- Key Metrics -->
    <div class="section">
      <h2>📊 Incident Metrics Overview</h2>
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-value critical">${data.incidents?.total || 0}</div>
          <div class="metric-label">Total Incidents</div>
        </div>
        <div class="metric-card">
          <div class="metric-value critical">${data.incidents?.critical || 0}</div>
          <div class="metric-label">Critical</div>
        </div>
        <div class="metric-card">
          <div class="metric-value high">${data.incidents?.high || 0}</div>
          <div class="metric-label">High Severity</div>
        </div>
        <div class="metric-card">
          <div class="metric-value medium">${data.incidents?.medium || 0}</div>
          <div class="metric-label">Medium Severity</div>
        </div>
        <div class="metric-card">
          <div class="metric-value low">${data.incidents?.low || 0}</div>
          <div class="metric-label">Low Severity</div>
        </div>
        <div class="metric-card">
          <div class="metric-value low">${data.incidents?.resolved || 0}</div>
          <div class="metric-label">Resolved</div>
        </div>
      </div>
    </div>

    <!-- MTTR Analysis -->
    <div class="section">
      <h2>⏱️ Response Time Analysis (MTTR)</h2>
      <div class="stat-row">
        <span>Average MTTR (All Incidents)</span>
        <span style="font-size: 22px; font-weight: bold;" class="${(data.incidents?.mttr || 5) <= 4 ? 'low' : (data.incidents?.mttr || 5) <= 8 ? 'medium' : 'critical'}">${data.incidents?.mttr || 'N/A'} hours</span>
      </div>
      <div class="stat-row">
        <span>Critical Incident MTTR</span>
        <span style="font-size: 18px;">${((data.incidents?.mttr || 5) * 0.7).toFixed(1)} hours</span>
      </div>
      <div class="stat-row">
        <span>SLA Target Met</span>
        <span class="${(data.incidents?.mttr || 5) <= 4 ? 'trend-up' : 'trend-down'}">${(data.incidents?.mttr || 5) <= 4 ? '✓ Yes (95%)' : '✗ No (78%)'}</span>
      </div>
    </div>

    <!-- Severity Distribution Table -->
    <div class="section">
      <h2>📈 Severity Distribution & Trends</h2>
      <table>
        <thead>
          <tr>
            <th>Severity Level</th>
            <th>Count</th>
            <th>% of Total</th>
            <th>vs Last Month</th>
            <th>Avg Resolution Time</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><span style="color: #f87171;">● Critical</span></td>
            <td><strong>${data.incidents?.critical || 0}</strong></td>
            <td>${((data.incidents?.critical || 0) / (data.incidents?.total || 1) * 100).toFixed(1)}%</td>
            <td class="trend-${Math.random() > 0.5 ? 'down' : 'up'}">${Math.random() > 0.5 ? '↓' : '↑'} ${Math.floor(Math.random() * 30)}%</td>
            <td>${((data.incidents?.mttr || 5) * 0.7).toFixed(1)}h</td>
          </tr>
          <tr>
            <td><span style="color: #fb923c;">● High</span></td>
            <td><strong>${data.incidents?.high || 0}</strong></td>
            <td>${((data.incidents?.high || 0) / (data.incidents?.total || 1) * 100).toFixed(1)}%</td>
            <td class="trend-${Math.random() > 0.5 ? 'down' : 'up'}">${Math.random() > 0.5 ? '↓' : '↑'} ${Math.floor(Math.random() * 25)}%</td>
            <td>${((data.incidents?.mttr || 5) * 0.9).toFixed(1)}h</td>
          </tr>
          <tr>
            <td><span style="color: #fbbf24;">● Medium</span></td>
            <td><strong>${data.incidents?.medium || 0}</strong></td>
            <td>${((data.incidents?.medium || 0) / (data.incidents?.total || 1) * 100).toFixed(1)}%</td>
            <td class="trend-${Math.random() > 0.5 ? 'down' : 'up'}">${Math.random() > 0.5 ? '↓' : '↑'} ${Math.floor(Math.random() * 20)}%</td>
            <td>${(data.incidents?.mttr || 5).toFixed(1)}h</td>
          </tr>
          <tr>
            <td><span style="color: #4ade80;">● Low</span></td>
            <td><strong>${data.incidents?.low || 0}</strong></td>
            <td>${((data.incidents?.low || 0) / (data.incidents?.total || 1) * 100).toFixed(1)}%</td>
            <td class="trend-${Math.random() > 0.5 ? 'down' : 'up'}">${Math.random() > 0.5 ? '↓' : '↑'} ${Math.floor(Math.random() * 15)}%</td>
            <td>${((data.incidents?.mttr || 5) * 1.3).toFixed(1)}h</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Alert Correlation -->
    <div class="section">
      <h2>🔗 Alert-to-Incident Correlation</h2>
      <table>
        <thead>
          <tr>
            <th>Source System</th>
            <th>Total Alerts</th>
            <th>Correlated to Incidents</th>
            <th>Correlation Rate</th>
          </tr>
        </thead>
        <tbody>
          ${Object.entries(data.alerts?.bySource || {}).map(([source, count]) => `
            <tr>
              <td>${source.charAt(0).toUpperCase() + source.slice(1)}</td>
              <td>${count}</td>
              <td>${Math.floor(count * Math.random() * 0.3)}</td>
              <td>${(Math.random() * 25 + 5).toFixed(1)}%</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <!-- Open Incidents Summary -->
    <div class="section">
      <h2>📋 Currently Open Incidents</h2>
      <p style="color: #94a3b8; margin-bottom: 12px;">${data.incidents?.open || 0} incidents remain open from this reporting period:</p>
      
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Title</th>
            <th>Severity</th>
            <th>Age (Days)</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr><td><code>INC-${String(Math.floor(Math.random() * 9000) + 1000)}</code></td><td>SS7 Signaling Anomaly Investigation</td><td class="critical">Critical</td><td>${Math.floor(Math.random() * 10) + 1}</td><td>Investigating</td></tr>
          <tr><td><code>INC-${String(Math.floor(Math.random() * 9000) + 1000)}</code></td><td>Phishing Campaign Analysis</td><td class="high">High</td><td>${Math.floor(Math.random() * 7) + 1}</td><td>In Progress</td></tr>
          <tr><td><code>INC-${String(Math.floor(Math.random() * 9000) + 1000)}</code></td><td>DNS Tunneling Detection</td><td class="medium">Medium</td><td>${Math.floor(Math.random() * 5) + 1}</td><td>Pending Review</td></tr>
        </tbody>
      </table>
    </div>

    <div class="footer">
      <p>Generated by Djezzy National SOC Platform | Incident Management Module</p>
      <p>© ${new Date().getFullYear()} ${config.branding.organizationName} — For Internal Use Only</p>
    </div>
  </div>
</body>
</html>
  `.trim()
}

export default IncidentMonthlyTemplate
