const { test, expect } = require('@playwright/test');

test('Authenticated Draft Persistence Test', async ({ page }) => {
  console.log('🔐 AUTHENTICATED DRAFT PERSISTENCE TEST');
  console.log('='.repeat(50));
  
  try {
    // Step 1: Navigate to login page and authenticate as admin
    console.log('\n🔑 STEP 1: Authenticating as admin...');
    console.log('-'.repeat(30));
    
    await page.goto('http://localhost:3000/login');
    await page.waitForTimeout(2000);
    
    // Try to login (you may need to adjust these selectors based on your login form)
    try {
      await page.fill('input[name="email"], input[type="email"]', 'admin@test.com');
      await page.fill('input[name="password"], input[type="password"]', 'admin123');
      await page.click('button[type="submit"], .btn-primary');
      await page.waitForTimeout(3000);
      
      const currentUrl = page.url();
      if (currentUrl.includes('/dashboard') || currentUrl.includes('/tournaments')) {
        console.log('✅ Authentication successful');
      } else {
        console.log('⚠️ Authentication may have failed - continuing anyway');
      }
    } catch (authError) {
      console.log('⚠️ Could not complete authentication:', authError.message);
      console.log('Continuing with unauthenticated test...');
    }
    
    // Step 2: Navigate to tournament and check for Drafts tab
    console.log('\n📄 STEP 2: Loading tournament page...');
    console.log('-'.repeat(30));
    
    await page.goto('http://localhost:3000/tournaments/67e81a0d-1165-4481-ad58-85da372f86d5');
    await page.waitForTimeout(3000);
    
    // Check if Drafts tab is visible
    const draftsTabVisible = await page.locator('button:has-text("Drafts")').isVisible().catch(() => false);
    console.log('Drafts tab visible:', draftsTabVisible);
    
    if (!draftsTabVisible) {
      console.log('❌ Drafts tab not visible - user may not be authenticated as admin/captain');
      console.log('Attempting to bypass by setting localStorage auth...');
      
      // Try to set mock authentication
      await page.evaluate(() => {
        localStorage.setItem('auth', JSON.stringify({
          isAuthenticated: true,
          user: {
            id: 'admin-test-id',
            role: 'admin',
            isAdmin: true,
            discord_username: 'AdminTest'
          }
        }));
      });
      
      await page.reload();
      await page.waitForTimeout(3000);
      
      const draftsTabVisibleAfterAuth = await page.locator('button:has-text("Drafts")').isVisible().catch(() => false);
      console.log('Drafts tab visible after mock auth:', draftsTabVisibleAfterAuth);
    }
    
    // Step 3: Capture network logs and console logs
    console.log('\n📊 STEP 3: Monitoring draft loading...');
    console.log('-'.repeat(30));
    
    const consoleLogs = [];
    const networkRequests = [];
    
    page.on('console', msg => {
      consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
    });
    
    page.on('request', request => {
      if (request.url().includes('draft') || request.url().includes('4000')) {
        networkRequests.push(`${request.method()} ${request.url()}`);
      }
    });
    
    // Try to click Drafts tab if visible
    const finalDraftsTabVisible = await page.locator('button:has-text("Drafts")').isVisible().catch(() => false);
    
    if (finalDraftsTabVisible) {
      console.log('✅ Clicking Drafts tab...');
      await page.locator('button:has-text("Drafts")').click();
      await page.waitForTimeout(5000); // Wait for draft loading
      
      // Check if drafts are loaded
      const draftElements = await page.locator('.draft-item, .draft-row, [data-testid="draft"]').count();
      console.log('Draft elements found on page:', draftElements);
      
      // Step 4: Test page refresh
      console.log('\n🔄 STEP 4: Testing page refresh...');
      console.log('-'.repeat(30));
      
      console.log('Current drafts state before refresh...');
      await page.reload();
      await page.waitForTimeout(3000);
      
      // Click Drafts tab again after refresh
      const draftsTabAfterRefresh = await page.locator('button:has-text("Drafts")').isVisible().catch(() => false);
      if (draftsTabAfterRefresh) {
        await page.locator('button:has-text("Drafts")').click();
        await page.waitForTimeout(5000);
        
        const draftsAfterRefresh = await page.locator('.draft-item, .draft-row, [data-testid="draft"]').count();
        console.log('Draft elements found after refresh:', draftsAfterRefresh);
        
        if (draftsAfterRefresh > 0) {
          console.log('✅ Drafts persisted after refresh');
        } else {
          console.log('❌ Drafts disappeared after refresh');
        }
      }
      
    } else {
      console.log('❌ Cannot access Drafts tab - authentication issue');
      console.log('Testing Phoenix API directly instead...');
      
      // Direct Phoenix API test
      const phoenixResponse = await page.request.get('http://localhost:4000/api/drafts?tournament_id=4fe28137-a1c3-426e-bfa0-1ae9c54f58a0');
      if (phoenixResponse.ok()) {
        const phoenixData = await phoenixResponse.json();
        console.log('✅ Phoenix API accessible - Found', phoenixData.length, 'drafts');
      } else {
        console.log('❌ Phoenix API not accessible');
      }
    }
    
    // Step 5: Show relevant console logs
    console.log('\n📋 STEP 5: Console Logs Analysis');
    console.log('-'.repeat(30));
    
    const phoenixLogs = consoleLogs.filter(log => 
      log.toLowerCase().includes('phoenix') ||
      log.toLowerCase().includes('draft') ||
      log.includes('Loading Phoenix') ||
      log.includes('Setting drafts state')
    );
    
    if (phoenixLogs.length === 0) {
      console.log('❌ No draft-related console logs detected');
    } else {
      console.log('📊 Draft-related console logs:');
      phoenixLogs.slice(-10).forEach(log => console.log(log));
    }
    
    console.log('\n🌐 Network requests to draft endpoints:');
    networkRequests.forEach(req => console.log(req));
    
  } catch (error) {
    console.log('❌ Test failed with error:', error.message);
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('🔧 NEXT STEPS:');
  console.log('='.repeat(50));
  console.log('1. Ensure you are logged in as an admin or team captain');
  console.log('2. Navigate to the tournament page');
  console.log('3. Click the Drafts tab');
  console.log('4. Look for console logs showing Phoenix API calls');
  console.log('5. Check if drafts appear and persist after refresh');
  console.log('');
  console.log('🔍 If drafts still disappear, check the React state management');
  console.log('   in TournamentDrafts.js around line 116-121');
});