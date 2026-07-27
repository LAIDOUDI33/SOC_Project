/**
 * National SOC Platform - JWT Authentication Tests
 * 
 * Comprehensive test suite for JWT token management:
 * - Token generation and validation
 * - Access and refresh token flows
 * - Token rotation and expiry
 * - Security edge cases
 * - Error handling
 */

import { SignJWT, jwtVerify } from 'jose';

// ============================================================
// TEST CONFIGURATION
// ============================================================

const TEST_CONFIG = {
  // Use consistent secrets for testing (not production values)
  accessSecret: new TextEncoder().encode('test_jwt_access_secret_256bit_minimum_for_testing_only'),
  refreshSecret: new TextEncoder().encode('test_jwt_refresh_secret_256bit_minimum_for_testing_only'),
  issuer: 'Djezzy-National-SOC-Platform-Test',
  audience: 'https://soc.djezzy.dz/test',
  accessTokenExpiry: '15m',
  refreshTokenExpiry: '7d',
};

interface JWTPayload {
  sub: string;
  email: string;
  username: string;
  role: string;
  permissions: string[];
  iat?: number;
  exp?: number;
}

// ============================================================
// HELPER FUNCTIONS (Mirror production code)
// ============================================================

async function generateAccessToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(TEST_CONFIG.accessTokenExpiry)
    .setIssuer(TEST_CONFIG.issuer)
    .setAudience(TEST_CONFIG.audience)
    .sign(TEST_CONFIG.accessSecret);
}

async function generateRefreshToken(
  userId: string, 
  tokenVersion: number = 1
): Promise<string> {
  return new SignJWT({
    sub: userId,
    type: 'refresh',
    version: tokenVersion,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(TEST_CONFIG.refreshTokenExpiry)
    .setIssuer(TEST_CONFIG.issuer)
    .setAudience(TEST_CONFIG.audience)
    .sign(TEST_CONFIG.refreshSecret);
}

async function verifyAccessToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, TEST_CONFIG.accessSecret, {
      issuer: TEST_CONFIG.issuer,
      audience: TEST_CONFIG.audience,
    });
    return payload as unknown as JWTPayload;
  } catch (error) {
    return null;
  }
}

async function verifyRefreshToken(token: string): Promise<{
  sub: string;
  type: string;
  version: number;
} | null> {
  try {
    const { payload } = await jwtVerify(token, TEST_CONFIG.refreshSecret, {
      issuer: TEST_CONFIG.issuer,
      audience: TEST_CONFIG.audience,
    });
    return payload as unknown as { sub: string; type: string; version: number };
  } catch (error) {
    return null;
  }
}

// ============================================================
// TEST SUITES
// ============================================================

