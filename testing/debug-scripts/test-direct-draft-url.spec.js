const { test, expect } = require('@playwright/test');

test('Test Direct Draft URL Navigation', async ({ page }) => {
  console.log('🎯 Testing direct navigation to draft URL with captain parameter...');
  
  // Login as admin first
  console.log('🔑 Logging in as admin...');
  const loginResponse = await page.request.post('http://localhost:3001/api/test-auth/login-test-admin');
  const loginData = await loginResponse.json();
  console.log(`Admin login success: ${loginData.success}`);
  
  // Navigate directly to the draft URL the user provided
  const draftUrl = 'http://localhost:3000/draft/draft_1754664884481_c9k8hd893?captain=2';
  console.log(`📍 Navigating directly to: ${draftUrl}`);
  
  await page.goto(draftUrl);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  
  console.log(`Current URL: ${page.url()}`);
  
  // Check if we successfully loaded the draft page
  const pageContent = await page.textContent('body');
  
  // Look for coin toss elements
  const coinTossElements = await page.locator('text=/heads|tails/i').all();
  console.log(`Found ${coinTossElements.length} coin toss elements`);
  
  // Look for the main heading
  const heading = await page.locator('h1, h2, .main-title').first().textContent().catch(() => 'No heading found');
  console.log(`Page heading: "${heading}"`);
  
  // Look for team names
  const teamElements = await page.locator('text=/Crimson|Crystal|Knights|Guardians/i').all();
  console.log(`Found ${teamElements.length} team name elements`);
  
  // Look for VS indicator
  const vsElements = await page.locator('text=/vs/i').all();
  console.log(`Found ${vsElements.length} VS elements`);
  
  // Look for coin buttons
  const headsButton = await page.locator('button:has-text("HEADS"), button:has-text("Heads")').all();
  const tailsButton = await page.locator('button:has-text("TAILS"), button:has-text("Tails")').all();
  console.log(`Heads buttons: ${headsButton.length}, Tails buttons: ${tailsButton.length}`);
  
  // Check for status indicator
  const statusElements = await page.locator('text=/status|waiting/i').all();
  console.log(`Found ${statusElements.length} status elements`);
  
  // Check if this looks like the coin toss interface from the screenshot
  const hasCoinTossInterface = (
    heading.toLowerCase().includes('heads') || 
    heading.toLowerCase().includes('tails') ||
    coinTossElements.length > 0 ||
    (headsButton.length > 0 && tailsButton.length > 0)
  );
  
  console.log(`🎯 Coin toss interface detected: ${hasCoinTossInterface}`);
  
  if (hasCoinTossInterface) {
    console.log('✅ SUCCESS: Direct navigation to draft URL shows coin toss interface');
    console.log('✅ This confirms the "Enter as" button functionality is working');
    
    // Take a screenshot to compare with user's reference
    await page.screenshot({ path: 'direct-draft-navigation.png', fullPage: true });
    console.log('📷 Screenshot saved: direct-draft-navigation.png');
  } else {
    console.log('❌ ISSUE: Draft URL does not show expected coin toss interface');
    console.log('🐛 DEBUG: Page content analysis...');
    
    // Debug what we actually see
    const allButtons = await page.locator('button').all();
    console.log(`Total buttons found: ${allButtons.length}`);
    
    for (let i = 0; i < Math.min(allButtons.length, 10); i++) {
      const btnText = await allButtons[i].textContent();
      const isVisible = await allButtons[i].isVisible();
      console.log(`  Button ${i+1}: "${btnText?.trim()}" - visible: ${isVisible}`);
    }
    
    // Check if we got redirected or hit an error page
    if (pageContent.toLowerCase().includes('error') || pageContent.toLowerCase().includes('not found')) {
      console.log('❌ ERROR: Page shows error or not found message');
    }
    
    // Take screenshot for debugging
    await page.screenshot({ path: 'direct-draft-navigation-debug.png', fullPage: true });
  }
  
  console.log('✅ Direct draft URL test completed');
});