const { test, expect } = require('@playwright/test');

test.describe('Complete Website Testing', () => {
  let context;
  let adminPage;
  let userPage;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext({
      baseURL: 'http://localhost:3000'
    });
  });

  test.afterAll(async () => {
    await context.close();
  });

  test('Complete Admin User Testing', async () => {
    adminPage = await context.newPage();
    
    // Log in as admin using API request instead of page navigation
    console.log('🔑 Logging in as admin...');
    const loginResponse = await adminPage.request.post('http://localhost:3001/api/test-auth/login-test-admin');
    expect(loginResponse.ok()).toBeTruthy();
    const loginData = await loginResponse.json();
    expect(loginData.success).toBeTruthy();
    
    // Navigate to main site
    await adminPage.goto('/');
    await adminPage.waitForLoadState('networkidle');
    
    console.log('🏠 Testing Home Page...');
    await expect(adminPage.locator('h1')).toBeVisible();
    
    // Test navigation links
    console.log('🧭 Testing Navigation Links...');
    const navLinks = await adminPage.locator('nav a, header a').all();
    for (const link of navLinks) {
      const href = await link.getAttribute('href');
      if (href && href.startsWith('/') && !href.includes('discord') && !href.includes('logout')) {
        console.log(`  Testing link: ${href}`);
        try {
          await link.click();
          await adminPage.waitForLoadState('networkidle');
          await expect(adminPage).toHaveURL(new RegExp(href));
        } catch (error) {
          console.error(`  ❌ Failed to navigate to ${href}: ${error.message}`);
        }
      }
    }
    
    // Test Admin Dashboard
    console.log('👑 Testing Admin Dashboard...');
    await adminPage.goto('/admin/dashboard');
    await adminPage.waitForLoadState('networkidle');
    
    // Check for admin dashboard content
    await expect(adminPage.locator('h1')).toBeVisible();
    
    // Test all buttons on admin dashboard
    const adminButtons = await adminPage.locator('button').all();
    for (let i = 0; i < adminButtons.length; i++) {
      const button = adminButtons[i];
      const buttonText = await button.textContent();
      console.log(`  Testing admin button: ${buttonText?.trim()}`);
      
      try {
        await button.click();
        await adminPage.waitForTimeout(1000); // Wait for any modals or actions
        
        // Check if a modal opened
        const modal = adminPage.locator('.modal, [role="dialog"]').first();
        if (await modal.isVisible()) {
          console.log('    Modal opened successfully');
          
          // Try to close modal
          const closeButton = modal.locator('button:has-text("×"), button:has-text("Close"), button:has-text("Cancel")').first();
          if (await closeButton.isVisible()) {
            await closeButton.click();
          } else {
            await adminPage.keyboard.press('Escape');
          }
        }
      } catch (error) {
        console.error(`    ❌ Button "${buttonText?.trim()}" failed: ${error.message}`);
      }
    }
    
    // Test Tournaments Page
    console.log('🏆 Testing Tournaments Page...');
    await adminPage.goto('/tournaments');
    await adminPage.waitForLoadState('networkidle');
    
    // Check for tournaments content
    const tournaments = await adminPage.locator('.tournament-card, .tournament-item').all();
    if (tournaments.length > 0) {
      console.log(`  Found ${tournaments.length} tournaments`);
      
      // Click on first tournament
      try {
        await tournaments[0].click();
        await adminPage.waitForLoadState('networkidle');
        console.log('  Successfully navigated to tournament detail');
        
        // Test tournament tabs
        const tabs = await adminPage.locator('.tab, .tournament-tabs button').all();
        for (const tab of tabs) {
          const tabText = await tab.textContent();
          console.log(`    Testing tab: ${tabText?.trim()}`);
          try {
            await tab.click();
            await adminPage.waitForTimeout(1000);
          } catch (error) {
            console.error(`    ❌ Tab "${tabText?.trim()}" failed: ${error.message}`);
          }
        }
      } catch (error) {
        console.error(`  ❌ Failed to click tournament: ${error.message}`);
      }
    } else {
      console.log('  No tournaments found');
    }
    
    // Test Teams Page
    console.log('👥 Testing Teams Page...');
    await adminPage.goto('/teams');
    await adminPage.waitForLoadState('networkidle');
    
    // Test all buttons on teams page
    const teamButtons = await adminPage.locator('button').all();
    for (const button of teamButtons) {
      const buttonText = await button.textContent();
      console.log(`  Testing teams button: ${buttonText?.trim()}`);
      try {
        await button.click();
        await adminPage.waitForTimeout(1000);
        
        // Handle any modals that might open
        const modal = adminPage.locator('.modal, [role="dialog"]').first();
        if (await modal.isVisible()) {
          const closeButton = modal.locator('button:has-text("×"), button:has-text("Close"), button:has-text("Cancel")').first();
          if (await closeButton.isVisible()) {
            await closeButton.click();
          } else {
            await adminPage.keyboard.press('Escape');
          }
        }
      } catch (error) {
        console.error(`  ❌ Teams button "${buttonText?.trim()}" failed: ${error.message}`);
      }
    }
    
    // Test Profile Page
    console.log('👤 Testing Profile Page...');
    await adminPage.goto('/profile');
    await adminPage.waitForLoadState('networkidle');
    
    // Test Draft System
    console.log('⚔️ Testing Draft System...');
    
    // First check if any drafts exist
    const response = await adminPage.request.get('http://localhost:3001/api/draft');
    const drafts = await response.json();
    
    if (drafts.length > 0) {
      const draftId = drafts[0].draft_id;
      console.log(`  Testing draft: ${draftId}`);
      
      await adminPage.goto(`/draft/${draftId}`);
      await adminPage.waitForLoadState('networkidle');
      
      // Test draft interface
      const draftButtons = await adminPage.locator('button').all();
      for (const button of draftButtons) {
        const buttonText = await button.textContent();
        console.log(`    Testing draft button: ${buttonText?.trim()}`);
        try {
          await button.click();
          await adminPage.waitForTimeout(1000);
        } catch (error) {
          console.error(`    ❌ Draft button "${buttonText?.trim()}" failed: ${error.message}`);
        }
      }
    } else {
      console.log('  No drafts found to test');
    }
    
    console.log('✅ Admin testing completed');
  });

  test('Complete Regular User Testing', async () => {
    userPage = await context.newPage();
    
    console.log('🔑 Testing as regular user (no login)...');
    
    // Test all public pages
    const publicPages = ['/', '/tournaments', '/feedback'];
    
    for (const page of publicPages) {
      console.log(`📄 Testing public page: ${page}`);
      await userPage.goto(page);
      await userPage.waitForLoadState('networkidle');
      
      // Check page loads without errors
      const errorMessages = await userPage.locator('text=/error|Error|ERROR/').all();
      if (errorMessages.length > 0) {
        console.error(`  ❌ Found error messages on ${page}`);
      }
      
      // Test all links on the page
      const pageLinks = await userPage.locator('a[href^="/"]').all();
      for (let i = 0; i < Math.min(pageLinks.length, 5); i++) { // Test first 5 links only
        const link = pageLinks[i];
        const href = await link.getAttribute('href');
        if (href && !href.includes('discord') && !href.includes('login')) {
          try {
            await link.click();
            await userPage.waitForLoadState('networkidle');
            console.log(`    ✅ Link ${href} works`);
          } catch (error) {
            console.error(`    ❌ Link ${href} failed: ${error.message}`);
          }
        }
      }
    }
    
    console.log('✅ Regular user testing completed');
  });

  test('Test All Forms and Inputs', async () => {
    adminPage = adminPage || await context.newPage();
    
    console.log('📝 Testing All Forms...');
    
    // Navigate through all pages and find forms
    const pagesToTest = ['/', '/tournaments', '/teams', '/profile', '/admin/dashboard'];
    
    for (const pagePath of pagesToTest) {
      console.log(`  Testing forms on ${pagePath}...`);
      try {
        await adminPage.goto(pagePath);
        await adminPage.waitForLoadState('networkidle');
        
        // Find all forms
        const forms = await adminPage.locator('form').all();
        for (let i = 0; i < forms.length; i++) {
          console.log(`    Testing form ${i + 1}...`);
          
          // Find all inputs in this form
          const inputs = await forms[i].locator('input, textarea, select').all();
          for (const input of inputs) {
            const inputType = await input.getAttribute('type');
            const inputName = await input.getAttribute('name');
            console.log(`      Testing input: ${inputName} (${inputType})`);
            
            // Test input based on type
            try {
              if (inputType === 'text' || inputType === 'email') {
                await input.fill('test value');
                await input.clear();
              } else if (inputType === 'checkbox') {
                await input.check();
                await input.uncheck();
              } else if (input.tagName === 'SELECT') {
                const options = await input.locator('option').all();
                if (options.length > 1) {
                  await input.selectOption({ index: 1 });
                }
              }
            } catch (error) {
              console.error(`        ❌ Input "${inputName}" failed: ${error.message}`);
            }
          }
        }
      } catch (error) {
        console.error(`  ❌ Failed to test forms on ${pagePath}: ${error.message}`);
      }
    }
    
    console.log('✅ Form testing completed');
  });
});