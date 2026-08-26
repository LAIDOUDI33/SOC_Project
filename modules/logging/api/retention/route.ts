/**
 * Retention API Route
 * National SOC Platform for Algeria (2026-2030)
 * 
 * Provides endpoints for log lifecycle management:
 * - GET /api/logging/retention/policies - List policies
 * - POST /api/logging/retention/policies - Create policy
 * - PUT /api/logging/retention/policy/[id] - Update policy
 * - DELETE /api/logging/retention/policy/[id] - Delete policy
 * - POST /api/logging/retention/apply - Apply retention rules
 * - GET /api/logging/retention/storage - Storage usage by source
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  RetentionPolicy,
  RetentionAction,
  RetentionPolicyStats,
  StorageUsage,
  LogSource,
  LogLevel,
  getTimestamp,
  generateId,
  safeStringify
} from '../../types/logging.types';

// ============================================================================
// IN-MEMORY RETENTION STATE (for development/demo)
// ============================================================================

/** Sample retention policies */
const retentionPolicies: RetentionPolicy[] = [
  {
    id: 'policy-001',
    name: 'Security Events - 7 Year Retention',
    description: 'Retain all security-related events for 7 years per Algerian Cybersecurity Law and compliance requirements',
    sources: [
      LogSource.SECURITY,
      LogSource.SECURITY_ALERT,
      LogSource.SECURITY_INCIDENT,
      LogSource.SECURITY_SCAN,
      LogSource.SECURITY_VULNERABILITY,
      LogSource.WAZUH,
      LogSource.SURICATA
    ],
    levels: undefined, // All levels
    retentionPeriodDays: 2555, // 7 years
    action: RetentionAction.ARCHIVE,
    archiveDestination: 's3://soc-archive/compliance/security/',
    enabled: true,
    priority: 100,
    schedule: '0 2 * * 0', // Weekly on Sunday at 2 AM
    createdAt: '2026-01-01T00:00:00Z',
    lastAppliedAt: getTimestamp(),
    createdBy: 'system-admin',
    stats: {
      timesApplied: 52,
      totalProcessed: 1250000,
      totalActioned: 45000,
      lastRunDurationMs: 145000,
      spaceFreedBytes: 250 * 1024 * 1024 * 1024 // 250 GB archived
    }
  },
  {
    id: 'policy-002',
    name: 'Audit Trail - 7 Year Retention',
    description: 'Immutable audit trail retention for compliance and forensic investigation',
    sources: [LogSource.AUDIT],
    levels: undefined,
    retentionPeriodDays: 2555,
    action: RetentionAction.MOVE_TO_COLD,
    archiveDestination: 'cold-index-audit',
    enabled: true,
    priority: 90,
    schedule: '0 3 * * *', // Daily at 3 AM
    createdAt: '2026-01-01T00:00:00Z',
    lastAppliedAt: getTimestamp(),
    createdBy: 'compliance-officer',
    stats: {
      timesApplied: 365,
      totalProcessed: 890000,
      totalActioned: 120000,
      lastRunDurationMs: 45000,
      spaceFreedBytes: 45 * 1024 * 1024 * 1024 // 45 GB moved to cold
    }
  },
  {
    id: 'policy-003',
    name: 'Authentication Logs - 3 Year Retention',
    description: 'Authentication and authorization logs retained for 3 years per best practices',
    sources: [
      LogSource.AUTH,
      LogSource.AUTH_LOGIN,
      LogSource.AUTH_LOGOUT,
      LogSource.AUTH_MFA,
      LogSource.AUTH_TOKEN
    ],
    levels: undefined,
    retentionPeriodDays: 1095, // 3 years
    action: RetentionAction.COMPRESS,
    enabled: true,
    priority: 80,
    schedule: '0 4 * * 0', // Weekly Sunday at 4 AM
    createdAt: '2026-01-15T10:00:00Z',
    lastAppliedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    createdBy: 'security-admin',
    stats: {
      timesApplied: 50,
      totalProcessed: 2500000,
      totalActioned: 180000,
      lastRunDurationMs: 89000,
      spaceFreedBytes: 120 * 1024 * 1024 * 1024 // 120 GB compressed
    }
  },
  {
    id: 'policy-004',
    name: 'API and Application Logs - 90 Day Retention',
    description: 'Standard operational logs with shorter retention for debugging purposes',
    sources: [
      LogSource.API,
      LogSource.API_REQUEST,
      LogSource.API_RESPONSE,
      LogSource.APPLICATION,
      LogSource.SYSTEM_HEALTH
    ],
    levels: [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN], // Not errors
    retentionPeriodDays: 90,
    action: RetentionAction.DELETE,
    enabled: true,
    priority: 50,
    schedule: '0 1 * * *', // Daily at 1 AM
    createdAt: '2026-02-01T08:00:00Z',
    lastAppliedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    createdBy: 'ops-admin',
    stats: {
      timesApplied: 364,
      totalProcessed: 15000000,
      totalActioned: 5000000,
      lastRunDurationMs: 320000,
      spaceFreedBytes: 500 * 1024 * 1024 * 1024 // 500 GB deleted
    }
  },
  {
    id: 'policy-005',
    name: 'Error and Critical Logs - 1 Year Retention',
    description: 'Extended retention for error-level logs to support troubleshooting and trend analysis',
    sources: Object.values(LogSource), // All sources
    levels: [LogLevel.ERROR, LogLevel.CRITICAL],
    retentionPeriodDays: 365,
    action: RetentionAction.ARCHIVE,
    archiveDestination: 's3://soc-archive/troubleshooting/errors/',
    enabled: true,
    priority: 70,
    schedule: '0 5 * * 0', // Weekly Sunday at 5 AM
    createdAt: '2026-02-15T14:00:00Z',
    lastAppliedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    createdBy: 'ops-admin',
    stats: {
      timesApplied: 48,
      totalProcessed: 450000,
      totalActioned: 85000,
      lastRunDurationMs: 67000,
      spaceFreedBytes: 25 * 1024 * 1024 * 1024 // 25 GB archived
    }
  }
];

