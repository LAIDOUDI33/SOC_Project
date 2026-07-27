/**
 * National SOC Platform - SAML 2.0 SSO Configuration
 * 
 * Enterprise Single Sign-On integration for Djezzy:
 * - Support for multiple Identity Providers (IdPs)
 * - ADFS, Okta, Azure AD, and generic SAML IdP support
 * - Attribute mapping and assertion handling
 * - Certificate and key management
 * - Service Provider (SP) metadata generation
 */

import crypto from 'crypto';

// ============================================================
// TYPES
// ============================================================

export interface SAMLCertificate {
  /** PEM-encoded certificate */
  cert: string;
  /** Private key (for SP) */
  key?: string;
  /** Certificate fingerprint (SHA-256) */
  fingerprint?: string;
  /** Expiration date */
  expiresAt?: Date;
}

export interface SAMLIdPConfig {
  /** Unique identifier for this IdP */
  id: string;
  /** Display name */
  name: string;
  /** Entity ID of the IdP */
  entityID: string;
  /** SSO URL (HTTP-POST binding) */
  ssoUrl: string;
  /** SLO URL (Single Logout) */
  sloUrl?: string;
  /** IdP's X.509 certificate(s) for signature verification */
  certificates: SAMLCertificate[];
  /** Want AuthnRequests signed? */
  wantAuthnRequestsSigned: boolean;
  /** Signature algorithm */
  signatureAlgorithm: 'sha256' | 'sha384' | 'sha512';
  /** Digest algorithm */
  digestAlgorithm: 'sha256' | 'sha384' | 'sha512';
  /** Attribute mapping from IdP to local user */
  attributeMapping: SAMLAttributeMapping;
  /** Name ID format to request */
  nameIDFormat: SAMLNameIDFormat;
  /** AuthnContext class reference (security level) */
  authnContextClassRef: string[];
  /** Allow unsolicited responses? */
  allowUnsolicitedResponses: boolean;
  /** Is this IdP active/enabled? */
  isActive: boolean;
  /** Priority for IdP selection (lower = higher priority) */
  priority: number;
  /** Additional configuration options */
  options?: Record<string, any>;
}

export interface SAMLAttributeMapping {
  /** User identifier (maps to username) */
  idAttribute: string;
  /** Email address */
  emailAttribute: string;
  /** Full name / display name */
  nameAttribute: string;
  /** First name */
  firstNameAttribute?: string;
  /** Last name */
  lastNameAttribute?: string;
  /** Groups/roles attribute */
  groupsAttribute?: string;
  /** Department */
  departmentAttribute?: string;
  /** Employee ID */
  employeeIdAttribute?: string;
  /** Custom Djezzy attributes */
  customAttributes?: Record<string, string>;
}

export type SAMLNameIDFormat = 
  | 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress'
  | 'urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified'
  | 'urn:oasis:names:tc:SAML:2.0:nameid-format:persistent'
  | 'urn:oasis:names:tc:SAML:2.0:nameid-format:transient'
  | 'urn:oasis:names:tc:SAML:2.0:nameid-format:X509SubjectName';

export interface SAMLSPConfig {
  /** Our entity ID (Service Provider) */
  entityID: string;
  /** Our callback/ACS URL */
  assertionConsumerServiceUrl: string;
  /** Our Single Logout URL */
  singleLogoutUrl: string;
  /** Our private key for signing requests */
  privateKey: string;
  /** Our certificate */
  certificate: string;
  /** Want assertions encrypted? */
  wantAssertionsEncrypted: boolean;
  /** Want assertions signed? */
  wantAssertionsSigned: boolean;
  /** AuthnRequests signed? */
  authnRequestsSigned: boolean;
  /** Signature algorithm */
  signatureAlgorithm: string;
  /** Digest algorithm */
  digestAlgorithm: string;
  /** Organization info */
  organization?: {
    name: string;
    displayName: string;
    url: string;
  };
  /** Contact person */
  contactPerson?: {
    name: string;
    email: string;
    type: 'technical' | 'support' | 'administrative' | 'billing' | 'other';
  };
  /** Validity period for assertions (in seconds) */
  assertionValiditySeconds: number;
}

