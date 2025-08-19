const { test, expect } = require('@playwright/test');

test('Login as TestAdmin and access draft interface', async ({ page }) => {
  console.log('=== Testing Draft Interface with TestAdmin Login ===');
  
  try {
    // Step 1: Go to the admin login page
    console.log('Going to admin page...');
    await page.goto('http://localhost:3000/admin');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'admin-1-login-page.png', fullPage: true });
    
    // Step 2: Try to access admin as TestAdmin (if there's a login form)
    const hasLoginForm = await page.locator('form, input[type="email"], input[type="password"]').count() > 0;
    
    if (hasLoginForm) {
      console.log('Found login form, attempting to login as TestAdmin...');
      
      // Try various input selectors
      const usernameInput = await page.locator('input[type="text"], input[name="username"], input[name="email"], input[placeholder*="username"], input[placeholder*="email"]').first();
      const passwordInput = await page.locator('input[type="password"], input[name="password"]').first();
      
      if (await usernameInput.isVisible() && await passwordInput.isVisible()) {
        await usernameInput.fill('TestAdmin');
        await passwordInput.fill('password'); // Common test password
        
        const submitButton = await page.locator('button[type="submit"], input[type="submit"], button:has-text("Login"), button:has-text("Sign in")').first();
        if (await submitButton.isVisible()) {
          await submitButton.click();
          await page.waitForLoadState('networkidle');
          await page.screenshot({ path: 'admin-2-after-login.png', fullPage: true });
        }
      }
    } else {
      console.log('No login form found, checking if already authenticated...');
    }
    
    // Step 3: Try to access the admin dashboard or tournaments
    console.log('Accessing admin features...');
    
    // Try various admin URLs
    const adminUrls = [
      'http://localhost:3000/admin',
      'http://localhost:3000/admin/tournaments',
      'http://localhost:3000/admin/drafts',
      'http://localhost:3000/tournaments'
    ];
    
    for (const url of adminUrls) {
      try {
        console.log(`Trying admin URL: ${url}`);
        await page.goto(url);
        await page.waitForLoadState('networkidle', { timeout: 5000 });
        await page.screenshot({ path: `admin-${url.split('/').pop()}.png`, fullPage: true });
        
        // Check if we can see admin features
        const hasAdminFeatures = await page.evaluate(() => {
          const adminText = document.body.innerText.toLowerCase();
          return adminText.includes('admin') || adminText.includes('manage') || adminText.includes('draft');
        });
        
        if (hasAdminFeatures) {
          console.log(`Found admin features at: ${url}`);
          break;
        }
      } catch (e) {
        console.log(`Failed to access ${url}: ${e.message}`);
      }
    }
    
    // Step 4: Look for Draft Test Tournament and access it as admin
    await page.goto('http://localhost:3000/tournaments');
    await page.waitForLoadState('networkidle');
    
    console.log('Looking for Draft Test Tournament...');
    const draftTournament = await page.locator('text="Draft Test Tournament"').first();
    
    if (await draftTournament.isVisible()) {
      console.log('Found Draft Test Tournament');
      
      // Click on the tournament card or "View Details"
      const tournamentCard = draftTournament.locator('..').locator('..'); // Go up to card container
      await tournamentCard.click();
      await page.waitForLoadState('networkidle');
      await page.screenshot({ path: 'admin-3-draft-tournament.png', fullPage: true });
      
      // Look for admin/management options
      const adminButtons = await page.locator('button:has-text("Admin"), button:has-text("Manage"), a:has-text("Admin"), a:has-text("Manage")');
      console.log(`Found ${await adminButtons.count()} admin/manage buttons`);
      
      if (await adminButtons.count() > 0) {
        await adminButtons.first().click();
        await page.waitForLoadState('networkidle');
        await page.screenshot({ path: 'admin-4-management-page.png', fullPage: true });
      }
      
      // Look for draft links or "Enter as" options
      const draftLinks = await page.locator('a:has-text("Draft"), a:has-text("Enter as"), button:has-text("Draft"), a[href*="captain"]');
      console.log(`Found ${await draftLinks.count()} draft-related links`);
      
      if (await draftLinks.count() > 0) {
        console.log('Clicking on draft interface...');
        await draftLinks.first().click();
        await page.waitForLoadState('networkidle');
        await page.screenshot({ path: 'admin-5-draft-interface.png', fullPage: true });
        
        // Now analyze the draft interface
        await analyzeDraftInterface(page);
      }
    }
    
    // Step 5: If we still haven't found the draft interface, try direct Phoenix URLs
    console.log('Trying direct Phoenix draft access...');
    const phoenixUrls = [
      'http://localhost:4000',
      'http://localhost:4000/drafts',
      'http://localhost:4000/admin'
    ];
    
    for (const url of phoenixUrls) {
      try {
        console.log(`Trying Phoenix URL: ${url}`);
        await page.goto(url);
        await page.waitForLoadState('networkidle', { timeout: 5000 });
        await page.screenshot({ path: `phoenix-${url.split(':')[2] || 'root'}.png`, fullPage: true });
        
        const hasDraftElements = await page.evaluate(() => {
          return !!(document.querySelector('.hero-grid') || document.querySelector('.draft-main-area') || document.querySelector('.team-panel'));
        });
        
        if (hasDraftElements) {
          console.log(`Found draft interface at: ${url}`);
          await analyzeDraftInterface(page);
          break;
        }
      } catch (e) {
        console.log(`Phoenix URL ${url} failed: ${e.message}`);
      }
    }
    
  } catch (error) {
    console.log('Test error:', error.message);
    await page.screenshot({ path: 'admin-test-error.png', fullPage: true });
  }
});

