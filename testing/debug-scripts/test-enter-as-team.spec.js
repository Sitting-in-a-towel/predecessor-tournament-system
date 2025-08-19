const { test, expect } = require('@playwright/test');

test('Test "Enter as..." Team Buttons', async ({ page }) => {
  console.log('🎯 Testing "Enter as..." team buttons...');
  
  // Login as admin first
  console.log('🔑 Logging in as admin...');
  const loginResponse = await page.request.post('http://localhost:3001/api/test-auth/login-test-admin');
  const loginData = await loginResponse.json();
  console.log(`Admin login success: ${loginData.success}`);
  
  if (!loginData.success) {
    console.log('❌ Failed to login as admin');
    return;
  }
  
  // Navigate to specific tournament
  console.log('🏆 Navigating to tournament...');
  await page.goto('http://localhost:3000/tournaments/67e81a0d-1165-4481-ad58-85da372f86d5');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  
  const currentUrl = page.url();
  console.log(`Current URL: ${currentUrl}`);
  
  // Look for "Enter as..." buttons
  console.log('🔍 Looking for "Enter as..." buttons...');
  
  const enterAsButtons = await page.locator('button:has-text("enter as"), button:has-text("Enter as"), button[title*="enter as" i], button[aria-label*="enter as" i]').all();
  console.log(`Found ${enterAsButtons.length} "Enter as..." buttons`);
  
  if (enterAsButtons.length === 0) {
    // Search for any buttons containing "enter" or team names
    console.log('No "Enter as..." buttons found. Searching for any buttons with "enter"...');
    
    const enterButtons = await page.locator('button:has-text("enter"), button:has-text("Enter")').all();
    console.log(`Found ${enterButtons.length} buttons containing "enter"`);
    
    for (const button of enterButtons) {
      const buttonText = await button.textContent();
      const isVisible = await button.isVisible();
      console.log(`  Button: "${buttonText?.trim()}" - visible: ${isVisible}`);
    }
    
    // Look for any team-related buttons
    console.log('Searching for team-related buttons...');
    const teamButtons = await page.locator('button:has-text("team"), button:has-text("Team")').all();
    console.log(`Found ${teamButtons.length} team-related buttons`);
    
    for (const button of teamButtons) {
      const buttonText = await button.textContent();
      const isVisible = await button.isVisible();
      console.log(`  Team button: "${buttonText?.trim()}" - visible: ${isVisible}`);
    }
    
    // Check all buttons on the page
    console.log('Checking ALL buttons on the page...');
    const allButtons = await page.locator('button').all();
    console.log(`Found ${allButtons.length} total buttons`);
    
    for (const button of allButtons) {
      const buttonText = await button.textContent();
      const isVisible = await button.isVisible();
      console.log(`  Button: "${buttonText?.trim()}" - visible: ${isVisible}`);
    }
    
    // Check different tabs that might contain these buttons
    console.log('Checking different tabs...');
    const tabs = await page.locator('.tab, .tournament-tabs button, button[role="tab"]').all();
    console.log(`Found ${tabs.length} tabs`);
    
    for (const tab of tabs) {
      const tabText = await tab.textContent();
      const isActive = (await tab.getAttribute('class') || '').includes('active');
      console.log(`  Tab: "${tabText?.trim()}" - active: ${isActive}`);
      
      if (!isActive) {
        console.log(`    Clicking tab "${tabText?.trim()}" to check for "Enter as..." buttons...`);
        try {
          await tab.click();
          await page.waitForTimeout(1000);
          
          // Look for "Enter as..." buttons in this tab
          const tabEnterButtons = await page.locator('button:has-text("enter as"), button:has-text("Enter as")').all();
          console.log(`    Found ${tabEnterButtons.length} "Enter as..." buttons in "${tabText?.trim()}" tab`);
          
          if (tabEnterButtons.length > 0) {
            for (const button of tabEnterButtons) {
              const buttonText = await button.textContent();
              const isVisible = await button.isVisible();
              console.log(`      "Enter as..." button: "${buttonText?.trim()}" - visible: ${isVisible}`);
            }
            break; // Found them, stop looking
          }
        } catch (error) {
          console.log(`    Failed to click tab: ${error.message}`);
        }
      }
    }
  } else {
    // Found "Enter as..." buttons, test them
    console.log(`✅ Found ${enterAsButtons.length} "Enter as..." buttons`);
    
    for (let i = 0; i < enterAsButtons.length; i++) {
      const button = enterAsButtons[i];
      const buttonText = await button.textContent();
      const isVisible = await button.isVisible();
      const isEnabled = await button.isEnabled();
      
      console.log(`Button ${i + 1}: "${buttonText?.trim()}" - visible: ${isVisible}, enabled: ${isEnabled}`);
      
      if (isVisible && isEnabled && i === 0) { // Only test the first one
        try {
          console.log(`🎯 Clicking first "Enter as..." button: "${buttonText?.trim()}"`);
          await button.click();
          await page.waitForTimeout(2000);
          
          const afterClickUrl = page.url();
          console.log(`After click URL: ${afterClickUrl}`);
          
          // Check if we navigated somewhere or if something happened
          if (afterClickUrl !== currentUrl) {
            console.log('✅ Navigation occurred after clicking "Enter as..." button');
          } else {
            console.log('ℹ️  No navigation, checking for other changes...');
            
            // Check for modals, messages, or other UI changes
            const modal = await page.locator('.modal, [role="dialog"]').first();
            const modalVisible = await modal.isVisible();
            console.log(`Modal opened: ${modalVisible}`);
            
            // Check for success/error messages
            const messages = await page.locator('text=/success|error|entered|Error/i').all();
            console.log(`Found ${messages.length} response messages`);
            
            for (const msg of messages.slice(0, 3)) {
              const msgText = await msg.textContent();
              console.log(`  Message: "${msgText?.trim()}"`);
            }
          }
        } catch (error) {
          console.log(`❌ Failed to click "Enter as..." button: ${error.message}`);
        }
      }
    }
  }
  
  console.log('✅ "Enter as..." button testing completed');
});