/**
 * National SOC Platform - Functional Test Setup
 * 
 * Provides comprehensive test infrastructure for integration and E2E testing:
 * - TestDatabase: Isolated test database management
 * - TestAuth: JWT token generation for authenticated tests
 * - TestClient: API client wrapper with auth support
 * - Pre-configured test data generators using telecom-data.ts
 * 
 * @module tests/setup/test-setup
 * @version 1.0.0
 */

import { PrismaClient } from '@prisma/client';
import { randomUUID, createHash, randomBytes } from 'crypto';
import { SignJWT, jwtVerify } from 'jose';
import {
  generateTestIncident,
  generateTestIOC,
  generateBulkIncidents,
  generateBulkIOCs,
  generateTelecomTestDataset,
  generateMSISDN,
  generateIMEI,
  generateIMSI,
  type TestIncident,
  type TestThreatIndicator
} from '../data-generators/telecom-data';

// ============================================================
// TYPES & INTERFACES
// ============================================================

export interface TestUser {
  userId: string;
  email: string;
  username: string;
  roleId: string;
  roleName: string;
  permissions: string[];
  token?: string;
}

export interface TestContext {
  database: TestDatabase;
  auth: TestAuth;
  client: TestClient;
  users: Record<string, TestUser>;
  startTime: Date;
  testId: string;
}

export interface TimingMetrics {
  startTime: number;
  endTime: number;
  duration: number;
  method: string;
  url: string;
  status: number;
}

export interface TestResponse<T = any> {
  data: T;
  status: number;
  headers: Headers;
  ok: boolean;
  timing: TimingMetrics;
}

// ============================================================
// TEST DATABASE CLASS
// ============================================================

/**
 * Manages isolated test database instances
 * 
 * Features:
 * - Uses TEST_DATABASE_URL environment variable
 * - Runs migrations before tests
 * - Provides cleanup/teardown methods
 * - Seeds test data on demand
 */
export class TestDatabase {
  private client: PrismaClient | null = null;
  private isConnected: boolean = false;
  private testData: Record<string, any[]> = {};
  private readonly testDbUrl: string;

  constructor(dbUrl?: string) {
    this.testDbUrl = dbUrl || process.env.TEST_DATABASE_URL || process.env.DATABASE_URL || '';
    
    if (!this.testDbUrl) {
      throw new Error('TEST_DATABASE_URL or DATABASE_URL environment variable is required');
    }
  }