/** Simulated storage usage data */
function generateStorageUsage(): StorageUsage[] {
  const now = new Date();
  
  return [
    {
      source: LogSource.SECURITY,
      totalEntries: 4523000,
      totalBytes: 680 * 1024 * 1024 * 1024, // 680 GB
      oldestEntry: new Date(now.getTime() - 2555 * 24 * 60 * 60 * 1000).toISOString(),
      newestEntry: now.toISOString(),
      entriesExpiringSoon: 125000,
      applicablePolicy: retentionPolicies[0],
      byLevel: {
        [LogLevel.DEBUG]: 250000,
        [LogLevel.INFO]: 2800000,
        [LogLevel.WARN]: 980000,
        [LogLevel.ERROR]: 480000,
        [LogLevel.CRITICAL]: 13000
      },
      growthTrend: [12000, 13500, 11800, 14200, 12800, 15100, 13900]
    },
    {
      source: LogSource.AUDIT,
      totalEntries: 890000,
      totalBytes: 95 * 1024 * 1024 * 1024, // 95 GB
      oldestEntry: new Date(now.getTime() - 1095 * 24 * 60 * 60 * 1000).toISOString(),
      newestEntry: now.toISOString(),
      entriesExpiringSoon: 8500,
      applicablePolicy: retentionPolicies[1],
      byLevel: {
        [LogLevel.DEBUG]: 0,
        [LogLevel.INFO]: 885000,
        [LogLevel.WARN]: 4000,
        [LogLevel.ERROR]: 900,
        [LogLevel.CRITICAL]: 100
      },
      growthTrend: [2400, 2600, 2300, 2800, 2500, 2900, 2700]
    },
    {
      source: LogSource.WAZUH,
      totalEntries: 2850000,
      totalBytes: 420 * 1024 * 1024 * 1024, // 420 GB
      oldestEntry: new Date(now.getTime() - 730 * 24 * 60 * 60 * 1000).toISOString(),
      newestEntry: now.toISOString(),
      entriesExpiringSoon: 0,
      applicablePolicy: retentionPolicies[0],
      byLevel: {
        [LogLevel.DEBUG]: 150000,
        [LogLevel.INFO]: 1900000,
        [LogLevel.WARN]: 650000,
        [LogLevel.ERROR]: 145000,
        [LogLevel.CRITICAL]: 5000
      },
      growthTrend: [8000, 9200, 8500, 10100, 9400, 10800, 9900]
    },
    {
      source: LogSource.SURICATA,
      totalEntries: 1520000,
      totalBytes: 185 * 1024 * 1024 * 1024, // 185 GB
      oldestEntry: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString(),
      newestEntry: now.toISOString(),
      entriesExpiringSoon: 42000,
      applicablePolicy: retentionPolicies[0],
      byLevel: {
        [LogLevel.DEBUG]: 75000,
        [LogLevel.INFO]: 1100000,
        [LogLevel.WARN]: 285000,
        [LogLevel.ERROR]: 58000,
        [LogLevel.CRITICAL]: 2000
      },
      growthTrend: [4500, 5200, 4800, 5800, 5100, 6100, 5500]
    },
    {
      source: LogSource.API,
      totalEntries: 15800000,
      totalBytes: 1200 * 1024 * 1024 * 1024, // 1.2 TB
      oldestEntry: new Date(now.getTime() - 95 * 24 * 60 * 60 * 1000).toISOString(),
      newestEntry: now.toISOString(),
      entriesExpiringSoon: 3200000,
      applicablePolicy: retentionPolicies[3],
      byLevel: {
        [LogLevel.DEBUG]: 3500000,
        [LogLevel.INFO]: 10500000,
        [LogLevel.WARN]: 1650000,
        [LogLevel.ERROR]: 155000,
        [LogLevel.CRITICAL]: 2000
      },
      growthTrend: [52000, 58000, 54000, 62000, 57000, 65000, 60000]
    },
    {
      source: LogSource.APPLICATION,
      totalEntries: 5200000,
      totalBytes: 380 * 1024 * 1024 * 1024, // 380 GB
      oldestEntry: new Date(now.getTime() - 85 * 24 * 60 * 60 * 1000).toISOString(),
      newestEntry: now.toISOString(),
      entriesExpiringSoon: 980000,
      applicablePolicy: retentionPolicies[3],
      byLevel: {
        [LogLevel.DEBUG]: 1200000,
        [LogLevel.INFO]: 3400000,
        [LogLevel.WARN]: 520000,
        [LogLevel.ERROR]: 78000,
        [LogLevel.CRITICAL]: 2000
      },
      growthTrend: [18000, 21000, 19500, 23500, 21200, 25000, 22800]
    },
    {
      source: LogSource.AUTH,
      totalEntries: 3800000,
      totalBytes: 220 * 1024 * 1024 * 1024, // 220 GB
      oldestEntry: new Date(now.getTime() - 1095 * 24 * 60 * 60 * 1000).toISOString(),
      newestEntry: now.toISOString(),
      entriesExpiringSoon: 45000,
      applicablePolicy: retentionPolicies[2],
      byLevel: {
        [LogLevel.DEBUG]: 0,
        [LogLevel.INFO]: 2950000,
        [LogLevel.WARN]: 720000,
        [LogLevel.ERROR]: 128000,
        [LogLevel.CRITICAL]: 2000
      },
      growthTrend: [14000, 16000, 14800, 17500, 15600, 18200, 16700]
    },
    {
      source: LogSource.SYSTEM,
      totalEntries: 920000,
      totalBytes: 65 * 1024 * 1024 * 1024, // 65 GB
      oldestEntry: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString(),
      newestEntry: now.toISOString(),
      entriesExpiringSoon: 185000,
      applicablePolicy: retentionPolicies[3],
      byLevel: {
        [LogLevel.DEBUG]: 180000,
        [LogLevel.INFO]: 580000,
        [LogLevel.WARN]: 130000,
        [LogLevel.ERROR]: 28000,
        [LogLevel.CRITICAL]: 2000
      },
      growthTrend: [3200, 3600, 3400, 4000, 3700, 4300, 3950]
    }
  ];
}

