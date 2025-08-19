const { chromium } = require('playwright');

async function testCoinToss() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    console.log('🎯 Testing Coin Toss Draft Buttons...\n');
    
    // Navigate to the coin toss draft
    const coinTossDraftId = 'draft_1754664884481_c9k8hd893';
    await page.goto(`http://localhost:3000/draft/${coinTossDraftId}`);
    await page.waitForLoadState('networkidle');
    
    console.log(`📍 Navigated to: http://localhost:3000/draft/${coinTossDraftId}`);
    
    // Check page content
    const pageTitle = await page.title();
    console.log(`Page title: ${pageTitle}`);
    
    // Check for draft container
    const draftContainer = page.locator('[class*="draft"], .draft-container, #draft').first();
    const containerExists = await draftContainer.isVisible().catch(() => false);
    console.log(`Draft container visible: ${containerExists}`);
    
    // Check for coin toss phase indicator
    const phaseIndicator = page.locator(':has-text("Coin Toss"), [class*="phase"]:has-text("Coin")').first();
    const phaseVisible = await phaseIndicator.isVisible().catch(() => false);
    console.log(`Coin Toss phase indicator: ${phaseVisible}`);
    
    // Check for Heads button
    const headsButton = page.locator('button:has-text("Heads"), [role="button"]:has-text("Heads"), .btn:has-text("Heads")').first();
    const headsVisible = await headsButton.isVisible().catch(() => false);
    console.log(`🪙 Heads button visible: ${headsVisible}`);
    
    // Check for Tails button  
    const tailsButton = page.locator('button:has-text("Tails"), [role="button"]:has-text("Tails"), .btn:has-text("Tails")').first();
    const tailsVisible = await tailsButton.isVisible().catch(() => false);
    console.log(`🪙 Tails button visible: ${tailsVisible}`);
    
    // Get all buttons on page
    const allButtons = page.locator('button, [role="button"], .btn');
    const buttonCount = await allButtons.count();
    console.log(`\nTotal buttons found on page: ${buttonCount}`);
    
    for (let i = 0; i < Math.min(buttonCount, 10); i++) {
      const button = allButtons.nth(i);
      const text = await button.textContent().catch(() => 'No text');
      const isVisible = await button.isVisible().catch(() => false);
      console.log(`Button ${i}: "${text}" (visible: ${isVisible})`);
    }
    
    // Check page text content
    const bodyText = await page.locator('body').textContent();
    const hasCoinToss = bodyText.includes('Coin Toss');
    const hasHeads = bodyText.includes('Heads');
    const hasTails = bodyText.includes('Tails');
    
    console.log(`\n📄 Page content check:`);
    console.log(`Contains "Coin Toss": ${hasCoinToss}`);
    console.log(`Contains "Heads": ${hasHeads}`);
    console.log(`Contains "Tails": ${hasTails}`);
    
    // Take screenshot
    await page.screenshot({ path: 'test-results/coin-toss-test.png', fullPage: true });
    console.log(`\n📸 Screenshot saved: test-results/coin-toss-test.png`);
    
    // Test if we can see the draft data
    const draftData = await page.evaluate(() => {
      return window.__DRAFT_DATA__ || 'No draft data in window';
    });
    console.log(`Draft data in window:`, draftData);
    
  } catch (error) {
    console.error('❌ Error testing coin toss:', error.message);
  } finally {
    await browser.close();
  }
}

testCoinToss();