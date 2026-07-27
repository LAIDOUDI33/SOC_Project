/**
 * Health Check Endpoint Tests
 * Verifies the /api/health endpoint works correctly
 */

import { GET } from '@/app/api/health/route';
import { NextRequest } from 'next/server';

describe('/api/health', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return health status', async () => {
    const request = new NextRequest('http://localhost/api/health');
    const response = await GET(request);
    
    expect(response.status).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty('status');
    expect(['healthy', 'degraded', 'unhealthy']).toContain(data.status);
  });

  it('should include timestamp', async () => {
    const request = new NextRequest('http://localhost/api/health');
    const response = await GET(request);
    
    const data = await response.json();
    expect(data).toHaveProperty('timestamp');
    expect(new Date(data.timestamp).getTime()).not.toBeNaN();
  });

  it('should include checks object', async () => {
    const request = new NextRequest('http://localhost/api/health');
    const response = await GET(request);
    
    const data = await response.json();
    expect(data).toHaveProperty('checks');
    expect(data.checks).toHaveProperty('database');
    expect(data.checks).toHaveProperty('redis');
    expect(data.checks).toHaveProperty('memory');
    expect(data.checks).toHaveProperty('disk');
    expect(data.checks).toHaveProperty('cpu');
  });

  it('should include metrics', async () => {
    const request = new NextRequest('http://localhost/api/health');
    const response = await GET(request);
    
    const data = await response.json();
    expect(data).toHaveProperty('metrics');
    expect(data.metrics).toHaveProperty('activeConnections');
    expect(data.metrics).toHaveProperty('requestsPerSecond');
    expect(data.metrics).toHaveProperty('averageResponseTime');
    expect(data.metrics).toHaveProperty('errorRate');
  });

  it('should return proper headers', async () => {
    const request = new NextRequest('http://localhost/api/health');
    const response = await GET(request);
    
    expect(response.headers.get('cache-control')).toBe('no-cache, no-store, must-revalidate');
    expect(response.headers.get('pragma')).toBe('no-cache');
  });

  it('should handle detailed query param', async () => {
    const request = new NextRequest('http://localhost/api/health?detailed=true');
    const response = await GET(request);
    
    expect(response.status).toBe(200);
    const data = await response.json();
    // Detailed response should have more info
    expect(Object.keys(data.checks.database).length).toBeGreaterThan(0);
  });
});
