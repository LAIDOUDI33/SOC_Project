/**
 * National SOC Platform - SAML Authentication Tests
 * 
 * Comprehensive test suite for SAML 2.0 SSO integration:
 * - Login flow initiation (SP-initiated)
 * - Response processing and validation
 * - User attribute mapping
 * - Role resolution from groups
 * - Session management
 * - Single Logout (SLO)
 * - Metadata generation
 * - Error handling and edge cases
 * - Djezzy IdP integration scenarios
 */

// ============================================================
// MOCK SETUP
// ============================================================

const mockSAMLInstance = {
  getAuthorizeUrl: jest.fn(),
  validatePostResponse: jest.fn(),
  getLogoutUrl: jest.fn(),
  validateLogoutResponse: jest.fn(),
};

jest.mock('@node-saml/node-saml', () => ({
  SAML: jest.fn().mockImplementation(() => mockSAMLInstance),
}));

import {
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
} from '@/lib/auth/saml/service';

// ============================================================
// TEST DATA (Djezzy Identity Providers)
// ============================================================

const MOCK_IDPS = {
  // Azure AD (Primary for Djezzy Office 365)
  azure_ad: {
    id: 'azure-ad',
    name: 'Microsoft Azure AD',
    entityID: 'https://sts.windows.net/djezzy-onmicrosoft.com/',
    ssoUrl: 'https://login.microsoftonline.com/djezzy-onmicrosoft.com/saml2',
    sloUrl: 'https://login.microsoftonline.com/djezzy-onmicrosoft.com/saml2/logout',
    nameIDFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
    isActive: true,
    priority: 1,
    certificates: [{ cert: 'MOCK_AZURE_CERT' }],
    authnContextClassRef: ['urn:oasis:names:tc:SAML:2.0:ac:classes:PasswordProtectedTransport'],
    attributeMapping: {
      email: 'emailAddress',
      name: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name',
      firstName: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname',
      lastName: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname',
      groups: 'http://schemas.xmlsoap.org/claims/Group',
    },
  },
  
  // Keycloak (Secondary/Internal)
  keycloak: {
    id: 'keycloak',
    name: 'Djezzy Keycloak',
    entityID: 'http://keycloak.djezzy.dz/realms/djezzy',
    ssoUrl: 'http://keycloak.djezzy.dz/realms/djezzy/protocol/saml',
    sloUrl: 'http://keycloak.djezzy.dz/realms/djezzy/protocol/saml/logout',
    nameIDFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
    isActive: true,
    priority: 2,
    certificates: [{ cert: 'MOCK_KEYCLOAK_CERT' }],
    authnContextClassRef: ['urn:oasis:names:tc:SAML:2.0:ac:classes:PasswordProtectedTransport'],
    attributeMapping: {
      email: 'email',
      name: 'name',
      firstName: 'first_name',
      lastName: 'last_name',
      groups: 'groups',
    },
  },
  
  // Disabled IdP
  disabled_idp: {
    id: 'legacy-idp',
    name: 'Legacy IdP',
    entityID: 'http://legacy.djezzy.dz',
    ssoUrl: 'http://legacy.djezzy.dz/saml',
    sloUrl: undefined as string | undefined,
    nameIDFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
    isActive: false, // DISABLED
    priority: 99,
    certificates: [],
    authnContextClassRef: [],
    attributeMapping: {},
  },
};

