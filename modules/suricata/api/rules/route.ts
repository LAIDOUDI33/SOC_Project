/**
 * Suricata Rules API Routes
 * National SOC Platform - Algeria 2026-2030
 * 
 * Endpoints:
 * GET /api/suricata/rules - List and search rules
 * GET /api/suricata/rules/[sid] - Get single rule by SID
 * POST /api/suricata/rules - Create new custom rule
 * PUT /api/suricata/rules/[sid] - Update existing rule
 * DELETE /api/suricata/rules/[sid] - Delete custom rule
 * POST /api/suricata/rules/validate - Validate rule syntax
 * POST /api/suricata/rules/test - Test rule against sample traffic
 * POST /api/suricata/rules/[sid]/enable - Enable rule
 * POST /api/suricata/rules/[sid]/disable - Disable rule
 * POST /api/suricata/rules/bulk/toggle - Bulk enable/disable rules
 * POST /api/suricata/rules/import - Import rules from file
 * GET /api/suricata/rules/export - Export rules in various formats
 * POST /api/suricata/rules/update - Update from external sources
 * GET /api/suricata/rules/sources/status - Get source status
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  SuricataRule,
  RuleFilter,
  RuleResultSet,
  RuleState,
  RuleAction,
  SignatureSource,
  RuleValidationStatus,
  RuleUpdateOptions,
  RuleUpdateResult,
  RuleSyncStatus,
  ExportFormat
} from '../../types/suricata.types';

// ============================================================================
// MOCK DATA FOR DEVELOPMENT
// ============================================================================

const mockRules: SuricataRule[] = [
  {
    id: 'rule-001',
    sid: 2013028,
    action: RuleAction.ALERT,
    protocol: 'tcp',
    source: { type: 'any', value: '$HOME_NET' },
    source_port: { type: 'any', value: 'any' },
    direction: '->',
    destination: { type: 'any', value: '$EXTERNAL_NET' },
    destination_port: { type: 'any', value: 'any' },
    options: [
      { type: 'msg', value: '"ET TROJAN C2 Beacon via Custom Header"' },
      { type: 'flow', value: 'established,to_server' },
      { type: 'content', value: '"X-Command"', nocase: true },
      { type: 'http_header', value: '' },
      { type: 'threshold', value: 'type limit,track by_src,count 1,seconds 60' },
      { type: 'classtype', value: 'trojan-activity' },
      { type: 'sid', value: '2013028' },
      { type: 'rev', value: '3' }
    ],
    raw: 'alert tcp $HOME_NET any -> $EXTERNAL_NET any (msg:"ET TROJAN C2 Beacon via Custom Header"; flow:established,to_server; content:"X-Command"; nocase; http_header; threshold:type limit,track by_src,count 1,seconds 60; classtype:trojan-activity; sid:2013028; rev:3;)',
    state: RuleState.ENABLED,
    message: 'ET TROJAN C2 Beacon via Custom Header',
    class_type: 'trojan-activity',
    priority: 1,
    metadata: {
      signature_severity: ['Critical'],
      attack_target: ['Any'],
      deployment: ['Datacenter'],
      created_at: ['2020/01/01']
    },
    source: SignatureSource.ETOPEN,
    created_at: '2020-01-01T00:00:00Z',
    updated_at: '2024-03-15T10:30:00Z',
    last_modified_by: 'et-rules-team',
    revision_history: [
      {
        version: 3,
        changed_at: '2024-03-15T10:30:00Z',
        changed_by: 'et-rules-team',
        change_description: 'Updated threshold to reduce false positives'
      }
    ],
    hit_count: 47,
    last_hit: '2026-07-25T10:15:32Z',
    false_positive_count: 2,
    enabled_sensors: ['sensor-algiers-01', 'sensor-oran-01', 'sensor-constantine-01'],
    validation_status: RuleValidationStatus.VALID
  },
  {
    id: 'rule-002',
    sid: 2020051,
    action: RuleAction.DROP,
    protocol: 'tcp',
    source: { type: 'any', value: '$EXTERNAL_NET' },
    source_port: { type: 'any', value: 'any' },
    direction: '->',
    destination: { type: 'any', value: '$HOME_NET' },
    destination_port: { type: 'single', value: '22' },
    options: [
      { type: 'msg', value: '"ET SCAN Brute Force Login Attempt"' },
      { type: 'flow', value: 'established,to_server' },
      { type: 'content', value: '"Authorization"', nocase: true },
      { type: 'threshold', value: 'type both,track by_src,count 5,seconds 60' },
      { type: 'classtype', value: 'attempted-admin' },
      { type: 'sid', value: '2020051' },
      { type: 'rev', value: '2' }
    ],
    raw: 'drop tcp $EXTERNAL_NET any -> $HOME_NET 22 (msg:"ET SCAN Brute Force Login Attempt"; flow:established,to_server; content:"Authorization"; nocase; threshold:type both,track by_src,count 5,seconds 60; classtype:attempted-admin; sid:2020051; rev:2;)',
    state: RuleState.ENABLED,
    message: 'ET SCAN Brute Force Login Attempt',
    class_type: 'attempted-admin',
    priority: 2,
    metadata: {
      signature_severity: ['Major'],
      attack_target: ['SSH Servers'],
      deployment: ['Perimeter']
    },
    source: SignatureSource.ETOPEN,
    created_at: '2020-06-15T00:00:00Z',
    updated_at: '2024-02-20T14:20:00Z',
    last_modified_by: 'soc-algiers-analyst',
    revision_history: [
      {
        version: 2,
        changed_at: '2024-02-20T14:20:00Z',
        changed_by: 'soc-algiers-analyst',
        change_description: 'Changed action from alert to drop for critical servers'
      }
    ],
    hit_count: 1523,
    last_hit: '2026-07-25T10:14:45Z',
    false_positive_count: 15,
    enabled_sensors: ['sensor-algiers-01', 'sensor-oran-01'],
    validation_status: RuleValidationStatus.VALID
  },
  {
    id: 'rule-003',
    sid: 2830125,
    action: RuleAction.ALERT,
    protocol: 'udp',
    source: { type: 'any', value: '$HOME_NET' },
    source_port: { type: 'any', value: 'any' },
    direction: '->',
    destination: { type: 'any', value: '$EXTERNAL_NET' },
    destination_port: { type: 'single', value: '53' },
    options: [
      { type: 'msg', value: '"ET DNS Suspicious Query - DGA Domain"' },
      { type: 'dns_query', value: '' },
      { type: 'pcre', value: '/^[a-z]{12,20}\\.[a-z]{2,3}$/i' },
      { type: 'classtype', value: 'bad-unknown' },
      { type: 'sid', value: '2830125' },
      { type: 'rev', value: '1' }
    ],
    raw: 'alert udp $HOME_NET any -> $EXTERNAL_NET 53 (msg:"ET DNS Suspicious Query - DGA Domain"; dns.query; pcre:/^[a-z]{12,20}\\.[a-z]{2,3}$/i; classtype:bad-unknown; sid:2830125; rev:1;)',
    state: RuleState.ENABLED,
    message: 'ET DNS Suspicious Query - DGA Domain',
    class_type: 'bad-unknown',
    priority: 2,
    metadata: {
      signature_severity: ['Major']
    },
    source: SignatureSource.CUSTOM,
    created_at: '2024-05-10T08:00:00Z',
    updated_at: '2024-05-10T08:00:00Z',
    last_modified_by: 'soc-threat-hunter',
    hit_count: 89,
    last_hit: '2026-07-25T10:13:22Z',
    false_positive_count: 5,
    enabled_sensors: ['sensor-algiers-01', 'sensor-oran-01', 'sensor-constantine-01', 'sensor-setif-01'],
    validation_status: RuleValidationStatus.VALID
  },
  {
    id: 'rule-004',
    sid: 2020420,
    action: RuleAction.ALERT,
    protocol: 'tcp',
    source: { type: 'any', value: '$EXTERNAL_NET' },
    source_port: { type: 'any', value: 'any' },
    direction: '->',
    destination: { type: 'any', value: '$HOME_NET' },
    destination_port: { type: 'single', value: '4444' },
    options: [
      { type: 'msg', value: '"ET TROJAN Metasploit Default Pattern Detected"' },
      { type: 'flow', value: 'established,to_server' },
      { type: 'content', value: '"|00 00 00 00|"' },
      { type: 'depth', value: '4' },
      { type: 'classtype', value: 'trojan-activity' },
      { type: 'sid', value: '2020420' },
      { type: 'rev', value: '5' }
    ],
    raw: 'alert tcp $EXTERNAL_NET any -> $HOME_NET 4444 (msg:"ET TROJAN Metasploit Default Pattern Detected"; flow:established,to_server; content:"|00 00 00 00|"; depth:4; classtype:trojan-activity; sid:2020420; rev:5;)',
    state: RuleState.ENABLED,
    message: 'ET TROJAN Metasploit Default Pattern Detected',
    class_type: 'trojan-activity',
    priority: 1,
    metadata: {
      signature_severity: ['Critical'],
      attack_target: ['Any']
    },
    source: SignatureSource.ETOPEN,
    created_at: '2019-11-20T00:00:00Z',
    updated_at: '2024-01-10T09:15:00Z',
    last_modified_by: 'et-rules-team',
    hit_count: 12,
    last_hit: '2026-07-25T10:12:18Z',
    false_positive_count: 0,
    enabled_sensors: ['sensor-algiers-01', 'sensor-oran-01', 'sensor-constantine-01', 'sensor-setif-01', 'sensor-blida-01'],
    validation_status: RuleValidationStatus.VALID
  },
  {
    id: 'rule-005',
    sid: 2221024,
    action: RuleAction.PASS,
    protocol: 'udp',
    source: { type: 'ip', value: '172.16.0.0/16' },
    source_port: { type: 'any', value: 'any' },
    direction: '->',
    destination: { type: 'any', value: 'any' },
    destination_port: { type: 'single', value: '53' },
    options: [
      { type: 'msg', value: '"ET POLICY DNS Query to .onion Domain (Internal Whitelist)"' },
      { type: 'dns_query', value: '' },
      { type: 'pcre', value: '/\\.onion$/i' },
      { type: 'classtype', value: 'policy-violation' },
      { type: 'sid', value: '2221024' },
      { type: 'rev', value: '1' }
    ],
    raw: 'pass udp 172.16.0.0/16 any -> any 53 (msg:"ET POLICY DNS Query to .onion Domain (Internal Whitelist)"; dns.query; pcre:/\\.onion$/i; classtype:policy-violation; sid:2221024; rev:1;)',
    state: RuleState.DISABLED,
    message: 'ET POLICY DNS Query to .onion Domain (Internal Whitelist)',
    class_type: 'policy-violation',
    priority: 3,
    metadata: {
      signature_severity: ['Minor']
    },
    source: SignatureSource.CUSTOM,
    created_at: '2024-06-01T11:45:00Z',
    updated_at: '2024-07-15T16:30:00Z',
    last_modified_by: 'soc-manager',
    revision_history: [
      {
        version: 2,
        changed_at: '2024-07-15T16:30:00Z',
        changed_by: 'soc-manager',
        change_description: 'Disabled due to legitimate research activity'
      }
    ],
    hit_count: 234,
    false_positive_count: 230,
    enabled_sensors: [],
    validation_status: RuleValidationStatus.VALID
  }
];

// ============================================================================
// RULE VALIDATION HELPER
// ============================================================================

/**
 * Validate Suricata rule syntax
 */
