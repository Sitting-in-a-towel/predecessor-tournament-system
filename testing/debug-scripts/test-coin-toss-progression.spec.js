const { test, expect } = require('@playwright/test');

test('Test Coin Toss to Hero Selection Progression', async ({ page }) => {
  console.log('🪙 Testing Coin Toss Progression...');
  
  // Login as admin
  await page.request.post('http://localhost:3001/api/test-auth/login-test-admin');
  
  // Get draft in coin toss phase
  const draftsResponse = await page.request.get('http://localhost:3001/api/draft');
  const drafts = await draftsResponse.json();
  
  const coinTossDraft = drafts.find(d => d.current_phase === 'Coin Toss');
  if (!coinTossDraft) {
    console.log('❌ No coin toss draft found');
    return;
  }
  
  const draftId = coinTossDraft.draft_id;
  console.log(`Testing coin toss in draft: ${draftId}`);
  
  await page.goto(`http://localhost:3000/draft/${draftId}`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  
  // Look for coin toss buttons
  const coinButtons = await page.locator('button:has-text("heads"), button:has-text("tails"), .coin-button').all();
  console.log(`Found ${coinButtons.length} coin toss buttons`);
  
  if (coinButtons.length === 0) {
    // Check if we need to connect first
    const connectButton = await page.locator('button:has-text("connect"), button:has-text("Connect")').first();
    if (await connectButton.isVisible()) {
      console.log('Connecting to draft...');
      await connectButton.click();
      await page.waitForTimeout(2000);
    }
    
    // Look for coin buttons again
    const newCoinButtons = await page.locator('button:has-text("heads"), button:has-text("tails"), .coin-button').all();
    console.log(`Found ${newCoinButtons.length} coin toss buttons after connection`);
  }
  
  // Check if we can see team connection status
  const connectionElements = await page.locator('text=/connect|Connect|connected|Connected/i').all();
  console.log(`Found ${connectionElements.length} connection-related elements`);
  
  // Check for waiting messages
  const waitingElements = await page.locator('text=/waiting|Waiting|WAITING/i').all();
  console.log(`Found ${waitingElements.length} waiting indicators`);
  
  for (const waiting of waitingElements.slice(0, 2)) {
    const waitingText = await waiting.textContent();
    console.log(`  Waiting message: "${waitingText?.trim()}"`);
  }
  
  // Try to perform coin toss via API (since UI might require both teams)
  console.log('Attempting coin toss via API...');
  
  try {
    const coinResponse = await page.request.post(`http://localhost:3001/api/draft/${draftId}/race-coin-choice`, {
      data: { choice: 'heads' }
    });
    const coinResult = await coinResponse.json();
    console.log(`Coin toss API response: ${JSON.stringify(coinResult)}`);
    
    if (coinResult.success) {
      await page.waitForTimeout(3000);
      await page.reload();
      await page.waitForTimeout(2000);
      
      // Check for heroes now
      const heroElements = await page.locator('.hero-item, .hero-card, [data-hero]').all();
      console.log(`Heroes found after coin toss: ${heroElements.length}`);
      
      // Check new phase
      const phaseElements = await page.locator('text=/phase|Phase/i').all();
      if (phaseElements.length > 0) {
        const phaseText = await phaseElements[0].textContent();
        console.log(`New phase after coin toss: "${phaseText?.trim()}"`);
      }
    }
  } catch (error) {
    console.log(`Coin toss API error: ${error.message}`);
    
    // This might be expected if authentication is required
    if (error.message.includes('403') || error.message.includes('401')) {
      console.log('This is expected - coin toss requires proper team captain authentication');
    }
  }
});