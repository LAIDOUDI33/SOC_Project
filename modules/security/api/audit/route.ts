/**
 * Security Audit & Compliance API Route
 * National SOC Platform for Algeria (2026-2030)
 * 
 * Provides comprehensive security audit logging and compliance checking:
 * - Security event logging and retrieval
 * - Compliance status monitoring (CIS, NIST, ISO 27001)
 * - Vulnerability scan results
 * - Security assessment triggering
 * 
 * @route GET /api/security/audit/logs - Get security audit logs
 * @route POST /api/security/audit/log - Record a new audit entry
 * @route GET /api/security/audit/compliance - Get compliance status
 * @route POST /api/security/audit/compliance/run - Run compliance check
 * @route GET /api/security/audit/vulnerabilities - Get vulnerability findings
 * @route POST /api/security/audit/scan - Trigger security scan
 * 
 * @module security/api/audit
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  recordAuditEvent,
  queryAuditLogs,
  generateMockComplianceChecks,
  runSecurityHardeningCheck,
  calculateSecurityPosture,
} from '../../lib/security-lib';
import type {
  AuditLogEntry,
  AuditCategory,
  AuditSeverity,
  AuditOutcome,
  ComplianceCheck,
  ComplianceFramework,
  ComplianceReport,
  Vulnerability,
  VulnSeverity,
  VulnStatus,
  SecurityScanResult,
  ScanSummary,
  SecurityPosture,
  Recommendation,
  SecurityIssue,
} from '../../types/security.types';

// ============================================================================
// Mock Data
// ============================================================================

/** Mock vulnerability database */
const MOCK_VULNERABILITIES: Vulnerability[] = [
  {
    id: 'VULN-001',
    scanId: 'scan_weekly_2024',
    title: 'Outdated OpenSSL Version Detected',
    description: 'Server is running OpenSSL 1.1.1k which has known vulnerabilities',
    severity: 'high',
    cvss: {
      baseScore: 7.5,
      impactScore: 3.6,
      exploitabilityScore: 3.9,
      vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N',
      version: '3.1',
      metrics: {
        attackVector: 'Network',
        attackComplexity: 'Low',
        privilegesRequired: 'None',
        userInteraction: 'None',
        scope: 'Unchanged',
        confidentialityImpact: 'High',
        integrityImpact: 'None',
        availabilityImpact: 'None',
      },
    },
    cveId: 'CVE-2024-XXXXX',
    cweId: 'CWE-1194',
    owaspCategory: 'A06_2021-Vulnerable_Outdated_Components',
    status: 'open',
    discoveredAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    target: {
      host: 'api.soc.algeria.dz',
      service: 'HTTPS',
      protocol: 'TCP',
      component: 'OpenSSL',
      version: '1.1.1k',
      os: 'Ubuntu 22.04 LTS',
    },
    evidence: 'SSL Certificate shows OpenSSL/1.1.1k in server response',
    remediation: {
      difficulty: 'moderate',
      effort: 'medium',
      priority: 'short_term',
      steps: [
        { order: 1, title: 'Backup current system', description: 'Create full system backup before patching', verification: 'Verify backup integrity' },
        { order: 2, title: 'Update package lists', description: 'Run apt-get update', command: 'sudo apt-get update', verification: 'Check for errors' },
        { order: 3, title: 'Upgrade OpenSSL', description: 'Install latest OpenSSL version', command: 'sudo apt-get install --only-upgrade openssl libssl-dev', verification: 'openssl version' },
        { order: 4, title: 'Restart services', description: 'Restart all services using TLS', command: 'sudo systemctl restart nginx apache2', verification: 'Test HTTPS connectivity' },
        { order: 5, title: 'Verify fix', description: 'Confirm updated version running', command: 'openssl version -a | grep built', verification: 'Version should be >= 1.1.1w' },
      ],
      estimatedHours: 2,
      dependencies: ['Maintenance window approval'],
    },
    references: [
      'https://www.openssl.org/news/vulnerabilities.html',
      'https://nvd.nist.gov/vuln/detail/CVE-2024-XXXXX',
    ],
    tags: ['openssl', 'tls', 'patching'],
    assignedTo: 'security-team@soc.algeria.dz',
    comments: [],
    metadata: {
      autoDetected: true,
      scanner: 'internal-vuln-scanner',
      confidence: 95,
    },
  },
  {
    id: 'VULN-002',
    scanId: 'scan_weekly_2024',
    title: 'Missing Security Headers on Legacy Endpoint',
    description: 'The /legacy/api endpoint does not implement required security headers',
    severity: 'medium',
    cvss: {
      baseScore: 4.3,
      impactScore: 2.1,
      exploitabilityScore: 1.8,
      vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:C/L:I/N:A/N:L',
      version: '3.1',
      metrics: {
        attackVector: 'Network',
        attackComplexity: 'Low',
        privilegesRequired: 'None',
        userInteraction: 'Required',
        scope: 'Changed',
        confidentialityImpact: 'Low',
        integrityImpact: 'None',
        availabilityImpact: 'Low',
      },
    },
    cweId: 'CWE-693',
    owaspCategory: 'A05_2021-Security_Misconfiguration',
    status: 'in_progress',
    discoveredAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    target: {
      host: 'soc.algeria.dz',
      url: '/legacy/api/v1/data',
      component: 'Legacy API Gateway',
    },
    remediation: {
      difficulty: 'easy',
      effort: 'low',
      priority: 'short_term',
      steps: [
        { order: 1, title: 'Add CSP header', description: 'Implement Content-Security-Policy', verification: 'curl -I to check headers' },
        { order: 2, title: 'Add HSTS header', description: 'Enable Strict-Transport-Security', verification: 'Verify HSTS max-age' },
        { order: 3, title: 'Add X-Frame-Options', description: 'Set X-Frame-Options to DENY', verification: 'Header present check' },
      ],
      estimatedHours: 0.5,
    },
    references: ['https://owasp.org/www-project-secure-headers/'],
    tags: ['headers', 'misconfiguration', 'legacy'],
    assignedTo: 'devops-team@soc.algeria.dz',
    comments: [
      {
        id: 'cmt_001',
        author: 'admin@soc.algeria.dz',
        content: 'Working on migration plan to move legacy endpoints to new infrastructure',
        createdAt: new Date(),
        internal: true,
      },
    ],
    metadata: {
      autoDetected: true,
      scanner: 'header-scanner',
      confidence: 100,
    },
  },
  {
    id: 'VULN-003',
    scanId: 'scan_monthly_2024',
    title: 'Information Disclosure in Error Responses',
    description: 'API error responses include stack traces and internal path information',
    severity: 'low',
    cweId: 'CWE-209',
    owaspCategory: 'A09_2021-Security_Logging_Monitoring_Failures',
    status: 'open',
    discoveredAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
    target: {
      host: 'api.soc.algeria.dz',
      url: '/api/v1/*',
      component: 'API Framework',
    },
    evidence: '{"error": "Internal Server Error", "stackTrace": "at com.soc.api...", "path": "/opt/soc/app/src/..."}',
    remediation: {
      difficulty: 'easy',
      effort: 'low',
      priority: 'long_term',
      steps: [
        { order: 1, title: 'Configure error handler', description: 'Implement global error handling middleware', verification: 'Trigger test error' },
        { order: 2, title: 'Sanitize error output', description: 'Return generic messages in production', verification: 'Review error responses' },
      ],
      estimatedHours: 1,
    },
    references: ['https://cheatsheetseries.owasp.org/cheatsheets/Error_Handling_Cheat_Sheet.html'],
    tags: ['information-disclosure', 'error-handling'],
    metadata: {
      autoDetected: true,
      scanner: 'dast-scanner',
      confidence: 90,
    },
  },
];