function validateRuleSyntax(ruleText: string): {
  status: RuleValidationStatus;
  errors: string[];
  warnings: string[];
  parsed?: Partial<SuricataRule>;
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Basic structure validation
  if (!ruleText) {
    return {
      status: RuleValidationStatus.INVALID_SYNTAX,
      errors: ['Rule text is empty'],
      warnings: []
    };
  }

  // Check for required components
  const validActions = ['alert', 'drop', 'reject', 'pass'];
  const protocols = ['tcp', 'udp', 'icmp', 'http', 'tls', 'smb', 'dns', 'ftp', 'ssh'];
  
  const parts = ruleText.match(/^(\w+)\s+(\w+)\s+.+\s+(->|<>)\s+.+/);
  
  if (!parts) {
    return {
      status: RuleValidationStatus.INVALID_SYNTAX,
      errors: ['Invalid rule format. Expected: action protocol ... direction ...'],
      warnings: []
    };
  }

  const [_, action, protocol] = parts;

  if (!validActions.includes(action)) {
    errors.push(`Invalid action: ${action}. Must be one of: ${validActions.join(', ')}`);
  }

  if (!protocols.includes(protocol.toLowerCase())) {
    warnings.push(`Unusual protocol: ${protocol}`);
  }

  // Check for SID (required)
  const sidMatch = ruleText.match(/sid\s*:\s*(\d+)/);
  if (!sidMatch) {
    errors.push('Missing required option: sid');
  } else {
    const sid = parseInt(sidMatch[1]);
    
    // Check reserved SID ranges
    if (sid >= 1 && sid <= 1000000) {
      warnings.push(`SID ${sid} is in Emerging Threats range. Custom rules should use SIDs > 1000000`);
    }

    if (sid >= 1000000 && sid <= 2000000) {
      warnings.push(`SID ${sid} is in reserved range`);
    }
  }

  // Check for REV (required)
  const revMatch = ruleText.match(/rev\s*:\s*(\d+)/);
  if (!revMatch) {
    errors.push('Missing required option: rev');
  }

  // Check for MSG (recommended)
  if (!ruleText.includes('msg:')) {
    warnings.push('Missing recommended option: msg');
  }

  // Check for proper parentheses
  const openParens = (ruleText.match(/\(/g) || []).length;
  const closeParens = (ruleText.match(/\)/g) || []).length;
  
  if (openParens !== closeParens) {
    errors.push(`Mismatched parentheses: ${openParens} opening, ${closeParens} closing`);
  }

  // Check for semicolon separators
  const hasContentBetweenOptions = /;\s*\w/.test(ruleText);
  if (!hasContentBetweenOptions && ruleText.includes('(')) {
    errors.push('Options must be separated by semicolons');
  }

  // Determine overall status
  let status: RuleValidationStatus;
  if (errors.length > 0) {
    status = RuleValidationStatus.INVALID_SYNTAX;
  } else if (warnings.length > 0) {
    status = RuleValidationStatus.VALID; // Valid but with warnings
  } else {
    status = RuleValidationStatus.VALID;
  }

  return { status, errors, warnings };
}

