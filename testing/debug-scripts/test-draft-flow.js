const { chromium } = require('playwright');

async function testDraftFlow() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('🚀 Starting draft flow test...');
    
    // Navigate to tournament frontend
    console.log('📱 Navigating to frontend...');
    await page.goto('http://localhost:3001');
    await page.waitForLoadState('networkidle');
    
    // Take screenshot of homepage
    await page.screenshot({ path: 'test-homepage.png' });
    console.log('📸 Homepage screenshot saved');
    
    // Login with test admin user - simulate Discord OAuth or use test login
    console.log('🔐 Logging in with test admin user...');
    
    // First, let's try to access the backend directly to get a valid session
    // This simulates the test admin user login
    try {
      // Set a test session cookie to simulate being logged in
      await context.addCookies([
        {
          name: '_predecessor_tournament_key',
          value: 'test_session_admin_user',
          domain: 'localhost',
          path: '/',
          httpOnly: true
        }
      ]);
      
      // Navigate to backend login endpoint to establish session
      await page.goto('http://localhost:3000/auth/test-admin');
      await page.waitForLoadState('networkidle');
      console.log('✅ Test admin login attempted');
      
      // Go back to frontend to verify login
      await page.goto('http://localhost:3001');
      await page.waitForLoadState('networkidle');
      await page.screenshot({ path: 'test-after-login.png' });
      console.log('📸 After login screenshot saved');
      
    } catch (error) {
      console.log('⚠️ Direct login failed, trying UI login...');
      
      const loginBtn = page.locator('text=Login with Discord').or(page.locator('text=Login'));
      if (await loginBtn.isVisible()) {
        await loginBtn.click();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);
        await page.screenshot({ path: 'test-login-attempt.png' });
        console.log('📸 Login attempt screenshot saved');
      }
    }
    
    // Try clicking View Tournaments button instead
    console.log('🏆 Clicking on View Tournaments button...');
    const viewTournamentsBtn = page.locator('text=View Tournaments');
    if (await viewTournamentsBtn.isVisible()) {
      await viewTournamentsBtn.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000); // Wait for any dynamic content
      await page.screenshot({ path: 'test-tournaments-list.png' });
      console.log('📸 Tournaments list screenshot saved');
    }
    
    // Look for draft creation or existing drafts
    console.log('🔍 Looking for draft functionality...');
    
    // Check if there are any draft links or buttons
    const draftButtons = await page.locator('text=/draft/i').count();
    const createButtons = await page.locator('text=/create/i').count();
    const enterButtons = await page.locator('text=/enter/i').count();
    const enterAsButtons = await page.locator('text=/enter as/i').count();
    
    console.log(`Found ${draftButtons} draft elements, ${createButtons} create buttons, ${enterButtons} enter buttons, ${enterAsButtons} enter as buttons`);
    
    // If no drafts found, try to create one or navigate directly to draft URL
    if (enterAsButtons === 0) {
      console.log('⚠️ No enter as buttons found. Trying direct draft URL...');
      
      // Try navigating directly to the created draft URL
      await page.goto('http://localhost:4000/draft/test_draft_playwright?captain=1');
      await page.waitForLoadState('networkidle');
      await page.screenshot({ path: 'test-direct-draft.png' });
      console.log('📸 Direct draft navigation screenshot saved');
      
      // Check if we're now on a draft page
      const isDraftPage = await page.locator('text=/coin toss/i, text=/ban phase/i, text=/pick phase/i').count() > 0;
      console.log(`Is draft page: ${isDraftPage}`);
      
      if (isDraftPage) {
        console.log('✅ Successfully reached draft page!');
        // Continue with draft testing...
      }
    }
    
    // Try to find and click a draft-related button
    if (await page.locator('text=/enter as/i').first().isVisible()) {
      console.log('✅ Found "Enter As" button - clicking...');
      await page.locator('text=/enter as/i').first().click();
      await page.waitForLoadState('networkidle');
      await page.screenshot({ path: 'test-draft-page.png' });
      console.log('📸 Draft page screenshot saved');
      
      // Test coin toss flow
      console.log('🪙 Testing coin toss...');
      
      // Look for coin toss buttons
      const headsButton = page.locator('button:has-text("HEADS")');
      const tailsButton = page.locator('button:has-text("TAILS")');
      
      if (await headsButton.isVisible()) {
        console.log('✅ Found coin toss buttons - clicking HEADS...');
        await headsButton.click();
        await page.waitForTimeout(1000);
        await page.screenshot({ path: 'test-coin-choice.png' });
        console.log('📸 Coin choice screenshot saved');
        
        // Wait for coin toss result
        await page.waitForTimeout(3000);
        await page.screenshot({ path: 'test-coin-result.png' });
        console.log('📸 Coin result screenshot saved');
        
        // Look for pick order selection
        const pickFirstButton = page.locator('button:has-text("Pick First")');
        const pickSecondButton = page.locator('button:has-text("Pick Second")');
        
        if (await pickFirstButton.isVisible()) {
          console.log('✅ Found pick order buttons - clicking Pick First...');
          await pickFirstButton.click();
          await page.waitForTimeout(3000);
          await page.screenshot({ path: 'test-pick-order.png' });
          console.log('📸 Pick order screenshot saved');
          
          // Wait for ban phase
          await page.waitForTimeout(2000);
          await page.screenshot({ path: 'test-ban-phase.png' });
          console.log('📸 Ban phase screenshot saved');
          
          // Look for hero grid
          const heroGrid = page.locator('.hero-grid, .hero, [data-hero]');
          const heroCount = await heroGrid.count();
          console.log(`Found ${heroCount} hero elements`);
          
          if (heroCount > 0) {
            console.log('✅ Found hero grid - clicking first hero...');
            await heroGrid.first().click();
            await page.waitForTimeout(1000);
            await page.screenshot({ path: 'test-hero-selection.png' });
            console.log('📸 Hero selection screenshot saved');
          }
        }
      }
    } else {
      console.log('❌ No draft buttons found - taking screenshot of current page');
      await page.screenshot({ path: 'test-no-drafts.png' });
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    await page.screenshot({ path: 'test-error.png' });
  } finally {
    await browser.close();
    console.log('🏁 Test completed');
  }
}

testDraftFlow();