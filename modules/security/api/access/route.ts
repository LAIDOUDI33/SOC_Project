/**
 * Access Control API Route
 * National SOC Platform for Algeria (2026-2030)
 * 
 * Provides comprehensive access control management:
 * - Access policy CRUD operations
 * - Firewall rule management
 * - IP whitelist/blacklist management
 * - Role-based access control (RBAC)
 * - Network segmentation policies
 * 
 * @route GET /api/security/access/policies - List access policies
 * @route POST /api/security/access/policies - Create new policy
 * @route PUT /api/security/access/policies/:id - Update policy
 * @route DELETE /api/security/access/policies/:id - Delete policy
 * @route GET /api/security/access/firewall-rules - Get firewall rules
 * @route POST /api/security/access/ip-blocklist - Add IP to blocklist
 * @route POST /api/security/access/ip-whitelist - Add IP to whitelist
 * @route GET /api/security/access/roles - List roles and permissions
 * 
 * @module security/api/access
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  generateRandomToken,
  checkIPReputation,
  shouldBlockIP,
} from '../../lib/security-lib';
import type {
  FirewallRule,
  FirewallRuleGroup,
  FirewallAction,
  FirewallDirection,
  FirewallProtocol,
  FirewallEndpoint,
  IPListEntry,
  IPListType,
  ThreatLevel,
  UserRole,
  Permission,
  ResourceType,
  PermissionScope,
} from '../../types/security.types';

// ============================================================================
// Mock Data Stores
// ============================================================================

/** In-memory policy store */
let accessPolicies: Array<{
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  type: 'rbac' | 'abac' | 'network' | 'api';
  subjects: string[]; // User IDs, roles, or patterns
  resources: string[];
  actions: string[];
  effect: 'allow' | 'deny';
  conditions?: Record<string, unknown>;
  priority: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}> = [
  {
    id: 'policy_001',
    name: 'Admin Full Access',
    description: 'Full administrative access to all SOC platform features',
    enabled: true,
    type: 'rbac',
    subjects: ['super_admin', 'security_admin'],
    resources: ['*'],
    actions: ['*'],
    effect: 'allow',
    priority: 100,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
    createdBy: 'system',
  },
  {
    id: 'policy_002',
    name: 'Analyst Read-Only Dashboard',
    description: 'Read-only access to dashboards and reports for analysts',
    enabled: true,
    type: 'rbac',
    subjects: ['analyst', 'analyst_readonly'],
    resources: ['dashboard', 'alerts', 'reports'],
    actions: ['read'],
    effect: 'allow',
    priority: 50,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-15T00:00:00Z'),
    createdBy: 'admin_001',
  },
  {
    id: 'policy_003',
    name: 'API Rate Limiting Policy',
    description: 'Rate limiting rules for external API consumers',
    enabled: true,
    type: 'api',
    subjects: ['*'],
    resources: ['/api/*'],
    actions: ['GET', 'POST', 'PUT', 'DELETE'],
    effect: 'allow',
    conditions: {
      rateLimit: { requestsPerMinute: 100, burstLimit: 20 },
      apiKeyRequired: true,
    },
    priority: 75,
    createdAt: new Date('2024-02-01T00:00:00Z'),
    updatedAt: new Date('2024-02-15T00:00:00Z'),
    createdBy: 'admin_001',
  },
  {
    id: 'policy_004',
    name: 'Block Suspicious IPs',
    description: 'Automatically block IPs with high threat scores',
    enabled: true,
    type: 'network',
    subjects: [],
    resources: ['*'],
    actions: ['*'],
    effect: 'deny',
    conditions: {
      ipReputationScore: { min: 70, action: 'block' },
      geoBlockedCountries: ['XX'], // Would be actual country codes
    },
    priority: 200,
    createdAt: new Date('2024-03-01T00:00:00Z'),
    updatedAt: new Date('2024-03-10T00:00:00Z'),
    createdBy: 'security_admin',
  },
];

