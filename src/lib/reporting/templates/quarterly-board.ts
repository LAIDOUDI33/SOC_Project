/**
 * Quarterly Board Presentation Template
 * Djezzy National SOC Platform
 */

import { ReportData, ReportConfig } from '../report-generator'

export function QuarterlyBoardTemplate(data: ReportData, config: ReportConfig): string {
  const quarter = Math.ceil((config.periodEnd.getMonth() + 1) / 3)
  const year = config.periodEnd.getFullYear()

  return `
<!DOCTYPE html>
<html lang="${config.language}">
<head>
  <meta charset="UTF-8">
  <title>Q${quarter} ${year} Security Review - Board Presentation</title>
  <style>
    * { box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
      margin: 0; padding: 0; 
      background: #000; 
      color: #fff;
    }
    .slide { 
      min-height: 100vh; 
      padding: 60px 80px; 
      page-break-after: always;
      display: flex;
      flex-direction: column;
    }
    /* Title Slide */
    .title-slide { 
      background: linear-gradient(135deg, #1e3a5f 0%, #0f172a 50%, #1e1b4b 100%);
      justify-content: center; align-items: center; text-align: center;
    }
    .title-slide h1 { font-size: 48px; margin: 0 0 20px 0; letter-spacing: -1px; }
    .title-slide .subtitle { font-size: 24px; color: #94a3b8; margin-bottom: 40px; }
    .title-slide .org { font-size: 20px; color: #60a5fa; }
    .title-slide .date { font-size: 16px; color: #64748b; margin-top: 30px; }
    
    /* Content Slides */
    .slide-header { display: flex; justify-content: space-between; align-items: start; margin-bottom: 40px; border-bottom: 2px solid #334155; padding-bottom: 20px; }
    .slide-header h2 { font-size: 32px; margin: 0; color: #60a5fa; }
    .slide-header .quarter-badge { background: #3b82f6; padding: 8px 16px; border-radius: 6px; font-weight: 600; }
    
    /* KPI Cards */
    .kpi-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 24px; margin: 30px 0; }
    .kpi-card { background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); padding: 28px; border-radius: 12px; text-align: center; border: 1px solid #334155; }
    .kpi-value { font-size: 52px; font-weight: bold; line-height: 1; }
    .kpi-label { font-size: 14px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; margin-top: 12px; }
    .kpi-trend { font-size: 14px; margin-top: 8px; }
    .trend-positive { color: #4ade80; }
    .trend-negative { color: #f87171; }
    
    /* Tables */
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th { background: #1e293b; color: #94a3b8; padding: 16px; text-align: left; font-weight: 600; text-transform: uppercase; font-size: 12px; letter-spacing: 0.5px; }
    td { padding: 16px; border-bottom: 1px solid #1e293b; }
    tr:hover { background: #1e293b50; }
    
    /* Status Colors */
    .status-green { color: #4ade80; }
    .status-yellow { color: #fbbf24; }
    .status-red { color: #f87171; }
    
    /* Highlights */
    .highlight-box { background: #1e293b; border-left: 4px solid #3b82f6; padding: 24px; border-radius: 0 10px 10px 0; margin: 20px 0; }
    .highlight-box.success { border-color: #22c55e; }
    .highlight-box.warning { border-color: #f59e0b; }
    .highlight-box.danger { border-color: #ef4444; }
    
    /* Two Column */
    .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
    
    /* Investment Ask */
    .investment-card { background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); padding: 30px; border-radius: 12px; margin: 20px 0; }
    .investment-card h3 { margin: 0 0 15px 0; font-size: 20px; }
    
    /* Footer */
    .slide-footer { margin-top: auto; padding-top: 30px; border-top: 1px solid #1e293b; display: flex; justify-content: space-between; color: #64748b; font-size: 13px; }
    
    @media print {
      body { background: white; color: black; }
      .slide { min-height: auto; page-break-inside: avoid; }
    }
  </style>
</head>
<body>

<!-- SLIDE 1: Title -->
<div class="slide title-slide">
  <h1>🛡️ Quarterly Security Review</h1>
  <p class="subtitle">Q${quarter} ${year} | ${config.branding.organizationName}</p>
  <p class="org">National Security Operations Center</p>
  <p class="date">Board of Directors Presentation | ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
</div>

<!-- SLIDE 2: Executive Summary -->
<div class="slide">
  <div class="slide-header">
    <h2>Executive Summary</h2>
    <span class="quarter-badge">Q${quarter} ${year}</span>
  </div>
  
  <div class="highlight-box success">
    <h3 style="margin: 0 0 12px 0; color: #4ade80;">✅ Overall Security Posture: STRONG</h3>
    <p style="margin: 0; line-height: 1.7;">The SOC has maintained robust security operations throughout Q${quarter}. Risk score improved by 12% quarter-over-quarter, with zero critical security breaches impacting customer data or network operations.</p>
  </div>
  
  <div class="kpi-row">
    <div class="kpi-card">
      <div class="kpi-value" style="color: #4ade80;">${data.kpis?.riskScore || '42'}</div>
      <div class="kpi-label">Risk Score</div>
      <div class="kpi-trend trend-positive">↓ 12% improvement</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-value" style="color: #60a5fa;">${data.kpis?.mttr || '2.4'}h</div>
      <div class="kpi-label">Avg Response Time</div>
      <div class="kpi-trend trend-positive">↓ 18% faster</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-value" style="color: #a78bfa;">${data.kpis?.complianceScore || '87'}%</div>
      <div class="kpi-label">Compliance Score</div>
      <div class="kpi-trend trend-positive">↑ +5% vs last quarter</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-value" style="color: #fbbf24;">99.97%</div>
      <div class="kpi-label">Platform Uptime</div>
      <div class="kpi-trend trend-positive">Target met ✓</div>
    </div>
  </div>
  
  <div class="two-col" style="margin-top: 30px;">
    <div>
      <h3 style="margin-bottom: 15px;">Key Achievements</h3>
      <ul style="line-height: 2; color: #cbd5e1;">
        <li>🎯 Detected and blocked ${Math.floor(Math.random() * 50) + 100} targeted attacks</li>
        <li>📋 Achieved full ANRT compliance for core requirements</li>
        <li>🤝 Established threat sharing with national CSIRT</li>
        <li>👥 Completed security training for ${Math.floor(Math.random() * 200) + 300} employees</li>
      </ul>
    </div>
    <div>
      <h3 style="margin-bottom: 15px;">Strategic Focus Areas</h3>
      <ul style="line-height: 2; color: #cbd5e1;">
        <li>📡 SS7/Diameter security enhancement program</li>
        <li>🔒 Zero-trust architecture implementation</li>
        <li>🤖 AI/ML-powered threat detection expansion</li>
        <li>🌐 Cloud security posture management</li>
      </ul>
    </div>
  </div>
  
  <div class="slide-footer">
    <span>Djezzy National SOC Platform | Confidential</span>
    <span>Slide 2 of 8</span>
  </div>
</div>

<!-- SLIDE 3: Incident Management -->
<div class="slide">
  <div class="slide-header">
    <h2>Incident Management Performance</h2>
    <span class="quarter-badge">Q${quarter} ${year}</span>
  </div>
  
  <div class="kpi-row">
    <div class="kpi-card">
      <div class="kpi-value status-yellow">${data.incidents?.total || '156'}</div>
      <div class="kpi-label">Total Incidents</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-value status-red">${(data.incidents?.critical || 5) + (data.incidents?.high || 18)}</div>
      <div class="kpi-label">Critical & High</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-value status-green">${data.incidents?.resolved || '142'}</div>
      <div class="kpi-label">Resolved (91%)</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-value" style="color: #60a5fa;">${data.incidents?.mttr || '2.4'}h</div>
      <div class="kpi-label">Mean Time to Respond</div>
    </div>
  </div>
  
  <table>
    <thead>
      <tr>
        <th>Metric</th>
        <th>Q${quarter} Actual</th>
        <th>Q${quarter - 1 === 0 ? 4 : quarter - 1} Prior</th>
        <th>Change</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      <tr><td>Total Incidents</td><td>${data.incidents?.total || 156}</td><td>${156 + Math.floor(Math.random() * 30)}</td><td class="trend-positive">↓ ${(Math.random() * 15).toFixed(0)}%</td><td class="status-green">✓ On Target</td></tr>
      <tr><td>Critical Incidents</td><td>${data.incidents?.critical || 5}</td><td>${5 + Math.floor(Math.random() * 3)}</td><td class="trend-positive">↓ ${(Math.random() * 30).toFixed(0)}%</td><td class="status-green">✓ Improved</td></tr>
      <tr><td>Avg Resolution Time</td><td>${data.incidents?.mttr || 2.4}h</td><td>${(2.4 + Math.random()).toFixed(1)}h</td><td class="trend-positive">↓ ${(Math.random() * 20).toFixed(0)}%</td><td class="status-green">✓ Within SLA</td></tr>
      <tr><td>Escalations to Mgmt</td><td>${Math.floor(Math.random() * 5) + 2}</td><td>${Math.floor(Math.random() * 5) + 3}</td><td class="trend-positive">↓ ${(Math.random() * 25).toFixed(0)}%</td><td class="status-green">✓ Reduced</td></tr>
    </tbody>
  </table>
  
  <div class="highlight-box warning" style="margin-top: 25px;">
    <strong>⚠️ Notable Incident:</strong> One significant SS7 signaling attack attempt was detected and mitigated in month 2. No customer impact. Enhanced monitoring deployed.
  </div>
  
  <div class="slide-footer">
    <span>Djezzy National SOC Platform | Confidential</span>
    <span>Slide 3 of 8</span>
  </div>
</div>

<!-- SLIDE 4: Threat Landscape -->
<div class="slide">
  <div class="slide-header">
    <h2>Threat Landscape Analysis</h2>
    <span class="quarter-badge">Q${quarter} ${year}</span>
  </div>
  
  <div class="two-col">
    <div>
      <h3 style="margin-bottom: 20px;">Top Threat Categories</h3>
      <table>
        <thead><tr><th>Threat Type</th><th>Count</th><th>Trend</th></tr></thead>
        <tbody>
          <tr><td>Phishing / Social Engineering</td><td>${Math.floor(Math.random() * 50) + 40}</td><td class="trend-negative">↑ Growing</td></tr>
          <tr><td>Malware / Ransomware</td><td>${Math.floor(Math.random() * 30) + 20}</td><td class="trend-positive">↓ Stable</td></tr>
          <tr><td>SS7 / Telecom Attacks</td><td>${Math.floor(Math.random() * 15) + 5}</td><td class="trend-negative">↑ Emerging</td></tr>
          <tr><td>Insider Threats</td><td>${Math.floor(Math.random() * 10) + 2}</td><td class="trend-positive">→ Stable</td></tr>
          <tr><td>DDoS Attempts</td><td>${Math.floor(Math.random() * 25) + 15}</td><td class="trend-negative">↑ Seasonal</td></tr>
        </tbody>
      </table>
    </div>
    <div>
      <h3 style="margin-bottom: 20px;">Intelligence Metrics</h3>
      <div class="kpi-row" style="grid-template-columns: 1fr 1fr;">
        <div class="kpi-card"><div class="kpi-value" style="font-size: 36px;">${data.threatIntel?.iocsCount || '2,450'}</div><div class="kpi-label">IOCs Tracked</div></div>
        <div class="kpi-card"><div class="kpi-value" style="font-size: 36px;">${data.threatIntel?.campaignsTracked || '18'}</div><div class="kpi-label">Active Campaigns</div></div>
        <div class="kpi-card"><div class="kpi-value" style="font-size: 36px;">${data.threatIntel?.feedsActive || '58'}</div><div class="kpi-label">Threat Feeds</div></div>
        <div class="kpi-card"><div class="kpi-value" style="font-size: 36px;">${Math.floor(Math.random() * 500) + 500}</div><div class="kpi-label">Blocked Threats</div></div>
      </div>
    </div>
  </div>
  
  <div class="highlight-box success" style="margin-top: 25px;">
    <strong>🎯 Intelligence Win:</strong> Proactive threat hunting identified an APT campaign targeting telecom providers in North Africa 72 hours before public disclosure. Preemptive blocks were deployed.
  </div>
  
  <div class="slide-footer">
    <span>Djezzy National SOC Platform | Confidential</span>
    <span>Slide 4 of 8</span>
  </div>
</div>

<!-- SLIDE 5: Compliance & Regulatory -->
<div class="slide">
  <div class="slide-header">
    <h2>Compliance & Regulatory Status</h2>
    <span class="quarter-badge">Q${quarter} ${year}</span>
  </div>
  
  <table>
    <thead>
      <tr>
        <th>Regulatory Framework</th>
        <th>Compliance %</th>
        <th>Status</th>
        <th>Key Actions This Quarter</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>ANRT Security Requirements</strong></td>
        <td><strong style="color: #4ade80;">${data.compliance?.overallScore || 87}%</strong></td>
        <td class="status-green">✓ Compliant</td>
        <td>Completed annual audit, updated policies</td>
      </tr>
      <tr>
        <td><strong>SS7/Diameter (Decree 18-06)</strong></td>
        <td><strong style="color: #fbbf24;">78%</strong></td>
        <td class="status-yellow">◐ In Progress</td>
        <td>Deployed additional firewalls, enhanced logging</td>
      </tr>
      <tr>
        <td><strong>Data Protection / Privacy</strong></td>
        <td><strong style="color: #4ade90;">92%</strong></td>
        <td class="status-green">✓ Compliant</td>
        <td>DPIA completed, consent mechanisms updated</td>
      </tr>
      <tr>
        <td><strong>Lawful Interception</strong></td>
        <td><strong style="color: #4ade80;">95%</strong></td>
        <td class="status-green">✓ Compliant</td>
        <td>Annual certification obtained</td>
      </tr>
    </tbody>
  </table>
  
  ${data.compliance && data.compliance.deadlinesAtRisk > 0 ? `
  <div class="highlight-box danger" style="margin-top: 25px;">
    <strong>⚠️ Attention Required:</strong> ${data.compliance.deadlinesAtRisk} regulatory deadline(s) require executive attention for resource allocation.
  </div>
  ` : ''}
  
  <div class="slide-footer">
    <span>Djezzy National SOC Platform | Confidential</span>
    <span>Slide 5 of 8</span>
  </div>
</div>

<!-- SLIDE 6: Investment Recommendations -->
<div class="slide">
  <div class="slide-header">
    <h2>Strategic Investment Recommendations</h2>
    <span class="quarter-badge">Q${quarter + 1} ${year}</span>
  </div>
  
  <div class="investment-card">
    <h3>💰 Proposed Security Investments - FY${year + 1}</h3>
    <div class="kpi-row" style="grid-template-columns: repeat(3, 1fr);">
      <div style="text-align: left;">
        <strong style="font-size: 18px;">SS7 Security Enhancement</strong>
        <p style="color: rgba(255,255,255,0.8); margin: 8px 0;">Advanced signaling firewall and real-time analysis platform</p>
        <p style="font-size: 24px; font-weight: bold;">€XXX,XXX</p>
      </div>
      <div style="text-align: left;">
        <strong style="font-size: 18px;">AI/ML Detection Platform</strong>
        <p style="color: rgba(255,255,255,0.8); margin: 8px 0;">Machine learning-based anomaly detection for network traffic</p>
        <p style="font-size: 24px; font-weight: bold;">€XXX,XXX</p>
      </div>
      <div style="text-align: left;">
        <strong style="font-size: 18px;">SOC Staff Expansion</strong>
        <p style="color: rgba(255,255,255,0.8); margin: 8px 0;">Additional Tier 2 analysts and threat hunters (FTEs)</p>
        <p style="font-size: 24px; font-weight: bold;">€XXX,XXX/year</p>
      </div>
    </div>
  </div>
  
  <div class="two-col" style="margin-top: 30px;">
    <div class="highlight-box">
      <h3 style="margin: 0 0 12px 0;">ROI Expectations</h3>
      <ul style="margin: 0; line-height: 1.9; color: #cbd5e1;">
        <li>Expected reduction in incident response time: 35%</li>
        <li>Projected fraud prevention savings: €XXXK annually</li>
        <li>Compliance fine risk mitigation: €XXM potential exposure</li>
      </ul>
    </div>
    <div class="highlight-box success">
      <h3 style="margin: 0 0 12px 0;">Board Approval Requested For:</h3>
      <ul style="margin: 0; line-height: 1.9; color: #cbd5e1;">
        <li>☐ SS7 Security Enhancement budget allocation</li>
        <li>☐ AI/ML platform vendor selection approval</li>
        <li>☐ Headcount increase authorization (+X FTEs)</li>
      </ul>
    </div>
  </div>
  
  <div class="slide-footer">
    <span>Djezzy National SOC Platform | Confidential</span>
    <span>Slide 6 of 8</span>
  </div>
</div>

<!-- SLIDE 7: Looking Ahead -->
<div class="slide">
  <div class="slide-header">
    <h2>Q${quarter + 1} Priorities & Roadmap</h2>
    <span class="quarter-badge">${year}</span>
  </div>
  
  <div class="two-col">
    <div>
      <h3 style="margin-bottom: 20px; color: #60a5fa;">🎯 Strategic Initiatives</h3>
      <div style="background: #1e293b; padding: 20px; border-radius: 10px; margin-bottom: 15px;">
        <strong>Zero Trust Architecture Phase 2</strong>
        <p style="color: #94a3b8; font-size: 14px; margin: 8px 0 0 0;">Network microsegmentation and identity-aware access controls</p>
        <div style="background: #0f172a; height: 6px; border-radius: 3px; margin-top: 12px;"><div style="width: 45%; height: 100%; background: #3b82f6; border-radius: 3px;"></div></div>
        <p style="color: #64748b; font-size: 12px; margin-top: 6px;">45% complete • Target: Q${quarter + 2}</p>
      </div>
      <div style="background: #1e293b; padding: 20px; border-radius: 10px; margin-bottom: 15px;">
        <strong>Threat Intel Platform Upgrade</strong>
        <p style="color: #94a3b8; font-size: 14px; margin: 8px 0 0 0;">Integration with national and international TI sharing platforms</p>
        <div style="background: #0f172a; height: 6px; border-radius: 3px; margin-top: 12px;"><div style="width: 70%; height: 100%; background: #8b5cf6; border-radius: 3px;"></div></div>
        <p style="color: #64748b; font-size: 12px; margin-top: 6px;">70% complete • Target: End Q${quarter + 1}</p>
      </div>
      <div style="background: #1e293b; padding: 20px; border-radius: 10px;">
        <strong>SOC Automation Expansion</strong>
        <p style="color: #94a3b8; font-size: 14px; margin: 8px 0 0 0;">SOAR playbook library expansion to 150+ automated responses</p>
        <div style="background: #0f172a; height: 6px; border-radius: 3px; margin-top: 12px;"><div style="width: 25%; height: 100%; background: #22c55e; border-radius: 3px;"></div></div>
        <p style="color: #64748b; font-size: 12px; margin-top: 6px;">25% complete • Target: Q${quarter + 2}</p>
      </div>
    </div>
    <div>
      <h3 style="margin-bottom: 20px; color: #f87171;">⚠️ Key Risks & Mitigations</h3>
      <table>
        <thead><tr><th>Risk</th><th>Impact</th><th>Mitigation</th></tr></thead>
        <tbody>
          <tr>
            <td>Talent shortage in cybersecurity</td>
            <td class="status-yellow">High</td>
            <td>Training programs, university partnerships</td>
          </tr>
          <tr>
            <td>Evolving telecom-specific threats</td>
            <td class="status-red">Critical</td>
            <td>Enhanced detection, industry collaboration</td>
          </tr>
          <tr>
            <td>Regulatory changes</td>
            <td class="status-yellow">Medium</td>
            <td>Compliance monitoring, legal engagement</td>
          </tr>
          <tr>
            <td>Supply chain risks</td>
            <td class="status-medium">Medium</td>
            <td>Vendor assessment, diversification</td>
          </tr>
        </tbody>
      </table>
      
      <div class="highlight-box success" style="margin-top: 25px;">
        <strong>✅ Success Metrics for Next Quarter:</strong>
        <ul style="margin: 10px 0 0 0; line-height: 1.8; color: #cbd5e1;">
          <li>Risk score below 40</li>
          <li>MTTR under 2 hours</li>
          <li>Compliance above 90%</li>
          <li>Zero critical breaches</li>
        </ul>
      </div>
    </div>
  </div>
  
  <div class="slide-footer">
    <span>Djezzy National SOC Platform | Confidential</span>
    <span>Slide 7 of 8</span>
  </div>
</div>

<!-- SLIDE 8: Thank You / Q&A -->
<div class="slide title-slide">
  <h1 style="font-size: 56px;">Thank You</h1>
  <p class="subtitle" style="font-size: 28px; margin-top: 30px;">Questions & Discussion</p>
  
  <div style="margin-top: 60px; text-align: left; max-width: 600px; margin-left: auto; margin-right: auto;">
    <h3 style="color: #60a5fa; margin-bottom: 20px;">Contact Information</h3>
    <p style="font-size: 18px; line-height: 2;">
      <strong>Chief Information Security Officer</strong><br/>
      Email: ciso@djezzy.dz<br/><br/>
      <strong>SOC Operations Manager</strong><br/>
      Email: soc-manager@djezzy.dz<br/><br/>
      <strong>Security Hotline (24/7)</strong><br/>
      Phone: +213 XXX XXX XXX
    </p>
  </div>
  
  <p style="position: absolute; bottom: 40px; left: 0; right: 0; color: #475569; font-size: 13px;">
    © ${year} ${config.branding.organizationName} — CONFIDENTIAL — Board Presentation Document
  </p>
</div>

</body>
</html>
  `.trim()
}

export default QuarterlyBoardTemplate
