const { test, expect } = require('@playwright/test');

test('Detailed "Enter as" Button Test with URL Tracking', async ({ page }) => {
  console.log('🎯 Running detailed "Enter as" button test...');
  
  // Login as admin
  console.log('🔑 Logging in as admin...');
  const loginResponse = await page.request.post('http://localhost:3001/api/test-auth/login-test-admin');
  const loginData = await loginResponse.json();
  console.log(`Admin login success: ${loginData.success}`);
  
  // Navigate to tournament
  const tournamentUrl = 'http://localhost:3000/tournaments/67e81a0d-1165-4481-ad58-85da372f86d5';
  console.log(`🏆 Navigating to: ${tournamentUrl}`);
  await page.goto(tournamentUrl);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
  
  console.log(`Starting URL: ${page.url()}`);
  
  // Click Drafts tab
  console.log('📋 Clicking Drafts tab...');
  const draftsTab = await page.locator('button:has-text("Drafts")').first();
  await draftsTab.click();
  await page.waitForTimeout(2000);
  
  console.log(`After clicking Drafts tab URL: ${page.url()}`);
  
  // Find and click "Enter as..." button
  const enterAsButtons = await page.locator('button:has-text("Enter as")').all();
  console.log(`Found ${enterAsButtons.length} "Enter as..." buttons`);
  
  if (enterAsButtons.length > 0) {
    const firstButton = enterAsButtons[0];
    const buttonText = await firstButton.textContent();
    console.log(`🎯 About to click: "${buttonText}"`);
    console.log(`URL before click: ${page.url()}`);
    
    // Click the button
    await firstButton.click();
    
    // Wait and check URL multiple times to track navigation
    console.log('⏱️ Tracking URL changes after click...');
    
    for (let i = 0; i < 10; i++) {
      await page.waitForTimeout(500);
      const currentUrl = page.url();
      console.log(`  ${i * 0.5}s: ${currentUrl}`);
      
      // If URL changed, break early
      if (currentUrl !== tournamentUrl) {
        console.log(`✅ URL changed detected at ${i * 0.5} seconds!`);
        break;
      }
    }
    
    const finalUrl = page.url();
    console.log(`🏁 Final URL: ${finalUrl}`);
    
    // Check if we're on a different page now
    if (finalUrl !== tournamentUrl) {
      console.log('✅ Successfully navigated to a different page!');
      
      // Analyze the new page content
      console.log('📄 Analyzing new page content...');
      
      // Check for draft-specific elements
      const coinTossElements = await page.locator('text=/heads|tails|coin/i').all();
      console.log(`Found ${coinTossElements.length} coin toss related elements`);
      
      const draftElements = await page.locator('text=/draft|pick|ban|phase/i').all();
      console.log(`Found ${draftElements.length} draft related elements`);
      
      // Check for team names
      const teamElements = await page.locator('text=/Crimson|Crystal|Knights|Guardians/i').all();
      console.log(`Found ${teamElements.length} team name elements`);
      
      // Check for interactive buttons
      const interactiveButtons = await page.locator('button').all();
      console.log(`Found ${interactiveButtons.length} buttons on new page:`);
      
      for (const button of interactiveButtons) {
        const btnText = await button.textContent();
        const isVisible = await button.isVisible();
        console.log(`  Button: "${btnText?.trim()}" - visible: ${isVisible}`);
      }
      
      // Check page title or main heading
      const pageTitle = await page.locator('h1, h2, .page-title').first().textContent().catch(() => 'No title found');
      console.log(`Page title/heading: "${pageTitle}"`);
      
      // Check for any status indicators
      const statusElements = await page.locator('text=/status|Status|waiting|Waiting/i').all();
      console.log(`Found ${statusElements.length} status indicators`);
      
      for (const status of statusElements) {
        const statusText = await status.textContent();
        console.log(`  Status: "${statusText?.trim()}"`);
      }
      
    } else {
      console.log('❌ No navigation occurred - stayed on same page');
      
      // Check if anything changed on the current page
      const allText = await page.textContent('body');
      console.log(`Page contains "coin": ${allText.toLowerCase().includes('coin')}`);
      console.log(`Page contains "heads": ${allText.toLowerCase().includes('heads')}`);
      console.log(`Page contains "tails": ${allText.toLowerCase().includes('tails')}`);
    }
  }
  
  console.log('✅ Detailed "Enter as" button test completed');
});