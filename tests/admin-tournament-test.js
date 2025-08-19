const { chromium } = require('playwright');

async function adminTournamentTest() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    console.log('🔐 ADMIN LOGIN FOR TOURNAMENT TESTING\n');
    
    // Login as admin
    const loginResponse = await page.request.post('http://localhost:3001/api/test-auth/login-test-admin');
    if (!loginResponse.ok()) {
      throw new Error('Admin login failed');
    }
    console.log('✅ Admin logged in');
    
    console.log('🏆 TESTING TOURNAMENT DETAILS AS ADMIN\n');
    
    // Go to tournaments and click into first one
    await page.goto('http://localhost:3000/tournaments');
    await page.waitForLoadState('networkidle');
    
    const firstTournament = page.locator('button:has-text("View Details")').first();
    await firstTournament.click();
    await page.waitForLoadState('networkidle');
    
    const tournamentUrl = page.url();
    console.log(`📍 Testing tournament: ${tournamentUrl}`);
    
    // Test all possible tab variations
    const tabSelectors = [
      // Standard tab selectors
      '[role="tab"]',
      'button[class*="tab"]',
      '.tab-button',
      '.nav-tab',
      'a[class*="tab"]',
      
      // Text-based selectors
      'button:has-text("Overview")',
      'button:has-text("Teams")', 
      'button:has-text("Bracket")',
      'button:has-text("Matches")',
      'button:has-text("Check-in")',
      'a:has-text("Overview")',
      'a:has-text("Teams")',
      'a:has-text("Bracket")',
      'a:has-text("Matches")',
      'a:has-text("Check-in")',
      
      // Generic navigation
      '.nav-link',
      '.navigation a',
      '.menu-item'
    ];
    
    console.log('🔍 SEARCHING FOR TABS WITH ALL POSSIBLE SELECTORS...');
    
    let tabsFound = 0;
    for (const selector of tabSelectors) {
      const elements = await page.locator(selector).all();
      if (elements.length > 0) {
        console.log(`Found ${elements.length} elements with selector: ${selector}`);
        
        for (let i = 0; i < elements.length; i++) {
          const element = elements[i];
          const text = (await element.textContent()) || '';
          const isVisible = await element.isVisible();
          console.log(`  - Element ${i}: "${text.trim()}" (visible: ${isVisible})`);
          
          if (isVisible && text.trim()) {
            tabsFound++;
            
            try {
              console.log(`    🖱️ CLICKING: "${text.trim()}"`);
              await element.click();
              await page.waitForTimeout(1000);
              
              // Check what happened after click
              const newUrl = page.url();
              if (newUrl !== tournamentUrl) {
                console.log(`    ✅ Navigated to: ${newUrl}`);
                await page.goBack();
                await page.waitForLoadState('networkidle');
              } else {
                console.log(`    ✅ Clicked - checking for content changes...`);
                
                // Look for any new content
                const bodyText = await page.locator('body').textContent();
                console.log(`    Page contains ${bodyText.length} characters of content`);
              }
              
            } catch (error) {
              console.log(`    ❌ Click failed: ${error.message}`);
            }
          }
        }
      }
    }
    
    console.log(`\n📊 TABS SUMMARY: Found ${tabsFound} clickable tab-like elements`);
    
    // Test ALL buttons on tournament page
    console.log('\n🔘 TESTING ALL BUTTONS ON TOURNAMENT PAGE...');
    
    const allButtons = await page.locator('button, [role="button"]').all();
    console.log(`Found ${allButtons.length} total buttons`);
    
    for (let i = 0; i < allButtons.length; i++) {
      const button = allButtons[i];
      
      try {
        const text = (await button.textContent()) || '';
        const isVisible = await button.isVisible();
        const isEnabled = await button.isEnabled();
        
        console.log(`Button ${i + 1}: "${text.trim()}" (visible: ${isVisible}, enabled: ${isEnabled})`);
        
        if (isVisible && isEnabled) {
          console.log(`  🖱️ Clicking button: "${text.trim()}"`);
          
          const beforeUrl = page.url();
          await button.click();
          await page.waitForTimeout(1000);
          
          const afterUrl = page.url();
          
          // Check for navigation
          if (afterUrl !== beforeUrl) {
            console.log(`  ✅ Button navigated to: ${afterUrl}`);
            await page.goBack();
            await page.waitForLoadState('networkidle');
          } else {
            // Check for modal
            const modal = page.locator('[role="dialog"], .modal, [class*="modal"]').first();
            if (await modal.isVisible()) {
              console.log(`  ✅ Button opened modal`);
              await page.keyboard.press('Escape');
            } else {
              console.log(`  ✅ Button clicked (no obvious UI change)`);
            }
          }
        }
        
      } catch (error) {
        console.log(`  ❌ Button ${i + 1} failed: ${error.message}`);
      }
    }
    
    // Test ALL links on tournament page
    console.log('\n🔗 TESTING ALL LINKS ON TOURNAMENT PAGE...');
    
    const allLinks = await page.locator('a').all();
    console.log(`Found ${allLinks.length} total links`);
    
    for (let i = 0; i < Math.min(allLinks.length, 10); i++) {
      const link = allLinks[i];
      
      try {
        const text = (await link.textContent()) || '';
        const href = await link.getAttribute('href');
        const isVisible = await link.isVisible();
        
        console.log(`Link ${i + 1}: "${text.trim()}" -> ${href} (visible: ${isVisible})`);
        
        if (isVisible && href && !href.startsWith('http')) {
          console.log(`  🖱️ Clicking link: "${text.trim()}"`);
          
          await link.click();
          await page.waitForTimeout(1000);
          
          const newUrl = page.url();
          console.log(`  ✅ Link navigated to: ${newUrl}`);
          
          if (!newUrl.includes('tournaments')) {
            await page.goBack();
            await page.waitForLoadState('networkidle');
          }
        }
        
      } catch (error) {
        console.log(`  ❌ Link ${i + 1} failed: ${error.message}`);
      }
    }
    
    // Check page source for hidden elements
    console.log('\n🔍 ANALYZING PAGE SOURCE FOR MISSING ELEMENTS...');
    
    const pageContent = await page.content();
    
    // Look for common tournament page elements in HTML
    const searchTerms = ['overview', 'teams', 'bracket', 'matches', 'check-in', 'register', 'join', 'tab', 'panel'];
    
    for (const term of searchTerms) {
      const count = (pageContent.toLowerCase().match(new RegExp(term, 'g')) || []).length;
      if (count > 0) {
        console.log(`Found "${term}" ${count} times in page source`);
      }
    }
    
    console.log(`\nTotal page HTML length: ${pageContent.length} characters`);
    
  } catch (error) {
    console.error('❌ Error during admin tournament testing:', error.message);
  }
  
  await browser.close();
}

adminTournamentTest();