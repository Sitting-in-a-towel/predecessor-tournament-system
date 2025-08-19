const { test, expect } = require('@playwright/test');

test('Debug WebSocket Connection', async ({ page }) => {
  console.log('🔌 Testing basic WebSocket connection...');
  
  // First login as admin
  await page.request.post('http://localhost:3001/api/test-auth/login-test-admin');
  
  // Navigate to draft page
  await page.goto('http://localhost:3000/draft/draft_1754664884481_c9k8hd893?captain=1');
  await page.waitForLoadState('networkidle');
  
  // Capture all console messages
  const consoleLogs = [];
  page.on('console', msg => {
    consoleLogs.push(msg.text());
    console.log(`Browser: ${msg.text()}`);
  });
  
  // Wait for page to fully load
  await page.waitForTimeout(5000);
  
  // Check if socket exists in the browser context
  const socketExists = await page.evaluate(() => {
    return typeof window !== 'undefined' && window.io !== undefined;
  });
  
  console.log(`Socket.io client available: ${socketExists}`);
  
  // Try to manually create a socket connection
  const socketTest = await page.evaluate(() => {
    try {
      if (window.io) {
        const socket = window.io('http://localhost:3001', {
          withCredentials: true
        });
        
        socket.on('connect', () => {
          console.log('Manual socket connected successfully!');
        });
        
        socket.on('connect_error', (error) => {
          console.log('Manual socket connection error:', error.message);
        });
        
        return 'Socket creation attempted';
      } else {
        return 'Socket.io not available';
      }
    } catch (error) {
      return `Socket creation error: ${error.message}`;
    }
  });
  
  console.log(`Manual socket test: ${socketTest}`);
  
  // Check if the React components are trying to connect
  const reactSocketLogs = consoleLogs.filter(log => 
    log.includes('socket') || 
    log.includes('WebSocket') || 
    log.includes('Connected to draft socket') ||
    log.includes('join-draft-session')
  );
  
  console.log(`React socket-related logs: ${reactSocketLogs.length}`);
  reactSocketLogs.forEach(log => console.log(`  - ${log}`));
  
  // Test if the backend is responding to HTTP requests
  const httpTest = await page.request.get('http://localhost:3001/api/draft/draft_1754664884481_c9k8hd893');
  console.log(`HTTP API test status: ${httpTest.status()}`);
  
  // Take screenshot for visual debugging
  await page.screenshot({ path: 'debug-websocket-connection.png', fullPage: true });
  
  console.log('✅ WebSocket debug test completed');
});