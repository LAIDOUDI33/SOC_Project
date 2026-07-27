/**
 * Dashboard API Tests
 * Verifies the /api/dashboard endpoint works correctly
 */

import { GET } from '@/app/api/dashboard/route';
import { NextRequest } from 'next/server';

describe('/api/dashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return dashboard data', async () => {
    const request = new NextRequest('http://localhost/api/dashboard');
    const response = await GET(request);
    
    expect(response.status).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty('success', true);
    expect(data).toHaveProperty('data');
  });

  it('should include KPI metrics', async () => {
    const request = new NextRequest('http://localhost/api/dashboard');
    const response = await GET(request);
    
    const data = await response.json();
    
    expect(data.data).toHaveProperty('kpis');
    expect(Array.isArray(data.data.kpis)).toBeTruthy();
    
    // KPIs should have required fields
    if (data.data.kpis.length > 0) {
      const kpi = data.data.kpis[0];
      expect(kpi).toHaveProperty('title');
      expect(kpi).toHaveProperty('value');
      expect(kpi).toHaveProperty('change');
      expect(kpi).toHaveProperty('unit');
    }
  });

  it('should include alert statistics', async () => {
    const request = new NextRequest('http://localhost/api/dashboard');
    const response = await GET(request);
    
    const data = await response.json();
    
    expect(data.data).toHaveProperty('alerts');
    expect(data.data.alerts).toHaveProperty('total');
    expect(data.data.alerts).toHaveProperty('bySeverity');
  });

  it('should include incident statistics', async () => {
    const request = new NextRequest('http://localhost/api/dashboard');
    const response = await GET(request);
    
    const data = await response.json();
    
    expect(data.data).toHaveProperty('incidents');
    expect(data.data.incidents).toHaveProperty('total');
    expect(data.data.incidents).toHaveProperty('open');
    expect(data.data.incidents).toHaveProperty('resolvedToday');
  });

  it('should handle errors gracefully', async () => {
    // Mock database error
    const { db } = require('@/lib/db');
    (db.$queryRaw as jest.Mock).mockRejectedValue(new Error('DB connection failed'));
    
    const request = new NextRequest('http://localhost/api/dashboard');
    const response = await GET(request);
    
    expect(response.status).toBe(500);
    
    const data = await response.json();
    expect(data.success).toBe(false);
    expect(data.error).toBeDefined();
  });
});
