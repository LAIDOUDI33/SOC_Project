/**
 * National SOC Platform - LDAP/Active Directory Configuration
 * 
 * Enterprise LDAP integration for Djezzy corporate Active Directory:
 * - Multiple server support with failover
 * - Secure LDAPS/TLS connections
 * - Djezzy-specific OU structure
 * - Group-based role mapping
 * - Connection pooling and health checks
 */

// ============================================================
// TYPES
// ============================================================

export interface LDAPServerConfig {
  url: string;
  priority: number;
  weight: number;
  isSecure: boolean;
  timeout: number;
}

export interface LDAPConfig {
  // Server configuration (supports multiple servers for HA)
  servers: LDAPServerConfig[];
  
  // Bind credentials for service account
  bindDN: string;
  bindPassword: string;
  
  // Base DN for searches
  baseDN: string;
  
  // User search configuration
  userSearchBase: string;
  userSearchFilter: string;
  userAttributes: string[];
  
  // Group/OU structure for Djezzy
  groupSearchBase: string;
  groupSearchFilter: string;
  roleMappingGroups: Record<string, string>; // AD Group -> SOC Role
  
  // TLS/Security settings
  tlsOptions: {
    rejectUnauthorized: boolean;
    caCert?: string;
    clientCert?: string;
    clientKey?: string;
    minVersion: string;
    maxVersion: string;
  };
  
  // Connection pooling
  pool: {
    maxSize: number;
    minSize: number;
    acquireTimeoutMillis: number;
    idleTimeoutMillis: number;
    reapIntervalMillis: number;
  };
  
  // Sync settings
  sync: {
    enabled: boolean;
    intervalMinutes: number;
    syncOnLogin: boolean;
    createNewUsers: boolean;
    updateExistingUsers: boolean;
    syncGroups: boolean;
    syncPhoto: boolean;
  };
  
  // Feature flags
  features: {
    passwordChangeAllowed: boolean;
    passwordExpiryCheck: boolean;
    accountLockoutCheck: boolean;
    groupMembershipSync: boolean;
    nestedGroupLookup: boolean;
  };
}

export interface LDAPUserAttributes {
  // Core identity attributes
  dn: string;
  username: string;       // sAMAccountName / uid
  email: string;          // mail / email
  displayName: string;    // displayName / cn
  firstName: string;      // givenName
  lastName: string;       // sn
  fullName: string;       // name / cn
  
  // Organizational attributes
  department: string;     // department
  title: string;          // title
  company: string;        // company
  office: string;         // physicalDeliveryOfficeName
  employeeId: string;     // employeeID / employeeNumber
  employeeType: string;   // employeeType
  
  // Contact attributes
  telephone: string;      // telephoneNumber
  mobile: string;         // mobile
  manager: string;        // manager (DN)
  
  // Account status
  accountEnabled: boolean;// userAccountControl check
  accountExpires: Date | null;
  lastLogon: Date | null;
  pwdLastSet: Date | null;
  pwdChanged: Date | null;
  mustChangePassword: boolean;
  accountLocked: boolean;
  
  // Security attributes
  memberOf: string[];     // group membership DNs
  groups: string[];       // resolved group names
  sid: string;            // objectSid
  
  // Photo/avatar
  thumbnailPhoto?: Buffer; // JPEG thumbnail
  jpegPhoto?: Buffer;     // Full photo
  
  // Custom Djezzy attributes
  djezzyCostCenter?: string;
  djezzyLocation?: string;
  djezzyBadgeNumber?: string;
  djezzyClearanceLevel?: string;
}

export interface LDAPGroupInfo {
  dn: string;
  name: string;           // cn
  description?: string;
  members: string[];      // member DNs
  parentGroups?: string[]; // nested group membership
}

export interface LDAPAuthResult {
  success: boolean;
  user?: LDAPUserAttributes;
  error?: string;
  errorCode?: 'INVALID_CREDENTIALS' | 'ACCOUNT_LOCKED' | 'ACCOUNT_DISABLED' 
    | 'PASSWORD_EXPIRED' | 'CONNECTION_ERROR' | 'USER_NOT_FOUND' 
    | 'SERVER_ERROR' | 'UNKNOWN_ERROR';
  warning?: string;
  mfaRequired?: boolean;
  passwordExpiryDays?: number;
}

