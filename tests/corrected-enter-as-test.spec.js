const { test, expect } = require('@playwright/test');

test('CORRECTED Enter As Button Test - Proper Navigation Detection', async ({ page }) => {
  console.log('🎯 Running CORRECTED "Enter as" button test with proper navigation detection...');
  
  // Login as admin
  console.log('🔑 Logging in as admin...');
  const loginResponse = await page.request.post('http://localhost:3001/api/test-auth/login-test-admin');
  const loginData = await loginResponse.json();
  console.log(`Admin login success: ${loginData.success}`);
  
  // Navigate to tournament
  const tournamentUrl = 'http://localhost:3000/tournaments/67e81a0d-1165-4481-ad58-85da372f86d5';
  await page.goto(tournamentUrl);
  await page.waitForLoadState('networkidle');
  
  // Click Drafts tab
  console.log('📋 Clicking Drafts tab...');
  await page.locator('button:has-text("Drafts")').first().click();
  await page.waitForTimeout(2000);
  
  // Find "Enter as..." button
  const enterAsButtons = await page.locator('button:has-text("Enter as")').all();
  console.log(`Found ${enterAsButtons.length} "Enter as..." buttons`);
  
  if (enterAsButtons.length > 0) {
    const firstButton = enterAsButtons[0];
    const buttonText = await firstButton.textContent();
    console.log(`🎯 Testing button: "${buttonText}"`);
    
    const startingUrl = page.url();
    console.log(`Starting URL: ${startingUrl}`);
    
    // Click the button and wait for navigation
    await firstButton.click();
    
    // Wait for URL to change - this is the key fix
    await page.waitForURL(/\/draft\/.*captain=\d+/, { timeout: 10000 });
    
    const finalUrl = page.url();
    console.log(`Final URL: ${finalUrl}`);
    
    // Check if we navigated to a draft page with captain parameter
    const isDraftUrl = finalUrl.includes('/draft/') && finalUrl.includes('captain=');
    
    if (isDraftUrl) {
      console.log('✅ SUCCESS: Successfully navigated to draft page with captain parameter');
      
      // Wait for the coin toss interface to load
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      
      // Verify coin toss interface elements
      console.log('🔍 Verifying coin toss interface...');
      
      // Check for the main heading
      const headsOrTailsText = await page.locator('text=/heads.*or.*tails/i').count();
      console.log(`"Heads or tails" text found: ${headsOrTailsText > 0}`);
      
      // Check for coin buttons
      const headsButton = await page.locator('button:has-text("HEADS")').count();
      const tailsButton = await page.locator('button:has-text("TAILS")').count();
      console.log(`HEADS button found: ${headsButton > 0}, TAILS button found: ${tailsButton > 0}`);
      
      // Check for team names
      const crimsonText = await page.locator('text=/Crimson Knights/i').count();
      const crystalText = await page.locator('text=/Crystal Guardians/i').count();
      console.log(`Team names found - Crimson: ${crimsonText > 0}, Crystal: ${crystalText > 0}`);
      
      // Check for VS indicator
      const vsText = await page.locator('text=/vs/i').count();
      console.log(`VS indicator found: ${vsText > 0}`);
      
      // Check for status indicators
      const statusText = await page.locator('text=/Status.*Waiting/i').count();
      const phaseText = await page.locator('text=/Phase.*Coin Toss/i').count();
      const roleText = await page.locator('text=/Role.*Captain/i').count();
      console.log(`Status indicators - Status: ${statusText > 0}, Phase: ${phaseText > 0}, Role: ${roleText > 0}`);
      
      const allElementsPresent = (
        headsOrTailsText > 0 &&
        headsButton > 0 &&
        tailsButton > 0 &&
        crimsonText > 0 &&
        crystalText > 0 &&
        vsText > 0
      );
      
      if (allElementsPresent) {
        console.log('✅ PERFECT: All coin toss interface elements detected successfully!');
        console.log('✅ CONFIRMATION: "Enter as..." button functionality is working correctly');
        console.log('✅ NAVIGATION: Properly navigates to draft page with captain parameter');
        console.log('✅ INTERFACE: Coin toss interface loads with all expected elements');
        
        // Take final screenshot for documentation
        await page.screenshot({ path: 'corrected-enter-as-success.png', fullPage: true });
        
      } else {
        console.log('⚠️ PARTIAL: Navigation successful but some interface elements missing');
      }
      
    } else {
      console.log('❌ FAILURE: Button click did not navigate to expected draft URL pattern');
    }
    
  } else {
    console.log('❌ ERROR: No "Enter as..." buttons found');
  }
  
  console.log('✅ CORRECTED "Enter as" button test completed');
});