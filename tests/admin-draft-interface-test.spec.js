const { test, expect } = require('@playwright/test');

test('Test draft interface with admin login', async ({ page }) => {
  console.log('=== Testing Draft Interface with Admin User ===');
  
  try {
    // Step 1: Go to homepage
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'admin-test-1-homepage.png', fullPage: true });
    
    // Step 2: Try to access admin or login
    console.log('Looking for login/admin access...');
    
    // Try clicking "Login with Discord" first
    const discordLogin = await page.locator('button:has-text("Login with Discord"), a:has-text("Get Started with Discord"), a:has-text("Login with Discord")');
    if (await discordLogin.first().isVisible()) {
      console.log('Clicking Discord login...');
      await discordLogin.first().click();
      await page.waitForLoadState('networkidle');
      await page.screenshot({ path: 'admin-test-2-after-discord-click.png', fullPage: true });
    }
    
    // Try to go directly to admin page
    console.log('Trying direct admin access...');
    await page.goto('http://localhost:3000/admin');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'admin-test-3-admin-page.png', fullPage: true });
    
    // If there's a login form, try to use it
    const loginForm = await page.locator('form, input[type="email"], input[type="password"]').first();
    if (await loginForm.isVisible()) {
      console.log('Found login form, trying to login...');
      
      // Try common admin credentials
      const emailInput = await page.locator('input[type="email"], input[name="email"], input[placeholder*="email"]');
      const passwordInput = await page.locator('input[type="password"], input[name="password"]');
      
      if (await emailInput.isVisible() && await passwordInput.isVisible()) {
        await emailInput.fill('admin@test.com');
        await passwordInput.fill('password123');
        
        const submitButton = await page.locator('button[type="submit"], input[type="submit"], button:has-text("Login")');
        if (await submitButton.isVisible()) {
          await submitButton.click();
          await page.waitForLoadState('networkidle');
          await page.screenshot({ path: 'admin-test-4-after-login.png', fullPage: true });
        }
      }
    }
    
    // Step 3: Look for tournaments
    console.log('Looking for tournaments...');
    await page.goto('http://localhost:3000/tournaments');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'admin-test-5-tournaments.png', fullPage: true });
    
    // Look for tournament with drafts
    const tournamentCards = await page.locator('.card, .tournament-card, a[href*="tournament"]');
    const tournamentCount = await tournamentCards.count();
    console.log(`Found ${tournamentCount} tournaments`);
    
    if (tournamentCount > 0) {
      // Click first tournament
      await tournamentCards.first().click();
      await page.waitForLoadState('networkidle');
      await page.screenshot({ path: 'admin-test-6-tournament-detail.png', fullPage: true });
      
      // Look for draft management or admin controls
      const draftControls = await page.locator('a:has-text("Manage"), a:has-text("Admin"), a:has-text("Draft"), button:has-text("Draft")');
      const draftControlCount = await draftControls.count();
      console.log(`Found ${draftControlCount} draft controls`);
      
      if (draftControlCount > 0) {
        await draftControls.first().click();
        await page.waitForLoadState('networkidle');
        await page.screenshot({ path: 'admin-test-7-draft-management.png', fullPage: true });
        
        // Look for "Enter as" links or draft interface
        const enterAsLinks = await page.locator('a:has-text("Enter as"), a[href*="captain="]');
        const enterAsCount = await enterAsLinks.count();
        console.log(`Found ${enterAsCount} "Enter as" links`);
        
        if (enterAsCount > 0) {
          // Click first "Enter as" link
          await enterAsLinks.first().click();
          await page.waitForLoadState('networkidle');
          await page.screenshot({ path: 'admin-test-8-draft-interface.png', fullPage: true });
          
          // Now analyze the draft interface
          await analyzeDraftInterface(page);
        }
      }
    }
    
    // Also try direct draft URLs that might work with admin session
    console.log('Trying direct draft access with session...');
    const directUrls = [
      'http://localhost:4000/draft/draft_1755096241135_u6qo7qmem?captain=1',
      'http://localhost:3000/drafts'
    ];
    
    for (const url of directUrls) {
      try {
        console.log(`Trying: ${url}`);
        await page.goto(url);
        await page.waitForTimeout(2000);
        await page.screenshot({ path: `admin-test-direct-${url.split('/').pop()}.png`, fullPage: true });
        await analyzeDraftInterface(page);
      } catch (e) {
        console.log(`Failed ${url}:`, e.message);
      }
    }
    
  } catch (error) {
    console.log('Test error:', error.message);
    await page.screenshot({ path: 'admin-test-error.png', fullPage: true });
  }
});