/**
 * Apply filters to rules
 */
function applyFilters(rules: SuricataRule[], filter: Partial<RuleFilter>): SuricataRule[] {
  let filtered = [...rules];

  if (filter.state) {
    filtered = filtered.filter(r => r.state === filter.state);
  }

  if (filter.action) {
    filtered = filtered.filter(r => r.action === filter.action);
  }

  if (filter.source) {
    filtered = filtered.filter(r => r.source === filter.source);
  }

  if (filter.category_pattern) {
    const pattern = new RegExp(filter.category_pattern, 'i');
    filtered = filtered.filter(r => pattern.test(r.class_type || ''));
  }

  if (filter.signature_pattern) {
    const pattern = new RegExp(filter.signature_pattern, 'i');
    filtered = filtered.filter(r => pattern.test(r.message));
  }

  if (filter.sid_range) {
    filtered = filtered.filter(r => 
      r.sid >= filter.sid_range!.min && r.sid <= filter.sid_range!.max
    );
  }

  if (filter.is_custom !== undefined) {
    filtered = filtered.filter(r => 
      filter.is_custom ? r.source === SignatureSource.CUSTOM : r.source !== SignatureSource.CUSTOM
    );
  }

  return filtered;
}

/**
 * Sort rules
 */
function sortRules(
  rules: SuricataRule[], 
  sortBy: string = 'sid', 
  sortOrder: 'asc' | 'desc' = 'asc'
): SuricataRule[] {
  return [...rules].sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case 'sid':
        comparison = a.sid - b.sid;
        break;
      case 'hit_count':
        comparison = a.hit_count - b.hit_count;
        break;
      case 'updated_at':
        comparison = new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
        break;
      case 'name':
        comparison = a.message.localeCompare(b.message);
        break;
      default:
        comparison = 0;
    }

    return sortOrder === 'desc' ? -comparison : comparison;
  });
}