describe('JWT Authentication System', () => {
  
  // ----------------------------------------------------------
  // TOKEN GENERATION TESTS
  // ----------------------------------------------------------
  
  describe('Access Token Generation', () => {
    
    test('should generate valid access token with required claims', async () => {
      const payload = {
        sub: 'user_123',
        email: 'analyst@djezzy.dz',
        username: 'jsmith',
        role: 'analyst',
        permissions: ['alerts:read', 'cases:read'],
      };
      
      const token = await generateAccessToken(payload);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    test('should include correct issuer in token', async () => {
      const payload = {
        sub: 'user_123',
        email: 'admin@djezzy.dz',
        username: 'admin',
        role: 'soc_admin',
        permissions: ['*'],
      };
      
      const token = await generateAccessToken(payload);
      const decoded = await verifyAccessToken(token);
      
      // Verify via decode (we can't directly check header without library)
      expect(decoded).not.toBeNull();
    });

    test('should include user identity in token payload', async () => {
      const payload = {
        sub: 'user_456',
        email: 'hunter@djezzy.dz',
        username: 'jhunter',
        role: 'threat_hunter',
        permissions: ['threats:read', 'hunts:execute'],
      };
      
      const token = await generateAccessToken(payload);
      const decoded = await verifyAccessToken(token);
      
      expect(decoded?.sub).toBe('user_456');
      expect(decoded?.email).toBe('hunter@djezzy.dz');
      expect(decoded?.username).toBe('jhunter');
      expect(decoded?.role).toBe('threat_hunter');
    });

    test('should include permissions array in token', async () => {
      const permissions = [
        'alerts:read',
        'alerts:write',
        'cases:read',
        'cases:write',
        'playbooks:execute',
      ];
      
      const token = await generateAccessToken({
        sub: 'user_789',
        email: 'responder@djezzy.dz',
        username: 'mresponder',
        role: 'responder',
        permissions,
      });
      
      const decoded = await verifyAccessToken(token);
      expect(decoded?.permissions).toEqual(permissions);
      expect(decoded?.permissions.length).toBe(5);
    });
  });

  describe('Refresh Token Generation', () => {
    
    test('should generate valid refresh token', async () => {
      const token = await generateRefreshToken('user_123');
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });

    test('should include user ID in refresh token', async () => {
      const token = await generateRefreshToken('user_abc');
      const decoded = await verifyRefreshToken(token);
      
      expect(decoded?.sub).toBe('user_abc');
      expect(decoded?.type).toBe('refresh');
    });

    test('should include token version for rotation support', async () => {
      const token = await generateRefreshToken('user_123', 5);
      const decoded = await verifyRefreshToken(token);
      
      expect(decoded?.version).toBe(5);
    });

    test('should use different secret than access token', async () => {
      const payload = {
        sub: 'user_123',
        email: 'test@djezzy.dz',
        username: 'test',
        role: 'analyst',
        permissions: [],
      };
      
      const accessToken = await generateAccessToken(payload);
      const refreshToken = await generateRefreshToken('user_123');
      
      // Access token should not validate with refresh secret
      const verifiedWithRefresh = await verifyRefreshToken(accessToken);
      expect(verifiedWithRefresh).toBeNull();
      
      // Refresh token should not validate with access secret
      const verifiedWithAccess = await verifyAccessToken(refreshToken);
      expect(verifiedWithAccess).toBeNull();
    });
  });

  // ----------------------------------------------------------
  // TOKEN VERIFICATION TESTS
  // ----------------------------------------------------------
  
  describe('Access Token Verification', () => {
    
    test('should verify valid token successfully', async () => {
      const payload = {
        sub: 'user_123',
        email: 'valid@test.com',
        username: 'validuser',
        role: 'analyst',
        permissions: ['read'],
      };
      
      const token = await generateAccessToken(payload);
      const decoded = await verifyAccessToken(token);
      
      expect(decoded).not.toBeNull();
      expect(decoded?.sub).toBe('user_123');
      expect(decoded?.email).toBe('valid@test.com');
    });

    test('should reject tampered token', async () => {
      const payload = {
        sub: 'user_123',
        email: 'original@test.com',
        username: 'original',
        role: 'analyst',
        permissions: [],
      };
      
      const token = await generateAccessToken(payload);
      
      // Tamper with the token (modify payload part)
      const parts = token.split('.');
      const payloadDecoded = JSON.parse(atob(parts[1]));
      payloadDecoded.role = 'soc_admin'; // Try to escalate privileges
      parts[1] = btoa(JSON.stringify(payloadDecoded));
      const tamperedToken = parts.join('.');
      
      const decoded = await verifyAccessToken(tamperedToken);
      expect(decoded).toBeNull(); // Should fail signature verification
    });

    test('should reject empty token', async () => {
      const decoded = await verifyAccessToken('');
      expect(decoded).toBeNull();
    });

    test('should reject malformed token', async () => {
      const malformedTokens = [
        'not.a.jwt',
        'invalid.token.here.extra',
        'aaaa.bbbb.cccc',
        '',
        'Bearer token',
      ];
      
      for (const token of malformedTokens) {
        const decoded = await verifyAccessToken(token);
        expect(decoded).toBeNull();
      }
    });

    test('should reject token signed with wrong secret', async () => {
      const wrongSecret = new TextEncoder().encode('wrong_secret_key_256bit');
      const payload = {
        sub: 'user_123',
        email: 'test@test.com',
        username: 'test',
        role: 'analyst',
        permissions: [],
      };
      
      // Sign with wrong secret
      const token = await new SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('15m')
        .setIssuer(TEST_CONFIG.issuer)
        .setAudience(TEST_CONFIG.audience)
        .sign(wrongSecret);
      
      // Verify with correct secret should fail
      const decoded = await verifyAccessToken(token);
      expect(decoded).toBeNull();
    });
  });

  describe('Refresh Token Verification', () => {
    
    test('should verify valid refresh token', async () => {
      const token = await generateRefreshToken('user_123', 1);
      const decoded = await verifyRefreshToken(token);
      
      expect(decoded).not.toBeNull();
      expect(decoded?.sub).toBe('user_123');
      expect(decoded?.version).toBe(1);
    });

    test('should detect token version mismatch for rotation', async () => {
      const currentVersion = 5;
      const storedVersion = 3; // User's stored version is older
      
      const token = await generateRefreshToken('user_123', currentVersion);
      const decoded = await verifyRefreshToken(token);
      
      // Token is valid but version indicates possible reuse attack
      expect(decoded).not.toBeNull();
      if (decoded) {
        const isVersionValid = decoded.version > storedVersion;
        expect(isVersionValid).toBe(true); // Newer version is valid
      }
    });

    test('should reject expired refresh token', async () => {
      // Create token that expires immediately
      const expiredToken = await new SignJWT({
        sub: 'user_123',
        type: 'refresh',
        version: 1,
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('0s') // Expired
        .setIssuer(TEST_CONFIG.issuer)
        .setAudience(TEST_CONFIG.audience)
        .sign(TEST_CONFIG.refreshSecret);
      
      const decoded = await verifyRefreshToken(expiredToken);
      expect(decoded).toBeNull();
    });
  });

  // ----------------------------------------------------------
  // SECURITY EDGE CASES
  // ----------------------------------------------------------
  
  describe('Security Edge Cases', () => {
    
    test('should handle special characters in user data', async () => {
      const specialCases = [
        { email: 'user+tag@djezzy.dz', username: 'user_with_underscore' },
        { email: "o'brien@djezzy.dz", username: "obrien" },
        { email: '用户@测试.dz', username: 'chinese_user' },
        { email: 'admin@djezzy.dz', username: '<script>alert(1)</script>' },
      ];
      
      for (const userData of specialCases) {
        const token = await generateAccessToken({
          sub: 'special_user',
          ...userData,
          role: 'viewer',
          permissions: [],
        });
        
        const decoded = await verifyAccessToken(token);
        expect(decoded).not.toBeNull();
        expect(decoded?.email).toBe(userData.email);
      }
    });

    test('should handle large permission arrays', async () => {
      const manyPermissions = Array.from({ length: 100 }, (_, i) => `permission:${i}`);
      
      const token = await generateAccessToken({
        sub: 'super_admin',
        email: 'super@djezzy.dz',
        username: 'super',
        role: 'soc_admin',
        permissions: manyPermissions,
      });
      
      const decoded = await verifyAccessToken(token);
      expect(decoded?.permissions).toHaveLength(100);
    });

    test('should handle concurrent token generation', async () => {
      const promises = Array.from({ length: 50 }, (_, i) =>
        generateAccessToken({
          sub: `user_${i}`,
          email: `user${i}@djezzy.dz`,
          username: `user${i}`,
          role: 'analyst',
          permissions: [],
        })
      );
      
      const tokens = await Promise.all(promises);
      
      // All tokens should be unique
      const uniqueTokens = new Set(tokens);
      expect(uniqueTokens.size).toBe(50);
      
      // All tokens should be valid
      for (const token of tokens) {
        const decoded = await verifyAccessToken(token);
        expect(decoded).not.toBeNull();
      }
    });

    test('should handle unicode in token payload', async () => {
      const payload = {
        sub: 'user_unicode',
        email: 'مستخدم@ديزي.دز',
        username: 'مستخدم_ديزي',
        role: 'analyst',
        permissions: ['القراءة', 'الكتابة'],
        displayName: 'مستخدم اختبار ديزي',
      };
      
      const token = await generateAccessToken(payload);
      const decoded = await verifyAccessToken(token);
      
      expect(decoded).not.toBeNull();
      expect(decoded?.email).toBe('مستخدم@ديزي.دز');
    });
  });

  // ----------------------------------------------------------
  // ROLE AND PERMISSION TESTS
  // ----------------------------------------------------------
  
  describe('Role-Based Access Control', () => {
    
    const SOC_ROLES = {
      soc_admin: { level: 100, permissions: ['*'] },
      threat_hunter: { level: 80, permissions: ['threats:*', 'hunts:*', 'alerts:*'] },
      analyst: { level: 60, permissions: ['alerts:read', 'cases:read', 'reports:read'] },
      responder: { level: 50, permissions: ['alerts:read', 'cases:write', 'playbooks:execute'] },
      telecom_engineer: { level: 70, permissions: ['telecom:*', 'probes:read'] },
      compliance_officer: { level: 55, permissions: ['compliance:*', 'reports:*'] },
      viewer: { level: 10, permissions: ['dashboard:read'] },
    };

    test('should encode SOC roles correctly', async () => {
      for (const [role, config] of Object.entries(SOC_ROLES)) {
        const token = await generateAccessToken({
          sub: `user_${role}`,
          email: `${role}@djezzy.dz`,
          username: role,
          role,
          permissions: config.permissions,
        });
        
        const decoded = await verifyAccessToken(token);
        expect(decoded?.role).toBe(role);
        expect(decoded?.permissions).toEqual(config.permissions);
      }
    });

    test('should support admin wildcard permission', async () => {
      const token = await generateAccessToken({
        sub: 'admin_1',
        email: 'admin@djezzy.dz',
        username: 'admin',
        role: 'soc_admin',
        permissions: ['*'],
      });
      
      const decoded = await verifyAccessToken(token);
      expect(decoded?.permissions).toContain('*');
    });

    test('should support resource-specific permissions', async () => {
      const token = await generateAccessToken({
        sub: 'hunter_1',
        email: 'hunter@djezzy.dz',
        username: 'hunter',
        role: 'threat_hunter',
        permissions: ['threats:read', 'threats:write', 'hunts:execute'],
      });
      
      const decoded = await verifyAccessToken(token);
      
      // Check specific permission exists
      expect(decoded?.permissions).toContain('threats:read');
      expect(decoded?.permissions).toContain('hunts:execute');
      
      // Check unrelated permission doesn't exist
      expect(decoded?.permissions).not.toContain('users:manage');
    });
  });

  // ----------------------------------------------------------
  // ERROR HANDLING TESTS
  // ----------------------------------------------------------
  
  describe('Error Handling', () => {
    
    test('should handle missing optional fields gracefully', async () => {
      const minimalPayload = {
        sub: 'minimal_user',
        email: 'minimal@test.com',
        username: 'minimal',
        role: 'viewer',
        permissions: [] as string[],
      };
      
      const token = await generateAccessToken(minimalPayload);
      const decoded = await verifyAccessToken(token);
      
      expect(decoded).not.toBeNull();
      expect(decoded?.sub).toBe('minimal_user');
    });

    test('should throw on invalid input types', async () => {
      const invalidPayloads = [
        { sub: '', email: 'test@test.com', username: 'test', role: 'viewer', permissions: [] },
        { sub: 123 as any, email: 'test@test.com', username: 'test', role: 'viewer', permissions: [] },
      ];
      
      for (const payload of invalidPayloads) {
        // Should either throw or produce invalid token
        try {
          const token = await generateAccessToken(payload);
          if (token) {
            const decoded = await verifyAccessToken(token);
            // Empty sub might still work but is invalid business logic
            if (payload.sub === '') {
              expect(decoded?.sub).toBe('');
            }
          }
        } catch (error) {
          // Throwing is also acceptable behavior
          expect(error).toBeDefined();
        }
      }
    });

    test('should handle very long user identifiers', async () => {
      const longId = 'a'.repeat(1000);
      
      const token = await generateAccessToken({
        sub: longId,
        email: 'long@test.com',
        username: 'longuser',
        role: 'viewer',
        permissions: [],
      });
      
      const decoded = await verifyAccessToken(token);
      expect(decoded?.sub).toBe(longId);
    });
  });
});

// ============================================================
// INTEGRATION-STYLE TESTS
// ============================================================

describe('JWT Authentication Flow Integration', () => {
  
  test('complete authentication flow: login -> access -> refresh -> logout', async () => {
    // Step 1: Simulate successful login - get both tokens
    const userId = 'flow_test_user';
    const userPayload = {
      sub: userId,
      email: 'flow@djezzy.dz',
      username: 'flowtest',
      role: 'analyst' as const,
      permissions: ['alerts:read', 'cases:read'],
    };
    
    const accessToken = await generateAccessToken(userPayload);
    const refreshToken = await generateRefreshToken(userId, 1);
    
    // Step 2: Verify access token works
    let accessPayload = await verifyAccessToken(accessToken);
    expect(accessPayload).not.toBeNull();
    expect(accessPayload?.sub).toBe(userId);
    
    // Step 3: Simulate token refresh
    const refreshPayload = await verifyRefreshToken(refreshToken);
    expect(refreshPayload).not.toBeNull();
    expect(refreshPayload?.sub).toBe(userId);
    
    // Step 4: Generate new access token (simulating refresh flow)
    const newAccessToken = await generateAccessToken({
      ...userPayload,
      sub: refreshPayload!.sub,
    });
    
    accessPayload = await verifyAccessToken(newAccessToken);
    expect(accessPayload).not.toBeNull();
    
    // Step 5: Verify old token still works until expiry (no invalidation in basic JWT)
    const oldPayload = await verifyAccessToken(accessToken);
    expect(oldPayload).not.toBeNull();
  });

  test('token rotation scenario: detect reused refresh token', async () => {
    const userId = 'rotation_test_user';
    
    // Initial login - version 1
    const originalRefreshToken = await generateRefreshToken(userId, 1);
    
    // Simulate refresh - issue new token with version 2
    const newRefreshToken = await generateRefreshToken(userId, 2);
    
    // Both tokens are cryptographically valid
    const originalDecoded = await verifyRefreshToken(originalRefreshToken);
    const newDecoded = await verifyRefreshToken(newRefreshToken);
    
    expect(originalDecoded).not.toBeNull();
    expect(newDecoded).not.toBeNull();
    
    // But application should check version against stored value
    // If stored version is 2, original token (v1) should be rejected
    const storedVersion = 2;
    const isOriginalTokenValid = originalDecoded!.version >= storedVersion;
    const isNewTokenValid = newDecoded!.version >= storedVersion;
    
    expect(isOriginalTokenValid).toBe(false); // Old token rejected
    expect(isNewTokenValid).toBe(true); // New token accepted
  });

  test('multiple sessions for same user', async () => {
    const userId = 'multi_session_user';
    
    // Create multiple sessions
    const session1 = {
      access: await generateAccessToken({
        sub: userId,
        email: 'session1@djezzy.dz',
        username: 'session1',
        role: 'analyst',
        permissions: [],
      }),
      refresh: await generateRefreshToken(userId, 1),
    };
    
    const session2 = {
      access: await generateAccessToken({
        sub: userId,
        email: 'session2@djezzy.dz',
        username: 'session2',
        role: 'analyst',
        permissions: [],
      }),
      refresh: await generateRefreshToken(userId, 2),
    };
    
    // Both sessions should be valid independently
    const session1Access = await verifyAccessToken(session1.access);
    const session2Access = await verifyAccessToken(session2.access);
    const session1Refresh = await verifyRefreshToken(session1.refresh);
    const session2Refresh = await verifyRefreshToken(session2.refresh);
    
    expect(session1Access).not.toBeNull();
    expect(session2Access).not.toBeNull();
    expect(session1Refresh).not.toBeNull();
    expect(session2Refresh).not.toBeNull();
    
    // Session 2 should have higher version
    expect(session2Refresh!.version).toBeGreaterThan(session1Refresh!.version);
  });
});

// Export helpers for potential reuse
export {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  TEST_CONFIG,
};
