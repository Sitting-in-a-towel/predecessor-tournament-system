const { test, expect } = require('@playwright/test');

test('Debug Admin Coin Toss System', async ({ browser }) => {
  console.log('🔧 Testing admin coin toss system with complete debugging...');
  
  // Create two browser contexts to simulate separate tabs/windows
  const context1 = await browser.newContext();
  const context2 = await browser.newContext();
  const page1 = await context1.newPage();
  const page2 = await context2.newPage();
  
  // Capture all console messages and network requests
  const logs1 = [];
  const logs2 = [];
  const networkErrors1 = [];
  const networkErrors2 = [];
  
  page1.on('console', msg => {
    logs1.push(`Page1: ${msg.text()}`);
    console.log(`Page1: ${msg.text()}`);
  });
  
  page2.on('console', msg => {
    logs2.push(`Page2: ${msg.text()}`);
    console.log(`Page2: ${msg.text()}`);
  });
  
  page1.on('response', response => {
    if (!response.ok()) {
      networkErrors1.push(`Page1 HTTP ${response.status()}: ${response.url()}`);
      console.log(`Page1 HTTP ${response.status()}: ${response.url()}`);
    }
  });
  
  page2.on('response', response => {
    if (!response.ok()) {
      networkErrors2.push(`Page2 HTTP ${response.status()}: ${response.url()}`);
      console.log(`Page2 HTTP ${response.status()}: ${response.url()}`);
    }
  });
  
  try {
    // Step 1: Login as admin on both pages
    console.log('🔑 Step 1: Logging in as admin on both pages...');
    await Promise.all([
      page1.request.post('http://localhost:3001/api/test-auth/login-test-admin'),
      page2.request.post('http://localhost:3001/api/test-auth/login-test-admin')
    ]);
    
    // Verify login worked
    const auth1 = await page1.request.get('http://localhost:3001/api/auth/me');
    const auth2 = await page2.request.get('http://localhost:3001/api/auth/me');
    console.log(`Auth status - Page1: ${auth1.status()}, Page2: ${auth2.status()}`);
    
    if (auth1.status() === 200) {
      const userData1 = await auth1.json();
      console.log(`Page1 user role: ${userData1.role}, id: ${userData1.id}`);
    }
    
    // Step 2: Navigate to captain=1 URL first
    console.log('👤 Step 2: Opening captain=1 page...');
    const captain1Url = 'http://localhost:3000/draft/draft_1754664884481_c9k8hd893?captain=1';
    await page1.goto(captain1Url);
    await page1.waitForLoadState('networkidle');
    await page1.waitForTimeout(3000); // Wait for WebSocket connections
    
    // Check for waiting modal on page1
    console.log('⏳ Checking for waiting modal on page1...');
    const waitingModal1 = await page1.locator('.waiting-modal-overlay').isVisible().catch(() => false);
    const waitingText1 = await page1.locator('text=/waiting.*for.*other/i').isVisible().catch(() => false);
    console.log(`Page1 - Waiting modal: ${waitingModal1}, Waiting text: ${waitingText1}`);
    
    // Step 3: Navigate to captain=2 URL 
    console.log('👤 Step 3: Opening captain=2 page...');
    const captain2Url = 'http://localhost:3000/draft/draft_1754664884481_c9k8hd893?captain=2';
    await page2.goto(captain2Url);
    await page2.waitForLoadState('networkidle');
    await page2.waitForTimeout(3000); // Wait for WebSocket connections
    
    // Check if waiting modal disappeared on both pages
    console.log('✅ Step 4: Checking if waiting modal disappeared...');
    await page1.waitForTimeout(2000); // Give WebSocket time to communicate
    
    const waitingModal1After = await page1.locator('.waiting-modal-overlay').isVisible().catch(() => false);
    const waitingModal2After = await page2.locator('.waiting-modal-overlay').isVisible().catch(() => false);
    console.log(`After both pages open - Page1 modal: ${waitingModal1After}, Page2 modal: ${waitingModal2After}`);
    
    // Step 5: Check coin toss interface visibility
    console.log('🪙 Step 5: Checking coin toss interface...');
    const headsButton1 = await page1.locator('button:has-text("HEADS")').isVisible().catch(() => false);
    const tailsButton1 = await page1.locator('button:has-text("TAILS")').isVisible().catch(() => false);
    const headsButton2 = await page2.locator('button:has-text("HEADS")').isVisible().catch(() => false);
    const tailsButton2 = await page2.locator('button:has-text("TAILS")').isVisible().catch(() => false);
    
    console.log(`Coin buttons - Page1: H:${headsButton1} T:${tailsButton1}, Page2: H:${headsButton2} T:${tailsButton2}`);
    
    // Step 6: Test coin toss selection
    if (headsButton1) {
      console.log('🎯 Step 6: Testing HEADS selection on page1...');
      await page1.click('button:has-text("HEADS")');
      await page1.waitForTimeout(2000);
      
      // Check for any error messages
      const errorMessage1 = await page1.locator('.error, .toast, [class*="error"]').textContent().catch(() => '');
      console.log(`Error message on page1: "${errorMessage1}"`);
      
      // Check if HEADS became disabled on page2
      const headsDisabled2 = await page2.locator('button:has-text("HEADS")').isDisabled().catch(() => false);
      console.log(`HEADS disabled on page2: ${headsDisabled2}`);
    }
    
    // Step 7: Check database state
    console.log('💾 Step 7: Checking database state...');
    const dbCheck = await page1.request.get('http://localhost:3001/api/draft/draft_1754664884481_c9k8hd893');
    if (dbCheck.status() === 200) {
      const dbData = await dbCheck.json();
      console.log(`Database state:`, {
        status: dbData.status,
        phase: dbData.current_phase,
        team1_connected: dbData.team1_connected,
        team2_connected: dbData.team2_connected,
        team1_coin_choice: dbData.team1_coin_choice,
        team2_coin_choice: dbData.team2_coin_choice,
        coin_toss_winner: dbData.coin_toss_winner
      });
    } else {
      console.log(`Database check failed: ${dbCheck.status()}`);
    }
    
    // Step 8: Take screenshots for manual review
    await page1.screenshot({ path: 'debug-admin-page1.png', fullPage: true });
    await page2.screenshot({ path: 'debug-admin-page2.png', fullPage: true });
    
    // Step 9: Check WebSocket connection status
    console.log('🔌 Step 9: Checking WebSocket status...');
    const wsStatus1 = await page1.evaluate(() => window.location.href);
    const wsStatus2 = await page2.evaluate(() => window.location.href);
    console.log(`Page URLs - Page1: ${wsStatus1}, Page2: ${wsStatus2}`);
    
    // Final summary
    console.log('\n📊 SUMMARY:');
    console.log(`- Authentication working: ${auth1.status() === 200 && auth2.status() === 200}`);
    console.log(`- Waiting modal appeared initially: ${waitingModal1 || waitingText1}`);
    console.log(`- Waiting modal disappeared after both pages: ${!waitingModal1After && !waitingModal2After}`);
    console.log(`- Coin toss interface visible: ${headsButton1 && tailsButton1 && headsButton2 && tailsButton2}`);
    console.log(`- Network errors: Page1(${networkErrors1.length}), Page2(${networkErrors2.length})`);
    
    if (networkErrors1.length > 0) console.log('Page1 errors:', networkErrors1);
    if (networkErrors2.length > 0) console.log('Page2 errors:', networkErrors2);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await context1.close();
    await context2.close();
  }
  
  console.log('✅ Debug test completed');
});