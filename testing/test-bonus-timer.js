const { chromium } = require('playwright');

async function testBonusTimer() {
  const browser = await chromium.launch({ headless: false });
  
  try {
    // Create two contexts for team1 and team2
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();
    
    // Navigate to existing draft page (use a known draft ID)
    const draftId = 'test_bonus_timer_debug'; // Use consistent ID for testing
    const url1 = `http://localhost:4000/draft/${draftId}?token=test_token_team1&captain=1`;
    const url2 = `http://localhost:4000/draft/${draftId}?token=test_token_team2&captain=2`;
    
    console.log('Opening draft pages...');
    await page1.goto(url1);
    await page2.goto(url2);
    
    // Wait for both captains to be present
    await page1.waitForTimeout(2000);
    await page2.waitForTimeout(2000);
    
    // Wait for page to load and check what's visible
    await page1.waitForTimeout(3000);
    
    // Take initial screenshot to see page state
    await page1.screenshot({ path: 'testing/screenshots/debug-page-initial.png' });
    
    // Try to get to draft state more reliably
    try {
      // Look for coin toss buttons
      const headsButton = await page1.locator('button:has-text("Heads")').first();
      if (await headsButton.isVisible({ timeout: 5000 })) {
        console.log('Team 1 selecting heads...');
        await headsButton.click();
        await page1.waitForTimeout(1000);
      }
    } catch (e) {
      console.log('No coin toss needed, checking current state...');
    }
    
    try {
      const tailsButton = await page2.locator('button:has-text("Tails")').first();
      if (await tailsButton.isVisible({ timeout: 5000 })) {
        console.log('Team 2 selecting tails...');
        await tailsButton.click();
        await page2.waitForTimeout(4000);
      }
    } catch (e) {
      console.log('No coin toss needed for team 2...');
    }
    
    // Try pick order selection
    try {
      const pickFirstButton = await page1.locator('button:has-text("Pick First")').first();
      if (await pickFirstButton.isVisible({ timeout: 5000 })) {
        console.log('Team 1 choosing pick order...');
        await pickFirstButton.click();
      } else {
        const pickFirstButton2 = await page2.locator('button:has-text("Pick First")').first();
        if (await pickFirstButton2.isVisible({ timeout: 5000 })) {
          console.log('Team 2 choosing pick order...');
          await pickFirstButton2.click();
        }
      }
    } catch (e) {
      console.log('No pick order selection needed, draft may already be in progress...');
    }
    
    // Wait for countdown and ban phase to start
    console.log('Waiting for ban phase to start...');
    await page1.waitForTimeout(5000);
    
    // Take screenshot when main timer starts
    console.log('Screenshot 1: Main timer started');
    await page1.screenshot({ path: 'testing/screenshots/bonus-test-1-main-timer-start.png' });
    await page2.screenshot({ path: 'testing/screenshots/bonus-test-2-main-timer-start.png' });
    
    // Wait 29 seconds for main timer to nearly expire
    console.log('Waiting 29 seconds for main timer to expire...');
    await page1.waitForTimeout(29000);
    
    // Take screenshot when main timer is about to expire
    console.log('Screenshot 2: Main timer at 1 second');
    await page1.screenshot({ path: 'testing/screenshots/bonus-test-3-main-timer-end.png' });
    await page2.screenshot({ path: 'testing/screenshots/bonus-test-4-main-timer-end.png' });
    
    // Wait 5 more seconds into bonus time
    console.log('Waiting 5 seconds into bonus time...');
    await page1.waitForTimeout(5000);
    
    // Take screenshot to check bonus timer
    console.log('Screenshot 3: Bonus timer should be at ~5 seconds');
    await page1.screenshot({ path: 'testing/screenshots/bonus-test-5-bonus-timer-5s.png' });
    await page2.screenshot({ path: 'testing/screenshots/bonus-test-6-bonus-timer-5s.png' });
    
    // Wait 5 more seconds for auto-selection
    console.log('Waiting 5 more seconds for auto-selection...');
    await page1.waitForTimeout(5000);
    
    // Take final screenshot
    console.log('Screenshot 4: Auto-selection should have occurred');
    await page1.screenshot({ path: 'testing/screenshots/bonus-test-7-auto-selected.png' });
    await page2.screenshot({ path: 'testing/screenshots/bonus-test-8-auto-selected.png' });
    
    console.log('Test completed! Check screenshots in testing/screenshots/');
    
  } catch (error) {
    console.error('Test failed:', error);
    
    // Take error screenshots
    const page1 = (await browser.contexts())[0]?.pages()[0];
    const page2 = (await browser.contexts())[1]?.pages()[0];
    
    if (page1) await page1.screenshot({ path: 'testing/screenshots/bonus-test-error-1.png' });
    if (page2) await page2.screenshot({ path: 'testing/screenshots/bonus-test-error-2.png' });
  } finally {
    await browser.close();
  }
}

// Run the test
testBonusTimer().catch(console.error);