const { chromium } = require('playwright');

async function testBracketPublishFlow() {
  let browser;
  
  try {
    console.log('🎭 RUNNING FINAL BRACKET PUBLISH TEST WITH PLAYWRIGHT...\n');
    
    browser = await chromium.launch({ 
      headless: false, // Show browser so we can see what happens
      slowMo: 1500,    // Slow down actions to observe
      args: ['--start-maximized'] // Full screen
    });
    
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 }
    });
    const page = await context.newPage();
    
    // Track all console messages from the browser
    const consoleMessages = [];
    page.on('console', msg => {
      const message = `[${msg.type().toUpperCase()}] ${msg.text()}`;
      consoleMessages.push(message);
      console.log(`🖥️  ${message}`);
    });
    
    // Track network requests to bracket endpoints
    const networkActivity = [];
    page.on('request', request => {
      if (request.url().includes('/bracket') || request.url().includes('/tournament')) {
        const activity = `${request.method()} ${request.url()}`;
        networkActivity.push(activity);
        console.log(`📡 REQUEST: ${activity}`);
      }
    });
    
    // Track network responses
    page.on('response', response => {
      if (response.url().includes('/bracket')) {
        const status = response.status();
        console.log(`📥 RESPONSE: ${status} ${response.url()}`);
        if (status >= 400) {
          console.log(`❌ ERROR RESPONSE: ${status}`);
        } else {
          console.log(`✅ SUCCESS RESPONSE: ${status}`);
        }
      }
    });
    
    // Track JavaScript errors
    page.on('pageerror', error => {
      console.log(`💥 JS ERROR: ${error.message}`);
    });
    
    console.log('🌐 Navigating to tournament site...');
    await page.goto('http://localhost:3000', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    // Wait for initial load
    await page.waitForTimeout(3000);
    
    console.log('🔍 Looking for tournaments on the page...');
    
    // Look for tournament cards or links
    const tournamentSelectors = [
      'text="test admin panel"',
      '.tournament-card:has-text("test admin panel")',
      '.tournament-item:has-text("test admin panel")',
      'a:has-text("test admin panel")',
      '[data-testid="tournament"]:has-text("test admin panel")'
    ];
    
    let tournamentFound = false;
    let tournamentElement = null;
    
    for (const selector of tournamentSelectors) {
      try {
        tournamentElement = page.locator(selector).first();
        if (await tournamentElement.isVisible({ timeout: 2000 })) {
          console.log(`✅ Found tournament with selector: ${selector}`);
          tournamentFound = true;
          break;
        }
      } catch (e) {
        // Continue to next selector
      }
    }
    
    if (!tournamentFound) {
      console.log('❌ Tournament not found. Checking page content...');
      
      // Check if user needs to log in
      const loginElements = await page.locator('text="Login", text="Sign in", text="Discord", button:has-text("Login")').count();
      if (loginElements > 0) {
        console.log('🔐 LOGIN REQUIRED: User needs to authenticate first');
        console.log('   The bracket publish feature requires admin login');
        console.log('   Please log in as an admin user and try again');
        
        await page.screenshot({ path: 'bracket-test-login-required.png', fullPage: true });
        return;
      }
      
      // List what tournaments are available
      console.log('📋 Available content on page:');
      const pageText = await page.textContent('body');
      console.log('Page contains:', pageText.substring(0, 500) + '...');
      
      await page.screenshot({ path: 'bracket-test-no-tournament.png', fullPage: true });
      return;
    }
    
    console.log('🎯 Clicking on tournament...');
    await tournamentElement.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    console.log('🔍 Looking for Bracket tab...');
    
    // Look for bracket tab with various selectors
    const bracketTabSelectors = [
      '[role="tab"]:has-text("Bracket")',
      '.tab:has-text("Bracket")',
      'button:has-text("Bracket")',
      'a:has-text("Bracket")',
      '.nav-link:has-text("Bracket")'
    ];
    
    let bracketTab = null;
    for (const selector of bracketTabSelectors) {
      try {
        bracketTab = page.locator(selector).first();
        if (await bracketTab.isVisible({ timeout: 2000 })) {
          console.log(`✅ Found bracket tab with selector: ${selector}`);
          break;
        }
      } catch (e) {
        // Continue
      }
    }
    
    if (!bracketTab || !await bracketTab.isVisible()) {
      console.log('❌ Could not find Bracket tab');
      console.log('📋 Available tabs/buttons:');
      const buttons = await page.locator('button, [role="tab"], .tab, .nav-link').allTextContents();
      buttons.slice(0, 10).forEach(text => console.log(`   - ${text}`));
      
      await page.screenshot({ path: 'bracket-test-no-tab.png', fullPage: true });
      return;
    }
    
    console.log('🎯 Clicking Bracket tab...');
    await bracketTab.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    console.log('🔍 Analyzing bracket interface...');
    
    // Check current state of bracket
    const publishedBadge = await page.locator('.published-badge, :has-text("Published")').count();
    const isCurrentlyPublished = publishedBadge > 0;
    console.log(`Current bracket published state: ${isCurrentlyPublished}`);
    
    // Look for bracket controls
    const generateBtn = page.locator('button:has-text("Generate"), button:has-text("Regenerate")');
    const publishBtn = page.locator('button:has-text("Publish")');
    const unpublishBtn = page.locator('button:has-text("Unpublish")');
    
    const generateCount = await generateBtn.count();
    const publishCount = await publishBtn.count();
    const unpublishCount = await unpublishBtn.count();
    
    console.log(`Generate buttons: ${generateCount}`);
    console.log(`Publish buttons: ${publishCount}`);
    console.log(`Unpublish buttons: ${unpublishCount}`);
    
    // Test the publish flow
    if (isCurrentlyPublished && unpublishCount > 0) {
      console.log('📝 Bracket is currently published - unpublishing first to test publish flow...');
      await unpublishBtn.first().click();
      await page.waitForTimeout(2000);
    }
    
    // Generate bracket if needed
    if (generateCount > 0) {
      console.log('🎲 Generating/regenerating bracket...');
      await generateBtn.first().click();
      await page.waitForTimeout(3000);
    }
    
    // Now test the publish functionality
    if (await publishBtn.isVisible()) {
      console.log('🚀 TESTING BRACKET PUBLISH - This is the critical test...');
      
      // Start monitoring for toast messages
      const toastMessages = [];
      
      // Set up dialog handler for confirmation
      page.on('dialog', async dialog => {
        console.log(`📢 CONFIRMATION DIALOG: ${dialog.message()}`);
        console.log('✅ Accepting confirmation dialog...');
        await dialog.accept();
      });
      
      console.log('🎯 Clicking Publish Bracket button...');
      await publishBtn.first().click();
      
      // Wait for the save process to complete
      console.log('⏳ Waiting for save process to complete...');
      await page.waitForTimeout(5000);
      
      // Check for toast messages
      const toastSelectors = [
        '.toast', '.notification', '.alert', 
        ':has-text("published")', ':has-text("locked")', ':has-text("success")',
        ':has-text("failed")', ':has-text("error")', ':has-text("try again")'
      ];
      
      let foundMessages = [];
      for (const selector of toastSelectors) {
        const elements = await page.locator(selector).allTextContents();
        foundMessages.push(...elements);
      }
      
      console.log('\n🎯 TOAST MESSAGES FOUND:');
      foundMessages.forEach(msg => {
        if (msg.trim()) {
          console.log(`   📢 "${msg.trim()}"`);
        }
      });
      
      // Check final state
      await page.waitForTimeout(2000);
      const finalPublishedBadge = await page.locator('.published-badge, :has-text("Published")').count();
      const isFinallyPublished = finalPublishedBadge > 0;
      
      console.log(`\n📊 PUBLISH RESULTS:`);
      console.log(`   Final published state: ${isFinallyPublished}`);
      console.log(`   Toast messages found: ${foundMessages.length}`);
      
      // Test persistence by refreshing
      console.log('\n🔄 TESTING PERSISTENCE - Refreshing page...');
      await page.reload({ waitUntil: 'networkidle' });
      await page.waitForTimeout(3000);
      
      // Navigate back to bracket tab
      const bracketTabAfter = page.locator('[role="tab"]:has-text("Bracket"), .tab:has-text("Bracket")').first();
      if (await bracketTabAfter.isVisible()) {
        await bracketTabAfter.click();
        await page.waitForTimeout(2000);
        
        const persistedBadge = await page.locator('.published-badge, :has-text("Published")').count();
        const persistedPublished = persistedBadge > 0;
        
        console.log(`✅ Persistence test result: ${persistedPublished ? 'SUCCESS' : 'FAILED'}`);
        
        if (persistedPublished) {
          console.log('🎉 BRACKET PUBLISH WORKING: State persisted after refresh!');
        } else {
          console.log('❌ BRACKET PUBLISH FAILED: State lost after refresh!');
        }
      }
      
    } else {
      console.log('❌ No publish button available');
      console.log('   This might mean:');
      console.log('   - User is not admin');
      console.log('   - Bracket is already published');
      console.log('   - No bracket data generated');
    }
    
    // Final summary
    console.log('\n📋 TEST SUMMARY:');
    console.log(`Network requests made: ${networkActivity.length}`);
    console.log(`Console messages: ${consoleMessages.length}`);
    console.log(`Screenshots saved: bracket-test-final.png`);
    
    await page.screenshot({ path: 'bracket-test-final.png', fullPage: true });
    
  } catch (error) {
    console.error('❌ Playwright test error:', error.message);
    console.log('📸 Taking error screenshot...');
    try {
      const page = browser?.contexts()[0]?.pages()[0];
      if (page) {
        await page.screenshot({ path: 'bracket-test-error.png', fullPage: true });
      }
    } catch (e) {
      // Screenshot failed
    }
  } finally {
    if (browser) {
      await browser.close();
    }
  }
  
  console.log('\n🎭 Playwright test completed');
  process.exit(0);
}

testBracketPublishFlow();