export interface SAMLConfig {
  /** Service Provider configuration */
  sp: SAMLSPConfig;
  /** List of configured Identity Providers */
  identityProviders: SAMLIdPConfig[];
  /** Default IdP to use if not specified */
  defaultIdpId: string;
  /** Session configuration */
  session: {
    /** Cookie name for SAML session */
    cookieName: string;
    /** Session lifetime in seconds */
    lifetimeSeconds: number;
    /** SameSite cookie setting */
    sameSite: 'Strict' | 'Lax' | 'None';
    /** Secure flag for cookies */
    secure: boolean;
    /** Domain for cookies */
    domain?: string;
  };
  /** Feature flags */
  features: {
    /** Enable relay state (return URL) */
    relayState: boolean;
    /** Enable Single Logout */
    singleLogout: boolean;
    /** Cache IdP metadata */
    cacheMetadata: boolean;
    /** Validate audience restriction */
    validateAudience: boolean;
    /** Validate conditions (NotBefore/NotOnOrAfter) */
    validateConditions: boolean;
    /** Log all SAML messages for debugging */
    debugMode: boolean;
  };
  /** Role mapping based on SAML attributes */
  roleMapping: Record<string, { pattern: RegExp; role: string }[]>;
}

export interface SAMLUser {
  /** Subject/NameID from assertion */
  nameID: string;
  /** Name ID format */
  nameIDFormat: string;
  /** Session index (for logout) */
  sessionIndex?: string;
  /** Mapped user attributes */
  attributes: {
    id: string;
    email: string;
    name: string;
    firstName?: string;
    lastName?: string;
    groups?: string[];
    department?: string;
    employeeId?: string;
    [key: string]: any;
  };
  /** Which IdP authenticated this user */
  idpId: string;
  /** When this authentication occurred */
  authTime: Date;
  /** When this session expires */
  expiresAt: Date;
  /** Assertion ID (for audit) */
  assertionId?: string;
}

export interface SAMLAuthResult {
  success: boolean;
  user?: SAMLUser;
  error?: string;
  errorCode?: 
    | 'INVALID_REQUEST'
    | 'INVALID_RESPONSE'
    | 'SIGNATURE_VERIFICATION_FAILED'
    | 'ASSERTION_EXPIRED'
    | 'AUDIENCE_MISMATCH'
    | 'ISSUER_MISMATCH'
    | 'CONDITIONS_NOT_MET'
    | 'USER_NOT_FOUND'
    | 'IDP_ERROR'
    | 'CONFIGURATION_ERROR'
    | 'UNKNOWN_ERROR';
  idpUsed?: string;
  redirectUrl?: string; // For IdP-initiated login
}

// ============================================================
// DJEZZY DEFAULT CONFIGURATION
// ============================================================

/**
 * Generate self-signed certificate for development/testing
 * In production, use a proper CA-signed certificate
 */
function generateSelfSignedCert(): { cert: string; key: string } {
  const { cert, key } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
  
  // For development, we'll use placeholder certs
  // In production, load from environment or files
  return {
    cert: process.env.SAML_SP_CERT || '',
    key: process.env.SAML_SP_KEY || '',
  };
}

/**
 * Default SAML configuration for Djezzy SOC Platform
 */
