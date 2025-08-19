const { chromium } = require('playwright');

async function testBracketWithTestAuth() {
  let browser;
  
  try {
    console.log('🎭 RUNNING BRACKET TEST WITH TEST AUTHENTICATION...\n');
    
    browser = await chromium.launch({ 
      headless: false, 
      slowMo: 1000,
      args: ['--start-maximized']
    });
    
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 }
    });
    const page = await context.newPage();
    
    // Track errors and messages
    const errors = [];
    const toastMessages = [];
    
    page.on('response', response => {
      if (response.status() >= 400) {
        const error = `${response.status()} ${response.url()}`;
        errors.push(error);
        console.log(`📡 ERROR: ${error}`);
      }
    });
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`💥 JS ERROR: ${msg.text()}`);
        errors.push(`JS: ${msg.text()}`);
      }
    });
    
    console.log('🌐 Step 1: Navigate to site...');
    await page.goto('http://localhost:3000', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    console.log('🔐 Step 2: Login using test authentication...');
    
    // Use the test auth endpoint
    const loginResponse = await page.request.post('http://localhost:3001/api/test-auth/login-test-admin', {
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (loginResponse.ok()) {
      const result = await loginResponse.json();
      console.log('✅ Test admin login successful:', result.message);
      
      // Set session cookie manually if needed
      const sessionCookie = loginResponse.headers()['set-cookie'];
      if (sessionCookie) {
        await context.addCookies([{
          name: 'connect.sid',
          value: sessionCookie.split('=')[1].split(';')[0],
          domain: 'localhost',
          path: '/'
        }]);
      }
    } else {
      console.log('❌ Test admin login failed:', loginResponse.status());
      return;
    }
    
    console.log('🔄 Step 3: Refresh page to pick up authentication...');
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    console.log('🔍 Step 4: Navigate to test admin panel tournament...');
    
    const tournamentLink = page.locator('text="test admin panel"').first();
    if (await tournamentLink.isVisible({ timeout: 5000 })) {
      await tournamentLink.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
    } else {
      console.log('❌ Tournament not found');
      await page.screenshot({ path: 'test-auth-no-tournament.png' });
      return;
    }
    
    console.log('🔍 Step 5: Go to Bracket tab...');
    
    const bracketTab = page.locator('[role="tab"]:has-text("Bracket")').first();
    if (await bracketTab.isVisible({ timeout: 5000 })) {
      await bracketTab.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);
    } else {
      console.log('❌ Bracket tab not found');
      return;
    }
    
    console.log('🎲 Step 6: Generate bracket if needed...');
    
    const generateBtn = page.locator('button:has-text("Generate")').first();
    if (await generateBtn.isVisible({ timeout: 3000 })) {
      await generateBtn.click();
      await page.waitForTimeout(3000);
    }
    
    console.log('🚀 Step 7: CRITICAL TEST - Publish Bracket...');
    
    // Clear previous errors
    errors.length = 0;
    
    const publishBtn = page.locator('button:has-text("Publish")').first();
    if (await publishBtn.isVisible({ timeout: 3000 })) {
      // Handle confirmation dialog
      page.on('dialog', async dialog => {
        console.log(`📢 Dialog: ${dialog.message()}`);
        await dialog.accept();
      });
      
      await publishBtn.click();
      
      // Wait for publish process
      await page.waitForTimeout(5000);
      
      // Check for any toast messages by looking for common toast selectors
      const possibleToastSelectors = [
        '.toast', '.notification', '.alert', '.Toastify__toast', 
        '.react-hot-toast', '[role="alert"]', '.success', '.error'
      ];
      
      console.log('\n🎯 PUBLISH RESULTS:');
      console.log('══════════════════════════');
      
      // Check for toast messages
      let foundToasts = false;
      for (const selector of possibleToastSelectors) {
        const toasts = await page.locator(selector).allTextContents();
        if (toasts.length > 0) {
          toasts.forEach(toast => {
            if (toast.trim()) {
              console.log(`📢 TOAST: "${toast.trim()}"`);
              foundToasts = true;
            }
          });
        }
      }
      
      if (!foundToasts) {
        console.log('❓ No toast messages found');
      }
      
      // Check for errors
      console.log('📡 HTTP/JS Errors:');
      if (errors.length === 0) {
        console.log('✅ No errors detected');
      } else {
        errors.forEach((error, i) => {
          console.log(`   ${i + 1}. ${error}`);
        });
      }
      
      console.log('══════════════════════════');
      
      // Test persistence
      console.log('🔄 Step 8: Testing persistence...');
      await page.reload({ waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);
      
      // Go back to bracket tab
      const bracketTabAfter = page.locator('[role="tab"]:has-text("Bracket")').first();
      if (await bracketTabAfter.isVisible({ timeout: 3000 })) {
        await bracketTabAfter.click();
        await page.waitForTimeout(2000);
        
        // Check if still published
        const publishedIndicator = await page.locator(':has-text("Published"), :has-text("Locked"), .published').count();
        
        console.log(`🎯 PERSISTENCE: ${publishedIndicator > 0 ? 'SUCCESS' : 'FAILED'}`);
        console.log(`   Published indicators found: ${publishedIndicator}`);
      }
      
    } else {
      console.log('❌ Publish button not found');
    }
    
    await page.screenshot({ path: 'test-auth-bracket-final.png', fullPage: true });
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    try {
      const page = browser?.contexts()[0]?.pages()[0];
      if (page) {
        await page.screenshot({ path: 'test-auth-error.png', fullPage: true });
      }
    } catch (e) {}
  } finally {
    if (browser) {
      await browser.close();
    }
  }
  
  console.log('\n🎭 Test completed');
}

testBracketWithTestAuth();