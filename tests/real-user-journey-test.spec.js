const { test, expect } = require('@playwright/test');

test.describe('REAL USER JOURNEY TESTING', () => {
  let page;

  test.beforeEach(async ({ browser }) => {
    const context = await browser.newContext({
      baseURL: 'http://localhost:3000'
    });
    page = await context.newPage();
  });

  test('1. NEW USER REGISTRATION FLOW', async () => {
    console.log('🆕 Testing New User Registration Flow...');
    
    await page.goto('/');
    
    // Find login/register button
    const loginButtons = await page.locator('text=/login|Login|sign up|Sign Up|register|Register/i').all();
    console.log(`Found ${loginButtons.length} login/register buttons`);
    
    for (const button of loginButtons) {
      const buttonText = await button.textContent();
      console.log(`  Login button: "${buttonText?.trim()}"`);
    }
    
    // Try to access protected pages without login
    const protectedPages = ['/teams', '/profile', '/admin/dashboard'];
    
    for (const protectedPage of protectedPages) {
      await page.goto(protectedPage);
      await page.waitForLoadState('networkidle');
      
      const currentUrl = page.url();
      const redirectedToLogin = currentUrl.includes('/login') || currentUrl === 'http://localhost:3000/';
      
      console.log(`  ${protectedPage} -> ${currentUrl} (redirected: ${redirectedToLogin})`);
      
      if (!redirectedToLogin) {
        console.log(`  ❌ Protected page ${protectedPage} is accessible without login!`);
      }
    }
  });

  test('2. TEAM CREATION WORKFLOW', async () => {
    console.log('👥 Testing Team Creation Workflow...');
    
    // Try to access teams page without login
    await page.goto('/teams');
    await page.waitForLoadState('networkidle');
    
    const currentUrl = page.url();
    console.log(`Teams page redirected to: ${currentUrl}`);
    
    // Check if we can see "Create Team" functionality
    const createTeamElements = await page.locator('text=/create team|Create Team|new team|New Team/i').all();
    console.log(`Found ${createTeamElements.length} "Create Team" elements`);
    
    // Check if we can see team forms
    const teamForms = await page.locator('form, input[placeholder*="team" i], input[name*="team" i]').all();
    console.log(`Found ${teamForms.length} team-related forms/inputs`);
    
    // Test team creation without authentication
    if (createTeamElements.length > 0) {
      try {
        await createTeamElements[0].click();
        await page.waitForTimeout(1000);
        
        const modalOrForm = await page.locator('.modal, form').first();
        if (await modalOrForm.isVisible()) {
          console.log('  Team creation form/modal opened without authentication - this might be an issue');
        }
      } catch (error) {
        console.log(`  Create team button requires authentication: ${error.message}`);
      }
    }
  });

  test('3. TOURNAMENT REGISTRATION FLOW', async () => {
    console.log('🏆 Testing Tournament Registration Flow...');
    
    await page.goto('/tournaments');
    await page.waitForLoadState('networkidle');
    
    // Find tournament cards/items
    const tournaments = await page.locator('.tournament-card, .tournament-item, [data-tournament], a[href*="/tournaments/"]').all();
    console.log(`Found ${tournaments.length} tournament elements`);
    
    if (tournaments.length > 0) {
      // Click on first tournament
      await tournaments[0].click();
      await page.waitForLoadState('networkidle');
      
      const currentUrl = page.url();
      console.log(`Navigated to: ${currentUrl}`);
      
      // Look for registration buttons
      const registerButtons = await page.locator('text=/register|Register|join|Join|sign up|Sign Up/i').all();
      console.log(`Found ${registerButtons.length} registration buttons`);
      
      for (const button of registerButtons) {
        const buttonText = await button.textContent();
        const isVisible = await button.isVisible();
        const isEnabled = await button.isEnabled();
        console.log(`  Register button: "${buttonText?.trim()}" - visible: ${isVisible}, enabled: ${isEnabled}`);
        
        if (isVisible && isEnabled) {
          try {
            await button.click();
            await page.waitForTimeout(1000);
            
            // Check what happens when we try to register without login
            const currentUrlAfterClick = page.url();
            console.log(`  After clicking register: ${currentUrlAfterClick}`);
            
            const modal = await page.locator('.modal, [role="dialog"]').first();
            if (await modal.isVisible()) {
              console.log('  Registration modal opened');
              
              // Look for team selection or forms
              const teamSelects = await page.locator('select, option, .team-select').all();
              console.log(`    Found ${teamSelects.length} team selection elements`);
              
              // Close modal
              const closeButtons = await modal.locator('button:has-text("×"), button:has-text("Close"), button:has-text("Cancel")').all();
              if (closeButtons.length > 0) {
                await closeButtons[0].click();
              } else {
                await page.keyboard.press('Escape');
              }
            }
          } catch (error) {
            console.log(`  ❌ Registration button failed: ${error.message}`);
          }
          break; // Only test first button
        }
      }
    }
  });

  test('4. DRAFT PARTICIPATION AS CAPTAIN', async () => {
    console.log('⚔️ Testing Draft Participation...');
    
    // Get available drafts from API
    try {
      const draftsResponse = await page.request.get('http://localhost:3001/api/draft');
      const drafts = await draftsResponse.json();
      console.log(`Found ${drafts.length} draft sessions available`);
      
      if (drafts.length > 0) {
        const draft = drafts[0];
        console.log(`Testing draft: ${draft.draft_id} (Status: ${draft.status}, Phase: ${draft.current_phase})`);
        
        // Navigate to draft as regular user (not admin)
        await page.goto(`/draft/${draft.draft_id}`);
        await page.waitForLoadState('networkidle');
        
        const currentUrl = page.url();
        console.log(`Draft page URL: ${currentUrl}`);
        
        // Check if we can access the draft
        const errorElements = await page.locator('text=/error|Error|not found|404|access denied|unauthorized/i').all();
        console.log(`Found ${errorElements.length} error messages`);
        
        for (const error of errorElements) {
          const errorText = await error.textContent();
          console.log(`  ❌ Draft Error: "${errorText?.trim()}"`);
        }
        
        // Test coin toss participation
        if (draft.current_phase === 'Coin Toss') {
          const coinButtons = await page.locator('button:has-text("heads"), button:has-text("tails"), .coin-button').all();
          console.log(`Found ${coinButtons.length} coin toss buttons`);
          
          if (coinButtons.length > 0) {
            try {
              await coinButtons[0].click();
              await page.waitForTimeout(2000);
              
              // Check for error responses
              const errorMessages = await page.locator('text=/error|Error|not authorized|forbidden|captain/i').all();
              console.log(`Errors after coin toss attempt: ${errorMessages.length}`);
              
              for (const error of errorMessages) {
                const errorText = await error.textContent();
                console.log(`  Coin toss error: "${errorText?.trim()}"`);
              }
            } catch (error) {
              console.log(`  ❌ Coin toss failed: ${error.message}`);
            }
          }
        }
        
        // Check for team connection requirements
        const connectionElements = await page.locator('text=/connect|Connect|captain|Captain/i').all();
        console.log(`Found ${connectionElements.length} connection-related elements`);
        
        for (const element of connectionElements.slice(0, 3)) {
          const text = await element.textContent();
          console.log(`  Connection info: "${text?.trim()}"`);
        }
      }
    } catch (error) {
      console.log(`❌ Failed to test draft participation: ${error.message}`);
    }
  });

  test('5. COMPLETE USER WORKFLOW SIMULATION', async () => {
    console.log('🎯 Testing Complete User Workflow...');
    
    // Simulate what a real user would do:
    // 1. Visit site
    // 2. Try to create team
    // 3. Try to register for tournament
    // 4. Try to participate in draft
    
    const userJourney = [
      { step: 'Visit homepage', url: '/', expected: 'Should load without errors' },
      { step: 'View tournaments', url: '/tournaments', expected: 'Should show available tournaments' },
      { step: 'Try to create team', url: '/teams', expected: 'Should redirect to login or show login requirement' },
      { step: 'Try to access profile', url: '/profile', expected: 'Should redirect to login' },
      { step: 'Try to access admin', url: '/admin', expected: 'Should redirect to login' }
    ];
    
    const journeyResults = [];
    
    for (const journey of userJourney) {
      console.log(`  Step: ${journey.step}`);
      
      await page.goto(journey.url);
      await page.waitForLoadState('networkidle');
      
      const currentUrl = page.url();
      const errorElements = await page.locator('text=/error|Error|ERROR|404|not found/i').all();
      
      const result = {
        step: journey.step,
        originalUrl: journey.url,
        finalUrl: currentUrl,
        errors: errorElements.length,
        redirected: currentUrl !== `http://localhost:3000${journey.url}`
      };
      
      journeyResults.push(result);
      console.log(`    Result: ${result.finalUrl} (errors: ${result.errors}, redirected: ${result.redirected})`);
    }
    
    // Summary
    console.log('\n📊 User Journey Summary:');
    const totalSteps = journeyResults.length;
    const stepsWithErrors = journeyResults.filter(r => r.errors > 0).length;
    const redirectedSteps = journeyResults.filter(r => r.redirected).length;
    
    console.log(`  Total steps tested: ${totalSteps}`);
    console.log(`  Steps with errors: ${stepsWithErrors}`);
    console.log(`  Steps that redirected: ${redirectedSteps}`);
    
    if (stepsWithErrors > 0) {
      console.log('❌ CRITICAL: Found errors in user workflow');
    } else {
      console.log('✅ No errors found in basic user workflow');
    }
  });
});