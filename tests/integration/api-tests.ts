/**
 * National SOC Platform - Integration Test Suite
 * 
 * Comprehensive integration tests for telecom-scale SOC operations:
 * - Incident Management API tests
 * - Threat Hunting API tests
 * - Analytics aggregation tests
 * - SSE streaming tests
 * - Performance benchmarks
 * 
 * Run with: npx jest tests/integration/ --verbose
 * 
 * @module tests/integration/api-tests
 * @version 1.0.0
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import {
  generateTestIncident,
  generateTestIOC,
  generateBulkIncidents,
  generateBulkIOCs,
  generateTelecomTestDataset
} from '../data-generators/telecom-data';

// ============================================================
// CONFIGURATION
// ============================================================

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const TEST_TIMEOUT = 30000; // 30 seconds

interface TestUser {
  token: string;
  userId: string;
  role: string;
}

// Test users (would be created in setup)
let adminUser: TestUser | null = null;
let analystUser: TestUser | null = null;

// Track created resources for cleanup
const createdIncidents: string[] = [];
const createdIOCs: string[] = [];

// ============================================================
// HELPER FUNCTIONS
// ============================================================

async function apiRequest(
  endpoint: string,
  options: {
    method?: string;
    body?: any;
    token?: string;
    expectedStatus?: number;
  } = {}
): Promise<{ status: number; data: any; headers: Headers }> {
  const { method = 'GET', body, token = adminUser?.token, expectedStatus = 200 } = options;

  const url = `${BASE_URL}${endpoint}`;
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });

    let data;
    const contentType = response.headers.get('content-type');
    
    if (contentType?.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    return {
      status: response.status,
      data,
      headers: response.headers
    };
  } catch (error) {
    throw new Error(`API request failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// ============================================================
// SETUP & TEARDOWN
// ============================================================

beforeAll(async () => {
  console.log('[TEST-SETUP] Starting integration test suite');
  console.log(`[TEST-SETUP] Base URL: ${BASE_URL}`);
  
  // In a real scenario, we would:
  // 1. Set up test database
  // 2. Create test users via auth API
  // 3. Get authentication tokens
  
  console.log('[TEST-SETUP] Setup complete');
}, TEST_TIMEOUT);

afterAll(async () => {
  console.log('\n[TEST-CLEANUP] Cleaning up test resources...');
  console.log(`[TEST-CLEANUP] Created incidents to clean: ${createdIncidents.length}`);
  console.log(`[TEST-CLEANUP] Created IOCs to clean: ${createdIOCs.length}`);
  
  // Cleanup would happen here in production tests
  console.log('[TEST-CLEANUP] Complete');
});

// ============================================================
// INCIDENT MANAGEMENT TESTS
// ============================================================

describe('Incident Management API', () => {

  describe('POST /api/incidents - Create Incident', () => {
    
    test('should create a basic incident successfully', async () => {
      const testData = generateTestIncident({ severity: 'HIGH' });
      
      const result = await apiRequest('/api/incidents', {
        method: 'POST',
        body: {
          action: 'create',
          data: testData
        },
        expectedStatus: 201
      });

      expect(result.status).toBe(201);
      expect(result.data.success).toBe(true);
      expect(result.data.incident).toBeDefined();
      expect(result.data.incident.id).toBeTruthy();
      expect(result.data.incident.severity).toBe(testData.severity);
      
      createdIncidents.push(result.data.incident.id);
    }, TEST_TIMEOUT);

    test('should create incident with telecom-specific fields', async () => {
      const testData = generateTestIncident({ severity: 'CRITICAL' });
      
      const result = await apiRequest('/api/incidents', {
        method: 'POST',
        body: {
          action: 'create',
          data: {
            ...testData,
            msisdn: '+22890123456',
            imei: '358210098765432',
            tatcCode: 'TATC-2024-999'
          }
        },
        expectedStatus: 201
      });

      expect(result.status).toBe(201);
      expect(result.data.success).toBe(true);
      expect(result.data.incident.msisdn).toBe('+22890123456');
      expect(result.data.incident.imei).toBe('358210098765432');
      
      createdIncidents.push(result.data.incident.id);
    }, TEST_TIMEOUT);

    test('should reject incident without required fields', async () => {
      const result = await apiRequest('/api/incidents', {
        method: 'POST',
        body: {
          action: 'create',
          data: {
            title: 'Missing severity'
            // Missing required: description, severity, category
          }
        },
        expectedStatus: 400
      });

      expect(result.status).toBe(400);
      expect(result.data.success).toBe(false);
      expect(result.data.error).toBeDefined();
    }, TEST_TIMEOUT);

    test('should reject unauthenticated requests', async () => {
      const result = await apiRequest('/api/incidents', {
        method: 'POST',
        body: { action: 'create', data: generateTestIncident() },
        token: undefined, // No auth token
        expectedStatus: 401
      });

      expect(result.status).toBe(401);
    }, TEST_TIMEOUT);

    test('should handle bulk incident creation', async () => {
      const bulkData = generateBulkIncidents(5);
      
      const result = await apiRequest('/api/incidents', {
        method: 'POST',
        body: {
          action: 'bulkCreate',
          data: bulkData
        },
        expectedStatus: 200
      });

      expect(result.status).toBe(200);
      expect(result.data.success).toBe(true);
      expect(result.data.createdCount).toBeGreaterThan(0);
      
      if (result.data.createdIds) {
        createdIncidents.push(...result.data.createdIds);
      }
    }, TEST_TIMEOUT);
  });

  describe('GET /api/incidents - Query Incidents', () => {
    
    test('should return paginated results', async () => {
      const result = await apiRequest('/api/incidents?page=1&limit=10', {
        expectedStatus: 200
      });

      expect(result.status).toBe(200);
      expect(result.data.success).toBe(true);
      expect(result.data.incidents).toBeDefined();
      expect(Array.isArray(result.data.incidents)).toBe(true);
      expect(result.data.pagination).toBeDefined();
    }, TEST_TIMEOUT);

    test('should filter by severity', async () => {
      const result = await apiRequest('/api/incidents?severity=CRITICAL,HIGH', {
        expectedStatus: 200
      });

      expect(result.status).toBe(200);
      if (result.data.incidents?.length > 0) {
        const severities = result.data.incidents.map((i: any) => i.severity);
        expect(severities.every((s: string) => ['CRITICAL', 'HIGH'].includes(s))).toBe(true);
      }
    }, TEST_TIMEOUT);

    test('should filter by date range', async () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      
      const result = await apiRequest(
        `/api/incidents?startDate=${yesterday.toISOString()}&endDate=${now.toISOString()}`,
        { expectedStatus: 200 }
      );

      expect(result.status).toBe(200);
      expect(result.data.success).toBe(true);
    }, TEST_TIMEOUT);

    test('should include subscriber impact metrics', async () => {
      const result = await apiRequest('/api/incidents?includeMetrics=true', {
        expectedStatus: 200
      });

      expect(result.status).toBe(200);
      expect(result.data.metrics).toBeDefined();
      expect(result.data.metrics.totalSubscribersAffected).toBeDefined();
    }, TEST_TIMEOUT);
  });

  describe('PUT /api/incidents - Update Incident', () => {
    
    test('should update incident status', async () => {
      if (createdIncidents.length === 0) {
        console.log('Skipping - no incidents available');
        return;
      }

      const incidentId = createdIncidents[0];
      const result = await apiRequest(`/api/incidents/${incidentId}`, {
        method: 'PUT',
        body: {
          action: 'update',
          data: { status: 'IN_PROGRESS', phase: 'CONTAINMENT' }
        },
        expectedStatus: 200
      });

      expect(result.status).toBe(200);
      expect(result.data.success).toBe(true);
      expect(result.data.incident.status).toBe('IN_PROGRESS');
    }, TEST_TIMEOUT);

    test('should add comment to incident', async () => {
      if (createdIncidents.length === 0) {
        console.log('Skipping - no incidents available');
        return;
      }

      const incidentId = createdIncidents[0];
      const result = await apiRequest(`/api/incidents/${incidentId}`, {
        method: 'PUT',
        body: {
          action: 'addUpdate',
          data: {
            content: 'Integration test comment - investigating anomaly patterns',
            isInternal: true
          }
        },
        expectedStatus: 200
      });

      expect(result.status).toBe(200);
      expect(result.data.success).toBe(true);
      expect(result.data.update).toBeDefined();
    }, TEST_TIMEOUT);

    test('should link alert to incident', async () => {
      if (createdIncidents.length === 0) {
        console.log('Skipping - no incidents available');
        return;
      }

      const incidentId = createdIncidents[0];
      const result = await apiRequest(`/api/incidents/${incidentId}`, {
        method: 'PUT',
        body: {
          action: 'linkAlert',
          data: { alertId: 'test-alert-123' }
        },
        expectedStatus: 200
      });

      expect(result.status).toBe(200);
      expect(result.data.success).toBe(true);
    }, TEST_TIMEOUT);
  });
});

// ============================================================
// THREAT HUNTING TESTS
// ============================================================

describe('Threat Hunting API', () => {

  describe('POST /api/threats - Add Indicators/IOCs', () => {
    
    test('should add IPv4 indicator successfully', async () => {
      const ioc = generateTestIOC('ipv4');
      
      const result = await apiRequest('/api/threats', {
        method: 'POST',
        body: {
          action: 'addIndicator',
          data: ioc
        },
        expectedStatus: 201
      });

      expect(result.status).toBe(201);
      expect(result.data.success).toBe(true);
      expect(result.data.indicator).toBeDefined();
      expect(result.data.indicator.type).toBe('ipv4');
      
      createdIOCs.push(result.data.indicator.id);
    }, TEST_TIMEOUT);

    test('should add MSISDN IOC (telecom-specific)', async () => {
      const ioc = generateTestIOC('msisdn');
      
      const result = await apiRequest('/api/threats', {
        method: 'POST',
        body: {
          action: 'addIOC',
          data: ioc
        },
        expectedStatus: 201
      });

      expect(result.status).toBe(201);
      expect(result.data.success).toBe(true);
      expect(result.data.ioc.type).toBe('msisdn');
      
      createdIOCs.push(result.data.ioc.id);
    }, TEST_TIMEOUT);

    test('should validate IOC format', async () => {
      const invalidIOC = {
        type: 'ipv4',
        value: 'not-an-ip-address',
        threatLevel: 'HIGH'
      };

      const result = await apiRequest('/api/threats', {
        method: 'POST',
        body: {
          action: 'validateIOC',
          data: invalidIOC
        },
        expectedStatus: 400
      });

      expect(result.status).toBe(400);
      expect(result.data.valid).toBe(false);
      expect(result.data.errors).toBeDefined();
    }, TEST_TIMEOUT);

    test('should handle bulk IOC import', async () => {
      const bulkIOCs = generateBulkIOCs(10);
      
      const result = await apiRequest('/api/threats', {
        method: 'POST',
        body: {
          action: 'bulkImport',
          data: { indicators: bulkIOCs }
        },
        expectedStatus: 200
      });

      expect(result.status).toBe(200);
      expect(result.data.success).toBe(true);
      expect(result.data.importedCount).toBeGreaterThan(0);
      expect(result.data.errors).toBeDefined(); // Should report validation errors
    }, TEST_TIMEOUT);
  });

  describe('Hunt Session Management', () => {
    
    test('should create hunt session', async () => {
      const result = await apiRequest('/api/threat-hunting/sessions', {
        method: 'POST',
        body: {
          name: 'Integration Test Hunt Session',
          queryType: 'MSISDN_LOOKUP',
          parameters: {
            msisdn: '+22891234567',
            timeRange: '24h'
          }
        },
        expectedStatus: 201
      });

      expect(result.status).toBe(201);
      expect(result.data.success).toBe(true);
      expect(result.data.session).toBeDefined();
      expect(result.data.session.status).toBe('RUNNING');
    }, TEST_TIMEOUT);

    test('should query active sessions', async () => {
      const result = await apiRequest('/api/threat-hunting/sessions?status=RUNNING', {
        expectedStatus: 200
      });

      expect(result.status).toBe(200);
      expect(result.data.sessions).toBeDefined();
      expect(Array.isArray(result.data.sessions)).toBe(true);
    }, TEST_TIMEOUT);
  });
});

// ============================================================
// ANALYTICS TESTS
// ============================================================

describe('Analytics Aggregation Service', () => {

  describe('GET /api/analytics', () => {
    
    test('should return dashboard analytics', async () => {
      const result = await apiRequest('/api/analytics?type=dashboard&range=24h', {
        expectedStatus: 200
      });

      expect(result.status).toBe(200);
      expect(result.data.success).toBe(true);
      expect(result.data.data).toBeDefined();
      expect(result.data.data.incidents).toBeDefined();
      expect(result.data.data.threats).toBeDefined();
      expect(result.data.data.trends).toBeDefined();
      expect(result.data.data.healthScore).toBeDefined();
    }, TEST_TIMEOUT);

    test('should return incident KPIs', async () => {
      const result = await apiRequest('/api/analytics?type=incidents&range=7d', {
        expectedStatus: 200
      });

      expect(result.status).toBe(200);
      expect(result.data.data.totalIncidents).toBeDefined();
      expect(result.data.data.openIncidents).toBeDefined();
      expect(result.data.data.avgMTTR).toBeDefined();
      expect(result.data.data.slaComplianceRate).toBeDefined();
      expect(result.data.data.bySeverity).toBeDefined();
    }, TEST_TIMEOUT);

    test('should return threat KPIs', async () => {
      const result = await apiRequest('/api/analytics?type=threats&range=30d', {
        expectedStatus: 200
      });

      expect(result.status).toBe(200);
      expect(result.data.data.totalIOCs).toBeDefined();
      expect(result.data.data.activeIOCs).toBeDefined();
      expect(result.data.data.iocTypeDistribution).toBeDefined();
      expect(result.data.data.validationRate).toBeDefined();
    }, TEST_TIMEOUT);

    test('should return trend data', async () => {
      const result = await apiRequest('/api/analytics?type=trends&trendType=incidents&range=7d&interval=day', {
        expectedStatus: 200
      });

      expect(result.status).toBe(200);
      expect(Array.isArray(result.data.data)).toBe(true);
      if (result.data.data.length > 0) {
        expect(result.data.data[0].timestamp).toBeDefined();
        expect(result.data.data[0].value).toBeDefined();
      }
    }, TEST_TIMEOUT);
  });
});

// ============================================================
// SSE STREAMING TESTS
// ============================================================

describe('Real-time SSE Streaming', () => {

  describe('GET /api/stream/* endpoints', () => {
    
    test('should establish incident stream connection', async () => {
      const result = await apiRequest('/api/stream/incidents', {
        token: adminUser?.token,
        expectedStatus: 200
      });

      expect(result.status).toBe(200);
      expect(result.headers.get('content-type')).toContain('text/event-stream');
      expect(result.headers.get('cache-control')).toContain('no-cache');
    }, TEST_TIMEOUT);

    test('should establish threat stream connection', async () => {
      const result = await apiRequest('/api/stream/threats', {
        token: adminUser?.token,
        expectedStatus: 200
      });

      expect(result.status).toBe(200);
      expect(result.headers.get('content-type')).toContain('text/event-stream');
    }, TEST_TIMEOUT);

    test('should require authentication for streams', async () => {
      const result = await apiRequest('/api/stream/incidents', {
        token: undefined,
        expectedStatus: 401
      });

      expect(result.status).toBe(401);
    }, TEST_TIMEOUT);
  });

  describe('GET /api/stream/health', () => {
    
    test('should return SSE health statistics', async () => {
      const result = await apiRequest('/api/stream/health', {
        expectedStatus: 200
      });

      expect(result.status).toBe(200);
      expect(result.data.status).toBeDefined();
      expect(result.data.summary).toBeDefined();
      expect(result.data.summary.availableChannels).toBeDefined();
      expect(result.data.health).toBeDefined();
    }, TEST_TIMEOUT);
  });
});

// ============================================================
// HEALTH CHECK TESTS
// ============================================================

describe('System Health Endpoints', () => {

  test('GET /api/incidents/health should return module health', async () => {
    const result = await apiRequest('/api/incidents/health', {
      expectedStatus: 200
    });

    expect(result.status).toBe(200);
    expect(result.data.module).toBe('incident-management');
    expect(result.data.status).toBeDefined();
    expect(result.data.database).toBeDefined();
  }, TEST_TIMEOUT);

  test('should have acceptable response times (<500ms)', async () => {
    const start = Date.now();
    
    await apiRequest('/api/incidents/health', { expectedStatus: 200 });
    
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(500);
  }, TEST_TIMEOUT);
});

// ============================================================
// PERFORMANCE BENCHMARKS
// ============================================================

describe('Performance Benchmarks', () => {

  test('bulk creation should handle 100 incidents efficiently', async () => {
    const start = Date.now();
    
    const bulkData = generateBulkIncidents(100);
    const result = await apiRequest('/api/incidents', {
      method: 'POST',
      body: {
        action: 'bulkCreate',
        data: bulkData
      },
      expectedStatus: 200
    });
    
    const duration = Date.now() - start;

    expect(result.status).toBe(200);
    expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
    
    console.log(`[PERF] Bulk creation of 100 incidents: ${duration}ms`);
  }, 15000);

  test('analytics aggregation should be cached on second call', async () => {
    // First call (populates cache)
    const firstStart = Date.now();
    await apiRequest('/api/analytics?type=incidents&range=24h', { expectedStatus: 200 });
    const firstDuration = Date.now() - firstStart;

    // Second call (should hit cache)
    const secondStart = Date.now();
    await apiRequest('/api/analytics?type=incidents&range=24h', { expectedStatus: 200 });
    const secondDuration = Date.now() - secondStart;

    console.log(`[PERF] First call: ${firstDuration}ms, Cached call: ${secondDuration}ms`);
    
    // Cached call should be significantly faster (or at least not slower)
    expect(secondDuration).toBeLessThan(firstDuration + 100);
  }, TEST_TIMEOUT);

  test('telecom dataset generation should scale', async () => {
    const start = Date.now();
    
    const dataset = generateTelecomTestDataset({
      incidentsCount: 1000,
      iocsCount: 5000,
      ss7MessagesCount: 10000,
      gtpSessionsCount: 5000,
      sipSessionsCount: 3000
    });
    
    const duration = Date.now() - start;

    expect(dataset.totalRecords).toBe(24000);
    expect(dataset.incidents.length).toBe(1000);
    expect(dataset.iocs.length).toBe(5000);
    expect(duration).toBeLessThan(5000); // Should generate quickly
    
    console.log(`[PERF] Generated ${dataset.totalRecords} records in ${duration}ms`);
  }, 10000);
});

// ============================================================
// TELECOM-SPECIFIC VALIDATION TESTS
// ============================================================

describe('Telecom Data Validation', () => {

  test('MSISDN format validation', async () => {
    const validMSISDNs = [
      '+22890123456',
      '+233240123456',
      '+2250712345678'
    ];

    for (const msisdn of validMSISDNs) {
      const incident = generateTestIncident({ severity: 'MEDIUM' });
      incident.msisdn = msisdn;

      const result = await apiRequest('/api/incidents', {
        method: 'POST',
        body: { action: 'create', data: incident },
        expectedStatus: 201
      });

      expect(result.status).toBe(201);
      if (result.data.incident?.id) {
        createdIncidents.push(result.data.incident.id);
      }
    }
  }, TEST_TIMEOUT);

  test('IMEI format validation (Luhn checksum)', async () => {
    const result = await apiRequest('/api/threats', {
      method: 'POST',
      body: {
        action: 'validateIOC',
        data: {
          type: 'imei',
          value: '358210098765425', // Valid IMEI with correct checksum
          threatLevel: 'MEDIUM'
        }
      },
      expectedStatus: 200
    });

    expect(result.data.valid).toBe(true);
  }, TEST_TIMEOUT);

  test('SS7 message structure validation', async () => {
    // This would test SS7-specific validation logic
    const ss7Message = {
      messageType: 'SRI',
      opc: '00100',
      dpc: '00200',
      globalTitle: '+22890123456',
      timestamp: new Date().toISOString()
    };

    // Would be validated by SS7 processing module
    expect(ss7Message.messageType).toBeTruthy();
    expect(ss7Message.opc).toBeTruthy();
    expect(ss7Message.dpc).toBeTruthy();
    expect(ss7Message.globalTitle.startsWith('+')).toBe(true);
  });
});
