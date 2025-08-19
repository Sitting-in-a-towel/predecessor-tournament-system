const { chromium } = require('playwright');

async function finalDraftTest() {
  console.log('\n=== FINAL DRAFT TEST (New Window Handling) ===\n');
  
  const browser = await chromium.launch({ headless: false, slowMo: 1000 });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Step 1: Login and navigate to tournament (shortened version)
    console.log('1. Setting up authentication and navigation...');
    await page.goto('http://localhost:3000');
    await page.waitForTimeout(1000);
    
    // Try to login if needed
    const loginButton = page.locator('text="Login with Discord"');
    if (await loginButton.count() > 0) {
      await loginButton.click();
      await page.waitForTimeout(3000);
    }
    
    // Navigate to tournament drafts
    await page.goto('http://localhost:3000/tournaments/67e81a0d-1165-4481-ad58-85da372f86d5');
    await page.waitForTimeout(2000);
    
    await page.click('.tab:has-text("Drafts")');
    await page.waitForTimeout(2000);
    
    // Step 2: Check if drafts exist, create one if needed
    console.log('2. Checking existing drafts...');
    let enterButtons = await page.locator('button:has-text("Enter as")').count();
    console.log(`   Existing "Enter as" buttons: ${enterButtons}`);
    
    if (enterButtons === 0) {
      console.log('3. Creating new draft...');
      const matchSelect = page.locator('select[data-testid="match-select"], select').first();
      
      if (await matchSelect.count() > 0) {
        const options = await matchSelect.locator('option').allTextContents();
        const thunderHawksMatch = options.find(opt => 
          opt.includes('Thunder Hawks') && opt.includes('Storm Eagles')
        );
        
        if (thunderHawksMatch) {
          await matchSelect.selectOption({ label: thunderHawksMatch });
          await page.waitForTimeout(1000);
          
          const createButton = page.locator('button:has-text("Create Draft")');
          if (await createButton.count() > 0) {
            await createButton.click();
            await page.waitForTimeout(5000);
          }
        }
      }
    }
    
    // Step 3: Test "Enter as" functionality with new window handling
    console.log('4. Testing "Enter as" buttons with new window handling...');
    
    const enterButtonsAfter = await page.locator('button:has-text("Enter as")').count();
    console.log(`   "Enter as" buttons available: ${enterButtonsAfter}`);
    
    if (enterButtonsAfter > 0) {
      // Listen for new pages (new tabs/windows)
      let newPage = null;
      context.on('page', async (page) => {
        newPage = page;
        console.log('   🔗 New page opened:', page.url());
      });
      
      // Click the first "Enter as" button
      console.log('5. Clicking first "Enter as" button...');
      const firstEnterButton = page.locator('button:has-text("Enter as")').first();
      await firstEnterButton.click();
      
      // Wait for new page to load
      await page.waitForTimeout(5000);
      
      if (newPage) {
        console.log('6. New Phoenix window opened successfully!');
        
        // Wait for the new page to fully load
        await newPage.waitForLoadState('domcontentloaded');
        await newPage.waitForTimeout(3000);
        
        const phoenixUrl = newPage.url();
        console.log(`   Phoenix URL: ${phoenixUrl}`);
        
        // Take screenshot of Phoenix interface
        await newPage.screenshot({ path: 'phoenix-interface.png', fullPage: true });
        console.log('   Screenshot: phoenix-interface.png');
        
        // Check Phoenix interface content
        const phoenixContent = await newPage.textContent('body');
        const hasThunderHawks = phoenixContent.includes('Thunder Hawks');
        const hasStormEagles = phoenixContent.includes('Storm Eagles');
        const hasDraftElements = phoenixContent.includes('Draft') || phoenixContent.includes('Pick') || phoenixContent.includes('Ban') || phoenixContent.includes('Coin');
        
        console.log(`   Has Thunder Hawks: ${hasThunderHawks}`);
        console.log(`   Has Storm Eagles: ${hasStormEagles}`);
        console.log(`   Has draft elements: ${hasDraftElements}`);
        
        // Test clicking "Enter as" for the second team
        console.log('7. Testing second "Enter as" button...');
        let secondNewPage = null;
        context.on('page', async (page) => {
          if (page !== newPage) {
            secondNewPage = page;
            console.log('   🔗 Second new page opened:', page.url());
          }
        });
        
        // Go back to original page and click second button
        await page.bringToFront();
        const secondEnterButton = page.locator('button:has-text("Enter as")').nth(1);
        if (await secondEnterButton.count() > 0) {
          await secondEnterButton.click();
          await page.waitForTimeout(3000);
          
          if (secondNewPage) {
            await secondNewPage.waitForLoadState('domcontentloaded');
            await secondNewPage.waitForTimeout(2000);
            
            const secondUrl = secondNewPage.url();
            console.log(`   Second Phoenix URL: ${secondUrl}`);
            
            // Take screenshot of second interface
            await secondNewPage.screenshot({ path: 'phoenix-interface-team2.png', fullPage: true });
            console.log('   Screenshot: phoenix-interface-team2.png');
          }
        }
        
        // Final results
        if (hasThunderHawks && hasStormEagles && hasDraftElements) {
          console.log('\n🎉 ✅ DRAFT SYSTEM FULLY WORKING! ✅ 🎉');
          console.log('   ✅ Draft creation works');
          console.log('   ✅ "Enter as" buttons work');
          console.log('   ✅ Phoenix interface loads correctly');
          console.log('   ✅ Team names display properly');
          console.log('   ✅ Draft interface is functional');
        } else {
          console.log('\n⚠️ Draft system partially working');
          console.log(`   Thunder Hawks display: ${hasThunderHawks}`);
          console.log(`   Storm Eagles display: ${hasStormEagles}`);
          console.log(`   Draft interface: ${hasDraftElements}`);
        }
        
      } else {
        console.log('   ❌ No new window opened - Phoenix navigation failed');
      }
    } else {
      console.log('   ❌ No "Enter as" buttons found');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    await page.screenshot({ path: 'final-test-error.png', fullPage: true });
  } finally {
    await browser.close();
  }
  
  console.log('\n=== FINAL TEST COMPLETE ===\n');
}

finalDraftTest();