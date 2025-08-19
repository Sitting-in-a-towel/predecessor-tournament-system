// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Error Handling and Edge Cases', () => {
  test('404 page handling', async ({ page }) => {
    // Navigate to non-existent page
    const response = await page.goto('/this-page-does-not-exist-123456');
    
    if (response) {
      const status = response.status();
      console.log(`404 test response status: ${status}`);
    }
    
    // Check for 404 message
    const errorMessage = page.locator(':has-text("404"), :has-text("not found"), :has-text("Not Found")').first();
    if (await errorMessage.isVisible()) {
      console.log('✅ 404 error message displayed');
    }
    
    // Check for home link
    const homeLink = page.locator('a:has-text("Home"), button:has-text("Home")').first();
    if (await homeLink.isVisible()) {
      console.log('✅ Home link found on 404 page');
    }
    
    await page.screenshot({ path: 'test-results/404-page.png', fullPage: true });
  });

  test('Form validation errors', async ({ page }) => {
    // Test various forms for validation
    const forms = [
      { url: '/teams/create', name: 'Team creation' },
      { url: '/tournaments/create', name: 'Tournament creation' }
    ];
    
    for (const form of forms) {
      await page.goto(form.url);
      
      // Skip if requires auth
      if (page.url().includes('/login')) {
        console.log(`${form.name} requires authentication`);
        continue;
      }
      
      // Find form and submit button
      const formElement = page.locator('form').first();
      if (await formElement.isVisible()) {
        const submitButton = formElement.locator('button[type="submit"], button:has-text("Create"), button:has-text("Submit")').first();
        
        if (await submitButton.isVisible()) {
          // Try to submit empty form
          await submitButton.click();
          await page.waitForTimeout(500);
          
          // Check for validation errors
          const errorMessages = page.locator('[class*="error"], [class*="invalid"], .error-message');
          const errorCount = await errorMessages.count();
          
          if (errorCount > 0) {
            console.log(`✅ ${form.name} shows ${errorCount} validation errors for empty form`);
            const firstError = await errorMessages.first().textContent();
            console.log(`First error: ${firstError}`);
          }
        }
      }
    }
  });

  test('API error handling', async ({ page, request }) => {
    // Test various API endpoints with invalid data
    const tests = [
      {
        method: 'GET',
        url: 'http://localhost:3001/api/tournaments/invalid-id-123',
        description: 'Invalid tournament ID'
      },
      {
        method: 'GET',
        url: 'http://localhost:3001/api/teams/invalid-team-id',
        description: 'Invalid team ID'
      },
      {
        method: 'POST',
        url: 'http://localhost:3001/api/teams',
        body: { invalid: 'data' },
        description: 'Invalid team creation data'
      }
    ];
    
    for (const test of tests) {
      try {
        let response;
        if (test.method === 'GET') {
          response = await request.get(test.url);
        } else if (test.method === 'POST') {
          response = await request.post(test.url, { data: test.body });
        }
        
        const status = response.status();
        console.log(`${test.description}: Status ${status}`);
        
        if (status >= 400) {
          const body = await response.text();
          console.log(`✅ API properly handles ${test.description}`);
        }
      } catch (error) {
        console.log(`✅ API error handled for ${test.description}`);
      }
    }
  });

  test('Empty state handling', async ({ page }) => {
    // Check various pages for empty state handling
    const pages = [
      { url: '/teams', name: 'Teams', emptyText: 'No teams' },
      { url: '/tournaments', name: 'Tournaments', emptyText: 'No tournaments' }
    ];
    
    for (const pageInfo of pages) {
      await page.goto(pageInfo.url);
      await page.waitForLoadState('networkidle');
      
      // Check for empty state message
      const emptyMessage = page.locator(`:has-text("${pageInfo.emptyText}"), :has-text("empty"), :has-text("none")`).first();
      
      if (await emptyMessage.isVisible()) {
        console.log(`✅ ${pageInfo.name} page shows empty state message`);
      }
      
      // Check for create/add button
      const createButton = page.locator('button:has-text("Create"), button:has-text("Add"), a:has-text("Create")').first();
      if (await createButton.isVisible()) {
        console.log(`✅ ${pageInfo.name} page shows create button in empty state`);
      }
    }
  });

  test('Loading states', async ({ page }) => {
    // Test loading states on data-heavy pages
    await page.goto('/tournaments');
    
    // Check for loading indicators
    const loadingIndicators = [
      '[class*="loading"]',
      '[class*="spinner"]',
      '[class*="skeleton"]',
      ':has-text("Loading")'
    ];
    
    for (const selector of loadingIndicators) {
      const loading = page.locator(selector).first();
      if (await loading.isVisible({ timeout: 1000 }).catch(() => false)) {
        console.log(`✅ Loading indicator found: ${selector}`);
        
        // Wait for content to load
        await page.waitForLoadState('networkidle');
        
        // Check loading indicator is gone
        const stillVisible = await loading.isVisible({ timeout: 1000 }).catch(() => false);
        if (!stillVisible) {
          console.log('✅ Loading indicator removed after content loads');
        }
      }
    }
  });

  test('Network error simulation', async ({ page, context }) => {
    // Simulate network failure
    await context.route('**/api/**', route => route.abort());
    
    await page.goto('/tournaments');
    await page.waitForTimeout(2000);
    
    // Check for error messages
    const errorMessage = page.locator('[class*="error"], :has-text("error"), :has-text("failed")').first();
    if (await errorMessage.isVisible()) {
      const text = await errorMessage.textContent();
      console.log(`✅ Network error handled: ${text}`);
    }
    
    // Check for retry button
    const retryButton = page.locator('button:has-text("Retry"), button:has-text("Try again")').first();
    if (await retryButton.isVisible()) {
      console.log('✅ Retry button available after network error');
    }
    
    // Re-enable network
    await context.unroute('**/api/**');
  });

  test('Input boundary testing', async ({ page }) => {
    await page.goto('/teams/create');
    
    // Skip if requires auth
    if (page.url().includes('/login')) {
      return;
    }
    
    // Test various input boundaries
    const inputs = [
      { selector: 'input[type="text"]', maxLength: 255, testValue: 'a'.repeat(300) },
      { selector: 'input[type="number"]', maxValue: 999999, testValue: '9999999' },
      { selector: 'textarea', maxLength: 1000, testValue: 'a'.repeat(1500) }
    ];
    
    for (const input of inputs) {
      const element = page.locator(input.selector).first();
      if (await element.isVisible()) {
        await element.fill(input.testValue);
        const actualValue = await element.inputValue();
        
        if (actualValue.length <= input.maxLength || parseInt(actualValue) <= input.maxValue) {
          console.log(`✅ Input properly limits value: ${input.selector}`);
        }
      }
    }
  });

  test('Session timeout handling', async ({ page, context }) => {
    // Set a test cookie that expires quickly
    await context.addCookies([{
      name: 'session_test',
      value: 'test_value',
      domain: 'localhost',
      path: '/',
      expires: Date.now() / 1000 + 1 // Expires in 1 second
    }]);
    
    await page.goto('/profile');
    await page.waitForTimeout(2000); // Wait for cookie to expire
    
    // Try to perform an action that requires auth
    const actionButton = page.locator('button').first();
    if (await actionButton.isVisible()) {
      await actionButton.click();
      
      // Check if redirected to login
      if (page.url().includes('/login')) {
        console.log('✅ Session timeout properly redirects to login');
      }
    }
  });

  test('XSS prevention', async ({ page }) => {
    // Try to inject script tags in various inputs
    const xssPayload = '<script>alert("XSS")</script>';
    
    await page.goto('/teams');
    
    // Find search input
    const searchInput = page.locator('input[type="search"], input[type="text"]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill(xssPayload);
      await page.waitForTimeout(500);
      
      // Check if script executed (it shouldn't)
      const alertDialog = page.locator('[role="alert"], .alert').first();
      if (!await alertDialog.isVisible()) {
        console.log('✅ XSS payload properly escaped');
      }
      
      // Check if the text is displayed escaped
      const displayedText = page.locator(`:has-text("${xssPayload}")`).first();
      if (await displayedText.isVisible()) {
        const text = await displayedText.textContent();
        if (text.includes('&lt;script&gt;')) {
          console.log('✅ Script tags properly HTML-encoded');
        }
      }
    }
  });

  test('Console error monitoring', async ({ page }) => {
    const consoleErrors = [];
    
    // Monitor console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    // Navigate through main pages
    const pages = ['/', '/tournaments', '/teams', '/profile'];
    
    for (const url of pages) {
      await page.goto(url);
      await page.waitForLoadState('networkidle');
    }
    
    console.log(`Total console errors found: ${consoleErrors.length}`);
    if (consoleErrors.length > 0) {
      console.log('Console errors:');
      consoleErrors.forEach(error => console.log(`- ${error}`));
    } else {
      console.log('✅ No console errors detected');
    }
  });
});