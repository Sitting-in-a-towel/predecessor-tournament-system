// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Draft System Tests', () => {
  test('Draft creation from bracket', async ({ page, request }) => {
    // Get tournaments with brackets
    const tournamentsResponse = await request.get('http://localhost:3001/api/tournaments');
    const tournaments = await tournamentsResponse.json();
    
    for (const tournament of tournaments) {
      const bracketResponse = await request.get(`http://localhost:3001/api/tournaments/${tournament.tournament_id}/bracket`);
      
      if (bracketResponse.ok()) {
        const bracketData = await bracketResponse.json();
        
        if (bracketData.matches && bracketData.matches.length > 0) {
          console.log(`Testing draft for tournament: ${tournament.name}`);
          
          // Navigate to tournament bracket
          await page.goto(`/tournaments/${tournament.tournament_id}`);
          
          // Click bracket tab
          const bracketTab = page.locator('[role="tab"]:has-text("Bracket"), button:has-text("Bracket")').first();
          if (await bracketTab.isVisible()) {
            await bracketTab.click();
            await page.waitForTimeout(500);
            
            // Look for create draft button
            const createDraftButton = page.locator('button:has-text("Draft"), button:has-text("Create Draft")').first();
            if (await createDraftButton.isVisible()) {
              console.log('✅ Create draft button found');
              
              // Click to open draft modal
              await createDraftButton.click();
              await page.waitForTimeout(500);
              
              // Check for draft modal
              const modal = page.locator('[role="dialog"], .modal, [class*="modal"]').first();
              if (await modal.isVisible()) {
                console.log('✅ Draft creation modal opened');
                
                // Check for form fields
                const draftNameInput = modal.locator('input[name*="name"], input[placeholder*="name"]').first();
                const submitButton = modal.locator('button:has-text("Create"), button[type="submit"]').first();
                
                if (await draftNameInput.isVisible()) {
                  console.log('✅ Draft name input found');
                }
                
                if (await submitButton.isVisible()) {
                  console.log('✅ Submit button found');
                }
              }
            }
            
            break; // Test one tournament
          }
        }
      }
    }
  });

  test('Active drafts display', async ({ page, request }) => {
    // Check for active drafts via API
    const draftsResponse = await request.get('http://localhost:3001/api/draft');
    
    if (draftsResponse.ok()) {
      const drafts = await draftsResponse.json();
      console.log(`Found ${drafts.length} active drafts`);
      
      if (drafts.length > 0) {
        const draft = drafts[0];
        console.log(`Draft: ${draft.draft_name} (${draft.draft_id})`);
        console.log(`State: ${draft.state}`);
        console.log(`Teams: ${draft.team1_name} vs ${draft.team2_name}`);
        
        // Try to navigate to draft page
        await page.goto(`/draft/${draft.draft_id}`);
        await page.waitForLoadState('networkidle');
        
        // Check for draft UI
        const draftContainer = page.locator('[class*="draft"], .draft-container').first();
        if (await draftContainer.isVisible()) {
          console.log('✅ Draft container found');
          
          // Check for team sections
          const team1Section = page.locator(`:has-text("${draft.team1_name}")`).first();
          const team2Section = page.locator(`:has-text("${draft.team2_name}")`).first();
          
          if (await team1Section.isVisible()) console.log('✅ Team 1 section found');
          if (await team2Section.isVisible()) console.log('✅ Team 2 section found');
          
          await page.screenshot({ path: 'test-results/draft-page.png', fullPage: true });
        }
      }
    }
  });

  test('Draft phases and states', async ({ page, request }) => {
    const draftsResponse = await request.get('http://localhost:3001/api/draft');
    
    if (draftsResponse.ok()) {
      const drafts = await draftsResponse.json();
      
      // Check different draft states
      const states = ['Coin Toss', 'Ban Phase 1', 'Pick Phase 1', 'Ban Phase 2', 'Pick Phase 2', 'Complete'];
      
      for (const draft of drafts) {
        console.log(`Draft ${draft.draft_id} is in state: ${draft.state}`);
        
        // Navigate to draft
        await page.goto(`/draft/${draft.draft_id}`);
        
        // Check for state indicator
        const stateIndicator = page.locator(`:has-text("${draft.state}")`).first();
        if (await stateIndicator.isVisible()) {
          console.log(`✅ State indicator shows: ${draft.state}`);
        }
        
        // Check for timer
        const timer = page.locator('[class*="timer"], :has-text(":")').first();
        if (await timer.isVisible()) {
          console.log('✅ Draft timer found');
        }
        
        // Check for action buttons based on state
        if (draft.state === 'Coin Toss') {
          const headsButton = page.locator('button:has-text("Heads")').first();
          const tailsButton = page.locator('button:has-text("Tails")').first();
          
          if (await headsButton.isVisible()) console.log('✅ Heads button found');
          if (await tailsButton.isVisible()) console.log('✅ Tails button found');
        } else if (draft.state.includes('Ban')) {
          const banButtons = page.locator('button:has-text("Ban")');
          const banCount = await banButtons.count();
          console.log(`Found ${banCount} ban buttons`);
        } else if (draft.state.includes('Pick')) {
          const pickButtons = page.locator('button:has-text("Pick")');
          const pickCount = await pickButtons.count();
          console.log(`Found ${pickCount} pick buttons`);
        }
      }
    }
  });

  test('Hero selection in draft', async ({ page, request }) => {
    // Get heroes data
    const heroesResponse = await request.get('http://localhost:3001/api/heroes');
    
    if (heroesResponse.ok()) {
      const heroes = await heroesResponse.json();
      console.log(`Found ${heroes.length} heroes available`);
      
      // Get an active draft
      const draftsResponse = await request.get('http://localhost:3001/api/draft');
      if (draftsResponse.ok()) {
        const drafts = await draftsResponse.json();
        
        if (drafts.length > 0) {
          const draft = drafts[0];
          
          // Navigate to draft
          await page.goto(`/draft/${draft.draft_id}`);
          
          // Check for hero grid
          const heroGrid = page.locator('[class*="hero-grid"], [class*="heroes"]').first();
          if (await heroGrid.isVisible()) {
            console.log('✅ Hero grid found');
            
            // Count hero cards
            const heroCards = heroGrid.locator('[class*="hero-card"], [class*="hero-item"]');
            const heroCount = await heroCards.count();
            console.log(`Found ${heroCount} hero cards displayed`);
            
            // Check first hero card
            if (heroCount > 0) {
              const firstHero = heroCards.first();
              
              // Check for hero image
              const heroImage = firstHero.locator('img').first();
              if (await heroImage.isVisible()) {
                console.log('✅ Hero image found');
              }
              
              // Check for hero name
              const heroName = firstHero.locator('[class*="name"]').first();
              if (await heroName.isVisible()) {
                const name = await heroName.textContent();
                console.log(`First hero: ${name}`);
              }
              
              // Check for role icon
              const roleIcon = firstHero.locator('[class*="role"]').first();
              if (await roleIcon.isVisible()) {
                console.log('✅ Hero role icon found');
              }
            }
          }
        }
      }
    }
  });

  test('Draft real-time updates', async ({ page }) => {
    // Navigate to a draft page
    await page.goto('/draft');
    
    // Check for WebSocket connection indicator
    const connectionStatus = page.locator('[class*="connection"], [class*="status"]').first();
    if (await connectionStatus.isVisible()) {
      const status = await connectionStatus.textContent();
      console.log(`Connection status: ${status}`);
    }
    
    // Check for real-time elements
    const realtimeElements = [
      { selector: '[class*="timer"]', name: 'Timer' },
      { selector: '[class*="phase"]', name: 'Phase indicator' },
      { selector: '[class*="turn"]', name: 'Turn indicator' },
      { selector: '[class*="spectator"]', name: 'Spectator count' }
    ];
    
    for (const element of realtimeElements) {
      const el = page.locator(element.selector).first();
      if (await el.isVisible()) {
        console.log(`✅ ${element.name} found`);
      }
    }
  });

  test('Draft history and results', async ({ page }) => {
    // Navigate to completed drafts or match results
    await page.goto('/tournaments');
    
    // Look for completed matches
    const completedMatches = page.locator('[class*="completed"], :has-text("Completed")');
    const matchCount = await completedMatches.count();
    
    if (matchCount > 0) {
      console.log(`Found ${matchCount} completed matches`);
      
      // Click on first completed match
      const firstMatch = completedMatches.first();
      if (await firstMatch.isVisible()) {
        await firstMatch.click();
        await page.waitForTimeout(500);
        
        // Check for draft results
        const resultsContainer = page.locator('[class*="result"], [class*="draft-history"]').first();
        if (await resultsContainer.isVisible()) {
          console.log('✅ Draft results found');
          
          // Check for picks and bans
          const picks = resultsContainer.locator('[class*="pick"]');
          const bans = resultsContainer.locator('[class*="ban"]');
          
          const pickCount = await picks.count();
          const banCount = await bans.count();
          
          console.log(`Picks: ${pickCount}, Bans: ${banCount}`);
        }
      }
    }
  });

  test('Spectator mode', async ({ page }) => {
    await page.goto('/draft');
    
    // Check for spectator options
    const spectateButton = page.locator('button:has-text("Spectate"), a:has-text("Watch")').first();
    
    if (await spectateButton.isVisible()) {
      console.log('✅ Spectate button found');
      
      await spectateButton.click();
      await page.waitForTimeout(500);
      
      // Check for spectator UI
      const spectatorUI = page.locator('[class*="spectator"], [class*="viewer"]').first();
      if (await spectatorUI.isVisible()) {
        console.log('✅ Spectator mode UI found');
        
        // Check for read-only elements
        const readOnlyIndicator = page.locator(':has-text("Spectating"), :has-text("Viewing")').first();
        if (await readOnlyIndicator.isVisible()) {
          console.log('✅ Read-only mode indicated');
        }
      }
    }
  });
});