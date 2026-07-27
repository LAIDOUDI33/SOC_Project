/**
 * National SOC Platform - LDAP Authentication Service
 * 
 * Enterprise LDAP/Active Directory integration for Djezzy:
 * - Secure authentication with bind operations
 * - User attribute mapping and synchronization
 * - Group-based role resolution
 * - Connection pooling and health monitoring
 * - Comprehensive error handling
 */

import { Client } from 'ldapts';
import { 
  LDAPConfig, 
  LDAPUserAttributes, 
  LDAPAuthResult, 
  LDAPSyncResult,
  getLDAPConfig,
  parseAccountControl,
  windowsFileTimeToDate,
  calculatePasswordExpiry,
  type LDAPGroupInfo
} from './config';
import { db } from '@/lib/db';

// ============================================================
// CONNECTION MANAGEMENT
// ============================================================

interface LDAPConnection {
  client: Client;
  serverUrl: string;
  connectedAt: Date;
  lastUsedAt: Date;
  isHealthy: boolean;
}

class LDAPConnectionPool {
  private connections: Map<string, LDAPConnection> = new Map();
  private config: LDAPConfig;
  
  constructor(config: LDAPConfig) {
    this.config = config;
  }
  
  /**
   * Get or create a healthy connection to any available server
   */
  async getConnection(): Promise<{ client: Client; serverUrl: string }> {
    const servers = this.config.servers.sort((a, b) => a.priority - b.priority);
    
    // Try existing healthy connections first
    for (const [url, conn] of this.connections) {
      if (conn.isHealthy && this.isConnectionValid(conn)) {
        conn.lastUsedAt = new Date();
        return { client: conn.client, serverUrl: url };
      }
    }
    
    // Create new connection to best available server
    for (const server of servers) {
      try {
        const client = await this.createClient(server.url);
        
        const connection: LDAPConnection = {
          client,
          serverUrl: server.url,
          connectedAt: new Date(),
          lastUsedAt: new Date(),
          isHealthy: true,
        };
        
        this.connections.set(server.url, connection);
        return { client, serverUrl: server.url };
      } catch (error) {
        console.error(`Failed to connect to ${server.url}:`, error);
        continue;
      }
    }
    
    throw new Error('Unable to establish connection to any LDAP server');
  }
  
  /**
   * Create a new LDAP client with TLS configuration
   */
  private async createClient(url: string): Promise<Client> {
    const client = new Client({
      url,
      tlsOptions: this.config.tlsOptions.rejectUnauthorized ? {
        rejectUnauthorized: true,
        minVersion: this.config.tlsOptions.minVersion as any,
        maxVersion: this.config.tlsOptions.maxVersion as any,
      } : undefined,
      timeout: this.config.servers.find(s => s.url === url)?.timeout || 10000,
      strictDN: true,
    });
    
    // Bind with service account credentials
    await client.bind(this.config.bindDN, this.config.bindPassword);
    
    return client;
  }
  
  /**
   * Check if connection is still valid
   */
  private isConnectionValid(conn: LDAPConnection): boolean {
    const idleTime = Date.now() - conn.lastUsedAt.getTime();
    return idleTime < this.config.pool.idleTimeoutMillis;
  }
  
  /**
   * Mark connection as unhealthy (for error recovery)
   */
  markUnhealthy(url: string): void {
    const conn = this.connections.get(url);
    if (conn) {
      conn.isHealthy = false;
    }
  }
  
  /**
   * Close all connections
   */
  async closeAll(): Promise<void> {
    for (const [url, conn] of this.connections) {
      try {
        await conn.client.unbind();
      } catch (error) {
        console.error(`Error closing connection to ${url}:`, error);
      }
    }
    this.connections.clear();
  }
}

// Global connection pool instance
let connectionPool: LDAPConnectionPool | null = null;

function getConnectionPool(): LDAPConnectionPool {
  if (!connectionPool) {
    connectionPool = new LDAPConnectionPool(getLDAPConfig());
  }
  return connectionPool;
}

// ============================================================
// USER ATTRIBUTE MAPPING
// ============================================================

/**
 * Map raw LDAP entry to structured user attributes
 */
