const { chromium } = require('playwright');

async function reproduceBracketPublishIssue() {
  let browser;
  
  try {
    console.log('🎭 REPRODUCING BRACKET PUBLISH ISSUE WITH PLAYWRIGHT...\n');
    
    browser = await chromium.launch({ 
      headless: false, // Show browser to see what happens
      slowMo: 2000     // Slow down to observe
    });
    
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Listen to console messages
    page.on('console', msg => {
      console.log(`🖥️  BROWSER: ${msg.type()}: ${msg.text()}`);
    });
    
    // Listen to network requests
    page.on('request', request => {
      if (request.url().includes('/bracket')) {
        console.log(`📡 REQUEST: ${request.method()} ${request.url()}`);
      }
    });
    
    // Listen to network responses
    page.on('response', response => {
      if (response.url().includes('/bracket')) {
        console.log(`📥 RESPONSE: ${response.status()} ${response.url()}`);
        if (response.status() >= 400) {
          console.log(`❌ ERROR RESPONSE: ${response.status()}`);
        }
      }
    });
    
    console.log('🌐 Navigating to tournament site...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    
    // Wait for page to fully load
    await page.waitForTimeout(3000);
    
    console.log('🔍 Looking for tournaments...');
    
    // Try to find "test admin panel" tournament
    const tournament = page.locator('text="test admin panel"');
    
    if (await tournament.isVisible({ timeout: 5000 })) {
      console.log('✅ Found "test admin panel" tournament - clicking...');
      await tournament.first().click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      
      console.log('🎯 Looking for Bracket tab...');
      
      // Find and click Bracket tab
      const bracketTab = page.locator('[role="tab"]:has-text("Bracket"), .tab:has-text("Bracket"), button:has-text("Bracket")').first();
      
      if (await bracketTab.isVisible({ timeout: 5000 })) {
        console.log('✅ Found Bracket tab - clicking...');
        await bracketTab.click();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(3000);
        
        console.log('🔍 Looking for bracket generation/publish controls...');
        
        // Look for various bracket-related buttons
        const generateButton = page.locator('button:has-text("Generate"), button:has-text("Regenerate")');
        const publishButton = page.locator('button:has-text("Publish")');
        const unpublishButton = page.locator('button:has-text("Unpublish")');
        
        console.log(`Generate buttons found: ${await generateButton.count()}`);
        console.log(`Publish buttons found: ${await publishButton.count()}`);  
        console.log(`Unpublish buttons found: ${await unpublishButton.count()}`);
        
        // Check if bracket is already published
        const publishedBadge = page.locator('.published-badge, :has-text("Published")');
        const isCurrentlyPublished = await publishedBadge.count() > 0;
        
        console.log(`Is bracket currently published: ${isCurrentlyPublished}`);
        
        if (isCurrentlyPublished && await unpublishButton.isVisible()) {
          console.log('📝 Bracket is published - unpublishing first to test the publish flow...');
          await unpublishButton.click();
          await page.waitForTimeout(2000);
        }
        
        // Generate/regenerate bracket first if needed
        if (await generateButton.isVisible()) {
          console.log('🎲 Generating bracket...');
          await generateButton.first().click();
          await page.waitForTimeout(3000);
        }
        
        // Now try to publish
        if (await publishButton.isVisible()) {
          console.log('🚀 ATTEMPTING TO PUBLISH BRACKET...');
          console.log('This should reproduce the issue: success message + error message');
          
          // Start listening for toast messages
          const toastMessages = [];
          
          // Click publish
          await publishButton.first().click();
          
          // Handle the confirmation dialog if it appears
          page.on('dialog', async dialog => {
            console.log(`📢 DIALOG: ${dialog.message()}`);
            await dialog.accept();
          });
          
          // Wait for responses and toast messages
          await page.waitForTimeout(5000);
          
          // Check for toast messages (they might be in various containers)
          const successToast = page.locator(':has-text("Bracket published"), :has-text("All teams are now locked")');
          const errorToast = page.locator(':has-text("Failed to save"), :has-text("try again")');
          
          const successFound = await successToast.count() > 0;
          const errorFound = await errorToast.count() > 0;
          
          console.log(`\n🎯 ISSUE REPRODUCTION RESULTS:`);
          console.log(`   Success message shown: ${successFound}`);
          console.log(`   Error message shown: ${errorFound}`);
          
          if (successFound && errorFound) {
            console.log('🚨 ISSUE REPRODUCED! Both success and error messages appeared');
          } else if (successFound && !errorFound) {
            console.log('✅ Publish appears to have worked correctly');
          } else if (!successFound && errorFound) {
            console.log('❌ Publish failed completely');
          } else {
            console.log('❓ Unclear result - no clear success or error messages');
          }
          
          // Wait a bit more then check if bracket persists
          await page.waitForTimeout(3000);
          
          console.log('🔄 Testing persistence - refreshing page...');
          await page.reload({ waitUntil: 'networkidle' });
          await page.waitForTimeout(3000);
          
          // Check if bracket tab still works
          const bracketTabAfter = page.locator('[role="tab"]:has-text("Bracket"), .tab:has-text("Bracket"), button:has-text("Bracket")').first();
          if (await bracketTabAfter.isVisible()) {
            await bracketTabAfter.click();
            await page.waitForTimeout(2000);
            
            const publishedBadgeAfter = page.locator('.published-badge, :has-text("Published")');
            const persistedPublished = await publishedBadgeAfter.count() > 0;
            
            console.log(`🔍 Bracket published state persisted: ${persistedPublished}`);
            
            if (!persistedPublished) {
              console.log('❌ CONFIRMED: Bracket publish state was lost on refresh!');
            }
          }
          
        } else {
          console.log('❌ No publish button found - bracket might already be published or user lacks permissions');
        }
        
      } else {
        console.log('❌ Could not find Bracket tab');
      }
      
    } else {
      console.log('❌ Could not find "test admin panel" tournament');
      
      // Check if we're on the login page
      const loginIndicator = page.locator(':has-text("Login"), :has-text("Sign in"), :has-text("Discord")');
      if (await loginIndicator.count() > 0) {
        console.log('🔐 User appears to need to login first');
      }
      
      // Show what tournaments are available
      const tournaments = await page.locator('.tournament-card, [data-testid="tournament"], .tournament-name').allTextContents();
      console.log('Available tournaments:', tournaments.slice(0, 10));
    }
    
    console.log('📸 Taking final screenshot...');
    await page.screenshot({ path: 'bracket-publish-issue.png', fullPage: true });
    
  } catch (error) {
    console.error('❌ Playwright test failed:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
  
  console.log('\n🎭 Playwright test completed');
  process.exit(0);
}

reproduceBracketPublishIssue();