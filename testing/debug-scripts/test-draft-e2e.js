const { chromium } = require('playwright');

async function testDraftCreation() {
  console.log('\n=== TESTING DRAFT CREATION E2E ===\n');
  
  const browser = await chromium.launch({ headless: false, slowMo: 1000 });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Step 1: Navigate to frontend
    console.log('1. Navigating to frontend...');
    await page.goto('http://localhost:3000');
    await page.waitForTimeout(2000);
    
    // Step 2: Login as admin
    console.log('2. Logging in as admin...');
    await page.click('text="Login"');
    await page.waitForTimeout(1000);
    
    await page.fill('input[name="username"]', 'admin');
    await page.fill('input[name="password"]', 'admin');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    
    // Step 3: Navigate to tournament page
    console.log('3. Navigating to tournament...');
    await page.goto('http://localhost:3000/tournament/4fe28137-a1c3-426e-bfa0-1ae9c54f58a0');
    await page.waitForTimeout(2000);
    
    // Step 4: Go to Drafts tab
    console.log('4. Clicking Drafts tab...');
    await page.click('text="Drafts"');
    await page.waitForTimeout(1000);
    
    // Step 5: Check current state
    console.log('5. Checking current drafts...');
    const draftsContainer = await page.locator('.drafts-container, [data-testid="drafts-list"]').first();
    const draftCount = await page.locator('.draft-item, .draft-session').count();
    console.log(`   Current drafts visible: ${draftCount}`);
    
    // Step 6: Try to create a draft
    console.log('6. Creating new draft...');
    
    // Look for create draft button or team select dropdowns
    const createButton = page.locator('button:has-text("Create Draft"), button:has-text("Start Draft")');
    const team1Select = page.locator('select:near(text="Team 1"), select[name*="team1"]').first();
    const team2Select = page.locator('select:near(text="Team 2"), select[name*="team2"]').first();
    
    if (await createButton.count() > 0) {
      console.log('   Found create draft button');
      await createButton.first().click();
      await page.waitForTimeout(1000);
    }
    
    if (await team1Select.count() > 0 && await team2Select.count() > 0) {
      console.log('   Found team selection dropdowns');
      
      // Select teams
      await team1Select.selectOption({ index: 1 }); // Select first available team
      await page.waitForTimeout(500);
      await team2Select.selectOption({ index: 2 }); // Select second available team
      await page.waitForTimeout(500);
      
      // Click create/submit button
      const submitButton = page.locator('button:has-text("Create"), button:has-text("Submit"), button[type="submit"]');
      if (await submitButton.count() > 0) {
        console.log('   Clicking submit button...');
        await submitButton.first().click();
        await page.waitForTimeout(3000);
      }
    }
    
    // Step 7: Check if draft was created
    console.log('7. Checking if draft was created...');
    await page.waitForTimeout(2000);
    
    const newDraftCount = await page.locator('.draft-item, .draft-session').count();
    console.log(`   Drafts after creation attempt: ${newDraftCount}`);
    
    if (newDraftCount > draftCount) {
      console.log('   ✅ New draft appears to have been created!');
      
      // Step 8: Check if "Enter as" buttons are visible
      console.log('8. Checking "Enter as" buttons...');
      const enterButtons = page.locator('button:has-text("Enter as"), a:has-text("Enter as")');
      const buttonCount = await enterButtons.count();
      console.log(`   Found ${buttonCount} "Enter as" buttons`);
      
      if (buttonCount > 0) {
        console.log('   ✅ "Enter as" buttons are visible!');
        
        // Test clicking one of them
        console.log('9. Testing "Enter as" button click...');
        await enterButtons.first().click();
        await page.waitForTimeout(2000);
        
        // Check if we navigated to Phoenix draft interface
        const currentUrl = page.url();
        console.log(`   Current URL after click: ${currentUrl}`);
        
        if (currentUrl.includes('localhost:4000') || currentUrl.includes('draft')) {
          console.log('   ✅ Successfully navigated to draft interface!');
        } else {
          console.log('   ⚠️ Did not navigate to expected draft interface');
        }
      } else {
        console.log('   ❌ No "Enter as" buttons found');
      }
    } else {
      console.log('   ❌ No new draft was created');
      
      // Check for error messages
      const errorMsg = await page.locator('.error, .alert-danger, [role="alert"]').textContent().catch(() => null);
      if (errorMsg) {
        console.log(`   Error message: ${errorMsg}`);
      }
    }
    
    // Step 10: Take screenshot for debugging
    console.log('10. Taking screenshot...');
    await page.screenshot({ path: 'draft-test-result.png', fullPage: true });
    console.log('   Screenshot saved as draft-test-result.png');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    await page.screenshot({ path: 'draft-test-error.png', fullPage: true });
  } finally {
    await browser.close();
  }
  
  console.log('\n=== E2E TEST COMPLETE ===\n');
}

testDraftCreation();