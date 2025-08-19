const { test, expect } = require('@playwright/test');

test('Complete Exfang Website Analysis', async ({ page }) => {
  console.log('🔍 Starting comprehensive analysis of https://exfang.fly.dev/');
  
  // Capture all network requests to understand API endpoints
  const networkRequests = [];
  const networkResponses = [];
  
  page.on('request', request => {
    networkRequests.push({
      url: request.url(),
      method: request.method(),
      headers: request.headers()
    });
  });
  
  page.on('response', response => {
    networkResponses.push({
      url: response.url(),
      status: response.status(),
      headers: response.headers()
    });
  });
  
  // Step 1: Initial page load and structure analysis
  console.log('📍 Step 1: Loading homepage and analyzing structure...');
  await page.goto('https://exfang.fly.dev/');
  await page.waitForLoadState('networkidle');
  
  // Take initial screenshot
  await page.screenshot({ path: 'exfang-homepage.png', fullPage: true });
  
  // Get page title and basic info
  const title = await page.title();
  const url = page.url();
  console.log(`Page title: ${title}`);
  console.log(`Final URL: ${url}`);
  
  // Step 2: Analyze all visible elements
  console.log('🔍 Step 2: Cataloging all interactive elements...');
  
  // Find all buttons
  const buttons = await page.locator('button').all();
  console.log(`Found ${buttons.length} buttons:`);
  for (let i = 0; i < buttons.length; i++) {
    const text = await buttons[i].textContent().catch(() => 'No text');
    const isVisible = await buttons[i].isVisible().catch(() => false);
    console.log(`  - Button ${i+1}: "${text}" (visible: ${isVisible})`);
  }
  
  // Find all links
  const links = await page.locator('a').all();
  console.log(`Found ${links.length} links:`);
  for (let i = 0; i < links.length; i++) {
    const text = await links[i].textContent().catch(() => 'No text');
    const href = await links[i].getAttribute('href').catch(() => 'No href');
    const isVisible = await links[i].isVisible().catch(() => false);
    if (isVisible && (text.trim() || href)) {
      console.log(`  - Link ${i+1}: "${text.trim()}" -> ${href}`);
    }
  }
  
  // Find all input fields
  const inputs = await page.locator('input').all();
  console.log(`Found ${inputs.length} input fields:`);
  for (let i = 0; i < inputs.length; i++) {
    const type = await inputs[i].getAttribute('type').catch(() => 'unknown');
    const placeholder = await inputs[i].getAttribute('placeholder').catch(() => '');
    const isVisible = await inputs[i].isVisible().catch(() => false);
    if (isVisible) {
      console.log(`  - Input ${i+1}: type="${type}", placeholder="${placeholder}"`);
    }
  }
  
  // Step 3: Test "New draft" functionality
  console.log('🆕 Step 3: Testing "New draft" functionality...');
  
  const newDraftButton = page.locator('button:has-text("New draft")');
  if (await newDraftButton.isVisible().catch(() => false)) {
    console.log('Clicking "New draft" button...');
    await newDraftButton.click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'exfang-new-draft.png', fullPage: true });
    
    // Check what changed after clicking
    const currentUrl = page.url();
    console.log(`URL after New draft: ${currentUrl}`);
    
    // Look for form fields or configuration options
    const newInputs = await page.locator('input').all();
    console.log(`Input fields in draft creation:`);
    for (let i = 0; i < newInputs.length; i++) {
      const type = await newInputs[i].getAttribute('type').catch(() => 'unknown');
      const placeholder = await newInputs[i].getAttribute('placeholder').catch(() => '');
      const label = await newInputs[i].getAttribute('aria-label').catch(() => '');
      const isVisible = await newInputs[i].isVisible().catch(() => false);
      if (isVisible) {
        console.log(`  - Input: type="${type}", placeholder="${placeholder}", label="${label}"`);
      }
    }
    
    // Look for dropdown menus or select elements
    const selects = await page.locator('select').all();
    for (let i = 0; i < selects.length; i++) {
      const isVisible = await selects[i].isVisible().catch(() => false);
      if (isVisible) {
        const options = await selects[i].locator('option').all();
        console.log(`  - Select with ${options.length} options`);
        for (let j = 0; j < Math.min(options.length, 5); j++) {
          const optionText = await options[j].textContent();
          console.log(`    * ${optionText}`);
        }
      }
    }
    
    // Test filling out the draft form
    console.log('🖊️ Testing draft form inputs...');
    
    // Try to fill team names
    const teamInputs = await page.locator('input[placeholder*="team"], input[placeholder*="Team"], input[type="text"]').all();
    for (let i = 0; i < Math.min(teamInputs.length, 4); i++) {
      const isVisible = await teamInputs[i].isVisible().catch(() => false);
      if (isVisible) {
        await teamInputs[i].fill(`Test Team ${i + 1}`);
        console.log(`Filled team input ${i + 1} with "Test Team ${i + 1}"`);
      }
    }
    
    // Look for checkboxes or radio buttons
    const checkboxes = await page.locator('input[type="checkbox"]').all();
    console.log(`Found ${checkboxes.length} checkboxes`);
    
    const radioButtons = await page.locator('input[type="radio"]').all();
    console.log(`Found ${radioButtons.length} radio buttons`);
    
    // Try to find and test submit functionality
    const submitButtons = await page.locator('button:has-text("Submit"), button[type="submit"], button:has-text("Create"), button:has-text("Start")').all();
    for (let i = 0; i < submitButtons.length; i++) {
      const isVisible = await submitButtons[i].isVisible().catch(() => false);
      const text = await submitButtons[i].textContent().catch(() => 'No text');
      if (isVisible) {
        console.log(`Found submit button: "${text}"`);
      }
    }
  }
  
  // Step 4: Test "Draft access" functionality
  console.log('🔑 Step 4: Testing "Draft access" functionality...');
  
  // Go back to homepage first
  await page.goto('https://exfang.fly.dev/');
  await page.waitForTimeout(1000);
  
  const draftAccessButton = page.locator('button:has-text("Draft access")');
  if (await draftAccessButton.isVisible().catch(() => false)) {
    console.log('Clicking "Draft access" button...');
    await draftAccessButton.click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'exfang-draft-access.png', fullPage: true });
    
    const accessUrl = page.url();
    console.log(`URL after Draft access: ${accessUrl}`);
    
    // Look for token input or access form
    const tokenInputs = await page.locator('input[placeholder*="token"], input[placeholder*="Token"], input[placeholder*="ID"], input[placeholder*="code"]').all();
    console.log(`Found ${tokenInputs.length} potential token inputs`);
    
    // Try entering a test token
    if (tokenInputs.length > 0) {
      await tokenInputs[0].fill('test123');
      console.log('Entered test token');
      
      // Look for access/join button
      const joinButtons = await page.locator('button:has-text("Join"), button:has-text("Access"), button:has-text("Enter"), button[type="submit"]').all();
      for (let i = 0; i < joinButtons.length; i++) {
        const isVisible = await joinButtons[i].isVisible().catch(() => false);
        const text = await joinButtons[i].textContent().catch(() => 'No text');
        if (isVisible) {
          console.log(`Found join button: "${text}"`);
          // Don't actually click it to avoid errors, just log that we found it
        }
      }
    }
  }
  
  // Step 5: Test "Sign in" functionality
  console.log('👤 Step 5: Testing "Sign in" functionality...');
  
  await page.goto('https://exfang.fly.dev/');
  await page.waitForTimeout(1000);
  
  const signInButton = page.locator('button:has-text("Sign in")');
  if (await signInButton.isVisible().catch(() => false)) {
    console.log('Clicking "Sign in" button...');
    await signInButton.click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'exfang-sign-in.png', fullPage: true });
    
    const signInUrl = page.url();
    console.log(`URL after Sign in: ${signInUrl}`);
    
    // Look for authentication forms
    const emailInputs = await page.locator('input[type="email"], input[placeholder*="email"], input[placeholder*="Email"]').all();
    const passwordInputs = await page.locator('input[type="password"], input[placeholder*="password"], input[placeholder*="Password"]').all();
    
    console.log(`Found ${emailInputs.length} email inputs and ${passwordInputs.length} password inputs`);
    
    // Check for third-party auth options
    const authButtons = await page.locator('button:has-text("Google"), button:has-text("Discord"), button:has-text("GitHub"), button:has-text("Facebook")').all();
    for (let i = 0; i < authButtons.length; i++) {
      const isVisible = await authButtons[i].isVisible().catch(() => false);
      const text = await authButtons[i].textContent().catch(() => 'No text');
      if (isVisible) {
        console.log(`Found auth button: "${text}"`);
      }
    }
  }
  
  // Step 6: Explore any hidden functionality or additional pages
  console.log('🔍 Step 6: Exploring additional functionality...');
  
  // Check for any navigation menus or dropdowns
  const navElements = await page.locator('nav, .nav, .menu, .navbar').all();
  console.log(`Found ${navElements.length} navigation elements`);
  
  // Look for any collapsible content or tabs
  const expandableElements = await page.locator('[aria-expanded], .collapse, .accordion, .tab').all();
  console.log(`Found ${expandableElements.length} potentially expandable elements`);
  
  // Check for any modals or popups
  const modalTriggers = await page.locator('[data-toggle="modal"], [data-bs-toggle="modal"], .modal-trigger').all();
  console.log(`Found ${modalTriggers.length} potential modal triggers`);
  
  // Step 7: Analyze all text content for features
  console.log('📝 Step 7: Analyzing all text content...');
  
  const bodyText = await page.locator('body').textContent();
  const keywords = ['draft', 'team', 'tournament', 'match', 'game', 'player', 'strategy', 'ban', 'pick', 'timer', 'coin toss'];
  
  console.log('Feature keywords found in content:');
  keywords.forEach(keyword => {
    const count = (bodyText.toLowerCase().match(new RegExp(keyword, 'g')) || []).length;
    if (count > 0) {
      console.log(`  - "${keyword}": ${count} occurrences`);
    }
  });
  
  // Step 8: Network analysis
  console.log('🌐 Step 8: Network analysis...');
  console.log(`Total network requests: ${networkRequests.length}`);
  
  // Analyze API endpoints
  const apiEndpoints = networkRequests
    .filter(req => req.url.includes('/api/') || req.method !== 'GET')
    .slice(0, 10); // Limit to first 10 to avoid spam
  
  console.log('API endpoints discovered:');
  apiEndpoints.forEach((req, i) => {
    console.log(`  ${i+1}. ${req.method} ${req.url}`);
  });
  
  // Check for WebSocket connections
  const wsConnections = networkRequests.filter(req => req.url.includes('socket.io') || req.url.includes('ws://') || req.url.includes('wss://'));
  console.log(`WebSocket connections: ${wsConnections.length}`);
  
  // Final screenshot
  await page.goto('https://exfang.fly.dev/');
  await page.screenshot({ path: 'exfang-final-overview.png', fullPage: true });
  
  console.log('✅ Complete website analysis finished');
});