/** Pre-seeded audit log entries */
const SEED_AUDIT_LOGS: Array<Omit<AuditLogEntry, 'id' | 'timestamp' | 'correlationId' | 'retentionUntil'>> = [
  // Authentication events
  {
    category: 'authentication',
    severity: 'informational',
    outcome: 'success',
    actor: {
      type: 'user',
      id: 'user_001',
      username: 'admin',
      displayName: 'System Administrator',
      ipAddress: '10.0.1.100',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      authenticationMethod: 'mfa_totp',
      mfaVerified: true,
    },
    action: 'login',
    resource: { type: 'users', id: 'user_001' },
    details: {
      additionalData: { loginMethod: 'password+mfa', sessionId: 'sess_abc123' },
    },
    source: {
      application: 'soc-platform',
      component: 'auth-service',
      environment: 'production',
      hostname: 'app-server-01',
      requestId: 'req_001',
    },
    tags: ['authentication', 'login'],
    metadata: {},
  },
  {
    category: 'authentication',
    severity: 'high',
    outcome: 'failure',
    actor: {
      type: 'user',
      id: 'unknown',
      ipAddress: '45.33.32.156',
      userAgent: 'python-requests/2.28.0',
      mfaVerified: false,
    },
    action: 'login_failed',
    resource: { type: 'users' },
    details: {
      reason: 'Invalid credentials',
      additionalData: { attempts: 15, lockedOut: true },
    },
    source: {
      application: 'soc-platform',
      component: 'auth-service',
      environment: 'production',
      hostname: 'app-server-01',
      requestId: 'req_002',
    },
    tags: ['authentication', 'brute-force-attempt'],
    metadata: {},
  },
  // Authorization events
  {
    category: 'authorization',
    severity: 'low',
    outcome: 'success',
    actor: {
      type: 'user',
      id: 'analyst_01',
      username: 'ahmed.b',
      displayName: 'Ahmed Benali',
      ipAddress: '10.0.1.105',
      mfaVerified: true,
    },
    action: 'access_granted',
    resource: { type: 'alerts', name: 'Alert Dashboard' },
    details: {
      additionalData: { permission: 'read', role: 'analyst' },
    },
    source: {
      application: 'soc-platform',
      component: 'rbac-engine',
      environment: 'production',
      hostname: 'app-server-02',
      requestId: 'req_003',
    },
    tags: ['authorization', 'data-access'],
    metadata: {},
  },
  {
    category: 'authorization',
    severity: 'medium',
    outcome: 'denied',
    actor: {
      type: 'user',
      id: 'user_009',
      username: 'guest_user',
      ipAddress: '10.0.2.50',
      mfaVerified: false,
    },
    action: 'access_denied',
    resource: { type: 'config', name: 'System Configuration' },
    details: {
      additionalData: { reason: 'Insufficient permissions', requiredRole: 'admin' },
    },
    source: {
      application: 'soc-platform',
      component: 'rbac-engine',
      environment: 'production',
      hostname: 'app-server-01',
      requestId: 'req_004',
    },
    tags: ['authorization', 'privilege-escalation-attempt'],
    metadata: {},
  },
  // Configuration changes
  {
    category: 'configuration_change',
    severity: 'high',
    outcome: 'success',
    actor: {
      type: 'user',
      id: 'user_001',
      username: 'admin',
      displayName: 'System Administrator',
      ipAddress: '10.0.1.100',
      authenticationMethod: 'mfa_fido2',
      mfaVerified: true,
    },
    action: 'config_update',
    resource: { type: 'config', id: 'tls_config_001', name: 'TLS Configuration' },
    details: {
      before: { minVersion: 'TLSv1.0', hstsEnabled: false },
      after: { minVersion: 'TLSv1.2', hstsEnabled: true },
      reason: 'Security hardening per CIS benchmark',
    },
    source: {
      application: 'soc-platform',
      component: 'config-manager',
      environment: 'production',
      hostname: 'mgmt-server-01',
      requestId: 'req_005',
    },
    tags: ['configuration', 'hardening'],
    metadata: {},
  },
  // Security events
  {
    category: 'security_event',
    severity: 'critical',
    outcome: 'success',
    actor: {
      type: 'system',
      id: 'ids_sensor_01',
      ipAddress: '10.0.0.25',
    },
    action: 'intrusion_detected',
    resource: { type: 'network', name: 'DMZ Network Segment' },
    details: {
      additionalData: {
        ruleId: 'SID:2021001',
        ruleName: 'SQL Injection Attempt Detected',
        sourceIP: '198.51.100.23',
        destinationIP: '10.0.0.10',
        destinationPort: 443,
        payload: "/api/users?id=1' OR '1'='1",
        classification: 'web-application-attack',
      },
    },
    source: {
      application: 'suricata-ids',
      component: 'detection-engine',
      environment: 'production',
      hostname: 'ids-sensor-01',
      requestId: 'evt_001',
    },
    tags: ['ids', 'sql-injection', 'critical'],
    metadata: {
      sensorType: 'NIDS',
      signatureRevision: 2024011501,
    },
  },
];

