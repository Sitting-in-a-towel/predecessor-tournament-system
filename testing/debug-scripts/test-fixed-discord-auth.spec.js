const { test, expect } = require('@playwright/test');

test('Test Fixed Discord OAuth and Tournament Registration', async ({ page }) => {
  console.log('🔧 Testing Fixed Discord OAuth Flow...');
  
  await page.goto('http://localhost:3000');
  await page.waitForLoadState('networkidle');
  
  // Find Discord login button in header
  const headerLoginButton = await page.locator('header button:has-text("Login with Discord"), header .login-btn').first();
  
  if (await headerLoginButton.isVisible()) {
    console.log('✅ Found Discord login button in header');
    
    // Check if it's now a button (not link)
    const tagName = await headerLoginButton.evaluate(el => el.tagName);
    console.log(`Login element type: ${tagName}`);
    
    if (tagName === 'BUTTON') {
      console.log('✅ Login is now a button (should trigger OAuth directly)');
    } else {
      console.log('❌ Login is still a link (not fixed)');
    }
  }
  
  console.log('\n🏆 Testing Tournament Registration Issues...');
  
  // Navigate to tournaments
  await page.goto('/tournaments');
  await page.waitForLoadState('networkidle');
  
  const tournaments = await page.locator('.tournament-card, .tournament-item, a[href*="/tournaments/"]').all();
  console.log(`Found ${tournaments.length} tournaments`);
  
  if (tournaments.length > 0) {
    // Click on first tournament
    await tournaments[0].click();
    await page.waitForLoadState('networkidle');
    
    const currentUrl = page.url();
    console.log(`Tournament detail URL: ${currentUrl}`);
    
    // Look specifically for registration functionality
    console.log('Searching for registration elements...');
    
    // Check for different types of registration buttons
    const allButtons = await page.locator('button').all();
    console.log(`Found ${allButtons.length} total buttons on tournament page`);
    
    let registrationButtons = [];
    for (const button of allButtons) {
      const text = await button.textContent();
      const isVisible = await button.isVisible();
      const classes = await button.getAttribute('class');
      
      if (text && text.toLowerCase().includes('regist')) {
        registrationButtons.push({
          text: text.trim(),
          visible: isVisible,
          classes: classes
        });
      }
    }
    
    console.log(`Found ${registrationButtons.length} registration-related buttons:`);
    for (const btn of registrationButtons) {
      console.log(`  "${btn.text}" - visible: ${btn.visible} - classes: ${btn.classes}`);
    }
    
    // Check if we're on the overview tab (might need to look at other tabs)
    const tabs = await page.locator('.tab, .tournament-tabs button').all();
    console.log(`Found ${tabs.length} tabs on tournament detail`);
    
    for (const tab of tabs) {
      const tabText = await tab.textContent();
      const isActive = (await tab.getAttribute('class') || '').includes('active');
      console.log(`  Tab: "${tabText?.trim()}" - active: ${isActive}`);
      
      if (tabText?.toLowerCase().includes('overview') || isActive) {
        // This is the overview tab, registration should be here
        console.log('  Checking overview tab for registration...');
        
        // Look for registration section
        const registrationSections = await page.locator('text=/registration|register|join/i').all();
        console.log(`    Found ${registrationSections.length} registration-related elements`);
        
        for (let i = 0; i < Math.min(registrationSections.length, 3); i++) {
          const section = registrationSections[i];
          const sectionText = await section.textContent();
          console.log(`    Registration element ${i + 1}: "${sectionText?.trim().substring(0, 50)}..."`);
        }
      }
    }
    
    // Check if authentication is required for registration
    console.log('\nTesting registration without authentication...');
    
    const registerButton = await page.locator('button:has-text("Register"), button:has-text("Join")').first();
    if (await registerButton.isVisible()) {
      try {
        await registerButton.click();
        await page.waitForTimeout(2000);
        
        // Check what happens
        const afterClickUrl = page.url();
        console.log(`After registration click: ${afterClickUrl}`);
        
        // Check for modals
        const modals = await page.locator('.modal, [role="dialog"], .modal-overlay').all();
        let modalFound = false;
        for (const modal of modals) {
          if (await modal.isVisible()) {
            modalFound = true;
            console.log('✅ Registration modal opened');
            
            // Check modal content
            const modalText = await modal.textContent();
            console.log(`Modal content preview: "${modalText?.substring(0, 100)}..."`);
            
            // Look for form fields
            const formFields = await modal.locator('input, select, textarea').all();
            console.log(`Found ${formFields.length} form fields in modal`);
            
            // Look for team selection
            const teamElements = await modal.locator('text=/team|Team|select/i').all();
            console.log(`Found ${teamElements.length} team-related elements in modal`);
            
            break;
          }
        }
        
        if (!modalFound) {
          console.log('❌ Registration modal did not open');
          
          // Check for error messages or redirects
          const errorElements = await page.locator('text=/error|Error|login|Login|auth/i').all();
          console.log(`Found ${errorElements.length} error/auth related messages`);
          
          for (const error of errorElements.slice(0, 2)) {
            const errorText = await error.textContent();
            console.log(`  Message: "${errorText?.trim()}"`);
          }
        }
      } catch (error) {
        console.log(`Registration button click failed: ${error.message}`);
      }
    }
  }
  
  console.log('\n✅ Discord OAuth and Tournament Registration testing completed');
});