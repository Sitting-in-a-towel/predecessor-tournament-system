const { chromium } = require('playwright');

async function directTournamentTest() {
  console.log('\n=== DIRECT TOURNAMENT TEST ===\n');
  
  const browser = await chromium.launch({ headless: false, slowMo: 1000 });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Step 1: Go directly to tournament detail page
    console.log('1. Navigating directly to tournament detail...');
    await page.goto('http://localhost:3000/tournaments/67e81a0d-1165-4481-ad58-85da372f86d5');
    await page.waitForTimeout(5000);
    
    // Step 2: Take screenshot
    await page.screenshot({ path: 'tournament-detail.png', fullPage: true });
    console.log('   Screenshot: tournament-detail.png');
    
    // Step 3: Check page content
    const pageText = await page.textContent('body');
    const hasTestAdminPanel = pageText.includes('test admin panel');
    console.log(`   Has tournament name: ${hasTestAdminPanel}`);
    
    // Step 4: Look for tabs specifically
    const tabs = await page.locator('.tab').allTextContents();
    console.log(`   Tabs found: [${tabs.join(', ')}]`);
    
    // Step 5: Look for Drafts tab specifically
    const draftsTab = page.locator('.tab:has-text("Drafts")');
    const draftsTabCount = await draftsTab.count();
    console.log(`   Drafts tab count: ${draftsTabCount}`);
    
    if (draftsTabCount > 0) {
      console.log('2. Clicking Drafts tab...');
      await draftsTab.click();
      await page.waitForTimeout(3000);
      
      // Take screenshot of drafts content
      await page.screenshot({ path: 'drafts-content.png', fullPage: true });
      console.log('   Screenshot: drafts-content.png');
      
      // Check for draft creation elements
      const createButton = await page.locator('button:has-text("Create")').count();
      const selectDropdowns = await page.locator('select').count();
      console.log(`   Create buttons: ${createButton}`);
      console.log(`   Select dropdowns: ${selectDropdowns}`);
      
      // Look for specific draft elements
      const draftElements = await page.locator('[class*="draft"]').count();
      console.log(`   Draft elements: ${draftElements}`);
      
      // Test creating a draft if possible
      if (selectDropdowns >= 2) {
        console.log('3. Testing draft creation...');
        
        const team1Select = page.locator('select').first();
        const team2Select = page.locator('select').nth(1);
        
        await team1Select.selectOption({ index: 1 });
        await page.waitForTimeout(500);
        await team2Select.selectOption({ index: 2 });
        await page.waitForTimeout(500);
        
        const submitButton = page.locator('button:has-text("Create"), button[type="submit"]');
        if (await submitButton.count() > 0) {
          await submitButton.click();
          await page.waitForTimeout(3000);
          
          // Check if draft was created
          const afterCreation = await page.locator('[class*="draft"]').count();
          console.log(`   Draft elements after creation: ${afterCreation}`);
          
          // Look for "Enter as" buttons
          const enterButtons = await page.locator('button:has-text("Enter as")').count();
          console.log(`   "Enter as" buttons: ${enterButtons}`);
        }
      }
    } else {
      console.log('   ❌ No Drafts tab found');
      
      // Debug: check what elements we do have
      const allElements = await page.locator('*').allTextContents();
      const elementTypes = await page.locator('button, .tab, [role="tab"]').allTextContents();
      console.log(`   All button/tab elements: [${elementTypes.join(', ')}]`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    await page.screenshot({ path: 'direct-test-error.png', fullPage: true });
  } finally {
    await browser.close();
  }
  
  console.log('\n=== DIRECT TEST COMPLETE ===\n');
}

directTournamentTest();