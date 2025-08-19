const { chromium } = require('playwright');

async function testTournamentDetails() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  const results = {
    working: [],
    broken: [],
    totalTested: 0
  };
  
  try {
    console.log('🏆 TESTING TOURNAMENT DETAIL PAGES - EVERY BUTTON, EVERY TAB, EVERY FORM\n');
    
    // Get tournament IDs from the main page
    await page.goto('http://localhost:3000/tournaments');
    await page.waitForLoadState('networkidle');
    
    // Click on first tournament
    const firstTournament = page.locator('button:has-text("View Details")').first();
    await firstTournament.click();
    await page.waitForLoadState('networkidle');
    
    const tournamentUrl = page.url();
    console.log(`📍 Testing tournament: ${tournamentUrl}\n`);
    
    // Test all tabs
    const tabs = ['Overview', 'Teams', 'Bracket', 'Matches', 'Check-in'];
    for (const tabName of tabs) {
      console.log(`🔍 Testing ${tabName} tab...`);
      results.totalTested++;
      
      try {
        const tabButton = page.locator(`[role="tab"]:has-text("${tabName}"), button:has-text("${tabName}"), a:has-text("${tabName}")`).first();
        
        if (await tabButton.isVisible()) {
          await tabButton.click();
          await page.waitForTimeout(1000);
          
          console.log(`   ✅ ${tabName} tab clicked successfully`);
          results.working.push({
            type: 'Tab Navigation',
            element: `${tabName} tab`,
            action: 'Successfully clicked and loaded',
            page: 'Tournament Details'
          });
          
          // Test buttons within each tab
          const tabContent = page.locator('[role="tabpanel"], .tab-content, .tab-pane').first();
          if (await tabContent.isVisible()) {
            const buttonsInTab = await tabContent.locator('button, [role="button"]').all();
            console.log(`   Found ${buttonsInTab.length} buttons in ${tabName} tab`);
            
            for (let i = 0; i < buttonsInTab.length; i++) {
              const button = buttonsInTab[i];
              results.totalTested++;
              
              try {
                const buttonText = (await button.textContent()) || '';
                console.log(`     Testing button: "${buttonText.trim()}"`);
                
                if (await button.isVisible() && await button.isEnabled()) {
                  await button.click();
                  await page.waitForTimeout(500);
                  
                  // Check for modals
                  const modals = await page.locator('[role="dialog"], .modal, [class*="modal"]').all();
                  if (modals.length > 0) {
                    console.log(`     ✅ Button opened modal`);
                    results.working.push({
                      type: 'Modal Button',
                      element: `${buttonText.trim()} in ${tabName} tab`,
                      action: 'Successfully opened modal',
                      page: 'Tournament Details'
                    });
                    
                    // Close modal
                    await page.keyboard.press('Escape');
                  } else {
                    console.log(`     ✅ Button clicked (no modal)`);
                    results.working.push({
                      type: 'Button Click',
                      element: `${buttonText.trim()} in ${tabName} tab`,
                      action: 'Successfully clicked',
                      page: 'Tournament Details'
                    });
                  }
                }
              } catch (error) {
                console.log(`     ❌ Button failed: ${error.message}`);
                results.broken.push({
                  type: 'Button Error',
                  element: `Button in ${tabName} tab`,
                  error: error.message,
                  page: 'Tournament Details'
                });
              }
            }
          }
          
        } else {
          console.log(`   ❌ ${tabName} tab not found`);
          results.broken.push({
            type: 'Missing Tab',
            element: `${tabName} tab`,
            error: 'Tab not visible or not found',
            page: 'Tournament Details'
          });
        }
        
      } catch (error) {
        console.log(`   ❌ ${tabName} tab failed: ${error.message}`);
        results.broken.push({
          type: 'Tab Error',
          element: `${tabName} tab`,
          error: error.message,
          page: 'Tournament Details'
        });
      }
    }
    
    // Test registration functionality if available
    console.log(`\n🎫 Testing tournament registration...`);
    results.totalTested++;
    
    const registerButton = page.locator('button:has-text("Register"), button:has-text("Join"), button:has-text("Sign Up")').first();
    if (await registerButton.isVisible()) {
      try {
        await registerButton.click();
        await page.waitForTimeout(1000);
        
        // Check for registration modal
        const modal = page.locator('[role="dialog"], .modal').first();
        if (await modal.isVisible()) {
          console.log(`   ✅ Registration modal opened`);
          results.working.push({
            type: 'Registration Modal',
            element: 'Register button',
            action: 'Successfully opened registration modal',
            page: 'Tournament Details'
          });
          
          // Test form within modal if present
          const form = modal.locator('form').first();
          if (await form.isVisible()) {
            console.log(`   📝 Testing registration form...`);
            
            // Fill form fields
            const selects = await form.locator('select').all();
            for (const select of selects) {
              const options = await select.locator('option').all();
              if (options.length > 1) {
                await select.selectOption({ index: 1 });
                console.log(`     ✅ Selected option in dropdown`);
              }
            }
            
            // Test submit
            const submitButton = form.locator('button[type="submit"], button:has-text("Register"), button:has-text("Submit")').first();
            if (await submitButton.isVisible()) {
              await submitButton.click();
              await page.waitForTimeout(1000);
              
              console.log(`   ✅ Registration form submitted`);
              results.working.push({
                type: 'Form Submission',
                element: 'Registration form',
                action: 'Successfully submitted',
                page: 'Tournament Details'
              });
            }
          }
        }
      } catch (error) {
        console.log(`   ❌ Registration failed: ${error.message}`);
        results.broken.push({
          type: 'Registration Error',
          element: 'Register button',
          error: error.message,
          page: 'Tournament Details'
        });
      }
    } else {
      console.log(`   ⚠️ No registration button found`);
    }
    
    // Test specific tournament features
    console.log(`\n🎮 Testing draft creation...`);
    const createDraftButton = page.locator('button:has-text("Draft"), button:has-text("Create Draft")').first();
    if (await createDraftButton.isVisible()) {
      try {
        await createDraftButton.click();
        await page.waitForTimeout(1000);
        
        const modal = page.locator('[role="dialog"], .modal').first();
        if (await modal.isVisible()) {
          console.log(`   ✅ Draft creation modal opened`);
          results.working.push({
            type: 'Draft Modal',
            element: 'Create Draft button',
            action: 'Successfully opened draft modal',
            page: 'Tournament Details'
          });
        }
      } catch (error) {
        console.log(`   ❌ Draft creation failed: ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error during tournament testing:', error.message);
    results.broken.push({
      type: 'General Error',
      element: 'Tournament Page',
      error: error.message,
      page: 'Tournament Details'
    });
  }
  
  // Report results
  console.log(`\n📊 TOURNAMENT DETAILS TEST RESULTS:`);
  console.log(`   Total Tested: ${results.totalTested}`);
  console.log(`   Working: ${results.working.length}`);
  console.log(`   Broken: ${results.broken.length}`);
  
  console.log(`\n✅ WORKING ELEMENTS:`);
  results.working.forEach((item, index) => {
    console.log(`   ${index + 1}. ${item.type}: ${item.element} - ${item.action}`);
  });
  
  console.log(`\n❌ BROKEN ELEMENTS:`);
  results.broken.forEach((item, index) => {
    console.log(`   ${index + 1}. ${item.type}: ${item.element} - ${item.error}`);
  });
  
  await browser.close();
}

testTournamentDetails();