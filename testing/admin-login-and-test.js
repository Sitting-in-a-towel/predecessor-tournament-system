const { chromium } = require('playwright');

async function loginAndTestBonusTimer() {
  const browser = await chromium.launch({ headless: false });
  
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // First, login as admin
    console.log('Logging in as admin...');
    await page.goto('http://localhost:4000/admin');
    
    // Wait for login page to load
    await page.waitForTimeout(2000);
    
    // Look for and fill login form
    try {
      // Try to find login fields - adjust selectors based on actual form
      const usernameField = await page.locator('input[name="username"], input[name="email"], input[type="text"]').first();
      const passwordField = await page.locator('input[name="password"], input[type="password"]').first();
      
      if (await usernameField.isVisible()) {
        console.log('Filling login form...');
        await usernameField.fill('admin');
        await passwordField.fill('admin123');
        
        // Submit form
        const submitButton = await page.locator('button[type="submit"], input[type="submit"], button:has-text("Login"), button:has-text("Sign In")').first();
        await submitButton.click();
        
        await page.waitForTimeout(3000);
        console.log('Login attempted');
      } else {
        console.log('No login form found, might already be logged in');
      }
    } catch (e) {
      console.log('Could not find login form, continuing...');
    }
    
    // Navigate to drafts page
    console.log('Navigating to drafts...');
    await page.goto('http://localhost:4000/drafts');
    await page.waitForTimeout(2000);
    
    // Take screenshot of drafts page
    await page.screenshot({ path: 'testing/screenshots/authenticated-drafts.png' });
    
    // Look for the test draft
    try {
      const draftLink = await page.locator('a:has-text("test_draft_playwright"), a[href*="test_draft_playwright"]').first();
      if (await draftLink.isVisible({ timeout: 5000 })) {
        console.log('Found test draft, clicking...');
        await draftLink.click();
        
        await page.waitForTimeout(3000);
        await page.screenshot({ path: 'testing/screenshots/authenticated-draft-page.png' });
        
        // Look for bonus timer
        const bonusElements = await page.locator('text=BONUS').count();
        console.log(`Found ${bonusElements} bonus timer elements`);
        
        if (bonusElements > 0) {
          const bonusText = await page.locator('text=BONUS').first().textContent();
          console.log(`Bonus timer text: ${bonusText}`);
          
          // Wait to see if it updates
          console.log('Watching for bonus timer updates...');
          await page.waitForTimeout(10000);
          
          const bonusTextAfter = await page.locator('text=BONUS').first().textContent();
          console.log(`Bonus timer text after 10s: ${bonusTextAfter}`);
        }
        
      } else {
        console.log('Could not find test draft link');
      }
    } catch (e) {
      console.log('Error accessing draft:', e.message);
    }
    
    // Keep browser open for inspection
    await page.waitForTimeout(30000);
    
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await browser.close();
  }
}

loginAndTestBonusTimer().catch(console.error);