/** In-memory firewall rule store */
let firewallRules: FirewallRule[] = [
  {
    id: 'fw_001',
    name: 'Allow HTTPS from Internet',
    description: 'Allow incoming HTTPS traffic to web servers',
    enabled: true,
    priority: 10,
    action: 'allow',
    direction: 'inbound',
    source: { type: 'any', value: '0.0.0.0/0' },
    destination: { type: 'cidr', value: '10.0.1.0/24' },
    protocol: 'tcp',
    portRange: { start: 443, end: 443 },
    logging: true,
    logPrefix: 'HTTPS_IN',
    createdAt: new Date('2024-01-01T00:00:00Z'),
    createdBy: 'netadmin_001',
    updatedAt: new Date('2024-01-01T00:00:00Z'),
    updatedBy: 'netadmin_001',
    metadata: {},
  },
  {
    id: 'fw_002',
    name: 'Deny All Incoming from Blocked Range',
    description: 'Block all traffic from known malicious IP ranges',
    enabled: true,
    priority: 5,
    action: 'deny',
    direction: 'inbound',
    source: { type: 'cidr', value: '45.33.32.0/24' },
    destination: { type: 'any', value: '*' },
    protocol: 'any',
    logging: true,
    logPrefix: 'BLOCKED_RANGE',
    createdAt: new Date('2024-02-15T00:00:00Z'),
    createdBy: 'soc_analyst',
    updatedAt: new Date('2024-02-15T00:00:00Z'),
    updatedBy: 'soc_analyst',
    metadata: { reason: 'Known botnet C2 infrastructure' },
  },
  {
    id: 'fw_003',
    name: 'Allow Internal Communication',
    description: 'Allow unrestricted internal network communication',
    enabled: true,
    priority: 20,
    action: 'allow',
    direction: 'both',
    source: { type: 'cidr', value: '10.0.0.0/8' },
    destination: { type: 'cidr', value: '10.0.0.0/8' },
    protocol: 'any',
    logging: false,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    createdBy: 'system',
    updatedAt: new Date('2024-01-01T00:00:00Z'),
    updatedBy: 'system',
    metadata: { category: 'internal-trust' },
  },
  {
    id: 'fw_004',
    name: 'Rate Limit SSH Access',
    description: 'Limit and log SSH connection attempts',
    enabled: true,
    priority: 15,
    action: 'rate_limit',
    direction: 'inbound',
    source: { type: 'any', value: '*' },
    destination: { type: 'cidr', value: '10.0.0.0/24' },
    protocol: 'tcp',
    portRange: { start: 22, end: 22 },
    logging: true,
    logPrefix: 'SSH_LIMIT',
    createdAt: new Date('2024-03-01T00:00:00Z'),
    createdBy: 'hardening_team',
    updatedAt: new Date('2024-03-05T00:00:00Z'),
    updatedBy: 'hardening_team',
    metadata: { maxConnections: 5, windowSeconds: 60 },
  },
  {
    id: 'fw_005',
    name: 'Block Outbound to Tor Exit Nodes',
    description: 'Prevent data exfiltration via Tor network',
    enabled: true,
    priority: 25,
    action: 'deny',
    direction: 'outbound',
    source: { type: 'cidr', value: '10.0.0.0/8' },
    destination: { type: 'group', value: 'tor_exit_nodes' },
    protocol: 'tcp',
    portRange: { start: 443, end: 443 },
    logging: true,
    logPrefix: 'TOR_BLOCK',
    createdAt: new Date('2024-04-01T00:00:00Z'),
    createdBy: 'security_team',
    updatedAt: new Date('2024-04-01T00:00:00Z'),
    updatedBy: 'security_team',
    metadata: { dlpEnabled: true },
  },
];

