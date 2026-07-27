/**
 * National SOC Platform - SAML Module
 * 
 * Enterprise SSO integration for Djezzy.
 * Exports all SAML functionality for single sign-on.
 */

// Configuration types and defaults
export {
  getSAMLConfig,
  getActiveIdPs,
  getIdPById,
  getDefaultIdP,
  generateSPMetadata,
  mapSAMLAttributes,
  mapSAMLRole,
  validateSAMLConfig,
  DJEZZY_SAML_DEFAULTS,
  type SAMLConfig,
  type SAMLCertificate,
  type SAMLIdPConfig,
  type SAMLAttributeMapping,
  type SAMLNameIDFormat,
  type SAMLSPConfig,
  type SAMLUser,
  type SAMLAuthResult,
} from './config';

// Core services
export {
  initiateLogin,
  processResponse,
  initiateLogout,
  processLogoutResponse,
  getMetadata,
  getIdPDiscoveryInfo,
  checkSAMLHealth,
  createSAMLSession,
  getSAMLSession,
  deleteSAMLSession,
  generateRequestId,
} from './service';
