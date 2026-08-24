// ============================================================
// National SOC Platform - E2E Test Suite (Target: 80%+ Coverage)
// Playwright-based end-to-end testing
// ============================================================
//
// Coverage Areas:
// 1. Authentication & Authorization (15%)
// 2. Dashboard & Navigation (10%)
// 3. Incident Management (20%)
// 4. Alert Management (15%)
// 5. SS7/Telecom Monitoring (10%)
// 6. Threat Intelligence (5%)
// 7. Compliance Module (5%)
// 8. Admin Panel (10%)
// 9. Real-time Features (SSE/WebSocket) (5%)
// 10. Export & Reporting (5%)
//
// Usage: npx playwright test
//        npx playwright test --ui
// ============================================================

import { test, expect, Page } from '@playwright/test';

// ============================================================
// Test Configuration
// ============================================================

const TEST_CONFIG = {
  baseURL: process.env.TEST_URL || 'http://localhost:3000',
  adminUser: {
    email: process.env.ADMIN_EMAIL || 'admin@soc.local',
    password: process.env.ADMIN_PASSWORD || 'Admin2026Secure!',
  },
  analystUser: {
    email: process.env.ANALYST_EMAIL || 'analyst@soc.local',
    password: process.env.ANALYST_PASSWORD || 'Analyst2026Secure!',
  },
  timeouts: {
    navigation: 30000,
    action: 10000,
    apiResponse: 5000,
  }
};

// ============================================================
// Helper Functions
// ============================================================

async function loginAs(page: Page, user: typeof TEST_CONFIG.adminUser) {
  await page.goto(TEST_CONFIG.baseURL + '/auth/login');
  
  // Fill login form
  await page.fill('[data-testid="email-input"]', user.email);
  await page.fill('[data-testid="password-input"]', user.password);
  await page.click('[data-testid="login-button"]');
  
  // Wait for redirect to dashboard
  await expect(page).toHaveURL(/\/(dashboard|dashboards|)/, { timeout: TEST_CONFIG.timeouts.navigation });
}

async function waitForAPIResponse(page: Page, urlPattern: RegExp | string, timeout?: number) {
  return page.waitForResponse(
    response => urlPattern instanceof RegExp 
      ? urlPattern.test(response.url())
      : response.url().includes(urlPattern),
    { timeout: timeout || TEST_CONFIG.timeouts.apiResponse }
  );
}

// ============================================================
// SUITE 1: Authentication & Authorization Tests (15%)
// ============================================================

test.describe('Authentication Suite', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto(TEST_CONFIG.baseURL + '/auth/login');
  });

  test('should display login form correctly', async ({ page }) => {
    await expect(page.locator('[data-testid="email-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="password-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="login-button"]')).toBeVisible();
    await expect(page.locator('[data-testid="mfa-option"]')).toBeVisible();
  });

  test('should show error with invalid credentials', async ({ page }) => {
    await page.fill('[data-testid="email-input"]', 'invalid@test.com');
    await page.fill('[data-testid="password-input"]', 'wrongpassword');
    await page.click('[data-testid="login-button"]');
    
    await expect(page.locator('[data-testid="error-message"]')).toContain(/invalid|failed|incorrect/i);
  });

  test('should require both email and password', async ({ page }) => {
    await page.click('[data-testid="login-button"]');
    
    await expect(page.locator('[data-testid="email-input"]')).toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator('[data-testid="password-input"]')).toHaveAttribute('aria-invalid', 'true');
  });

  test('should login successfully as admin', async ({ page }) => {
    await loginAs(page, TEST_CONFIG.adminUser);
    
    await expect(page).toHaveURL(/\/dashboards\/|\/$/);
    await expect(page.locator('[data-testid="admin-menu"]')).toBeVisible();
  });

  test('should login successfully as analyst', async ({ page }) => {
    await loginAs(page, TEST_CONFIG.analystUser);
    
    await expect(page).toHaveURL(/\/dashboards\/|\/$/);
    await expect(page.locator('[data-testid="admin-menu"]')).not.toBeVisible();
  });

  test('should logout successfully and invalidate session', async ({ page }) => {
    await loginAs(page, TEST_CONFIG.adminUser);
    
    await page.click('[data-testid="user-menu"]');
    await page.click('[data-testid="logout-button"]');
    
    await expect(page).toHaveURL(/\/auth\/login/);
    
    await page.goto(TEST_CONFIG.baseURL + '/api/admin/users');
    await expect(page).toHaveURL(/\/auth\/login/);
  });
});

