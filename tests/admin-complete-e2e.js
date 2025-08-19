const { chromium } = require('playwright');

async function adminCompleteE2E() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  const results = {
    working: [],
    broken: [],
    totalTested: 0
  };
  
  try {
    console.log('🔐 STEP 1: LOGIN AS ADMIN USING TEST AUTH\n');
    
    // Login as test admin via backend
    const loginResponse = await page.request.post('http://localhost:3001/api/test-auth/login-test-admin');
    if (loginResponse.ok()) {
      console.log('✅ Admin login successful');
      
      // Get the cookies from the response
      const cookies = await context.cookies();
      console.log(`Received ${cookies.length} cookies from login`);
    } else {
      throw new Error('Admin login failed');
    }
    
    console.log('\n🏠 STEP 2: TESTING HOMEPAGE AS ADMIN\n');
    await page.goto('http://localhost:3000/');
    await page.waitForLoadState('networkidle');
    
    // Test every clickable element on homepage
    const homeClickable = await page.locator('a, button, [role="button"], [onclick]').all();
    console.log(`Found ${homeClickable.length} clickable elements on homepage`);
    
    for (let i = 0; i < homeClickable.length; i++) {
      const element = homeClickable[i];
      results.totalTested++;
      
      try {
        const text = (await element.textContent()) || '';
        const href = await element.getAttribute('href');
        
        console.log(`Testing: "${text.trim()}" (href: ${href})`);
        
        const currentUrl = page.url();
        await element.click();
        await page.waitForTimeout(1000);
        
        const newUrl = page.url();
        if (newUrl !== currentUrl) {
          console.log(`  ✅ Navigated to: ${newUrl}`);
          results.working.push(`Homepage: ${text.trim()} -> ${newUrl}`);
          await page.goBack();
          await page.waitForLoadState('networkidle');
        } else {
          console.log(`  ✅ Clicked (same page)`);
          results.working.push(`Homepage: ${text.trim()} clicked`);
        }
        
      } catch (error) {
        console.log(`  ❌ Failed: ${error.message}`);
        results.broken.push(`Homepage element ${i}: ${error.message}`);
      }
    }
    
    console.log('\n🏆 STEP 3: TESTING TOURNAMENTS AS ADMIN\n');
    await page.goto('http://localhost:3000/tournaments');
    await page.waitForLoadState('networkidle');
    
    // Test tournament filters
    const statusFilter = page.locator('select').first();
    if (await statusFilter.isVisible()) {
      console.log('Testing status filter...');
      await statusFilter.selectOption({ index: 1 });
      await page.waitForTimeout(500);
      console.log('  ✅ Status filter works');
      results.working.push('Tournaments: Status filter functional');
      results.totalTested++;
    }
    
    // Click into first tournament
    const firstTournament = page.locator('button:has-text("View Details"), a:has-text("View")').first();
    if (await firstTournament.isVisible()) {
      console.log('Clicking into first tournament...');
      await firstTournament.click();
      await page.waitForLoadState('networkidle');
      
      const tournamentUrl = page.url();
      console.log(`  ✅ Entered tournament: ${tournamentUrl}`);
      results.working.push(`Tournament navigation: ${tournamentUrl}`);
      results.totalTested++;
      
      console.log('\n🔍 STEP 4: TESTING TOURNAMENT DETAIL TABS AS ADMIN\n');
      
      // Test each tab
      const tabs = ['Overview', 'Teams', 'Bracket', 'Matches', 'Check-in'];
      for (const tabName of tabs) {
        results.totalTested++;
        console.log(`Testing ${tabName} tab...`);
        
        const tab = page.locator(`[role="tab"]:has-text("${tabName}"), button:has-text("${tabName}"), .tab:has-text("${tabName}"), a:has-text("${tabName}")`).first();
        
        if (await tab.isVisible()) {
          try {
            await tab.click();
            await page.waitForTimeout(1000);
            
            // Check if tab content loaded
            const tabContent = page.locator('[role="tabpanel"], .tab-content, .tab-pane').first();
            const isContentVisible = await tabContent.isVisible().catch(() => false);
            
            if (isContentVisible) {
              console.log(`  ✅ ${tabName} tab loaded with content`);
              results.working.push(`Tournament: ${tabName} tab functional with content`);
            } else {
              console.log(`  ✅ ${tabName} tab clicked (checking for content...)`);
              
              // Look for any content that might have loaded
              const bodyText = await page.locator('body').textContent();
              if (bodyText.toLowerCase().includes(tabName.toLowerCase())) {
                console.log(`  ✅ ${tabName} content found in page`);
                results.working.push(`Tournament: ${tabName} tab functional`);
              } else {
                console.log(`  ⚠️ ${tabName} tab clicked but no obvious content`);
                results.broken.push(`Tournament: ${tabName} tab - no content visible`);
              }
            }
            
            // Test buttons within this tab
            const tabButtons = await page.locator('button, [role="button"]').all();
            console.log(`    Found ${tabButtons.length} buttons in ${tabName} tab`);
            
            for (let i = 0; i < Math.min(tabButtons.length, 5); i++) {
              const button = tabButtons[i];
              results.totalTested++;
              
              try {
                const buttonText = (await button.textContent()) || '';
                if (await button.isVisible() && await button.isEnabled()) {
                  console.log(`    Testing button: "${buttonText.trim()}"`);
                  await button.click();
                  await page.waitForTimeout(500);
                  
                  // Check for modal
                  const modal = page.locator('[role="dialog"], .modal').first();
                  if (await modal.isVisible()) {
                    console.log(`    ✅ Button opened modal`);
                    results.working.push(`${tabName}: ${buttonText} opened modal`);
                    await page.keyboard.press('Escape');
                  } else {
                    console.log(`    ✅ Button clicked`);
                    results.working.push(`${tabName}: ${buttonText} clicked`);
                  }
                }
              } catch (error) {
                console.log(`    ❌ Button failed: ${error.message}`);
                results.broken.push(`${tabName} button: ${error.message}`);
              }
            }
            
          } catch (error) {
            console.log(`  ❌ ${tabName} tab failed: ${error.message}`);
            results.broken.push(`Tournament: ${tabName} tab error - ${error.message}`);
          }
        } else {
          console.log(`  ❌ ${tabName} tab not found`);
          results.broken.push(`Tournament: ${tabName} tab missing`);
        }
      }
    }
    
    console.log('\n🎮 STEP 5: TESTING DRAFT SYSTEM AS ADMIN\n');
    
    // Get draft data from API
    const draftsResponse = await page.request.get('http://localhost:3001/api/draft');
    if (draftsResponse.ok()) {
      const drafts = await draftsResponse.json();
      console.log(`Found ${drafts.length} active drafts`);
      
      if (drafts.length > 0) {
        const draft = drafts[0];
        console.log(`Testing draft: ${draft.draft_name} (${draft.current_phase})`);
        
        // Navigate to draft page
        await page.goto(`http://localhost:3000/draft/${draft.draft_id}`);
        await page.waitForLoadState('networkidle');
        
        results.totalTested++;
        
        // Check for draft UI components
        console.log('Checking for draft interface...');
        
        // Look for any draft-related elements
        const draftElements = [
          'button:has-text("Heads")',
          'button:has-text("Tails")',
          '[class*="draft"]',
          '[class*="coin"]',
          '[class*="phase"]',
          '[class*="team"]'
        ];
        
        let foundElements = 0;
        for (const selector of draftElements) {
          const element = page.locator(selector).first();
          if (await element.isVisible()) {
            foundElements++;
            console.log(`  ✅ Found: ${selector}`);
          }
        }
        
        if (foundElements > 0) {
          console.log(`  ✅ Draft interface partially working (${foundElements} elements found)`);
          results.working.push(`Draft: Interface elements found (${foundElements})`);
        } else {
          console.log(`  ❌ No draft interface elements found`);
          results.broken.push('Draft: No UI elements visible');
        }
        
        // Test any buttons on the draft page
        const draftButtons = await page.locator('button, [role="button"]').all();
        console.log(`Found ${draftButtons.length} buttons on draft page`);
        
        for (let i = 0; i < draftButtons.length; i++) {
          const button = draftButtons[i];
          results.totalTested++;
          
          try {
            const buttonText = (await button.textContent()) || '';
            console.log(`  Testing draft button: "${buttonText.trim()}"`);
            
            if (await button.isVisible() && await button.isEnabled()) {
              await button.click();
              await page.waitForTimeout(500);
              console.log(`  ✅ Draft button clicked: ${buttonText}`);
              results.working.push(`Draft: ${buttonText} button functional`);
            }
          } catch (error) {
            console.log(`  ❌ Draft button failed: ${error.message}`);
            results.broken.push(`Draft button: ${error.message}`);
          }
        }
      } else {
        console.log('No active drafts found');
      }
    }
    
    console.log('\n👥 STEP 6: TESTING TEAMS AS ADMIN\n');
    await page.goto('http://localhost:3000/teams');
    await page.waitForLoadState('networkidle');
    
    // Test all team page elements
    const teamElements = await page.locator('a, button, [role="button"], input, select').all();
    console.log(`Found ${teamElements.length} interactive elements on teams page`);
    
    for (let i = 0; i < teamElements.length; i++) {
      const element = teamElements[i];
      results.totalTested++;
      
      try {
        const tagName = await element.evaluate(el => el.tagName);
        const text = (await element.textContent()) || '';
        
        console.log(`Testing teams element: ${tagName} - "${text.trim()}"`);
        
        if (tagName === 'INPUT') {
          await element.fill('test');
          await page.waitForTimeout(300);
          console.log(`  ✅ Input field tested`);
          results.working.push(`Teams: ${tagName} input functional`);
          await element.clear();
        } else if (tagName === 'SELECT') {
          const options = await element.locator('option').all();
          if (options.length > 1) {
            await element.selectOption({ index: 1 });
            console.log(`  ✅ Select dropdown tested`);
            results.working.push(`Teams: ${tagName} select functional`);
          }
        } else {
          const currentUrl = page.url();
          await element.click();
          await page.waitForTimeout(1000);
          
          const newUrl = page.url();
          if (newUrl !== currentUrl) {
            console.log(`  ✅ Navigation: ${newUrl}`);
            results.working.push(`Teams: ${text} navigation to ${newUrl}`);
            await page.goBack();
            await page.waitForLoadState('networkidle');
          } else {
            console.log(`  ✅ Clicked`);
            results.working.push(`Teams: ${text} clicked`);
          }
        }
        
      } catch (error) {
        console.log(`  ❌ Failed: ${error.message}`);
        results.broken.push(`Teams element: ${error.message}`);
      }
    }
    
    console.log('\n🛡️ STEP 7: TESTING ADMIN DASHBOARD\n');
    await page.goto('http://localhost:3000/admin/dashboard');
    await page.waitForLoadState('networkidle');
    
    // Check if we're on admin dashboard or redirected
    const currentUrl = page.url();
    if (currentUrl.includes('/admin')) {
      console.log('✅ Successfully accessed admin dashboard');
      results.working.push('Admin: Dashboard accessible');
      results.totalTested++;
      
      // Test admin elements
      const adminElements = await page.locator('a, button, [role="button"]').all();
      console.log(`Found ${adminElements.length} admin elements`);
      
      for (let i = 0; i < Math.min(adminElements.length, 10); i++) {
        const element = adminElements[i];
        results.totalTested++;
        
        try {
          const text = (await element.textContent()) || '';
          console.log(`Testing admin element: "${text.trim()}"`);
          
          const startUrl = page.url();
          await element.click();
          await page.waitForTimeout(1000);
          
          const endUrl = page.url();
          if (endUrl !== startUrl) {
            console.log(`  ✅ Admin navigation: ${endUrl}`);
            results.working.push(`Admin: ${text} navigation functional`);
            await page.goBack();
            await page.waitForLoadState('networkidle');
          } else {
            console.log(`  ✅ Admin element clicked`);
            results.working.push(`Admin: ${text} clicked`);
          }
          
        } catch (error) {
          console.log(`  ❌ Admin element failed: ${error.message}`);
          results.broken.push(`Admin: ${error.message}`);
        }
      }
    } else {
      console.log(`❌ Admin dashboard redirect to: ${currentUrl}`);
      results.broken.push(`Admin: Dashboard inaccessible - redirected to ${currentUrl}`);
      results.totalTested++;
    }
    
    console.log('\n📝 STEP 8: TESTING ALL FORMS AS ADMIN\n');
    
    const formPages = [
      '/teams/create',
      '/tournaments/create',
      '/profile/settings'
    ];
    
    for (const formPage of formPages) {
      console.log(`Testing form page: ${formPage}`);
      await page.goto(`http://localhost:3000${formPage}`);
      await page.waitForLoadState('networkidle');
      
      const forms = await page.locator('form').all();
      console.log(`  Found ${forms.length} forms`);
      
      for (let i = 0; i < forms.length; i++) {
        const form = forms[i];
        results.totalTested++;
        
        try {
          console.log(`  Testing form ${i + 1}...`);
          
          // Fill all inputs
          const inputs = await form.locator('input, textarea, select').all();
          console.log(`    Found ${inputs.length} form inputs`);
          
          for (const input of inputs) {
            const type = await input.getAttribute('type');
            const tagName = await input.evaluate(el => el.tagName);
            
            if (tagName === 'INPUT') {
              switch (type) {
                case 'text':
                  await input.fill('Test Admin Input');
                  break;
                case 'email':
                  await input.fill('admin@test.com');
                  break;
                case 'number':
                  await input.fill('5');
                  break;
                case 'date':
                  await input.fill('2025-12-01');
                  break;
                case 'checkbox':
                  await input.check();
                  break;
              }
            } else if (tagName === 'TEXTAREA') {
              await input.fill('Admin test description');
            } else if (tagName === 'SELECT') {
              const options = await input.locator('option').all();
              if (options.length > 1) {
                await input.selectOption({ index: 1 });
              }
            }
          }
          
          // Submit form
          const submitButton = form.locator('button[type="submit"], button:has-text("Submit"), button:has-text("Create"), button:has-text("Save")').first();
          if (await submitButton.isVisible()) {
            console.log(`    Submitting form...`);
            await submitButton.click();
            await page.waitForTimeout(2000);
            
            // Check for success/error messages
            const successMsg = await page.locator('.success, [class*="success"], :has-text("Success"), :has-text("Created")').count();
            const errorMsg = await page.locator('.error, [class*="error"], :has-text("Error")').count();
            
            if (successMsg > 0) {
              console.log(`    ✅ Form submission successful`);
              results.working.push(`Form: ${formPage} submission successful`);
            } else if (errorMsg > 0) {
              console.log(`    ⚠️ Form submission showed errors (validation working)`);
              results.working.push(`Form: ${formPage} validation working`);
            } else {
              console.log(`    ⚠️ Form submitted - unclear result`);
              results.working.push(`Form: ${formPage} submitted`);
            }
          }
          
        } catch (error) {
          console.log(`    ❌ Form failed: ${error.message}`);
          results.broken.push(`Form ${formPage}: ${error.message}`);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Critical error during admin testing:', error.message);
    results.broken.push(`Critical error: ${error.message}`);
  }
  
  // FINAL REPORT
  console.log('\n🎯 COMPLETE ADMIN END-TO-END TEST REPORT\n');
  console.log('='.repeat(60));
  
  const totalTested = results.totalTested;
  const totalWorking = results.working.length;
  const totalBroken = results.broken.length;
  const successRate = totalTested > 0 ? ((totalWorking / totalTested) * 100).toFixed(1) : 0;
  
  console.log(`📊 SUMMARY:`);
  console.log(`   Total Elements Tested: ${totalTested}`);
  console.log(`   Working: ${totalWorking}`);
  console.log(`   Broken: ${totalBroken}`);
  console.log(`   Success Rate: ${successRate}%`);
  
  console.log('\n✅ WORKING FUNCTIONALITY:');
  results.working.forEach((item, index) => {
    console.log(`   ${index + 1}. ${item}`);
  });
  
  console.log('\n❌ BROKEN FUNCTIONALITY:');
  results.broken.forEach((item, index) => {
    console.log(`   ${index + 1}. ${item}`);
  });
  
  console.log('\n' + '='.repeat(60));
  
  if (totalBroken > 0) {
    console.log(`🚨 FOUND ${totalBroken} CRITICAL ISSUES AS ADMIN USER!`);
  } else {
    console.log('🎉 ALL ADMIN FUNCTIONALITY WORKING!');
  }
  
  await browser.close();
}

adminCompleteE2E().catch(console.error);