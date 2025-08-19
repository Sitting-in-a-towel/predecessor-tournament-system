const { test, expect } = require('@playwright/test');

test('Detailed Exfang Workflow Analysis', async ({ page }) => {
  console.log('🎯 Deep dive into Exfang draft workflow...');
  
  // Step 1: Homepage analysis
  console.log('📋 Step 1: Homepage content analysis...');
  await page.goto('https://exfang.fly.dev/');
  await page.waitForLoadState('networkidle');
  
  const pageContent = await page.textContent('body');
  console.log('Homepage text content preview:');
  console.log(pageContent.replace(/\s+/g, ' ').substring(0, 300) + '...');
  
  // Step 2: Detailed draft creation analysis
  console.log('🆕 Step 2: Detailed draft creation workflow...');
  await page.click('button:has-text("New draft")');
  await page.waitForLoadState('networkidle');
  
  const draftContent = await page.textContent('body');
  console.log('Draft creation page content:');
  console.log(draftContent.replace(/\s+/g, ' ').substring(0, 500) + '...');
  
  // Analyze the form in detail
  console.log('📝 Form field analysis:');
  
  // Team name fields
  const team1Input = await page.locator('input[placeholder="Dawn"]');
  const team2Input = await page.locator('input[placeholder="Dusk"]');
  
  if (await team1Input.isVisible()) {
    console.log('Team 1 field: Placeholder "Dawn" - appears to be for team name');
    await team1Input.fill('Team Alpha');
  }
  
  if (await team2Input.isVisible()) {
    console.log('Team 2 field: Placeholder "Dusk" - appears to be for team name');
    await team2Input.fill('Team Beta');
  }
  
  // Analyze checkboxes
  const checkboxes = await page.locator('input[type="checkbox"]').all();
  console.log(`Found ${checkboxes.length} checkboxes. Analyzing each:`);
  
  for (let i = 0; i < checkboxes.length; i++) {
    const checkbox = checkboxes[i];
    const parent = await checkbox.locator('..').textContent();
    const isChecked = await checkbox.isChecked();
    console.log(`  Checkbox ${i+1}: "${parent.replace(/\s+/g, ' ').trim()}" (checked: ${isChecked})`);
    
    // Test checking/unchecking each checkbox
    if (!isChecked) {
      await checkbox.click();
      console.log(`    Clicked checkbox ${i+1} - now checked`);
    }
  }
  
  // Analyze dropdown menus
  const selects = await page.locator('select').all();
  console.log(`Found ${selects.length} dropdown menus:`);
  
  for (let i = 0; i < selects.length; i++) {
    const select = selects[i];
    const options = await select.locator('option').all();
    
    console.log(`  Dropdown ${i+1} has ${options.length} options:`);
    for (let j = 0; j < options.length; j++) {
      const optionText = await options[j].textContent();
      const optionValue = await options[j].getAttribute('value');
      console.log(`    Option ${j+1}: "${optionText}" (value: ${optionValue})`);
    }
    
    // Test selecting different options
    if (options.length > 1) {
      await select.selectOption({ index: 1 });
      console.log(`    Selected option 2 for dropdown ${i+1}`);
    }
  }
  
  // Take screenshot of configured draft
  await page.screenshot({ path: 'exfang-configured-draft.png', fullPage: true });
  
  // Step 3: Test draft submission
  console.log('🚀 Step 3: Testing draft submission...');
  
  const submitButton = page.locator('button:has-text("Submit")');
  if (await submitButton.isVisible()) {
    console.log('Clicking submit button...');
    
    // Capture any navigation or changes
    const responsePromise = page.waitForResponse(response => 
      response.url().includes('exfang.fly.dev') && response.status() !== 304
    ).catch(() => null);
    
    await submitButton.click();
    
    const response = await responsePromise;
    if (response) {
      console.log(`Submit response: ${response.status()} ${response.url()}`);
    }
    
    await page.waitForTimeout(3000);
    
    const newUrl = page.url();
    console.log(`URL after submit: ${newUrl}`);
    
    await page.screenshot({ path: 'exfang-after-submit.png', fullPage: true });
    
    // Check if we're now in a draft session
    const postSubmitContent = await page.textContent('body');
    console.log('Content after submit:');
    console.log(postSubmitContent.replace(/\s+/g, ' ').substring(0, 400) + '...');
    
    // Look for draft-specific elements
    const draftElements = await page.locator('[class*="draft"], [id*="draft"]').all();
    console.log(`Found ${draftElements.length} draft-related elements`);
    
    // Check for timer elements
    const timerElements = await page.locator('[class*="timer"], [id*="timer"], text=/\\d+:\\d+/').all();
    console.log(`Found ${timerElements.length} potential timer elements`);
    
    // Check for team/player areas
    const teamElements = await page.locator('[class*="team"], [id*="team"]').all();
    console.log(`Found ${teamElements.length} team-related elements`);
  }
  
  // Step 4: Deep dive into draft access
  console.log('🔑 Step 4: Draft access workflow...');
  await page.goto('https://exfang.fly.dev/');
  await page.waitForTimeout(1000);
  
  await page.click('button:has-text("Draft access")');
  await page.waitForLoadState('networkidle');
  
  const accessContent = await page.textContent('body');
  console.log('Draft access page content:');
  console.log(accessContent.replace(/\s+/g, ' ').substring(0, 300) + '...');
  
  // Test with various token formats
  const tokenInput = await page.locator('input').first();
  if (await tokenInput.isVisible()) {
    const testTokens = ['ABC123', '12345', 'draft123', 'test-token'];
    
    for (const token of testTokens) {
      await tokenInput.fill(token);
      console.log(`Tested token format: "${token}"`);
      await page.waitForTimeout(500);
      
      // Check for any validation messages
      const errorMessage = await page.locator('.error, .invalid, [class*="error"]').textContent().catch(() => '');
      if (errorMessage) {
        console.log(`  Error message: "${errorMessage}"`);
      }
    }
  }
  
  // Step 5: Sign-in analysis
  console.log('👤 Step 5: Sign-in process analysis...');
  await page.goto('https://exfang.fly.dev/');
  await page.waitForTimeout(1000);
  
  await page.click('button:has-text("Sign in")');
  await page.waitForLoadState('networkidle');
  
  const signInContent = await page.textContent('body');
  console.log('Sign-in page content:');
  console.log(signInContent.replace(/\s+/g, ' ').substring(0, 400) + '...');
  
  // Look for any authentication providers or methods
  const authElements = await page.locator('button, a, [class*="auth"], [class*="login"]').all();
  console.log(`Found ${authElements.length} potential auth-related elements`);
  
  for (let i = 0; i < Math.min(authElements.length, 5); i++) {
    const text = await authElements[i].textContent().catch(() => '');
    const href = await authElements[i].getAttribute('href').catch(() => '');
    const isVisible = await authElements[i].isVisible().catch(() => false);
    
    if (isVisible && (text.trim() || href)) {
      console.log(`  Auth element ${i+1}: "${text.trim()}" (href: ${href})`);
    }
  }
  
  // Step 6: Check for any additional routes or features
  console.log('🔍 Step 6: Exploring additional routes...');
  
  const testRoutes = [
    '/about',
    '/help',
    '/docs',
    '/profile',
    '/settings',
    '/dashboard',
    '/drafts',
    '/tournaments'
  ];
  
  for (const route of testRoutes) {
    try {
      const testResponse = await page.request.get(`https://exfang.fly.dev${route}`);
      if (testResponse.status() < 400) {
        console.log(`✅ Route exists: ${route} (${testResponse.status()})`);
      }
    } catch (error) {
      // Route doesn't exist or error, skip
    }
  }
  
  console.log('✅ Detailed workflow analysis complete');
});