/** In-memory IP list stores */
const ipBlacklist: IPListEntry[] = [
  {
    id: 'bl_001',
    listType: 'blacklist',
    address: '45.33.32.156',
    label: 'Known Scanner IP',
    description: 'Automated vulnerability scanner detected',
    addedBy: 'ids_sensor',
    addedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    permanent: false,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    reason: 'Port scanning detected on multiple services',
    threatLevel: 'malicious',
    threatIntelSource: 'Internal IDS Alerts',
    tags: ['scanner', 'automated'],
    metadata: { firstSeen: '2024-05-01', eventCount: 1547 },
  },
  {
    id: 'bl_002',
    listType: 'blacklist',
    address: '185.220.101.0/24',
    label: 'Tor Exit Node Range',
    description: 'Tor exit node IP range blocked per policy',
    addedBy: 'threat_intel_feed',
    addedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
    permanent: true,
    reason: 'Tor exit nodes pose data exfiltration risk',
    threatLevel: 'suspicious',
    threatIntelSource: 'Tor Project Data',
    tags: ['tor', 'anonymization', 'exit-node'],
    metadata: { feedName: 'tor-exit-list', updateFrequency: 'hourly' },
  },
  {
    id: 'bl_003',
    listType: 'blacklist',
    address: '198.51.100.23',
    label: 'SQL Injection Attacker',
    description: 'IP associated with SQL injection attempts',
    addedBy: 'waf_logs',
    addedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    permanent: false,
    expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    reason: 'Multiple SQL injection attack patterns detected',
    threatLevel: 'malicious',
    threatIntelSource: 'WAF Logs',
    tags: ['web-attack', 'sql-injection', 'active-threat'],
    metadata: { attackCount: 47, lastAttack: new Date().toISOString(), payloads: ["' OR '1'='1", "UNION SELECT"] },
  },
];

const ipWhitelist: IPListEntry[] = [
  {
    id: 'wl_001',
    listType: 'whitelist',
    address: '10.0.1.0/24',
    label: 'Internal Operations Network',
    description: 'SOC operations team network segment',
    addedBy: 'network_admin',
    addedAt: new Date('2024-01-01T00:00:00Z'),
    permanent: true,
    reason: 'Trusted internal network for SOC staff',
    tags: ['internal', 'operations', 'trusted'],
    metadata: { location: 'Building A, Floor 2', vlan: 'VLAN100' },
  },
  {
    id: 'wl_002',
    listType: 'whitelist',
    address: '192.168.100.50',
    label: 'Security Tools Server',
    description: 'Server running authorized security scanning tools',
    addedBy: 'security_admin',
    addedAt: new Date('2024-02-15T00:00:00Z'),
    permanent: true,
    reason: 'Authorized vulnerability scanner',
    tags: ['scanner', 'authorized', 'security-tools'],
    metadata: { hostname: 'sec-scanner-01.internal', tool: 'Nessus Pro' },
  },
  {
    id: 'wl_003',
    listType: 'whitelist',
    address: '41.200.0.0/16',
    label: 'Algeria Telecom ISP Range',
    description: 'Trusted national ISP range for admin VPN access',
    addedBy: 'network_admin',
    addedAt: new Date('2024-03-01T00:00:00Z'),
    permanent: false,
    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    reason: 'VPN endpoint access from national ISP',
    tags: ['vpn', 'isp', 'national'],
    metadata: { ispName: 'Algerie Telecom', country: 'DZ' },
  },
];