export interface LDAPSyncResult {
  synced: boolean;
  usersCreated: number;
  usersUpdated: number;
  usersDeactivated: number;
  groupsSynced: number;
  errors: Array<{ user: string; error: string }>;
  warnings: string[];
  durationMs: number;
}

// ============================================================
// DJEZZY DEFAULT CONFIGURATION
// ============================================================

/**
 * Default LDAP configuration for Djezzy Active Directory
 * Customize via environment variables or override in deployment
 */
export const DJEZZY_LDAP_DEFAULTS: LDAPConfig = {
  servers: [
    {
      url: process.env.LDAP_URL || 'ldaps://dc1.djezzy.dz:636',
      priority: 1,
      weight: 100,
      isSecure: true,
      timeout: 10000, // 10 seconds
    },
    {
      url: process.env.LDAP_URL_SECONDARY || 'ldaps://dc2.djezzy.dz:636',
      priority: 2,
      weight: 50,
      isSecure: true,
      timeout: 10000,
    }
  ],
  
  bindDN: process.env.LDAP_BIND_DN || 'CN=soc-service,CN=Users,DC=djezzy,DC=dz',
  bindPassword: process.env.LDAP_BIND_PASSWORD || '',
  
  baseDN: process.env.LDAP_BASE_DN || 'DC=djezzy,DC=dz',
  
  // User search - standard AD structure
  userSearchBase: process.env.LDAP_USER_SEARCH_BASE || 'OU=SOC Users,OU=Djezzy Users,DC=djezzy,DC=dz',
  userSearchFilter: process.env.LDAP_USER_FILTER || '(&(objectClass=user)(objectClass=person)(!(objectClass=computer))(sAMAccountName={username}))',
  userAttributes: [
    'dn', 'sAMAccountName', 'mail', 'displayName', 'givenName', 'sn', 'name',
    'department', 'title', 'company', 'physicalDeliveryOfficeName', 'employeeID',
    'employeeType', 'telephoneNumber', 'mobile', 'manager', 'userAccountControl',
    'accountExpires', 'lastLogon', 'pwdLastSet', 'memberOf', 'objectSid',
    'thumbnailPhoto', 'jpegPhoto', 'whenCreated', 'whenChanged',
    // Djezzy custom attributes
    'djezzyCostCenter', 'djezzyLocation', 'djezzyBadgeNumber', 'djezzyClearanceLevel'
  ],
  
  // Group search for role mapping
  groupSearchBase: process.env.LDAP_GROUP_SEARCH_BASE || 'OU=SOC Groups,OU=Djezzy Groups,DC=djezzy,DC=dz',
  groupSearchFilter: '(objectClass=group)',
  
  // Djezzy AD Group -> SOC Platform Role mapping
  roleMappingGroups: {
    // Admin groups
    'CN=SOC Administrators,OU=SOC Groups,OU=Djezzy Groups,DC=djezzy,DC=dz': 'soc_admin',
    'CN=IT Security Admins,OU=SOC Groups,OU=Djezzy Groups,DC=djezzy,DC=dz': 'soc_admin',
    'CN=Domain Admins,OU=SOC Groups,OU=Djezzy Groups,DC=djezzy,DC=dz': 'soc_admin',
    
    // Analyst groups
    'CN=SOC Analysts,OU=SOC Groups,OU=Djezzy Groups,DC=djezzy,DC=dz': 'analyst',
    'CN=Security Analysts,OU=SOC Groups,OU=Djezzy Groups,DC=djezzy,DC=dz': 'analyst',
    'CN=Tier 1 Analysts,OU=SOC Groups,OU=Djezzy Groups,DC=djezzy,DC=dz': 'analyst',
    
    // Threat hunter groups
    'CN=Thunt Hunters,OU=SOC Groups,OU=Djezzy Groups,DC=djezzy,DC=dz': 'threat_hunter',
    'CN=Threat Research,OU=SOC Groups,OU=Djezzy Groups,DC=djezzy,DC=dz': 'threat_hunter',
    'CN=IR Team,OU=SOC Groups,OU=Djezzy Groups,DC=djezzy,DC=dz': 'threat_hunter',
    
    // Telecom engineer groups
    'CN=Telecom Engineers,OU=SOC Groups,OU=Djezzy Groups,DC=djezzy,DC=dz': 'telecom_engineer',
    'CN=Network Operations,OU=SOC Groups,OU=Djezzy Groups,DC=djezzy,DC=dz': 'telecom_engineer',
    'CN=Core Network Team,OU=SOC Groups,OU=Djezzy Groups,DC=djezzy,DC=dz': 'telecom_engineer',
    
    // Compliance groups
    'CN=Compliance Officers,OU=SOC Groups,OU=Djezzy Groups,DC=djezzy,DC=dz': 'compliance_officer',
    'CN=Audit Team,OU=SOC Groups,OU=Djezzy Groups,DC=djezzy,DC=dz': 'compliance_officer',
    'CN=GRC Team,OU=SOC Groups,OU=Djezzy Groups,DC=djezzy,DC=dz': 'compliance_officer',
  },
  
  // TLS Configuration for secure LDAP
  tlsOptions: {
    rejectUnauthorized: process.env.LDAP_TLS_REJECT_UNAUTHORIZED !== 'false',
    caCert: process.env.LDAP_CA_CERT,
    clientCert: process.env.LDAP_CLIENT_CERT,
    clientKey: process.env.LDAP_CLIENT_KEY,
    minVersion: 'TLSv1.2',
    maxVersion: 'TLSv1.3',
  },
  
  // Connection pooling
  pool: {
    maxSize: parseInt(process.env.LDAP_POOL_MAX_SIZE || '10'),
    minSize: parseInt(process.env.LDAP_POOL_MIN_SIZE || '2'),
    acquireTimeoutMillis: parseInt(process.env.LDAP_ACQUIRE_TIMEOUT || '5000'),
    idleTimeoutMillis: parseInt(process.env.LDAP_IDLE_TIMEOUT || '30000'),
    reapIntervalMillis: parseInt(process.env.LDAP_REAP_INTERVAL || '60000'),
  },
  
  // Sync settings
  sync: {
    enabled: process.env.LDAP_SYNC_ENABLED === 'true',
    intervalMinutes: parseInt(process.env.LDAP_SYNC_INTERVAL || '60'), // Every hour
    syncOnLogin: true,
    createNewUsers: process.env.LDAP_CREATE_USERS === 'true' || true,
    updateExistingUsers: process.env.LDAP_UPDATE_USERS === 'true' || true,
    syncGroups: true,
    syncPhoto: process.env.LDAP_SYNC_PHOTO === 'true' || false, // Disabled by default (bandwidth)
  },
  
  // Feature flags
  features: {
    passwordChangeAllowed: false, // Password changes through AD only
    passwordExpiryCheck: true,
    accountLockoutCheck: true,
    groupMembershipSync: true,
    nestedGroupLookup: true,
  },
};