export const DJEZZY_SAML_DEFAULTS: SAMLConfig = {
  // Service Provider (us)
  sp: {
    entityID: process.env.SAML_SP_ENTITY_ID || 'urn:djezzy:soc-platform:sp',
    assertionConsumerServiceUrl: process.env.SAML_ACS_URL || 'https://soc.djezzy.dz/api/auth/saml/callback',
    singleLogoutUrl: process.env.SAML_SLO_URL || 'https://soc.djezzy.dz/api/auth/saml/logout',
    privateKey: process.env.SAML_SP_KEY || '',
    certificate: process.env.SAML_SP_CERT || '',
    wantAssertionsEncrypted: process.env.SAML_WANT_ENCRYPTED === 'true',
    wantAssertionsSigned: true,
    authnRequestsSigned: true,
    signatureAlgorithm: 'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256',
    digestAlgorithm: 'http://www.w3.org/2001/04/xmlenc#sha256',
    organization: {
      name: 'Djezzy',
      displayName: 'Djezzy National SOC Platform',
      url: 'https://www.djezzy.dz',
    },
    contactPerson: {
      name: 'SOC Platform Administrator',
      email: 'soc-admin@djezzy.dz',
      type: 'technical',
    },
    assertionValiditySeconds: parseInt(process.env.SAML_ASSERTION_VALIDITY || '28800'), // 8 hours
  },
  
  // Identity Providers (Djezzy corporate IdPs)
  identityProviders: [
    // Primary: Djezzy Corporate ADFS
    {
      id: 'djezzy-adfs',
      name: 'Djezzy Corporate (ADFS)',
      entityID: process.env.SAML_IDP_ENTITY_ID || 'urn:djezzy:adfs:idp',
      ssoUrl: process.env.SAML_IDP_SSO_URL || 'https://sts.djezzy.dz/adfs/ls/',
      sloUrl: process.env.SAML_IDP_SLO_URL || 'https://sts.djezzy.dz/adfs/ls/?wa=wsignoutcleanup1.0',
      certificates: [{
        cert: process.env.SAML_IDP_CERT || '', // Load IdP cert from env
        fingerprint: process.env.SAML_IDP_CERT_FINGERPRINT,
      }],
      wantAuthnRequestsSigned: true,
      signatureAlgorithm: 'sha256',
      digestAlgorithm: 'sha256',
      attributeMapping: {
        idAttribute: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name', // Windows account name
        emailAttribute: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress',
        nameAttribute: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name',
        firstNameAttribute: 'http://schemas.xmlsoap.org/ws/2005/05/claims/givenname',
        lastNameAttribute: 'http://schemas.xmlsoap.org/ws/2005/05/claims/surname',
        groupsAttribute: 'http://schemas.xmlsoap.org/claims/Group',
        departmentAttribute: 'http://schemas.xmlsoap.org/ws/2005/05/claims/department',
        employeeIdAttribute: 'http://schemas.xmlsoap.org/ws/2005/05/claims/employeeid',
        customAttributes: {
          djezzyCostCenter: 'http://djezzy.dz/claims/costcenter',
          djezzyLocation: 'http://djezzy.dz/claims/location',
          djezzyBadgeNumber: 'http://djezzy.dz/claims/badgenumber',
          djezzyClearanceLevel: 'http://djezzy.dz/claims/clearancelevel',
        },
      },
      nameIDFormat: 'urn:oasis:names:tc:SAML:2.0:nameid-format:persistent',
      authnContextClassRef: [
        'urn:oasis:names:tc:SAML:2.0:ac:classes:PasswordProtectedTransport',
      ],
      allowUnsolicitedResponses: false,
      isActive: true,
      priority: 1,
    },
    
    // Secondary: Algerian Government IdP (ARTP alignment)
    {
      id: 'artp-gov-idp',
      name: 'ARTP Government Portal',
      entityID: 'urn:artp:government:idp',
      ssoUrl: 'https://idp.artp.gov.dz/sso',
      sloUrl: 'https://idp.artp.gov.dz/slo',
      certificates: [{
        cert: process.env.SAML_ARTP_IDP_CERT || '',
      }],
      wantAuthnRequestsSigned: true,
      signatureAlgorithm: 'sha256',
      digestAlgorithm: 'sha256',
      attributeMapping: {
        idAttribute: 'uid',
        emailAttribute: 'mail',
        nameAttribute: 'displayName',
        firstNameAttribute: 'givenName',
        lastNameAttribute: 'sn',
        groupsAttribute: 'isMemberOf',
        departmentAttribute: 'ou',
        employeeIdAttribute: 'employeeNumber',
      },
      nameIDFormat: 'urn:oasis:names:tc:SAML:2.0:nameid-format:persistent',
      authnContextClassRef: [
        'urn:oasis:names:tc:SAML:2.0:ac:classes:PasswordProtectedTransport',
      ],
      allowUnsolicitedResponses: false,
      isActive: false, // Disabled by default, enable when ARTP integration is ready
      priority: 10,
    },
    
    // Tertiary: Azure AD (for cloud services integration)
    {
      id: 'azure-ad',
      name: 'Microsoft Azure AD',
      entityID: process.env.SAML_AZURE_ENTITY_ID || 'urn:federation:MicrosoftOnline',
      ssoUrl: process.env.SAML_AZURE_SSO_URL || 'https://login.microsoftonline.com/common/saml2',
      sloUrl: process.env.SAML_AZURE_SLO_URL || 'https://login.microsoftonline.com/common/saml2',
      certificates: [{
        cert: process.env.SAML_AZURE_CERT || '', // Azure signs with their public key
      }],
      wantAuthnRequestsSigned: false,
      signatureAlgorithm: 'sha256',
      digestAlgorithm: 'sha256',
      attributeMapping: {
        idAttribute: 'http://schemas.microsoft.com/identity/claims/objectidentifier',
        emailAttribute: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress',
        nameAttribute: 'http://schemas.xmlsoap.org/ws/2005/05/claims/givenname', // Use givenname + surname
        firstNameAttribute: 'http://schemas.xmlsoap.org/ws/2005/05/claims/givenname',
        lastNameAttribute: 'http://schemas.xmlsoap.org/ws/2005/05/claims/surname',
        groupsAttribute: 'http://schemas.microsoft.com/ws/2008/06/identity/claims/groups',
        departmentAttribute: 'http://schemas.xmlsoap.org/ws/2005/05/claims/department',
      },
      nameIDFormat: 'urn:oasis:names:tc:SAML:2.0:nameid-format:persistent',
      authnContextClassRef: [
        'urn:oasis:names:tc:SAML:2.0:ac:classes:PasswordProtectedTransport',
      ],
      allowUnsolicitedResponses: true,
      isActive: process.env.SAML_AZURE_ENABLED === 'true',
      priority: 20,
    },
  ],
  
  defaultIdpId: process.env.SAML_DEFAULT_IDP || 'djezzy-adfs',
  
  // Session configuration
  session: {
    cookieName: 'saml_session',
    lifetimeSeconds: parseInt(process.env.SAML_SESSION_LIFETIME || '28800'), // 8 hours
    sameSite: (process.env.SAML_SAMESITE as 'Strict' | 'Lax' | 'None') || 'Lax',
    secure: process.env.SAML_SECURE_COOKIE === 'true',
    domain: process.env.SAML_COOKIE_DOMAIN || '.djezzy.dz',
  },
  
  // Features
  features: {
    relayState: true,
    singleLogout: true,
    cacheMetadata: true,
    validateAudience: true,
    validateConditions: true,
    debugMode: process.env.NODE_ENV === 'development',
  },
  
  // Role mapping based on group claims
  roleMapping: {
    'djezzy-adfs': [
      { pattern: /^SOC.Administrators$/i, role: 'soc_admin' },
      { pattern: /^IT.Security.Admins$/i, role: 'soc_admin' },
      { pattern: /^Domain.Admins$/i, role: 'soc_admin' },
      { pattern: /^SOC.Analysts$/i, role: 'analyst' },
      { pattern: /^Security.Analysts$/i, role: 'analyst' },
      { pattern: /^Thunt.Hunters$/i, role: 'threat_hunter' },
      { pattern: /^Threat.Research$/i, role: 'threat_hunter' },
      { pattern: /^Telecom.Engineers$/i, role: 'telecom_engineer' },
      { pattern: /^Network.Operations$/i, role: 'telecom_engineer' },
      { pattern: /^Compliance.Officers$/i, role: 'compliance_officer' },
      { pattern: /^Audit.Team$/i, role: 'compliance_officer' },
    ],
    'azure-ad': [
      { pattern: /^SOC Admins$/i, role: 'soc_admin' },
      { pattern: /^SOC Analysts$/i, role: 'analyst' },
      { pattern: /^Threat Hunters$/i, role: 'threat_hunter' },
      { pattern: /^Telecom Engineers$/i, role: 'telecom_engineer' },
      { pattern: /^Compliance Officers$/i, role: 'compliance_officer' },
    ],
  },
};

