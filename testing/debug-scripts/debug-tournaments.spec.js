const { test, expect } = require('@playwright/test');

test('Debug Tournament Detail Tabs', async ({ page }) => {
  console.log('🔍 Debugging Tournament Detail Tabs...');
  
  await page.goto('http://localhost:3000/tournaments');
  await page.waitForLoadState('networkidle');
  
  // Get all tournament links/cards
  const tournamentLinks = await page.locator('a[href*="/tournaments/"], .tournament-card, .tournament-item').all();
  console.log(`Found ${tournamentLinks.length} tournament links/cards`);
  
  if (tournamentLinks.length === 0) {
    // Try to find tournaments by text content
    const tournamentElements = await page.locator('text=/tournament/i').all();
    console.log(`Found ${tournamentElements.length} elements with "tournament" text`);
    
    for (let i = 0; i < Math.min(tournamentElements.length, 3); i++) {
      const text = await tournamentElements[i].textContent();
      console.log(`  Tournament text ${i + 1}: "${text?.trim()}"`);
    }
  }
  
  // Try to navigate to a known tournament directly
  console.log('Trying to navigate to tournament detail directly...');
  
  // First get tournament IDs from API
  const tournamentsResponse = await page.request.get('http://localhost:3001/api/tournaments');
  const tournaments = await tournamentsResponse.json();
  console.log(`API returned ${tournaments.length} tournaments`);
  
  if (tournaments.length > 0) {
    const firstTournament = tournaments[0];
    const tournamentId = firstTournament.tournament_id || firstTournament.id;
    console.log(`Testing with tournament ID: ${tournamentId}`);
    
    await page.goto(`http://localhost:3000/tournaments/${tournamentId}`);
    await page.waitForLoadState('networkidle');
    
    const currentUrl = page.url();
    console.log(`Current URL: ${currentUrl}`);
    
    // Check for tournament tabs
    const allButtons = await page.locator('button').all();
    console.log(`Found ${allButtons.length} total buttons`);
    
    const tabs = await page.locator('.tab, .tournament-tabs button, button:has-text("Overview"), button:has-text("Teams"), button:has-text("Bracket")').all();
    console.log(`Found ${tabs.length} tab buttons`);
    
    for (const tab of tabs) {
      const tabText = await tab.textContent();
      const isVisible = await tab.isVisible();
      const classes = await tab.getAttribute('class');
      console.log(`  Tab: "${tabText?.trim()}" - visible: ${isVisible} - classes: ${classes}`);
    }
    
    // Check page content
    const pageText = await page.textContent('body');
    const hasTabWords = pageText.includes('Overview') || pageText.includes('Teams') || pageText.includes('Bracket');
    console.log(`Page contains tab words: ${hasTabWords}`);
    
    if (!hasTabWords) {
      console.log('❌ Tournament detail page not loading properly');
      const errorElements = await page.locator('text=/error|Error|not found|404/i').all();
      console.log(`Found ${errorElements.length} error indicators`);
    }
  }
});