// ============================================================
// ACTIVE DIRECTORY SPECIFIC CONSTANTS
// ============================================================

/**
 * Active Directory userAccountControl flags
 */
export const AD_USER_ACCOUNT_CONTROL = {
  SCRIPT: 0x0001,
  ACCOUNTDISABLE: 0x0002,
  HOMEDIR_REQUIRED: 0x0008,
  LOCKOUT: 0x0010,
  PASSWD_NOTREQD: 0x0020,
  PASSWD_CANT_CHANGE: 0x0040,
  ENCRYPTED_TEXT_PWD_ALLOWED: 0x0080,
  TEMP_DUPLICATE_ACCOUNT: 0x0100,
  NORMAL_ACCOUNT: 0x0200,
  INTERDOMAIN_TRUST_ACCOUNT: 0x0800,
  WORKSTATION_TRUST_ACCOUNT: 0x1000,
  SERVER_TRUST_ACCOUNT: 0x2000,
  DONT_EXPIRE_PASSWORD: 0x10000,
  MNS_LOGON_ACCOUNT: 0x20000,
  SMARTCARD_REQUIRED: 0x40000,
  TRUSTED_FOR_DELEGATION: 0x80000,
  NOT_DELEGATED: 0x100000,
  USE_DES_KEY_ONLY: 0x200000,
  DONT_REQUIRE_PREAUTH: 0x400000,
  PASSWORD_EXPIRED: 0x800000,
  TRUSTED_TO_AUTH_FOR_DELEGATION: 0x1000000,
  PARTIAL_SECRETS_ACCOUNT: 0x04000000,
} as const;