// ============================================================
// CONFIGURATION HELPERS
// ============================================================

/**
 * Get SAML configuration
 */
export function getSAMLConfig(): SAMLConfig {
  return DJEZZY_SAML_DEFAULTS;
}

/**
 * Get active (enabled) Identity Providers
 */
export function getActiveIdPs(): SAMLIdPConfig[] {
  const config = getSAMLConfig();
  return config.identityProviders
    .filter(idp => idp.isActive)
    .sort((a, b) => a.priority - b.priority);
}

/**
 * Get specific IdP by ID
 */
export function getIdPById(id: string): SAMLIdPConfig | undefined {
  return getSAMLConfig().identityProviders.find(idp => idp.id === id);
}

/**
 * Get default IdP
 */
export function getDefaultIdP(): SAMLIdPConfig | undefined {
  const config = getSAMLConfig();
  return getIdPById(config.defaultIdpId) || getActiveIdPs()[0];
}

/**
 * Generate SP Metadata XML
 * This can be uploaded to IdP to configure trust relationship
 */
export function generateSPMetadata(): string {
  const config = getSAMLConfig();
  const sp = config.sp;
  
  // Current timestamp for validity
  const now = new Date();
  const validUntil = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000); // 1 year
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<md:EntityDescriptor xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata"
                     xmlns:ds="http://www.w3.org/2000/09/xmldsig#"
                     entityID="${escapeXml(sp.entityID)}"
                     validUntil="${validUntil.toISOString()}">
  <md:SPSSODescriptor protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol"
                       AuthnRequestsSigned="${sp.authnRequestsSigned}"
                       WantAssertionsSigned="${sp.wantAssertionsSigned}">
    
    <!-- Key Descriptor -->
    ${sp.certificate ? `<md:KeyDescriptor use="signing">
      <ds:KeyInfo>
        <ds:X509Data>
          <ds:X509Certificate>${formatCertForXML(sp.certificate)}</ds:X509Certificate>
        </ds:X509Data>
      </ds:KeyInfo>
    </md:KeyDescriptor>` : ''}
    
    <!-- Assertion Consumer Service -->
    <md:AssertionConsumerService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
                                  Location="${sp.assertionConsumerServiceUrl}"
                                  index="1" isDefault="true"/>
    <md:AssertionConsumerService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect"
                                  Location="${sp.assertionConsumerServiceUrl}"
                                  index="2"/>
    
    <!-- Single Logout Service -->
    ${config.features.singleLogout ? `
    <md:SingleLogoutService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
                            Location="${sp.singleLogoutUrl}"/>
    <md:SingleLogoutService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect"
                            Location="${sp.singleLogoutUrl}"/>
    ` : ''}
    
    <!-- Name ID Formats -->
    <md:NameIDFormat>urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress</md:NameIDFormat>
    <md:NameIDFormat>urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified</md:NameIDFormat>
    <md:NameIDFormat>urn:oasis:names:tc:SAML:2.0:nameid-format:persistent</md:NameIDFormat>
    <md:NameIDFormat>urn:oasis:names:tc:SAML:2.0:nameid-format:transient</md:NameIDFormat>
    
    ${sp.organization ? `
    <!-- Organization -->
    <md:Organization>
      <md:OrganizationName xml:lang="en">${escapeXml(sp.organization.name)}</md:OrganizationName>
      <md:OrganizationDisplayName xml:lang="en">${escapeXml(sp.organization.displayName)}</md:OrganizationDisplayName>
      <md:OrganizationURL xml:lang="en">${escapeXml(sp.organization.url)}</md:OrganizationURL>
    </md:Organization>
    ` : ''}
    
    ${sp.contactPerson ? `
    <!-- Contact Person -->
    <md:ContactPerson contactType="${sp.contactPerson.type}">
      <md:GivenName>${escapeXml(sp.contactPerson.name.split(' ')[0])}</md:GivenName>
      <md:SurName>${escapeXml(sp.contactPerson.name.split(' ').slice(1).join(' '))}</md:SurName>
      <mdEmailAddress>${escapeXml(sp.contactPerson.email)}</md:EmailAddress>
    </md:ContactPerson>
    ` : ''}
  </md:SPSSODescriptor>