function mapLDAPUserAttributes(entry: any): LDAPUserAttributes {
  const uac = parseInt(entry.userAccountControl || '0');
  const accountStatus = parseAccountControl(uac);
  const pwdLastSet = windowsFileTimeToDate(parseInt(entry.pwdLastSet || '0'));
  const lastLogon = windowsFileTimeToDate(parseInt(entry.lastLogon || '0'));
  
  // Parse memberOf DNs to extract group names
  const memberOf: string[] = Array.isArray(entry.memberOf) 
    ? entry.memberOf 
    : entry.memberOf 
      ? [entry.memberOf] 
      : [];
      
  const groups = memberOf.map((dn: string) => {
    // Extract CN from DN: CN=GroupName,OU=...
    const match = dn.match(/CN=([^,]+)/i);
    return match ? match[1] : dn;
  });
  
  return {
    dn: entry.dn || '',
    username: entry.sAMAccountName || entry.uid || '',
    email: entry.mail || '',
    displayName: entry.displayName || '',
    firstName: entry.givenName || '',
    lastName: entry.sn || '',
    fullName: entry.name || entry.cn || '',
    department: entry.department || '',
    title: entry.title || '',
    company: entry.company || 'Djezzy',
    office: entry.physicalDeliveryOfficeName || '',
    employeeId: entry.employeeID || entry.employeeNumber || '',
    employeeType: entry.employeeType || '',
    telephone: entry.telephoneNumber || '',
    mobile: entry.mobile || '',
    manager: entry.manager || '',
    accountEnabled: accountStatus.isEnabled,
    accountExpires: null, // Would need special handling for large integer
    lastLogon,
    pwdLastSet,
    pwdChanged: pwdLastSet,
    mustChangePassword: accountStatus.passwordExpired,
    accountLocked: accountStatus.isLocked,
    memberOf,
    groups,
    sid: entry.objectSid || '',
    thumbnailPhoto: entry.thumbnailPhoto ? Buffer.from(entry.thumbnailPhoto) : undefined,
    jpegPhoto: entry.jpegPhoto ? Buffer.from(entry.jpegPhoto) : undefined,
    djezzyCostCenter: entry.djezzyCostCenter || '',
    djezzyLocation: entry.djezzyLocation || '',
    djezzyBadgeNumber: entry.djezzyBadgeNumber || '',
    djezzyClearanceLevel: entry.djezzyClearanceLevel || '',
  };
}

// ============================================================
// AUTHENTICATION OPERATIONS
// ============================================================

/**
 * Authenticate user against LDAP/Active Directory
 * 
 * @param username - sAMAccountName or userPrincipalName
 * @param password - User's password
 * @returns Authentication result with user attributes or error
 */
export async function authenticateUser(
  username: string, 
  password: string
): Promise<LDAPAuthResult> {
  const config = getLDAPConfig();
  const pool = getConnectionPool();
  
  try {
    // Step 1: Get connection and search for user
    const { client, serverUrl } = await pool.getConnection();
    
    // Build search filter
    const filter = config.userSearchFilter.replace('{username}', escapeLDAPFilter(username));
    
    // Search for user
    const searchResult = await client.search(config.userSearchBase, {
      filter,
      scope: 'sub',
      attributes: config.userAttributes,
      sizeLimit: 1,
    });
    
    // Check if user was found
    if (!searchResult.searchEntries || searchResult.searchEntries.length === 0) {
      return {
        success: false,
        error: `User '${username}' not found in directory`,
        errorCode: 'USER_NOT_FOUND',
      };
    }
    
    const ldapEntry = searchResult.searchEntries[0];
    const userDN = ldapEntry.dn;
    
    // Step 2: Verify account status before attempting bind
    const uac = parseInt(ldapEntry.userAccountControl || '0');
    const accountStatus = parseAccountControl(uac);
    
    if (!accountStatus.isEnabled) {
      return {
        success: false,
        error: 'Account is disabled',
        errorCode: 'ACCOUNT_DISABLED',
      };
    }
    
    if (accountStatus.isLocked && config.features.accountLockoutCheck) {
      return {
        success: false,
        error: 'Account is locked. Please contact IT support.',
        errorCode: 'ACCOUNT_LOCKED',
      };
    }
    
    // Step 3: Attempt bind with user credentials
    try {
      // Create new client for user bind (don't reuse service account connection)
      const userClient = new Client({
        url: serverUrl,
        tlsOptions: config.tlsOptions.rejectUnauthorized ? {
          rejectUnauthorized: true,
        } : undefined,
        timeout: 10000,
      });
      
      await userClient.bind(userDN, password);
      await userClient.unbind(); // Successful bind, clean up
      
    } catch (bindError: any) {
      // LDAP bind error codes
      if (bindError?.code === 49 || bindError?.code === 52) {
        return {
          success: false,
          error: 'Invalid username or password',
          errorCode: 'INVALID_CREDENTIALS',
        };
      }
      
      throw bindError; // Re-throw unexpected errors
    }
    
    // Step 4: Map user attributes
    const userAttributes = mapLDAPUserAttributes(ldapEntry);
    
    // Step 5: Check password expiry
    let passwordExpiryDays: number | undefined;
    if (config.features.passwordExpiryCheck && userAttributes.pwdLastSet) {
      passwordExpiryDays = calculatePasswordExpiry(userAttributes.pwdLastSet);
      
      if (passwordExpiryDays !== null && passwordExpiryDays <= 0) {
        return {
          success: false,
          error: 'Password has expired. Please change your password.',
          errorCode: 'PASSWORD_EXPIRED',
          user: userAttributes,
        };
      }
      
      // Warning if expiring soon (< 7 days)
      if (passwordExpiryDays <= 7) {
        return {
          success: true,
          user: userAttributes,
          warning: `Password expires in ${passwordExpiryDays} days`,
          mfaRequired: true, // Require MFA for expiring passwords
          passwordExpiryDays,
        };
      }
    }
    
    return {
      success: true,
      user: userAttributes,
      passwordExpiryDays,
    };
    
  } catch (error: any) {
    console.error('LDAP authentication error:', error);
    
    pool.markUnhealthy(config.servers[0]?.url || '');
    
    // Categorize errors
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      return {
        success: false,
        error: 'Unable to connect to authentication server',
        errorCode: 'CONNECTION_ERROR',
      };
    }
    
    return {
      success: false,
      error: 'An unexpected error occurred during authentication',
      errorCode: 'SERVER_ERROR',
    };
  }
}

