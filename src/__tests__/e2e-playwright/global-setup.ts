/**
 * National SOC Platform - E2E Test Global Setup
 * 
 * Runs once before all test suites to:
 * - Set up test database
 * - Create test users
 * - Configure test environment
 * - Initialize mock services
 */

import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Setting up E2E test environment for Djezzy National SOC Platform');
  
  // Extract base URL from config
  const baseURL = config.projects[0]?.use?.baseURL || 'http://localhost:3000';
  console.log(`📡 Base URL: ${baseURL}`);
  
  // Create browser for setup tasks
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Step 1: Verify application is running
    console.log('✅ Verifying application is running...');
    await page.goto(`${baseURL}/api/health`, { timeout: 30000 });
    const healthStatus = await page.textContent('body');
    console.log(`🏥 Health Status: ${healthStatus?.substring(0, 50)}...`);
    
    // Step 2: Initialize test data (if API available)
    console.log('🔧 Initializing test data...');
    
    try {
      // Attempt to seed test data via API
      const response = await page.evaluate(async () => {
        try {
          const res = await fetch('/api/tests/setup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'initialize_test_data' }),
          });
          return await res.json();
        } catch (error) {
          return { error: 'Test setup endpoint not available' };
        }
      });
      
      if (!response.error) {
        console.log(`✅ Test data initialized: ${JSON.stringify(response)}`);
      } else {
        console.log(`⚠️  ${response.error} - using existing data`);
      }
    } catch (error) {
      console.log('⚠️  Could not initialize test data, will use existing data');
    }
    
    // Step 3: Take baseline screenshot for visual regression
    console.log('📸 Capturing baseline screenshots...');
    await page.goto(`${baseURL}/login`);
    await page.waitForLoadState('networkidle');
    await page.screenshot({
      path: 'test-results/e2e/baseline/login-page.png',
      fullPage: true,
    });
    
    console.log('✅ Global setup completed successfully');
    
  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

export default globalSetup;
