import { NextRequest, NextResponse } from 'next/server';

// Demo SOAR cases for Djezzy CEO presentation
const demoCases = [
  {
    id: 'case-001',
    caseNumber: 'SOC-2026-00042',
    title: 'Operation SilentStorm - SS7 Attack Investigation',
    description: 'Comprehensive investigation into APT-GhostShell campaign exploiting SS7 vulnerabilities against Djezzy infrastructure',
    status: 'IN_PROGRESS',
    priority: 1,
    severity: 'CRITICAL',
    caseType: 'APT_INVESTIGATION',
    assignee: 'Fatima Zerhouni',
    assigneeId: 'user-002',
    reporter: 'Ahmed Bensalem',
    reporterId: 'user-001',
    alerts: 23,
    incidents: ['TATC-2026-00042'],
    tasks: [
      { id: 'task-1', title: 'Complete SS7 traffic analysis', status: 'COMPLETED', assignedTo: 'Karim Boudjema' },
      { id: 'task-2', title: 'Identify all compromised GTs', status: 'IN_PROGRESS', assignedTo: 'Sara Mansouri' },
      { id: 'task-3', title: 'Map attack timeline', status: 'IN_PROGRESS', assignedTo: 'Fatima Zerhouni' },
      { id: 'task-4', title: 'Coordinate with roaming partners', status: 'PENDING', assignedTo: 'Ahmed Bensalem' },
      { id: 'task-5', title: 'Prepare executive briefing', status: 'PENDING', assignedTo: 'Fatima Zerhouni' }
    ],
    evidence: [
      { type: 'PCAP', description: 'SS7 traffic capture - 72 hours', collectedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) },
      { type: 'LOGS', description: 'Firewall logs from STP cluster', collectedAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000) },
      { type: 'IOC_LIST', description: 'Extracted indicators of compromise', collectedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) },
      { type: 'REPORT', description: 'Threat intelligence brief on APT-GhostShell', collectedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) }
    ],
    slaDeadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(),
    timeSpent: 67.5,
    tags: ['SS7', 'APT', 'Critical', 'Executive_Visibility']
  },
  {
    id: 'case-002',
    caseNumber: 'SOC-2026-00038',
    title: 'TelecomHeist Wave - SIM Swap Fraud Ring',
    description: 'Investigation into organized fraud ring targeting banking customers through SIM swap attacks',
    status: 'IN_PROGRESS',
    priority: 1,
    severity: 'CRITICAL',
    caseType: 'FRAUD_INVESTIGATION',
    assignee: 'Yacine Berber',
    assigneeId: 'user-005',
    reporter: 'Fraud Detection System',
    alerts: 156,
    incidents: ['TATC-2026-00038'],
    tasks: [
      { id: 'task-6', title: 'Interview affected customers', status: 'COMPLETED', assignedTo: 'Customer Care Team' },
      { id: 'task-7', title: 'Analyze retail outlet CCTV', status: 'IN_PROGRESS', assignedTo: 'Security Team' },
      { id: 'task-8', title: 'Identify insider involvement', status: 'IN_PROGRESS', assignedTo: 'HR/Legal' },
      { id: 'task-9', title: 'Coordinate with banks', status: 'PENDING', assignedTo: 'Yacine Berber' },
      { id: 'task-10', title: 'File police report', status: 'PENDING', assignedTo: 'Legal Department' }
    ],
    evidence: [
      { type: 'TRANSACTION_LOGS', description: 'Banking transaction records for victims', collectedAt: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000) },
      { type: 'SIM_SWAP_RECORDS', description: 'SIM change request history', collectedAt: new Date(Date.now() - 17 * 24 * 60 * 60 * 1000) },
      { type: 'SCREENSHOTS', description: 'Fraudulent login sessions', collectedAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000) },
      { type: 'COMMUNICATION', description: 'Phishing emails used in social engineering', collectedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000) }
    ],
    slaDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    createdAt: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(),
    timeSpent: 124.3,
    tags: ['Fraud', 'SIM_Swap', 'Financial_Crime', 'Law_Enforcement']
  },
  {
    id: 'case-003',
    caseNumber: 'SOC-2026-00045',
    title: 'IMS Catcher Detection - Algiers Downtown',
    description: 'Investigation of suspected IMS catcher activity near government and corporate buildings',
    status: 'ACTIVE_INVESTIGATION',
    priority: 1,
    severity: 'CRITICAL',
    caseType: 'SURVEILLANCE_DETECTION',
    assignee: 'Ahmed Bensalem',
    assigneeId: 'user-001',
    reporter: 'RF Monitoring System',
    alerts: 8,
    incidents: ['TATC-2026-00045'],
    tasks: [
      { id: 'task-11', title: 'Analyze RF spectrum data', status: 'COMPLETED', assignedTo: 'Network Engineering' },
      { id: 'task-12', title: 'Correlate with network anomalies', status: 'IN_PROGRESS', assignedTo: 'Karim Boudjema' },
      { id: 'task-13', title: 'Physical site survey', status: 'PENDING', assignedTo: 'Physical Security' },
      { id: 'task-14', title: 'Coordinate with ANPR (regulator)', status: 'PENDING', assignedTo: 'Amina Bellaâbed' }
    ],
    evidence: [
      { type: 'RF_DATA', description: 'Spectrum analysis captures', collectedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
      { type: 'NETWORK_LOGS', description: 'Cell tower handover anomalies', collectedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
      { type: 'GEO_DATA', description: 'GPS coordinates of suspected location', collectedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) }
    ],
    slaDeadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(),
    timeSpent: 18.5,
    tags: ['IMS_Catcher', 'Surveillance', 'Critical', 'Government']
  },
  {
    id: 'case-004',
    caseNumber: 'SOC-2026-00044',
    title: 'Insider Threat - Data Exfiltration Attempt',
    description: 'Investigation of contractor attempting to export subscriber database via USB',
    status: 'IN_PROGRESS',
    priority: 2,
    severity: 'HIGH',
    caseType: 'INSIDER_THREAT',
    assignee: 'Karim Boudjema',
    assigneeId: 'user-003',
    reporter: 'DLP System',
    alerts: 34,
    incidents: ['TATC-2026-00044'],
    tasks: [
      { id: 'task-15', title: 'Preserve all user activity logs', status: 'COMPLETED', assignedTo: 'System Admin' },
      { id: 'task-16', title: 'Review access permissions', status: 'COMPLETED', assignedTo: 'IAM Team' },
      { id: 'task-17', title: 'Interview contractor supervisor', status: 'IN_PROGRESS', assignedTo: 'HR' },
      { id: 'task-18', title: 'Check for external recruitment contacts', status: 'PENDING', assignedTo: 'Threat Intel' },
      { id: 'task-19', title: 'Legal review and next steps', status: 'PENDING', assignedTo: 'Legal' }
    ],
    evidence: [
      { type: 'DLP_ALERT', description: 'Blocked USB transfer attempt', collectedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000) },
      { type: 'ACCESS_LOGS', description: 'Database query history', collectedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000) },
      { type: 'EMAIL', description: 'Suspicious external email correspondence', collectedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) },
      { type: 'SCREENSHOT', description: 'Screen capture at time of incident', collectedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000) }
    ],
    slaDeadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(),
    timeSpent: 32.0,
    tags: ['Insider_Threat', 'DLP', 'Contractor', 'Sensitive']
  },
  {
    id: 'case-005',
    caseNumber: 'SOC-2026-00029',
    title: 'Ransomware Incident - IT Support Systems',
    description: 'LockBit ransomware infection in IT support segment - successfully contained',
    status: 'CLOSED_RESOLVED',
    priority: 2,
    severity: 'HIGH',
    caseType: 'MALWARE_INCIDENT',
    assignee: 'Yacine Berber',
    assigneeId: 'user-005',
    reporter: 'EDR System',
    alerts: 89,
    incidents: ['TATC-2026-00029'],
    tasks: [
      { id: 'task-20', title: 'Isolate infected systems', status: 'COMPLETED', assignedTo: 'Yacine Berber' },
      { id: 'task-21', title: 'Forensic image collection', status: 'COMPLETED', assignedTo: 'Digital Forensics' },
      { id: 'task-22', title: 'Restore from backup', status: 'COMPLETED', assignedTo: 'IT Operations' },
      { id: 'task-23', title: 'Patch entry vector', status: 'COMPLETED', assignedTo: 'IT Security' },
      { id: 'task-24', title: 'Post-incident review', status: 'COMPLETED', assignedTo: 'Ahmed Bensalem' }
    ],
    evidence: [
      { type: 'MALWARE_SAMPLE', description: 'LockBit variant executable', collectedAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000) },
      { type: 'FORENSIC_IMAGE', description: 'Disk images of infected systems', collectedAt: new Date(Date.now() - 44 * 24 * 60 * 60 * 1000) },
      { type: 'PHISHING_EMAIL', description: 'Initial infection vector email', collectedAt: new Date(Date.now() - 46 * 24 * 60 * 60 * 1000) },
      { type: 'REPORT', description: 'Full incident report', collectedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    ],
    resolution: 'Successfully contained and eradicated. All systems restored. Enhanced email filtering implemented.',
    closedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    timeSpent: 156.0,
    tags: ['Ransomware', 'Closed', 'Lessons_Learned']
  }
];