// ============================================================
// USER SYNCHRONIZATION
// ============================================================

/**
 * Synchronize LDAP user with local database
 * Creates or updates user based on LDAP data
 */
export async function syncUserWithDatabase(
  ldapUser: LDAPUserAttributes,
  options?: { skipRoleMapping?: boolean }
): Promise<{
  userId: string;
  created: boolean;
  updated: boolean;
  roleAssigned: string;
}> {
  const config = getLDAPConfig();
  
  try {
    // Check if user exists by username (sAMAccountName)
    const existingUser = await db.user.findUnique({
      where: { username: ldapUser.username },
      include: { role: true },
    });
    
    if (existingUser) {
      // Update existing user
      const updateData: any = {
        email: ldapUser.email || existingUser.email,
        name: ldapUser.displayName || `${ldapUser.firstName} ${ldapUser.lastName}`.trim(),
        updatedAt: new Date(),
        lastLoginAt: new Date(),
      };
      
      // Update avatar if photo synced
      if (config.sync.syncPhoto && ldapUser.thumbnailPhoto) {
        // Store photo as base64 in avatarUrl field (or use separate storage)
        updateData.avatarUrl = `data:image/jpeg;base64,${ldapUser.thumbnailPhoto.toString('base64')}`;
      }
      
      await db.user.update({
        where: { id: existingUser.id },
        data: updateData,
      });
      
      // Update role if group mapping enabled and not skipped
      let roleAssigned = existingUser.role.name;
      if (!options?.skipRoleMapping && config.sync.syncGroups) {
        roleAssigned = await mapAndAssignRole(ldapUser, existingUser.id);
      }
      
      return {
        userId: existingUser.id,
        created: false,
        updated: true,
        roleAssigned,
      };
    } else {
      // Create new user (if allowed)
      if (!config.sync.createNewUsers) {
        throw new Error('User creation from LDAP is disabled');
      }
      
      // Determine role from groups
      const defaultRole = await db.role.findFirst({ where: { name: 'analyst' } }) 
        || await db.role.findFirst();
      
      const newUser = await db.user.create({
        data: {
          email: ldapUser.email || `${ldapUser.username}@djezzy.dz`,
          username: ldapUser.username,
          passwordHash: 'LDAP_AUTH', // Placeholder - auth handled by LDAP
          name: ldapUser.displayName || `${ldapUser.firstName} ${ldapUser.lastName}`.trim() || ldapUser.username,
          roleId: defaultRole?.id || '',
          isActive: ldapUser.accountEnabled,
          lastLoginAt: new Date(),
          avatarUrl: config.sync.syncPhoto && ldapUser.thumbnailPhoto 
            ? `data:image/jpeg;base64,${ldapUser.thumbnailPhoto.toString('base64')}`
            : null,
        },
      });
      
      // Assign role from groups
      let roleAssigned = defaultRole?.name || 'unknown';
      if (!options?.skipRoleMapping && config.sync.syncGroups) {
        roleAssigned = await mapAndAssignRole(ldapUser, newUser.id);
      }
      
      return {
        userId: newUser.id,
        created: true,
        updated: false,
        roleAssigned,
      };
    }
  } catch (error) {
    console.error('Error syncing LDAP user to database:', error);
    throw error;
  }
}

