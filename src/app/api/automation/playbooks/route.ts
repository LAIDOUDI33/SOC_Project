import { NextRequest, NextResponse } from 'next/server';

// Demo playbooks for Djezzy SOC Platform
const demoPlaybooks = [
  {
    id: 'pb-001',
    name: 'SS7 Attack Containment',
    description: 'Automated response playbook for SS7-based attacks including location tracking and interception attempts',
    version: 3,
    category: 'CONTAINMENT',
    severity: 'CRITICAL',
    status: 'ACTIVE',
    triggers: [
      { type: 'ALERT', condition: "source == 'SS7_Firewall' && severity == 'CRITICAL'" },
      { type: 'CORRELATION', condition: "multiple_ss7_anomalies_from_same_gt" }
    ],
    steps: [
      { order: 1, name: 'Block Malicious GT', actionType: 'BLOCK_IP', timeout: 30, status: 'AUTOMATED' },
      { order: 2, name: 'Isolate Affected HLR', actionType: 'ISOLATE_ENDPOINT', timeout: 60, status: 'APPROVAL_REQUIRED' },
      { order: 3, name: 'Alert Network Team', actionType: 'SEND_NOTIFICATION', timeout: 5, status: 'AUTOMATED' },
      { order: 4, name: 'Create Incident Case', actionType: 'CREATE_CASE', timeout: 10, status: 'AUTOMATED' },
      { order: 5, name: 'Preserve SS7 Logs', actionType: 'COLLECT_EVIDENCE', timeout: 120, status: 'AUTOMATED' },
      { order: 6, name: 'Enrich Indicators', actionType: 'ENRICH_INDICATOR', timeout: 300, status: 'AUTOMATED' }
    ],
    approvalRequired: true,
    estimatedRuntime: 15,
    successRate: 94.2,
    lastRunAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
    totalRuns: 47,
    timeSaved: '23.5 hours'
  },
  {
    id: 'pb-002',
    name: 'SIM Swap Fraud Response',
    description: 'Rapid response to SIM swap fraud indicators including account locking and evidence preservation',
    version: 5,
    category: 'CONTAINMENT',
    severity: 'CRITICAL',
    status: 'ACTIVE',
    triggers: [
      { type: 'ALERT', condition: "source == 'FraudEngine' && title contains 'SIM Swap'" },
      { type: 'VELOCITY', condition: "sim_swap_requests > 3 per hour per_account" }
    ],
    steps: [
      { order: 1, name: 'Lock Affected Accounts', actionType: 'DISABLE_ACCOUNT', timeout: 15, status: 'AUTOMATED' },
      { order: 2, name: 'Flag for Fraud Review', actionType: 'SEND_NOTIFICATION', timeout: 5, status: 'AUTOMATED' },
      { order: 3, name: 'Preserve Account Activity Logs', actionType: 'COLLECT_EVIDENCE', timeout: 60, status: 'AUTOMATED' },
      { order: 4, name: 'Notify Banking Partners', actionType: 'SEND_NOTIFICATION', timeout: 10, status: 'APPROVAL_REQUIRED' },
      { order: 5, name: 'Link Related Incidents', actionType: 'CREATE_CASE', timeout: 15, status: 'AUTOMATED' }
    ],
    approvalRequired: true,
    estimatedRuntime: 8,
    successRate: 97.8,
    lastRunAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    totalRuns: 156,
    timeSaved: '52 hours'
  },
  {
    id: 'pb-003',
    name: 'DDoS Mitigation',
    description: 'Automated DDoS attack mitigation including traffic scrubbing and ISP escalation',
    version: 2,
    category: 'CONTAINMENT',
    severity: 'HIGH',
    status: 'ACTIVE',
    triggers: [
      { type: 'ALERT', condition: "source == 'DDoS_Protection'" },
      { type: 'THRESHOLD', condition: "traffic_volume > 10Gbps OR packets_per_sec > 1M" }
    ],
    steps: [
      { order: 1, name: 'Activate Traffic Scrubbing', actionType: 'API_CALL', timeout: 30, status: 'AUTOMATED' },
      { order: 2, name: 'Update Route Advertisements', actionType: 'API_CALL', timeout: 60, status: 'AUTOMATED' },
      { order: 3, name: 'Escalate to NOC', actionType: 'SEND_NOTIFICATION', timeout: 5, status: 'AUTOMATED' },
      { order: 4, name: 'Contact Upstream ISP', actionType: 'SEND_NOTIFICATION', timeout: 10, status: 'APPROVAL_REQUIRED' }
    ],
    approvalRequired: false,
    estimatedRuntime: 5,
    successRate: 89.5,
    lastRunAt: new Date(Date.now() - 55 * 24 * 60 * 60 * 1000),
    totalRuns: 23,
    timeSaved: '18.5 hours'
  },
  {
    id: 'pb-004',
    name: 'Malware Containment',
    description: 'Endpoint malware isolation and forensic data preservation',
    version: 4,
    category: 'ERADICATION',
    severity: 'CRITICAL',
    status: 'ACTIVE',
    triggers: [
      { type: 'ALERT', condition: "source == 'EDR_CrowdStrike' && severity in ['HIGH', 'CRITICAL']" },
      { type: 'INTEL', condition: "ioc_match_malware_hash" }
    ],
    steps: [
      { order: 1, name: 'Isolate Endpoint from Network', actionType: 'ISOLATE_ENDPOINT', timeout: 20, status: 'AUTOMATED' },
      { order: 2, name: 'Snapshot Memory for Analysis', actionType: 'SNAPSHOT_DISK', timeout: 120, status: 'AUTOMATED' },
      { order: 3, name: 'Collect Running Process List', actionType: 'COLLECT_EVIDENCE', timeout: 30, status: 'AUTOMATED' },
      { order: 4, name: 'Quarantine Malicious Files', actionType: 'QUARANTINE_EMAIL', timeout: 45, status: 'AUTOMATED' },
      { order: 5, name: 'Initiate EDR Scan', actionType: 'RUN_SCRIPT', timeout: 300, status: 'AUTOMATED' },
      { order: 6, name: 'Alert Security Team', actionType: 'SEND_NOTIFICATION', timeout: 5, status: 'AUTOMATED' }
    ],
    approvalRequired: true,
    estimatedRuntime: 25,
    successRate: 96.1,
    lastRunAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
    totalRuns: 34,
    timeSaved: '41 hours'
  },
  {
    id: 'pb-005',
    name: 'Insider Threat Investigation',
    description: 'Structured investigation workflow for suspected insider threats with HR coordination',
    version: 1,
    category: 'INVESTIGATION',
    severity: 'HIGH',
    status: 'ACTIVE',
    triggers: [
      { type: 'ANOMALY', condition: "uba_risk_score > 80" },
      { type: 'DLP', condition: "data_exfiltration_attempt by privileged_user" },
      { type: 'MANUAL', condition: "manager_report_suspicious_activity" }
    ],
    steps: [
      { order: 1, name: 'Preserve User Activity Logs', actionType: 'COLLECT_EVIDENCE', timeout: 60, status: 'AUTOMATED' },
      { order: 2, name: 'Enable Enhanced Monitoring', actionType: 'RUN_SCRIPT', timeout: 15, status: 'AUTOMATED' },
      { order: 3, name: 'Review Access Permissions', actionType: 'API_CALL', timeout: 30, status: 'AUTOMATED' },
      { order: 4, name: 'Notify SOC Manager', actionType: 'SEND_NOTIFICATION', timeout: 5, status: 'AUTOMATED' },
      { order: 5, name: 'Coordinate with HR/Legal', actionType: 'SEND_NOTIFICATION', timeout: 10, status: 'APPROVAL_REQUIRED' },
      { order: 6, name: 'Schedule Interview if Needed', actionType: 'SEND_NOTIFICATION', timeout: 5, status: 'MANUAL' }
    ],
    approvalRequired: true,
    estimatedRuntime: 48,
    successRate: 78.3,
    lastRunAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    totalRuns: 12,
    timeSaved: '16 hours'
  },
  {
    id: 'pb-006',
    name: 'Phishing Response',
    description: 'Rapid response to phishing reports including URL blocking and user notification',
    version: 6,
    category: 'ERADICATION',
    severity: 'MEDIUM',
    status: 'ACTIVE',
    triggers: [
      { type: 'REPORT', condition: "user_reports_phishing" },
      { type: 'ALERT', condition: "source == 'Email_Gateway' && phishing_detected" }
    ],
    steps: [
      { order: 1, name: 'Extract IOCs from Email', actionType: 'ENRICH_INDICATOR', timeout: 30, status: 'AUTOMATED' },
      { order: 2, name: 'Block Malicious URLs', actionType: 'BLOCK_IP', timeout: 10, status: 'AUTOMATED' },
      { order: 3, name: 'Quarantine Similar Emails', actionType: 'QUARANTINE_EMAIL', timeout: 60, status: 'AUTOMATED' },
      { order: 4, name: 'Identify All Recipients', actionType: 'API_CALL', timeout: 15, status: 'AUTOMATED' },
      { order: 5, name: 'Send Warning to Users', actionType: 'SEND_NOTIFICATION', timeout: 10, status: 'AUTOMATED' },
      { order: 6, name: 'Update Phishing Filter Rules', actionType: 'API_CALL', timeout: 30, status: 'AUTOMATED' }
    ],
    approvalRequired: false,
    estimatedRuntime: 10,
    successRate: 98.2,
    lastRunAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    totalRuns: 289,
    timeSaved: '124 hours'
  }
];

