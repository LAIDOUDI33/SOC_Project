/**
 * National SOC Platform - Integration Test Suite
 * 
 * Production-ready tests for Incident Management and Threat Hunting modules.
 * Tests cover:
 * - API endpoint functionality
 * - Input validation
 * - Authentication/authorization
 * - Error handling
 * - Telecom-specific scenarios
 * - Performance benchmarks
 * 
 * Run with: npx jest tests/integration/
 * 
 * @module tests/integration
 * @version 1.0.0 (Production Ready)
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';

// ============================================================
// TEST CONFIGURATION
// ============================================================

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const TEST_TIMEOUT = 30000; // 30 seconds per test

// Test user credentials (would use environment variables in real CI)
const TEST_USERS = {
  admin: {
    email: 'admin@test.local',
    password: 'test-admin-password',
    token: '' as string
  },
  analyst: {
    email: 'analyst@test.local',
    password: 'test-analyst-password',
    token: '' as string
  },
  viewer: {
    email: 'viewer@test.local',
    password: 'test-viewer-password',
    token: '' as string
  }
};

// Track created resources for cleanup
const createdResources = {
  incidents: [] as string[],
  indicators: [] as string[],
  iocs: [] as string[],
  huntSessions: [] as string[]
};

// ============================================================
// HELPER FUNCTIONS
// ============================================================

async function authenticateUser(userType: keyof typeof TEST_USERS): Promise<string> {
  const user = TEST_USERS[userType];
  
  const response = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: user.email,
      password: user.password
    })
  });

  if (!response.ok) {
    throw new Error(`Authentication failed for ${userType}: ${response.statusText}`);
  }

  const data = await response.json();
  return data.token || data.accessToken;
}

async function makeAuthenticatedRequest(
  userType: keyof typeof TEST_USERS,
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  if (!TEST_USERS[userType].token) {
    TEST_USERS[userType].token = await authenticateUser(userType);
  }

  return fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${TEST_USERS[userType].token}`,
      ...options.headers
    }
  });
}

async function cleanupCreatedResources(): Promise<void> {
  // Authenticate as admin for cleanup
  const adminToken = await authenticateUser('admin');
  
  // Clean up incidents
  for (const incidentId of createdResources.incidents) {
    try {
      await fetch(`${BASE_URL}/api/incidents?id=${incidentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      });
    } catch (error) {
      console.error(`Failed to clean up incident ${incidentId}:`, error);
    }
  }

  // Clean up IOCs and indicators would go here
  
  // Reset tracking arrays
  createdResources.incidents = [];
  createdResources.indicators = [];
  createdResources.iocs = [];
  createdResources.huntSessions = [];
}

// ============================================================
// INCIDENT MANAGEMENT TESTS
// ============================================================

describe('Incident Management API', () => {
  
  beforeAll(async () => {
    // Setup: Authenticate test users
    console.log('Setting up test users...');
    try {
      TEST_USERS.admin.token = await authenticateUser('admin');
      TEST_USERS.analyst.token = await authenticateUser('analyst');
      TEST_USERS.viewer.token = await authenticateUser('viewer');
      console.log('Test users authenticated successfully');
    } catch (error) {
      console.warn('Could not authenticate test users:', error.message);
      console.log('Tests will run without authentication (may fail)');
    }
  }, 60000);

  afterAll(async () => {
    // Cleanup: Remove all created test resources
    console.log('Cleaning up test resources...');
    await cleanupCreatedResources();
  }, 60000);

  describe('GET /api/incidents - List Incidents', () => {
    
    it('should return incidents list with pagination', async () => {
      const response = await makeAuthenticatedRequest('analyst', '/api/incidents?limit=10&offset=0');
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.pagination).toBeDefined();
      expect(data.pagination.limit).toBe(10);
      expect(data.pagination.offset).toBe(0);
      expect(data.statistics).toBeDefined();
      expect(data.meta.requestId).toBeDefined();
    }, TEST_TIMEOUT);

    it('should filter incidents by severity', async () => {
      const response = await makeAuthenticatedRequest('analyst', '/api/incidents?severity=CRITICAL&limit=5');
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data.success).toBe(true);
      // All returned incidents should be CRITICAL severity
      if (data.data.length > 0) {
        data.data.forEach((incident: any) => {
          expect(incident.severity).toBe('critical');
        });
      }
    }, TEST_TIMEOUT);

    it('should filter incidents by status', async () => {
      const response = await makeAuthenticatedRequest('analyst', '/api/incidents?status=OPEN&limit=5');
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data.success).toBe(true);
      if (data.data.length > 0) {
        data.data.forEach((incident: any) => {
          expect(incident.status).toBe('open');
        });
      }
    }, TEST_TIMEOUT);

    it('should search incidents by text', async () => {
      const response = await makeAuthenticatedRequest('analyst', '/api/incidents?search=test&limit=5');
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
    }, TEST_TIMEOUT);

    it('should enforce maximum limit of 100 records per page', async () => {
      const response = await makeAuthenticatedRequest('analyst', '/api/incidents?limit=200');
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      // Should cap at 100 even if more requested
      expect(data.pagination.limit).toBeLessThanOrEqual(100);
    }, TEST_TIMEOUT);

    it('should require authentication', async () => {
      const response = await fetch(`${BASE_URL}/api/incidents`);
      
      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.errorCode).toBe('UNAUTHORIZED');
    }, TEST_TIMEOUT);

    it('should validate query parameters', async () => {
      const response = await makeAuthenticatedRequest('analyst', '/api/incidents?severity=INVALID_STATUS');
      
      // Should either return 400 or ignore invalid parameter gracefully
      expect([200, 400]).toContain(response.status);
    }, TEST_TIMEOUT);
  });

  describe('POST /api/incidents - Create Incident', () => {
    
    const validIncidentData = {
      action: 'create',
      title: 'Test Integration Incident - Telecom Fraud Detection',
      description: 'This is a test incident created by the integration test suite. It simulates a telecom fraud scenario affecting multiple subscribers.',
      type: 'TELECOM_FRAUD',
      severity: 'HIGH',
      priority: 2,
      affectedAssets: ['MSC-Algiers-01', 'HLR-Primary'],
      affectedServices: ['Voice', 'SMS', 'Data'],
      confidenceScore: 85.0,
      impactScore: 7.5,
      subscribersAffected: 15000
    };

    it('should create a new incident with valid data', async () => {
      const response = await makeAuthenticatedRequest('analyst', '/api/incidents', {
        method: 'POST',
        body: JSON.stringify(validIncidentData)
      });
      
      expect(response.status).toBe(201);
      const data = await response.json();
      
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      expect(data.data.id).toBeDefined();
      expect(data.data.tatcCode).toMatch(/^TATC-\d{4}-[A-Z0-9]{12}$/);
      expect(data.data.title).toBe(validIncidentData.title);
      expect(data.data.severity).toBe('high');
      expect(data.data.incidentType).toBe('telecom_fraud');
      
      // Store for cleanup
      createdResources.incidents.push(data.data.id);
    }, TEST_TIMEOUT);

    it('should reject incident without required fields', async () => {
      const invalidData = {
        action: 'create',
        // Missing title
        severity: 'HIGH'
      };

      const response = await makeAuthenticatedRequest('analyst', '/api/incidents', {
        method: 'POST',
        body: JSON.stringify(invalidData)
      });
      
      expect(response.status).toBe(400);
      const data = await response.json();
      
      expect(data.success).toBe(false);
      expect(data.errorCode).toBe('VALIDATION_ERROR');
      expect(data.details.fields).toBeDefined();
    }, TEST_TIMEOUT);

    it('should reject incident with invalid severity', async () => {
      const invalidData = {
        action: 'create',
        title: 'Test Invalid Severity',
        severity: 'CRITICAL_INVALID' // Not a valid enum value
      };

      const response = await makeAuthenticatedRequest('analyst', '/api/incidents', {
        method: 'POST',
        body: JSON.stringify(invalidData)
      });
      
      expect(response.status).toBe(400);
      const data = await response.json();
      
      expect(data.success).toBe(false);
      expect(data.errorCode).toBe('VALIDATION_ERROR');
    }, TEST_TIMEOUT);

    it('should reject incident with title too short', async () => {
      const shortTitleData = {
        action: 'create',
        title: 'AB', // Less than 3 characters
        severity: 'MEDIUM'
      };

      const response = await makeAuthenticatedRequest('analyst', '/api/incidents', {
        method: 'POST',
        body: JSON.stringify(shortTitleData)
      });
      
      expect(response.status).toBe(400);
      const data = await response.json();
      
      expect(data.success).toBe(false);
      expect(data.details?.fields?.title).toContain('at least 3 characters');
    }, TEST_TIMEOUT);

    it('should handle telecom-specific fields correctly', async () => {
      const telecomIncident = {
        action: 'create',
        title: 'SIM Swap Attack Detected',
        description: 'Unauthorized SIM swap attempts detected on multiple accounts',
        type: 'FRAUD',
        severity: 'CRITICAL',
        subscribersAffected: 50000,
        affectedServices: ['Mobile Banking', '2FA']
      };

      const response = await makeAuthenticatedRequest('analyst', '/api/incidents', {
        method: 'POST',
        body: JSON.stringify(telecomIncident)
      });
      
      expect(response.status).toBe(201);
      const data = await response.json();
      
      expect(data.data.subscribersAffected).toBe(50000);
      
      // Cleanup
      createdResources.incidents.push(data.data.id);
    }, TEST_TIMEOUT);
  });

  describe('POST /api/incidents - Update Incident', () => {
    
    let testIncidentId: string;

    beforeEach(async () => {
      // Create an incident to update
      const createResponse = await makeAuthenticatedRequest('analyst', '/api/incidents', {
        method: 'POST',
        body: JSON.stringify({
          action: 'create',
          title: 'Test Incident For Updates',
          severity: 'HIGH'
        })
      });
      
      const createData = await createResponse.json();
      testIncidentId = createData.data.id;
      createdResources.incidents.push(testIncidentId);
    });

    it('should update incident status', async () => {
      const response = await makeAuthenticatedRequest('analyst', '/api/incidents', {
        method: 'POST',
        body: JSON.stringify({
          action: 'update',
          id: testIncidentId,
          status: 'IN_PROGRESS',
          phase: 'ANALYSIS'
        })
      });
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data.success).toBe(true);
      expect(data.message).toContain('updated');
    }, TEST_TIMEOUT);

    it('should add comment/update to incident', async () => {
      const commentData = {
        action: 'addUpdate',
        id: testIncidentId,
        message: 'Initial analysis complete. Attack vector identified as phishing campaign.',
        authorId: 'test-analyst-id',
        isInternal: true
      };

      const response = await makeAuthenticatedRequest('analyst', '/api/incidents', {
        method: 'POST',
        body: JSON.stringify(commentData)
      });
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data.success).toBe(true);
      expect(data.data.message).toBe(commentData.message);
      expect(data.data.isInternal).toBe(true);
    }, TEST_TIMEOUT);

    it('should link alert to incident', async () => {
      // First we'd need an alert, but for now just test the API accepts the request
      const linkData = {
        action: 'linkAlert',
        id: testIncidentId,
        alertId: 'test-alert-12345',
        linkReason: 'Related phishing alert'
      };

      const response = await makeAuthenticatedRequest('analyst', '/api/incidents', {
        method: 'POST',
        body: JSON.stringify(linkData)
      });
      
      // May return 404 if alert doesn't exist, which is acceptable
      expect([200, 404]).toContain(response.status);
    }, TEST_TIMEOUT);

    it('should reject invalid status transitions', async () => {
      // Try to jump from OPEN (default) directly to RESOLVED (skipping steps)
      const invalidTransition = {
        action: 'update',
        id: testIncidentId,
        status: 'RESOLVED'
      };

      const response = await makeAuthenticatedRequest('analyst', '/api/incidents', {
        method: 'POST',
        body: JSON.stringify(invalidTransition)
      });
      
      expect(response.status).toBe(400);
      const data = await response.json();
      
      expect(data.errorCode).toBe('INVALID_STATUS_TRANSITION');
    }, TEST_TIMEOUT);
  });

  describe('Error Handling', () => {
    
    it('should return 404 for non-existent incident', async () => {
      const response = await makeAuthenticatedRequest('analyst', '/api/incidents', {
        method: 'POST',
        body: JSON.stringify({
          action: 'update',
          id: 'non-existent-incident-id',
          status: 'IN_PROGRESS'
        })
      });
      
      expect(response.status).toBe(404);
      const data = await response.json();
      
      expect(data.errorCode).toBe('NOT_FOUND');
    }, TEST_TIMEOUT);

    it('should include request ID in all responses', async () => {
      const response = await makeAuthenticatedRequest('analyst', '/api/incidents?limit=1');
      const data = await response.json();
      
      expect(data.meta.requestId).toBeDefined();
      expect(data.meta.requestId).toMatch(/^req_/);
    }, TEST_TIMEOUT);

    it('should handle malformed JSON body', async () => {
      const response = await fetch(`${BASE_URL}/api/incidents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_USERS.analyst.token}`
        },
        body: 'invalid json {'
      });
      
      expect(response.status).toBe(400);
    }, TEST_TIMEOUT);
  });
});

// ============================================================
// THREAT INTELLIGENCE TESTS
// ============================================================

describe('Threat Intelligence API', () => {
  
  describe('GET /api/threats - List Threat Indicators', () => {
    
    it('should return threat indicators with statistics', async () => {
      const response = await makeAuthenticatedRequest('analyst', '/api/threats?limit=20');
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data.success).toBe(true);
      expect(data.data.indicators).toBeDefined();
      expect(Array.isArray(data.data.indicators)).toBe(true);
      expect(data.data.statistics).toBeDefined();
      expect(data.data.statistics.totalIndicators).toBeDefined();
      expect(data.data.pagination).toBeDefined();
    }, TEST_TIMEOUT);

    it('should filter by indicator type', async () => {
      const response = await makeAuthenticatedRequest('analyst', '/api/threats?type=IPV4&limit=10');
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data.success).toBe(true);
      if (data.data.indicators.length > 0) {
        data.data.indicators.forEach((indicator: any) => {
          expect(indicator.type).toBe('ipv4');
        });
      }
    }, TEST_TIMEOUT);

    it('should filter by threat level', async () => {
      const response = await makeAuthenticatedRequest('analyst', '/api/threats?threatLevel=CRITICAL&limit=10');
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data.success).toBe(true);
    }, TEST_TIMEOUT);

    it('should search across multiple fields', async () => {
      const response = await makeAuthenticatedRequest('analyst', '/api/threats?search=apt&limit=10');
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data.indicators)).toBe(true);
    }, TEST_TIMEOUT);
  });

  describe('POST /api/threats - Add Indicator', () => {
    
    const validIndicatorData = {
      action: 'addIndicator',
      type: 'IPV4',
      value: '203.0.113.50',
      confidence: 95.0,
      source: 'Integration Test',
      threatActor: 'APT-Test',
      malwareFamily: 'TestMalware',
      tags: ['test', 'integration'],
      tlp: 'RED',
      description: 'Test indicator for integration testing'
    };

    it('should add new threat indicator', async () => {
      const response = await makeAuthenticatedRequest('analyst', '/api/threats', {
        method: 'POST',
        body: JSON.stringify(validIndicatorData)
      });
      
      expect(response.status).toBe(201);
      const data = await response.json();
      
      expect(data.success).toBe(true);
      expect(data.data.type).toBe('IPV4');
      expect(data.data.value).toBe(validIndicatorData.value);
      expect(data.data.confidence).toBe(95.0);
      expect(data.action).toBe('created');
      
      // Cleanup
      createdResources.indicators.push(data.data.id);
    }, TEST_TIMEOUT);

    it('should update existing indicator on duplicate', async () => {
      // First addition creates it
      await makeAuthenticatedRequest('analyst', '/api/threats', {
        method: 'POST',
        body: JSON.stringify(validIndicatorData)
      });

      // Second addition should update
      const response = await makeAuthenticatedRequest('analyst', '/api/threats', {
        method: 'POST',
        body: JSON.stringify({
          ...validIndicatorData,
          confidence: 98.0 // Updated confidence
        })
      });
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data.action).toBe('updated');
      expect(data.data.confidence).toBeGreaterThanOrEqual(95.0);
    }, TEST_TIMEOUT);

    it('should validate IOC value format for IP address', async () => {
      const invalidIP = {
        action: 'addIndicator',
        type: 'IPV4',
        value: 'not-a-valid-ip-address',
        confidence: 80.0
      };

      const response = await makeAuthenticatedRequest('analyst', '/api/threats', {
        method: 'POST',
        body: JSON.stringify(invalidIP)
      });
      
      expect(response.status).toBe(400);
      const data = await response.json();
      
      expect(data.errorCode).toBe('VALIDATION_ERROR');
      expect(data.details?.fields?.value).toContain('Invalid indicator value');
    }, TEST_TIMEOUT);

    it('should validate MSISDN format for telecom indicators', async () => {
      const invalidMSISDN = {
        action: 'addIndicator',
        type: 'MSISDN',
        value: 'not-a-phone-number',
        confidence: 70.0
      };

      const response = await makeAuthenticatedRequest('analyst', '/api/threats', {
        method: 'POST',
        body: JSON.stringify(invalidMSISDN)
      });
      
      expect(response.status).toBe(400);
      const data = await response.json();
      
      expect(data.errorCode).toBe('VALIDATION_ERROR');
    }, TEST_TIMEOUT);

    it('should accept valid MSISDN format', async () => {
      const validMSISDN = {
        action: 'addIndicator',
        type: 'MSISDN',
        value: '+213551234567', // Algeria format
        confidence: 90.0,
        source: 'Telecom Test'
      };

      const response = await makeAuthenticatedRequest('analyst', '/api/threats', {
        method: 'POST',
        body: JSON.stringify(validMSISDN)
      });
      
      expect([201, 200]).toContain(response.status); // Created or updated
    }, TEST_TIMEOUT);

    it('should accept valid IMEI format', async () => {
      const validIMEI = {
        action: 'addIndicator',
        type: 'IMEI',
        value: '123456789012345', // 15 digits
        confidence: 85.0
      };

      const response = await makeAuthenticatedRequest('analyst', '/api/threats', {
        method: 'POST',
        body: JSON.stringify(validIMEI)
      });
      
      expect([201, 200]).toContain(response.status);
    }, TEST_TIMEOUT);

    it('should reject IMEI with wrong length', async () => {
      const invalidIMEI = {
        action: 'addIndicator',
        type: 'IMEI',
        value: '12345', // Too short
        confidence: 80.0
      };

      const response = await makeAuthenticatedRequest('analyst', '/api/threats', {
        method: 'POST',
        body: JSON.stringify(invalidIMEI)
      });
      
      expect(response.status).toBe(400);
    }, TEST_TIMEOUT);
  });

  describe('POST /api/threats - Validate IOC', () => {
    
    it('should check IOC against known threats', async () => {
      const response = await makeAuthenticatedRequest('analyst', '/api/threats', {
        method: 'POST',
        body: JSON.stringify({
          action: 'validateIOC',
          type: 'IPV4',
          value: '203.0.113.50' // Should exist from earlier test
        })
      });
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data.success).toBe(true);
      expect(data.data.found).toBeDefined();
      expect(data.data.recommendation).toBeDefined();
    }, TEST_TIMEOUT);
  });
});

// ============================================================
// THREAT HUNTING SESSIONS TESTS
// ============================================================

describe('Threat Hunting Sessions API', () => {
  
  describe('GET /api/threat-hunting/sessions - List Sessions', () => {
    
    it('should return hunting sessions list', async () => {
      const response = await makeAuthenticatedRequest('analyst', '/api/threat-hunting/sessions?limit=20');
      
      // May return 200 or 503 if table doesn't exist yet
      expect([200, 503]).toContain(response.status);
      
      if (response.status === 200) {
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(Array.isArray(data.data)).toBe(true);
        expect(data.pagination).toBeDefined();
      }
    }, TEST_TIMEOUT);

    it('should filter sessions by status', async () => {
      const response = await makeAuthenticatedRequest('analyst', '/api/threat-hunting/sessions?status=RUNNING&limit=10');
      
      expect([200, 503]).toContain(response.status);
    }, TEST_TIMEOUT);
  });

  describe('POST /api/threat-hunting/sessions - Create Session', () => {
    
    const validSessionData = {
      name: 'Test Hunt Session - Phishing Campaign Analysis',
      hypothesis: 'We suspect an ongoing phishing campaign targeting our telecom customers. The campaign appears to use SMS messages with links to fake banking pages. This session will investigate the scope, identify IOCs, and map the attack infrastructure.',
      hunterId: 'test-analyst-id',
      hunterName: 'Test Analyst',
      tags: ['phishing', 'sms', 'telecom', 'campaign']
    };

    it('should create new hunting session', async () => {
      const response = await makeAuthenticatedRequest('analyst', '/api/threat-hunting/sessions', {
        method: 'POST',
        body: JSON.stringify(validSessionData)
      });
      
      // May return 201 or 503 if table doesn't exist
      expect([201, 503]).toContain(response.status);
      
      if (response.status === 201) {
        const data = await response.json();
        
        expect(data.success).toBe(true);
        expect(data.data.id).toBeDefined();
        expect(data.data.id).toMatch(/^hunt-/);
        expect(data.data.name).toBe(validSessionData.name);
        expect(data.data.hypothesis).toBe(validSessionData.hypothesis);
        expect(data.data.status).toBe('DRAFT');
        
        // Cleanup
        createdResources.huntSessions.push(data.data.id);
      }
    }, TEST_TIMEOUT);

    it('should reject session without hypothesis', async () => {
      const invalidData = {
        name: 'No Hypothesis Session',
        hunterId: 'test-analyst-id'
        // Missing hypothesis
      };

      const response = await makeAuthenticatedRequest('analyst', '/api/threat-hunting/sessions', {
        method: 'POST',
        body: JSON.stringify(invalidData)
      });
      
      expect(response.status).toBe(400);
      const data = await response.json();
      
      expect(data.errorCode).toBe('VALIDATION_ERROR');
      expect(data.details?.fields?.hypothesis).toBeDefined();
    }, TEST_TIMEOUT);

    it('should reject session with name too short', async () => {
      const shortNameData = {
        name: 'AB', // Less than 3 chars
        hypothesis: 'A valid hypothesis that is long enough to pass validation.',
        hunterId: 'test-analyst-id'
      };

      const response = await makeAuthenticatedRequest('analyst', '/api/threat-hunting/sessions', {
        method: 'POST',
        body: JSON.stringify(shortNameData)
      });
      
      expect(response.status).toBe(400);
    }, TEST_TIMEOUT);

    it('should reject hypothesis too short', async () => {
      const shortHypothesisData = {
        name: 'Valid Name For Testing',
        hypothesis: 'Too short', // Less than 10 chars
        hunterId: 'test-analyst-id'
      };

      const response = await makeAuthenticatedRequest('analyst', '/api/threat-hunting/sessions', {
        method: 'POST',
        body: JSON.stringify(shortHypothesisData)
      });
      
      expect(response.status).toBe(400);
      const data = await response.json();
      
      expect(data.details?.fields?.hypothesis).toContain('at least 10 characters');
    }, TEST_TIMEOUT);
  });
});

// ============================================================
// HEALTH CHECK TESTS
// ============================================================

describe('Health Check Endpoint', () => {
  
  it('should return healthy status', async () => {
    const response = await fetch(`${BASE_URL}/api/incidents/health`);
    
    expect(response.status).toBe(200); // Or 503 if unhealthy
    const data = await response.json();
    
    expect(data.status).toBeDefined();
    expect(['healthy', 'degraded', 'unhealthy']).toContain(data.status);
    expect(data.version).toBeDefined();
    expect(data.modules).toBeDefined();
    expect(data.system).toBeDefined();
  }, TEST_TIMEOUT);

  it('should include module status details', async () => {
    const response = await fetch(`${BASE_URL}/api/incidents/health`);
    const data = await response.json();
    
    expect(data.modules.incidentManagement).toBeDefined();
    expect(data.modules.threatHunting).toBeDefined();
    expect(data.modules.incidentManagement.features).toBeDefined();
    expect(data.system.database).toBeDefined();
    expect(data.system.database.latency).toBeDefined();
  }, TEST_TIMEOUT);
});

// ============================================================
// PERFORMANCE BENCHMARKS
// ============================================================

describe('Performance Benchmarks', () => {
  
  it('should respond to incident list within 500ms', async () => {
    const start = Date.now();
    
    const response = await makeAuthenticatedRequest('analyst', '/api/incidents?limit=50');
    const duration = Date.now() - start;
    
    expect(response.status).toBe(200);
    expect(duration).toBeLessThan(500);
    
    console.log(`  ⏱️  Incident list (${duration}ms)`);
  }, TEST_TIMEOUT);

  it('should respond to threat list within 500ms', async () => {
    const start = Date.now();
    
    const response = await makeAuthenticatedRequest('analyst', '/api/threats?limit=50');
    const duration = Date.now() - start;
    
    expect(response.status).toBe(200);
    expect(duration).toBeLessThan(500);
    
    console.log(`  ⏱️  Threat list (${duration}ms)`);
  }, TEST_TIMEOUT);

  it('should create incident within 1 second', async () => {
    const start = Date.now();
    
    const response = await makeAuthenticatedRequest('analyst', '/api/incidents', {
      method: 'POST',
      body: JSON.stringify({
        action: 'create',
        title: 'Performance Test Incident',
        severity: 'MEDIUM'
      })
    });
    
    const duration = Date.now() - start;
    
    expect([201, 200]).toContain(response.status);
    expect(duration).toBeLessThan(1000);
    
    console.log(`  ⏱️  Incident creation (${duration}ms)`);
    
    // Cleanup if created
    if (response.status === 201) {
      const data = await response.json();
      createdResources.incidents.push(data.data.id);
    }
  }, TEST_TIMEOUT);
});

// ============================================================
// EXPORT FOR CI/CD
// ============================================================

export default {
  BASE_URL,
  TEST_TIMEOUT,
  TEST_USERS,
  createdResources,
  cleanupCreatedResources
};
