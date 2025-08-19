const { test, expect } = require('@playwright/test');

test('Test Draft Test Tournament interface', async ({ page }) => {
  console.log('=== Testing Draft Test Tournament ===');
  
  try {
    // Go to tournaments page
    await page.goto('http://localhost:3000/tournaments');
    await page.waitForLoadState('networkidle');
    console.log('Loaded tournaments page');
    
    // Look for "Draft Test Tournament" specifically
    const draftTestTournament = await page.locator('text="Draft Test Tournament"');
    if (await draftTestTournament.isVisible()) {
      console.log('Found Draft Test Tournament');
      
      // Click on the "View Details" button for Draft Test Tournament
      const draftTournamentCard = await page.locator('.card:has-text("Draft Test Tournament")');
      const viewDetailsBtn = await draftTournamentCard.locator('button:has-text("View Details")');
      
      if (await viewDetailsBtn.isVisible()) {
        await viewDetailsBtn.click();
        await page.waitForLoadState('networkidle');
        await page.screenshot({ path: 'draft-tournament-details.png', fullPage: true });
        console.log('Clicked View Details for Draft Test Tournament');
        
        // Look for draft-related content or admin controls
        await page.screenshot({ path: 'looking-for-draft-controls.png', fullPage: true });
        
        // Try to find draft management or "Enter as" links
        const draftLinks = await page.locator('a:has-text("Draft"), a:has-text("Enter as"), a:has-text("Manage Draft"), button:has-text("Draft")');
        const linkCount = await draftLinks.count();
        console.log(`Found ${linkCount} draft-related links`);
        
        if (linkCount > 0) {
          // Click the first draft link
          await draftLinks.first().click();
          await page.waitForLoadState('networkidle');
          await page.screenshot({ path: 'draft-interface-loaded.png', fullPage: true });
          console.log('Clicked on draft link');
          
          // Analyze the draft interface
          await analyzeDraftLayout(page);
        } else {
          // Maybe we need to look in different areas - check the full page
          const pageText = await page.textContent('body');
          console.log('Page contains:', pageText.substring(0, 500) + '...');
          
          // Try clicking on any admin or management related links
          const adminLinks = await page.locator('a:has-text("Admin"), a:has-text("Manage"), button:has-text("Admin")');
          if (await adminLinks.count() > 0) {
            await adminLinks.first().click();
            await page.waitForLoadState('networkidle');
            await page.screenshot({ path: 'admin-section.png', fullPage: true });
          }
        }
        
        // Try to access draft directly if we know the pattern
        console.log('Trying direct draft access...');
        const currentUrl = page.url();
        const tournamentId = currentUrl.split('/').pop();
        console.log(`Tournament ID: ${tournamentId}`);
        
        // Try common draft URLs for this tournament
        const draftUrls = [
          `${currentUrl}/drafts`,
          `${currentUrl}/draft`,
          `${currentUrl}/admin`,
          `http://localhost:3000/admin/tournaments/${tournamentId}`
        ];
        
        for (const url of draftUrls) {
          try {
            console.log(`Trying: ${url}`);
            await page.goto(url);
            await page.waitForLoadState('networkidle', { timeout: 3000 });
            await page.screenshot({ path: `draft-attempt-${url.split('/').pop()}.png`, fullPage: true });
            
            // Check if this page has draft interface
            const hasDraftInterface = await page.evaluate(() => {
              return !!(document.querySelector('.hero-grid') || document.querySelector('.draft-main-area'));
            });
            
            if (hasDraftInterface) {
              console.log(`Found draft interface at: ${url}`);
              await analyzeDraftLayout(page);
              break;
            }
          } catch (e) {
            console.log(`Failed ${url}: ${e.message}`);
          }
        }
      }
    } else {
      console.log('Draft Test Tournament not found');
      // Take screenshot of what we see
      await page.screenshot({ path: 'tournaments-page-no-draft-test.png', fullPage: true });
    }
    
  } catch (error) {
    console.log('Test error:', error.message);
    await page.screenshot({ path: 'test-error-draft-tournament.png', fullPage: true });
  }
});

