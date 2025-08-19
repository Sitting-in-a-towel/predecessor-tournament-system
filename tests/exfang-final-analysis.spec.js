const { test, expect } = require('@playwright/test');

test('Final Exfang Live Functionality Test', async ({ page }) => {
  console.log('🎯 Final analysis - Testing live draft functionality...');
  
  // Step 1: Create a draft and see what happens
  console.log('🆕 Step 1: Creating a live draft...');
  await page.goto('https://exfang.fly.dev/');
  await page.waitForLoadState('networkidle');
  
  await page.click('button:has-text("New draft")');
  await page.waitForLoadState('networkidle');
  
  // Fill out the draft configuration
  console.log('📝 Filling out draft configuration...');
  
  try {
    // Fill team names
    await page.fill('input[placeholder="Dawn"]', 'Team Alpha');
    await page.fill('input[placeholder="Dusk"]', 'Team Beta');
    console.log('✅ Filled team names');
    
    // Select strategy
    await page.selectOption('select:has-text("Free pick")', '1'); // Try selecting second option
    console.log('✅ Selected strategy option');
    
    // Select ban count
    await page.selectOption('select:has-text("2")', '1'); // Try selecting 3 bans
    console.log('✅ Selected ban count');
    
  } catch (error) {
    console.log(`Form filling error: ${error.message}`);
  }
  
  // Submit the draft
  console.log('🚀 Submitting draft...');
  
  const networkRequests = [];
  page.on('request', request => {
    networkRequests.push(`${request.method()} ${request.url()}`);
  });
  
  const networkResponses = [];
  page.on('response', response => {
    networkResponses.push(`${response.status()} ${response.url()}`);
  });
  
  try {
    // Use first submit button
    await page.locator('button:has-text("Submit")').first().click();
    await page.waitForTimeout(5000);
    
    console.log('📡 Network requests after submit:');
    networkRequests.slice(-10).forEach(req => console.log(`  ${req}`));
    
    console.log('📡 Network responses after submit:');
    networkResponses.slice(-10).forEach(res => console.log(`  ${res}`));
    
    const currentUrl = page.url();
    console.log(`Current URL: ${currentUrl}`);
    
    await page.screenshot({ path: 'exfang-live-draft-created.png', fullPage: true });
    
    // Check if we're now in an active draft
    const draftContent = await page.textContent('body');
    console.log('=== LIVE DRAFT CONTENT ===');
    console.log(draftContent.replace(/\\s+/g, ' ').substring(0, 800));
    
    // Look for draft-specific elements
    const draftTokens = draftContent.match(/[A-Z0-9]{6,}/g);
    if (draftTokens) {
      console.log('🔑 Potential draft tokens found:', draftTokens.slice(0, 3));
    }
    
    // Look for timer elements
    const timerPattern = /\\d+:\\d+|\\d+s|\\d+ seconds/gi;
    const timers = draftContent.match(timerPattern);
    if (timers) {
      console.log('⏱️ Timer elements found:', timers.slice(0, 3));
    }
    
    // Check for player/team areas
    const teamPattern = /team (1|2|alpha|beta|dawn|dusk)/gi;
    const teams = draftContent.match(teamPattern);
    if (teams) {
      console.log('👥 Team references found:', teams.slice(0, 5));
    }
    
    // Step 2: Test draft access with the token (if we can extract it)
    if (currentUrl.includes('/draft/') || draftTokens) {
      console.log('🔑 Step 2: Testing draft access...');
      
      // Extract token from URL or content
      let token = null;
      if (currentUrl.includes('/draft/')) {
        token = currentUrl.split('/draft/')[1].split('?')[0];
      } else if (draftTokens && draftTokens[0]) {
        token = draftTokens[0];
      }
      
      if (token) {
        console.log(`Testing access with token: ${token}`);
        
        // Open new tab for second player
        const page2 = await page.context().newPage();
        await page2.goto('https://exfang.fly.dev/');
        await page2.click('button:has-text("Draft access")');
        
        // Enter the token
        await page2.fill('input', token);
        await page2.locator('button:has-text("Submit")').first().click();
        await page2.waitForTimeout(3000);
        
        const page2Url = page2.url();
        console.log(`Player 2 URL: ${page2Url}`);
        
        await page2.screenshot({ path: 'exfang-player2-access.png', fullPage: true });
        
        const player2Content = await page2.textContent('body');
        console.log('=== PLAYER 2 DRAFT VIEW ===');
        console.log(player2Content.replace(/\\s+/g, ' ').substring(0, 400));
        
        await page2.close();
      }
    }
    
    // Step 3: Look for interactive draft elements
    console.log('🎮 Step 3: Analyzing interactive draft elements...');
    
    // Look for clickable game elements
    const clickableElements = await page.locator('button, [role="button"], .clickable, [onClick]').all();
    console.log(`Found ${clickableElements.length} clickable elements in draft`);
    
    // Look for drag-and-drop areas
    const dragElements = await page.locator('[draggable], .drag, .drop-zone').all();
    console.log(`Found ${dragElements.length} potential drag-and-drop elements`);
    
    // Look for hero/character selection areas
    const heroElements = await page.locator('[class*="hero"], [class*="character"], [class*="champion"], .card').all();
    console.log(`Found ${heroElements.length} potential hero/character elements`);
    
    // Check for any real-time updates or WebSocket connections
    const wsPattern = /socket|websocket|realtime|live/gi;
    const wsReferences = draftContent.match(wsPattern);
    if (wsReferences) {
      console.log('🔄 Real-time/WebSocket references:', wsReferences.slice(0, 3));
    }
    
  } catch (error) {
    console.log(`Draft creation failed: ${error.message}`);
    await page.screenshot({ path: 'exfang-draft-creation-failed.png', fullPage: true });
  }
  
  console.log('✅ Final functionality test complete!');
});