// ============================================================================
// API ROUTE HANDLERS
// ============================================================================

/**
 * GET /api/suricata/rules
 * List and search rules with filtering and pagination
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const filter: RuleFilter = {
      state: searchParams.get('state') as RuleState | undefined,
      action: searchParams.get('action') as RuleAction | undefined,
      source: searchParams.get('source') as SignatureSource | undefined,
      category_pattern: searchParams.get('category_pattern') || undefined,
      signature_pattern: searchParams.get('signature_pattern') || undefined,
      is_custom: searchParams.get('is_custom') === 'true' ? true :
                  searchParams.get('is_custom') === 'false' ? false : undefined,
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1,
      page_size: searchParams.get('page_size') ? parseInt(searchParams.get('page_size')!) : 20,
      sort_by: searchParams.get('sort_by') as any || 'sid',
      sort_order: (searchParams.get('sort_order') as 'asc' | 'desc') || 'asc'
    };

    // Parse SID range if provided
    const sidMin = searchParams.get('sid_min');
    const sidMax = searchParams.get('sid_max');
    if (sidMin && sidMax) {
      filter.sid_range = { min: parseInt(sidMin), max: parseInt(sidMax) };
    }

    // Apply filters
    let filteredRules = applyFilters(mockRules, filter);

    // Sort
    filteredRules = sortRules(filteredRules, filter.sort_by, filter.sort_order);

    // Paginate
    const total = filteredRules.length;
    const totalPages = Math.ceil(total / filter.page_size!);
    const startIndex = (filter.page! - 1) * filter.page_size!;
    const paginatedRules = filteredRules.slice(startIndex, startIndex + filter.page_size!);

    const result: RuleResultSet = {
      rules: paginatedRules,
      total,
      page: filter.page!,
      page_size: filter.page_size!,
      total_pages: totalPages,
      query_time_ms: 3
    };

    return NextResponse.json({
      success: true,
      data: result,
      meta: {
        execution_time_ms: 3,
        cached: false
      }
    });

  } catch (error) {
    console.error('[Suricata Rules API] GET Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error occurred',
          timestamp: new Date().toISOString()
        }
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/suricata/rules
 * Create new custom rule or perform operations
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'create': {
        // Create new custom rule
        const { rule } = body;
        
        // Validate first
        const validation = validateRuleSyntax(rule.raw);
        if (validation.status !== RuleValidationStatus.VALID) {
          return NextResponse.json(
            {
              success: false,
              error: {
                code: 'RULE_VALIDATION_ERROR',
                message: 'Rule validation failed',
                details: validation.errors,
                timestamp: new Date().toISOString()
              }
            },
            { status: 400 }
          );
        }

        // Create rule object
        const newRule: SuricataRule = {
          id: `rule-${Date.now()}`,
          sid: rule.sid || 2000001 + mockRules.length,
          action: rule.action || RuleAction.ALERT,
          protocol: rule.protocol || 'tcp',
          source: rule.source || { type: 'any', value: 'any' },
          source_port: rule.source_port || { type: 'any', value: 'any' },
          direction: rule.direction || '->',
          destination: rule.destination || { type: 'any', value: 'any' },
          destination_port: rule.destination_port || { type: 'any', value: 'any' },
          options: rule.options || [],
          raw: rule.raw,
          state: RuleState.ENABLED,
          message: rule.message || '',
          class_type: rule.class_type,
          priority: rule.priority || 3,
          metadata: rule.metadata || {},
          source: SignatureSource.CUSTOM,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          last_modified_by: body.user_id || 'analyst',
          revision_history: [{
            version: 1,
            changed_at: new Date().toISOString(),
            changed_by: body.user_id || 'analyst',
            change_description: 'Initial rule creation'
          }],
          hit_count: 0,
          false_positive_count: 0,
          enabled_sensors: body.sensor_ids || ['all'],
          validation_status: RuleValidationStatus.VALID
        };

        return NextResponse.json({
          success: true,
          data: newRule,
          meta: {
            execution_time_ms: 5,
            warnings: validation.warnings.length > 0 ? validation.warnings : undefined
          }
        });
      }

      case 'validate': {
        // Validate rule syntax
        const { rule } = body;
        const result = validateRuleSyntax(rule);
        
        return NextResponse.json({
          success: result.status === RuleValidationStatus.VALID,
          data: result,
          meta: { execution_time_ms: 1 }
        });
      }

      case 'test': {
        // Test rule against sample (mock)
        const { rule, pcap_sample } = body;
        const validation = validateRuleSyntax(rule);
        
        return NextResponse.json({
          success: true,
          data: {
            matched: Math.random() > 0.7, // Random match for demo
            match_count: Math.floor(Math.random() * 10),
            sample_alerts: [],
            performance_impact: {
              cpu_overhead_percent: Math.random() * 2,
              memory_bytes: Math.floor(Math.random() * 10000)
            }
          },
          meta: { execution_time_ms: 150 }
        });
      }

      case 'enable': {
        // Enable rule(s)
        const { sids, sensor_ids } = body;
        return NextResponse.json({
          success: true,
          data: {
            sids: sids || [body.sid],
            enabled: true,
            enabled_at: new Date().toISOString(),
            sensor_ids: sensor_ids || ['all']
          }
        });
      }

      case 'disable': {
        // Disable rule(s)
        const { sids, reason, sensor_ids } = body;
        return NextResponse.json({
          success: true,
          data: {
            sids: sids || [body.sid],
            disabled: true,
            reason: reason || 'Manual disable',
            disabled_at: new Date().toISOString(),
            sensor_ids: sensor_ids || ['all']
          }
        });
      }

      case 'bulk-toggle': {
        // Bulk enable/disable
        const { sids, state, reason } = body;
        return NextResponse.json({
          success: true,
          data: {
            succeeded: sids.length,
            failed: 0,
            errors: [],
            operation_id: `op-${Date.now()}`
          }
        });
      }

      case 'update-sources': {
        // Update rules from external sources
        const options: RuleUpdateOptions = body.options || {};
        
        const result: RuleUpdateResult = {
          success: true,
          source: options.source || SignatureSource.ETOPEN,
          previous_version: '20240715',
          new_version: '20240725',
          rules_added: 127,
          rules_updated: 43,
          rules_removed: 12,
          errors: [],
          warnings: ['Some rules require manual review'],
          timestamp: new Date().toISOString(),
          duration_ms: 45000
        };

        return NextResponse.json({ success: true, data: result });
      }

      default:
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'INVALID_ACTION',
              message: `Unknown action: ${action}`,
              timestamp: new Date().toISOString()
            }
          },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('[Suricata Rules API] POST Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error occurred',
          timestamp: new Date().toISOString()
        }
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/suricata/rules/[sid]
 * Update existing rule
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ sid: string }> }
) ) {
  try {
    const { sid } = await params;
    const body = await request.json();
    const ruleSid = parseInt(sid);

    // Find existing rule
    const existingRule = mockRules.find(r => r.sid === ruleSid);
    if (!existingRule) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: `Rule with SID ${ruleSid} not found`,
            timestamp: new Date().toISOString()
          }
        },
        { status: 404 }
      );
    }

    // If updating raw rule, re-validate
    if (body.raw) {
      const validation = validateRuleSyntax(body.raw);
      if (validation.status !== RuleValidationStatus.VALID) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'RULE_VALIDATION_ERROR',
              message: 'Updated rule failed validation',
              details: validation.errors,
              timestamp: new Date().toISOString()
            }
          },
          { status: 400 }
        );
      }
    }

    // Build updated rule
    const updatedRule: SuricataRule = {
      ...existingRule,
      ...body,
      sid: ruleSid, // Prevent SID changes
      id: existingRule.id, // Prevent ID changes
      updated_at: new Date().toISOString(),
      last_modified_by: body.user_id || 'analyst',
      revision_history: [
        ...(existingRule.revision_history || []),
        {
          version: (existingRule.revision_history?.length || 0) + 1,
          changed_at: new Date().toISOString(),
          changed_by: body.user_id || 'analyst',
          change_description: body.change_description || 'Rule update'
        }
      ]
    };

    return NextResponse.json({
      success: true,
      data: updatedRule,
      meta: { execution_time_ms: 4 }
    });

  } catch (error) {
    console.error('[Suricata Rules API] PUT Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error occurred',
          timestamp: new Date().toISOString()
        }
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/suricata/rules/[sid]
 * Delete custom rule only (not built-in rules)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ sid: string }> }
) ) {
  try {
    const { sid } = await params;
    const ruleSid = parseInt(sid);

    // Find existing rule
    const existingRule = mockRules.find(r => r.sid === ruleSid);
    if (!existingRule) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: `Rule with SID ${ruleSid} not found`,
            timestamp: new Date().toISOString()
          }
        },
        { status: 404 }
      );
    }

    // Only allow deletion of custom rules
    if (existingRule.source !== SignatureSource.CUSTOM) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Cannot delete non-custom rules. Use disable instead.',
            timestamp: new Date().toISOString()
          }
        },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        deleted_sid: ruleSid,
        deleted_message: existingRule.message,
        deleted_at: new Date().toISOString(),
        deleted_by: 'analyst'
      }
    });

  } catch (error) {
    console.error('[Suricata Rules API] DELETE Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error occurred',
          timestamp: new Date().toISOString()
        }
      },
      { status: 500 }
    );
  }
}