// GET /api/cases - List cases
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const assignee = searchParams.get('assignee');
    
    let filteredCases = [...demoCases];
    
    if (status) {
      filteredCases = filteredCases.filter(c => c.status === status.toUpperCase());
    }
    if (priority) {
      filteredCases = filteredCases.filter(c => c.priority === parseInt(priority));
    }
    if (assignee) {
      filteredCases = filteredCases.filter(c => 
        c.assignee.toLowerCase().includes(assignee.toLowerCase())
      );
    }

    // Calculate metrics
    const metrics = {
      totalCases: demoCases.length,
      openCases: demoCases.filter(c => !c.status.startsWith('CLOSED')).length,
      criticalCases: demoCases.filter(c => c.severity === 'CRITICAL').length,
      avgTimeToResolve: '8.2 days',
      slaBreachRate: '12%',
      casesThisMonth: 8,
      casesLastMonth: 11,
      topAssignees: [
        { name: 'Fatima Zerhouni', count: 2 },
        { name: 'Yacine Berber', count: 2 },
        { name: 'Ahmed Bensalem', count: 1 },
        { name: 'Karim Boudjema', count: 1 }
      ]
    };

    return NextResponse.json({
      success: true,
      data: filteredCases,
      total: filteredCases.length,
      metrics
    });
  } catch (error) {
    console.error('Error fetching cases:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch cases' },
      { status: 500 }
    );
  }
}

// POST /api/cases - Create new case
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, description, caseType, priority, severity, assigneeId, relatedAlerts, relatedIncidents } = body;

    if (!title || !caseType || !assigneeId) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: title, caseType, assigneeId' },
        { status: 400 }
      );
    }

    const newCase = {
      id: `case-${Date.now()}`,
      caseNumber: `SOC-2026-${String(demoCases.length + 42).padStart(4, '0')}`,
      title,
      description: description || '',
      status: 'NEW',
      priority: priority || 3,
      severity: severity || 'MEDIUM',
      caseType,
      assignee: body.assigneeName || 'Unassigned',
      assigneeId,
      reporter: body.reporterName || 'System',
      alerts: relatedAlerts?.length || 0,
      incidents: relatedIncidents || [],
      tasks: [],
      evidence: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      timeSpent: 0
    };

    return NextResponse.json({
      success: true,
      data: newCase,
      message: 'Case created successfully'
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating case:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create case' },
      { status: 500 }
    );
  }
}
