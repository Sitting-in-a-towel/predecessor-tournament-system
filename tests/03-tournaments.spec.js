// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Tournament System Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Log console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error(`Console error: ${msg.text()}`);
      }
    });
  });

  test('Tournament listing page', async ({ page }) => {
    await page.goto('/tournaments');
    
    // Wait for tournaments to load
    await page.waitForLoadState('networkidle');
    
    // Check for tournament cards or list
    const tournaments = page.locator('[class*="tournament-card"], [class*="tournament-item"], .tournament').first();
    
    if (await tournaments.isVisible()) {
      const tournamentCount = await page.locator('[class*="tournament-card"], [class*="tournament-item"]').count();
      console.log(`Found ${tournamentCount} tournaments displayed`);
      
      // Test first tournament card
      if (tournamentCount > 0) {
        const firstTournament = page.locator('[class*="tournament-card"], [class*="tournament-item"]').first();
        
        // Check for tournament details
        const title = await firstTournament.locator('h2, h3, h4, [class*="title"]').textContent();
        console.log(`First tournament: ${title}`);
        
        // Check for tournament info
        const hasDate = await firstTournament.locator('[class*="date"]').count() > 0;
        const hasTeams = await firstTournament.locator('[class*="team"]').count() > 0;
        const hasStatus = await firstTournament.locator('[class*="status"]').count() > 0;
        
        console.log(`Tournament has: Date=${hasDate}, Teams=${hasTeams}, Status=${hasStatus}`);
        
        // Check for action buttons
        const viewButton = firstTournament.locator('button:has-text("View"), a:has-text("View")').first();
        if (await viewButton.isVisible()) {
          console.log('✅ View tournament button found');
        }
      }
    } else {
      console.log('No tournaments found or still loading');
    }
    
    await page.screenshot({ path: 'test-results/tournaments-list.png', fullPage: true });
  });

  test('Tournament details page', async ({ page, request }) => {
    // Get a tournament ID from API
    const response = await request.get('http://localhost:3001/api/tournaments');
    const tournaments = await response.json();
    
    if (tournaments.length > 0) {
      const tournament = tournaments[0];
      console.log(`Testing tournament: ${tournament.name} (${tournament.tournament_id})`);
      
      // Navigate to tournament details
      await page.goto(`/tournaments/${tournament.tournament_id}`);
      await page.waitForLoadState('networkidle');
      
      // Check for tournament tabs
      const tabs = ['Overview', 'Teams', 'Bracket', 'Matches', 'Check-in'];
      for (const tab of tabs) {
        const tabElement = page.locator(`[role="tab"]:has-text("${tab}"), button:has-text("${tab}"), a:has-text("${tab}")`).first();
        if (await tabElement.isVisible()) {
          console.log(`✅ ${tab} tab found`);
          
          // Click the tab
          await tabElement.click();
          await page.waitForTimeout(500);
          
          // Screenshot each tab
          await page.screenshot({ 
            path: `test-results/tournament-${tab.toLowerCase()}.png`,
            fullPage: true 
          });
        }
      }
      
      // Check for tournament actions
      const registerButton = page.locator('button:has-text("Register"), button:has-text("Join")').first();
      if (await registerButton.isVisible()) {
        console.log('✅ Register/Join button found');
        const isEnabled = await registerButton.isEnabled();
        console.log(`Register button enabled: ${isEnabled}`);
      }
    }
  });

  test('Tournament bracket functionality', async ({ page, request }) => {
    // Get a tournament with a bracket
    const response = await request.get('http://localhost:3001/api/tournaments');
    const tournaments = await response.json();
    
    for (const tournament of tournaments) {
      // Try to get bracket data
      const bracketResponse = await request.get(`http://localhost:3001/api/tournaments/${tournament.tournament_id}/bracket`);
      if (bracketResponse.ok()) {
        const bracketData = await bracketResponse.json();
        
        if (bracketData.bracket) {
          console.log(`Found bracket for ${tournament.name}`);
          
          // Navigate to bracket view
          await page.goto(`/tournaments/${tournament.tournament_id}`);
          
          // Click on bracket tab
          const bracketTab = page.locator('[role="tab"]:has-text("Bracket"), button:has-text("Bracket")').first();
          if (await bracketTab.isVisible()) {
            await bracketTab.click();
            await page.waitForTimeout(1000);
            
            // Check for bracket elements
            const bracketContainer = page.locator('[class*="bracket"], .bracket-container, #bracket').first();
            if (await bracketContainer.isVisible()) {
              console.log('✅ Bracket container found');
              
              // Check for matches
              const matches = page.locator('[class*="match"], .match-card');
              const matchCount = await matches.count();
              console.log(`Found ${matchCount} matches in bracket`);
              
              // Check for team names in bracket
              const teams = page.locator('[class*="team-name"], .team');
              const teamCount = await teams.count();
              console.log(`Found ${teamCount} teams in bracket`);
              
              await page.screenshot({ 
                path: `test-results/tournament-bracket-${tournament.tournament_id}.png`,
                fullPage: true 
              });
            }
          }
          
          break; // Test one bracket
        }
      }
    }
  });

  test('Tournament registration modal', async ({ page }) => {
    await page.goto('/tournaments');
    await page.waitForLoadState('networkidle');
    
    // Find a tournament to register for
    const registerButton = page.locator('button:has-text("Register"), button:has-text("Join")').first();
    
    if (await registerButton.isVisible()) {
      await registerButton.click();
      await page.waitForTimeout(500);
      
      // Check for registration modal
      const modal = page.locator('[role="dialog"], .modal, [class*="modal"]').first();
      if (await modal.isVisible()) {
        console.log('✅ Registration modal opened');
        
        // Check for form fields
        const teamSelect = modal.locator('select, [class*="select"]').first();
        const submitButton = modal.locator('button:has-text("Register"), button:has-text("Submit")').first();
        
        if (await teamSelect.isVisible()) {
          console.log('✅ Team selection found');
        }
        
        if (await submitButton.isVisible()) {
          console.log('✅ Submit button found');
        }
        
        // Close modal
        const closeButton = modal.locator('[aria-label="Close"], button:has-text("Close"), button:has-text("Cancel")').first();
        if (await closeButton.isVisible()) {
          await closeButton.click();
        }
      }
    }
  });

  test('Tournament check-in system', async ({ page, request }) => {
    // Get tournaments
    const response = await request.get('http://localhost:3001/api/tournaments');
    const tournaments = await response.json();
    
    if (tournaments.length > 0) {
      const tournament = tournaments[0];
      
      // Test check-in API
      const checkinResponse = await request.get(`http://localhost:3001/api/tournaments/${tournament.tournament_id}/check-in-status`);
      
      if (checkinResponse.ok()) {
        const checkinData = await checkinResponse.json();
        console.log(`Check-in status for ${tournament.name}:`);
        console.log(`- Total teams: ${checkinData.summary?.totalTeams || 0}`);
        console.log(`- Checked in: ${checkinData.summary?.checkedInTeams || 0}`);
        console.log(`- Ready to start: ${checkinData.summary?.readyToStart || false}`);
        
        // Navigate to check-in tab
        await page.goto(`/tournaments/${tournament.tournament_id}`);
        
        const checkinTab = page.locator('[role="tab"]:has-text("Check"), button:has-text("Check")').first();
        if (await checkinTab.isVisible()) {
          await checkinTab.click();
          await page.waitForTimeout(500);
          
          // Look for check-in UI
          const checkinContainer = page.locator('[class*="checkin"], .check-in').first();
          if (await checkinContainer.isVisible()) {
            console.log('✅ Check-in UI found');
            
            // Look for check-in button
            const checkinButton = page.locator('button:has-text("Check"), button:has-text("Check In")').first();
            if (await checkinButton.isVisible()) {
              console.log('✅ Check-in button found');
            }
          }
        }
      }
    }
  });

  test('Tournament creation form', async ({ page }) => {
    await page.goto('/tournaments/create');
    
    // Check if redirected to login
    if (page.url().includes('/login')) {
      console.log('Tournament creation requires authentication');
      return;
    }
    
    // Check for form fields
    const form = page.locator('form, [class*="form"]').first();
    if (await form.isVisible()) {
      console.log('✅ Tournament creation form found');
      
      // Test form fields
      const fields = [
        { name: 'name', type: 'input' },
        { name: 'description', type: 'textarea' },
        { name: 'format', type: 'select' },
        { name: 'date', type: 'date' },
        { name: 'maxTeams', type: 'number' }
      ];
      
      for (const field of fields) {
        const input = form.locator(`[name="${field.name}"], [id*="${field.name}"], [placeholder*="${field.name}"]`).first();
        if (await input.isVisible()) {
          console.log(`✅ ${field.name} field found`);
        }
      }
      
      // Check for submit button
      const submitButton = form.locator('button[type="submit"], button:has-text("Create")').first();
      if (await submitButton.isVisible()) {
        console.log('✅ Submit button found');
      }
    }
  });

  test('Tournament search and filters', async ({ page }) => {
    await page.goto('/tournaments');
    await page.waitForLoadState('networkidle');
    
    // Check for search input
    const searchInput = page.locator('input[type="search"], input[placeholder*="Search"]').first();
    if (await searchInput.isVisible()) {
      console.log('✅ Search input found');
      
      // Test search
      await searchInput.fill('test');
      await page.waitForTimeout(500);
    }
    
    // Check for filters
    const filters = ['Status', 'Format', 'Date'];
    for (const filter of filters) {
      const filterElement = page.locator(`select:has-text("${filter}"), button:has-text("${filter}")`).first();
      if (await filterElement.isVisible()) {
        console.log(`✅ ${filter} filter found`);
      }
    }
  });
});