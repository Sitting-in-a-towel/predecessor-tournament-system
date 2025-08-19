const { test, expect } = require('@playwright/test');

test('Debug draft layout issues', async ({ page }) => {
  // Go to main site first
  await page.goto('http://localhost:3000');
  await page.waitForLoadState('networkidle');
  
  // Take screenshot of homepage
  await page.screenshot({ path: 'debug-homepage.png', fullPage: true });
  
  try {
    // Try to find and click tournament link
    console.log('Looking for tournament links...');
    
    // Look for tournament cards or links
    const tournamentCards = await page.locator('.tournament-card, .card, [data-testid*="tournament"], a[href*="tournament"]').count();
    console.log(`Found ${tournamentCards} tournament-related elements`);
    
    if (tournamentCards > 0) {
      // Click first tournament
      await page.locator('.tournament-card, .card, [data-testid*="tournament"], a[href*="tournament"]').first().click();
      await page.waitForLoadState('networkidle');
      await page.screenshot({ path: 'debug-tournament-page.png', fullPage: true });
      
      // Look for draft links
      const draftLinks = await page.locator('a[href*="draft"], button:has-text("draft"), [data-testid*="draft"]').count();
      console.log(`Found ${draftLinks} draft-related elements`);
      
      if (draftLinks > 0) {
        await page.locator('a[href*="draft"], button:has-text("draft"), [data-testid*="draft"]').first().click();
        await page.waitForLoadState('networkidle');
        await page.screenshot({ path: 'debug-draft-page.png', fullPage: true });
      }
    }
    
    // Try direct Phoenix draft URL if we know a draft exists
    console.log('Trying direct Phoenix draft URL...');
    await page.goto('http://localhost:4000/draft/draft_1755096241135_u6qo7qmem?captain=1&token=test_token');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'debug-phoenix-draft.png', fullPage: true });
    
    // Check page dimensions and layout
    const viewport = page.viewportSize();
    console.log('Viewport size:', viewport);
    
    // Check if elements are visible
    const headerVisible = await page.isVisible('header');
    const mainVisible = await page.isVisible('main');
    const heroGridVisible = await page.isVisible('.hero-grid, [data-testid="hero-grid"]');
    
    console.log('Element visibility:', {
      header: headerVisible,
      main: mainVisible,
      heroGrid: heroGridVisible
    });
    
    // Check for scrollbars
    const hasVerticalScroll = await page.evaluate(() => {
      return document.documentElement.scrollHeight > document.documentElement.clientHeight;
    });
    
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    
    console.log('Scroll status:', {
      verticalScroll: hasVerticalScroll,
      horizontalScroll: hasHorizontalScroll
    });
    
    // Check layout dimensions
    const layoutInfo = await page.evaluate(() => {
      const body = document.body;
      const main = document.querySelector('main');
      const draftArea = document.querySelector('.draft-main-area');
      const heroGrid = document.querySelector('.hero-grid');
      
      return {
        bodyHeight: body.offsetHeight,
        mainHeight: main ? main.offsetHeight : null,
        draftAreaHeight: draftArea ? draftArea.offsetHeight : null,
        heroGridHeight: heroGrid ? heroGrid.offsetHeight : null,
        windowHeight: window.innerHeight,
        windowWidth: window.innerWidth
      };
    });
    
    console.log('Layout dimensions:', layoutInfo);
    
  } catch (error) {
    console.log('Error during navigation:', error.message);
    await page.screenshot({ path: 'debug-error.png', fullPage: true });
  }
});