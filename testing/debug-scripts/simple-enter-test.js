const { chromium } = require('playwright');

async function simpleEnterTest() {
  console.log('\n=== SIMPLE ENTER AS TEST ===\n');
  
  const browser = await chromium.launch({ headless: false, slowMo: 1000 });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Direct navigation to drafts page (we know it works from screenshot)
    console.log('1. Direct navigation to tournament drafts...');
    await page.goto('http://localhost:3000');
    await page.waitForTimeout(1000);
    
    // Login if needed
    const loginButton = page.locator('text="Login with Discord"');
    if (await loginButton.count() > 0) {
      await loginButton.click();
      await page.waitForTimeout(3000);
    }
    
    // Go to drafts page
    await page.goto('http://localhost:3000/tournaments/67e81a0d-1165-4481-ad58-85da372f86d5');
    await page.waitForTimeout(3000);
    
    await page.click('.tab:has-text("Drafts")');
    await page.waitForTimeout(3000);
    
    // Take screenshot to see current state
    await page.screenshot({ path: 'current-drafts-state.png', fullPage: true });
    console.log('   Screenshot: current-drafts-state.png');
    
    // Debug: Check all text content
    const pageText = await page.textContent('body');
    console.log('2. Checking page content...');
    console.log(`   Has Thunder Hawks: ${pageText.includes('Thunder Hawks')}`);
    console.log(`   Has Storm Eagles: ${pageText.includes('Storm Eagles')}`);
    console.log(`   Has "Enter as": ${pageText.includes('Enter as')}`);
    
    // Look for any clickable elements with "Enter" text
    const enterElements = await page.locator(':has-text("Enter")').count();
    console.log(`   Elements containing "Enter": ${enterElements}`);
    
    // Look for buttons specifically
    const allButtons = await page.locator('button').allTextContents();
    console.log(`   All buttons: [${allButtons.join(', ')}]`);
    
    // Look for Thunder Hawks vs Storm Eagles draft specifically
    const draftSection = page.locator('text="Thunder Hawks vs Storm Eagles"').first();
    if (await draftSection.count() > 0) {
      console.log('3. Found Thunder Hawks vs Storm Eagles draft!');
      
      // Look for buttons near this draft
      const nearbyButtons = page.locator('text="Thunder Hawks vs Storm Eagles"').locator('..').locator('button');
      const nearbyButtonCount = await nearbyButtons.count();
      const nearbyButtonTexts = await nearbyButtons.allTextContents();
      console.log(`   Nearby buttons: ${nearbyButtonCount} - [${nearbyButtonTexts.join(', ')}]`);
      
      // Try clicking on Enter as buttons if found
      const enterAsButtons = nearbyButtons.filter({ hasText: 'Enter as' });
      const enterAsCount = await enterAsButtons.count();
      console.log(`   "Enter as" buttons: ${enterAsCount}`);
      
      if (enterAsCount > 0) {
        console.log('4. Testing first "Enter as" button...');
        
        // Set up new page listener
        let newPage = null;
        context.on('page', async (page) => {
          newPage = page;
          console.log('   🔗 New page opened:', page.url());
        });
        
        // Click first "Enter as" button
        await enterAsButtons.first().click();
        await page.waitForTimeout(5000);
        
        if (newPage) {
          await newPage.waitForLoadState('domcontentloaded');
          await newPage.waitForTimeout(3000);
          
          const phoenixUrl = newPage.url();
          console.log(`   Phoenix URL: ${phoenixUrl}`);
          
          await newPage.screenshot({ path: 'phoenix-success.png', fullPage: true });
          console.log('   Phoenix screenshot: phoenix-success.png');
          
          console.log('\n🎉 SUCCESS! Phoenix draft interface opened! 🎉');
        } else {
          console.log('   ❌ No new page opened');
        }
      }
    } else {
      console.log('   ❌ Thunder Hawks vs Storm Eagles draft not found');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    await page.screenshot({ path: 'simple-test-error.png', fullPage: true });
  } finally {
    await browser.close();
  }
  
  console.log('\n=== SIMPLE TEST COMPLETE ===\n');
}

simpleEnterTest();