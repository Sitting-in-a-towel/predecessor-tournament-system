const { test, expect } = require('@playwright/test');

test('Fixed Enter As Button Test', async ({ page }) => {
  console.log('🔧 Running FIXED "Enter as" button test...');
  
  // Set up better navigation detection
  let navigationOccurred = false;
  let finalUrl = '';
  
  page.on('framenavigated', (frame) => {
    if (frame === page.mainFrame()) {
      navigationOccurred = true;
      finalUrl = frame.url();
      console.log(`📍 Navigation detected to: ${finalUrl}`);
    }
  });
  
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
  const draftsTab = await page.locator('button:has-text("Drafts")').first();
  await draftsTab.click();
  await page.waitForTimeout(2000);
  
  // Reset navigation tracking
  navigationOccurred = false;
  finalUrl = '';
  
  // Find and click "Enter as..." button
  const enterAsButtons = await page.locator('button:has-text("Enter as")').all();
  console.log(`Found ${enterAsButtons.length} "Enter as..." buttons`);
  
  if (enterAsButtons.length > 0) {
    const firstButton = enterAsButtons[0];
    const buttonText = await firstButton.textContent();
    console.log(`🎯 Clicking: "${buttonText}"`);
    
    // Click and wait for navigation or content change
    await Promise.all([
      firstButton.click(),
      // Wait for either navigation or significant DOM changes
      page.waitForFunction(() => {
        return document.querySelector('h1, h2, .page-title, [class*="coin"], [class*="draft"]') !== null;
      }, { timeout: 10000 }).catch(() => {
        console.log('No major DOM changes detected within 10 seconds');
      })
    ]);
    
    // Give extra time for any async operations
    await page.waitForTimeout(3000);
    
    const currentUrl = page.url();
    console.log(`Current URL after click: ${currentUrl}`);
    console.log(`Navigation event fired: ${navigationOccurred}`);
    if (navigationOccurred) {
      console.log(`Navigation event URL: ${finalUrl}`);
    }
    
    // Better content detection - look for specific coin toss elements
    console.log('🔍 Checking for coin toss content...');
    
    // Check multiple ways to detect coin toss interface
    const coinTossChecks = [
      { name: 'Heads button', selector: 'button:has-text("HEADS"), button:has-text("Heads"), button[aria-label*="heads" i]' },
      { name: 'Tails button', selector: 'button:has-text("TAILS"), button:has-text("Tails"), button[aria-label*="tails" i]' },
      { name: 'Coin toss heading', selector: 'text=/heads.*tails|tails.*heads/i, h1:has-text("coin"), h2:has-text("coin")' },
      { name: 'Coin toss text', selector: 'text=/be quick|first to choose/i' },
      { name: 'VS indicator', selector: 'text=/vs/i, .vs, .versus' },
      { name: 'Team names', selector: 'text=/Crimson Knights|Crystal Guardians/i' },
      { name: 'Status indicator', selector: 'text=/waiting|status/i' }
    ];
    
    let coinTossDetected = false;
    
    for (const check of coinTossChecks) {
      try {
        const elements = await page.locator(check.selector).all();
        const visible = elements.length > 0 && await elements[0].isVisible().catch(() => false);
        console.log(`  ${check.name}: ${elements.length} found, visible: ${visible}`);
        
        if (elements.length > 0 && visible) {
          coinTossDetected = true;
          
          // Get text content for verification
          const text = await elements[0].textContent().catch(() => 'Could not read text');
          console.log(`    Content: "${text?.trim()}"`);
        }
      } catch (error) {
        console.log(`  ${check.name}: Error checking - ${error.message}`);
      }
    }
    
    // Overall assessment
    if (coinTossDetected) {
      console.log('✅ SUCCESS: Coin toss interface detected!');
      console.log('✅ "Enter as..." button is working correctly');
    } else {
      console.log('❌ ISSUE: Coin toss interface not detected');
      console.log('❌ Either button not working or test detection failing');
      
      // Debug: capture page content
      console.log('🐛 DEBUG: Capturing page state for analysis...');
      const pageText = await page.textContent('body');
      const hasRelevantText = {
        coin: pageText.toLowerCase().includes('coin'),
        heads: pageText.toLowerCase().includes('heads'),
        tails: pageText.toLowerCase().includes('tails'),
        crimson: pageText.toLowerCase().includes('crimson'),
        crystal: pageText.toLowerCase().includes('crystal'),
        vs: pageText.toLowerCase().includes(' vs '),
        waiting: pageText.toLowerCase().includes('waiting')
      };
      
      console.log('Page text contains:', hasRelevantText);
      
      // Get page title
      const title = await page.title();
      console.log(`Page title: "${title}"`);
    }
  }
  
  console.log('✅ Fixed "Enter as" button test completed');
});