/**
 * Map LDAP groups to SOC roles and assign to user
 */
async function mapAndAssignRole(
  ldapUser: LDAPUserAttributes, 
  userId: string
): Promise<string> {
  const config = getLDAPConfig();
  
  // Find matching role based on group membership (priority order)
  const rolePriority = ['soc_admin', 'threat_hunter', 'analyst', 'telecom_engineer', 'compliance_officer'];
  
  for (const roleName of rolePriority) {
    // Find which AD group maps to this role
    const groupDN = Object.entries(config.roleMappingGroups).find(
      ([, role]) => role === roleName
    )?.[0];
    
    if (groupDN && ldapUser.memberOf.includes(groupDN)) {
      // Find role in database
      const role = await db.role.findUnique({ where: { name: roleName } });
      
      if (role) {
        await db.user.update({
          where: { id: userId },
          data: { roleId: role.id },
        });
        
        return roleName;
      }
    }
  }
  
  // No specific role matched, keep current/default role
  const currentUser = await db.user.findUnique({ where: { id: userId }, include: { role: true } });
  return currentUser?.role?.name || 'unknown';
}

// ============================================================
// GROUP AND DIRECTORY OPERATIONS
// ============================================================

/**
 * Resolve all groups for a user (including nested groups)
 */
export async function resolveUserGroups(userDN: string): Promise<LDAPGroupInfo[]> {
  const config = getLDAPConfig();
  const pool = getConnectionPool();
  
  try {
    const { client } = await pool.getConnection();
    const groups: LDAPGroupInfo[] = [];
    
    // Direct membership
    const directSearch = await client.search(config.groupSearchBase, {
      filter: `(&(objectClass=group)(member=${escapeLDAPFilter(userDN)}))`,
      scope: 'sub',
      attributes: ['dn', 'cn', 'description', 'member'],
    });
    
    if (directSearch.searchEntries) {
      for (const entry of directSearch.searchEntries) {
        groups.push({
          dn: entry.dn,
          name: entry.cn || '',
          description: entry.description,
          members: Array.isArray(entry.member) ? entry.member : entry.member ? [entry.member] : [],
        });
      }
    }
    
    // Nested group lookup if enabled
    if (config.features.nestedGroupLookup) {
      const visitedGroups = new Set(groups.map(g => g.dn));
      await resolveNestedGroups(client, groups, config.groupSearchBase, visitedGroups);
    }
    
    return groups;
  } catch (error) {
    console.error('Error resolving user groups:', error);
    return [];
  }
}

/**
 * Recursively resolve nested group memberships
 */
async function resolveNestedGroups(
  client: Client,
  accumulatedGroups: LDAPGroupInfo[],
  searchBase: string,
  visited: Set<string>
): Promise<void> {
  const groupsToCheck = accumulatedGroups.filter(g => !g.parentGroups?.length);
  
  for (const group of groupsToCheck) {
    for (const memberDN of group.members) {
      if (memberDN.startsWith('CN=') && !visited.has(memberDN)) {
        visited.add(memberDN);
        
        try {
          const searchResult = await client.search(searchBase, {
            filter: `(&(objectClass=group)(distinguishedName=${escapeLDAPFilter(memberDN)}))`,
            scope: 'sub',
            attributes: ['dn', 'cn', 'description', 'member'],
          });
          
          if (searchResult.searchEntries?.length > 0) {
            const entry = searchResult.searchEntries[0];
            const nestedGroup: LDAPGroupInfo = {
              dn: entry.dn,
              name: entry.cn || '',
              description: entry.description,
              members: Array.isArray(entry.member) ? entry.member : entry.member ? [entry.member] : [],
              parentGroups: [group.dn],
            };
            
            accumulatedGroups.push(nestedGroup);
          }
        } catch (error) {
          // Skip groups we can't read
        }
      }
    }
  }
}

// ============================================================
// BULK SYNCHRONIZATION
// ============================================================

