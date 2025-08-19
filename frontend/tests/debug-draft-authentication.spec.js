const { test, expect } = require('@playwright/test');

test('Debug draft authentication flow', async ({ page }) => {
  // Skip all the tournament UI navigation and test the draft URL directly
  const DRAFT_ID = 'test_draft_1754907113'; // Known draft from database
  const PHOENIX_URL = 'http://localhost:4000';
  // Enable console logging
  const consoleLogs = [];
  page.on('console', msg => {
    consoleLogs.push(`${msg.type()}: ${msg.text()}`);
  });

  // Enable network logging
  const networkRequests = [];
  page.on('request', request => {
    networkRequests.push(`${request.method()} ${request.url()}`);
  });

  page.on('response', response => {
    if (response.status() >= 400) {
      console.log(`❌ HTTP ${response.status()}: ${response.url()}`);
    }
  });

  // First login as test admin using test endpoint
  console.log('Logging in as test admin...');
  
  const loginResponse = await page.request.post('http://localhost:3001/api/test-auth/login-test-admin');
  const loginData = await loginResponse.json();
  
  if (loginData.success) {
    console.log('✅ Successfully logged in as test admin');
    console.log('User data:', loginData.user);
  } else {
    console.log('❌ Failed to login as test admin:', loginData);
    return;
  }
  
  // Now test the Phoenix token generation directly
  console.log('\nTesting Phoenix token generation...');
  
  try {
    const tokenResponse = await page.request.post(`${PHOENIX_URL}/api/auth/token`, {
      data: {
        user_id: loginData.user.id, // Use the UUID from test user
        draft_id: DRAFT_ID,
        captain: '1' // Team 1 captain
      }
    });
    
    console.log(`Token API Status: ${tokenResponse.status()}`);
    
    if (tokenResponse.ok()) {
      const tokenData = await tokenResponse.json();
      console.log('✅ Token generated successfully');
      console.log('Token data:', tokenData);
      
      // Now test the draft URL with the token
      const draftUrl = `${PHOENIX_URL}/draft/${DRAFT_ID}?token=${tokenData.token}&captain=1`;
      console.log(`\nTesting draft URL: ${draftUrl}`);
      
      await page.goto(draftUrl);
      await page.waitForTimeout(3000);
      
      // Check for authentication errors
      const hasAuthError = await page.locator('text="Authentication failed"').count();
      const hasWarning = await page.locator('.warning, [class*="warning"], .error, [class*="error"]').count();
      
      if (hasAuthError > 0) {
        console.log('❌ Found "Authentication failed" message');
      } else {
        console.log('✅ No "Authentication failed" message');
      }
      
      if (hasWarning > 0) {
        const warningText = await page.locator('.warning, [class*="warning"], .error, [class*="error"]').first().textContent();
        console.log(`❌ Warning found: ${warningText}`);
      } else {
        console.log('✅ No warning elements found');
      }
      
      // Check current page content
      const pageContent = await page.textContent('body');
      console.log(`\nPage content preview: ${pageContent.substring(0, 300)}...`);
      
      // Take screenshot
      await page.screenshot({ path: 'H:\\Project Folder\\Predecessor website\\debug-phoenix-direct.png', fullPage: true });
      console.log('📸 Screenshot saved to debug-phoenix-direct.png');
      
    } else {
      const errorText = await tokenResponse.text();
      console.log(`❌ Token generation failed: ${errorText}`);
    }
    
  } catch (error) {
    console.log('❌ Error testing Phoenix token:', error.message);
  }
  
  return; // Skip the old UI navigation code

  // First check regular tournaments page
  await page.goto('http://localhost:3000/tournaments');
  
  // Wait for page to load
  await page.waitForTimeout(3000);
  
  // Check what's on the page
  const pageTitle = await page.title();
  console.log(`Page title: ${pageTitle}`);
  
  // Check for any error messages
  const errorMessages = await page.locator('.error, [class*="error"], .alert-danger').count();
  if (errorMessages > 0) {
    const errorText = await page.locator('.error, [class*="error"], .alert-danger').first().textContent();
    console.log(`❌ Error message found: ${errorText}`);
  }
  
  // Look for tournaments table
  const tournamentsTable = await page.locator('table').count();
  console.log(`Found ${tournamentsTable} table(s)`);
  
  if (tournamentsTable > 0) {
    const tableHeaders = await page.locator('thead th').allTextContents();
    console.log(`Table headers: ${tableHeaders.join(', ')}`);
    
    // Look for tournaments
    const tournamentRows = await page.locator('tbody tr').count();
    console.log(`Found ${tournamentRows} tournament rows`);
    
    // If no rows, check if table body exists but is empty
    const tbody = await page.locator('tbody').count();
    if (tbody > 0 && tournamentRows === 0) {
      const tbodyContent = await page.locator('tbody').textContent();
      console.log(`Empty tbody content: "${tbodyContent}"`);
    }
  } else {
    // No table found, let's see what's on the page
    const bodyText = await page.locator('body').textContent();
    console.log(`Page body preview: ${bodyText.substring(0, 500)}...`);
    
    // Check if there are tournament cards or links
    const tournamentLinks = await page.locator('a:has-text("Tournament"), button:has-text("Tournament"), [class*="tournament"]').count();
    console.log(`Found ${tournamentLinks} tournament links/cards`);
    
    // Look specifically for "Draft Test Tournament"
    const draftTestTournament = await page.locator('text="Draft Test Tournament"').count();
    if (draftTestTournament > 0) {
      console.log('✅ Found "Draft Test Tournament"');
      
      // Try to find the clickable tournament element
      console.log('Looking for clickable Draft Test Tournament element...');
      
      // Try different approaches to find the clickable element
      let tournamentElement = null;
      
      // Try 1: Direct link/button with tournament text
      const directLink = await page.locator('a:has-text("Draft Test Tournament"), button:has-text("Draft Test Tournament")').count();
      console.log(`Direct links with tournament text: ${directLink}`);
      
      if (directLink > 0) {
        tournamentElement = page.locator('a:has-text("Draft Test Tournament"), button:has-text("Draft Test Tournament")').first();
      } else {
        // Try 2: Find parent container and look for links/buttons
        const parentContainer = page.locator('text="Draft Test Tournament"').locator('..');
        const parentLinks = await parentContainer.locator('a, button').count();
        console.log(`Links/buttons in parent container: ${parentLinks}`);
        
        if (parentLinks > 0) {
          tournamentElement = parentContainer.locator('a, button').first();
        }
      }
      
      if (tournamentElement) {
        console.log('Clicking on Draft Test Tournament element...');
        await tournamentElement.click();
        await page.waitForTimeout(2000);
        
        // Check what page we're on now
        const newUrl = page.url();
        console.log(`Now on page: ${newUrl}`);
        
        // Look for Drafts tab
        const draftsTab = await page.locator('button:has-text("Drafts"), a:has-text("Drafts")').count();
        console.log(`Found ${draftsTab} Drafts tab(s)`);
        
        if (draftsTab > 0) {
          console.log('✅ Found Drafts tab, clicking it...');
          await page.locator('button:has-text("Drafts"), a:has-text("Drafts")').click();
          await page.waitForTimeout(2000);
          
          // Look for "Enter as" buttons
          const enterButtons = await page.locator('button:has-text("Enter as")').count();
          console.log(`Found ${enterButtons} "Enter as" buttons`);
          
          if (enterButtons > 0) {
            console.log('✅ Found "Enter as" buttons! Clicking first one...');
            
            // Click the first "Enter as" button
            await page.locator('button:has-text("Enter as")').first().click();
            await page.waitForTimeout(3000);
            
            // Check current URL
            const finalUrl = page.url();
            console.log(`Final URL: ${finalUrl}`);
            
            // Check if we're on Phoenix page
            if (finalUrl.includes('localhost:4000')) {
              console.log('✅ Successfully redirected to Phoenix draft page');
              
              // Check for warning/error elements
              const hasWarning = await page.locator('.warning, [class*="warning"], .error, [class*="error"], text="Authentication failed"').count();
              if (hasWarning > 0) {
                console.log('❌ Found warning/error elements on Phoenix page');
                const warningText = await page.locator('.warning, [class*="warning"], .error, [class*="error"], text="Authentication failed"').first().textContent();
                console.log(`Warning text: ${warningText}`);
              } else {
                console.log('✅ No warning elements found - Phoenix page looks good!');
              }
              
              // Take screenshot
              await page.screenshot({ path: 'H:\\Project Folder\\Predecessor website\\debug-phoenix-success.png', fullPage: true });
              console.log('📸 Screenshot saved to debug-phoenix-success.png');
            } else {
              console.log(`❌ Did not redirect to Phoenix page. Still on: ${finalUrl}`);
            }
          }
        }
      } else {
        console.log('❌ Could not find clickable element for Draft Test Tournament');
      }
    }
  }
  
  // Check if there are any tournaments
  const tournamentRows = tournamentsTable > 0 ? await page.locator('tbody tr').count() : 0;

  if (tournamentRows > 0) {
    // Click the Drafts tab on the first tournament
    await page.locator('tbody tr').first().locator('button:has-text("Drafts")').click();
    
    // Wait for drafts modal to open
    await page.waitForSelector('.modal', { timeout: 5000 });
    console.log('Drafts modal opened');

    // Look for "Enter as" buttons
    const enterButtons = await page.locator('button:has-text("Enter as")').count();
    console.log(`Found ${enterButtons} "Enter as" buttons`);

    if (enterButtons > 0) {
      console.log('Clicking first "Enter as" button...');
      
      // Click the first "Enter as" button
      await page.locator('button:has-text("Enter as")').first().click();
      
      // Wait a moment for any console logs/network requests
      await page.waitForTimeout(3000);
      
      // Print all console logs
      console.log('\n=== CONSOLE LOGS ===');
      consoleLogs.forEach(log => console.log(log));
      
      // Print network requests
      console.log('\n=== NETWORK REQUESTS ===');
      networkRequests.slice(-10).forEach(req => console.log(req)); // Last 10 requests
      
      // Check current URL
      console.log(`\n=== CURRENT URL ===`);
      console.log(page.url());
      
      // Check if we're on Phoenix page
      if (page.url().includes('localhost:4000')) {
        console.log('✅ Redirected to Phoenix draft page');
        
        // Check for warning triangle or authentication failed message
        const hasWarning = await page.locator('.warning, [class*="warning"], .error, [class*="error"]').count();
        if (hasWarning > 0) {
          console.log('❌ Found warning/error elements on Phoenix page');
          const warningText = await page.locator('.warning, [class*="warning"], .error, [class*="error"]').first().textContent();
          console.log(`Warning text: ${warningText}`);
        } else {
          console.log('✅ No warning elements found');
        }
        
        // Check for authentication failed text
        const authFailedElements = await page.locator('text="Authentication failed"').count();
        if (authFailedElements > 0) {
          console.log('❌ Found "Authentication failed" text');
        } else {
          console.log('✅ No "Authentication failed" text found');
        }
        
        // Take screenshot for visual inspection
        await page.screenshot({ path: 'H:\\Project Folder\\Predecessor website\\debug-phoenix-page.png', fullPage: true });
        console.log('📸 Screenshot saved to debug-phoenix-page.png');
      }
      
    } else {
      console.log('❌ No "Enter as" buttons found');
    }
  } else {
    console.log('❌ No tournament rows found');
  }
});