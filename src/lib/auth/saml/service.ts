/**
 * National SOC Platform - SAML 2.0 Authentication Service
 * 
 * Enterprise SSO integration for Djezzy:
 * - SAML request generation and signing
 * - Response validation and signature verification
 * - Assertion processing and attribute extraction
 * - User session management
 * - Single Logout (SLO) support
 */

import { SAML, SamlConfig as NodeSamlConfig } from '@node-saml/node-saml';
import crypto from 'crypto';
import { 
  SAMLConfig, 
  SAMLIdPConfig, 
  SAMLUser, 
  SAMLAuthResult,
  getSAMLConfig, 
  getActiveIdPs, 
  getIdPById, 
  getDefaultIdP,
  mapSAMLAttributes,
  mapSAMLRole,
  generateSPMetadata,
  type SAMLCertificate
} from './config';
import { db } from '@/lib/db';

// ============================================================
// SESSION STORAGE
// ============================================================

interface SAMLSession {
  id: string;
  userId: string;
  nameID: string;
  nameIDFormat: string;
  sessionIndex?: string;
  idpId: string;
  createdAt: Date;
  expiresAt: Date;
  assertionId?: string;
  relayState?: string;
}

// In-memory session store (use Redis in production)
const samlSessions = new Map<string, SAMLSession>();

/**
 * Create and store a new SAML session
 */
function createSAMLSession(user: SAMLUser): string {
  const sessionId = crypto.randomUUID();
  
  const session: SAMLSession = {
    id: sessionId,
    userId: user.attributes.id,
    nameID: user.nameID,
    nameIDFormat: user.nameIDFormat,
    sessionIndex: user.sessionIndex,
    idpId: user.idpId,
    createdAt: new Date(),
    expiresAt: user.expiresAt,
    assertionId: user.assertionId,
  };
  
  samlSessions.set(sessionId, session);
  
  // Auto-cleanup expired sessions
  scheduleSessionCleanup();
  
  return sessionId;
}

/**
 * Get SAML session by ID
 */
function getSAMLSession(sessionId: string): SAMLSession | undefined {
  return samlSessions.get(sessionId);
}

/**
 * Delete SAML session
 */
function deleteSAMLSession(sessionId: string): void {
  samlSessions.delete(sessionId);
}

/**
 * Cleanup expired sessions
 */
let cleanupScheduled = false;
function scheduleSessionCleanup(): void {
  if (cleanupScheduled) return;
  cleanupScheduled = true;
  
  setTimeout(() => {
    const now = new Date();
    for (const [id, session] of samlSessions.entries()) {
      if (session.expiresAt < now) {
        samlSessions.delete(id);
      }
    }
    cleanupScheduled = false;
  }, 60000); // Check every minute
}

// ============================================================
// NODE-SAML CONFIGURATION ADAPTER
// ============================================================

/**
 * Convert our SAML config to node-saml format
 */
function toNodeSamlConfig(idp: SAMLIdPConfig): NodeSamlConfig {
  const config = getSAMLConfig();
  const sp = config.sp;
  
  return {
    callbackUrl: sp.assertionConsumerServiceUrl,
    path: '/api/auth/saml/callback',
    entryPoint: idp.ssoUrl,
    logoutUrl: idp.sloUrl,
    issuer: sp.entityID,
    identifierFormat: idp.nameIDFormat,
    cert: idp.certificates.map(c => c.cert).join(''),
    privateKey: sp.privateKey || undefined,
    decryptionPvk: sp.privateKey || undefined,
    signatureAlgorithm: 'sha256',
    digestAlgorithm: 'sha256',
    wantAssertionsSigned: sp.wantAssertionsSigned,
    wantAuthnResponseSigned: true,
    acceptedClockSkewMs: 300000, // 5 minutes
    validateInResponseTo: true,
    requestIdExpirationPeriodMs: 28800000, // 8 hours
    logoutCallbackUrl: sp.singleLogoutUrl,
    additionalParams: {},
    additionalAuthorizeParams: {},
    idpCert: idp.certificates.map(c => c.cert).join(''),
    passive: false,
    providerName: sp.organization?.displayName || 'Djezzy SOC Platform',
    authnContext: idp.authnContextClassRef,
    forceAuthn: false,
    isAssertionEncrypted: sp.wantAssertionsEncrypted,
    audience: sp.entityID,
    cacheProvider: {
      get: async (key: string) => null,
      save: async (key: string, value: any) => {},
      remove: async (key: string) => {},
    },
  };
}

