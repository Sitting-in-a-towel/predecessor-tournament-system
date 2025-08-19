const { test, expect } = require('@playwright/test');

test('Test Coin Toss Button Interaction', async ({ page }) => {
  console.log('🪙 Testing coin toss button interaction...');
  
  // Login as admin first
  console.log('🔑 Logging in as admin...');
  const loginResponse = await page.request.post('http://localhost:3001/api/test-auth/login-test-admin');
  const loginData = await loginResponse.json();
  console.log(`Admin login success: ${loginData.success}`);
  
  // Navigate directly to the draft URL
  const draftUrl = 'http://localhost:3000/draft/draft_1754664884481_c9k8hd893?captain=2';
  console.log(`📍 Navigating to: ${draftUrl}`);
  
  await page.goto(draftUrl);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  
  console.log(`Current URL: ${page.url()}`);
  
  // Take screenshot before clicking
  await page.screenshot({ path: 'before-coin-toss-click.png', fullPage: true });
  console.log('📷 Before screenshot taken');
  
  // Check current state
  const currentHeading = await page.locator('h1, h2').first().textContent().catch(() => 'No heading');
  console.log(`Current heading: "${currentHeading}"`);
  
  // Find coin toss buttons
  const headsButton = page.locator('button:has-text("HEADS")').first();
  const tailsButton = page.locator('button:has-text("TAILS")').first();
  
  const headsVisible = await headsButton.isVisible().catch(() => false);
  const tailsVisible = await tailsButton.isVisible().catch(() => false);
  
  console.log(`HEADS button visible: ${headsVisible}`);
  console.log(`TAILS button visible: ${tailsVisible}`);
  
  if (headsVisible) {
    console.log('🎯 Clicking HEADS button...');
    
    // Click the HEADS button
    await headsButton.click();
    
    // Wait for any changes
    console.log('⏳ Waiting for response after clicking HEADS...');
    await page.waitForTimeout(3000);
    
    // Check if anything changed
    const newUrl = page.url();
    console.log(`URL after click: ${newUrl}`);
    
    const newHeading = await page.locator('h1, h2').first().textContent().catch(() => 'No heading');
    console.log(`Heading after click: "${newHeading}"`);
    
    // Check for any new content or changes
    const pageText = await page.textContent('body');
    
    const hasWinner = pageText.toLowerCase().includes('winner');
    const hasResult = pageText.toLowerCase().includes('result');
    const hasPhaseChange = pageText.toLowerCase().includes('draft') && !pageText.toLowerCase().includes('coin toss');
    const hasPickBan = pageText.toLowerCase().includes('pick') || pageText.toLowerCase().includes('ban');
    const hasHeroes = pageText.toLowerCase().includes('hero');
    
    console.log('🔍 Checking for changes after HEADS click:');
    console.log(`  Winner text: ${hasWinner}`);
    console.log(`  Result text: ${hasResult}`);
    console.log(`  Phase changed from coin toss: ${hasPhaseChange}`);
    console.log(`  Pick/Ban content: ${hasPickBan}`);
    console.log(`  Heroes content: ${hasHeroes}`);
    
    // Check current phase/status
    const statusElements = await page.locator('text=/Status|Phase|Role/i').all();
    console.log(`Found ${statusElements.length} status indicators:`);
    
    for (let i = 0; i < statusElements.length; i++) {
      const statusText = await statusElements[i].textContent().catch(() => 'Could not read');
      console.log(`  Status ${i+1}: "${statusText}"`);
    }
    
    // Take screenshot after clicking
    await page.screenshot({ path: 'after-heads-click.png', fullPage: true });
    console.log('📷 After click screenshot taken');
    
    // Check if coin toss buttons are still visible
    const headsStillVisible = await headsButton.isVisible().catch(() => false);
    const tailsStillVisible = await tailsButton.isVisible().catch(() => false);
    
    console.log(`HEADS button still visible: ${headsStillVisible}`);
    console.log(`TAILS button still visible: ${tailsStillVisible}`);
    
    if (!headsStillVisible && !tailsStillVisible) {
      console.log('✅ SUCCESS: Coin toss buttons disappeared - likely moved to next phase');
    } else if (hasPhaseChange || hasPickBan) {
      console.log('✅ SUCCESS: Content changed indicating progression to draft phase');
    } else {
      console.log('❓ UNCLEAR: Button clicked but no obvious changes detected');
    }
    
  } else {
    console.log('❌ ERROR: HEADS button not visible, cannot test interaction');
  }
  
  console.log('✅ Coin toss interaction test completed');
});