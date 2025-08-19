const { chromium } = require('playwright');
const axios = require('axios');

async function testCoinTossFresh() {
  console.log('\n=== TESTING COIN TOSS WITH FRESH DRAFT ===\n');
  
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
    
    // Step 3: Create a new draft
    console.log('2. Creating new draft...');
    const page = await context.newPage();
    await page.goto('http://localhost:3000/tournaments');
    await page.waitForTimeout(2000);
    
    // Find and click create draft
    const createButton = await page.locator('button:has-text("Create Draft")').first();
    if (await createButton.isVisible()) {
      await createButton.click();
      console.log('   ✅ Created new draft');
      await page.waitForTimeout(2000);
    } else {
      console.log('   ℹ️ No create draft button found - using existing draft');
    }
    
    // Get the draft URLs
    const enterButtons = await page.locator('button:has-text("Enter as")').all();
    console.log(`   Found ${enterButtons.length} "Enter as" buttons`);
    
    if (enterButtons.length < 2) {
      console.log('   ❌ Not enough "Enter as" buttons found');
      return;
    }
    
    // Step 4: Open two captain pages  
    console.log('3. Opening captain pages...');
    
    const [page1, page2] = await Promise.all([
      context.newPage(),
      context.newPage()
    ]);
    
    // Click the first "Enter as" button and capture the URL
    await enterButtons[0].click();
    await page.waitForTimeout(1000);
    
    // Find the new Phoenix tab/window
    const pages = context.pages();
    const phoenixPage = pages.find(p => p.url().includes('localhost:4000'));
    
    if (!phoenixPage) {
      console.log('   ❌ Phoenix page not found after clicking Enter as button');
      return;
    }
    
    const team1Url = phoenixPage.url();
    const team2Url = team1Url.replace('captain=1', 'captain=2');
    
    console.log('   Team 1 URL:', team1Url);
    console.log('   Team 2 URL:', team2Url);
    
    // Navigate both pages
    await page1.goto(team1Url);
    await page2.goto(team2Url);
    
    await page1.waitForTimeout(3000);
    await page2.waitForTimeout(3000);
    
    console.log('   ✅ Both captain pages loaded');
    
    // Step 5: Wait for coin toss phase
    console.log('4. Waiting for coin toss phase...');
    
    try {
      await page1.waitForSelector('.coin-toss-button', { timeout: 15000 });
      await page2.waitForSelector('.coin-toss-button', { timeout: 15000 });
      console.log('   ✅ Coin toss buttons are visible');
    } catch (error) {
      console.log('   ⚠️ Coin toss buttons not found, checking page content...');
      const content1 = await page1.textContent('body');
      const content2 = await page2.textContent('body');
      
      if (content1.includes('Waiting for Captains') || content2.includes('Waiting for Captains')) {
        console.log('   Still waiting for captains to join...');
        await page1.waitForTimeout(5000);
        
        // Try again
        try {
          await page1.waitForSelector('.coin-toss-button', { timeout: 10000 });
          await page2.waitForSelector('.coin-toss-button', { timeout: 10000 });
          console.log('   ✅ Coin toss buttons now visible');
        } catch (error) {
          console.log('   ❌ Coin toss buttons still not visible');
          await page1.screenshot({ path: 'debug-page1.png' });
          await page2.screenshot({ path: 'debug-page2.png' });
          return;
        }
      }
    }
    
    // Step 6: Test the coin toss sequence
    console.log('5. Testing coin toss sequence...');
    
    // Check initial button states
    const headsButton1 = page1.locator('button.heads-button');
    const tailsButton1 = page1.locator('button.tails-button');
    const headsButton2 = page2.locator('button.heads-button');
    const tailsButton2 = page2.locator('button.tails-button');
    
    const initialState = {
      team1_heads: await headsButton1.isEnabled(),
      team1_tails: await tailsButton1.isEnabled(),
      team2_heads: await headsButton2.isEnabled(),
      team2_tails: await tailsButton2.isEnabled()
    };
    
    console.log('   Initial button states:', initialState);
    
    // Team 1 clicks heads
    if (initialState.team1_heads) {
      console.log('6. Team 1 choosing heads...');
      await headsButton1.click();
      console.log('   ✅ Team 1 clicked heads');
      
      // Wait for UI update
      await page1.waitForTimeout(2000);
      await page2.waitForTimeout(2000);
      
      // Check updated button states
      const afterTeam1State = {
        team1_heads: await headsButton1.isEnabled(),
        team1_tails: await tailsButton1.isEnabled(),
        team2_heads: await headsButton2.isEnabled(),
        team2_tails: await tailsButton2.isEnabled()
      };
      
      console.log('   After Team 1 choice:', afterTeam1State);
      
      // Team 2 clicks tails
      if (afterTeam1State.team2_tails) {
        console.log('7. Team 2 choosing tails...');
        await tailsButton2.click();
        console.log('   ✅ Team 2 clicked tails');
        
        // Wait for coin flip result
        console.log('8. Waiting for coin flip result...');
        await page1.waitForTimeout(5000);
        
        // Check for result
        const finalContent1 = await page1.textContent('body');
        const finalContent2 = await page2.textContent('body');
        
        if (finalContent1.includes('Result:') || finalContent1.includes('wins the coin toss')) {
          console.log('   ✅ SUCCESS: Coin flip completed!');
          
          // Look for the winner
          const winnerMatch = finalContent1.match(/(\w+(?:\s+\w+)*)\s+wins the coin toss/);
          if (winnerMatch) {
            console.log('   🏆 Winner:', winnerMatch[1]);
          }
          
          // Check for phase progression
          if (finalContent1.includes('Pick') || finalContent1.includes('Ban') || finalContent1.includes('draft')) {
            console.log('   ✅ Draft progressed to next phase!');
          }
          
        } else {
          console.log('   ❌ FAILURE: Coin flip did not complete');
          console.log('   Checking for stuck loading state...');
          
          // Check for loading indicators
          const hasLoading = finalContent1.includes('loading') || finalContent1.includes('Loading') || 
                            finalContent2.includes('loading') || finalContent2.includes('Loading');
          
          if (hasLoading) {
            console.log('   ⚠️ Found loading state - coin toss appears stuck');
          }
          
          // Look for error messages
          if (finalContent1.includes('error') || finalContent1.includes('Error')) {
            console.log('   ⚠️ Found error messages in page content');
          }
        }
        
      } else {
        console.log('   ❌ Team 2 tails button is disabled');
      }
      
    } else {
      console.log('   ❌ Team 1 heads button is disabled');
    }
    
    // Take final screenshots
    await page1.screenshot({ path: 'coin-toss-final-team1.png' });
    await page2.screenshot({ path: 'coin-toss-final-team2.png' });
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
  
  console.log('\n=== COIN TOSS FRESH TEST COMPLETE ===\n');
}

testCoinTossFresh();