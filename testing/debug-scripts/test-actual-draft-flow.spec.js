const { test, expect } = require('@playwright/test');

test('Test actual draft flow and layout', async ({ page }) => {
  // Go to main site
  await page.goto('http://localhost:3000');
  await page.waitForLoadState('networkidle');
  
  // Take screenshot of homepage
  await page.screenshot({ path: 'step1-homepage.png', fullPage: true });
  
  try {
    // Look for admin login or test user
    console.log('Looking for admin/auth options...');
    
    // Try to find admin login
    const adminLink = await page.locator('a:has-text("Admin"), a[href*="admin"], button:has-text("Admin")').first();
    if (await adminLink.isVisible()) {
      await adminLink.click();
      await page.waitForLoadState('networkidle');
      await page.screenshot({ path: 'step2-admin-login.png', fullPage: true });
    }
    
    // Try Discord auth or test auth
    const discordAuth = await page.locator('a:has-text("Discord"), button:has-text("Discord"), a[href*="discord"]').first();
    if (await discordAuth.isVisible()) {
      await discordAuth.click();
      await page.waitForLoadState('networkidle');
      await page.screenshot({ path: 'step3-after-auth.png', fullPage: true });
    }
    
    // Look for tournaments
    console.log('Looking for tournaments...');
    const tournamentLink = await page.locator('a:has-text("Tournament"), a[href*="tournament"], .tournament-card').first();
    if (await tournamentLink.isVisible()) {
      await tournamentLink.click();
      await page.waitForLoadState('networkidle');
      await page.screenshot({ path: 'step4-tournament-page.png', fullPage: true });
    }
    
    // Look for drafts section or manage drafts
    console.log('Looking for drafts...');
    const draftsLink = await page.locator('a:has-text("Draft"), a:has-text("Manage Draft"), button:has-text("Draft")').first();
    if (await draftsLink.isVisible()) {
      await draftsLink.click();
      await page.waitForLoadState('networkidle');
      await page.screenshot({ path: 'step5-drafts-page.png', fullPage: true });
      
      // Look for "Enter as" links
      const enterAsLinks = await page.locator('a:has-text("Enter as"), [href*="captain"]');
      if (await enterAsLinks.count() > 0) {
        await enterAsLinks.first().click();
        await page.waitForLoadState('networkidle');
        await page.screenshot({ path: 'step6-draft-interface.png', fullPage: true });
        
        // Now analyze the draft interface
        await analyzeDraftInterface(page);
      }
    }
    
  } catch (error) {
    console.log('Error during flow:', error.message);
    await page.screenshot({ path: 'error-state.png', fullPage: true });
  }
});

async function analyzeDraftInterface(page) {
  console.log('=== Analyzing Draft Interface ===');
  
  // Check viewport and page dimensions
  const viewport = page.viewportSize();
  console.log('Viewport size:', viewport);
  
  const pageInfo = await page.evaluate(() => {
    return {
      windowWidth: window.innerWidth,
      windowHeight: window.innerHeight,
      documentWidth: document.documentElement.scrollWidth,
      documentHeight: document.documentElement.scrollHeight,
      bodyWidth: document.body.scrollWidth,
      bodyHeight: document.body.scrollHeight
    };
  });
  
  console.log('Page dimensions:', pageInfo);
  
  // Check for main layout elements
  const elementInfo = await page.evaluate(() => {
    const header = document.querySelector('header');
    const main = document.querySelector('main');
    const draftArea = document.querySelector('.draft-main-area');
    const teamPanels = document.querySelectorAll('.team-panel');
    const centerArea = document.querySelector('.center-area');
    const heroGrid = document.querySelector('.hero-grid');
    const heroCards = document.querySelectorAll('.hero-card');
    
    return {
      header: header ? { height: header.offsetHeight, visible: true } : { visible: false },
      main: main ? { height: main.offsetHeight, visible: true } : { visible: false },
      draftArea: draftArea ? { 
        height: draftArea.offsetHeight, 
        width: draftArea.offsetWidth,
        visible: true 
      } : { visible: false },
      teamPanelCount: teamPanels.length,
      centerArea: centerArea ? {
        height: centerArea.offsetHeight,
        width: centerArea.offsetWidth,
        visible: true
      } : { visible: false },
      heroGrid: heroGrid ? {
        height: heroGrid.offsetHeight,
        width: heroGrid.offsetWidth,
        visible: true
      } : { visible: false },
      heroCardCount: heroCards.length
    };
  });
  
  console.log('Layout elements:', elementInfo);
  
  // Check if content fits in viewport
  const fitsInViewport = pageInfo.documentHeight <= pageInfo.windowHeight;
  console.log('Content fits in viewport:', fitsInViewport);
  
  if (!fitsInViewport) {
    console.log(`Content overflows by ${pageInfo.documentHeight - pageInfo.windowHeight}px`);
  }
  
  // Check for scrollbars
  const scrollInfo = await page.evaluate(() => {
    return {
      hasVerticalScroll: document.documentElement.scrollHeight > document.documentElement.clientHeight,
      hasHorizontalScroll: document.documentElement.scrollWidth > document.documentElement.clientWidth
    };
  });
  
  console.log('Scroll info:', scrollInfo);
  
  // Take final screenshot of current state
  await page.screenshot({ path: 'final-draft-analysis.png', fullPage: true });
}