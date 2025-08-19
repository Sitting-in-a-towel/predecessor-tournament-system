const { test, expect } = require('@playwright/test');

test('Debug Tournament Navigation Issue', async ({ page }) => {
  console.log('🔍 Debugging Tournament Navigation...');
  
  await page.goto('/tournaments');
  await page.waitForLoadState('networkidle');
  
  console.log(`Starting URL: ${page.url()}`);
  
  // Get all clickable elements that might be tournaments
  const possibleTournaments = await page.locator('a, .tournament-card, .tournament-item, [data-tournament], .clickable').all();
  console.log(`Found ${possibleTournaments.length} potentially clickable elements`);
  
  // Analyze each element
  for (let i = 0; i < Math.min(possibleTournaments.length, 10); i++) {
    const element = possibleTournaments[i];
    const tagName = await element.evaluate(el => el.tagName);
    const href = await element.getAttribute('href');
    const classes = await element.getAttribute('class');
    const text = await element.textContent();
    const isVisible = await element.isVisible();
    
    console.log(`Element ${i + 1}: ${tagName}`);
    console.log(`  href: ${href}`);
    console.log(`  classes: ${classes}`);
    console.log(`  text: "${text?.trim().substring(0, 50)}..."`);
    console.log(`  visible: ${isVisible}`);
    
    // If it's a link with tournament in href, test it
    if (href && href.includes('tournament') && isVisible) {
      console.log(`  🎯 Testing navigation for tournament link...`);
      
      try {
        await element.click();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);
        
        const afterClickUrl = page.url();
        console.log(`  After click URL: ${afterClickUrl}`);
        
        if (afterClickUrl !== page.url()) {
          console.log('  ✅ Navigation occurred');
          
          // Check for tournament detail elements
          const detailElements = await page.locator('h1, h2, .tournament-title, .tournament-detail').all();
          console.log(`  Found ${detailElements.length} detail elements`);
          
          const tabs = await page.locator('.tab, .tournament-tabs button, button[role="tab"]').all();
          console.log(`  Found ${tabs.length} tab elements`);
          
          if (tabs.length > 0) {
            console.log('  ✅ Tournament detail page loaded successfully');
            for (const tab of tabs) {
              const tabText = await tab.textContent();
              console.log(`    Tab: "${tabText?.trim()}"`);
            }
          } else {
            console.log('  ❌ Tournament detail page missing tabs');
          }
          
          // Go back for next test
          await page.goto('/tournaments');
          await page.waitForLoadState('networkidle');
        } else {
          console.log('  ❌ No navigation occurred');
        }
      } catch (error) {
        console.log(`  ❌ Navigation failed: ${error.message}`);
      }
      
      break; // Only test first tournament link
    }
  }
  
  // Check if tournaments are loaded via API
  console.log('\n🔍 Checking tournament data from API...');
  
  try {
    const tournamentsResponse = await page.request.get('http://localhost:3001/api/tournaments');
    const tournaments = await tournamentsResponse.json();
    console.log(`API returned ${tournaments.length} tournaments`);
    
    if (tournaments.length > 0) {
      const firstTournament = tournaments[0];
      console.log(`First tournament:`)
      console.log(`  ID: ${firstTournament.id}`);
      console.log(`  Tournament ID: ${firstTournament.tournament_id}`);
      console.log(`  Name: ${firstTournament.name}`);
      console.log(`  Status: ${firstTournament.status}`);
      
      // Test direct navigation to tournament detail
      const tournamentId = firstTournament.tournament_id || firstTournament.id;
      console.log(`\nTesting direct navigation to: /tournaments/${tournamentId}`);
      
      await page.goto(`/tournaments/${tournamentId}`);
      await page.waitForLoadState('networkidle');
      
      const directUrl = page.url();
      console.log(`Direct navigation result: ${directUrl}`);
      
      const directTabs = await page.locator('.tab, .tournament-tabs button').all();
      console.log(`Direct navigation found ${directTabs.length} tabs`);
      
      if (directTabs.length > 0) {
        console.log('✅ Direct navigation to tournament detail works');
        
        // Look for registration elements
        const registerElements = await page.locator('text=/register|Register|join|Join/i').all();
        console.log(`Found ${registerElements.length} registration elements`);
        
        for (const element of registerElements.slice(0, 3)) {
          const text = await element.textContent();
          const tagName = await element.evaluate(el => el.tagName);
          const isButton = tagName === 'BUTTON';
          console.log(`  Registration element: "${text?.trim()}" (${tagName}, button: ${isButton})`);
        }
      } else {
        console.log('❌ Even direct navigation to tournament detail fails');
      }
    }
  } catch (error) {
    console.log(`API request failed: ${error.message}`);
  }
  
  console.log('\n✅ Tournament navigation debugging completed');
});