/**
 * Parse userAccountControl value to determine account status
 */
export function parseAccountControl(uac: number): {
  isEnabled: boolean;
  isLocked: boolean;
  passwordExpired: boolean;
  passwordNeverExpires: boolean;
  smartcardRequired: boolean;
  trustedForDelegation: boolean;
} {
  return {
    isEnabled: !(uac & AD_USER_ACCOUNT_CONTROL.ACCOUNTDISABLE),
    isLocked: !!(uac & AD_USER_ACCOUNT_CONTROL.LOCKOUT),
    passwordExpired: !!(uac & AD_USER_ACCOUNT_CONTROL.PASSWORD_EXPIRED),
    passwordNeverExpires: !!(uac & AD_USER_ACCOUNT_CONTROL.DONT_EXPIRE_PASSWORD),
    smartcardRequired: !!(uac & AD_USER_ACCOUNT_CONTROL.SMARTCARD_REQUIRED),
    trustedForDelegation: !!(uac & AD_USER_ACCOUNT_CONTROL.TRUSTED_FOR_DELEGATION),
  };
}

/**
 * Convert Windows Filetime to JavaScript Date
 */
export function windowsFileTimeToDate(filetime: number): Date | null {
  if (!filetime || filetime === 0) return null;
  
  // Windows file time is 100-nanosecond intervals since January 1, 1601
  const epochDiff = 11644473600000; // Difference between 1601 and 1971 in ms
  const ticksPerMs = 10000;
  
  try {
    const unixTime = (filetime / ticksPerMs) - epochDiff;
    return new Date(unixTime);
  } catch {
    return null;
  }
}

/**
 * Calculate days until password expiry based on domain policy
 */
export function calculatePasswordExpiry(
  pwdLastSet: Date | null,
  maxPasswordAgeDays: number = 90 // Default AD policy
): number | null {
  if (!pwdLastSet) return null;
  
  const now = new Date();
  const expiryDate = new Date(pwdLastSet.getTime() + (maxPasswordAgeDays * 24 * 60 * 60 * 1000));
  const diffMs = expiryDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  
  return diffDays > 0 ? diffDays : 0;
}

// ============================================================
// CONFIGURATION HELPERS
// ============================================================

/**
 * Get LDAP configuration with environment variable overrides
 */
export function getLDAPConfig(): LDAPConfig {
  return DJEZZY_LDAP_DEFAULTS;
}

/**
 * Validate LDAP configuration
 */
export function validateLDAPConfig(config: LDAPConfig): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Check required fields
  if (!config.servers?.length) {
    errors.push('At least one LDAP server must be configured');
  }
  
  if (!config.bindDN) {
    errors.push('Bind DN is required');
  }
  
  if (!config.baseDN) {
    errors.push('Base DN is required');
  }
  
  // Check server URLs
  config.servers.forEach((server, index) => {
    if (!server.url) {
      errors.push(`Server ${index + 1}: URL is required`);
    } else if (!server.url.startsWith('ldap://') && !server.url.startsWith('ldaps://')) {
      errors.push(`Server ${index + 1}: URL must start with ldap:// or ldaps://`);
    }
  });
  
  // Warnings
  if (config.bindPassword === '') {
    warnings.push('Bind password is empty - authentication may fail');
  }
  
  config.servers.forEach(server => {
    if (server.url?.startsWith('ldap://') && !server.isSecure) {
      warnings.push(`Server ${server.url} is using insecure LDAP (no TLS)`);
    }
  });
  
  if (config.tlsOptions.rejectUnauthorized === false) {
    warnings.push('TLS certificate verification is disabled - this is not recommended for production');
  }
  
  return { valid: errors.length === 0, errors, warnings };
}

// Export types and utilities
export type {
  LDAPServerConfig,
  LDAPConfig,
  LDAPUserAttributes,
  LDAPGroupInfo,
  LDAPAuthResult,
  LDAPSyncResult,
};