// ============================================================================
// API HANDLERS
// ============================================================================

/**
 * GET /api/logging/retention
 * 
 * Main endpoint for retention management.
 * Query Parameters:
 * - action: One of: policies, storage, summary, policy/[id]
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'policies';
    
    switch (action) {
      case 'policies':
        return handleGetPolicies();
      
      case 'storage':
        return handleGetStorageUsage();
      
      case 'summary':
        return handleGetSummary();
      
      default:
        // Check if it's a specific policy request
        if (action.startsWith('policy/')) {
          const policyId = action.split('/')[1];
          return handleGetSinglePolicy(policyId);
        }
        
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
    
  } catch (error) {
    console.error('[RetentionAPI] Error handling GET request:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/logging/retention
 * 
 * Perform retention operations:
 * - create-policy: Create new retention policy
 * - apply: Apply retention rules
 * - preview: Preview what would be affected
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const action = body.action;
    
    switch (action) {
      case 'create-policy':
        return handleCreatePolicy(body);
      
      case 'apply':
        return handleApplyRetention(body);
      
      case 'preview':
        return handlePreviewRetention(body);
      
      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
    
  } catch (error) {
    console.error('[RetentionAPI] Error handling POST request:', error);
    return NextResponse.json(
      { success: false, error: 'Invalid request body' },
      { status: 400 }
    );
  }
}

/**
 * PUT /api/logging/retention/policy/[id]
 * 
 * Update an existing retention policy
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const policyId = params.id;
    
    const policyIndex = retentionPolicies.findIndex(p => p.id === policyId);
    if (policyIndex === -1) {
      return NextResponse.json(
        { success: false, error: 'Policy not found' },
        { status: 404 }
      );
    }
    
    // Apply updates
    const updatedPolicy = {
      ...retentionPolicies[policyIndex],
      ...body,
      id: policyId, // Prevent ID change
      updatedAt: getTimestamp()
    };
    
    retentionPolicies[policyIndex] = updatedPolicy;
    
    return NextResponse.json({
      success: true,
      data: updatedPolicy,
      meta: { updatedAt: getTimestamp() }
    });
    
  } catch (error) {
    console.error('[RetentionAPI] Error handling PUT request:', error);
    return NextResponse.json(
      { success: false, error: 'Invalid request body' },
      { status: 400 }
    );
  }
}

/**
 * DELETE /api/logging/retention/policy/[id]
 * 
 * Delete a retention policy
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const policyId = params.id;
    
    const policyIndex = retentionPolicies.findIndex(p => p.id === policyId);
    if (policyIndex === -1) {
      return NextResponse.json(
        { success: false, error: 'Policy not found' },
        { status: 404 }
      );
    }
    
    const deletedPolicy = retentionPolicies[policyIndex];
    retentionPolicies.splice(policyIndex, 1);
    
    return NextResponse.json({
      success: true,
      data: {
        message: `Policy "${deletedPolicy.name}" deleted successfully`,
        deletedPolicy
      },
      meta: { deletedAt: getTimestamp() }
    });
    
  } catch (error) {
    console.error('[RetentionAPI] Error handling DELETE request:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================================================
// HANDLER IMPLEMENTATIONS
// ============================================================================

/**
 * Handle GET /api/logging/retention?action=policies
 */