async function analyzeDraftLayout(page) {
  console.log('\n=== DRAFT LAYOUT ANALYSIS ===');
  
  const viewport = page.viewportSize();
  console.log('Browser viewport:', viewport);
  
  const analysis = await page.evaluate(() => {
    const info = {
      url: window.location.href,
      windowSize: { width: window.innerWidth, height: window.innerHeight },
      documentSize: { 
        width: document.documentElement.scrollWidth, 
        height: document.documentElement.scrollHeight 
      },
      scrollPosition: { x: window.scrollX, y: window.scrollY },
      hasVerticalScroll: document.documentElement.scrollHeight > window.innerHeight,
      hasHorizontalScroll: document.documentElement.scrollWidth > window.innerWidth
    };
    
    // Find key elements
    const elements = {
      header: document.querySelector('header'),
      main: document.querySelector('main'),
      draftContainer: document.querySelector('.draft-container'),
      draftMainArea: document.querySelector('.draft-main-area'),
      heroGrid: document.querySelector('.hero-grid'),
      heroCards: document.querySelectorAll('.hero-card'),
      teamPanels: document.querySelectorAll('.team-panel'),
      centerArea: document.querySelector('.center-area')
    };
    
    // Analyze each element
    info.elements = {};
    Object.keys(elements).forEach(key => {
      const el = elements[key];
      if (el) {
        const rect = el.getBoundingClientRect();
        info.elements[key] = {
          exists: true,
          dimensions: { width: el.offsetWidth, height: el.offsetHeight },
          position: { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right },
          visible: rect.top < info.windowSize.height && rect.bottom > 0,
          fullyVisible: rect.top >= 0 && rect.bottom <= info.windowSize.height
        };
      } else {
        info.elements[key] = { exists: false };
      }
    });
    
    // Special handling for collections
    info.elements.heroCards = { count: elements.heroCards.length, exists: elements.heroCards.length > 0 };
    info.elements.teamPanels = { count: elements.teamPanels.length, exists: elements.teamPanels.length > 0 };
    
    // Identify layout problems
    info.problems = [];
    
    if (info.hasVerticalScroll) {
      const overflow = info.documentSize.height - info.windowSize.height;
      info.problems.push(`Content overflows viewport by ${overflow}px vertically`);
    }
    
    if (info.elements.heroGrid.exists && !info.elements.heroGrid.fullyVisible) {
      info.problems.push('Hero grid is not fully visible in viewport');
    }
    
    if (info.elements.draftMainArea.exists) {
      const draftArea = info.elements.draftMainArea;
      if (draftArea.dimensions.height > info.windowSize.height * 0.9) {
        info.problems.push(`Draft area is too tall: ${draftArea.dimensions.height}px vs window ${info.windowSize.height}px`);
      }
    }
    
    return info;
  });
  
  console.log('=== ANALYSIS RESULTS ===');
  console.log(`URL: ${analysis.url}`);
  console.log(`Window: ${analysis.windowSize.width}x${analysis.windowSize.height}`);
  console.log(`Document: ${analysis.documentSize.width}x${analysis.documentSize.height}`);
  console.log(`Scroll: ${analysis.hasVerticalScroll ? 'YES' : 'NO'} vertical, ${analysis.hasHorizontalScroll ? 'YES' : 'NO'} horizontal`);
  
  console.log('\n=== ELEMENTS ===');
  Object.entries(analysis.elements).forEach(([name, info]) => {
    if (info.exists) {
      const visible = info.visible ? (info.fullyVisible ? '✅ FULLY VISIBLE' : '⚠️ PARTIALLY VISIBLE') : '❌ NOT VISIBLE';
      console.log(`${name}: ${info.dimensions ? `${info.dimensions.width}x${info.dimensions.height}px` : `count: ${info.count}`} - ${visible}`);
    } else {
      console.log(`${name}: ❌ NOT FOUND`);
    }
  });
  
  if (analysis.problems.length > 0) {
    console.log('\n=== PROBLEMS ===');
    analysis.problems.forEach(problem => console.log(`❌ ${problem}`));
  } else {
    console.log('\n✅ No layout problems detected');
  }
  
  // Check if this looks like a proper draft interface
  const isDraftInterface = analysis.elements.heroGrid.exists && analysis.elements.teamPanels.exists;
  console.log(`\n=== INTERFACE TYPE ===`);
  console.log(isDraftInterface ? '✅ This is a draft interface' : '❌ This is NOT a draft interface');
  
  return analysis;
}