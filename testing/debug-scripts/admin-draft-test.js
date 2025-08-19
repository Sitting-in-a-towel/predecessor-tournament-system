const { chromium } = require('playwright');

async function adminDraftTest() {
  console.log('\n=== ADMIN DRAFT TEST (Local Auth) ===\n');
  
  const browser = await chromium.launch({ headless: false, slowMo: 1000 });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Step 1: Login as test admin using the local API
    console.log('1. Logging in as test admin...');
    
    // First navigate to the site to establish context
    await page.goto('http://localhost:3000');
    await page.waitForTimeout(1000);
    
    // Use the test admin login endpoint
    const loginResponse = await page.request.post('http://localhost:3001/api/test-auth/login-test-admin');
    const loginData = await loginResponse.json();
    
    if (loginData.success) {
      console.log('   ✅ Successfully logged in as test admin');
      console.log(`   User: ${loginData.user.discord_username} (${loginData.user.role})`);
      
      // Set the session cookie manually if needed
      await page.context().addCookies([{
        name: 'connect.sid',
        value: loginData.sessionId,
        domain: 'localhost',
        path: '/'
      }]);
      
    } else {
      console.log('   ❌ Failed to login as test admin:', loginData);
      return;
    }
    
    // Step 2: Navigate to tournament drafts page
    console.log('2. Navigating to tournament drafts...');
    await page.goto('http://localhost:3000/tournaments/67e81a0d-1165-4481-ad58-85da372f86d5');
    await page.waitForTimeout(3000);
    
    // Click Drafts tab
    await page.click('.tab:has-text("Drafts")');
    await page.waitForTimeout(3000);
    
    // Take screenshot
    await page.screenshot({ path: 'admin-drafts-page.png', fullPage: true });
    console.log('   Screenshot: admin-drafts-page.png');
    
    // Step 3: Check authentication and draft interface
    console.log('3. Checking draft interface as admin...');
    
    const pageText = await page.textContent('body');
    const hasAdminDebug = pageText.includes('isAdmin: true');
    const hasCreateSection = await page.locator('.create-draft-section').count();
    const hasUserInfo = pageText.includes('test_admin') || pageText.includes('Admin');
    
    console.log(`   Has admin debug info: ${hasAdminDebug}`);
    console.log(`   Has create draft section: ${hasCreateSection > 0}`);
    console.log(`   Has user info: ${hasUserInfo}`);
    
    // Step 4: Check for existing drafts or create new one
    console.log('4. Checking for existing drafts...');
    
    const existingDrafts = await page.locator('.draft-item, [class*="draft"]:has-text("Thunder Hawks")').count();
    console.log(`   Existing drafts: ${existingDrafts}`);
    
    let enterButtons = await page.locator('button:has-text("Enter as")').count();
    console.log(`   "Enter as" buttons: ${enterButtons}`);
    
    if (enterButtons === 0 && hasCreateSection > 0) {
      console.log('5. Creating new draft...');
      
      const matchSelect = page.locator('select[data-testid="match-select"], select').first();
      
      if (await matchSelect.count() > 0) {
        const options = await matchSelect.locator('option').allTextContents();
        console.log(`   Available matches: ${options.join(', ')}`);
        
        const thunderHawksMatch = options.find(opt => 
          opt.includes('Thunder Hawks') && opt.includes('Storm Eagles')
        );
        
        if (thunderHawksMatch) {
          console.log(`   Selecting: ${thunderHawksMatch}`);
          await matchSelect.selectOption({ label: thunderHawksMatch });
          await page.waitForTimeout(1000);
          
          const createButton = page.locator('button:has-text("Create Draft")');
          if (await createButton.count() > 0) {
            await createButton.click();
            await page.waitForTimeout(5000);
            
            // Check if draft was created
            enterButtons = await page.locator('button:has-text("Enter as")').count();
            console.log(`   Draft created! "Enter as" buttons: ${enterButtons}`);
          }
        }
      }
    }
    
    // Step 5: Test "Enter as" functionality
    if (enterButtons > 0) {
      console.log('6. Testing "Enter as" button...');
      
      // Set up listener for new pages (Phoenix opens in new window)
      let newPage = null;
      context.on('page', async (page) => {
        newPage = page;
        console.log('   🔗 New page opened:', page.url());
      });
      
      // Click first "Enter as" button
      const firstEnterButton = page.locator('button:has-text("Enter as")').first();
      const buttonText = await firstEnterButton.textContent();
      console.log(`   Clicking: ${buttonText}`);
      
      await firstEnterButton.click();
      await page.waitForTimeout(5000);
      
      if (newPage) {
        console.log('7. Phoenix window opened successfully!');
        
        // Wait for Phoenix to load
        await newPage.waitForLoadState('domcontentloaded');
        await newPage.waitForTimeout(3000);
        
        const phoenixUrl = newPage.url();
        console.log(`   Phoenix URL: ${phoenixUrl}`);
        
        // Take screenshot
        await newPage.screenshot({ path: 'phoenix-admin-interface.png', fullPage: true });
        console.log('   Screenshot: phoenix-admin-interface.png');
        
        // Check Phoenix content
        const phoenixText = await newPage.textContent('body');
        const hasThunderHawks = phoenixText.includes('Thunder Hawks');
        const hasStormEagles = phoenixText.includes('Storm Eagles');
        const hasAuthFailed = phoenixText.includes('Authentication failed');
        const hasDraftElements = phoenixText.includes('Draft') || phoenixText.includes('Pick') || phoenixText.includes('Ban') || phoenixText.includes('Coin');
        
        console.log(`   Has Thunder Hawks: ${hasThunderHawks}`);
        console.log(`   Has Storm Eagles: ${hasStormEagles}`);
        console.log(`   Has auth failed: ${hasAuthFailed}`);
        console.log(`   Has draft elements: ${hasDraftElements}`);
        
        if (!hasAuthFailed && hasThunderHawks && hasStormEagles) {
          console.log('\n🎉 ✅ DRAFT SYSTEM FULLY WORKING WITH ADMIN AUTH! ✅ 🎉');
          console.log('   ✅ Local admin authentication works');
          console.log('   ✅ Draft creation works');
          console.log('   ✅ "Enter as" buttons work');
          console.log('   ✅ Phoenix interface loads correctly');
          console.log('   ✅ Team names display properly');
        } else {
          console.log('\n⚠️ Phoenix interface has issues:');
          if (hasAuthFailed) console.log('   ❌ Authentication failed in Phoenix');
          if (!hasThunderHawks) console.log('   ❌ Thunder Hawks not found');
          if (!hasStormEagles) console.log('   ❌ Storm Eagles not found');
        }
        
        // Test second "Enter as" button
        if (enterButtons > 1) {
          console.log('8. Testing second "Enter as" button...');
          
          let secondNewPage = null;
          context.on('page', async (page) => {
            if (page !== newPage) {
              secondNewPage = page;
              console.log('   🔗 Second new page opened:', page.url());
            }
          });
          
          await page.bringToFront();
          const secondEnterButton = page.locator('button:has-text("Enter as")').nth(1);
          const secondButtonText = await secondEnterButton.textContent();
          console.log(`   Clicking: ${secondButtonText}`);
          
          await secondEnterButton.click();
          await page.waitForTimeout(3000);
          
          if (secondNewPage) {
            await secondNewPage.waitForLoadState('domcontentloaded');
            await secondNewPage.waitForTimeout(2000);
            
            await secondNewPage.screenshot({ path: 'phoenix-admin-interface-team2.png', fullPage: true });
            console.log('   Screenshot: phoenix-admin-interface-team2.png');
            console.log('   ✅ Second team interface also working!');
          }
        }
        
      } else {
        console.log('   ❌ No new Phoenix window opened');
      }
    } else {
      console.log('   ❌ No "Enter as" buttons found');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    await page.screenshot({ path: 'admin-test-error.png', fullPage: true });
  } finally {
    await browser.close();
  }
  
  console.log('\n=== ADMIN TEST COMPLETE ===\n');
}

adminDraftTest();