function handleGetPolicies(): NextResponse {
  return NextResponse.json({
    success: true,
    data: retentionPolicies.filter(p => p.enabled),
    meta: {
      queriedAt: getTimestamp(),
      totalCount: retentionPolicies.length,
      activeCount: retentionPolicies.filter(p => p.enabled).length
    }
  });
}

/**
 * Handle GET /api/logging/retention?action=policy/[id]
 */
function handleGetSinglePolicy(policyId: string): NextResponse {
  const policy = retentionPolicies.find(p => p.id === policyId);
  
  if (!policy) {
    return NextResponse.json(
      { success: false, error: 'Policy not found' },
      { status: 404 }
    );
  }
  
  return NextResponse.json({
    success: true,
    data: policy,
    meta: { queriedAt: getTimestamp() }
  });
}

/**
 * Handle GET /api/logging/retention?action=storage
 */
function handleGetStorageUsage(): NextResponse {
  const storageData = generateStorageUsage();
  
  // Calculate totals
  const totals = storageData.reduce((acc, usage) => ({
    totalEntries: acc.totalEntries + usage.totalEntries,
    totalBytes: acc.totalBytes + usage.totalBytes,
    entriesExpiringSoon: acc.entriesExpiringSoon + usage.entriesExpiringSoon
  }), { totalEntries: 0, totalBytes: 0, entriesExpiringSoon: 0 });
  
  // Calculate storage quota (simulated)
  const quotaBytes = 5 * 1024 * 1024 * 1024 * 1024; // 5 TB quota
  const usagePercent = ((totals.totalBytes / quotaBytes) * 100).toFixed(1);
  
  return NextResponse.json({
    success: true,
    data: {
      bySource: storageData,
      summary: {
        ...totals,
        totalBytesFormatted: formatBytes(totals.totalBytes),
        quotaBytes,
        quotaBytesFormatted: formatBytes(quotaBytes),
        usagePercent: parseFloat(usagePercent),
        projectedFullDate: new Date(
          Date.now() + ((quotaBytes - totals.totalBytes) / (totals.totalEntries / 30)) * 30 * 24 * 60 * 60 * 1000
        ).toISOString().split('T')[0]
      }
    },
    meta: { queriedAt: getTimestamp() }
  });
}

