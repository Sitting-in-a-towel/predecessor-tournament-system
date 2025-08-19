const { test, expect } = require('@playwright/test');

test('Debug Socket Import in React', async ({ page }) => {
  console.log('🔍 Checking Socket.io import in React components...');
  
  // Login as admin
  await page.request.post('http://localhost:3001/api/test-auth/login-test-admin');
  
  // Set up console capture
  const consoleLogs = [];
  const errors = [];
  
  page.on('console', msg => {
    const text = msg.text();
    consoleLogs.push(text);
    console.log(`Console ${msg.type()}: ${text}`);
    
    if (msg.type() === 'error') {
      errors.push(text);
    }
  });
  
  page.on('pageerror', error => {
    console.log(`Page Error: ${error.message}`);
    errors.push(`Page Error: ${error.message}`);
  });
  
  // Navigate to draft page
  console.log('📍 Navigating to draft page...');
  await page.goto('http://localhost:3000/draft/draft_1754664884481_c9k8hd893?captain=1');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);
  
  // Check if io is available in the React component's scope
  const ioTest = await page.evaluate(() => {
    try {
      // Try to find the io import in the global scope or modules
      const checks = {
        windowIO: typeof window.io !== 'undefined',
        requireIO: false,
        importError: null
      };
      
      // Try to dynamically import socket.io-client
      try {
        if (typeof require !== 'undefined') {
          const io = require('socket.io-client');
          checks.requireIO = typeof io !== 'undefined';
        }
      } catch (e) {
        checks.importError = e.message;
      }
      
      return checks;
    } catch (error) {
      return { error: error.message };
    }
  });
  
  console.log('🔌 Socket.io availability check:', JSON.stringify(ioTest, null, 2));
  
  // Check for specific import/module errors
  const importErrors = errors.filter(error => 
    error.includes('socket.io') || 
    error.includes('Cannot resolve') ||
    error.includes('Module not found')
  );
  
  if (importErrors.length > 0) {
    console.log('❌ Import errors found:');
    importErrors.forEach(error => console.log(`  - ${error}`));
  }
  
  // Check if DraftContainer component rendered properly
  const draftContainerExists = await page.locator('.draft-container').isVisible().catch(() => false);
  console.log(`Draft container rendered: ${draftContainerExists}`);
  
  // Check if any socket-related console logs appeared
  const socketLogs = consoleLogs.filter(log => 
    log.toLowerCase().includes('socket') || 
    log.toLowerCase().includes('websocket') ||
    log.toLowerCase().includes('io')
  );
  
  console.log(`Socket-related console logs: ${socketLogs.length}`);
  socketLogs.forEach(log => console.log(`  📝 ${log}`));
  
  // Look for React component errors
  const reactErrors = errors.filter(error => 
    error.includes('React') ||
    error.includes('Component') ||
    error.includes('render')
  );
  
  if (reactErrors.length > 0) {
    console.log('⚠️ React errors:');
    reactErrors.forEach(error => console.log(`  - ${error}`));
  }
  
  console.log(`Total console errors: ${errors.length}`);
  console.log(`Total console logs: ${consoleLogs.length}`);
  
  console.log('✅ Socket import debug completed');
});