// ============================================================
// AUTHENTICATION OPERATIONS
// ============================================================

/**
 * Initiate SAML login (SP-initiated)
 * Generates AuthnRequest and returns redirect URL to IdP
 */
export async function initiateLogin(
  idpId?: string,
  options?: {
    relayState?: string;
    forceAuthn?: boolean;
    passive?: boolean;
  }
): Promise<{
  success: boolean;
  redirectUrl?: string;
  requestId?: string;
  error?: string;
}> {
  try {
    // Get IdP configuration
    const idp = idpId ? getIdPById(idpId) : getDefaultIdP();
    
    if (!idp || !idp.isActive) {
      return {
        success: false,
        error: `Identity Provider "${idpId}" not found or not active`,
      };
    }
    
    // Convert config
    const samlConfig = toNodeSamlConfig(idp);
    const saml = new SAML(samlConfig);
    
    // Generate authorization request
    const authRequestPromise = new Promise<string>((resolve, reject) => {
      saml.getAuthorizeUrl(
        options?.relayState || '',
        options?.forceAuthn || false,
        options?.passive || false,
        (err: Error | null, url: string | undefined) => {
          if (err) reject(err);
          else resolve(url || '');
        }
      );
    });
    
    const redirectUrl = await authRequestPromise;
    
    return {
      success: true,
      redirectUrl,
    };
    
  } catch (error: any) {
    console.error('SAML login initiation error:', error);
    return {
      success: false,
      error: error.message || 'Failed to initiate SAML login',
    };
  }
}

/**
 * Process SAML response (callback from IdP)
 * Validates assertion and extracts user information
 */
export async function processResponse(
  samlResponse: string,
  options?: {
    relayState?: string;
    requestId?: string;
  }
): Promise<SAMLAuthResult> {
  const config = getSAMLConfig();
  
  try {
    // Try each active IdP until we find one that validates the response
    const activeIdPs = getActiveIdPs();
    let lastError: Error | null = null;
    
    for (const idp of activeIdPs) {
      try {
        const result = await processWithIdP(idp, samlResponse, options);
        
        if (result.success && result.user) {
          // Sync user with database
          await syncSAMLUserToDatabase(result.user);
          
          // Create session
          const sessionId = createSAMLSession(result.user);
          
          return {
            ...result,
            idpUsed: idp.id,
          };
        }
        
        lastError = new Error(result.error);
      } catch (error: any) {
        lastError = error;
        continue; // Try next IdP
      }
    }
    
    throw lastError || new Error('No Identity Provider could validate this response');
    
  } catch (error: any) {
    console.error('SAML response processing error:', error);
    
    return {
      success: false,
      error: error.message || 'Failed to process SAML response',
      errorCode: categorizeSAMLError(error),
    };
  }
}

/**
 * Process response with specific IdP
 */
async function processWithIdP(
  idp: SAMLIdPConfig,
  samlResponse: string,
  options?: { relayState?: string; requestId?: string }
): Promise<SAMLAuthResult> {
  const config = getSAMLConfig();
  const samlConfig = toNodeSamlConfig(idp);
  const saml = new SAML(samlConfig);
  
  return new Promise((resolve, reject) => {
    saml.validatePostResponse(
      { SAMLResponse: samlResponse, RelayState: options?.relayState },
      (profile: any, err: Error | null, origRequest?: any) => {
        if (err) {
          reject(err);
          return;
        }
        
        if (!profile) {
          resolve({
            success: false,
            error: 'No profile returned from SAML response',
            errorCode: 'INVALID_RESPONSE',
          });
          return;
        }
        
        // Map attributes using IdP's mapping
        const attributes = mapSAMLAttributes(profile || {}, idp);
        
        // Determine role from groups
        const role = mapSAMLRole(attributes.groups || [], idp.id);
        
        // Build user object
        const now = new Date();
        const user: SAMLUser = {
          nameID: profile.nameID || attributes.id,
          nameIDFormat: profile.nameIDFormat || idp.nameIDFormat,
          sessionIndex: profile.sessionIndex,
          attributes: {
            ...attributes,
            _role: role, // Store determined role
          },
          idpId: idp.id,
          authTime: new Date(),
          expiresAt: new Date(now.getTime() + config.session.lifetimeSeconds * 1000),
          assertionId: profile.ID || profile.inResponseTo,
        };
        
        resolve({
          success: true,
          user,
        });
      }
    );
  });
}