/**
 * Handle GET /api/logging/retention?action=summary
 */
function handleGetSummary(): NextResponse {
  const storageData = generateStorageUsage();
  const activePolicies = retentionPolicies.filter(p => p.enabled);
  
  // Calculate various metrics
  const totalStorage = storageData.reduce((sum, s) => sum + s.totalBytes, 0);
  const totalEntries = storageData.reduce((sum, s) => sum + s.totalEntries, 0);
  const expiringSoon = storageData.reduce((sum, s) => sum + s.entriesExpiringSoon, 0);
  
  // Policy effectiveness metrics
  const totalProcessed = activePolicies.reduce((sum, p) => sum + p.stats.totalProcessed, 0);
  const totalFreed = activePolicies.reduce((sum, p) => sum + p.stats.spaceFreedBytes, 0);
  
  return NextResponse.json({
    success: true,
    data: {
      overview: {
        totalPolicies: retentionPolicies.length,
        activePolicies: activePolicies.length,
        totalSourcesCovered: new Set(activePolicies.flatMap(p => p.sources)).size
      },
      storage: {
        totalEntries,
        totalBytes: totalStorage,
        totalBytesFormatted: formatBytes(totalStorage),
        entriesExpiringSoon: expiringSoon,
        averageRetentionDays: Math.round(
          activePolicies.reduce((sum, p) => sum + p.retentionPeriodDays, 0) / activePolicies.length
        )
      },
      effectiveness: {
        totalEntriesProcessed: totalProcessed,
        totalSpaceFreed: totalFreed,
        totalSpaceFreedFormatted: formatBytes(totalFreed),
        compressionRatio: totalProcessed > 0 ? (totalFreed / totalProcessed).toFixed(2) : '0'
      },
      nextScheduledRuns: activePolicies
        .filter(p => p.schedule)
        .map(p => ({
          policyName: p.name,
          schedule: p.schedule!,
          nextRun: estimateNextRun(p.schedule!)
        }))
        .sort((a, b) => a.nextRun.localeCompare(b.nextRun))
    },
    meta: { queriedAt: getTimestamp() }
  });
}

/**
 * Handle POST /api/logging/retention with action=create-policy
 */
