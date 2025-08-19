const { chromium } = require('playwright');

async function quickTest() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  console.log('Opening draft page and leaving it open for 10 seconds...');
  await page.goto('http://localhost:4000/draft/test_draft_playwright?token=test_token_team1&captain=1');
  
  // Just wait and watch - don't close
  await page.waitForTimeout(15000);
  
  await browser.close();
}

quickTest().catch(console.error);