// ============================================================
// USER SYNCHRONIZATION
// ============================================================

/**
 * Sync SAML-authenticated user with local database
 */
async function syncSAMLUserToDatabase(samlUser: SAMLUser): Promise<void> {
  try {
    // Check if user exists by username (from NameID)
    const existingUser = await db.user.findUnique({
      where: { username: samlUser.attributes.id },
      include: { role: true },
    });
    
    if (existingUser) {
      // Update existing user
      await db.user.update({
        where: { id: existingUser.id },
        data: {
          email: samlUser.attributes.email || existingUser.email,
          name: samlUser.attributes.name || existingUser.name,
          lastLoginAt: new Date(),
          updatedAt: new Date(),
        },
      });
      
      // Update role if different
      const newRole = samlUser.attributes._role;
      if (newRole && newRole !== existingUser.role.name) {
        const role = await db.role.findUnique({ where: { name: newRole } });
        if (role) {
          await db.user.update({
            where: { id: existingUser.id },
            data: { roleId: role.id },
          });
        }
      }
    } else {
      // Create new user
      const defaultRoleName = samlUser.attributes._role || 'analyst';
      const role = await db.role.findUnique({ where: { name: defaultRoleName } })
        || await db.role.findFirst();
      
      await db.user.create({
        data: {
          email: samlUser.attributes.email || `${samlUser.attributes.id}@djezzy.dz`,
          username: samlUser.attributes.id,
          passwordHash: 'SAML_SSO', // Placeholder - auth handled by SAML
          name: samlUser.attributes.name || samlUser.attributes.id,
          roleId: role?.id || '',
          isActive: true,
          isMfaEnabled: false, // MFA handled by IdP
          lastLoginAt: new Date(),
        },
      });
    }
  } catch (error) {
    console.error('Error syncing SAML user:', error);
    throw error;
  }
}

// ============================================================
// SINGLE LOGOUT (SLO)
// ============================================================

/**
 * Initiate Single Logout (SP-initiated)
 * Sends LogoutRequest to IdP
 */
export async function initiateLogout(
  sessionId: string
): Promise<{
  success: boolean;
  logoutUrl?: string;
  requestId?: string;
  error?: string;
}> {
  const session = getSAMLSession(sessionId);
  
  if (!session) {
    return {
      success: false,
      error: 'Invalid session',
    };
  }
  
  const config = getSAMLConfig();
  
  if (!config.features.singleLogout) {
    // Just delete local session
    deleteSAMLSession(sessionId);
    return { success: true };
  }
  
  try {
    const idp = getIdPById(session.idpId);
    
    if (!idp?.sloUrl) {
      // IdP doesn't support SLO, just delete local session
      deleteSAMLSession(sessionId);
      return { success: true };
    }
    
    const samlConfig = toNodeSamlConfig(idp);
    const saml = new SAML(samlConfig);
    
    const logoutPromise = new Promise<{ id: string; url: string }>((resolve, reject) => {
      saml.getLogoutUrl(
        session.sessionIndex || session.nameID,
        (err: Error | null, url: string | undefined, id: string | undefined) => {
          if (err) reject(err);
          else resolve({ id: id || '', url: url || '' });
        }
      );
    });
    
    const { id: requestId, url: logoutUrl } = await logoutPromise;
    
    // Mark session for deletion (will be deleted when IdP responds)
    deleteSAMLSession(sessionId);
    
    return {
      success: true,
      logoutUrl,
      requestId,
    };
    
  } catch (error: any) {
    console.error('SAML logout error:', error);
    // Still delete local session
    deleteSAMLSession(sessionId);
    
    return {
      success: true, // Logout still succeeded locally
      error: error.message,
    };
  }
}

/**
 * Process LogoutResponse from IdP
 */
