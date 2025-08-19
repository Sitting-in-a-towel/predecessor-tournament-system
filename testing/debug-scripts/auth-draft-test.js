const { chromium } = require('playwright');

async function authDraftTest() {
  console.log('\n=== AUTHENTICATED DRAFT TEST ===\n');
  
  const browser = await chromium.launch({ headless: false, slowMo: 500 });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Step 1: Navigate to home page
    console.log('1. Navigating to home page...');
    await page.goto('http://localhost:3000');
    await page.waitForTimeout(2000);
    
    // Step 2: Login with Discord
    console.log('2. Clicking Login with Discord...');
    await page.click('text="Login with Discord"');
    await page.waitForTimeout(3000);
    
    // After login, we should be redirected back to the home page
    console.log('3. After login, navigating to tournament...');
    await page.goto('http://localhost:3000/tournament/67e81a0d-1165-4481-ad58-85da372f86d5');
    await page.waitForTimeout(3000);
    
    // Take screenshot of tournament page
    await page.screenshot({ path: 'authenticated-tournament.png', fullPage: true });
    console.log('   Screenshot: authenticated-tournament.png');
    
    // Step 4: Look for Drafts tab
    console.log('4. Looking for Drafts tab...');
    const draftsTab = page.locator('text="Drafts"');
    const draftsTabCount = await draftsTab.count();
    console.log(`   Found ${draftsTabCount} "Drafts" elements`);
    
    if (draftsTabCount > 0) {
      console.log('5. Clicking Drafts tab...');
      await draftsTab.first().click();
      await page.waitForTimeout(2000);
      
      // Take screenshot of drafts tab
      await page.screenshot({ path: 'drafts-tab-auth.png', fullPage: true });
      console.log('   Screenshot: drafts-tab-auth.png');
      
      // Look for draft creation elements
      const createElements = await page.locator('button:has-text("Create"), select').count();
      console.log(`   Found ${createElements} creation elements`);
      
      // Look for existing drafts
      const draftElements = await page.locator('[class*="draft"]').count();
      console.log(`   Found ${draftElements} draft elements`);
      
      // Check page text for draft-related content
      const pageText = await page.textContent('body');
      const hasCreateDraft = pageText.includes('Create Draft') || pageText.includes('create draft');
      const hasTeamSelection = pageText.includes('Team 1') || pageText.includes('Team 2');
      
      console.log(`   Has "Create Draft" text: ${hasCreateDraft}`);
      console.log(`   Has team selection: ${hasTeamSelection}`);
      
    } else {
      console.log('   ❌ No Drafts tab found after authentication');
      
      // Show all available tabs
      const allTabs = await page.locator('.tab, [role="tab"]').allTextContents();
      console.log(`   Available tabs: ${allTabs.join(', ')}`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    await page.screenshot({ path: 'auth-test-error.png', fullPage: true });
  } finally {
    await browser.close();
  }
  
  console.log('\n=== AUTH TEST COMPLETE ===\n');
}

authDraftTest();