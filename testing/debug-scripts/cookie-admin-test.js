const { chromium } = require('playwright');
const axios = require('axios');

async function cookieAdminTest() {
  console.log('\n=== COOKIE ADMIN DRAFT TEST ===\n');
  
  let browser;
  try {
    // Step 1: Get admin session via API
    console.log('1. Getting admin session via API...');
    const loginResponse = await axios.post('http://localhost:3001/api/test-auth/login-test-admin');
    
    if (loginResponse.status !== 200) {
      console.log('❌ Failed to get admin session');
      return;
    }
    
    console.log('   ✅ Admin session created');
    console.log(`   User: ${loginResponse.data.user.discord_username}`);
    console.log(`   Session ID: ${loginResponse.data.sessionId}`);
    
    // Extract cookies from response
    const setCookieHeaders = loginResponse.headers['set-cookie'] || [];
    const cookies = [];
    
    setCookieHeaders.forEach(cookieHeader => {
      const [cookiePart] = cookieHeader.split(';');
      const [name, value] = cookiePart.split('=');
      if (name && value) {
        cookies.push({
          name: name.trim(),
          value: value.trim(),
          domain: 'localhost',
          path: '/'
        });
      }
    });
    
    console.log(`   Extracted ${cookies.length} cookies`);
    
    // Step 2: Start browser with session cookies
    console.log('2. Starting browser with admin session...');
    browser = await chromium.launch({ headless: false, slowMo: 1000 });
    const context = await browser.newContext();
    
    // Add cookies to browser context
    await context.addCookies(cookies);
    
    const page = await context.newPage();
    
    // Step 3: Navigate directly to tournament drafts
    console.log('3. Navigating to tournament drafts...');
    await page.goto('http://localhost:3000/tournaments/67e81a0d-1165-4481-ad58-85da372f86d5');
    await page.waitForTimeout(3000);
    
    // Check if authentication worked
    const hasLoginButton = await page.locator('text="Login with Discord"').count();
    console.log(`   Login button visible: ${hasLoginButton > 0}`);
    
    if (hasLoginButton === 0) {
      console.log('   ✅ Successfully authenticated!');
    } else {
      console.log('   ⚠️ Still showing login button - trying page reload...');
      await page.reload();
      await page.waitForTimeout(2000);
    }
    
    // Click Drafts tab
    await page.click('.tab:has-text("Drafts")');
    await page.waitForTimeout(3000);
    
    // Take screenshot
    await page.screenshot({ path: 'cookie-admin-drafts.png', fullPage: true });
    console.log('   Screenshot: cookie-admin-drafts.png');
    
    // Step 4: Check for draft creation interface
    console.log('4. Checking draft interface...');
    
    const createSection = await page.locator('.create-draft-section').count();
    const debugInfo = await page.locator('text="Debug Information"').count();
    const pageText = await page.textContent('body');
    
    console.log(`   Create draft section: ${createSection}`);
    console.log(`   Debug info section: ${debugInfo}`);
    console.log(`   Has admin user: ${pageText.includes('test_admin')}`);
    console.log(`   Has isAdmin true: ${pageText.includes('isAdmin: true')}`);
    
    // Check for existing drafts
    let enterButtons = await page.locator('button:has-text("Enter as")').count();
    console.log(`   Existing "Enter as" buttons: ${enterButtons}`);
    
    // Step 5: Create draft if interface is available but no drafts exist
    if (createSection > 0 && enterButtons === 0) {
      console.log('5. Creating new draft as admin...');
      
      const matchSelect = page.locator('select[data-testid="match-select"], select').first();
      
      if (await matchSelect.count() > 0) {
        const options = await matchSelect.locator('option').allTextContents();
        console.log(`   Available matches: ${options.length - 1}`); // -1 for "Choose a match..."
        
        const thunderHawksMatch = options.find(opt => 
          opt.includes('Thunder Hawks') && opt.includes('Storm Eagles')
        );
        
        if (thunderHawksMatch) {
          console.log(`   Selecting: ${thunderHawksMatch}`);
          await matchSelect.selectOption({ label: thunderHawksMatch });
          await page.waitForTimeout(1000);
          
          const createButton = page.locator('button:has-text("Create Draft Session"), button:has-text("Create Draft")');
          if (await createButton.count() > 0) {
            console.log('   Clicking Create Draft...');
            await createButton.click();
            await page.waitForTimeout(5000);
            
            // Check if draft was created
            enterButtons = await page.locator('button:has-text("Enter as")').count();
            console.log(`   Draft created! "Enter as" buttons: ${enterButtons}`);
            
            // Take screenshot of created draft
            await page.screenshot({ path: 'created-draft-admin.png', fullPage: true });
            console.log('   Screenshot: created-draft-admin.png');
          }
        } else {
          console.log('   ❌ Thunder Hawks vs Storm Eagles match not found');
          console.log(`   Available: ${options.join(', ')}`);
        }
      }
    }
    
    // Step 6: Test Phoenix navigation
    if (enterButtons > 0) {
      console.log('6. Testing Phoenix navigation...');
      
      // Set up new page listener
      let phoenixPage = null;
      context.on('page', async (page) => {
        phoenixPage = page;
        console.log('   🔗 Phoenix page opened:', page.url());
      });
      
      // Click first "Enter as" button
      const firstEnterButton = page.locator('button:has-text("Enter as")').first();
      const buttonText = await firstEnterButton.textContent();
      console.log(`   Clicking: ${buttonText}`);
      
      await firstEnterButton.click();
      await page.waitForTimeout(5000);
      
      if (phoenixPage) {
        console.log('7. Phoenix interface loaded!');
        
        // Wait for Phoenix to fully load
        await phoenixPage.waitForLoadState('domcontentloaded');
        await phoenixPage.waitForTimeout(3000);
        
        const phoenixUrl = phoenixPage.url();
        console.log(`   Phoenix URL: ${phoenixUrl}`);
        
        // Take screenshot
        await phoenixPage.screenshot({ path: 'phoenix-admin-success.png', fullPage: true });
        console.log('   Screenshot: phoenix-admin-success.png');
        
        // Check Phoenix content
        const phoenixContent = await phoenixPage.textContent('body');
        const hasThunderHawks = phoenixContent.includes('Thunder Hawks');
        const hasStormEagles = phoenixContent.includes('Storm Eagles');
        const hasAuthFailed = phoenixContent.includes('Authentication failed');
        const hasDraftUI = phoenixContent.includes('Draft') || phoenixContent.includes('Pick') || phoenixContent.includes('Ban');
        
        console.log(`   Thunder Hawks: ${hasThunderHawks}`);
        console.log(`   Storm Eagles: ${hasStormEagles}`);
        console.log(`   Auth failed: ${hasAuthFailed}`);
        console.log(`   Draft UI: ${hasDraftUI}`);
        
        if (!hasAuthFailed && hasThunderHawks && hasStormEagles && hasDraftUI) {
          console.log('\n🎉 ✅ COMPLETE SUCCESS! ✅ 🎉');
          console.log('   ✅ Local admin authentication working');
          console.log('   ✅ Draft creation working');
          console.log('   ✅ "Enter as" buttons working');
          console.log('   ✅ Phoenix interface loading correctly');
          console.log('   ✅ Team names displaying properly');
          console.log('   ✅ Draft UI functional');
          console.log('\n🚀 The draft system is fully operational!');
        } else {
          console.log('\n⚠️ Partial success with issues:');
          if (hasAuthFailed) console.log('   ❌ Authentication failed in Phoenix');
          if (!hasThunderHawks) console.log('   ❌ Thunder Hawks name missing');
          if (!hasStormEagles) console.log('   ❌ Storm Eagles name missing');
          if (!hasDraftUI) console.log('   ❌ Draft UI elements missing');
        }
      } else {
        console.log('   ❌ Phoenix window did not open');
      }
    } else {
      console.log('   ❌ No "Enter as" buttons found');
      
      if (createSection === 0) {
        console.log('   ❌ Create draft interface not visible - authentication may have failed');
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (browser) {
      const page = await browser.newPage();
      await page.screenshot({ path: 'cookie-test-error.png', fullPage: true });
    }
  } finally {
    if (browser) {
      await browser.close();
    }
  }
  
  console.log('\n=== COOKIE ADMIN TEST COMPLETE ===\n');
}

cookieAdminTest();