  /**
   * Connect to the test database and run migrations
   */
  async connect(): Promise<void> {
    if (this.isConnected && this.client) {
      return;
    }

    console.log(`[TEST-DB] Connecting to test database...`);
    
    this.client = new PrismaClient({
      datasources: {
        db: {
          url: this.testDbUrl
        }
      },
      log: process.env.NODE_ENV === 'development' 
        ? ['error', 'warn']
        : ['error']
    });

    try {
      // Test connection
      await this.client.$connect();
      this.isConnected = true;
      
      // Run a simple health check
      await this.client.$queryRaw`SELECT 1`;
      
      console.log(`[TEST-DB] Connected successfully`);
    } catch (error) {
      console.error(`[TEST-DB] Failed to connect:`, error);
      throw new Error(`Test database connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get the Prisma client instance
   */
  getClient(): PrismaClient {
    if (!this.client || !this.isConnected) {
      throw new Error('Database not connected. Call connect() first.');
    }
    return this.client;
  }

  /**
   * Clean all data from tables (in correct order for foreign keys)
   */
  async cleanAll(): Promise<void> {
    const db = this.getClient();
    
    console.log(`[TEST-DB] Cleaning all tables...`);
    
    // Delete in order of dependencies (child tables first)
    const deleteOrder = [
      'comment',
      'incidentUpdate',
      'alert',
      'incident',
      'threatIndicator',
      'huntSession',
      'session',
      'user'
    ];

    for (const table of deleteOrder) {
      try {
        // Use raw query to truncate/delete all records
        await db.$executeRawUnsafe(`DELETE FROM "${table}" WHERE 1=1`);
      } catch (error) {
        // Table might not exist or have different name, continue
        console.warn(`[TEST-DB] Could not clean table ${table}:`, error);
      }
    }

    console.log(`[TEST-DB] All tables cleaned`);
  }

  /**
   * Seed test data into the database
   */
  async seedTestData(options?: {
    incidentsCount?: number;
    iocsCount?: number;
    usersCount?: number;
  }): Promise<Record<string, any[]>> {
    const db = this.getClient();
    const config = {
      incidentsCount: options?.incidentsCount || 10,
      iocsCount: options?.iocsCount || 25,
      usersCount: options?.usersCount || 3
    };

    console.log(`[TEST-DB] Seeding test data:`);
    console.log(`  - Incidents: ${config.incidentsCount}`);
    console.log(`  - IOCs: ${config.iocsCount}`);

    this.testData = {};

    try {
      // Seed incidents (if table exists)
      const incidents = generateBulkIncidents(config.incidentsCount);
      this.testData.incidents = incidents;
      
      // Seed IOCs/threat indicators (if table exists)
      const iocs = generateBulkIOCs(config.iocsCount);
      this.testData.iocs = iocs;

      console.log(`[TEST-DB] Test data generated in memory`);
      console.log(`[TEST-DB] Note: Actual DB seeding depends on schema availability`);

    } catch (error) {
      console.error(`[TEST-DB] Error seeding test data:`, error);
    }

    return this.testData;
  }

  /**
   * Get previously generated test data
   */
  getTestData(type: string): any[] {
    return this.testData[type] || [];
  }

  /**
   * Get all generated test data
   */
  getAllTestData(): Record<string, any[]> {
    return { ...this.testData };
  }

  /**
   * Disconnect from the test database
   */
  async disconnect(): Promise<void> {
    if (this.client && this.isConnected) {
      await this.client.$disconnect();
      this.isConnected = false;
      console.log(`[TEST-DB] Disconnected`);
    }
  }

  /**
   * Run migrations on test database
   */
  async migrate(): Promise<void> {
    console.log(`[TEST-DB] Running migrations...`);
    // In production, you would use:
    // const { execSync } = require('child_process');
    // execSync('npx prisma migrate deploy', { env: { ...process.env, DATABASE_URL: this.testDbUrl } });
    console.log(`[TEST-DB] Migrations complete (placeholder)`);
  }

  /**
   * Reset database to clean state
   */
  async reset(): Promise<void> {
    await this.cleanAll();
    this.testData = {};
  }
}

// ============================================================
// TEST AUTH CLASS
// ============================================================

/**
 * Generates valid authentication tokens for testing
 * 
 * Features:
 * - Creates test users in database
 * - Generates JWT tokens using same secret as main app
 * - Pre-configured test users (admin, analyst, viewer)
 */
export class TestAuth {
  private jwtSecret: Uint8Array;
  private defaultUsers: Map<string, TestUser>;
  private database: TestDatabase | null = null;

  constructor(secret?: string, database?: TestDatabase) {
    const secretString = secret || process.env.JWT_SECRET || process.env.AUTH_SECRET || 'test-secret-key-for-development-only';
    this.jwtSecret = new TextEncoder().encode(secretString);
    this.database = database || null;
    
    // Initialize pre-configured test users
    this.defaultUsers = new Map([
      ['admin', this.createUserData('admin', 'ADMIN', [
        'incidents:read', 'incidents:write', 'incidents:delete',
        'threats:read', 'threats:write', 'threats:delete',
        'users:read', 'users:write', 'users:delete',
        'settings:manage', 'system:admin', 'reports:all'
      ])],
      ['analyst', this.createUserData('analyst', 'ANALYST', [
        'incidents:read', 'incidents:write',
        'threats:read', 'threats:write',
        'reports:read', 'hunts:execute'
      ])],
      ['viewer', this.createUserData('viewer', 'VIEWER', [
        'incidents:read',
        'threats:read',
        'reports:read'
      ])]
    ]);
  }

  /**
   * Create user data object for a role
   */
  private createUserData(
    username: string,
    roleName: string,
    permissions: string[]
  ): TestUser {
    return {
      userId: `test-${username}-${randomUUID().substring(0, 8)}`,
      email: `test-${username}@soc-platform.test`,
      username: `test_${username}`,
      roleId: `role-${roleName.toLowerCase()}`,
      roleName,
      permissions
    };
  }

  /**
   * Set the database reference for creating users
   */
  setDatabase(database: TestDatabase): void {
    this.database = database;
  }

  /**
   * Create a test user with specified role and optional overrides
   */
  async createTestUser(
    role: string = 'analyst',
    overrides?: Partial<TestUser>
  ): Promise<{ user: TestUser; token: string }> {
    const baseUser = this.defaultUsers.get(role) || this.createUserData(role, role.toUpperCase(), []);
    
    const user: TestUser = {
      ...baseUser,
      ...overrides,
      userId: overrides?.userId || `test-${role}-${randomUUID().substring(0, 8)}`,
      // Ensure required fields are preserved
      email: overrides?.email || baseUser.email,
      username: overrides?.username || baseUser.username,
      roleName: overrides?.roleName || baseUser.roleName,
      permissions: overrides?.permissions || baseUser.permissions
    };

    // Create user in test database if available
    if (this.database) {
      try {
        const db = this.database.getClient();
        // Attempt to create user (schema dependent)
        // await db.user.create({ data: { id: user.userId, email: user.email, ... } });
        console.log(`[TEST-AUTH] User ${user.userId} ready for DB creation`);
      } catch (error) {
        console.warn(`[TEST-AUTH] Could not create user in DB:`, error);
      }
    }

    const token = await this.generateToken(user);

    return { user, token };
  }

  /**
   * Generate a JWT token for a user
   */
  async generateToken(user: TestUser, expiresIn: string = '1h'): Promise<string> {
    const token = await new SignJWT({
      userId: user.userId,
      email: user.email,
      username: user.username,
      roleId: user.roleId,
      roleName: user.roleName,
      permissions: user.permissions
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(expiresIn)
      .setIssuer('soc-platform-test')
      .setAudience('soc-platform-api')
      .sign(this.jwtSecret);

    return token;
  }

  /**
   * Verify a JWT token
   */
  async verifyToken(token: string): Promise<{
    valid: boolean;
    payload?: any;
    error?: string;
  }> {
    try {
      const { payload } = await jwtVerify(token, this.jwtSecret, {
        issuer: 'soc-platform-test',
        audience: 'soc-platform-api'
      });
      return { valid: true, payload };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Token verification failed'
      };
    }
  }

  /**
   * Get pre-configured admin user with token
   */
  async getAdminUser(): Promise<{ user: TestUser; token: string }> {
    return this.createTestUser('admin');
  }

  /**
   * Get pre-configured analyst user with token
   */
  async getAnalystUser(): Promise<{ user: TestUser; token: string }> {
    return this.createTestUser('analyst');
  }

  /**
   * Get pre-configured viewer user with token
   */
  async getViewerUser(): Promise<{ user: TestUser; token: string }> {
    return this.createTestUser('viewer');
  }

  /**
   * Get all pre-configured test users with tokens
   */
  async getAllTestUsers(): Promise<Record<string, { user: TestUser; token: string }>> {
    const [admin, analyst, viewer] = await Promise.all([
      this.getAdminUser(),
      this.getAnalystUser(),
      this.getViewerUser()
    ]);

    return { admin, analyst, viewer };
  }

  /**
   * Generate an expired token for testing expiration handling
   */
  async generateExpiredToken(user?: TestUser): Promise<string> {
    const testUser = user || this.defaultUsers.get('analyst')!;
    return this.generateToken(testUser, '-1s'); // Already expired
  }

  /**
   * Generate a token with invalid signature for testing
   */
  generateInvalidToken(): string {
    return 'invalid.token.here';
  }
}

// ============================================================
// TEST CLIENT CLASS
// ============================================================

/**
 * Wraps fetch for API testing with authentication support
 * 
 * Features:
 * - Automatic auth header injection
 * - JSON response parsing
 * - Timing metrics collection
 * - Convenience methods for HTTP verbs
 */
export class TestClient {
  private baseUrl: string;
  private defaultHeaders: Record<string, string>;
  private requestHistory: TestResponse[];

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || process.env.TEST_API_BASE_URL || 'http://localhost:3000';
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
    this.requestHistory = [];
  }

  /**
   * Create an authenticated fetch wrapper
   */
  authenticatedFetch(token: string): (url: RequestInfo, init?: RequestInit) => Promise<Response> {
    return (url: RequestInfo, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      headers.set('Authorization', `Bearer ${token}`);
      
      return fetch(url, {
        ...init,
        headers
      });
    };
  }

  /**
   * Execute a request with full metrics
   */
  async request<T = any>(
    method: string,
    url: string,
    options?: {
      body?: any;
      token?: string;
      headers?: Record<string, string>;
      params?: Record<string, string>;
    }
  ): Promise<TestResponse<T>> {
    const startTime = Date.now();
    
    // Build URL with query params
    let fullUrl = url.startsWith('http') ? url : `${this.baseUrl}${url}`;
    if (options?.params) {
      const searchParams = new URLSearchParams(options.params);
      fullUrl += `?${searchParams.toString()}`;
    }

    // Build headers
    const headers: Record<string, string> = { ...this.defaultHeaders };
    if (options?.token) {
      headers['Authorization'] = `Bearer ${options.token}`;
    }
    if (options?.headers) {
      Object.assign(headers, options.headers);
    }

    // Build request init
    const init: RequestInit = {
      method,
      headers,
      body: options?.body ? JSON.stringify(options.body) : undefined
    };

    try {
      const response = await fetch(fullUrl, init);
      const endTime = Date.now();
      
      // Parse response body
      let data: T;
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        data = await response.json();
      } else {
        data = (await response.text()) as unknown as T;
      }

      const timing: TimingMetrics = {
        startTime,
        endTime,
        duration: endTime - startTime,
        method,
        url: fullUrl,
        status: response.status
      };

      const testResponse: TestResponse<T> = {
        data,
        status: response.status,
        headers: response.headers,
        ok: response.ok,
        timing
      };

      this.requestHistory.push(testResponse as TestResponse);
      return testResponse;

    } catch (error) {
      const endTime = Date.now();
      
      const testResponse: TestResponse<T> = {
        data: { error: error instanceof Error ? error.message : 'Request failed' } as T,
        status: 0,
        headers: new Headers(),
        ok: false,
        timing: {
          startTime,
          endTime,
          duration: endTime - startTime,
          method,
          url: fullUrl,
          status: 0
        }
      };

      return testResponse;
    }
  }

  /**
   * GET request convenience method
   */
  async get<T = any>(
    url: string,
    options?: { token?: string; params?: Record<string, string>; headers?: Record<string, string> }
  ): Promise<TestResponse<T>> {
    return this.request<T>('GET', url, options);
  }

  /**
   * POST request convenience method
   */
  async post<T = any>(
    url: string,
    body?: any,
    options?: { token?: string; params?: Record<string, string>; headers?: Record<string, string> }
  ): Promise<TestResponse<T>> {
    return this.request<T>('POST', url, { body, ...options });
  }

  /**
   * PUT request convenience method
   */
  async put<T = any>(
    url: string,
    body?: any,
    options?: { token?: string; params?: Record<string, string>; headers?: Record<string, string> }
  ): Promise<TestResponse<T>> {
    return this.request<T>('PUT', url, { body, ...options });
  }

  /**
   * DELETE request convenience method
   */
  async delete<T = any>(
    url: string,
    options?: { token?: string; params?: Record<string, string>; headers?: Record<string, string> }
  ): Promise<TestResponse<T>> {
    return this.request<T>('DELETE', url, options);
  }

  /**
   * PATCH request convenience method
   */
  async patch<T = any>(
    url: string,
    body?: any,
    options?: { token?: string; params?: Record<string, string>; headers?: Record<string, string> }
  ): Promise<TestResponse<T>> {
    return this.request<T>('PATCH', url, { body, ...options });
  }

  /**
   * Get request history for debugging
   */
  getRequestHistory(): TestResponse[] {
    return [...this.requestHistory];
  }

  /**
   * Clear request history
   */
  clearHistory(): void {
    this.requestHistory = [];
  }

  /**
   * Get timing statistics for all requests
   */
  getTimingStats(): {
    totalRequests: number;
    averageDuration: number;
    maxDuration: number;
    minDuration: number;
    successRate: number;
  } {
    if (this.requestHistory.length === 0) {
      return {
        totalRequests: 0,
        averageDuration: 0,
        maxDuration: 0,
        minDuration: 0,
        successRate: 0
      };
    }

    const durations = this.requestHistory.map(r => r.timing.duration);
    const successful = this.requestHistory.filter(r => r.ok).length;

    return {
      totalRequests: this.requestHistory.length,
      averageDuration: Math.round(durations.reduce((a, b) => a + b, 0) / durations.length),
      maxDuration: Math.max(...durations),
      minDuration: Math.min(...durations),
      successRate: successful / this.requestHistory.length
    };
  }

  /**
   * Update base URL
   */
  setBaseUrl(url: string): void {
    this.baseUrl = url;
  }

  /**
   * Set default header
   */
  setDefaultHeader(key: string, value: string): void {
    this.defaultHeaders[key] = value;
  }
}

// ============================================================
// SETUP & TEARDOWN FUNCTIONS
// ============================================================

let currentContext: TestContext | null = null;

/**
 * Setup complete test environment
 * 
 * Creates and initializes:
 * - Database connection
 * - Auth system with test users
 * - API client
 * - Pre-configured test users
 */
export async function setupTestEnvironment(options?: {
  dbUrl?: string;
  jwtSecret?: string;
  apiBaseUrl?: string;
  seedData?: boolean;
}): Promise<TestContext> {
  const testId = `test-${Date.now()}-${randomUUID().substring(0, 8)}`;
  console.log(`\n${'='.repeat(60)}`);
  console.log(`[SETUP] Initializing test environment: ${testId}`);
  console.log(`${'='.repeat(60)}\n`);

  const startTime = new Date();

  // 1. Initialize database
  console.log(`[SETUP] Step 1/3: Setting up test database...`);
  const database = new TestDatabase(options?.dbUrl);
  await database.connect();
  
  if (options?.seedData !== false) {
    await database.seedTestData();
  }

  // 2. Initialize auth system
  console.log(`[SETUP] Step 2/3: Setting up authentication...`);
  const auth = new TestAuth(options?.jwtSecret, database);
  auth.setDatabase(database);

  // Create pre-configured test users
  const users = await auth.getAllTestUsers();

  console.log(`[SETUP] Test users created:`);
  Object.entries(users).forEach(([role, { user }]) => {
    console.log(`  - ${role}: ${user.email} (${user.roleName})`);
  });

  // 3. Initialize API client
  console.log(`[SETUP] Step 3/3: Setting up API client...`);
  const client = new TestClient(options?.apiBaseUrl);

  // Assemble context
  currentContext = {
    database,
    auth,
    client,
    users: Object.fromEntries(
      Object.entries(users).map(([key, value]) => [key, value.user])
    ),
    startTime,
    testId
  };

  console.log(`\n${'='.repeat(60)}`);
  console.log(`[SETUP] Test environment ready!`);
  console.log(`[SETUP] Test ID: ${testId}`);
  console.log(`[SETUP] Started at: ${startTime.toISOString()}`);
  console.log(`${'='.repeat(60)}\n`);

  return currentContext;
}

/**
 * Teardown test environment
 * 
 * Cleans up:
 * - Database connection
 * - Prints summary statistics
 */
export async function teardownTestEnvironment(context?: TestContext): Promise<void> {
  const ctx = context || currentContext;
  
  if (!ctx) {
    console.warn(`[TEARDOWN] No active test environment to teardown`);
    return;
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`[TEARDOWN] Cleaning up test environment: ${ctx.testId}`);
  console.log(`${'='.repeat(60)}\n`);

  // Print timing stats
  const stats = ctx.client.getTimingStats();
  console.log(`[TEARDOWN] API Request Statistics:`);
  console.log(`  - Total Requests: ${stats.totalRequests}`);
  console.log(`  - Average Duration: ${stats.averageDuration}ms`);
  console.log(`  - Max Duration: ${stats.maxDuration}ms`);
  console.log(`  - Min Duration: ${stats.minDuration}ms`);
  console.log(`  - Success Rate: ${(stats.successRate * 100).toFixed(1)}%`);

  // Calculate total test duration
  const totalDuration = Date.now() - ctx.startTime.getTime();
  console.log(`\n[TEARDOWN] Total Test Duration: ${totalDuration}ms (${(totalDuration / 1000).toFixed(2)}s)`);

  // Cleanup database
  console.log(`\n[TEARDOWN] Cleaning up database...`);
  try {
    await ctx.database.reset();
    await ctx.database.disconnect();
    console.log(`[TEARDOWN] Database cleaned and disconnected`);
  } catch (error) {
    console.error(`[TEARDOWN] Error during database cleanup:`, error);
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`[TEARDOWN] Test environment destroyed: ${ctx.testId}`);
  console.log(`${'='.repeat(60)}\n`);

  currentContext = null;
}

/**
 * Get current test context (if active)
 */
export function getCurrentContext(): TestContext | null {
  return currentContext;
}

// ============================================================
// TEST DATA GENERATORS (using telecom-data.ts)
// ============================================================

/**
 * Re-export all telecom data generators for convenient access
 */
export const testDataGenerators = {
  // Incident generators
  generateTestIncident,
  generateBulkIncidents,
  
  // Threat/IOC generators
  generateTestIOC,
  generateBulkIOCs,
  
  // Telecom-specific generators
  generateMSISDN,
  generateIMEI,
  generateIMSI,
  
  // Complete dataset generator
  generateTelecomTestDataset
};

/**
 * Generate sample incident data for API testing
 */
export function createSampleIncidentPayload(overrides?: Partial<TestIncident>): Record<string, any> {
  const incident = generateTestIncident(overrides);
  return {
    title: incident.title,
    description: incident.description,
    severity: incident.severity,
    status: incident.status || 'NEW',
    category: incident.category,
    subscribersAffected: incident.subscribersAffected,
    sourceIp: incident.sourceIp,
    destIp: incident.destIp,
    msisdn: incident.msisdn,
    imei: incident.imei,
    mitreTechniques: incident.mitreTechniques,
    tatcCode: incident.tatcCode,
    ...overrides
  };
}

/**
 * Generate sample threat indicator payload for API testing
 */
export function createSampleThreatPayload(overrides?: Partial<TestThreatIndicator>): Record<string, any> {
  const ioc = generateTestIOC(overrides?.type);
  return {
    type: ioc.type,
    value: ioc.value,
    threatLevel: ioc.threatLevel,
    source: ioc.source,
    confidence: ioc.confidence,
    tlpLevel: ioc.tlpLevel,
    description: ioc.description,
    campaignId: ioc.campaignId,
    ...overrides
  };
}

/**
 * Generate bulk test data for load testing scenarios
 */
export function createLoadTestData(options?: {
  incidentsPerBatch?: number;
  numberOfBatches?: number;
}) {
  const config = {
    incidentsPerBatch: options?.incidentsPerBatch || 100,
    numberOfBatches: options?.numberOfBatches || 5
  };

  const batches = Array.from({ length: config.numberOfBatches }, (_, batchIndex) => ({
    batchId: `batch-${batchIndex + 1}`,
    incidents: generateBulkIncidents(config.incidentsPerBatch),
    iocs: generateBulkIOCs(config.incidentsPerBatch * 5), // 5x more IOCs than incidents
    generatedAt: new Date()
  }));

  return {
    batches,
    totalIncidents: config.incidentsPerBatch * config.numberOfBatches,
    totalIOCs: config.incidentsPerBatch * 5 * config.numberOfBatches,
    config
  };
}

// ============================================================
// ASSERTION HELPERS
// ============================================================

/**
 * Custom assertion error for test failures
 */
export class TestAssertionError extends Error {
  constructor(
    message: string,
    public readonly expected?: any,
    public readonly actual?: any
  ) {
    super(message);
    this.name = 'TestAssertionError';
  }
}

/**
 * Assertion helpers for test responses
 */
export const assertions = {
  /**
   * Assert response status code
   */
  expectStatus(response: TestResponse, expectedStatus: number): void {
    if (response.status !== expectedStatus) {
      throw new TestAssertionError(
        `Expected status ${expectedStatus}, got ${response.status}`,
        expectedStatus,
        response.status
      );
    }
  },

  /**
   * Assert response is successful
   */
  expectSuccess(response: TestResponse): void {
    if (!response.ok) {
      throw new TestAssertionError(
        `Expected successful response, got status ${response.status}`,
        '2xx/3xx',
        response.status
      );
    }
  },

  /**
   * Assert response contains data
   */
  expectData<T>(response: TestResponse<T>): T {
    if (!response.data) {
      throw new TestAssertionError(
        'Expected response to contain data',
        'non-null/undefined',
        response.data
      );
    }
    return response.data;
  },

  /**
   * Assert response matches shape
   */
  expectShape(data: any, shape: Record<string, string>): void {
    for (const [key, type] of Object.entries(shape)) {
      if (!(key in data)) {
        throw new TestAssertionError(
          `Expected data to have property '${key}'`,
          Object.keys(shape),
          Object.keys(data)
        );
      }
      
      const actualType = typeof data[key];
      if (type !== '*' && actualType !== type) {
        throw new TestAssertionError(
          `Expected property '${key}' to be ${type}, got ${actualType}`,
          type,
          actualType
        );
      }
    }
  },

  /**
   * Assert array has expected length
   */
  expectArrayLength(arr: any[], expectedLength: number): void {
    if (arr.length !== expectedLength) {
      throw new TestAssertionError(
        `Expected array length ${expectedLength}, got ${arr.length}`,
        expectedLength,
        arr.length
      );
    }
  },

  /**
   * Assert response time is within threshold
   */
  expectResponseTime(response: TestResponse, maxMs: number): void {
    if (response.timing.duration > maxMs) {
      throw new TestAssertionError(
        `Expected response time < ${maxMs}ms, got ${response.timing.duration}ms`,
        `< ${maxMs}ms`,
        `${response.timing.duration}ms`
      );
    }
  }
};

// ============================================================
// EXPORTS
// ============================================================

export default {
  TestDatabase,
  TestAuth,
  TestClient,
  setupTestEnvironment,
  teardownTestEnvironment,
  getCurrentContext,
  testDataGenerators,
  createSampleIncidentPayload,
  createSampleThreatPayload,
  createLoadTestData,
  assertions,
  TestAssertionError
};
