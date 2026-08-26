/**
 * National SOC Platform - Playwright E2E Test Configuration
 * 
 * Configuration for end-to-end testing of the Djezzy National SOC Platform.
 * Tests cover critical user flows including authentication, dashboard navigation,
 * alert management, incident response, and compliance reporting.
 */

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  // Test directory
  testDir: './src/__tests__/e2e',
  
  // Run tests in parallel by default
  fullyParallel: true,
  
  // Fail build on CI if any test failed
  failOnContinuedError: true,
  
  // Limit concurrent workers on CI for stability
  workers: process.env.CI ? 2 : undefined,
  
  // Reporter configuration
  reporter: [
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results/e2e-results.json' }],
    ['list'],
  ],
  
  // Global settings
  use: {
    // Base URL for all tests (can be overridden via --base-url)
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
    
    // Collect trace when retrying the failed test
    trace: 'on-first-retry',
    
    // Record video only when retrying a test for debugging
    video: 'retain-on-failure',
    
    // Take screenshot on failure
    screenshot: 'only-on-failure',
    
    // Action timeout (increased for complex UI interactions)
    actionTimeout: 30000,
    
    // Navigation timeout
    navigationTimeout: 60000,
    
    // Default viewport size (responsive design testing)
    viewport: { width: 1920, height: 1080 },
    
    // Ignore HTTPS errors in development/testing
    ignoreHTTPSErrors: true,
  },
  
  // Configure projects for different browsers/environments
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    
    // Mobile testing
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],
  
  // Run local dev server before starting tests
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000, // 2 minutes to start dev server
    stdout: 'pipe',
    stderr: 'pipe',
  },
  
  // Global setup/teardown
  globalSetup: require.resolve('./src/__tests__/e2e/global-setup.ts'),
  globalTeardown: require.resolve('./src/__tests__/e2e/global-teardown.ts'),
  
  // Output directory for test artifacts
  outputDir: 'test-results/e2e',
  
  // Retry configuration
  retries: process.env.CI ? 2 : 0,
  
  // Test timeout
  timeout: 60000, // 60 seconds per test
  
  // Expect timeout
  expect: {
    timeout: 10000,
  },
  
  // Block external resources to speed up tests and reduce flakiness
  routeCORS: undefined,
});
