const { test, expect } = require('@playwright/test');

test('Direct draft interface test', async ({ page }) => {
  console.log('=== Testing Draft Interface Layout ===');
  
  // First, let's go to the homepage and authenticate
  await page.goto('http://localhost:3000');
  await page.waitForLoadState('networkidle');
  
  // Click "Login with Discord" or similar auth button
  try {
    const loginButton = await page.locator('button:has-text("Login with Discord"), a:has-text("Get Started with Discord")');
    if (await loginButton.first().isVisible()) {
      await loginButton.first().click();
      await page.waitForLoadState('networkidle');
      console.log('Clicked auth button');
    }
  } catch (e) {
    console.log('No login button found, continuing...');
  }
  
  // Go to tournaments page
  try {
    const tournamentsLink = await page.locator('a:has-text("Tournaments"), a[href*="tournament"]');
    if (await tournamentsLink.first().isVisible()) {
      await tournamentsLink.first().click();
      await page.waitForLoadState('networkidle');
      await page.screenshot({ path: 'tournaments-page.png', fullPage: true });
      console.log('Navigated to tournaments page');
      
      // Look for any tournament and click it
      const tournamentCards = await page.locator('.card, .tournament-card, a[href*="tournament"]');
      if (await tournamentCards.count() > 0) {
        await tournamentCards.first().click();
        await page.waitForLoadState('networkidle');
        await page.screenshot({ path: 'tournament-details.png', fullPage: true });
        console.log('Clicked on tournament');
        
        // Look for draft-related content
        await page.screenshot({ path: 'looking-for-drafts.png', fullPage: true });
        
        // Try to find and click anything draft-related
        const draftElements = await page.locator('a:has-text("Draft"), button:has-text("Draft"), a:has-text("Enter as"), [href*="draft"]');
        console.log(`Found ${await draftElements.count()} draft elements`);
        
        if (await draftElements.count() > 0) {
          await draftElements.first().click();
          await page.waitForLoadState('networkidle');
          await page.screenshot({ path: 'draft-page-attempt.png', fullPage: true });
          
          // Now analyze what we see
          await analyzePage(page, 'Draft from tournament flow');
        }
      }
    }
  } catch (e) {
    console.log('Tournament flow error:', e.message);
  }
  
  // Also try the direct Phoenix URL with a better token approach
  console.log('Trying direct Phoenix access...');
  
  // First check if there are any active drafts in the system
  await page.goto('http://localhost:4000');
  await page.screenshot({ path: 'phoenix-root.png', fullPage: true });
  
  // Try common draft URLs
  const draftUrls = [
    'http://localhost:4000/draft/draft_1755096241135_u6qo7qmem?captain=1',
    'http://localhost:4000/admin',
    'http://localhost:4000/drafts'
  ];
  
  for (const url of draftUrls) {
    try {
      console.log(`Trying: ${url}`);
      await page.goto(url);
      await page.waitForLoadState('networkidle', { timeout: 5000 });
      await page.screenshot({ path: `attempt-${url.split('/').pop()}.png`, fullPage: true });
      await analyzePage(page, `Direct access: ${url}`);
    } catch (e) {
      console.log(`Failed ${url}:`, e.message);
    }
  }
});

async function analyzePage(page, context) {
  console.log(`\n=== Analysis for: ${context} ===`);
  
  // Get page info
  const pageInfo = await page.evaluate(() => {
    const elements = {
      title: document.title,
      hasHeroGrid: !!document.querySelector('.hero-grid'),
      hasDraftArea: !!document.querySelector('.draft-main-area'),
      hasTeamPanels: document.querySelectorAll('.team-panel').length,
      hasError: !!document.querySelector('.error, [class*="error"]'),
      bodyHeight: document.body.offsetHeight,
      windowHeight: window.innerHeight,
      scrollHeight: document.documentElement.scrollHeight,
      url: window.location.href
    };
    
    // Check specific layout issues
    const layoutIssues = [];
    
    // Check if draft area exists but is too tall
    const draftArea = document.querySelector('.draft-main-area');
    if (draftArea) {
      const rect = draftArea.getBoundingClientRect();
      if (rect.height > window.innerHeight * 0.8) {
        layoutIssues.push(`Draft area too tall: ${rect.height}px`);
      }
      if (rect.bottom > window.innerHeight) {
        layoutIssues.push(`Draft area extends below viewport by ${rect.bottom - window.innerHeight}px`);
      }
    }
    
    // Check if hero grid is visible
    const heroGrid = document.querySelector('.hero-grid');
    if (heroGrid) {
      const rect = heroGrid.getBoundingClientRect();
      if (rect.bottom > window.innerHeight || rect.top < 0) {
        layoutIssues.push(`Hero grid not fully visible in viewport`);
      }
    }
    
    elements.layoutIssues = layoutIssues;
    return elements;
  });
  
  console.log('Page analysis:', pageInfo);
  
  // Check if we're on a draft page
  if (pageInfo.hasHeroGrid) {
    console.log('✅ Found hero grid - analyzing draft interface');
    
    // Get detailed hero grid info
    const heroGridInfo = await page.evaluate(() => {
      const heroGrid = document.querySelector('.hero-grid');
      const heroCards = document.querySelectorAll('.hero-card');
      const teamPanels = document.querySelectorAll('.team-panel');
      
      return {
        heroGridRect: heroGrid ? {
          width: heroGrid.offsetWidth,
          height: heroGrid.offsetHeight,
          top: heroGrid.getBoundingClientRect().top,
          bottom: heroGrid.getBoundingClientRect().bottom
        } : null,
        heroCardCount: heroCards.length,
        teamPanelCount: teamPanels.length,
        isGridVisible: heroGrid ? heroGrid.getBoundingClientRect().top >= 0 && heroGrid.getBoundingClientRect().bottom <= window.innerHeight : false
      };
    });
    
    console.log('Hero grid details:', heroGridInfo);
    
    if (!heroGridInfo.isGridVisible) {
      console.log('❌ PROBLEM: Hero grid is not fully visible in viewport');
    } else {
      console.log('✅ Hero grid is visible');
    }
  } else if (pageInfo.hasError) {
    console.log('❌ Error page detected');
  } else {
    console.log('ℹ️  Not a draft interface');
  }
  
  return pageInfo;
}