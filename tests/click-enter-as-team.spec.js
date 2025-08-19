const { test, expect } = require('@playwright/test');

test('Click "Enter as..." Team Button', async ({ page }) => {
  console.log('🎯 Clicking "Enter as..." team button...');
  
  // Login as admin
  const loginResponse = await page.request.post('http://localhost:3001/api/test-auth/login-test-admin');
  const loginData = await loginResponse.json();
  console.log(`Admin login success: ${loginData.success}`);
  
  // Navigate to tournament and go to Drafts tab
  await page.goto('http://localhost:3000/tournaments/67e81a0d-1165-4481-ad58-85da372f86d5');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
  
  // Click Drafts tab
  console.log('📋 Clicking Drafts tab...');
  const draftsTab = await page.locator('button:has-text("Drafts")').first();
  await draftsTab.click();
  await page.waitForTimeout(2000);
  
  // Find "Enter as..." buttons
  const enterAsButtons = await page.locator('button:has-text("Enter as")').all();
  console.log(`Found ${enterAsButtons.length} "Enter as..." buttons`);
  
  if (enterAsButtons.length > 0) {
    // Click the first "Enter as..." button
    const firstButton = enterAsButtons[0];
    const buttonText = await firstButton.textContent();
    console.log(`🎯 Clicking: "${buttonText}"`);
    
    await firstButton.click();
    await page.waitForTimeout(3000);
    
    const afterClickUrl = page.url();
    console.log(`After click URL: ${afterClickUrl}`);
    
    // Check if we navigated to a draft page
    if (afterClickUrl.includes('/draft/')) {
      console.log('✅ Successfully navigated to draft page!');
      
      // Check what's on the draft page
      const draftElements = await page.locator('text=/coin toss|draft|pick|ban|phase/i').all();
      console.log(`Found ${draftElements.length} draft-related elements`);
      
      // Look for team names or captain info
      const teamInfo = await page.locator('text=/team|captain|Team|Captain/i').all();
      console.log(`Found ${teamInfo.length} team/captain related elements`);
      
      for (let i = 0; i < Math.min(teamInfo.length, 3); i++) {
        const info = teamInfo[i];
        const text = await info.textContent();
        console.log(`  Team info ${i + 1}: "${text?.trim()}"`);
      }
      
    } else {
      console.log(`❌ Did not navigate to draft page. Current URL: ${afterClickUrl}`);
      
      // Check for error messages or modals
      const errorElements = await page.locator('text=/error|Error|failed|Failed/i').all();
      console.log(`Found ${errorElements.length} error messages`);
      
      for (const error of errorElements) {
        const errorText = await error.textContent();
        console.log(`  Error: "${errorText?.trim()}"`);
      }
      
      // Check for any modal or popup
      const modal = await page.locator('.modal, [role="dialog"]').first();
      const modalVisible = await modal.isVisible();
      console.log(`Modal opened: ${modalVisible}`);
      
      if (modalVisible) {
        const modalText = await modal.textContent();
        console.log(`Modal content: "${modalText?.substring(0, 200)}..."`);
      }
    }
  } else {
    console.log('❌ No "Enter as..." buttons found in Drafts tab');
  }
  
  console.log('✅ "Enter as..." button click test completed');
});