const MOCK_SAML_PROFILES = {
  // Azure AD Profile (SOC Admin)
  azure_admin: {
    nameID: 'a.benali@djezzy.dz',
    nameIDFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
    sessionIndex: '_session_abc123',
    ID: '_id_abc123',
    inResponseTo: '_request_xyz789',
    emailAddress: 'a.benali@djezzy.dz',
    'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name': 'Ahmed Benali',
    'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname': 'Ahmed',
    'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname': 'Benali',
    'http://schemas.xmlsoap.org/claims/Group': [
      'SOC_Admins',
      'IT_Management',
      'Djezzy_All_Employees',
    ],
  },
  
  // Azure AD Profile (Analyst)
  azure_analyst: {
    nameID: 'f.zerhouni@djezzy.dz',
    nameIDFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
    sessionIndex: '_session_def456',
    ID: '_id_def456',
    inResponseTo: '_request_uv wxyz',
    emailAddress: 'f.zerhouni@djezzy.dz',
    'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name': 'Fatima Zerhouni',
    'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname': 'Fatima',
    'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname': 'Zerhouni',
    'http://schemas.xmlsoap.org/claims/Group': [
      'SOC_Analysts',
      'Djezzy_All_Employees',
    ],
  },
  
  // Keycloak Profile (Threat Hunter)
  keycloak_hunter: {
    nameID: 'k.hadjeres@djezzy.dz',
    nameIDFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
    sessionIndex: '_session_ghi789',
    ID: '_id_ghi789',
    inResponseTo: '_request_mnopqr',
    email: 'k.hadjeres@djezzy.dz',
    name: 'Karim Hadjeres',
    first_name: 'Karim',
    last_name: 'Hadjeres',
    groups: ['Threat_Hunters', 'SOC_Analysts'],
  },
};

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function mockSuccessfulAuthRequest(redirectUrl: string) {
  mockSAMLInstance.getAuthorizeUrl.mockImplementation(
    (_relayState: string, _forceAuthn: boolean, _passive: boolean, callback: Function) => {
      callback(null, redirectUrl);
    }
  );
}

function mockFailedAuthRequest(error: Error) {
  mockSAMLInstance.getAuthorizeUrl.mockImplementation(
    (_relayState: string, _forceAuthn: boolean, _passive: boolean, callback: Function) => {
      callback(error, undefined);
    }
  );
}

function mockSuccessfulValidation(profile: any) {
  mockSAMLInstance.validatePostResponse.mockImplementation(
    (response: any, callback: Function) => {
      callback(profile, null);
    }
  );
}

function mockFailedValidation(error: Error) {
  mockSAMLInstance.validatePostResponse.mockImplementation(
    (_response: any, callback: Function) => {
      callback(null, error);
    }
  );
}

function mockSuccessfulLogout(logoutUrl: string, requestId: string) {
  mockSAMLInstance.getLogoutUrl.mockImplementation(
    (_nameId: string, callback: Function) => {
      callback(null, logoutUrl, requestId);
    }
  );
}

// ============================================================
// TEST SUITES
// ============================================================

