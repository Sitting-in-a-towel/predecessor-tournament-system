const { test, expect } = require('@playwright/test');

test('Visual Match Test - Screenshot Comparison', async ({ page }) => {
  console.log('📸 Running visual match test to capture what actually happens...');
  
  // Login as admin
  const loginResponse = await page.request.post('http://localhost:3001/api/test-auth/login-test-admin');
  console.log(`Admin login success: ${(await loginResponse.json()).success}`);
  
  // Navigate to tournament
  await page.goto('http://localhost:3000/tournaments/67e81a0d-1165-4481-ad58-85da372f86d5');
  await page.waitForLoadState('networkidle');
  
  // Click Drafts tab
  console.log('📋 Clicking Drafts tab...');
  await page.locator('button:has-text("Drafts")').first().click();
  await page.waitForTimeout(2000);
  
  // Take screenshot before click
  console.log('📷 Taking before screenshot...');
  await page.screenshot({ path: 'before-enter-as-click.png', fullPage: true });
  
  // Click "Enter as..." button
  console.log('🎯 Clicking "Enter as Crimson Knights"...');
  await page.locator('button:has-text("Enter as Crimson Knights")').first().click();
  
  // Wait longer and check multiple times
  console.log('⏳ Waiting and monitoring changes...');
  
  for (let i = 1; i <= 10; i++) {
    await page.waitForTimeout(1000);
    
    // Take screenshot at each interval
    await page.screenshot({ path: `after-click-${i}s.png`, fullPage: true });
    
    // Check current state
    const currentUrl = page.url();
    const pageText = await page.textContent('body');
    
    const hasHeads = pageText.toLowerCase().includes('heads');
    const hasTails = pageText.toLowerCase().includes('tails');
    const hasCoinToss = pageText.toLowerCase().includes('heads or tails');
    const hasFirstPick = pageText.toLowerCase().includes('first to choose');
    
    console.log(`${i}s: URL=${currentUrl.split('/').pop()}`);
    console.log(`     Heads=${hasHeads}, Tails=${hasTails}, CoinToss=${hasCoinToss}, FirstPick=${hasFirstPick}`);
    
    // If we detect coin toss content, investigate further
    if (hasHeads || hasTails || hasCoinToss) {
      console.log(`🎯 COIN TOSS DETECTED at ${i} seconds!`);
      
      // Look for actual HEADS/TAILS buttons
      const headsButtons = await page.locator('text=/heads/i').all();
      const tailsButtons = await page.locator('text=/tails/i').all();
      
      console.log(`Heads elements found: ${headsButtons.length}`);
      console.log(`Tails elements found: ${tailsButtons.length}`);
      
      // Check if they're actually buttons
      const clickableHeads = await page.locator('button:has-text("HEADS"), button:has-text("Heads")').all();
      const clickableTails = await page.locator('button:has-text("TAILS"), button:has-text("Tails")').all();
      
      console.log(`Clickable Heads buttons: ${clickableHeads.length}`);
      console.log(`Clickable Tails buttons: ${clickableTails.length}`);
      
      // Check page title/heading
      const pageTitle = await page.locator('h1, h2, .main-title').first().textContent().catch(() => 'No title');
      console.log(`Page title: "${pageTitle}"`);
      
      // Check for team vs team display
      const vsElements = await page.locator('text=/vs/i, .vs').all();
      console.log(`VS elements: ${vsElements.length}`);
      
      if (vsElements.length > 0) {
        const vsText = await vsElements[0].textContent();
        console.log(`VS text: "${vsText}"`);
      }
      
      break; // Stop checking once we find coin toss content
    }
  }
  
  // Final screenshot
  console.log('📷 Taking final screenshot...');
  await page.screenshot({ path: 'final-state.png', fullPage: true });
  
  console.log('✅ Visual match test completed - check screenshots for actual results');
});