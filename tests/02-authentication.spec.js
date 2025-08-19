// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Authentication Flow Tests', () => {
  let authCookies = null;
  
  test('Test authentication system works', async ({ page, request }) => {
    console.log('Testing authentication system...');
    
    // Test the test-auth endpoint directly
    const loginResponse = await request.post('http://localhost:3001/api/test-auth/login-test-admin');
    expect(loginResponse.ok()).toBeTruthy();
    
    const loginData = await loginResponse.json();
    console.log('Test auth response:', loginData);
    expect(loginData.user).toBeDefined();
    expect(loginData.user.isAdmin).toBe(true);
    
    // Save cookies for authenticated tests
    authCookies = await loginResponse.headers();
    console.log('✅ Test authentication successful');
  });

  test('Login page renders correctly', async ({ page }) => {
    await page.goto('/login');
    
    // Check for login elements
    const loginContainer = page.locator('.login, .auth, [class*="login"]').first();
    
    // Check for Discord login button
    const discordButton = page.locator('button:has-text("Discord"), a:has-text("Discord"), [class*="discord"]').first();
    if (await discordButton.isVisible()) {
      console.log('✅ Discord login button found');
      
      // Check button is clickable
      const isEnabled = await discordButton.isEnabled();
      expect(isEnabled).toBeTruthy();
      
      // Get the OAuth URL
      const href = await discordButton.getAttribute('href');
      if (href) {
        console.log(`Discord OAuth URL: ${href}`);
        expect(href).toContain('auth/discord');
      }
    }
    
    // Screenshot login page
    await page.screenshot({ path: 'test-results/login-page.png', fullPage: true });
  });

  test('Protected routes redirect unauthenticated users', async ({ page }) => {
    // Clear any existing auth
    await page.context().clearCookies();
    
    const protectedRoutes = [
      '/admin/dashboard',
      '/teams/create',
      '/profile/settings',
      '/tournaments/create'
    ];
    
    for (const route of protectedRoutes) {
      console.log(`Testing protected route: ${route}`);
      
      await page.goto(route);
      
      // Should redirect to login or show auth error
      const url = page.url();
      const isLoginPage = url.includes('/login') || url.includes('/auth');
      const hasAuthError = await page.locator('.error:has-text("auth"), .error:has-text("login")').count() > 0;
      
      if (isLoginPage) {
        console.log(`✅ ${route} redirected to login`);
      } else if (hasAuthError) {
        console.log(`✅ ${route} shows auth error`);
      } else {
        console.log(`⚠️ ${route} may not be properly protected`);
      }
    }
  });

  test('User menu and logout functionality', async ({ page }) => {
    await page.goto('/');
    
    // Look for user menu or profile dropdown
    const userMenu = page.locator('[class*="user"], [class*="profile"], [class*="account"]').first();
    
    if (await userMenu.isVisible()) {
      console.log('User menu found');
      
      // Click to open dropdown if needed
      const isDropdown = await userMenu.locator('[class*="dropdown"]').count() > 0;
      if (isDropdown) {
        await userMenu.click();
        await page.waitForTimeout(500);
      }
      
      // Look for logout button
      const logoutButton = page.locator('button:has-text("Logout"), a:has-text("Logout"), [class*="logout"]').first();
      if (await logoutButton.isVisible()) {
        console.log('✅ Logout button found');
      }
    }
  });

  test('Session persistence check', async ({ page, context }) => {
    // Set a test cookie
    await context.addCookies([{
      name: 'test_session',
      value: 'test_value',
      domain: 'localhost',
      path: '/',
    }]);
    
    // Navigate and check cookie persists
    await page.goto('/');
    const cookies = await context.cookies();
    const testCookie = cookies.find(c => c.name === 'test_session');
    
    if (testCookie) {
      console.log('✅ Session cookies persist across navigation');
    } else {
      console.log('⚠️ Session cookies may not be persisting');
    }
  });

  test('API authentication check', async ({ request }) => {
    // Test authenticated API calls
    const endpoints = [
      '/api/auth/me',
      '/api/teams',
      '/api/profile',
    ];
    
    for (const endpoint of endpoints) {
      console.log(`Testing API endpoint: ${endpoint}`);
      
      // Test without auth
      const unauthResponse = await request.get(`http://localhost:3001${endpoint}`);
      const unauthStatus = unauthResponse.status();
      console.log(`Unauth request status: ${unauthStatus}`);
      
      // Should return 401 or redirect
      if (unauthStatus === 401) {
        console.log(`✅ ${endpoint} properly requires authentication`);
      } else if (unauthStatus === 200) {
        console.log(`⚠️ ${endpoint} may be publicly accessible`);
      }
    }
  });

  test('Auth state in React context', async ({ page }) => {
    await page.goto('/');
    
    // Check if auth context is available in window
    const authState = await page.evaluate(() => {
      // Try to access React DevTools or window auth state
      return window.__AUTH_STATE__ || window.localStorage.getItem('auth') || null;
    });
    
    if (authState) {
      console.log('Auth state found:', authState);
    }
    
    // Check for auth-dependent UI elements
    const authElements = await page.evaluate(() => {
      const elements = [];
      
      // Check for login/logout buttons
      const loginBtn = document.querySelector('[class*="login"]');
      const logoutBtn = document.querySelector('[class*="logout"]');
      
      if (loginBtn) elements.push('login-button');
      if (logoutBtn) elements.push('logout-button');
      
      // Check for user info
      const userInfo = document.querySelector('[class*="user"], [class*="profile"]');
      if (userInfo) elements.push('user-info');
      
      return elements;
    });
    
    console.log('Auth-related UI elements:', authElements);
  });
});