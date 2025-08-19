const { test, expect } = require('@playwright/test');

test('Debug Tournament Rendering Issue', async ({ page }) => {
  console.log('🎨 Debugging Tournament Card Rendering...');
  
  await page.goto('/tournaments');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000); // Give time for API loading
  
  // Check if tournaments are loading
  console.log('📡 Checking API data loading...');
  
  const loadingSpinner = await page.locator('text=/loading|Loading/i').first();
  const hasLoadingSpinner = await loadingSpinner.isVisible();
  console.log(`Loading spinner visible: ${hasLoadingSpinner}`);
  
  // Check for tournament cards using exact class names from the component
  const tournamentCards = await page.locator('.tournament-card').all();
  console.log(`Found ${tournamentCards.length} .tournament-card elements`);
  
  if (tournamentCards.length === 0) {
    // Check for "no tournaments" message
    const noTournamentsMessage = await page.locator('.no-tournaments, .empty-state').first();
    const hasNoTournamentsMessage = await noTournamentsMessage.isVisible();
    console.log(`"No tournaments" message visible: ${hasNoTournamentsMessage}`);
    
    if (hasNoTournamentsMessage) {
      const messageText = await noTournamentsMessage.textContent();
      console.log(`No tournaments message: "${messageText}"`);
    }
    
    // Check if tournaments grid exists but is empty
    const tournamentsGrid = await page.locator('.tournaments-grid').first();
    const hasGrid = await tournamentsGrid.isVisible();
    console.log(`Tournaments grid exists: ${hasGrid}`);
    
    // Check page content for debugging
    console.log('\n🔍 Debugging page content...');
    const bodyText = await page.textContent('body');
    const hasTournamentText = bodyText.includes('tournament') || bodyText.includes('Tournament');
    console.log(`Page contains tournament text: ${hasTournamentText}`);
    
    // Look for any elements with tournament-related text
    const tournamentTextElements = await page.locator('text=/tournament/i').all();
    console.log(`Found ${tournamentTextElements.length} elements with tournament text`);
    
    for (let i = 0; i < Math.min(tournamentTextElements.length, 5); i++) {
      const element = tournamentTextElements[i];
      const text = await element.textContent();
      const tagName = await element.evaluate(el => el.tagName);
      const classes = await element.getAttribute('class');
      console.log(`  Element ${i + 1}: ${tagName} "${text?.trim().substring(0, 30)}..." classes: ${classes}`);
    }
  } else {
    console.log(`✅ Found ${tournamentCards.length} tournament cards`);
    
    // Analyze each tournament card
    for (let i = 0; i < Math.min(tournamentCards.length, 3); i++) {
      const card = tournamentCards[i];
      console.log(`\n🎴 Tournament Card ${i + 1}:`);
      
      const isVisible = await card.isVisible();
      console.log(`  Visible: ${isVisible}`);
      
      if (!isVisible) {
        // Check CSS styles that might be hiding it
        const styles = await card.evaluate(el => {
          const computed = window.getComputedStyle(el);
          return {
            display: computed.display,
            visibility: computed.visibility,
            opacity: computed.opacity,
            position: computed.position
          };
        });
        console.log(`  CSS styles:`, styles);
      } else {
        // Analyze card content
        const cardTitle = await card.locator('h3').first();
        const titleText = await cardTitle.textContent().catch(() => 'No title');
        console.log(`  Title: "${titleText}"`);
        
        // Look for buttons
        const buttons = await card.locator('button').all();
        console.log(`  Found ${buttons.length} buttons in card`);
        
        for (const button of buttons) {
          const buttonText = await button.textContent();
          const isButtonVisible = await button.isVisible();
          const isEnabled = await button.isEnabled();
          console.log(`    Button: "${buttonText}" - visible: ${isButtonVisible}, enabled: ${isEnabled}`);
          
          // Test clicking the "View Details" button
          if (buttonText?.includes('View Details') || buttonText?.includes('View')) {
            try {
              console.log(`    🎯 Testing "${buttonText}" button click...`);
              await button.click();
              await page.waitForLoadState('networkidle');
              await page.waitForTimeout(1000);
              
              const afterClickUrl = page.url();
              console.log(`    After click URL: ${afterClickUrl}`);
              
              if (afterClickUrl.includes('/tournaments/') && !afterClickUrl.endsWith('/tournaments')) {
                console.log(`    ✅ Successfully navigated to tournament detail!`);
                
                // Verify tournament detail page
                const detailTabs = await page.locator('.tab, .tournament-tabs button').all();
                console.log(`    Found ${detailTabs.length} tabs on detail page`);
                
                // Go back to tournaments page for next test
                await page.goto('/tournaments');
                await page.waitForLoadState('networkidle');
              } else {
                console.log(`    ❌ Navigation failed or stayed on same page`);
              }
            } catch (error) {
              console.log(`    ❌ Button click failed: ${error.message}`);
            }
            break; // Only test first "View Details" button
          }
        }
      }
    }
  }
  
  console.log('\n✅ Tournament rendering debugging completed');
});