const { chromium } = require('playwright');

async function debugTournamentTest() {
  console.log('\n=== DEBUGGING TOURNAMENT PAGE ===\n');
  
  const browser = await chromium.launch({ headless: false, slowMo: 500 });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Capture console logs
  page.on('console', msg => {
    console.log(`   BROWSER: ${msg.type()}: ${msg.text()}`);
  });
  
  // Capture network failures
  page.on('response', response => {
    if (response.status() >= 400) {
      console.log(`   NETWORK ERROR: ${response.status()} ${response.url()}`);
    }
  });
  
  // Capture page errors
  page.on('pageerror', error => {
    console.log(`   PAGE ERROR: ${error.message}`);
  });
  
  try {
    // Step 1: Navigate directly to tournament page (FIXED URL)
    console.log('1. Navigating to tournament page...');
    const response = await page.goto('http://localhost:3000/tournaments/67e81a0d-1165-4481-ad58-85da372f86d5');
    console.log(`   Response status: ${response.status()}`);
    await page.waitForTimeout(5000);
    
    // Step 2: Check if React app loaded
    console.log('2. Checking React app state...');
    const hasReactRoot = await page.locator('#root').count();
    console.log(`   React root element: ${hasReactRoot}`);
    
    // Step 3: Check page title and URL
    const title = await page.title();
    const url = page.url();
    console.log(`   Page title: ${title}`);
    console.log(`   Current URL: ${url}`);
    
    // Step 4: Check if tournament content loaded
    const pageText = await page.textContent('body');
    const hasTournamentContent = pageText.includes('test admin panel') || pageText.includes('Tournament');
    console.log(`   Has tournament content: ${hasTournamentContent}`);
    
    // Step 5: Check for loading states
    const hasLoading = pageText.includes('Loading') || pageText.includes('loading');
    console.log(`   Has loading state: ${hasLoading}`);
    
    // Step 6: Check if any tournament elements exist
    const tournamentElements = await page.locator('[class*="tournament"], .tournament-detail').count();
    console.log(`   Tournament elements: ${tournamentElements}`);
    
    // Step 7: Wait a bit more and check again
    console.log('3. Waiting additional time for async loading...');
    await page.waitForTimeout(3000);
    
    const finalPageText = await page.textContent('body');
    const finalHasTournament = finalPageText.includes('test admin panel');
    console.log(`   Final check - has tournament: ${finalHasTournament}`);
    
    // Step 8: Try navigating to tournaments list first
    console.log('4. Trying to navigate to tournaments list first...');
    await page.goto('http://localhost:3000/tournaments');
    await page.waitForTimeout(3000);
    
    const tournamentsList = await page.textContent('body');
    const hasTournamentsList = tournamentsList.includes('test admin panel');
    console.log(`   Tournaments list has our tournament: ${hasTournamentsList}`);
    
    if (hasTournamentsList) {
      console.log('5. Clicking on tournament from list...');
      const tournamentLink = page.locator('text="test admin panel"').first();
      if (await tournamentLink.count() > 0) {
        await tournamentLink.click();
        await page.waitForTimeout(3000);
        
        const clickedPageText = await page.textContent('body');
        const clickedHasTournament = clickedPageText.includes('test admin panel');
        console.log(`   After clicking - has tournament content: ${clickedHasTournament}`);
        
        // Check for tabs
        const tabs = await page.locator('.tab, [role="tab"]').allTextContents();
        console.log(`   Available tabs: ${tabs.join(', ')}`);
      }
    }
    
    // Final screenshot
    await page.screenshot({ path: 'debug-final.png', fullPage: true });
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    await page.screenshot({ path: 'debug-error.png', fullPage: true });
  } finally {
    await browser.close();
  }
  
  console.log('\n=== DEBUG TEST COMPLETE ===\n');
}

debugTournamentTest();