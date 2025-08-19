const { chromium } = require('playwright');

async function testAuthenticatedBracketPublish() {
  let browser;
  
  try {
    console.log('🎭 RUNNING AUTHENTICATED BRACKET PUBLISH TEST...\n');
    
    browser = await chromium.launch({ 
      headless: false, // Show browser so we can see what happens
      slowMo: 1000,    // Slow down actions to observe
      args: ['--start-maximized']
    });
    
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 }
    });
    const page = await context.newPage();
    
    // Track console messages and errors
    const consoleMessages = [];
    const networkErrors = [];
    const jsErrors = [];
    
    page.on('console', msg => {
      const message = `[${msg.type().toUpperCase()}] ${msg.text()}`;
      consoleMessages.push(message);
      console.log(`🖥️  ${message}`);
    });
    
    page.on('response', response => {
      if (response.status() >= 400) {
        const error = `${response.status()} ${response.url()}`;
        networkErrors.push(error);
        console.log(`📡 ERROR RESPONSE: ${error}`);
      }
    });
    
    page.on('pageerror', error => {
      jsErrors.push(error.message);
      console.log(`💥 JS ERROR: ${error.message}`);
    });
    
    console.log('🌐 Step 1: Navigate to tournament site...');
    await page.goto('http://localhost:3000', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    // Wait for page to load
    await page.waitForTimeout(2000);
    
    console.log('🔍 Step 2: Check authentication status...');
    
    // Check if already logged in by looking for user name in header
    const userElement = await page.locator('text="sitting_in_a_towel"').count();
    
    if (userElement === 0) {
      console.log('🔐 Step 2a: Need to login - looking for Discord login button...');
      
      // Look for Discord login button
      const discordButton = page.locator('text="Login with Discord", text="Discord", button:has-text("Login")').first();
      
      if (await discordButton.isVisible({ timeout: 5000 })) {
        console.log('🎯 Found Discord login button - clicking...');
        await discordButton.click();
        
        console.log('⏳ Waiting for Discord OAuth flow...');
        console.log('   👤 MANUAL ACTION REQUIRED:');
        console.log('   1. Complete Discord login in the opened tab');
        console.log('   2. Authorize the application');
        console.log('   3. Wait to be redirected back');
        
        // Wait for successful login redirect
        await page.waitForURL('**/localhost:3000/**', { timeout: 60000 });
        await page.waitForTimeout(3000);
        
        // Verify login success
        const loggedInUser = await page.locator('text="sitting_in_a_towel"').count();
        if (loggedInUser > 0) {
          console.log('✅ Login successful!');
        } else {
          console.log('❌ Login failed - cannot proceed with test');
          return;
        }
      } else {
        console.log('❌ No Discord login button found');
        await page.screenshot({ path: 'no-login-button.png', fullPage: true });
        return;
      }
    } else {
      console.log('✅ Already logged in!');
    }
    
    console.log('🔍 Step 3: Navigate to test admin panel tournament...');
    
    // Look for the specific tournament
    const tournamentLink = page.locator('text="test admin panel"').first();
    if (await tournamentLink.isVisible({ timeout: 5000 })) {
      console.log('🎯 Found test admin panel tournament - clicking...');
      await tournamentLink.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
    } else {
      console.log('❌ Test admin panel tournament not found');
      await page.screenshot({ path: 'no-tournament.png', fullPage: true });
      return;
    }
    
    console.log('🔍 Step 4: Navigate to Bracket tab...');
    
    const bracketTab = page.locator('[role="tab"]:has-text("Bracket"), .tab:has-text("Bracket")').first();
    if (await bracketTab.isVisible({ timeout: 5000 })) {
      console.log('🎯 Found Bracket tab - clicking...');
      await bracketTab.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);
    } else {
      console.log('❌ Bracket tab not found');
      await page.screenshot({ path: 'no-bracket-tab.png', fullPage: true });
      return;
    }
    
    console.log('🔍 Step 5: Check bracket generation status...');
    
    // Look for Generate Bracket button
    const generateBtn = page.locator('button:has-text("Generate"), button:has-text("Regenerate")').first();
    if (await generateBtn.isVisible({ timeout: 3000 })) {
      console.log('🎲 Generating bracket first...');
      await generateBtn.click();
      await page.waitForTimeout(3000);
    }
    
    console.log('🚀 Step 6: THE CRITICAL TEST - Publish Bracket...');
    
    // Clear previous messages
    consoleMessages.length = 0;
    networkErrors.length = 0;
    jsErrors.length = 0;
    
    const publishBtn = page.locator('button:has-text("Publish")').first();
    if (await publishBtn.isVisible({ timeout: 3000 })) {
      console.log('🎯 Found Publish button - clicking...');
      
      // Set up dialog handler for confirmation
      page.on('dialog', async dialog => {
        console.log(`📢 CONFIRMATION DIALOG: ${dialog.message()}`);
        await dialog.accept();
      });
      
      await publishBtn.click();
      
      // Wait for API calls and responses
      console.log('⏳ Waiting for publish process...');
      await page.waitForTimeout(5000);
      
      // Check for toast messages
      const toastMessages = [];
      const toastSelectors = [
        '.toast', '.notification', '.alert',
        '.Toastify__toast', '.react-hot-toast'
      ];
      
      for (const selector of toastSelectors) {
        const elements = await page.locator(selector).allTextContents();
        toastMessages.push(...elements);
      }
      
      console.log('\n🎯 PUBLISH TEST RESULTS:');
      console.log('════════════════════════════════════');
      
      // 1. Toast Messages Analysis
      console.log('📢 Toast Messages Found:');
      if (toastMessages.length === 0) {
        console.log('   ❓ No toast messages detected');
      } else {
        toastMessages.forEach((msg, i) => {
          if (msg.trim()) {
            console.log(`   ${i + 1}. "${msg.trim()}"`);
          }
        });
      }
      
      // 2. Network Error Analysis  
      console.log('📡 Network Errors:');
      if (networkErrors.length === 0) {
        console.log('   ✅ No HTTP errors detected');
      } else {
        networkErrors.forEach((error, i) => {
          console.log(`   ${i + 1}. ${error}`);
        });
      }
      
      // 3. JavaScript Error Analysis
      console.log('💥 JavaScript Errors:');
      if (jsErrors.length === 0) {
        console.log('   ✅ No JS errors detected');
      } else {
        jsErrors.forEach((error, i) => {
          console.log(`   ${i + 1}. ${error}`);
        });
      }
      
      // 4. Console Message Analysis
      console.log('🖥️  Recent Console Messages:');
      const recentMessages = consoleMessages.slice(-10); // Last 10 messages
      if (recentMessages.length === 0) {
        console.log('   ❓ No console messages detected');
      } else {
        recentMessages.forEach((msg, i) => {
          console.log(`   ${i + 1}. ${msg}`);
        });
      }
      
      console.log('════════════════════════════════════');
      
      // 5. Persistence Test
      console.log('🔄 Step 7: Testing bracket persistence...');
      await page.reload({ waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);
      
      // Navigate back to bracket
      const bracketTabAfter = page.locator('[role="tab"]:has-text("Bracket"), .tab:has-text("Bracket")').first();
      if (await bracketTabAfter.isVisible({ timeout: 3000 })) {
        await bracketTabAfter.click();
        await page.waitForTimeout(2000);
        
        // Check if bracket is still published
        const publishedIndicator = await page.locator('.published-badge, :has-text("Published"), :has-text("Locked")').count();
        
        console.log(`🎯 PERSISTENCE RESULT: ${publishedIndicator > 0 ? 'SUCCESS' : 'FAILED'}`);
        console.log(`   Published indicators found: ${publishedIndicator}`);
      }
      
    } else {
      console.log('❌ Publish button not found');
      await page.screenshot({ path: 'no-publish-button.png', fullPage: true });
    }
    
    console.log('\n📸 Taking final screenshot...');
    await page.screenshot({ path: 'authenticated-bracket-test-final.png', fullPage: true });
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('📸 Taking error screenshot...');
    try {
      const page = browser?.contexts()[0]?.pages()[0];
      if (page) {
        await page.screenshot({ path: 'authenticated-test-error.png', fullPage: true });
      }
    } catch (e) {
      // Screenshot failed
    }
  } finally {
    if (browser) {
      console.log('\n🎭 Test completed - keeping browser open for 10 seconds...');
      await new Promise(resolve => setTimeout(resolve, 10000));
      await browser.close();
    }
  }
}

testAuthenticatedBracketPublish();