function handleCreatePolicy(body: Record<string, unknown>): NextResponse {
  const { name, description, sources, levels, retentionPeriodDays, action, schedule, priority } = body;
  
  if (!name || !sources || !retentionPeriodDays || !action) {
    return NextResponse.json(
      { success: false, error: 'name, sources, retentionPeriodDays, and action are required' },
      { status: 400 }
    );
  }
  
  const newPolicy: RetentionPolicy = {
    id: generateId(),
    name: name as string,
    description: (description as string) || '',
    sources: sources as LogSource[],
    levels: levels as LogLevel[] | undefined,
    retentionPeriodDays: retentionPeriodDays as number,
    action: action as RetentionAction,
    archiveDestination: body.archiveDestination as string | undefined,
    enabled: true,
    priority: (priority as number) || 50,
    schedule: schedule as string | undefined,
    createdAt: getTimestamp(),
    createdBy: 'api-user',
    stats: {
      timesApplied: 0,
      totalProcessed: 0,
      totalActioned: 0,
      spaceFreedBytes: 0
    }
  };
  
  retentionPolicies.push(newPolicy);
  
  return NextResponse.json({
    success: true,
    data: newPolicy,
    meta: { createdAt: getTimestamp() }
  });
}

/**
 * Handle POST /api/logging/retention with action=apply
 */
async function handleApplyRetention(body: Record<string, unknown>): Promise<NextResponse> {
  const { policyId, dryRun } = body;
  
  let policiesToApply: RetentionPolicy[];
  
  if (policyId) {
    const policy = retentionPolicies.find(p => p.id === policyId);
    if (!policy) {
      return NextResponse.json(
        { success: false, error: 'Policy not found' },
        { status: 404 }
      );
    }
    policiesToApply = [policy];
  } else {
    policiesToApply = retentionPolicies.filter(p => p.enabled);
  }
  
  const results = [];
  let totalAffected = 0;
  let totalActioned = 0;
  
  for (const policy of policiesToApply) {
    // Simulate applying retention policy
    const affectedCount = estimateAffectedEntries(policy);
    const actionedCount = dryRun ? 0 : Math.floor(affectedCount * 0.8); // 80% success rate
    
    totalAffected += affectedCount;
    totalActioned += actionedCount;
    
    if (!dryRun) {
      // Update policy stats
      policy.stats.timesApplied++;
      policy.stats.totalProcessed += affectedCount;
      policy.stats.totalActioned += actionedCount;
      policy.stats.lastAppliedAt = getTimestamp();
      policy.stats.lastRunDurationMs = Math.round(10000 + Math.random() * 60000);
      policy.stats.spaceFreedBytes += actionedCount * 500; // ~500 bytes per entry avg
    }
    
    results.push({
      policyId: policy.id,
      policyName: policy.name,
      affectedEntries: affectedCount,
      actionedEntries: actionedCount,
      action: policy.action,
      dryRun: !!dryRun
    });
  }
  
  // Simulate processing time
  await new Promise(resolve => setTimeout(resolve, 500));
  
  return NextResponse.json({
    success: true,
    data: {
      dryRun: !!dryRun,
      policiesProcessed: results.length,
      totalAffectedEntries: totalAffected,
      totalActionedEntries: totalActioned,
      results,
      message: dryRun 
        ? 'Dry run completed. No changes were made.'
        : `Successfully processed ${results.length} policies. ${totalActioned} entries actioned.`
    },
    meta: { completedAt: getTimestamp() }
  });
}

/**
 * Handle POST /api/logging/retention with action=preview
 */