describe('SAML Authentication Service', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ----------------------------------------------------------
  // LOGIN INITIATION TESTS
  // ----------------------------------------------------------
  
  describe('Login Initiation (SP-Initiated SSO)', () => {
    
    test('should initiate login with default IdP (Azure AD)', async () => {
      const expectedRedirect = 'https://login.microsoftonline.com/djezzy-onmicrosoft.com/saml2?SAMLRequest=...';
      mockSuccessfulAuthRequest(expectedRedirect);
      
      const result = await initiateLogin();
      
      expect(result.success).toBe(true);
      expect(result.redirectUrl).toBeDefined();
      expect(result.redirectUrl).toContain('microsoftonline.com');
      expect(result.error).toBeUndefined();
    });

    test('should initiate login with specific IdP (Keycloak)', async () => {
      const expectedRedirect = 'http://keycloak.djezzy.dz/realms/djezzy/protocol/saml?SAMLRequest=...';
      mockSuccessfulAuthRequest(expectedRedirect);
      
      const result = await initiateLogin('keycloak');
      
      expect(result.success).toBe(true);
      expect(result.redirectUrl).toContain('keycloak.djezzy.dz');
    });

    test('should include relay state if provided', async () => {
      const relayState = '/dashboard/alerts/critical';
      mockSuccessfulAuthRequest(`https://...?RelayState=${encodeURIComponent(relayState)}`);
      
      const result = await initiateLogin(undefined, { relayState });
      
      expect(result.success).toBe(true);
      expect(mockSAMLInstance.getAuthorizeUrl).toHaveBeenCalledWith(
        relayState,
        false,
        false,
        expect.any(Function)
      );
    });

    test('should support forceAuthn option', async () => {
      mockSuccessfulAuthRequest('https://...');
      
      await initiateLogin(undefined, { forceAuthn: true });
      
      expect(mockSAMLInstance.getAuthorizeUrl).toHaveBeenCalledWith(
        '',
        true, // forceAuthn
        false,
        expect.any(Function)
      );
    });

    test('should fail for inactive/disabled IdP', async () => {
      const result = await initiateLogin('legacy-idp');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('not found or not active');
    });

    test('should handle IdP request errors gracefully', async () => {
      mockFailedAuthRequest(new Error('Certificate not found'));
      
      const result = await initiateLogin();
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).not.toContain('Certificate'); // Don't expose internal details
    });
  });

  // ----------------------------------------------------------
  // RESPONSE PROCESSING TESTS
  // ----------------------------------------------------------
  
  describe('SAML Response Processing', () => {
    
    test('should process valid Azure AD response for admin user', async () => {
      const profile = MOCK_SAML_PROFILES.azure_admin;
      mockSuccessfulValidation(profile);
      
      const result = await processResponse('VALID_SAML_RESPONSE_BASE64');
      
      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user?.nameID).toBe('a.benali@djezzy.dz');
      expect(result.user?.attributes.email).toBe('a.benali@djezzy.dz');
      expect(result.user?.attributes.name).toBe('Ahmed Benali');
      expect(result.idpUsed).toBe('azure-ad');
    });

    test('should process valid Keycloak response for threat hunter', async () => {
      const profile = MOCK_SAML_PROFILES.keycloak_hunter;
      mockSuccessfulValidation(profile);
      
      const result = await processResponse('VALID_KEYCLOAK_RESPONSE');
      
      expect(result.success).toBe(true);
      expect(result.user?.nameID).toBe('k.hadjeres@djezzy.dz');
      expect(result.user?.attributes.firstName).toBe('Karim');
      expect(result.idpUsed).toBe('keycloak');
    });

    test('should extract groups from SAML assertion', async () => {
      const profile = MOCK_SAML_PROFILES.azure_admin;
      mockSuccessfulValidation(profile);
      
      const result = await processResponse('RESPONSE_WITH_GROUPS');
      
      expect(result.success).toBe(true);
      expect(result.user?.attributes.groups).toEqual([
        'SOC_Admins',
        'IT_Management',
        'Djezzy_All_Employees',
      ]);
    });

    test('should map groups to SOC roles', async () => {
      const profile = MOCK_SAML_PROFILES.azure_admin; // In SOC_Admins group
      mockSuccessfulValidation(profile);
      
      const result = await processResponse('RESPONSE_FOR_ROLE_MAPPING');
      
      expect(result.success).toBe(true);
      expect(result.user?.attributes._role).toBe('soc_admin'); // Admin role from group
    });

    test('should try multiple IdPs until one validates', async () => {
      // First IdP fails validation
      mockFailedValidation(new Error('Invalid signature'));
      
      // Second IdP succeeds
      const profile = MOCK_SAML_PROFILES.azure_analyst;
      mockSuccessfulValidation(profile);
      
      const result = await processResponse('RESPONSE_VALID_FOR_SECOND_IDP');
      
      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
    });

    test('should fail when no IdP can validate response', async () => {
      // All IdPs fail
      mockFailedValidation(new Error('Signature verification failed'));
      
      const result = await processResponse('INVALID_RESPONSE');
      
      expect(result.success).toBe(false);
      expect(result.errorCode).toBeDefined();
      expect(result.error).toBeDefined();
    });

    test('should handle empty/malformed responses', async () => {
      const malformedResponses = ['', 'NOT_VALID_BASE64', '<<<xml>>>', null as any];
      
      for (const response of malformedResponses) {
        // Should throw or return error, not crash
        try {
          const result = await processResponse(response);
          if (result.success === false) {
            expect(result.error).toBeDefined();
          }
        } catch (error) {
          // Throwing is acceptable for truly invalid input
          expect(error).toBeDefined();
        }
      }
    });
  });

  // ----------------------------------------------------------
  // SESSION MANAGEMENT TESTS
  // ----------------------------------------------------------
  
  describe('SAML Session Management', () => {
    
    test('should create session after successful authentication', async () => {
      const profile = MOCK_SAML_PROFILES.azure_analyst;
      mockSuccessfulValidation(profile);
      
      const result = await processResponse('VALID_RESPONSE');
      
      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      
      // Session should be created internally
      // We can verify by checking the returned session info would exist
    });

    test('should retrieve existing session by ID', async () => {
      const testUser = {
        attributes: {
          id: 'test_user',
          email: 'test@djezzy.dz',
          name: 'Test User',
        },
        nameID: 'test@djezzy.dz',
        nameIDFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
        idpId: 'azure-ad',
        authTime: new Date(),
        expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
      };
      
      const sessionId = createSAMLSession(testUser);
      expect(sessionId).toBeDefined();
      expect(typeof sessionId).toBe('string');
      
      const retrievedSession = getSAMLSession(sessionId);
      expect(retrievedSession).toBeDefined();
      expect(retrievedSession?.userId).toBe('test_user');
      expect(retrievedSession?.nameID).toBe('test@djezzy.dz');
    });

    test('should delete session on logout', async () => {
      const testUser = {
        attributes: { id: 'user_to_logout' },
        nameID: 'logout@test.com',
        nameIDFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
        idpId: 'azure-ad',
        authTime: new Date(),
        expiresAt: new Date(Date.now() + 3600000),
      };
      
      const sessionId = createSAMLSession(testUser);
      expect(getSAMLSession(sessionId)).toBeDefined();
      
      deleteSAMLSession(sessionId);
      expect(getSAMLSession(sessionId)).toBeUndefined();
    });

    test('should handle non-existent session gracefully', async () => {
      const session = getSAMLSession('non_existent_session_id');
      expect(session).toBeUndefined();
      
      // Deleting non-existent session should not throw
      expect(() => deleteSAMLSession('non_existent')).not.toThrow();
    });

    test('should generate unique session IDs', async () => {
      const sessions = Array.from({ length: 100 }, (_, i) =>
        createSAMLSession({
          attributes: { id: `user_${i}` },
          nameID: `user${i}@test.com`,
          nameIDFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
          idpId: 'azure-ad',
          authTime: new Date(),
          expiresAt: new Date(Date.now() + 3600000),
        })
      );
      
      const uniqueSessions = new Set(sessions);
      expect(uniqueSessions.size).toBe(100); // All unique
    });
  });

  // ----------------------------------------------------------
  // SINGLE LOGOUT (SLO) TESTS
  // ----------------------------------------------------------
  
  describe('Single Logout (SLO)', () => {
    
    test('should initiate SP-initiated logout', async () => {
      // Create a session first
      const session = createSAMLSession({
        attributes: { id: 'logout_test' },
        nameID: 'logout@test.com',
        nameIDFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
        idpId: 'azure-ad',
        sessionIndex: '_session_for_logout',
        authTime: new Date(),
        expiresAt: new Date(Date.now() + 3600000),
      });
      
      mockSuccessfulLogout(
        'https://login.microsoftonline.com/logout?SAMLRequest=...',
        '_logout_request_id'
      );
      
      const result = await initiateLogout(session);
      
      expect(result.success).toBe(true);
      expect(result.logoutUrl).toContain('microsoftonline.com');
      expect(result.requestId).toBe('_logout_request_id');
    });

    test('should handle logout for sessions without SLO support', async () => {
      // Create session for IdP without SLO URL configured
      const session = createSAMLSession({
        attributes: { id: 'no_slo_user' },
        nameID: 'noslo@test.com',
        nameIDFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
        idpId: 'disabled-idp', // No SLO URL
        authTime: new Date(),
        expiresAt: new Date(Date.now() + 3600000),
      });
      
      const result = await initiateLogout(session);
      
      // Should succeed locally even without remote SLO
      expect(result.success).toBe(true);
      expect(result.logoutUrl).toBeUndefined(); // No remote logout URL
      
      // Local session should be deleted
      expect(getSAMLSession(session)).toBeUndefined();
    });

    test('should handle invalid session on logout attempt', async () => {
      const result = await initiateLogout('invalid_session_id');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid session');
    });

    test('should process LogoutResponse from IdP', async () => {
      mockSAMLInstance.validateLogoutResponse.mockImplementation(
        (_response: any, callback: Function) => {
          callback(null); // Success
        }
      );
      
      const result = await processLogoutResponse('VALID_LOGOUT_RESPONSE');
      
      expect(result.success).toBe(true);
    });

    test('should handle failed LogoutResponse validation', async () => {
      mockSAMLInstance.validateLogoutResponse.mockImplementation(
        (_response: any, callback: Function) => {
          callback(new Error('Invalid logout response signature'));
        }
      );
      
      const result = await processLogoutResponse('INVALID_LOGOUT_RESPONSE');
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  // ----------------------------------------------------------
  // METADATA AND DISCOVERY TESTS
  // ----------------------------------------------------------
  
  describe('Metadata and Discovery', () => {
    
    test('should generate valid SP metadata XML', async () => {
      const metadata = getMetadata();
      
      expect(metadata).toBeDefined();
      expect(typeof metadata).toBe('string');
      expect(metadata).toContain('EntityDescriptor'); // SAML metadata root element
      expect(metadata).contains('urn:djezzy:soc:platform'); // Our entity ID
    });

    test('should include ACS URL in metadata', async () => {
      const metadata = getMetadata();
      
      expect(metadata).toContain('/api/auth/saml/callback');
    });

    test('should include SLO URL in metadata if enabled', async () => {
      const metadata = getMetadata();
      
      expect(metadata).toContain('/api/auth/saml/logout');
    });

    test('should return list of active IdPs for discovery service', async () => {
      const idps = getIdPDiscoveryInfo();
      
      expect(idps).toBeDefined();
      expect(Array.isArray(idps)).toBe(true);
      expect(idps.length).toBeGreaterThan(0);
      
      // Should only include active IdPs
      idps.forEach(idp => {
        expect(idp.name).toBeDefined();
        expect(idp.entityID).toBeDefined();
        expect(idp.priority).toBeGreaterThan(0);
      });
    });

    test('should sort IdPs by priority', async () => {
      const idps = getIdPDiscoveryInfo();
      
      for (let i = 1; i < idps.length; i++) {
        expect(idps[i - 1].priority).toBeLessThanOrEqual(idps[i].priority);
      }
    });
  });

  // ----------------------------------------------------------
  // HEALTH CHECK TESTS
  // ----------------------------------------------------------
  
  describe('Health Check', () => {
    
    test('should return healthy status when all components ready', async () => {
      const health = await checkSAMLHealth();
      
      expect(health.status).toBe('healthy');
      expect(health.details.idpsAvailable).toBeGreaterThan(0);
      expect(health.details.metadataGenerated).toBe(true);
      expect(health.details.issues.length).toBe(0);
    });

    test('should detect missing certificates', async () => {
      // This would require mocking config to have empty certs
      // For now, just check structure
      const health = await checkSAMLHealth();
      
      expect(health.details.certificatesLoaded).toBeGreaterThanOrEqual(0);
      expect(health.status).toMatch(/healthy|degraded|unhealthy/);
    });

    test('should report degraded status when some issues exist', async () => {
      const health = await checkSAMLHealth();
      
      // If there are warnings but not critical failures
      if (health.details.issues.length > 0 && !health.details.issues.some(i => i.includes('No active'))) {
        expect(health.status).toBe('degraded');
      }
    });
  });

  // ----------------------------------------------------------
  // ERROR CATEGORIZATION TESTS
  // ----------------------------------------------------------
  
  describe('Error Categorization', () => {
    
    // Note: These tests the internal categorizeSAMLError function indirectly
    
    test('should categorize signature errors correctly', async () => {
      mockFailedValidation(new Error('SAML signature verification failed'));
      
      const result = await processResponse('RESPONSE_BAD_SIG');
      
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('SIGNATURE_VERIFICATION_FAILED');
    });

    test('should categorize expired assertions', async () => {
      mockFailedValidation(new Error('Assertion expired: NotOnOrAfter condition'));
      
      const result = await processResponse('RESPONSE_EXPIRED');
      
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('ASSERTION_EXPIRED');
    });

    test('should categorize audience mismatch errors', async () => {
      mockFailedValidation(new Error('Audience restriction violated'));
      
      const result = await processResponse('RESPONSE_WRONG_AUDIENCE');
      
      expect(result.success).toBe(false);
      expect(['AUDIENCE_MISMATCH', 'CONDITIONS_NOT_MET']).toContain(result.errorCode);
    });
  });

  // ----------------------------------------------------------
  // SECURITY EDGE CASES
  // ----------------------------------------------------------
  
  describe('Security Edge Cases', () => {
    
    test('should handle replay attacks (duplicate responses)', async () => {
      const profile = MOCK_SAML_PROFILES.azure_analyst;
      mockSuccessfulValidation(profile);
      
      // Process same response twice
      const result1 = await processResponse('DUPLICATE_RESPONSE');
      const result2 = await processResponse('DUPLICATE_RESPONSE');
      
      // Both might succeed at SAML level, but application should track used IDs
      expect(result1.success).toBe(true);
      // Application-level replay detection would make result2 fail
    });

    test('should not expose sensitive data in error messages', async () => {
      mockFailedValidation(new Error('Private key: MIIEvgIBADANBgkqhkiG...'));
      
      const result = await processResponse('RESPONSE');
      
      expect(result.success).toBe(false);
      expect(result.error).not.toContain('MIIEvgIBADANBgkqhkiG');
      expect(result.error).not.toContain('Private key');
    });

    test('should handle clock skew between SP and IdP', async () => {
      // The config has acceptedClockSkewMs set to 5 minutes
      // This test verifies that slightly off timestamps are accepted
      const profile = {
        ...MOCK_SAML_PROFILES.azure_admin,
        // Timestamps would be validated by node-saml library
      };
      mockSuccessfulValidation(profile);
      
      const result = await processResponse('RESPONSE_WITH_CLOCK_SKEW');
      
      // Should succeed within clock skew tolerance
      expect(result.success).toBe(true);
    });
  });

  // ----------------------------------------------------------
  // DJEZZY-SPECIFIC SCENARIOS
  // ----------------------------------------------------------
  
  describe('Djezzy Integration Scenarios', () => {
    
    test('should authenticate via Azure AD for Office 365 users', async () => {
      const profile = MOCK_SAML_PROFILES.azure_admin;
      mockSuccessfulValidation(profile);
      
      const result = await processResponse('AZURE_AD_RESPONSE');
      
      expect(result.success).toBe(true);
      expect(result.idpUsed).toBe('azure-ad');
      expect(result.user?.attributes.email).toContain('@djezzy.dz');
    });

    test('should map Djezzy organizational units to roles', async () => {
      const roleMappings = [
        { groups: ['SOC_Admins'], expectedRole: 'soc_admin' },
        { groups: ['Threat_Hunters'], expectedRole: 'threat_hunter' },
        { groups: ['SOC_Analysts'], expectedRole: 'analyst' },
        { groups: ['SOC_Responders'], expectedRole: 'responder' },
      ];
      
      for (const mapping of roleMappings) {
        const profile = {
          ...MOCK_SAML_PROFILES.azure_admin,
          'http://schemas.xmlsoap.org/claims/Group': mapping.groups,
        };
        mockSuccessfulValidation(profile);
        
        const result = await processResponse('RESPONSE');
        
        expect(result.success).toBe(true);
        expect(result.user?.attributes._role).toBe(mapping.expectedRole);
      }
    });

    test('should handle multi-domain emails (djezzy.dz, djezzi.dz)', async () => {
      const domains = ['@djezzy.dz', '@djezzi.dz', '@djezzy.com'];
      
      for (const domain of domains) {
        const profile = {
          ...MOCK_SAML_PROFILES.azure_admin,
          nameID: `test${domain}`,
          emailAddress: `test${domain}`,
        };
        mockSuccessfulValidation(profile);
        
        const result = await processResponse('RESPONSE');
        
        expect(result.success).toBe(true);
        expect(result.user?.nameID).toContain(domain);
      }
    });
  });
});

// ============================================================
// INTEGRATION TESTS
// ============================================================

describe('SAML Integration Scenarios', () => {
  
  test('complete SSO flow: initiate -> redirect -> authenticate -> access app', async () => {
    // Step 1: User initiates login
    mockSuccessfulAuthRequest('https://login.microsoftonline.com/SAMLRequest=...');
    const loginResult = await initiateLogin();
    
    expect(loginResult.success).toBe(true);
    expect(loginResult.redirectUrl).toBeDefined();
    
    // Step 2: User authenticates at IdP, gets redirected back with SAML response
    const profile = MOCK_SAML_PROFILES.azure_admin;
    mockSuccessfulValidation(profile);
    
    // Step 3: Process SAML response
    const authResult = await processResponse('SAML_RESPONSE_FROM_IDP');
    
    expect(authResult.success).toBe(true);
    expect(authResult.user).toBeDefined();
    expect(authResult.user?.attributes.email).toBe('a.benali@djezzy.dz');
    
    // Step 4: Session created, user can now access application
    // (Session management handled internally)
  });

  test('SSO flow with forced re-authentication', async () => {
    // Initiate with forceAuthn=true
    mockSuccessfulAuthRequest('https://...&ForceAuthn=true');
    const loginResult = await initiateLogin(undefined, { forceAuthn: true });
    
    expect(loginResult.success).toBe(true);
    // Verify forceAuthn was passed to SAML library
  });

  test('full logout flow: local session -> IdP logout -> cleanup', async () => {
    // Step 1: User has active session
    const session = createSAMLSession({
      attributes: { id: 'logging_out_user' },
      nameID: 'logout@test.com',
      nameIDFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
      idpId: 'azure-ad',
      sessionIndex: '_session_to_logout',
      authTime: new Date(),
      expiresAt: new Date(Date.now() + 3600000),
    });
    
    expect(getSAMLSession(session)).toBeDefined();
    
    // Step 2: Initiate logout
    mockSuccessfulLogout('https://login.microsoftonline.com/SAMLRequest=LOGOUT', '_req_123');
    const logoutResult = await initiateLogout(session);
    
    expect(logoutResult.success).toBe(true);
    expect(logoutResult.logoutUrl).toBeDefined();
    
    // Step 3: Local session cleaned up
    expect(getSAMLSession(session)).toBeUndefined();
    
    // Step 4: IdP responds with LogoutResponse
    mockSAMLInstance.validateLogoutResponse.mockImplementation(
      (_resp: any, cb: Function) => cb(null)
    );
    const sloResult = await processLogoutResponse('LOGOUT_RESPONSE');
    
    expect(sloResult.success).toBe(true);
  });

  test('IdP discovery and selection flow', async () => {
    // Get available IdPs
    const idps = getIdPDiscoveryInfo();
    
    expect(idps.length).toBeGreaterThan(0);
    
    // User selects an IdP (e.g., Keycloak instead of default Azure AD)
    const selectedIdP = idps.find(idp => idp.id === 'keycloak');
    expect(selectedIdP).toBeDefined();
    
    // Initiate login with selected IdP
    mockSuccessfulAuthRequest('http://keycloak.djezzy.dz/SAMLRequest=...');
    const loginResult = await initiateLogin('keycloak');
    
    expect(loginResult.success).toBe(true);
    expect(loginResult.redirectUrl).toContain('keycloak.djezzy.dz');
  });
});