async function analyzeDraftInterface(page) {
  console.log('\n================================');
  console.log('🔍 DRAFT INTERFACE ANALYSIS');
  console.log('================================');
  
  const viewport = page.viewportSize();
  console.log(`📱 Browser Viewport: ${viewport.width}x${viewport.height}`);
  
  const analysis = await page.evaluate(() => {
    const result = {
      url: window.location.href,
      timestamp: new Date().toISOString(),
      viewport: { width: window.innerWidth, height: window.innerHeight },
      document: { 
        width: document.documentElement.scrollWidth, 
        height: document.documentElement.scrollHeight 
      },
      scroll: {
        hasVertical: document.documentElement.scrollHeight > window.innerHeight,
        hasHorizontal: document.documentElement.scrollWidth > window.innerWidth,
        verticalOverflow: document.documentElement.scrollHeight - window.innerHeight,
        horizontalOverflow: document.documentElement.scrollWidth - window.innerWidth
      }
    };
    
    // Analyze elements
    const selectors = {
      header: 'header',
      main: 'main',
      draftContainer: '.draft-container',
      draftMainArea: '.draft-main-area',
      pickBanPhase: '.pick-ban-phase',
      heroGrid: '.hero-grid',
      heroCards: '.hero-card',
      teamPanels: '.team-panel',
      centerArea: '.center-area',
      heroFilters: '.hero-filters'
    };
    
    result.elements = {};
    
    Object.entries(selectors).forEach(([name, selector]) => {
      const elements = document.querySelectorAll(selector);
      const element = document.querySelector(selector);
      
      if (element) {
        const rect = element.getBoundingClientRect();
        const styles = window.getComputedStyle(element);
        
        result.elements[name] = {
          found: true,
          count: elements.length,
          dimensions: {
            width: element.offsetWidth,
            height: element.offsetHeight,
            clientWidth: element.clientWidth,
            clientHeight: element.clientHeight
          },
          position: {
            top: rect.top,
            bottom: rect.bottom,
            left: rect.left,
            right: rect.right
          },
          computed: {
            display: styles.display,
            overflow: styles.overflow,
            overflowY: styles.overflowY,
            height: styles.height,
            maxHeight: styles.maxHeight,
            minHeight: styles.minHeight
          },
          visibility: {
            inViewport: rect.top < result.viewport.height && rect.bottom > 0,
            fullyVisible: rect.top >= 0 && rect.bottom <= result.viewport.height,
            aboveViewport: rect.bottom < 0,
            belowViewport: rect.top > result.viewport.height
          }
        };
      } else {
        result.elements[name] = { found: false, count: elements.length };
      }
    });
    
    // Identify specific layout issues
    result.issues = [];
    
    if (result.scroll.hasVertical) {
      result.issues.push({
        type: 'OVERFLOW',
        severity: 'HIGH',
        message: `Page overflows viewport by ${result.scroll.verticalOverflow}px vertically`
      });
    }
    
    if (result.elements.heroGrid.found && !result.elements.heroGrid.visibility.fullyVisible) {
      result.issues.push({
        type: 'HERO_GRID_VISIBILITY',
        severity: 'HIGH',
        message: 'Hero grid is not fully visible in viewport',
        details: result.elements.heroGrid.visibility
      });
    }
    
    if (result.elements.draftMainArea.found) {
      const draftArea = result.elements.draftMainArea;
      const tooTall = draftArea.dimensions.height > result.viewport.height;
      if (tooTall) {
        result.issues.push({
          type: 'DRAFT_AREA_TOO_TALL',
          severity: 'HIGH',
          message: `Draft area (${draftArea.dimensions.height}px) taller than viewport (${result.viewport.height}px)`
        });
      }
    }
    
    // Check for missing elements
    const criticalElements = ['heroGrid', 'teamPanels', 'draftMainArea'];
    criticalElements.forEach(elementName => {
      if (!result.elements[elementName].found) {
        result.issues.push({
          type: 'MISSING_ELEMENT',
          severity: 'CRITICAL',
          message: `Critical element missing: ${elementName}`
        });
      }
    });
    
    return result;
  });
  
  // Display results
  console.log(`🌐 URL: ${analysis.url}`);
  console.log(`📏 Page Size: ${analysis.document.width}x${analysis.document.height}`);
  console.log(`📜 Scrolling: ${analysis.scroll.hasVertical ? `YES (${analysis.scroll.verticalOverflow}px overflow)` : 'NO'}`);
  
  console.log('\n📋 ELEMENTS FOUND:');
  Object.entries(analysis.elements).forEach(([name, info]) => {
    if (info.found) {
      const visibility = info.visibility ? (info.visibility.fullyVisible ? '✅ FULLY VISIBLE' : 
                                          info.visibility.inViewport ? '⚠️ PARTIALLY VISIBLE' : 
                                          '❌ NOT VISIBLE') : 'N/A';
      console.log(`  ${name}: ${info.dimensions ? `${info.dimensions.width}x${info.dimensions.height}px` : `${info.count} items`} ${visibility}`);
      
      if (info.visibility && !info.visibility.fullyVisible) {
        console.log(`    ↳ Position: top=${Math.round(info.position.top)}, bottom=${Math.round(info.position.bottom)}`);
      }
    } else {
      console.log(`  ${name}: ❌ NOT FOUND`);
    }
  });
  
  if (analysis.issues.length > 0) {
    console.log('\n🚨 LAYOUT ISSUES:');
    analysis.issues.forEach(issue => {
      const icon = issue.severity === 'CRITICAL' ? '💀' : issue.severity === 'HIGH' ? '🔥' : '⚠️';
      console.log(`  ${icon} [${issue.severity}] ${issue.message}`);
    });
  } else {
    console.log('\n✅ NO LAYOUT ISSUES DETECTED');
  }
  
  // Summary
  const isDraftInterface = analysis.elements.heroGrid.found && analysis.elements.teamPanels.found;
  console.log('\n📊 SUMMARY:');
  console.log(`Interface Type: ${isDraftInterface ? '✅ DRAFT INTERFACE' : '❌ NOT DRAFT INTERFACE'}`);
  console.log(`Layout Issues: ${analysis.issues.length} found`);
  console.log(`Viewport Fit: ${!analysis.scroll.hasVertical ? '✅ FITS' : '❌ OVERFLOWS'}`);
  
  return analysis;
}