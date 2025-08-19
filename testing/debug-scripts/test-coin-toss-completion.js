const { chromium } = require('playwright');
const axios = require('axios');

async function testCoinTossCompletion() {
  console.log('\n=== TESTING COIN TOSS COMPLETION ===\n');
  
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
    
    // Step 3: Open two pages for both captains
    console.log('2. Opening two captain pages...');
    const page1 = await context.newPage();
    const page2 = await context.newPage();
    
    // Navigate to the Phoenix draft interface
    const draftUrl = 'http://localhost:4000/draft/draft_1754976783591_21fnudquv';
    const token = 'test_admin_user_draft_1754976783591_21fnudquv_Aem97rHYaIs6rp48f8b7a61jt1Mqzg7nIhflhB5p8e4';
    
    const team1Url = `${draftUrl}?token=${token}&captain=1`;
    const team2Url = `${draftUrl}?token=${token}&captain=2`;
    
    console.log('   Team 1 URL:', team1Url);
    console.log('   Team 2 URL:', team2Url);
    
    // Open both captain views
    await page1.goto(team1Url);
    await page2.goto(team2Url);
    
    await page1.waitForTimeout(2000);
    await page2.waitForTimeout(2000);
    
    console.log('   ✅ Both captain pages loaded');
    
    // Step 4: Check initial state
    console.log('3. Checking initial coin toss state...');
    
    // Wait for the coin toss section to be visible
    await page1.waitForSelector('.coin-toss-button', { timeout: 10000 });
    await page2.waitForSelector('.coin-toss-button', { timeout: 10000 });
    
    console.log('   ✅ Coin toss buttons visible on both pages');
    
    // Step 5: Team 1 chooses heads
    console.log('4. Team 1 choosing heads...');
    const headsButton1 = await page1.locator('button.heads-button');
    const tailsButton1 = await page1.locator('button.tails-button');
    
    // Check if buttons are enabled
    const headsEnabled1 = await headsButton1.isEnabled();
    const tailsEnabled1 = await tailsButton1.isEnabled();
    console.log(`   Team 1 - Heads enabled: ${headsEnabled1}, Tails enabled: ${tailsEnabled1}`);
    
    await headsButton1.click();
    console.log('   ✅ Team 1 clicked heads');
    
    await page1.waitForTimeout(1000);
    await page2.waitForTimeout(1000);
    
    // Step 6: Check state after team 1 choice
    console.log('5. Checking state after Team 1 choice...');
    
    const headsButton2 = await page2.locator('button.heads-button');
    const tailsButton2 = await page2.locator('button.tails-button');
    
    const headsEnabled2 = await headsButton2.isEnabled();
    const tailsEnabled2 = await tailsButton2.isEnabled();
    console.log(`   Team 2 - Heads enabled: ${headsEnabled2}, Tails enabled: ${tailsEnabled2}`);
    
    // Step 7: Team 2 chooses tails
    console.log('6. Team 2 choosing tails...');
    
    if (tailsEnabled2) {
      await tailsButton2.click();
      console.log('   ✅ Team 2 clicked tails');
      
      // Step 8: Wait for coin flip result
      console.log('7. Waiting for coin flip result...');
      
      // Wait for potential coin flip animation or result
      await page1.waitForTimeout(5000);
      
      // Check for coin flip result
      const resultPage1 = await page1.textContent('body');
      const resultPage2 = await page2.textContent('body');
      
      if (resultPage1.includes('Result:') || resultPage1.includes('wins the coin toss')) {
        console.log('   ✅ Coin flip completed successfully!');
        console.log('   Result found in page content');
        
        // Check for phase transition
        if (resultPage1.includes('pick') || resultPage1.includes('Pick') || resultPage1.includes('ban') || resultPage1.includes('Ban')) {
          console.log('   ✅ Draft progressed to pick/ban phase!');
        } else {
          console.log('   ⚠️ Draft did not progress to pick/ban phase yet');
        }
      } else {
        console.log('   ❌ Coin flip did not complete - no result found');
        console.log('   Checking for loading indicators...');
        
        const hasLoading1 = resultPage1.includes('loading') || resultPage1.includes('Loading');
        const hasLoading2 = resultPage2.includes('loading') || resultPage2.includes('Loading');
        
        if (hasLoading1 || hasLoading2) {
          console.log('   ⚠️ Found loading indicators - coin flip may be stuck');
        }
      }
      
    } else {
      console.log('   ❌ Tails button is disabled for Team 2');
    }
    
    // Take screenshots for debugging
    await page1.screenshot({ path: 'coin-toss-team1-final.png' });
    await page2.screenshot({ path: 'coin-toss-team2-final.png' });
    console.log('   Screenshots saved for debugging');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
  
  console.log('\n=== COIN TOSS TEST COMPLETE ===\n');
}

testCoinTossCompletion();