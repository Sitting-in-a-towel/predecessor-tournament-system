const { chromium } = require('playwright');

async function comprehensiveDraftTest() {
  console.log('\n=== COMPREHENSIVE DRAFT TEST ===\n');
  
  const browser = await chromium.launch({ headless: false, slowMo: 1000 });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Step 1: Login with Discord
    console.log('1. Navigating to login...');
    await page.goto('http://localhost:3000');
    await page.waitForTimeout(2000);
    
    // Check if already logged in
    const isLoggedIn = await page.locator('text="Login with Discord"').count() === 0;
    console.log(`   Already logged in: ${isLoggedIn}`);
    
    if (!isLoggedIn) {
      console.log('   Clicking Login with Discord...');
      await page.click('text="Login with Discord"');
      
      // Wait for Discord OAuth or local auth
      await page.waitForTimeout(5000);
      
      // Check if we're back to the main page (successful auth)
      const currentUrl = page.url();
      console.log(`   Current URL after auth: ${currentUrl}`);
    }
    
    // Step 2: Navigate to tournament
    console.log('2. Navigating to tournament...');
    await page.goto('http://localhost:3000/tournaments/67e81a0d-1165-4481-ad58-85da372f86d5');
    await page.waitForTimeout(3000);
    
    // Step 3: Check authentication status
    console.log('3. Checking authentication...');
    const pageText = await page.textContent('body');
    const hasUserName = pageText.includes('TestCaptain') || pageText.includes('admin');
    console.log(`   Has user info: ${hasUserName}`);
    
    // Step 4: Click Drafts tab
    console.log('4. Clicking Drafts tab...');
    const draftsTab = page.locator('.tab:has-text("Drafts")');
    await draftsTab.click();
    await page.waitForTimeout(3000);
    
    // Take screenshot
    await page.screenshot({ path: 'auth-drafts-page.png', fullPage: true });
    console.log('   Screenshot: auth-drafts-page.png');
    
    // Step 5: Check for create draft UI
    console.log('5. Looking for create draft interface...');
    const createSection = page.locator('.create-draft-section');
    const createSectionCount = await createSection.count();
    console.log(`   Create draft sections: ${createSectionCount}`);
    
    if (createSectionCount > 0) {
      console.log('6. Found create draft interface!');
      
      // Check for match selection dropdown
      const matchSelect = page.locator('select[data-testid="match-select"], select');
      const selectCount = await matchSelect.count();
      console.log(`   Match select dropdowns: ${selectCount}`);
      
      if (selectCount > 0) {
        console.log('7. Testing draft creation...');
        
        // Get available options
        const options = await matchSelect.first().locator('option').allTextContents();
        console.log(`   Available matches: ${options.join(', ')}`);
        
        // Select a match (look for Thunder Hawks vs Storm Eagles)
        const thunderHawksMatch = options.find(opt => 
          opt.includes('Thunder Hawks') && opt.includes('Storm Eagles')
        );
        
        if (thunderHawksMatch) {
          console.log(`   Selecting match: ${thunderHawksMatch}`);
          await matchSelect.first().selectOption({ label: thunderHawksMatch });
          await page.waitForTimeout(1000);
          
          // Click create button
          const createButton = page.locator('button:has-text("Create Draft")');
          if (await createButton.count() > 0) {
            console.log('8. Clicking Create Draft...');
            await createButton.click();
            await page.waitForTimeout(5000);
            
            // Check if draft was created
            const afterCreation = await page.locator('[class*="draft"], .draft-item').count();
            console.log(`   Draft elements after creation: ${afterCreation}`);
            
            // Look for "Enter as" buttons
            const enterButtons = await page.locator('button:has-text("Enter as"), a:has-text("Enter as")').count();
            console.log(`   "Enter as" buttons found: ${enterButtons}`);
            
            if (enterButtons > 0) {
              console.log('9. Testing "Enter as" button...');
              
              // Take screenshot of created draft
              await page.screenshot({ path: 'created-draft.png', fullPage: true });
              console.log('   Screenshot: created-draft.png');
              
              // Click first "Enter as" button
              const firstEnterButton = page.locator('button:has-text("Enter as"), a:has-text("Enter as")').first();
              await firstEnterButton.click();
              await page.waitForTimeout(3000);
              
              // Check if we navigated to Phoenix draft
              const phoenixUrl = page.url();
              console.log(`   Phoenix URL: ${phoenixUrl}`);
              
              if (phoenixUrl.includes('localhost:4000') || phoenixUrl.includes('draft')) {
                console.log('10. ✅ Successfully navigated to Phoenix draft interface!');
                
                // Take screenshot of Phoenix interface
                await page.screenshot({ path: 'phoenix-draft.png', fullPage: true });
                console.log('    Screenshot: phoenix-draft.png');
                
                // Check Phoenix interface elements
                const phoenixText = await page.textContent('body');
                const hasThunderHawks = phoenixText.includes('Thunder Hawks');
                const hasStormEagles = phoenixText.includes('Storm Eagles');
                const hasDraftInterface = phoenixText.includes('Draft') || phoenixText.includes('Pick') || phoenixText.includes('Ban');
                
                console.log(`    Has Thunder Hawks: ${hasThunderHawks}`);
                console.log(`    Has Storm Eagles: ${hasStormEagles}`);
                console.log(`    Has draft interface: ${hasDraftInterface}`);
                
                if (hasThunderHawks && hasStormEagles && hasDraftInterface) {
                  console.log('    ✅ Phoenix draft interface working correctly!');
                } else {
                  console.log('    ⚠️ Phoenix interface may have issues');
                }
              } else {
                console.log('    ❌ Did not navigate to Phoenix interface');
              }
            } else {
              console.log('   ❌ No "Enter as" buttons found after creation');
            }
          } else {
            console.log('   ❌ Create button not found');
          }
        } else {
          console.log('   ⚠️ Thunder Hawks vs Storm Eagles match not found');
          console.log(`   Available options: ${options.join(', ')}`);
        }
      } else {
        console.log('   ❌ No match selection dropdown found');
      }
    } else {
      console.log('   ❌ No create draft interface found - likely authentication issue');
      
      // Debug authentication
      const userElements = await page.locator('[data-user], .user-info, .profile').count();
      console.log(`   User elements: ${userElements}`);
      
      // Check if login button still visible
      const loginButton = await page.locator('text="Login with Discord"').count();
      console.log(`   Login button still visible: ${loginButton > 0}`);
    }
    
    console.log('\n✅ Comprehensive test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    await page.screenshot({ path: 'comprehensive-test-error.png', fullPage: true });
  } finally {
    await browser.close();
  }
  
  console.log('\n=== COMPREHENSIVE TEST COMPLETE ===\n');
}

comprehensiveDraftTest();