</md:EntityDescriptor>`;
}

/**
 * Map SAML attributes to user object using IdP's attribute mapping
 */
export function mapSAMLAttributes(
  samlResponse: Record<string, string | string[]>,
  idp: SAMLIdPConfig
): SAMLUser['attributes'] {
  const mapping = idp.attributeMapping;
  
  const getFirst = (value: string | string[] | undefined): string => {
    if (!value) return '';
    return Array.isArray(value) ? value[0] : value;
  };
  
  const getArray = (value: string | string[] | undefined): string[] => {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
  };
  
  const attributes: SAMLUser['attributes'] = {
    id: getFirst(samlResponse[mapping.idAttribute]),
    email: getFirst(samlResponse[mapping.emailAttribute]) || `${getFirst(samlResponse[mapping.idAttribute])}@djezzy.dz`,
    name: getFirst(samlResponse[mapping.nameAttribute]) || 
          `${getFirst(samlResponse[mapping.firstNameAttribute] || '')} ${getFirst(samlResponse[mapping.lastNameAttribute] || '')}`.trim(),
    firstName: getFirst(samlResponse[mapping.firstNameAttribute]),
    lastName: getFirst(samlResponse[mapping.lastNameAttribute]),
    groups: getArray(samlResponse[mapping.groupsAttribute]),
    department: getFirst(samlResponse[mapping.departmentAttribute]),
    employeeId: getFirst(samlResponse[mapping.employeeIdAttribute]),
  };
  
  // Map custom Djezzy attributes
  if (mapping.customAttributes) {
    for (const [localAttr, samlAttr] of Object.entries(mapping.customAttributes)) {
      attributes[localAttr] = getFirst(samlResponse[samlAttr]);
    }
  }
  
  return attributes;
}

/**
 * Determine user role from SAML groups/attributes
 */
export function mapSAMLRole(
  groups: string[],
  idpId: string
): string {
  const config = getSAMLConfig();
  const rolePatterns = config.roleMapping[idpId] || [];
  
  // Check each group against patterns (in priority order)
  for (const group of groups) {
    for (const { pattern, role } of rolePatterns) {
      if (pattern.test(group)) {
        return role;
      }
    }
  }
  
  // Default role if no match
  return 'analyst';
}

/**
 * Validate SAML configuration
 */
export function validateSAMLConfig(config: SAMLConfig): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Check SP configuration
  if (!config.sp.entityID) {
    errors.push('SP Entity ID is required');
  }
  
  if (!config.sp.assertionConsumerServiceUrl) {
    errors.push('Assertion Consumer Service URL is required');
  } else if (!config.sp.assertionConsumerServiceUrl.startsWith('https')) {
    warnings.push('ACS URL should use HTTPS for security');
  }
  
  if (!config.sp.certificate && !config.sp.privateKey) {
    warnings.push('SP certificate/key not configured - signing will be disabled');
  }
  
  // Check IdP configurations
  if (!config.identityProviders.length) {
    errors.push('At least one Identity Provider must be configured');
  }
  
  let hasActiveIdP = false;
  for (const idp of config.identityProviders) {
    if (!idp.entityID) {
      errors.push(`IdP "${idp.id}": Entity ID is required`);
    }
    
    if (!idp.ssoUrl) {
      errors.push(`IdP "${idp.id}": SSO URL is required`);
    }
    
    if (idp.certificates.length === 0) {
      warnings.push(`IdP "${idp.id}": No certificates configured - signature verification may fail`);
    }
    
    if (idp.isActive) {
      hasActiveIdP = true;
      
      // Check that default IdP exists and is active
      if (idp.id === config.defaultIdpId) {
        // Good
      }
    }
  }
  
  if (!hasActiveIdP) {
    errors.push('No active Identity Providers configured');
  }
  
  if (config.defaultIdpId && !getIdPById(config.defaultIdpId)) {
    errors.push(`Default IdP "${config.defaultIdpId}" does not exist`);
  }
  
  return { valid: errors.length === 0, errors, warnings };
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function formatCertForXML(pemCert: string): string {
  // Remove headers, newlines, and whitespace
  return pemCert
    .replace(/-----BEGIN CERTIFICATE-----/, '')
    .replace(/-----END CERTIFICATE-----/, '')
    .replace(/\s/g, '');
}

// Export types
export type {
  SAMLCertificate,
  SAMLIdPConfig,
  SAMLAttributeMapping,
  SAMLNameIDFormat,
  SAMLSPConfig,
  SAMLConfig,
  SAMLUser,
  SAMLAuthResult,
};