export async function processLogoutResponse(
  samlResponse: string
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    // Find which IdP this came from (try active ones)
    const activeIdPs = getActiveIdPs();
    
    for (const idp of activeIdPs) {
      if (!idp.sloUrl) continue;
      
      try {
        const samlConfig = toNodeSamlConfig(idp);
        const saml = new SAML(samlConfig);
        
        const result = await new Promise<boolean>((resolve, reject) => {
          saml.validateLogoutResponse(
            { SAMLResponse: samlResponse },
            (err: Error | null) => {
              if (err) reject(err);
              else resolve(true);
            }
          );
        });
        
        if (result) {
          return { success: true };
        }
      } catch (error) {
        continue;
      }
    }
    
    return {
      success: false,
      error: 'Could not validate logout response',
    };
    
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
}

// ============================================================
// METADATA AND DISCOVERY
// ============================================================

/**
 * Get SP metadata XML
 */
export function getMetadata(): string {
  return generateSPMetadata();
}

/**
 * Get list of available IdPs for discovery service
 */
export function getIdPDiscoveryInfo(): Array<{
  id: string;
  name: string;
  entityID: string;
  logoUrl?: string;
  priority: number;
}> {
  const activeIdPs = getActiveIdPs();
  
  return activeIdPs.map(idp => ({
    id: idp.id,
    name: idp.name,
    entityID: idp.entityID,
    priority: idp.priority,
  }));
}

// ============================================================
// HEALTH CHECK
// ============================================================

/**
 * Check SAML/SSO health status
 */
export async function checkSAMLHealth(): Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy';
  details: {
    idpsAvailable: number;
    idpsTotal: number;
    metadataGenerated: boolean;
    certificatesLoaded: number;
    issues: string[];
  };
}> {
  const config = getSAMLConfig();
  const activeIdPs = getActiveIdPs();
  const issues: string[] = [];
  
  let certsLoaded = 0;
  for (const idp of config.identityProviders) {
    certsLoaded += idp.certificates.filter(c => c.cert).length;
  }
  
  // Check for issues
  if (activeIdPs.length === 0) {
    issues.push('No active Identity Providers configured');
  }
  
  if (!config.sp.certificate) {
    issues.push('SP certificate not configured');
  }
  
  if (!config.sp.privateKey) {
    issues.push('SP private key not configured');
  }
  
  const status = issues.length === 0 
    ? 'healthy' 
    : issues.some(i => i.includes('No active')) 
      ? 'unhealthy' 
      : 'degraded';
  
  return {
    status,
    details: {
      idpsAvailable: activeIdPs.length,
      idpsTotal: config.identityProviders.length,
      metadataGenerated: !!generateSPMetadata(),
      certificatesLoaded: certsLoaded,
      issues,
    },
  };
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

/**
 * Categorize SAML errors for better error messages
 */
function categorizeSAMLError(error: any): SAMLAuthResult['errorCode'] {
  const message = error.message?.toLowerCase() || '';
  const code = error.code?.toLowerCase() || '';
  
  if (message.includes('signature') || code.includes('signature')) {
    return 'SIGNATURE_VERIFICATION_FAILED';
  }
  
  if (message.includes('expired') || message.includes('notonorafter') || message.includes('notbefore')) {
    return 'ASSERTION_EXPIRED';
  }
  
  if (message.includes('audience') || message.includes('recipient')) {
    return 'AUDIENCE_MISMATCH';
  }
  
  if (message.includes('issuer') || message.includes('entityid')) {
    return 'ISSUER_MISMATCH';
  }
  
  if (message.includes('condition') || message.includes('valid')) {
    return 'CONDITIONS_NOT_MET';
  }
  
  if (message.includes('invalid') || message.includes('malformed')) {
    return 'INVALID_RESPONSE';
  }
  
  if (message.includes('configuration') || message.includes('config')) {
    return 'CONFIGURATION_ERROR';
  }
  
  return 'UNKNOWN_ERROR';
}

/**
 * Generate secure random string for request IDs
 */
export function generateRequestId(): string {
  return `_${crypto.randomBytes(16).toString('hex')}`;
}

// Export utilities
export {
  createSAMLSession,
  getSAMLSession,
  deleteSAMLSession,
};
