const { chromium } = require('playwright');

async function testLiveUI() {
  const browser = await chromium.launch({ headless: false });
  
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Access the active draft that's in bonus timer mode
    const url = 'http://localhost:4000/draft/test_draft_playwright?token=test_token_team1&captain=1';
    
    console.log('Opening live draft page...');
    await page.goto(url);
    
    // Wait for page to load
    await page.waitForTimeout(3000);
    
    // Take screenshot to see current state
    await page.screenshot({ path: 'testing/screenshots/live-bonus-timer-test.png', fullPage: true });
    
    // Look for bonus timer elements
    try {
      const bonusElements = await page.locator('text=BONUS').count();
      console.log(`Found ${bonusElements} bonus timer elements`);
      
      if (bonusElements > 0) {
        const bonusText = await page.locator('text=BONUS').first().textContent();
        console.log(`Bonus timer text: ${bonusText}`);
      }
    } catch (e) {
      console.log('Could not find bonus timer elements');
    }
    
    // Wait and take another screenshot to see if timer changes
    console.log('Waiting 5 seconds to see if timer updates...');
    await page.waitForTimeout(5000);
    await page.screenshot({ path: 'testing/screenshots/live-bonus-timer-after-5s.png', fullPage: true });
    
    // Check timer text again
    try {
      const bonusElements = await page.locator('text=BONUS').count();
      if (bonusElements > 0) {
        const bonusText = await page.locator('text=BONUS').first().textContent();
        console.log(`Bonus timer text after 5s: ${bonusText}`);
      }
    } catch (e) {
      console.log('Could not find bonus timer elements after 5s');
    }
    
    console.log('Test completed - check screenshots');
    
    // Keep browser open for manual inspection
    await page.waitForTimeout(30000);
    
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await browser.close();
  }
}

testLiveUI().catch(console.error);