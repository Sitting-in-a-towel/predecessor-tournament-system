const { chromium } = require('playwright');
const axios = require('axios');

async function testWorkingCoinToss() {
  console.log('\n=== TESTING WORKING COIN TOSS LOGIC ===\n');
  
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
    
    await page1.waitForTimeout(3000);
    await page2.waitForTimeout(3000);
    
    console.log('   ✅ Both captain pages loaded');
    
    // Step 4: Wait for coin toss section
    console.log('3. Waiting for coin toss interface...');
    
    try {
      await page1.waitForSelector('#coin-toss-container', { timeout: 10000 });
      await page2.waitForSelector('#coin-toss-container', { timeout: 10000 });
      console.log('   ✅ Coin toss interface loaded');
    } catch (error) {
      console.log('   ❌ Coin toss interface not found');
      await page1.screenshot({ path: 'debug-no-coin-toss-1.png' });
      await page2.screenshot({ path: 'debug-no-coin-toss-2.png' });
      return;
    }
    
    // Step 5: Check initial button states and click smartly
    console.log('4. Testing coin toss sequence...');
    
    const headsButton1 = page1.locator('button.heads-button');
    const tailsButton1 = page1.locator('button.tails-button');
    const headsButton2 = page2.locator('button.heads-button');
    const tailsButton2 = page2.locator('button.tails-button');
    
    // Get initial states
    const team1State = {
      heads: await headsButton1.isEnabled(),
      tails: await tailsButton1.isEnabled()
    };
    
    const team2State = {
      heads: await headsButton2.isEnabled(),
      tails: await tailsButton2.isEnabled()
    };
    
    console.log('   Team 1 button states - heads:', team1State.heads, 'tails:', team1State.tails);
    console.log('   Team 2 button states - heads:', team2State.heads, 'tails:', team2State.tails);
    
    // Click the first available enabled button for team 1
    let team1Choice = null;
    if (team1State.heads) {
      console.log('5. Team 1 clicking heads...');
      await headsButton1.click();
      team1Choice = 'heads';
    } else if (team1State.tails) {
      console.log('5. Team 1 clicking tails...');
      await tailsButton1.click();
      team1Choice = 'tails';
    } else {
      console.log('   ❌ No enabled buttons for Team 1');
      return;
    }
    
    console.log(`   ✅ Team 1 clicked ${team1Choice}`);
    
    // Wait for UI update
    await page1.waitForTimeout(2000);
    await page2.waitForTimeout(2000);
    
    // Check updated button states for team 2
    const team2UpdatedState = {
      heads: await headsButton2.isEnabled(),
      tails: await tailsButton2.isEnabled()
    };
    
    console.log('   After Team 1 choice - Team 2 heads:', team2UpdatedState.heads, 'tails:', team2UpdatedState.tails);
    
    // Click the remaining enabled button for team 2
    let team2Choice = null;
    if (team2UpdatedState.heads && team1Choice !== 'heads') {
      console.log('6. Team 2 clicking heads...');
      await headsButton2.click();
      team2Choice = 'heads';
    } else if (team2UpdatedState.tails && team1Choice !== 'tails') {
      console.log('6. Team 2 clicking tails...');
      await tailsButton2.click();
      team2Choice = 'tails';
    } else {
      console.log('   ❌ No valid enabled buttons for Team 2');
      console.log('   This might be the bug - checking button attributes...');
      
      const heads2Attr = await headsButton2.getAttribute('disabled');
      const tails2Attr = await tailsButton2.getAttribute('disabled');
      console.log('   Team 2 heads disabled attr:', heads2Attr);
      console.log('   Team 2 tails disabled attr:', tails2Attr);
      
      await page2.screenshot({ path: 'debug-team2-no-buttons.png' });
      return;
    }
    
    console.log(`   ✅ Team 2 clicked ${team2Choice}`);
    
    // Step 6: Wait for coin flip result
    console.log('7. Waiting for coin flip result...');
    
    await page1.waitForTimeout(5000);
    await page2.waitForTimeout(5000);
    
    // Check for coin flip result on both pages
    const content1 = await page1.textContent('body');
    const content2 = await page2.textContent('body');
    
    // Look for result indicators
    const hasResult1 = content1.includes('Result:') || content1.includes('wins the coin toss') || content1.includes('Winner');
    const hasResult2 = content2.includes('Result:') || content2.includes('wins the coin toss') || content2.includes('Winner');
    
    if (hasResult1 || hasResult2) {
      console.log('   ✅ SUCCESS: Coin flip completed!');
      
      // Extract the actual result
      const resultMatch1 = content1.match(/Result:\s*(\w+)/i);
      const winnerMatch1 = content1.match(/(\w+(?:\s+\w+)*)\s+wins the coin toss/i);
      
      if (resultMatch1) {
        console.log('   🎯 Coin flip result:', resultMatch1[1]);
      }
      
      if (winnerMatch1) {
        console.log('   🏆 Winner:', winnerMatch1[1]);
      }
      
      // Check for phase progression
      if (content1.includes('Pick') || content1.includes('Ban') || content1.includes('Hero Draft')) {
        console.log('   ✅ SUCCESS: Draft progressed to pick/ban phase!');
      } else {
        console.log('   ⚠️ Draft has not progressed to pick/ban phase yet');
      }
      
    } else {
      console.log('   ❌ FAILURE: Coin flip did not complete');
      
      // Check for loading state
      const hasLoading1 = content1.includes('loading') || content1.includes('Loading');
      const hasLoading2 = content2.includes('loading') || content2.includes('Loading');
      
      if (hasLoading1 || hasLoading2) {
        console.log('   ⚠️ Found loading state - coin flip appears stuck');
      }
      
      // Look for error messages
      if (content1.includes('error') || content1.includes('Error')) {
        console.log('   ⚠️ Found error messages');
      }
      
      console.log('   Debug: Checking for coin choice confirmations...');
      if (content1.includes(`You chose: ${team1Choice}`) || content1.includes(`Chose: ${team1Choice}`)) {
        console.log('   ✅ Team 1 choice confirmed in UI');
      }
      if (content1.includes(`You chose: ${team2Choice}`) || content1.includes(`Chose: ${team2Choice}`)) {
        console.log('   ✅ Team 2 choice confirmed in UI');
      }
    }
    
    // Take final screenshots
    await page1.screenshot({ path: 'coin-toss-working-team1.png' });
    await page2.screenshot({ path: 'coin-toss-working-team2.png' });
    
    console.log('   Screenshots saved for analysis');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
  
  console.log('\n=== WORKING COIN TOSS TEST COMPLETE ===\n');
}

testWorkingCoinToss();