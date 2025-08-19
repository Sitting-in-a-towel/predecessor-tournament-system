// @ts-check
const { defineConfig, devices } = require('@playwright/test');

/**
 * Comprehensive Playwright configuration for end-to-end testing
 * Tests the entire Predecessor Tournament Management System
 */
module.exports = defineConfig({
  testDir: './tests',
  fullyParallel: false, // Run tests sequentially for better debugging
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Single worker for sequential testing
  reporter: [
    ['html', { outputFolder: 'test-results/html-report', open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['list']
  ],
  
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    
    // Extended timeouts for thorough testing
    actionTimeout: 10000,
    navigationTimeout: 30000,
    
    // Viewport and browser settings
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
    
    // Accept downloads for testing export features
    acceptDownloads: true,
    
    // Custom context options
    contextOptions: {
      // Save authentication state
      storageState: undefined, // Will be set per test
    },
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Web server configuration
  webServer: [
    {
      command: 'cd backend && npm run dev',
      port: 3001,
      timeout: 120 * 1000,
      reuseExistingServer: true,
    },
    {
      command: 'cd frontend && npm start',
      port: 3000,
      timeout: 120 * 1000,
      reuseExistingServer: true,
    }
  ],
  
  // Global timeout
  timeout: 60 * 1000,
  expect: {
    timeout: 10 * 1000,
  },
});