/**
 * Perform bulk sync of all users from LDAP
 * Typically run on a schedule (cron job)
 */
export async function performBulkSync(): Promise<LDAPSyncResult> {
  const config = getLDAPConfig();
  const startTime = Date.now();
  const result: LDAPSyncResult = {
    synced: false,
    usersCreated: 0,
    usersUpdated: 0,
    usersDeactivated: 0,
    groupsSynced: 0,
    errors: [],
    warnings: [],
    durationMs: 0,
  };
  
  if (!config.sync.enabled) {
    result.warnings.push('LDAP sync is disabled in configuration');
    return result;
  }
  
  const pool = getConnectionPool();
  
  try {
    const { client } = await pool.getConnection();
    
    // Search for all users in the base
    const searchResult = await client.search(config.userSearchBase, {
      filter: config.userSearchFilter.replace('{username}', '*'),
      scope: 'sub',
      attributes: config.userAttributes,
      paged: true,
      pageSize: 100,
    });
    
    if (!searchResult.searchEntries?.length) {
      result.warnings.push('No users found in LDAP search base');
      result.durationMs = Date.now() - startTime;
      result.synced = true;
      return result;
    }
    
    // Process each user
    for (const entry of searchResult.searchEntries) {
      try {
        const ldapUser = mapLDAPUserAttributes(entry);
        
        // Skip disabled accounts
        if (!ldapUser.accountEnabled) {
          // Deactivate in local DB if exists
          const existingUser = await db.user.findUnique({
            where: { username: ldapUser.username },
          });
          
          if (existingUser && existingUser.isActive) {
            await db.user.update({
              where: { id: existingUser.id },
              data: { isActive: false },
            });
            result.usersDeactivated++;
          }
          continue;
        }
        
        // Sync user
        const syncResult = await syncUserWithDatabase(ldapUser, { skipRoleMapping: true });
        
        if (syncResult.created) result.usersCreated++;
        if (syncResult.updated) result.usersUpdated++;
        
      } catch (error: any) {
        result.errors.push({
          user: entry.sAMAccountName || entry.uid || 'unknown',
          error: error.message,
        });
      }
    }
    
    result.groupsSynced = 0; // Would need separate group sync logic
    result.synced = true;
    
  } catch (error: any) {
    result.errors.push({
      user: 'BULK_SYNC',
      error: error.message,
    });
  }
  
  result.durationMs = Date.now() - startTime;
  return result;
}

// ============================================================
// HEALTH CHECK
// ============================================================

/**
 * Perform LDAP health check
 */
export async function checkLDAPHealth(): Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy';
  latencyMs: number;
  serverCount: number;
  activeConnections: number;
  details: string[];
}> {
  const config = getLDAPConfig();
  const details: string[] = [];
  const startTime = Date.now();
  
  try {
    const pool = getConnectionPool();
    const { client, serverUrl } = await pool.getConnection();
    
    // Test operation - search for bind DN
    await client.search(config.baseDN, {
      filter: `(distinguishedName=${escapeLDAPFilter(config.bindDN)})`,
      scope: 'base',
      attributes: ['dn'],
      sizeLimit: 1,
    });
    
    const latencyMs = Date.now() - startTime;
    
    return {
      status: latencyMs < 1000 ? 'healthy' : 'degraded',
      latencyMs,
      serverCount: config.servers.length,
      activeConnections: 1, // Simplified
      details: [`Connected to ${serverUrl}`, `Latency: ${latencyMs}ms`],
    };
    
  } catch (error: any) {
    return {
      status: 'unhealthy',
      latencyMs: Date.now() - startTime,
      serverCount: config.servers.length,
      activeConnections: 0,
      details: [`Connection failed: ${error.message}`],
    };
  }
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

/**
 * Escape special characters in LDAP filters
 */
function escapeLDAPFilter(value: string): string {
  return value
    .replace(/\\/g, '\\5c')
    .replace(/\*/g, '\\2a')
    .replace(/\(/g, '\\28')
    .replace(/\)/g, '\\29')
    .replace(/\x00/g, '\\00')
    .replace(/\//g, '\\2f');
}

/**
 * Close all LDAP connections (cleanup on shutdown)
 */
export async function shutdownLDAP(): Promise<void> {
  if (connectionPool) {
    await connectionPool.closeAll();
    connectionPool = null;
  }
}

// Export utilities
export {
  getConnectionPool,
  mapLDAPUserAttributes,
};
