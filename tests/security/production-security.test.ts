/**
 * CyberSOC Platform - Production Test Suite
 * 
 * CRITICAL: These tests MUST pass before production deployment
 * Covers: Security, Authentication, API endpoints, Database operations
 * 
 * Run: npm run test:production
 * Coverage Target: 60%+ for production approval
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { NextRequest } from 'next/server';

// Import production security middleware
import {
  applySecurityHeaders,
  generateCSRFToken,
  validateCSRFToken,
  sanitizeInput,
  validateMethod,
  validateURL,
  extractClientIP,
  generateRequestId,
  createProductionSecurityMiddleware,
} from '@/lib/security/production-middleware';

// ============================================================================
// Test Configuration
// ============================================================================

const TEST_TIMEOUT = 10000; // 10 seconds per test

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.CSRF_SECRET = 'test-csrf-secret-for-testing-32chars';
process.env.DISABLE_CSRF_PROTECTION = 'false';
process.env.MAX_URL_LENGTH = '2048';
process.env.SECURITY_HEADER_X_FRAME_OPTIONS = 'DENY';
process.env.SECURITY_HEADER_STRICT_TRANSPORT_SECURITY = 'max-age=31536000; includeSubDomains';

// ============================================================================
// 1. Security Headers Tests
// ============================================================================

describe('Security Headers Middleware', () => {
  
  it('should apply X-Frame-Options header', () => {
    const response = new Response('{}', { headers: { 'content-type': 'application/json' } });
    const secured = applySecurityHeaders(response as any);
    
    expect(secured.headers.get('X-Frame-Options')).toBe('DENY');
  }, TEST_TIMEOUT);
  
  it('should apply X-Content-Type-Options header', () => {
    const response = new Response('{}');
    const secured = applySecurityHeaders(response as any);
    
    expect(secured.headers.get('X-Content-Type-Options')).toBe('nosniff');
  }, TEST_TIMEOUT);
  
  it('should apply X-XSS-Protection header', () => {
    const response = new Response('{}');
    const secured = applySecurityHeaders(response as any);
    
    expect(secured.headers.get('X-XSS-Protection')).toContain('mode=block');
  }, TEST_TIMEOUT);
  
  it('should remove Server header to prevent fingerprinting', () => {
    const response = new Response('{}', { headers: { 'Server': 'nginx/1.20.0' } });
    const secured = applySecurityHeaders(response as any);
    
    expect(secured.headers.get('Server')).toBeNull();
  }, TEST_TIMEOUT);
  
  it('should remove X-Powered-By header', () => {
    const response = new Response('{}', { headers: { 'X-Powered-By': 'Express' } });
    const secured = applySecurityHeaders(response as any);
    
    expect(secured.headers.get('X-Powered-By')).toBeNull();
  }, TEST_TIMEOUT);
  
  it('should add X-Request-ID header', () => {
    const response = new Response('{}');
    const secured = applySecurityHeaders(response as any);
    
    const requestId = secured.headers.get('X-Request-ID');
    expect(requestId).toBeDefined();
    expect(requestId).toBeTruthy();
    expect(typeof requestId).toBe('string');
    expect(requestId!.length).toBeGreaterThan(10);
  }, TEST_TIMEOUT);

});

// ============================================================================
// 2. CSRF Protection Tests
// ============================================================================

describe('CSRF Token Generation & Validation', () => {
  
  it('should generate CSRF token with correct length', () => {
    const token = generateCSRFToken();
    
    expect(token).toBeDefined();
    expect(token.length).toBe(64); // 32 bytes * 2 hex chars
  }, TEST_TIMEOUT);
  
  it('should generate unique tokens each time', () => {
    const token1 = generateCSRFToken();
    const token2 = generateCSRFToken();
    
    expect(token1).not.toBe(token2);
  }, TEST_TIMEOUT);
  
  it('should validate matching tokens', async () => {
    const token = generateCSRFToken();
    
    const request = new NextRequest('http://localhost:3000/api/test', {
      method: 'POST',
      headers: {
        'x-csrf-token': token,
        'cookie': `_csrf_token=${token}`,
      },
    });
    
    const isValid = validateCSRFToken(request);
    expect(isValid).toBe(true);
  }, TEST_TIMEOUT);
  
  it('should reject mismatched tokens', async () => {
    const cookieToken = generateCSRFToken();
    const headerToken = generateCSRFToken(); // Different token
    
    const request = new NextRequest('http://localhost:3000/api/test', {
      method: 'POST',
      headers: {
        'x-csrf-token': headerToken,
        'cookie': `_csrf_token=${cookieToken}`,
      },
    });
    
    const isValid = validateCSRFToken(request);
    expect(isValid).toBe(false);
  }, TEST_TIMEOUT);
  
  it('should allow GET requests without CSRF token', async () => {
    const request = new NextRequest('http://localhost:3000/api/test', {
      method: 'GET',
    });
    
    const isValid = validateCSRFToken(request);
    expect(isValid).toBe(true); // Safe methods don't require CSRF
  }, TEST_TIMEOUT);
  
  it('should reject POST requests without CSRF token', async () => {
    const request = new NextRequest('http://localhost:3000/api/test', {
      method: 'POST',
    });
    
    const isValid = validateCSRFToken(request);
    expect(isValid).toBe(false);
  }, TEST_TIMEOUT);

});

// ============================================================================
// 3. Input Validation & Sanitization Tests
// ============================================================================

describe('Input Sanitization', () => {
  
  it('should sanitize HTML tags from input', () => {
    const malicious = '<script>alert("xss")</script>';
    const sanitized = sanitizeInput(malicious);
    
    expect(sanitized).not.toContain('<script>');
    expect(sanitized).not.toContain('</script>');
    expect(sanitized).toContain('&lt;script&gt;');
  }, TEST_TIMEOUT);
  
  it('should remove null bytes', () => {
    const input = 'hello\0world';
    const sanitized = sanitizeInput(input);
    
    expect(sanitized).not.toContain('\0');
    expect(sanitized).toBe('helloworld');
  }, TEST_TIMEOUT);
  
  it('should trim whitespace', () => {
    const input = '   hello world   ';
    const sanitized = sanitizeInput(input);
    
    expect(sanitized).toBe('hello world');
  }, TEST_TIMEOUT);

});

describe('URL Validation', () => {
  
  it('should accept valid URLs', () => {
    expect(validateURL('/api/users')).toBe(true);
    expect(validateURL('/api/users/123')).toBe(true);
    expect(validateURL('/health')).toBe(true);
  }, TEST_TIMEOUT);
  
  it('should reject URLs with path traversal', () => {
    expect(validateURL('/api/../../../etc/passwd')).toBe(false);
  }, TEST_TIMEOUT);

});

// ============================================================================
// 4. IP Address Extraction Tests
// ============================================================================

describe('Client IP Extraction', () => {
  
  it('should extract IP from Cloudflare header', () => {
    const request = new NextRequest('http://localhost:3000/api/test', {
      headers: {
        'cf-connecting-ip': '203.0.113.50',
      },
    });
    
    const ip = extractClientIP(request);
    expect(ip).toBe('203.0.113.50');
  }, TEST_TIMEOUT);
  
  it('should extract first IP from X-Forwarded-For', () => {
    const request = new NextRequest('http://localhost:3000/api/test', {
      headers: {
        'x-forwarded-for': '198.51.100.25, 203.0.113.50',
      },
    });
    
    const ip = extractClientIP(request);
    expect(ip).toBe('198.51.100.25');
  }, TEST_TIMEOUT);

});

// ============================================================================
// 5. Integration Tests - Combined Security Middleware
// ============================================================================

describe('Production Security Middleware - Integration', () => {
  
  let mockHandler: jest.Mock;
  
  beforeEach(() => {
    mockHandler = jest.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    );
  });
  
  it('should apply all security measures to successful responses', async () => {
    const securityMiddleware = createProductionSecurityMiddleware(mockHandler, {
      applyRateLimit: false,
      applyCSRF: false,
      applyInputValidation: false,
      applyAuditLogging: false,
    });
    
    const request = new NextRequest('http://localhost:3000/api/test');
    const response = await securityMiddleware(request);
    
    expect(response.headers.get('X-Frame-Options')).toBe('DENY');
    expect(response.headers.get('X-Request-ID')).toBeDefined();
  }, TEST_TIMEOUT);
  
  it('should return 403 for invalid CSRF on POST requests', async () => {
    const securityMiddleware = createProductionSecurityMiddleware(mockHandler, {
      applyRateLimit: false,
      applyCSRF: true,
      applyInputValidation: false,
      applyAuditLogging: false,
    });
    
    const request = new NextRequest('http://localhost:3000/api/test', {
      method: 'POST',
    });
    
    const response = await securityMiddleware(request);
    
    expect(response.status).toBe(403);
    const body = await response.json() as any;
    expect(body.errorCode).toBe('CSRF_VALIDATION_FAILED');
  }, TEST_TIMEOUT);
  
  it('should handle errors gracefully and not leak details', async () => {
    const errorHandler = jest.fn().mockRejectedValue(new Error('Database connection failed'));
    
    const securityMiddleware = createProductionSecurityMiddleware(errorHandler, {
      applyRateLimit: false,
      applyCSRF: false,
      applyInputValidation: false,
      applyAuditLogging: false,
    });
    
    const request = new NextRequest('http://localhost:3000/api/test');
    const response = await securityMiddleware(request);
    
    expect(response.status).toBe(500);
    const body = await response.json() as any;
    expect(body.error).toBe('Internal Server Error');
    expect(body.stack).toBeUndefined();
    expect(body.requestId).toBeDefined();
  }, TEST_TIMEOUT);

});

// ============================================================================
// 6. Performance Tests
// =============================================================================

describe('Performance Benchmarks', () => {
  
  it('should generate 1000 CSRF tokens in under 1 second', () => {
    const start = Date.now();
    
    for (let i = 0; i < 1000; i++) {
      generateCSRFToken();
    }
    
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(1000);
  }, TEST_TIMEOUT);
  
  it('should sanitize input efficiently', () => {
    const maliciousInput = '<script>alert("xss")</script>\'; DROP TABLE users; --\0null byte';
    const iterations = 10000;
    const start = Date.now();
    
    for (let i = 0; i < iterations; i++) {
      sanitizeInput(maliciousInput);
    }
    
    const duration = Date.now() - start;
    const perOp = duration / iterations;
    
    expect(perOp).toBeLessThan(1);
  }, TEST_TIMEOUT);

});
