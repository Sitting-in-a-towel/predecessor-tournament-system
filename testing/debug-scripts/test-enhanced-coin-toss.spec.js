const { test, expect } = require('@playwright/test');

test('Enhanced Coin Toss System Test', async ({ page }) => {
  console.log('🪙 Testing enhanced coin toss with WebSocket integration...');
  
  // Login as admin
  console.log('🔑 Logging in as admin...');
  const loginResponse = await page.request.post('http://localhost:3001/api/test-auth/login-test-admin');
  const loginData = await loginResponse.json();
  console.log(`Admin login success: ${loginData.success}`);
  
  // Navigate to the draft URL as captain 2
  const draftUrl = 'http://localhost:3000/draft/draft_1754664884481_c9k8hd893?captain=2';
  console.log(`📍 Navigating to: ${draftUrl}`);
  await page.goto(draftUrl);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);
  
  // Take screenshot to see current state
  await page.screenshot({ path: 'enhanced-coin-toss-initial.png', fullPage: true });
  
  // Check for coin toss interface
  const currentUrl = page.url();
  console.log(`Current URL: ${currentUrl}`);
  
  const headsButton = await page.locator('button:has-text("HEADS")').isVisible().catch(() => false);
  const tailsButton = await page.locator('button:has-text("TAILS")').isVisible().catch(() => false);
  console.log(`Coin buttons visible - HEADS: ${headsButton}, TAILS: ${tailsButton}`);
  
  // Check for waiting modal
  const waitingModal = await page.locator('.waiting-modal-overlay').isVisible().catch(() => false);
  console.log(`Waiting modal visible: ${waitingModal}`);
  
  // Check for enhanced WebSocket events in browser console
  const consoleLogs = [];
  page.on('console', msg => {
    if (msg.type() === 'log' && (
      msg.text().includes('socket') || 
      msg.text().includes('WebSocket') || 
      msg.text().includes('draft') ||
      msg.text().includes('coin')
    )) {
      consoleLogs.push(msg.text());
      console.log(`Browser console: ${msg.text()}`);
    }
  });
  
  // Wait for any WebSocket connections to establish
  await page.waitForTimeout(5000);
  
  if (headsButton && tailsButton) {
    console.log('🎯 Testing coin selection with enhanced WebSocket...');
    
    // Click HEADS button
    await page.click('button:has-text("HEADS")');
    console.log('Clicked HEADS button');
    
    // Wait for WebSocket response
    await page.waitForTimeout(3000);
    
    // Take screenshot after click
    await page.screenshot({ path: 'enhanced-coin-toss-after-heads.png', fullPage: true });
    
    // Check if button states changed
    const headsAfter = await page.locator('button:has-text("HEADS")').isVisible();
    const tailsAfter = await page.locator('button:has-text("TAILS")').isVisible();
    const headsDisabled = await page.locator('button:has-text("HEADS")').isDisabled().catch(() => false);
    const tailsDisabled = await page.locator('button:has-text("TAILS")').isDisabled().catch(() => false);
    
    console.log(`After HEADS click - HEADS visible: ${headsAfter}, TAILS visible: ${tailsAfter}`);
    console.log(`Button states - HEADS disabled: ${headsDisabled}, TAILS disabled: ${tailsDisabled}`);
  }
  
  // Check what's in the page content
  const pageContent = await page.textContent('body');
  const hasWaiting = pageContent.toLowerCase().includes('waiting');
  const hasCoinToss = pageContent.toLowerCase().includes('heads') && pageContent.toLowerCase().includes('tails');
  const hasDraft = pageContent.toLowerCase().includes('draft');
  const hasPhase = pageContent.toLowerCase().includes('phase');
  
  console.log('📄 Page content analysis:');
  console.log(`  Contains 'waiting': ${hasWaiting}`);
  console.log(`  Contains coin toss: ${hasCoinToss}`);
  console.log(`  Contains 'draft': ${hasDraft}`);
  console.log(`  Contains 'phase': ${hasPhase}`);
  
  // Log any console messages we captured
  if (consoleLogs.length > 0) {
    console.log(`📝 Captured ${consoleLogs.length} relevant console messages`);
  } else {
    console.log('⚠️ No WebSocket-related console messages captured');
  }
  
  // Final screenshot
  await page.screenshot({ path: 'enhanced-coin-toss-final.png', fullPage: true });
  
  console.log('✅ Enhanced coin toss test completed');
});