// GET /api/automation/playbooks - List available playbooks
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const severity = searchParams.get('severity');
    
    let filteredPlaybooks = [...demoPlaybooks];
    
    if (category) {
      filteredPlaybooks = filteredPlaybooks.filter(p => p.category === category.toUpperCase());
    }
    if (severity) {
      filteredPlaybooks = filteredPlaybooks.filter(p => p.severity === severity.toUpperCase());
    }

    return NextResponse.json({
      success: true,
      data: filteredPlaybooks,
      total: filteredPlaybooks.length,
      metrics: {
        totalPlaybooks: demoPlaybooks.length,
        activePlaybooks: demoPlaybooks.filter(p => p.status === 'ACTIVE').length,
        avgSuccessRate: (demoPlaybooks.reduce((sum, p) => sum + p.successRate, 0) / demoPlaybooks.length).toFixed(1),
        totalTimeSaved: '275 hours',
        totalExecutions: demoPlaybooks.reduce((sum, p) => sum + p.totalRuns, 0)
      }
    });
  } catch (error) {
    console.error('Error fetching playbooks:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch playbooks' },
      { status: 500 }
    );
  }
}

// POST /api/automation/playbooks - Execute a playbook
export async function POST(
  request: NextRequest
) {
  try {
    const body = await request.json();
    const { id, userId, eventId, variables } = body;
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Playbook ID is required' },
        { status: 400 }
      );
    }
    
    const playbook = demoPlaybooks.find(p => p.id === id);
    
    if (!playbook) {
      return NextResponse.json(
        { success: false, error: 'Playbook not found' },
        { status: 404 }
      );
    }

    // Simulate execution
    const executionId = `exec-${Date.now()}`;
    
    return NextResponse.json({
      success: true,
      data: {
        executionId,
        playbookId: playbook.id,
        playbookName: playbook.name,
        status: playbook.approvalRequired ? 'PENDING_APPROVAL' : 'RUNNING',
        triggeredBy: userId,
        triggeredEvent: eventId,
        currentStep: 0,
        totalSteps: playbook.steps.length,
        startedAt: new Date(),
        estimatedCompletion: new Date(Date.now() + playbook.estimatedRuntime * 60000),
        requiresApproval: playbook.approvalRequired,
        approvalUrl: playbook.approvalRequired ? `/automation/approvals/${executionId}` : null
      },
      message: `Playbook "${playbook.name}" ${playbook.approvalRequired ? 'awaiting approval' : 'started'}`
    }, { status: 201 });
  } catch (error) {
    console.error('Error executing playbook:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to execute playbook' },
      { status: 500 }
    );
  }
}
