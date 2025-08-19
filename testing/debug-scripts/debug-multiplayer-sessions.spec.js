const { test, expect } = require('@playwright/test');

test('Debug Multiplayer Session Detection', async ({ browser }) => {
  console.log('🔍 Debugging multiplayer session detection...');
  
  // Create TWO browser contexts to simulate different sessions
  const context1 = await browser.newContext();
  const context2 = await browser.newContext();
  const page1 = await context1.newPage();
  const page2 = await context2.newPage();
  
  // Capture console logs from both pages
  const logs1 = [];
  const logs2 = [];
  
  page1.on('console', msg => {
    logs1.push(`Page1: ${msg.text()}`);
    console.log(`Page1: ${msg.text()}`);
  });
  
  page2.on('console', msg => {
    logs2.push(`Page2: ${msg.text()}`);
    console.log(`Page2: ${msg.text()}`);
  });
  
  try {
    // Step 1: Login both as admin (same user but different sessions)
    console.log('🔑 Logging in both pages as admin...');
    await page1.request.post('http://localhost:3001/api/test-auth/login-test-admin');
    await page2.request.post('http://localhost:3001/api/test-auth/login-test-admin');
    
    // Step 2: Navigate to different captain URLs
    console.log('👥 Navigating to different captain URLs...');
    const draftUrl1 = 'http://localhost:3000/draft/draft_1754664884481_c9k8hd893?captain=1';
    const draftUrl2 = 'http://localhost:3000/draft/draft_1754664884481_c9k8hd893?captain=2';
    
    console.log(`Page1 going to: ${draftUrl1}`);
    console.log(`Page2 going to: ${draftUrl2}`);
    
    await Promise.all([
      page1.goto(draftUrl1),
      page2.goto(draftUrl2)
    ]);
    
    await Promise.all([
      page1.waitForLoadState('networkidle'),
      page2.waitForLoadState('networkidle')
    ]);
    
    // Wait for socket connections
    await page1.waitForTimeout(5000);
    await page2.waitForTimeout(5000);
    
    // Step 3: Check what's visible on both pages
    console.log('📋 Checking page content...');
    
    const waitingModal1 = await page1.locator('.waiting-modal-overlay').isVisible().catch(() => false);
    const waitingModal2 = await page2.locator('.waiting-modal-overlay').isVisible().catch(() => false);
    const coinToss1 = await page1.locator('text=/heads.*or.*tails/i').isVisible().catch(() => false);
    const coinToss2 = await page2.locator('text=/heads.*or.*tails/i').isVisible().catch(() => false);
    
    console.log(`🔍 Results:`);
    console.log(`  Page1 (captain=1) - Waiting Modal: ${waitingModal1}, Coin Toss: ${coinToss1}`);
    console.log(`  Page2 (captain=2) - Waiting Modal: ${waitingModal2}, Coin Toss: ${coinToss2}`);
    
    // Step 4: Check user detection from URL params
    const page1Text = await page1.textContent('body');
    const page2Text = await page2.textContent('body');
    
    const page1HasTeam1 = page1Text.includes('Team 1') || page1Text.includes('team1') || page1Text.includes('captain=1');
    const page2HasTeam2 = page2Text.includes('Team 2') || page2Text.includes('team2') || page2Text.includes('captain=2');
    
    console.log(`🏷️ Team Detection:`);
    console.log(`  Page1 detected as Team 1: ${page1HasTeam1}`);
    console.log(`  Page2 detected as Team 2: ${page2HasTeam2}`);
    
    // Step 5: Take screenshots for manual inspection
    await page1.screenshot({ path: 'debug-captain1-session.png', fullPage: true });
    await page2.screenshot({ path: 'debug-captain2-session.png', fullPage: true });
    
    // Step 6: Check role indicators in header
    const role1 = await page1.locator('.role').textContent().catch(() => 'not found');
    const role2 = await page2.locator('.role').textContent().catch(() => 'not found');
    console.log(`🎭 Role Detection:`);
    console.log(`  Page1 role: ${role1}`);
    console.log(`  Page2 role: ${role2}`);
    
    // Step 7: Check captain connection status
    const team1Connected1 = await page1.locator('.captain-dot:first-child').getAttribute('class').catch(() => '');
    const team2Connected1 = await page1.locator('.captain-dot:last-child').getAttribute('class').catch(() => '');
    const team1Connected2 = await page2.locator('.captain-dot:first-child').getAttribute('class').catch(() => '');
    const team2Connected2 = await page2.locator('.captain-dot:last-child').getAttribute('class').catch(() => '');
    
    console.log(`🔗 Connection Status from Page1:`);
    console.log(`  Team 1 dot class: ${team1Connected1}`);
    console.log(`  Team 2 dot class: ${team2Connected1}`);
    console.log(`🔗 Connection Status from Page2:`);
    console.log(`  Team 1 dot class: ${team1Connected2}`);
    console.log(`  Team 2 dot class: ${team2Connected2}`);
    
    if (coinToss1 && coinToss2) {
      console.log('🎯 SUCCESS: Both pages show coin toss interface!');
      console.log('🔧 Testing coin selection...');
      
      // Test clicking HEADS on page1
      await page1.click('button:has-text("HEADS")');
      await page1.waitForTimeout(2000);
      
      // Check if HEADS becomes disabled on page2
      const headsDisabled = await page2.locator('button:has-text("HEADS")').isDisabled().catch(() => false);
      const tailsEnabled = await page2.locator('button:has-text("TAILS")').isEnabled().catch(() => true);
      
      console.log(`🏁 Race Logic Test - HEADS disabled on page2: ${headsDisabled}, TAILS enabled: ${tailsEnabled}`);
      
      if (headsDisabled) {
        console.log('✅ COMPLETE SUCCESS: Multiplayer system working perfectly!');
      } else {
        console.log('⚠️ PARTIAL: Interface working but race logic needs debugging');
      }
    } else {
      console.log('⚠️ Interface issue: Coin toss not visible on both pages');
    }
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
  } finally {
    await context1.close();
    await context2.close();
  }
  
  console.log('✅ Debug session complete');
});