function handlePreviewRetention(body: Record<string, unknown>): NextResponse {
  const { sources, timeRange } = body;
  
  const storageData = generateStorageUsage();
  let filteredData = storageData;
  
  if (sources && Array.isArray(sources)) {
    filteredData = storageData.filter(s => (sources as string[]).includes(s.source));
  }
  
  // Generate preview of what would be affected
  const preview = filteredData.map(usage => {
    const policy = usage.applicablePolicy;
    const daysUntilExpiry = calculateDaysUntilExpiry(usage.oldestEntry, policy?.retentionPeriodDays || 365);
    
    return {
      source: usage.source,
      currentEntries: usage.totalEntries,
      currentSize: formatBytes(usage.totalBytes),
      applicablePolicy: policy?.name || 'None',
      retentionDays: policy?.retentionPeriodDays || 'Not set',
      entriesEligibleForRetention: Math.floor(usage.totalEntries * 0.15), // Estimate
      estimatedSpaceRecovery: formatBytes(Math.floor(usage.totalBytes * 0.12)),
      recommendedAction: daysUntilExpiry < 30 ? 'URGENT: Review storage' : 'Normal'
    };
  });
  
  return NextResponse.json({
    success: true,
    data: {
      preview,
      summary: {
        totalSourcesAnalyzed: preview.length,
        totalEntriesEligible: preview.reduce((s, p) => s + p.entriesEligibleForRetention, 0),
        estimatedTotalRecovery: formatBytes(
          preview.reduce((s, p) => {
            const match = p.estimatedSpaceRecovery.match(/[\d.]+/);
            return s + (parseFloat(match?.[0] || '0') * 
              (p.estimatedSpaceRecovery.includes('TB') ? 1024*1024*1024*1024 :
               p.estimatedSpaceRecovery.includes('GB') ? 1024*1024*1024 :
               p.estimatedSpaceRecovery.includes('MB') ? 1024*1024 : 1024));
          }, 0)
        )
      }
    },
    meta: { generatedAt: getTimestamp() }
  });
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  let unitIndex = 0;
  let value = bytes;
  
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }
  
  return `${value.toFixed(unitIndex > 1 ? 1 : 0)} ${units[unitIndex]}`;
}

/**
 * Estimate next run time based on cron expression
 * Simple implementation for common patterns
 */
function estimateNextRun(cronExpression: string): string {
  const now = new Date();
  
  // Parse simple cron patterns
  if (cronExpression === '0 2 * * 0') {
    // Weekly Sunday at 2 AM
    const daysUntilSunday = (7 - now.getDay()) % 7 || 7;
    const nextSunday = new Date(now.getTime() + daysUntilSunday * 24 * 60 * 60 * 1000);
    nextSunday.setHours(2, 0, 0, 0);
    return nextSunday.toISOString();
  }
  
  if (cronExpression === '0 3 * * *') {
    // Daily at 3 AM
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    tomorrow.setHours(3, 0, 0, 0);
    return tomorrow.toISOString();
  }
  
  if (cronExpression === '0 1 * * *') {
    // Daily at 1 AM
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    tomorrow.setHours(1, 0, 0, 0);
    return tomorrow.toISOString();
  }
  
  // Default: return tomorrow
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  tomorrow.setHours(0, 0, 0, 0);
  return tomorrow.toISOString();
}

/**
 * Estimate how many entries would be affected by a policy
 */
function estimateAffectedEntries(policy: RetentionPolicy): number {
  const storageData = generateStorageUsage();
  
  let total = 0;
  for (const usage of storageData) {
    if (policy.sources === '*' || policy.sources.includes(usage.source)) {
      // Estimate entries older than retention period
      const retentionMs = policy.retentionPeriodDays * 24 * 60 * 60 * 1000;
      const cutoffDate = new Date(Date.now() - retentionMs);
      const oldestDate = new Date(usage.oldestEntry);
      
      if (oldestDate < cutoffDate) {
        // Some entries are eligible - estimate based on age distribution
        const ageRangeMs = new Date(usage.newestEntry).getTime() - oldestDate.getTime();
        const eligibleAgeMs = cutoffDate.getTime() - oldestDate.getTime();
        const eligibleRatio = eligibleAgeMs / ageRangeMs;
        
        total += Math.floor(usage.totalEntries * eligibleRatio * 0.3); // 30% of eligible
      }
    }
  }
  
  return total;
}

/**
 * Calculate days until entries expire based on oldest entry and retention period
 */
function calculateDaysUntilExpiry(oldestEntry: string, retentionDays: number): number {
  const oldest = new Date(oldestEntry);
  const expiryDate = new Date(oldest.getTime() + retentionDays * 24 * 60 * 60 * 1000);
  const now = new Date();
  
  return Math.max(0, Math.ceil((expiryDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)));
}