async function analyzeDraftInterface(page) {
  console.log('\n=== ANALYZING DRAFT INTERFACE ===');
  
  const viewport = page.viewportSize();
  console.log('Viewport:', viewport);
  
  const analysis = await page.evaluate(() => {
    const elements = {
      url: window.location.href,
      title: document.title,
      windowHeight: window.innerHeight,
      windowWidth: window.innerWidth,
      documentHeight: document.documentElement.scrollHeight,
      documentWidth: document.documentElement.scrollWidth,
      bodyHeight: document.body.offsetHeight,
      hasScrollY: document.documentElement.scrollHeight > document.documentElement.clientHeight,
      hasScrollX: document.documentElement.scrollWidth > document.documentElement.clientWidth
    };
    
    // Check for key draft elements
    const header = document.querySelector('header');
    const main = document.querySelector('main');
    const draftArea = document.querySelector('.draft-main-area');
    const heroGrid = document.querySelector('.hero-grid');
    const teamPanels = document.querySelectorAll('.team-panel');
    const centerArea = document.querySelector('.center-area');
    const heroCards = document.querySelectorAll('.hero-card');
    
    elements.layout = {
      header: header ? { 
        height: header.offsetHeight, 
        visible: header.getBoundingClientRect().top >= -10 && header.getBoundingClientRect().bottom <= elements.windowHeight + 10
      } : null,
      main: main ? { 
        height: main.offsetHeight,
        top: main.getBoundingClientRect().top,
        bottom: main.getBoundingClientRect().bottom
      } : null,
      draftArea: draftArea ? {
        height: draftArea.offsetHeight,
        width: draftArea.offsetWidth,
        top: draftArea.getBoundingClientRect().top,
        bottom: draftArea.getBoundingClientRect().bottom,
        fitsInViewport: draftArea.getBoundingClientRect().bottom <= elements.windowHeight
      } : null,
      heroGrid: heroGrid ? {
        height: heroGrid.offsetHeight,
        width: heroGrid.offsetWidth,
        top: heroGrid.getBoundingClientRect().top,
        bottom: heroGrid.getBoundingClientRect().bottom,
        visible: heroGrid.getBoundingClientRect().top < elements.windowHeight && heroGrid.getBoundingClientRect().bottom > 0,
        fullyVisible: heroGrid.getBoundingClientRect().top >= 0 && heroGrid.getBoundingClientRect().bottom <= elements.windowHeight
      } : null,
      teamPanelCount: teamPanels.length,
      heroCardCount: heroCards.length,
      centerArea: centerArea ? {
        height: centerArea.offsetHeight,
        width: centerArea.offsetWidth
      } : null
    };
    
    // Calculate layout problems
    elements.problems = [];
    
    if (elements.hasScrollY) {
      elements.problems.push(`Vertical scroll present - content ${elements.documentHeight}px vs window ${elements.windowHeight}px`);
    }
    
    if (elements.layout.draftArea && !elements.layout.draftArea.fitsInViewport) {
      elements.problems.push(`Draft area extends ${elements.layout.draftArea.bottom - elements.windowHeight}px below viewport`);
    }
    
    if (elements.layout.heroGrid && !elements.layout.heroGrid.fullyVisible) {
      elements.problems.push(`Hero grid not fully visible in viewport`);
    }
    
    return elements;
  });
  
  console.log('Draft Interface Analysis:', JSON.stringify(analysis, null, 2));
  
  if (analysis.problems.length > 0) {
    console.log('\n❌ LAYOUT PROBLEMS FOUND:');
    analysis.problems.forEach(problem => console.log(`  - ${problem}`));
  } else {
    console.log('\n✅ No layout problems detected');
  }
  
  return analysis;
}