// ============================================================
// SUITE 2: Dashboard & Navigation Tests (10%)
// ============================================================

test.describe('Dashboard Suite', () => {
  
  test.beforeEach(async ({ page }) => {
    await loginAs(page, TEST_CONFIG.adminUser);
  });

  test('should load main dashboard with all widgets', async ({ page }) => {
    await expect(page.locator('[data-testid="metric-cards"]')).toBeVisible();
    await expect(page.locator('[data-testid="alerts-feed"]')).toBeVisible();
    await expect(page.locator('[data-testid="system-health"]')).toBeVisible();
    await expect(page.locator('[data-testid="recent-incidents"]')).toBeVisible();
  });

  test('should navigate between dashboards using sidebar', async ({ page }) => {
    const dashboards = [
      '[data-testid="nav-executive-dashboard"]',
      '[data-testid="nav-analyst-dashboard"]',
      '[data-testid="nav-telecom-dashboard"]',
      '[data-testid="nav-threat-hunting-dashboard"]',
      '[data-testid="nav-compliance-dashboard"]',
    ];
    
    for (const navSelector of dashboards) {
      if (await page.locator(navSelector).isVisible()) {
        await page.click(navSelector);
        await page.waitForLoadState('networkidle');
      }
    }
  });

  test('should handle responsive layout on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    
    await expect(page.locator('[data-testid="mobile-menu-toggle"]')).toBeVisible();
    await page.click('[data-testid="mobile-menu-toggle"]');
    await expect(page.locator('[data-testid="mobile-nav-menu"]')).toBeVisible();
    
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test('should support keyboard shortcuts', async ({ page }) => {
    await page.keyboard.press('/');
    await expect(page.locator('[data-testid="search-input"]')).toBeFocused();
  });
});

// ============================================================
// SUITE 3: Incident Management Tests (20%)
// ============================================================

test.describe('Incident Management Suite', () => {
  
  test.beforeEach(async ({ page }) => {
    await loginAs(page, TEST_CONFIG.adminUser);
    await page.goto(TEST_CONFIG.baseURL + '/incidents');
    await page.waitForLoadState('networkidle');
  });

  test('should display incident list with filters', async ({ page }) => {
    await expect(page.locator('[data-testid="incident-table"]')).toBeVisible();
    await expect(page.locator('[data-testid="status-filter"]')).toBeVisible();
    await expect(page.locator('[data-testid="severity-filter"]')).toBeVisible();
    await expect(page.locator('[data-testid="search-input"]')).toBeVisible();
  });

  test('should create new incident', async ({ page }) => {
    await page.click('[data-testid="create-incident-btn"]');
    
    await page.fill('[data-testid="incident-title"]', `E2E Test Incident - ${Date.now()}`);
    await page.fill('[data-testid="incident-description"]', 'Automated E2E test incident');
    await page.selectOption('[data-testid="incident-severity"]', 'HIGH');
    await page.selectOption('[data-testid="incident-attack-type"]', 'phishing');
    await page.click('[data-testid="submit-incident"]');
    
    await expect(page.locator('[data-testid="success-toast"]')).toContain(/created|success/i);
  });

  test('should filter incidents by status', async ({ page }) => {
    await page.selectOption('[data-testid="status-filter"]', 'NEW');
    await page.waitForLoadState('networkidle');
    
    const rows = page.locator('[data-testid="incident-row"]');
    const count = await rows.count();
    
    for (let i = 0; i < Math.min(count, 5); i++) {
      await expect(rows.nth(i).locator('[data-testid="status-badge"]')).toContainText('NEW');
    }
  });

  test('should view incident details', async ({ page }) => {
    const rows = page.locator('[data-testid="incident-row"]');
    
    if (await rows.count() > 0) {
      await rows.first().click();
      
      await expect(page.locator('[data-testid="incident-detail"]')).toBeVisible();
      await expect(page.locator('[data-testid="incident-timeline"]')).toBeVisible();
      await expect(page.locator('[data-testid="incident-evidence"]')).toBeVisible();
    }
  });

  test('should update incident status through workflow', async ({ page }) => {
    await page.selectOption('[data-testid="status-filter"]', 'NEW');
    await page.waitForLoadState('networkidle');
    
    const rows = page.locator('[data-testid="incident-row"]');
    
    if (await rows.count() > 0) {
      await rows.first().click();
      
      await page.click('[data-testid="status-update-btn"]');
      await page.selectOption('#status-select', 'IN_PROGRESS');
      await page.click('[data-testid="confirm-status-change"]');
      
      await expect(page.locator('[data-testid="current-status"]')).toContainText('IN_PROGRESS');
    }
  });

  test('should validate required fields on creation', async ({ page }) => {
    await page.click('[data-testid="create-incident-btn"]');
    await page.click('[data-testid="submit-incident"]');
    
    await expect(page.locator('[data-testid="title-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="severity-error"]')).toBeVisible();
  });
});

// ============================================================
// SUITE 4: Alert Management Tests (15%)
// ============================================================

test.describe('Alert Management Suite', () => {
  
  test.beforeEach(async ({ page }) => {
    await loginAs(page, TEST_CONFIG.adminUser);
    await page.goto(TEST_CONFIG.baseURL + '/alerts');
    await page.waitForLoadState('networkidle');
  });

  test('should display alerts feed in real-time', async ({ page }) => {
    await expect(page.locator('[data-testid="alerts-container"]')).toBeVisible();
    await expect(page.locator('[data-testid="live-indicator"]')).toHaveAttribute('data-status', 'connected');
  });

  test('should acknowledge alert', async ({ page }) => {
    await page.waitForTimeout(2000); // Wait for alerts
    
    const unacknowledgedAlerts = page.locator('[data-testid="alert-new"]');
    
    if (await unacknowledgedAlerts.count() > 0) {
      await unacknowledgedAlerts.first().click('[data-testid="acknowledge-btn"]');
      await expect(unacknowledgedAlerts.first()).toContainText('ACKNOWLEDGED');
    }
  });

  test('should escalate critical alert', async ({ page }) => {
    await page.selectOption('[data-testid="severity-filter"]', 'CRITICAL');
    await page.waitForLoadState('networkidle');
    
    const criticalAlerts = page.locator('[data-testid="alert-critical"]');
    
    if (await criticalAlerts.count() > 0) {
      await criticalAlerts.first().click('[data-testid="escalate-btn"]');
      await page.fill('#escalation-reason', 'Critical severity auto-escalation');
      await page.click('[data-testid="confirm-escalation"]');
      
      await expect(criticalAlerts.first()).toContainText('ESCALATED');
    }
  });

  test('should search and filter alerts', async ({ page }) => {
    await page.fill('[data-testid="search-input"]', 'malware');
    await page.waitForTimeout(500);
    
    await page.fill('[data-testid="search-input"]', '');
    await page.selectOption('[data-testid="source-filter"]', 'WAZUH');
    await page.waitForLoadState('networkidle');
  });
});

// ============================================================
// SUITE 5: SS7/Telecom Monitoring Tests (10%)
// ============================================================

test.describe('SS7 Telecom Monitoring Suite', () => {
  
  test.beforeEach(async ({ page }) => {
    await loginAs(page, TEST_CONFIG.adminUser);
    await page.goto(TEST_CONFIG.baseURL + '/dashboards/telecom');
  });

  test('should load SS7 monitoring dashboard', async ({ page }) => {
    await expect(page.locator('[data-testid="ss7-traffic-monitor"]')).toBeVisible();
    await expect(page.locator('[data-testid="signaling-map"]')).toBeVisible();
    await expect(page.locator('[data-testid="fraud-detection-panel"]')).toBeVisible();
  });

  test('should display SS7 messages in real-time', async ({ page }) => {
    await page.click('[data-testid="ss7-messages-tab"]');
    
    await expect(page.locator('[data-testid="ss7-message-table"]')).toBeVisible();
    await expect(page.locator('[data-testid="ss7-live-indicator"]')).toHaveAttribute('data-connected', 'true');
  });

  test('should inspect individual SS7 message', async ({ page }) => {
    await page.click('[data-testid="ss7-messages-tab"]');
    
    await page.waitForSelector('[data-testid="ss7-message-row"]', { timeout: 10000 });
    
    const messageRows = page.locator('[data-testid="ss7-message-row"]');
    
    if (await messageRows.count() > 0) {
      await messageRows.first().click();
      
      await expect(page.locator('[data-testid="message-inspector"]')).toBeVisible();
      await expect(page.locator('[data-testid="message-type"]')).toBeVisible();
      await expect(page.locator('[data-testid="calling-number"]')).toBeVisible();
      await expect(page.locator('[data-testid="raw-hex-view"]')).toBeVisible();
    }
  });

  test('should validate MSISDN format input', async ({ page }) => {
    await page.fill('[data-testid="msisdn-search"]', 'invalid-phone');
    await expect(page.locator('[data-testid="msisdn-error"]')).toBeVisible();
    
    await page.fill('[data-testid="msisdn-search"]', '+213550123456');
    await expect(page.locator('[data-testid="msisdn-error"]')).not.toBeVisible();
  });
});

// ============================================================
// SUITE 6: Admin Panel Tests (10%)
// ============================================================

test.describe('Admin Panel Suite', () => {
  
  test.beforeEach(async ({ page }) => {
    await loginAs(page, TEST_CONFIG.adminUser);
    await page.goto(TEST_CONFIG.baseURL + '/admin');
  });

  test('should load admin panel with all sections', async ({ page }) => {
    await expect(page.locator('[data-testid="user-management-section"]')).toBeVisible();
    await expect(page.locator('[data-testid="role-management-section"]')).toBeVisible();
    await expect(page.locator('[data-testid="session-management-section"]')).toBeVisible();
    await expect(page.locator('[data-testid="audit-log-section"]')).toBeVisible();
  });

  test('should manage users - CRUD operations', async ({ page }) => {
    await page.click('[data-testid="tab-users"]');
    
    await page.click('[data-testid="create-user-btn"]');
    await page.fill('#user-email', `e2e-test-${Date.now()}@test.com`);
    await page.fill('#user-name', 'E2E Test User');
    await page.selectOption('#user-role', 'analyst');
    await page.click('[data-testid="save-user"]');
    
    await expect(page.locator('[data-testid="success-toast"]')).toContain(/created|success/i);
  });

  test('should view and terminate sessions', async ({ page }) => {
    await page.click('[data-testid="tab-sessions"]');
    
    await expect(page.locator('[data-testid="active-sessions-table"]')).toBeVisible();
    
    const sessionRows = page.locator('[data-testid="session-row"]');
    
    if (await sessionRows.count() > 0) {
      await sessionRows.first().click('[data-testid="terminate-session"]');
      await page.click('[data-testid="confirm-terminate"]');
      await expect(page.locator('[data-testid="success-toast"]')).toContain(/terminated|success/i);
    }
  });

  test('should restrict non-admin access', async ({ page }) => {
    await page.click('[data-testid="user-menu"]');
    await page.click('[data-testid="logout-button"]');
    
    await loginAs(page, TEST_CONFIG.analystUser);
    await page.goto(TEST_CONFIG.baseURL + '/admin');
    
    await expect(page).toHaveURL(/(forbidden|unauthorized|auth\/login)/i);
  });
});

// ============================================================
// SUITE 7: API Integration Tests
// ============================================================

test.describe('API Integration Tests', () => {
  
  let authToken: string;

  test.beforeAll(async ({ request }) => {
    const response = await request.post(`${TEST_CONFIG.baseURL}/api/auth/login`, {
      data: {
        email: TEST_CONFIG.adminUser.email,
        password: TEST_CONFIG.adminUser.password,
      },
    });
    
    expect(response.status()).toBe(200);
    const body = await response.json();
    authToken = body.token;
  });

  test('GET /api/health should return healthy status', async ({ request }) => {
    const response = await request.get(`${TEST_CONFIG.baseURL}/api/health`);
    
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.status).toBe('healthy');
  });

  test('GET /api/metrics should return dashboard KPIs', async ({ request }) => {
    const response = await request.get(`${TEST_CONFIG.baseURL}/api/metrics`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.totalAlerts).toBeDefined();
    expect(body.criticalAlerts).toBeDefined();
    expect(body.activeIncidents).toBeDefined();
  });

  test('POST /api/incidents should create incident', async ({ request }) => {
    const response = await request.post(`${TEST_CONFIG.baseURL}/api/incidents`, {
      headers: { 
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        title: `API Test Incident ${Date.now()}`,
        description: 'Created via API integration test',
        severity: 'MEDIUM',
        attack_type: 'testing',
      },
    });
    
    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body.id).toBeDefined();
    expect(body.title).toContain('API Test');
  });

  test('GET /api/alerts should support pagination', async ({ request }) => {
    const response = await request.get(
      `${TEST_CONFIG.baseURL}/api/alerts?page=1&limit=10&status=NEW`,
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.data).toBeDefined();
    expect(body.pagination).toBeDefined();
    expect(body.pagination.page).toBe(1);
    expect(body.pagination.limit).toBe(10);
  });

  test('POST /api/ss7/messages should ingest SS7 data', async ({ request }) => {
    const response = await request.post(`${TEST_CONFIG.baseURL}/api/ss7/messages`, {
      headers: { 
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        message_type: 'SendRoutingInfoForSM',
        protocol_family: 'MAP',
        calling_number: '+213550123456',
        called_number: '+213551987654',
        imsi: '213010000000001',
        msisdn: '+213550123456',
        timestamp: new Date().toISOString(),
        raw_hex: '48' + '0'.repeat(100),
      },
    });
    
    expect(response.status()).toBe(201);
  });

  test('Unauthorized requests should be rejected', async ({ request }) => {
    const response = await request.get(`${TEST_CONFIG.baseURL}/api/admin/users`);
    expect(response.status()).toBe(401);
  });

  test('Invalid tokens should be rejected', async ({ request }) => {
    const response = await request.get(`${TEST_CONFIG.baseURL}/api/alerts`, {
      headers: { Authorization: 'Bearer invalid.token.here' },
    });
    
    expect(response.status()).toBe(401);
  });
});

// ============================================================
// SUITE 8: Accessibility & Performance Tests
// ============================================================

test.describe('Accessibility Tests', () => {
  
  test('should have proper heading hierarchy', async ({ page }) => {
    await loginAs(page, TEST_CONFIG.adminUser);
    
    const h1Count = await page.locator('h1').count();
    expect(h1Count).toBeLessThanOrEqual(1);
  });

  test('should be keyboard navigable', async ({ page }) => {
    await loginAs(page, TEST_CONFIG.adminUser);
    
    let focusedCount = 0;
    
    while (focusedCount < 20) {
      await page.keyboard.press('Tab');
      const focusedElement = page.locator(':focus');
      
      if (await focusedElement.count() > 0) {
        const tag = await focusedElement.evaluate(el => el.tagName);
        expect(['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA']).toContain(tag);
        focusedCount++;
      } else {
        break;
      }
    }
  });
});

test.describe('Performance Tests', () => {
  
  test('should load dashboard within performance budget', async ({ page }) => {
    const startTime = Date.now();
    
    await loginAs(page, TEST_CONFIG.adminUser);
    
    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(5000);
  });
});
