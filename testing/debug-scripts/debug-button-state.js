const { chromium } = require('playwright');
const axios = require('axios');

async function debugButtonState() {
  console.log('\n=== DEBUGGING BUTTON STATE ===\n');
  
  let browser;
  try {
    // Step 1: Get admin session
    console.log('1. Getting admin session...');
    const loginResponse = await axios.post('http://localhost:3001/api/test-auth/login-test-admin');
    const cookies = [{
      name: 'connect.sid',
      value: loginResponse.data.sessionId,
      domain: 'localhost',
      path: '/'
    }];
    console.log('   ✅ Admin session obtained');
    
    // Step 2: Start browser
    browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    await context.addCookies(cookies);
    
    // Step 3: Open captain page
    console.log('2. Opening captain page...');
    const page = await context.newPage();
    
    const draftUrl = 'http://localhost:4000/draft/draft_1754976783591_21fnudquv';
    const token = 'test_admin_user_draft_1754976783591_21fnudquv_Aem97rHYaIs6rp48f8b7a61jt1Mqzg7nIhflhB5p8e4';
    const team1Url = `${draftUrl}?token=${token}&captain=1`;
    
    await page.goto(team1Url);
    await page.waitForTimeout(3000);
    
    console.log('   ✅ Page loaded');
    
    // Step 4: Debug button attributes
    console.log('3. Debugging button attributes...');
    
    // Check if coin toss section exists
    const coinTossSection = await page.locator('#coin-toss-container');
    if (await coinTossSection.isVisible()) {
      console.log('   ✅ Coin toss container found');
      
      // Get button elements
      const headsButton = page.locator('button.heads-button');
      const tailsButton = page.locator('button.tails-button');
      
      if (await headsButton.isVisible()) {
        console.log('   ✅ Heads button found');
        
        // Get button attributes
        const headsDisabled = await headsButton.getAttribute('disabled');
        const headsPhxClick = await headsButton.getAttribute('phx-click');
        const headsClass = await headsButton.getAttribute('class');
        const headsText = await headsButton.textContent();
        
        console.log('   Heads button attributes:');
        console.log('     disabled:', headsDisabled);
        console.log('     phx-click:', headsPhxClick);
        console.log('     class:', headsClass);
        console.log('     text:', headsText.trim());
        console.log('     isEnabled():', await headsButton.isEnabled());
        
        // Get tails button attributes
        const tailsDisabled = await tailsButton.getAttribute('disabled');
        const tailsPhxClick = await tailsButton.getAttribute('phx-click');
        const tailsClass = await tailsButton.getAttribute('class');
        const tailsText = await tailsButton.textContent();
        
        console.log('   Tails button attributes:');
        console.log('     disabled:', tailsDisabled);
        console.log('     phx-click:', tailsPhxClick);
        console.log('     class:', tailsClass);
        console.log('     text:', tailsText.trim());
        console.log('     isEnabled():', await tailsButton.isEnabled());
        
        // Check for any error messages or debug info
        const pageContent = await page.textContent('body');
        
        if (pageContent.includes('team1_coin_choice') || pageContent.includes('team2_coin_choice')) {
          console.log('   Found coin choice debug info in page');
        }
        
        if (pageContent.includes('Thunder Hawks')) {
          console.log('   ✅ Team names are displaying correctly');
        }
        
        // Look for any JavaScript errors in console
        page.on('console', msg => {
          if (msg.type() === 'error') {
            console.log('   ❌ JavaScript error:', msg.text());
          }
        });
        
        // Look for any network errors
        page.on('requestfailed', request => {
          console.log('   ❌ Request failed:', request.url(), request.failure().errorText);
        });
        
      } else {
        console.log('   ❌ Heads button not found');
      }
      
    } else {
      console.log('   ❌ Coin toss container not found');
      
      // Check what phase we're in
      const pageContent = await page.textContent('body');
      
      if (pageContent.includes('Waiting for Captains')) {
        console.log('   Currently in waiting phase');
      } else if (pageContent.includes('Pick') || pageContent.includes('Ban')) {
        console.log('   Currently in pick/ban phase');
      } else if (pageContent.includes('Complete')) {
        console.log('   Draft is complete');
      } else {
        console.log('   Unknown phase, page content snippet:');
        console.log('   ', pageContent.substring(0, 200) + '...');
      }
    }
    
    // Take a screenshot for debugging
    await page.screenshot({ path: 'debug-button-state.png' });
    console.log('   Screenshot saved: debug-button-state.png');
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
  
  console.log('\n=== BUTTON STATE DEBUG COMPLETE ===\n');
}

debugButtonState();