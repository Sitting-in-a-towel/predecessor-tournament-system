const { chromium } = require('playwright');

async function simpleDraftTest() {
  console.log('\n=== SIMPLE DRAFT TEST ===\n');
  
  const browser = await chromium.launch({ headless: false, slowMo: 500 });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Step 1: Go directly to tournament page (using tournament_id, not id)
    console.log('1. Navigating to tournament page...');
    await page.goto('http://localhost:3000/tournament/67e81a0d-1165-4481-ad58-85da372f86d5');
    await page.waitForTimeout(3000);
    
    // Take initial screenshot
    await page.screenshot({ path: 'tournament-page.png', fullPage: true });
    console.log('   Screenshot: tournament-page.png');
    
    // Step 2: Look for drafts tab
    console.log('2. Looking for Drafts tab...');
    const draftsTab = page.locator('text="Drafts"');
    const draftsTabCount = await draftsTab.count();
    console.log(`   Found ${draftsTabCount} "Drafts" elements`);
    
    if (draftsTabCount > 0) {
      console.log('3. Clicking Drafts tab...');
      await draftsTab.first().click();
      await page.waitForTimeout(2000);
      
      // Take screenshot of drafts tab
      await page.screenshot({ path: 'drafts-tab.png', fullPage: true });
      console.log('   Screenshot: drafts-tab.png');
      
      // Check current page content
      const pageContent = await page.content();
      const hasDraftContent = pageContent.includes('draft') || pageContent.includes('Draft');
      console.log(`   Page contains draft content: ${hasDraftContent}`);
      
      // Look for draft-related elements
      const createButtons = await page.locator('button:has-text("Create"), button:has-text("Start")').count();
      const selectElements = await page.locator('select').count();
      const draftElements = await page.locator('[class*="draft"], [id*="draft"]').count();
      
      console.log(`   Create/Start buttons: ${createButtons}`);
      console.log(`   Select dropdowns: ${selectElements}`);
      console.log(`   Draft elements: ${draftElements}`);
      
      // Check network requests
      const responses = [];
      page.on('response', response => {
        if (response.url().includes('draft')) {
          responses.push(`${response.status()} ${response.url()}`);
        }
      });
      
      // Refresh to trigger API calls
      console.log('4. Refreshing page to check API calls...');
      await page.reload();
      await page.waitForTimeout(3000);
      
      console.log('   Draft-related API responses:');
      responses.forEach(resp => console.log(`     ${resp}`));
      
    } else {
      console.log('   ❌ No Drafts tab found');
    }
    
    // Final screenshot
    await page.screenshot({ path: 'final-state.png', fullPage: true });
    console.log('   Final screenshot: final-state.png');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    await page.screenshot({ path: 'error-state.png', fullPage: true });
  } finally {
    await browser.close();
  }
  
  console.log('\n=== SIMPLE TEST COMPLETE ===\n');
}

simpleDraftTest();