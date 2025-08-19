const { chromium } = require('playwright');

async function testDraftPage() {
  const browser = await chromium.launch({ 
    headless: false, 
    devtools: true 
  });
  
  const context = await browser.newContext();
  
  // Listen for console messages
  const page = await context.newPage();
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    if (type === 'log' || type === 'error' || type === 'warn') {
      console.log(`[${type}] ${text}`);
    }
  });

  try {
    console.log('🔍 Testing draft page functionality...\n');
    
    // Go to the tournament drafts page
    await page.goto('http://localhost:3000/tournament/4fe28137-a1c3-426e-bfa0-1ae9c54f58a0/drafts');
    
    // Wait for page to load
    await page.waitForTimeout(2000);
    
    // Check if we're logged in or need to login
    const loginButton = await page.$('text=Login with Discord');
    if (loginButton) {
      console.log('❌ Not logged in, please log in manually');
      await page.waitForTimeout(10000); // Give time to login
    }
    
    // Wait for the draft data to load
    await page.waitForTimeout(3000);
    
    // Check if the debug panel shows matches.length > 0
    const debugInfo = await page.$('.debug-info');
    if (debugInfo) {
      const debugText = await debugInfo.textContent();
      console.log('📊 Debug info:', debugText);
      
      // Check if create draft section is visible
      const createDraftSection = await page.$('.create-draft-section');
      if (createDraftSection) {
        console.log('✅ Create draft section is visible!');
        
        // Check available matches in dropdown
        const matchSelect = await page.$('[data-testid="match-select"]');
        if (matchSelect) {
          const options = await matchSelect.$$('option');
          console.log(`📝 Available matches: ${options.length - 1}`); // -1 for placeholder
          
          // Get option text
          for (let i = 1; i < options.length && i <= 3; i++) {
            const text = await options[i].textContent();
            console.log(`   ${i}. ${text}`);
          }
        }
      } else {
        console.log('❌ Create draft section is not visible');
      }
    }
    
    // Keep page open for inspection
    console.log('\n🔍 Keeping page open for inspection...');
    await page.waitForTimeout(30000);
    
  } catch (error) {
    console.error('❌ Test error:', error);
  } finally {
    await browser.close();
  }
}

testDraftPage();