/** Role definitions with permissions */
const roleDefinitions: Array<{
  role: UserRole;
  displayName: string;
  description: string;
  permissions: Permission[];
  userCount: number;
}> = [
  {
    role: 'super_admin',
    displayName: 'Super Administrator',
    description: 'Full system access including user management and system configuration',
    permissions: Object.values(ResourceType).flatMap(resource => [
      { resource, scope: 'read' as PermissionScope },
      { resource, scope: 'write' as PermissionScope },
      { resource, scope: 'delete' as PermissionScope },
      { resource, scope: 'admin' as PermissionScope },
      { resource, scope: 'execute' as PermissionScope },
      { resource, scope: 'approve' as PermissionScope },
    ]),
    userCount: 2,
  },
  {
    role: 'security_admin',
    displayName: 'Security Administrator',
    description: 'Manages security configurations, policies, and monitoring',
    permissions: [
      ...['alerts', 'incidents', 'cases', 'threats', 'ioc', 'audit', 'reports', 'config', 'security_settings'].map(r => ({
        resource: r as ResourceType,
        scope: 'read' as PermissionScope,
      })),
      ...['config', 'security_settings', 'audit'].map(r => ({
        resource: r as ResourceType,
        scope: 'write' as PermissionScope,
      })),
      ...['config', 'security_settings'].map(r => ({
        resource: r as ResourceType,
        scope: 'admin' as PermissionScope,
      })),
    ],
    userCount: 5,
  },
  {
    role: 'analyst',
    displayName: 'Security Analyst',
    description: 'Core analyst role for incident investigation and threat analysis',
    permissions: [
      ...['dashboard', 'alerts', 'incidents', 'cases', 'threats', 'ioc', 'reports'].map(r => ({
        resource: r as ResourceType,
        scope: 'read' as PermissionScope,
      })),
      ...['alerts', 'incidents', 'cases', 'ioc'].map(r => ({
        resource: r as ResourceType,
        scope: 'write' as PermissionScope,
      })),
      { resource: 'api', scope: 'execute' as PermissionScope },
    ],
    userCount: 12,
  },
  {
    role: 'analyst_readonly',
    displayName: 'Read-Only Analyst',
    description: 'View-only access for junior analysts and trainees',
    permissions: [
      ...['dashboard', 'alerts', 'incidents', 'cases', 'threats', 'reports'].map(r => ({
        resource: r as ResourceType,
        scope: 'read' as PermissionScope,
      })),
    ],
    userCount: 8,
  },
  {
    role: 'operator',
    displayName: 'SOC Operator',
    description: 'First responder role for alert triage and escalation',
    permissions: [
      ...['dashboard', 'alerts'].map(r => ({
        resource: r as ResourceType,
        scope: 'read' as PermissionScope,
      })),
      { resource: 'alerts', scope: 'write' as PermissionScope },
      { resource: 'api', scope: 'execute' as PermissionScope },
    ],
    userCount: 6,
  },
  {
    role: 'auditor',
    displayName: 'Security Auditor',
    description: 'Read-only audit and compliance review access',
    permissions: [
      ...['dashboard', 'audit', 'reports', 'compliance'].map(r => ({
        resource: r as ResourceType,
        scope: 'read' as PermissionScope,
      })),
    ],
    userCount: 3,
  },
  {
    role: 'api_service',
    displayName: 'API Service Account',
    description: 'Service account for automated API integrations',
    permissions: [
      { resource: 'api', scope: 'execute' as PermissionScope },
      { resource: 'alerts', scope: 'read' as PermissionScope },
      { resource: 'alerts', scope: 'write' as PermissionScope },
    ],
    userCount: 4,
  },
];

// ============================================================================
// API Handlers
// ============================================================================

/**
 * GET /api/security/access
 * Main handler for access control queries
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get('action') || 'policies';

  try {
    switch (action) {
      case 'policies':
        return getPoliciesHandler(searchParams);
      case 'firewall-rules':
        return getFirewallRulesHandler(searchParams);
      case 'ip-blocklist':
        return getIPListHandler('blacklist', searchParams);
      case 'ip-whitelist':
        return getIPListHandler('whitelist', searchParams);
      case 'roles':
        return getRolesHandler();
      case 'summary':
        return getAccessSummaryHandler();
      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Access Control GET Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve access control data',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/security/access
 * Handler for creating new access control entries
 */