// Seed audit logs on module load
SEED_AUDIT_LOGS.forEach(entry => recordAuditEvent(entry));

// ============================================================================
// API Handlers
// ============================================================================

/**
 * GET /api/security/audit
 * Main handler for audit operations
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get('action') || 'logs';

  try {
    switch (action) {
      case 'logs':
        return getAuditLogsHandler(searchParams);
      case 'compliance':
        return getComplianceStatusHandler(searchParams);
      case 'vulnerabilities':
        return getVulnerabilitiesHandler(searchParams);
      case 'posture':
        return getSecurityPostureHandler();
      case 'summary':
        return getAuditSummaryHandler();
      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Audit API Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Audit operation failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/security/audit
 * Handler for write operations
 */
export async function POST(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get('action');

  try {
    switch (action) {
      case 'log':
        return recordAuditLogHandler(request);
      case 'scan':
        return triggerSecurityScanHandler(request);
      case 'compliance/run':
        return runComplianceCheckHandler(request);
      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Audit POST API Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Audit operation failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// Handler Functions
// ============================================================================

/**
 * Gets paginated audit logs with filtering
 */
async function getAuditLogsHandler(params: URLSearchParams): Promise<NextResponse> {
  const category = params.get('category');
  const severity = params.get('severity');
  const search = params.get('search');
  const startDate = params.get('startDate');
  const endDate = params.get('endDate');
  const page = parseInt(params.get('page') || '1');
  const pageSize = Math.min(parseInt(params.get('pageSize') || '50'), 100);

  const result = queryAuditLogs({
    categories: category ? [category as AuditCategory] : undefined,
    severities: severity ? [severity as AuditSeverity] : undefined,
    searchQuery: search || undefined,
    startDate: startDate ? new Date(startDate) : undefined,
    endDate: endDate ? new Date(endDate) : undefined,
    page,
    pageSize,
  });

  // Calculate statistics
  const stats = calculateAuditStatistics(result.entries);

  return NextResponse.json({
    success: true,
    data: {
      logs: result.entries,
      pagination: {
        page,
        pageSize,
        totalCount: result.totalCount,
        totalPages: result.totalPages,
      },
      statistics: stats,
      filters: {
        categories: Object.values(AuditCategory),
        severities: Object.values(AuditSeverity),
        outcomes: Object.values(AuditOutcome),
      },
    },
  });
}

/**
 * Records a new audit log entry
 */
async function recordAuditLogHandler(request: NextRequest): Promise<NextResponse> {
  const body = await request.json();

  // Validate required fields
  if (!body.category || !body.action || !body.actor) {
    return NextResponse.json(
      { success: false, error: 'Missing required fields: category, action, actor' },
      { status: 400 }
    );
  }

  const entry = recordAuditEvent(body as Omit<AuditLogEntry, 'id' | 'timestamp' | 'correlationId' | 'retentionUntil'>);

  return NextResponse.json({
    success: true,
    message: 'Audit log entry recorded successfully',
    data: entry,
  });
}

/**
 * Gets compliance status for specified framework
 */
async function getComplianceStatusHandler(params: URLSearchParams): Promise<NextResponse> {
  const framework = (params.get('framework') || 'CIS_Controls_v8') as ComplianceFramework;

  const checks = generateMockComplianceChecks(framework);
  
  // Calculate compliance statistics
  const passed = checks.filter(c => c.status === 'pass').length;
  const failed = checks.filter(c => c.status === 'fail').length;
  const partial = checks.filter(c => c.status === 'partial').length;
  const total = checks.length;
  const score = Math.round((passed / total) * 100);

  const report: ComplianceReport = {
    id: `report_${Date.now()}`,
    framework,
    assessmentDate: new Date(),
    assessor: 'Automated Security Scanner v1.0',
    scope: {
      systems: ['SOC Platform', 'Wazuh SIEM', 'TheHive IR', 'MISP Threat Intel'],
      networks: ['Production DMZ', 'Internal Network', 'Management Network'],
      applications: ['Web Dashboard', 'API Services', 'Monitoring Stack'],
      personnel: ['Security Team', 'Operations Team'],
      thirdParties: [],
      exclusions: ['Development environments'],
    },
    overallStatus: score >= 80 ? 'pass' : score >= 60 ? 'partial' : 'fail',
    score,
    checks,
    summary: {
      totalChecks: total,
      passed,
      failed,
      partial,
      notApplicable: 0,
      notTested: 0,
      error: 0,
      passPercentage: score,
      criticalFailures: checks.filter(c => c.severity === 'critical' && c.status === 'fail').length,
      majorFailures: checks.filter(c => c.severity === 'major' && c.status === 'fail').length,
    },
    findings: checks
      .filter(c => c.status !== 'pass')
      .map(c => ({
        id: `finding_${c.id}`,
        controlId: c.controlId,
        title: c.controlTitle,
        description: c.description,
        severity: c.severity,
        riskRating: c.severity === 'critical' ? 'high' : c.severity === 'major' ? 'medium' : 'low',
        status: 'open',
        remediationSteps: c.recommendations,
      })),
    remediationPlan: {
      items: checks
        .filter(c => c.status !== 'pass')
        .slice(0, 5)
        .map((c, i) => ({
          findingId: c.id,
          action: c.recommendations[0] || 'Implement control',
          responsible: 'Security Team',
          dueDate: new Date(Date.now() + (i + 1) * 7 * 24 * 60 * 60 * 1000),
          status: 'pending',
          verified: false,
        })),
      estimatedEffort: checks.filter(c => c.status !== 'pass').length * 4,
      priorityOrder: checks
        .filter(c => c.status !== 'pass')
        .sort((a, b) => {
          const order = { critical: 0, major: 1, minor: 2 };
          return order[a.severity] - order[b.severity];
        })
        .map(c => c.id),
    },
    nextAssessmentDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
  };

  return NextResponse.json({
    success: true,
    data: report,
  });
}

/**
 * Runs a compliance check on demand
 */
async function runComplianceCheckHandler(_request: NextRequest): Promise<NextResponse> {
  // Simulate scanning delay
  await new Promise(resolve => setTimeout(resolve, 2000));

  const frameworks: ComplianceFramework[] = [
    'CIS_Controls_v8',
    'NIST_SP_800_53',
    'ISO_27001',
  ];

  const results = {};
  let overallScore = 0;

  for (const framework of frameworks) {
    const checks = generateMockComplianceChecks(framework);
    const passed = checks.filter(c => c.status === 'pass').length;
    const score = Math.round((passed / checks.length) * 100);
    (results as Record<string, unknown>)[framework] = {
      score,
      totalChecks: checks.length,
      passed,
      failed: checks.length - passed,
      lastChecked: new Date().toISOString(),
    };
    overallScore += score;
  }

  return NextResponse.json({
    success: true,
    message: 'Compliance check completed',
    data: {
      frameworks: results,
      averageScore: Math.round(overallScore / frameworks.length),
      completedAt: new Date().toISOString(),
      duration: '2s',
    },
  });
}

/**
 * Gets vulnerability findings
 */
async function getVulnerabilitiesHandler(params: URLSearchParams): Promise<NextResponse> {
  const severity = params.get('severity') as VulnSeverity | null;
  const status = params.get('status') as VulnStatus | null;
  const page = parseInt(params.get('page') || '1');
  const pageSize = parseInt(params.get('pageSize') || '20');

  let filtered = [...MOCK_VULNERABILITIES];

  if (severity) {
    filtered = filtered.filter(v => v.severity === severity);
  }

  if (status) {
    filtered = filtered.filter(v => v.status === status);
  }

  // Pagination
  const startIndex = (page - 1) * pageSize;
  const paginated = filtered.slice(startIndex, startIndex + pageSize);

  // Calculate summary
  const summary: ScanSummary = {
    totalTargets: 5,
    scannedTargets: 5,
    criticalCount: MOCK_VULNERABILITIES.filter(v => v.severity === 'critical').length,
    highCount: MOCK_VULNERABILITIES.filter(v => v.severity === 'high').length,
    mediumCount: MOCK_VULNERABILITIES.filter(v => v.severity === 'medium').length,
    lowCount: MOCK_VULNERABILITIES.filter(v => v.severity === 'low').length,
    infoCount: MOCK_VULNERABILITIES.filter(v => v.severity === 'info').length,
    riskScore: calculateRiskScore(MOCK_VULNERABILITIES),
    compliancePercentage: 85,
  };

  return NextResponse.json({
    success: true,
    data: {
      vulnerabilities: paginated,
      summary,
      pagination: {
        page,
        pageSize,
        totalCount: filtered.length,
        totalPages: Math.ceil(filtered.length / pageSize),
      },
      filters: {
        severities: ['critical', 'high', 'medium', 'low', 'info'],
        statuses: ['open', 'confirmed', 'false_positive', 'accepted_risk', 'in_progress', 'fixed', 'verified', 'closed'],
      },
    },
  });
}

/**
 * Triggers a security scan
 */
async function triggerSecurityScanHandler(request: NextRequest): Promise<NextResponse> {
  const body = await request.json().catch(() => ({}));
  const scanType = body.scanType || 'full';
  const targets = body.targets || ['soc.algeria.dz'];

  // Simulate scan initiation
  const scanResult: SecurityScanResult = {
    scanId: `scan_${Date.now()}`,
    configId: `config_default`,
    startedAt: new Date(),
    completedAt: new Date(Date.now() + 300000), // Estimated 5 minutes
    duration: 300,
    status: 'running',
    summary: {
      totalTargets: targets.length,
      scannedTargets: 0,
      criticalCount: 0,
      highCount: 0,
      mediumCount: 0,
      lowCount: 0,
      infoCount: 0,
      riskScore: 0,
      compliancePercentage: 0,
    },
    findings: [],
    errors: [],
  };

  return NextResponse.json({
    success: true,
    message: `${scanType.toUpperCase()} scan initiated`,
    data: {
      ...scanResult,
      estimatedDuration: '5-15 minutes',
      notificationEmail: body.notificationEmail || null,
      targets,
    },
  });
}

/**
 * Gets overall security posture
 */
async function getSecurityPostureHandler(): Promise<NextResponse> {
  const postureItems = runSecurityHardeningCheck({
    tlsVersion: 'TLSv1.2',
    hstsEnabled: true,
    cspEnabled: true,
    corsConfigured: true,
    rateLimitingEnabled: true,
    mfaRequired: true,
    auditLoggingEnabled: true,
    encryptionEnabled: true,
    passwordPolicyEnforced: true,
    firewallEnabled: true,
    intrusionDetection: true,
    backupEncrypted: true,
    accessLogging: true,
    errorHandlingSecure: true,
    sessionManagementSecure: true,
  });

  const posture = calculateSecurityPosture(postureItems);

  return NextResponse.json({
    success: true,
    data: posture,
  });
}

/**
 * Gets audit log summary statistics
 */
async function getAuditSummaryHandler(): Promise<NextResponse> {
  const recentLogs = queryAuditLogs({ 
    page: 1, 
    pageSize: 1000,
    startDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
  });

  const stats = calculateAuditStatistics(recentLogs.entries);

  return NextResponse.json({
    success: true,
    data: {
      period: 'last_24_hours',
      generatedAt: new Date().toISOString(),
      ...stats,
      topEvents: getTopEvents(recentLogs.entries),
      timeline: generateTimelineData(recentLogs.entries),
    },
  });
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculates audit log statistics
 */
function calculateAuditStatistics(entries: AuditLogEntry[]) {
  const byCategory: Record<string, number> = {};
  const bySeverity: Record<string, number> = {};
  const byOutcome: Record<string, number> = {};

  for (const entry of entries) {
    byCategory[entry.category] = (byCategory[entry.category] || 0) + 1;
    bySeverity[entry.severity] = (bySeverity[entry.severity] || 0) + 1;
    byOutcome[entry.outcome] = (byOutcome[entry.outcome] || 0) + 1;
  }

  return {
    totalEntries: entries.length,
    byCategory,
    bySeverity,
    byOutcome,
    uniqueActors: new Set(entries.map(e => e.actor.id)).size,
    uniqueResources: new Set(entries.map(e => e.resource.type)).size,
  };
}

/**
 * Calculates risk score from vulnerabilities
 */
function calculateRiskScore(vulnerabilities: Vulnerability[]): number {
  if (vulnerabilities.length === 0) return 100;

  const weights = { critical: 40, high: 20, medium: 10, low: 3, info: 0 };
  let totalWeight = 0;
  let maxWeight = 100;

  for (const vuln of vulnerabilities) {
    totalWeight += weights[vuln.severity];
  }

  return Math.max(0, Math.round(100 - totalWeight));
}

/**
 * Gets top event types from logs
 */
function getTopEvents(entries: AuditLogEntry[]): Array<{ action: string; count: number }> {
  const counts: Record<string, number> = {};
  
  for (const entry of entries) {
    counts[entry.action] = (counts[entry.action] || 0) + 1;
  }

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([action, count]) => ({ action, count }));
}

/**
 * Generates timeline data for charts
 */
function generateTimelineData(entries: AuditLogEntry[]): Array<{ hour: string; count: number }> {
  const hourlyCounts: Record<string, number> = {};
  
  // Initialize last 24 hours
  for (let i = 23; i >= 0; i--) {
    const hour = new Date(Date.now() - i * 60 * 60 * 1000);
    const key = `${hour.getHours().toString().padStart(2, '0')}:00`;
    hourlyCounts[key] = 0;
  }

  // Count entries per hour
  for (const entry of entries) {
    const key = `${entry.timestamp.getHours().toString().padStart(2, '0')}:00`;
    if (hourlyCounts.hasOwnProperty(key)) {
      hourlyCounts[key]++;
    }
  }

  return Object.entries(hourlyCounts).map(([hour, count]) => ({ hour, count }));
}
