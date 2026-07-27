/**
 * National SOC Platform - LDAP Module
 * 
 * Enterprise LDAP/Active Directory integration for Djezzy.
 * Exports all LDAP functionality for authentication and user synchronization.
 */

// Configuration types and defaults
export {
  getLDAPConfig,
  validateLDAPConfig,
  DJEZZY_LDAP_DEFAULTS,
  parseAccountControl,
  windowsFileTimeToDate,
  calculatePasswordExpiry,
  type LDAPConfig,
  type LDAPServerConfig,
  type LDAPUserAttributes,
  type LDAPGroupInfo,
  type LDAPAuthResult,
  type LDAPSyncResult,
} from './config';

// Core services
export {
  authenticateUser,
  syncUserWithDatabase,
  resolveUserGroups,
  performBulkSync,
  checkLDAPHealth,
  shutdownLDAP,
  getConnectionPool,
  mapLDAPUserAttributes,
} from './service';
