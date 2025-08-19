const { chromium } = require('playwright');

async function simpleBonusTest() {
  const browser = await chromium.launch({ headless: false });
  
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Go directly to a draft with known test tokens
    const url = 'http://localhost:4000/draft/test_bonus_debug?token=test_token_team1&captain=1';
    
    console.log('Opening draft page...');
    await page.goto(url);
    
    // Wait and take screenshot
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'testing/screenshots/simple-bonus-test.png' });
    
    console.log('Page loaded successfully');
    
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await browser.close();
  }
}

simpleBonusTest().catch(console.error);