const { test, expect } = require('@playwright/test');

test('Exfang Information Gathering', async ({ page }) => {
  console.log('📊 Gathering comprehensive information about Exfang...');
  
  // Step 1: Homepage analysis
  console.log('🏠 Step 1: Homepage analysis...');
  await page.goto('https://exfang.fly.dev/');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: 'exfang-homepage-analysis.png', fullPage: true });
  
  const homeContent = await page.textContent('body');
  console.log('=== HOMEPAGE CONTENT ===');
  console.log(homeContent);
  
  // Step 2: Draft creation page
  console.log('🆕 Step 2: Draft creation page analysis...');
  await page.click('button:has-text("New draft")');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: 'exfang-draft-creation.png', fullPage: true });
  
  const draftContent = await page.textContent('body');
  console.log('=== DRAFT CREATION CONTENT ===');
  console.log(draftContent);
  
  // Get HTML structure for better understanding
  const formHTML = await page.locator('form, .form, [class*="form"]').innerHTML().catch(() => 'No form found');
  console.log('=== FORM HTML STRUCTURE ===');
  console.log(formHTML);
  
  // Analyze all form elements without clicking
  const allInputs = await page.locator('input, select, textarea, button').all();
  console.log('=== ALL FORM ELEMENTS ===');
  
  for (let i = 0; i < allInputs.length; i++) {
    const element = allInputs[i];
    const tagName = await element.evaluate(el => el.tagName);
    const type = await element.getAttribute('type').catch(() => 'N/A');
    const name = await element.getAttribute('name').catch(() => 'N/A');
    const id = await element.getAttribute('id').catch(() => 'N/A');
    const placeholder = await element.getAttribute('placeholder').catch(() => 'N/A');
    const value = await element.getAttribute('value').catch(() => 'N/A');
    const className = await element.getAttribute('class').catch(() => 'N/A');
    const text = await element.textContent().catch(() => 'N/A');
    const isVisible = await element.isVisible().catch(() => false);
    
    console.log(`Element ${i+1}:`);
    console.log(`  Tag: ${tagName}, Type: ${type}, Name: ${name}, ID: ${id}`);
    console.log(`  Placeholder: ${placeholder}, Value: ${value}`);
    console.log(`  Class: ${className}`);
    console.log(`  Text: ${text.replace(/\\s+/g, ' ').trim().substring(0, 50)}`);
    console.log(`  Visible: ${isVisible}`);
    console.log('---');
  }
  
  // Step 3: Draft access page
  console.log('🔑 Step 3: Draft access page...');
  await page.goto('https://exfang.fly.dev/');
  await page.waitForTimeout(1000);
  await page.click('button:has-text("Draft access")');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: 'exfang-draft-access.png', fullPage: true });
  
  const accessContent = await page.textContent('body');
  console.log('=== DRAFT ACCESS CONTENT ===');
  console.log(accessContent);
  
  // Step 4: Sign-in page
  console.log('👤 Step 4: Sign-in page...');
  await page.goto('https://exfang.fly.dev/');
  await page.waitForTimeout(1000);
  await page.click('button:has-text("Sign in")');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: 'exfang-sign-in.png', fullPage: true });
  
  const signInContent = await page.textContent('body');
  console.log('=== SIGN-IN CONTENT ===');
  console.log(signInContent);
  
  // Step 5: Network and API analysis
  console.log('🌐 Step 5: Network analysis...');
  
  const responsePromises = [];
  
  // Go back to draft creation and try to submit to see what happens
  await page.goto('https://exfang.fly.dev/drafts/new');
  await page.waitForLoadState('networkidle');
  
  // Fill out some basic information
  try {
    const team1Input = page.locator('input[placeholder="Dawn"]');
    if (await team1Input.isVisible()) {
      await team1Input.fill('Team Alpha');
      console.log('✅ Filled Team 1 name');
    }
    
    const team2Input = page.locator('input[placeholder="Dusk"]');
    if (await team2Input.isVisible()) {
      await team2Input.fill('Team Beta');
      console.log('✅ Filled Team 2 name');
    }
  } catch (error) {
    console.log('ℹ️ Could not fill team names');
  }
  
  // Try to submit and see what network requests happen
  console.log('🚀 Attempting to submit draft...');
  
  const submitButton = page.locator('button:has-text("Submit")');
  if (await submitButton.isVisible()) {
    // Listen for network requests
    const networkLog = [];
    page.on('response', response => {
      if (response.url().includes('exfang.fly.dev')) {
        networkLog.push(`${response.status()} ${response.request().method()} ${response.url()}`);
      }
    });
    
    try {
      await submitButton.click();
      await page.waitForTimeout(3000);
      
      console.log('Network requests after submit:');
      networkLog.forEach(req => console.log(`  ${req}`));
      
      const newUrl = page.url();
      console.log(`URL after submit: ${newUrl}`);
      
      const postSubmitContent = await page.textContent('body');
      console.log('=== POST-SUBMIT CONTENT ===');
      console.log(postSubmitContent);
      
      await page.screenshot({ path: 'exfang-post-submit.png', fullPage: true });
      
    } catch (error) {
      console.log(`Submit failed: ${error.message}`);
    }
  }
  
  console.log('✅ Comprehensive information gathering complete!');
});