export async function POST(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get('action');

  try {
    switch (action) {
      case 'policies':
        return createPolicyHandler(request);
      case 'ip-blocklist':
        return addIPToListHandler(request, 'blacklist');
      case 'ip-whitelist':
        return addIPToListHandler(request, 'whitelist');
      case 'firewall-rules':
        return createFirewallRuleHandler(request);
      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Access Control POST Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create access control entry',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/security/access
 * Handler for updating existing entries
 */
export async function PUT(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get('action');

  try {
    switch (action) {
      case 'policies':
        return updatePolicyHandler(request);
      case 'firewall-rules':
        return updateFirewallRuleHandler(request);
      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Access Control PUT Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update access control entry',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/security/access
 * Handler for deleting entries
 */
export async function DELETE(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get('action');
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json(
      { success: false, error: 'ID parameter required' },
      { status: 400 }
    );
  }

  try {
    switch (action) {
      case 'policies':
        return deletePolicyHandler(id);
      case 'firewall-rules':
        return deleteFirewallRuleHandler(id);
      case 'ip-blocklist':
        return deleteFromIPListHandler(id, 'blacklist');
      case 'ip-whitelist':
        return deleteFromIPListHandler(id, 'whitelist');
      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Access Control DELETE Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete entry',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// Policy Handlers
// ============================================================================

async function getPoliciesHandler(params: URLSearchParams): Promise<NextResponse> {
  const type = params.get('type');
  const enabled = params.get('enabled');
  
  let filtered = [...accessPolicies];
  
  if (type) {
    filtered = filtered.filter(p => p.type === type);
  }
  
  if (enabled !== null) {
    const isEnabled = enabled === 'true';
    filtered = filtered.filter(p => p.enabled === isEnabled);
  }

  return NextResponse.json({
    success: true,
    data: {
      policies: filtered,
      totalCount: filtered.length,
      types: ['rbac', 'abac', 'network', 'api'],
    },
  });
}

async function createPolicyHandler(request: NextRequest): Promise<NextResponse> {
  const body = await request.json();
  
  const newPolicy = {
    id: `policy_${generateRandomToken(8)}`,
    name: body.name,
    description: body.description,
    enabled: body.enabled !== undefined ? body.enabled : true,
    type: body.type || 'rbac',
    subjects: body.subjects || [],
    resources: body.resources || [],
    actions: body.actions || [],
    effect: body.effect || 'allow',
    conditions: body.conditions,
    priority: body.priority || 50,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: body.createdBy || 'unknown',
  };

  // Validate required fields
  if (!newPolicy.name) {
    return NextResponse.json(
      { success: false, error: 'Policy name is required' },
      { status: 400 }
    );
  }

  accessPolicies.push(newPolicy);

  return NextResponse.json({
    success: true,
    message: 'Policy created successfully',
    data: newPolicy,
  });
}

async function updatePolicyHandler(request: NextRequest): Promise<NextResponse> {
  const body = await request.json();
  const { id, ...updates } = body;

  const index = accessPolicies.findIndex(p => p.id === id);
  if (index === -1) {
    return NextResponse.json(
      { success: false, error: 'Policy not found' },
      { status: 404 }
    );
  }

  accessPolicies[index] = {
    ...accessPolicies[index],
    ...updates,
    updatedAt: new Date(),
  };

  return NextResponse.json({
    success: true,
    message: 'Policy updated successfully',
    data: accessPolicies[index],
  });
}

async function deletePolicyHandler(id: string): Promise<NextResponse> {
  const index = accessPolicies.findIndex(p => p.id === id);
  if (index === -1) {
    return NextResponse.json(
      { success: false, error: 'Policy not found' },
      { status: 404 }
    );
  }

  const deleted = accessPolicies.splice(index, 1)[0];

  return NextResponse.json({
    success: true,
    message: 'Policy deleted successfully',
    data: deleted,
  });
}

// ============================================================================
// Firewall Rule Handlers
// ============================================================================

async function getFirewallRulesHandler(params: URLSearchParams): Promise<NextResponse> {
  const direction = params.get('direction') as FirewallDirection | null;
  const action = params.get('action') as FirewallAction | null;
  const enabled = params.get('enabled');

  let filtered = [...firewallRules];
  
  if (direction) {
    filtered = filtered.filter(r => r.direction === direction);
  }
  
  if (action) {
    filtered = filtered.filter(r => r.action === action);
  }
  
  if (enabled !== null) {
    const isEnabled = enabled === 'true';
    filtered = filtered.filter(r => r.enabled === isEnabled);
  }

  // Group by rule group
  const groups: FirewallRuleGroup[] = [
    {
      id: 'group_inbound',
      name: 'Inbound Rules',
      description: 'Rules controlling incoming traffic',
      rules: filtered.filter(r => r.direction === 'inbound').sort((a, b) => a.priority - b.priority),
      defaultAction: 'deny',
      applyOrder: 'priority',
      enabled: true,
    },
    {
      id: 'group_outbound',
      name: 'Outbound Rules',
      description: 'Rules controlling outgoing traffic',
      rules: filtered.filter(r => r.direction === 'outbound').sort((a, b) => a.priority - b.priority),
      defaultAction: 'allow',
      applyOrder: 'priority',
      enabled: true,
    },
  ];

  return NextResponse.json({
    success: true,
    data: {
      rules: filtered.sort((a, b) => a.priority - b.priority),
      groups,
      statistics: {
        totalRules: firewallRules.length,
        enabledRules: firewallRules.filter(r => r.enabled).length,
        allowRules: firewallRules.filter(r => r.action === 'allow').length,
        denyRules: firewallRules.filter(r => r.action === 'deny').length,
        rateLimitRules: firewallRules.filter(r => r.action === 'rate_limit').length,
      },
    },
  });
}

async function createFirewallRuleHandler(request: NextRequest): Promise<NextResponse> {
  const body = await request.json();

  const newRule: FirewallRule = {
    id: `fw_${generateRandomToken(8)}`,
    name: body.name,
    description: body.description,
    enabled: body.enabled !== undefined ? body.enabled : true,
    priority: body.priority || 50,
    action: body.action || 'allow',
    direction: body.direction || 'inbound',
    source: body.source,
    destination: body.destination,
    protocol: body.protocol || 'tcp',
    portRange: body.portRange,
    logging: body.logging ?? true,
    logPrefix: body.logPrefix,
    createdAt: new Date(),
    createdBy: body.createdBy || 'unknown',
    updatedAt: new Date(),
    updatedBy: body.createdBy || 'unknown',
    metadata: body.metadata || {},
  };

  // Validate required fields
  if (!newRule.name || !newRule.source || !newRule.destination) {
    return NextResponse.json(
      { success: false, error: 'Missing required fields: name, source, destination' },
      { status: 400 }
    );
  }

  firewallRules.push(newRule);

  return NextResponse.json({
    success: true,
    message: 'Firewall rule created successfully',
    data: newRule,
    warnings: [
      'Firewall rules take effect immediately',
      'Ensure rule ordering is correct for intended behavior',
    ],
  });
}

async function updateFirewallRuleHandler(request: NextRequest): Promise<NextResponse> {
  const body = await request.json();
  const { id, ...updates } = body;

  const index = firewallRules.findIndex(r => r.id === id);
  if (index === -1) {
    return NextResponse.json(
      { success: false, error: 'Firewall rule not found' },
      { status: 404 }
    );
  }

  firewallRules[index] = {
    ...firewallRules[index],
    ...updates,
    updatedAt: new Date(),
    updatedBy: updates.updatedBy || 'unknown',
  };

  return NextResponse.json({
    success: true,
    message: 'Firewall rule updated successfully',
    data: firewallRules[index],
  });
}

async function deleteFirewallRuleHandler(id: string): Promise<NextResponse> {
  const index = firewallRules.findIndex(r => r.id === id);
  if (index === -1) {
    return NextResponse.json(
      { success: false, error: 'Firewall rule not found' },
      { status: 404 }
    );
  }

  const deleted = firewallRules.splice(index, 1)[0];

  return NextResponse.json({
    success: true,
    message: 'Firewall rule deleted successfully',
    data: deleted,
  });
}

// ============================================================================
// IP List Handlers
// ============================================================================

async function getIPListHandler(listType: IPListType, params: URLSearchParams): Promise<NextResponse> {
  const list = listType === 'blacklist' ? ipBlacklist : ipWhitelist;
  const search = params.get('search');
  const threatLevel = params.get('threatLevel') as ThreatLevel | null;

  let filtered = [...list];

  if (search) {
    filtered = filtered.filter(entry =>
      entry.address.includes(search) ||
      entry.label.toLowerCase().includes(search.toLowerCase()) ||
      entry.tags.some(t => t.toLowerCase().includes(search.toLowerCase()))
    );
  }

  if (threatLevel) {
    filtered = filtered.filter(entry => entry.threatLevel === threatLevel);
  }

  return NextResponse.json({
    success: true,
    data: {
      entries: filtered,
      totalCount: filtered.length,
      listType,
      statistics: {
        totalEntries: list.length,
        permanentEntries: list.filter(e => e.permanent).length,
        expiringEntries: list.filter(e => e.expiresAt && !e.permanent).length,
        expiredEntries: list.filter(e => e.expiresAt && new Date(e.expiresAt) < new Date()).length,
      },
    },
  });
}

async function addIPToListHandler(request: NextRequest, listType: IPListType): Promise<NextResponse> {
  const body = await request.json();
  const list = listType === 'blacklist' ? ipBlacklist : ipWhitelist;

  // Check if IP already exists
  const exists = list.find(e => e.address === body.address);
  if (exists) {
    return NextResponse.json(
      { success: false, error: 'IP address already in list' },
      { status: 409 }
    );
  }

  // Check IP reputation for blacklist additions
  let reputation = null;
  if (listType === 'blacklist') {
    reputation = await checkIPReputation(body.address);
  }

  const newEntry: IPListEntry = {
    id: `${listType.charAt(0)}l_${generateRandomToken(8)}`,
    listType,
    address: body.address,
    label: body.label || body.address,
    description: body.description,
    addedBy: body.addedBy || 'api_user',
    addedAt: new Date(),
    expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
    permanent: body.permanent ?? false,
    reason: body.reason || 'Manual addition',
    threatLevel: body.threatLevel || (listType === 'blacklist' ? 'malicious' : 'benign'),
    threatIntelSource: body.threatIntelSource,
    tags: body.tags || [],
    metadata: {
      ...body.metadata,
      reputation: reputation ? {
        score: reputation.score,
        confidence: reputation.confidence,
        categories: reputation.category,
      } : undefined,
    },
  };

  list.push(newEntry);

  return NextResponse.json({
    success: true,
    message: `IP added to ${listType} successfully`,
    data: newEntry,
    warnings: listType === 'blacklist' && shouldBlockIP(reputation!, 70)
      ? ['IP has high threat score - immediate blocking recommended']
      : undefined,
  });
}

async function deleteFromIPListHandler(id: string, listType: IPListType): Promise<NextResponse> {
  const list = listType === 'blacklist' ? ipBlacklist : ipWhitelist;
  const index = list.findIndex(e => e.id === id);

  if (index === -1) {
    return NextResponse.json(
      { success: false, error: 'Entry not found in list' },
      { status: 404 }
    );
  }

  const deleted = list.splice(index, 1)[0];

  return NextResponse.json({
    success: true,
    message: `Entry removed from ${listType} successfully`,
    data: deleted,
  });
}

// ============================================================================
// Roles & Permissions Handlers
// ============================================================================

async function getRolesHandler(): Promise<NextResponse> {
  return NextResponse.json({
    success: true,
    data: {
      roles: roleDefinitions,
      totalCount: roleDefinitions.length,
      totalUsers: roleDefinitions.reduce((sum, r) => sum + r.userCount, 0),
      availableResources: Object.values(ResourceType),
      availableScopes: Object.values(['read', 'write', 'delete', 'admin', 'execute', 'approve']),
    },
  });
}

// ============================================================================
// Summary Handler
// ============================================================================

async function getAccessSummaryHandler(): Promise<NextResponse> {
  return NextResponse.json({
    success: true,
    data: {
      timestamp: new Date().toISOString(),
      policies: {
        total: accessPolicies.length,
        enabled: accessPolicies.filter(p => p.enabled).length,
        byType: {
          rbac: accessPolicies.filter(p => p.type === 'rbac').length,
          abac: accessPolicies.filter(p => p.type === 'abac').length,
          network: accessPolicies.filter(p => p.type === 'network').length,
          api: accessPolicies.filter(p => p.type === 'api').length,
        },
      },
      firewall: {
        totalRules: firewallRules.length,
        enabledRules: firewallRules.filter(r => r.enabled).length,
        allowRules: firewallRules.filter(r => r.action === 'allow').length,
        denyRules: firewallRules.filter(r => r.action === 'deny').length,
      },
      ipLists: {
        blacklistTotal: ipBlacklist.length,
        whitelistTotal: ipWhitelist.length,
        blacklistExpiring: ipBlacklist.filter(e => e.expiresAt && !e.permanent).length,
        whitelistExpiring: ipWhitelist.filter(e => e.expiresAt && !e.permanent).length,
      },
      roles: {
        totalRoles: roleDefinitions.length,
        totalUsers: roleDefinitions.reduce((sum, r) => sum + r.userCount, 0),
      },
      recentActivity: {
        policiesModifiedLastWeek: 2,
        rulesAddedToday: 1,
        ipsBlockedToday: 3,
      },
    },
  });
}
