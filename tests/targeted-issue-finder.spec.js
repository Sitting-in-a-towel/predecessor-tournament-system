const { test, expect } = require('@playwright/test');

test.describe('Targeted Issue Finder', () => {
  let page;

  test.beforeEach(async ({ browser }) => {
    const context = await browser.newContext({
      baseURL: 'http://localhost:3000'
    });
    page = await context.newPage();
  });

  test('1. Test Home Page Issues', async () => {
    console.log('📍 Testing Home Page...');
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check for any error messages
    const errorElements = await page.locator('text=/error|Error|ERROR|failed|Failed|FAILED/i').all();
    console.log(`  Found ${errorElements.length} error messages on home page`);
    
    for (const error of errorElements) {
      const errorText = await error.textContent();
      console.log(`  ❌ Error found: "${errorText?.trim()}"`);
    }
    
    // Test navigation menu
    const navLinks = await page.locator('nav a, .nav a, header a').all();
    console.log(`  Found ${navLinks.length} navigation links`);
    
    for (const link of navLinks) {
      const href = await link.getAttribute('href');
      const text = await link.textContent();
      console.log(`    Link: "${text?.trim()}" -> ${href}`);
    }
  });

  test('2. Test Admin Dashboard Issues (Logged Out)', async () => {
    console.log('📍 Testing Admin Dashboard (Not Logged In)...');
    
    await page.goto('/admin/dashboard');
    await page.waitForLoadState('networkidle');
    
    // Should redirect to login or show login message
    const currentUrl = page.url();
    console.log(`  Current URL after navigation: ${currentUrl}`);
    
    const pageContent = await page.textContent('body');
    const hasLoginMessage = pageContent.includes('log in') || pageContent.includes('sign in') || pageContent.includes('authenticate');
    console.log(`  Has login requirement message: ${hasLoginMessage}`);
    
    // Check for any admin-specific content
    const adminElements = await page.locator('text=/admin|Admin|ADMIN/i').all();
    console.log(`  Found ${adminElements.length} admin-related elements`);
  });

  test('3. Test Admin Authentication Flow', async () => {
    console.log('📍 Testing Admin Authentication...');
    
    // Login as admin via API
    const loginResponse = await page.request.post('http://localhost:3001/api/test-auth/login-test-admin');
    const loginData = await loginResponse.json();
    console.log(`  Login success: ${loginData.success}`);
    
    if (!loginData.success) {
      console.log('  ❌ Admin login failed');
      return;
    }
    
    // Now test admin dashboard
    await page.goto('/admin/dashboard');
    await page.waitForLoadState('networkidle');
    
    // Check if we can see admin content
    const pageTitle = await page.textContent('h1, h2').catch(() => 'No title found');
    console.log(`  Admin dashboard title: "${pageTitle}"`);
    
    // Look for admin statistics
    const stats = await page.locator('text=/statistics|stats|dashboard|tournament|team|user/i').all();
    console.log(`  Found ${stats.length} stat-related elements`);
    
    // Test admin buttons
    const adminButtons = await page.locator('button').all();
    console.log(`  Found ${adminButtons.length} buttons on admin dashboard`);
    
    for (let i = 0; i < Math.min(adminButtons.length, 5); i++) {
      const button = adminButtons[i];
      const buttonText = await button.textContent();
      const isVisible = await button.isVisible();
      const isEnabled = await button.isEnabled();
      console.log(`    Button "${buttonText?.trim()}": visible=${isVisible}, enabled=${isEnabled}`);
    }
  });

  test('4. Test Tournament Pages', async () => {
    console.log('📍 Testing Tournament Pages...');
    
    await page.goto('/tournaments');
    await page.waitForLoadState('networkidle');
    
    // Check for tournaments
    const tournaments = await page.locator('.tournament-card, .tournament-item, [data-tournament]').all();
    console.log(`  Found ${tournaments.length} tournament elements`);
    
    if (tournaments.length > 0) {
      // Click first tournament
      await tournaments[0].click();
      await page.waitForLoadState('networkidle');
      
      const currentUrl = page.url();
      console.log(`  Navigated to tournament detail: ${currentUrl}`);
      
      // Check for tabs
      const tabs = await page.locator('.tab, .tournament-tabs button, [role="tab"]').all();
      console.log(`  Found ${tabs.length} tabs on tournament detail`);
      
      for (const tab of tabs) {
        const tabText = await tab.textContent();
        const isVisible = await tab.isVisible();
        console.log(`    Tab "${tabText?.trim()}": visible=${isVisible}`);
      }
    } else {
      console.log('  ❌ No tournaments found on tournaments page');
    }
  });

  test('5. Test Draft System Access', async () => {
    console.log('📍 Testing Draft System...');
    
    // Login as admin first
    await page.request.post('http://localhost:3001/api/test-auth/login-test-admin');
    
    // Get available drafts from API
    const draftsResponse = await page.request.get('http://localhost:3001/api/draft');
    const drafts = await draftsResponse.json();
    console.log(`  Found ${drafts.length} draft sessions`);
    
    if (drafts.length > 0) {
      const draftId = drafts[0].draft_id;
      console.log(`  Testing draft: ${draftId}`);
      
      await page.goto(`/draft/${draftId}`);
      await page.waitForLoadState('networkidle');
      
      // Check for draft interface
      const draftElements = await page.locator('text=/coin|toss|draft|pick|ban|hero/i').all();
      console.log(`  Found ${draftElements.length} draft-related elements`);
      
      // Test hero selection
      const heroes = await page.locator('.hero-item, .hero-card, [data-hero]').all();
      console.log(`  Found ${heroes.length} hero elements`);
      
      // Test coin toss buttons
      const coinButtons = await page.locator('button:has-text("heads"), button:has-text("tails"), .coin-button').all();
      console.log(`  Found ${coinButtons.length} coin toss buttons`);
      
      if (coinButtons.length > 0) {
        try {
          await coinButtons[0].click();
          await page.waitForTimeout(1000);
          console.log('    Coin toss button clicked successfully');
        } catch (error) {
          console.log(`    ❌ Coin toss button click failed: ${error.message}`);
        }
      }
    } else {
      console.log('  ❌ No draft sessions found');
    }
  });
});