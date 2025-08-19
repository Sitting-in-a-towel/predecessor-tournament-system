const { chromium } = require('playwright');

async function reproduceBracketIssues() {
  let browser;
  
  try {
    console.log('🎭 Starting Playwright test to reproduce bracket issues...');
    
    browser = await chromium.launch({ 
      headless: false, // Show browser for debugging
      slowMo: 1000 // Slow down actions
    });
    
    const context = await browser.newContext();
    const page = await context.newPage();
    
    console.log('🌐 Navigating to localhost...');
    await page.goto('http://localhost:3000');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    console.log('📍 Looking for tournaments...');
    
    // Try to find the "test admin panel" tournament
    const tournament = await page.locator('text="test admin panel"').first();
    
    if (await tournament.isVisible()) {
      console.log('✅ Found "test admin panel" tournament');
      await tournament.click();
      await page.waitForLoadState('networkidle');
      
      console.log('🔍 Testing Issue #1: Bracket Tab Persistence');
      
      // Click on Bracket tab
      const bracketTab = await page.locator('[role="tab"]:has-text("Bracket")');
      if (await bracketTab.isVisible()) {
        await bracketTab.click();
        await page.waitForLoadState('networkidle');
        
        // Wait a bit for bracket data to load
        await page.waitForTimeout(2000);
        
        // Check if bracket is visible
        const bracketVisible = await page.locator('.bracket-container, .tournament-bracket, .bracket-grid').count();
        const emptyMessage = await page.locator('text="No bracket data"').count();
        
        console.log(`   Bracket containers found: ${bracketVisible}`);
        console.log(`   "No bracket data" messages: ${emptyMessage}`);
        
        if (bracketVisible === 0 || emptyMessage > 0) {
          console.log('❌ ISSUE #1 CONFIRMED: Published bracket is not showing!');
        } else {
          console.log('✅ Bracket appears to be visible');
        }
        
        console.log('🔍 Testing Issue #2: Draft Dropdown Stale Data');
        
        // Switch to Drafts tab
        const draftsTab = await page.locator('[role="tab"]:has-text("Draft")');
        if (await draftsTab.isVisible()) {
          await draftsTab.click();
          await page.waitForLoadState('networkidle');
          await page.waitForTimeout(1000);
          
          // Look for the match selection dropdown
          const matchDropdown = await page.locator('select, .match-selector, [data-testid="match-select"]');
          
          if (await matchDropdown.count() > 0) {
            const dropdown = matchDropdown.first();
            await dropdown.click();
            
            // Get all options
            const options = await page.locator('option').allTextContents();
            console.log(`   Dropdown options found: ${options.length}`);
            console.log('   Options:', options.slice(0, 5)); // Show first 5
            
            if (options.length > 1) { // More than just "Select match"
              console.log('❌ ISSUE #2 CONFIRMED: Dropdown has options despite no bracket!');
            } else {
              console.log('✅ Dropdown correctly shows no options');
            }
          } else {
            console.log('⚠️  Could not find match dropdown element');
          }
        } else {
          console.log('⚠️  Could not find Drafts tab');
        }
      } else {
        console.log('⚠️  Could not find Bracket tab');
      }
    } else {
      console.log('❌ Could not find "test admin panel" tournament');
      
      // List available tournaments
      const tournaments = await page.locator('.tournament-card, [data-testid="tournament"], .tournament-item').allTextContents();
      console.log('Available tournaments:', tournaments);
    }
    
    console.log('📸 Taking screenshot...');
    await page.screenshot({ path: 'bracket-issues-screenshot.png', fullPage: true });
    
  } catch (error) {
    console.error('❌ Playwright test failed:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
  
  console.log('🎭 Playwright test completed');
  process.exit(0);
}

reproduceBracketIssues();