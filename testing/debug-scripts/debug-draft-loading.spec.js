const { test, expect } = require('@playwright/test');

test('Debug Draft Loading on Page Refresh', async ({ page }) => {
  console.log('🔍 DEBUGGING DRAFT LOADING');
  
  // Capture all console logs
  const consoleLogs = [];
  page.on('console', msg => {
    consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
  });
  
  // Capture network requests
  const networkRequests = [];
  page.on('request', request => {
    if (request.url().includes('draft') || request.url().includes('4000')) {
      networkRequests.push(`${request.method()} ${request.url()}`);
    }
  });
  
  // Capture network responses
  const networkResponses = [];
  page.on('response', response => {
    if (response.url().includes('draft') || response.url().includes('4000')) {
      networkResponses.push(`${response.status()} ${response.url()}`);
    }
  });
  
  console.log('\n📄 Loading tournament page...');
  await page.goto('http://localhost:3000/tournaments/67e81a0d-1165-4481-ad58-85da372f86d5');
  
  // Wait for page to fully load
  await page.waitForTimeout(5000);
  
  console.log('\n📋 CONSOLE LOGS:');
  console.log('='.repeat(40));
  consoleLogs.forEach((log, i) => {
    if (i < 20) { // Limit output
      console.log(log);
    }
  });
  if (consoleLogs.length > 20) {
    console.log(`... and ${consoleLogs.length - 20} more logs`);
  }
  
  console.log('\n🌐 NETWORK REQUESTS:');
  console.log('='.repeat(40));
  networkRequests.forEach(req => console.log(req));
  
  console.log('\n📡 NETWORK RESPONSES:');
  console.log('='.repeat(40));
  networkResponses.forEach(resp => console.log(resp));
  
  // Check what's in the Phoenix drafts logs specifically
  console.log('\n🔥 PHOENIX-RELATED LOGS:');
  console.log('='.repeat(40));
  const phoenixLogs = consoleLogs.filter(log => 
    log.toLowerCase().includes('phoenix') ||
    log.toLowerCase().includes('4000') ||
    log.includes('Loading Phoenix drafts') ||
    log.includes('Phoenix drafts')
  );
  
  if (phoenixLogs.length === 0) {
    console.log('❌ NO PHOENIX DRAFT LOADING DETECTED!');
    console.log('This means the React code is not calling Phoenix API on page load.');
  } else {
    phoenixLogs.forEach(log => console.log(log));
  }
  
  // Check if drafts tab exists
  const draftsTab = await page.locator('button:has-text("Drafts")').isVisible().catch(() => false);
  console.log('\n📂 Drafts tab visible:', draftsTab);
  
  if (draftsTab) {
    console.log('\n🔍 Clicking Drafts tab to trigger loading...');
    
    // Start capturing logs before clicking
    const additionalLogs = [];
    const clickListener = msg => {
      additionalLogs.push(`[POST-CLICK] ${msg.text()}`);
    };
    page.on('console', clickListener);
    
    await page.locator('button:has-text("Drafts")').click();
    console.log('Drafts tab clicked, waiting for React to load drafts...');
    
    // Wait longer for React to load drafts
    await page.waitForTimeout(8000);
    
    // Remove the listener
    page.off('console', clickListener);
    
    console.log('\n📋 LOGS AFTER CLICKING DRAFTS TAB:');
    console.log('='.repeat(40));
    if (additionalLogs.length === 0) {
      console.log('❌ No console logs detected after clicking Drafts tab');
    } else {
      additionalLogs.forEach(log => console.log(log));
    }
    
    // Check if any draft elements appeared
    const draftElements = await page.locator('.draft-item, .draft-row, [data-testid="draft"], .drafts-container').count();
    console.log('Draft UI elements found:', draftElements);
  }
  
  // Final diagnosis
  console.log('\n🔧 DIAGNOSIS:');
  console.log('='.repeat(40));
  
  if (phoenixLogs.length === 0) {
    console.log('❌ PROBLEM: React is NOT calling Phoenix API');
    console.log('   Solution: Need to check loadDraftData() function');
  } else if (networkResponses.some(r => r.includes('4000') && r.startsWith('200'))) {
    console.log('✅ Phoenix API calls working');
    console.log('❓ Check if drafts are being processed correctly in React');
  } else if (networkResponses.some(r => r.includes('4000') && r.startsWith('4'))) {
    console.log('❌ Phoenix API calls failing (4xx error)');
  } else {
    console.log('❓ Phoenix API calls may not be reaching server');
  }
});