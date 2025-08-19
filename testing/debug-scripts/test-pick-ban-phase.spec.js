const { test, expect } = require('@playwright/test');

test('Test pick/ban phase functionality', async ({ browser }) => {
  // Create two browser contexts for two players
  const context1 = await browser.newContext();
  const context2 = await browser.newContext();
  
  const page1 = await context1.newPage();
  const page2 = await context2.newPage();
  
  // Use the test draft that should be in Ban Phase
  const draftUrl1 = 'http://localhost:4000/draft/draft_1755338592556_wq9gcaat6?token=user_1753774405110_mk5ekhh61_draft_1755338592556_wq9gcaat6_xOfjz1KOBVUe2blFWQHzjyBIBioeSIWFjLYJ9i0se8A&captain=1';
  const draftUrl2 = 'http://localhost:4000/draft/draft_1755338592556_wq9gcaat6?token=user_1753774405110_mk5ekhh61_draft_1755338592556_wq9gcaat6_xOfjz1KOBVUe2blFWQHzjyBIBioeSIWFjLYJ9i0se8A&captain=2';
  
  try {
    console.log('Authenticating as admin user first...');
    
    // Go to admin page and login
    await page1.goto('http://localhost:3000');
    await page1.waitForLoadState('networkidle');
    
    // Look for Discord auth or admin login
    const discordBtn = page1.locator('button:has-text("Discord"), a:has-text("Discord")').first();
    if (await discordBtn.isVisible()) {
      await discordBtn.click();
      await page1.waitForLoadState('networkidle');
    }
    
    // Look for admin link
    const adminLink = page1.locator('a:has-text("Admin"), button:has-text("Admin")').first();
    if (await adminLink.isVisible()) {
      await adminLink.click();
      await page1.waitForLoadState('networkidle');
    }
    
    // Copy authentication to second page (same context approach won't work, so try navigating page2 similarly)
    await page2.goto('http://localhost:3000');
    await page2.waitForLoadState('networkidle');
    
    const discordBtn2 = page2.locator('button:has-text("Discord"), a:has-text("Discord")').first();
    if (await discordBtn2.isVisible()) {
      await discordBtn2.click();
      await page2.waitForLoadState('networkidle');
    }
    
    const adminLink2 = page2.locator('a:has-text("Admin"), button:has-text("Admin")').first();
    if (await adminLink2.isVisible()) {
      await adminLink2.click();
      await page2.waitForLoadState('networkidle');
    }
    
    console.log('Now opening draft pages for both captains...');
    
    // Navigate both pages to the draft
    await Promise.all([
      page1.goto(draftUrl1),
      page2.goto(draftUrl2)
    ]);
    
    // Wait for pages to load
    await Promise.all([
      page1.waitForLoadState('networkidle'),
      page2.waitForLoadState('networkidle')
    ]);
    
    // Take initial screenshots
    await page1.screenshot({ path: 'captain1-initial.png', fullPage: true });
    await page2.screenshot({ path: 'captain2-initial.png', fullPage: true });
    
    // Wait for draft phase to be ready
    await page1.waitForTimeout(5000);
    
    console.log('=== ANALYZING PICK/BAN PHASE ===');
    
    // Check current phase on both pages - look for the actual phase text in the header
    const phase1 = await page1.evaluate(() => {
      // Look for text containing "Phase" or common phase names
      const elements = Array.from(document.querySelectorAll('*')).filter(el => {
        const text = el.textContent;
        return text && (text.includes('Phase') || text.includes('Coin Toss') || text.includes('Complete'));
      });
      return elements.length > 0 ? elements[0].textContent.trim() : 'Phase not found';
    });
    
    const phase2 = await page2.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('*')).filter(el => {
        const text = el.textContent;
        return text && (text.includes('Phase') || text.includes('Coin Toss') || text.includes('Complete'));
      });
      return elements.length > 0 ? elements[0].textContent.trim() : 'Phase not found';
    });
    
    console.log('Captain 1 sees phase:', phase1);
    console.log('Captain 2 sees phase:', phase2);
    
    // Check timer display - look for "Timer:" text or clock emoji
    const timer1 = await page1.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('*')).filter(el => {
        const text = el.textContent;
        return text && (text.includes('Timer:') || text.includes('⏱️'));
      });
      return elements.length > 0 ? elements[0].textContent.trim() : 'Timer not found';
    });
    
    const timer2 = await page2.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('*')).filter(el => {
        const text = el.textContent;
        return text && (text.includes('Timer:') || text.includes('⏱️'));
      });
      return elements.length > 0 ? elements[0].textContent.trim() : 'Timer not found';
    });
    
    console.log('Captain 1 sees timer:', timer1);
    console.log('Captain 2 sees timer:', timer2);
    
    // Check whose turn it is
    const currentTurn1 = await page1.evaluate(() => {
      const turnIndicator = document.querySelector('.current-turn, .active-team, [data-testid="current-turn"]');
      return turnIndicator ? turnIndicator.textContent : 'Turn indicator not found';
    });
    
    const currentTurn2 = await page2.evaluate(() => {
      const turnIndicator = document.querySelector('.current-turn, .active-team, [data-testid="current-turn"]');
      return turnIndicator ? turnIndicator.textContent : 'Turn indicator not found';
    });
    
    console.log('Captain 1 sees current turn:', currentTurn1);
    console.log('Captain 2 sees current turn:', currentTurn2);
    
    // Check if hero selection is available
    const heroCards1 = await page1.locator('.hero-card, .hero-item, [data-testid="hero"]').count();
    const heroCards2 = await page2.locator('.hero-card, .hero-item, [data-testid="hero"]').count();
    
    console.log('Captain 1 sees', heroCards1, 'hero cards');
    console.log('Captain 2 sees', heroCards2, 'hero cards');
    
    // Try to select a hero (first available one)
    console.log('Attempting hero selection...');
    
    if (heroCards1 > 0) {
      const firstHero1 = page1.locator('.hero-card, .hero-item, [data-testid="hero"]').first();
      const heroName1 = await firstHero1.getAttribute('data-hero-id') || await firstHero1.textContent() || 'Unknown hero';
      
      console.log('Captain 1 trying to select hero:', heroName1);
      await firstHero1.click();
      await page1.waitForTimeout(1000);
      
      // Check if hero was selected
      const selectedHero1 = await page1.locator('.selected-hero, .hero-selected, [data-testid="selected-hero"]').textContent().catch(() => 'No selection detected');
      console.log('Captain 1 selection result:', selectedHero1);
      
      // Look for confirm button
      const confirmBtn1 = page1.locator('button:has-text("Confirm"), button:has-text("Lock"), [data-testid="confirm"]');
      if (await confirmBtn1.isVisible()) {
        console.log('Captain 1 has confirm button available');
        await confirmBtn1.click();
        await page1.waitForTimeout(2000);
        
        // Check if selection was confirmed
        const confirmed1 = await page1.locator('.confirmed-selection, .locked-selection').count();
        console.log('Captain 1 confirmed selections:', confirmed1);
      } else {
        console.log('Captain 1 confirm button not visible or not found');
      }
    }
    
    // Take screenshots after selection attempt
    await page1.screenshot({ path: 'captain1-after-selection.png', fullPage: true });
    await page2.screenshot({ path: 'captain2-after-selection.png', fullPage: true });
    
    // Check final state
    console.log('=== FINAL STATE ANALYSIS ===');
    
    // Check if turn switched
    const finalTurn1 = await page1.evaluate(() => {
      const turnIndicator = document.querySelector('.current-turn, .active-team, [data-testid="current-turn"]');
      return turnIndicator ? turnIndicator.textContent : 'Turn indicator not found';
    });
    
    console.log('Final turn state (Captain 1 view):', finalTurn1);
    
    // Check timer state
    const finalTimer1 = await page1.locator('.timer, [data-testid="timer"], .countdown').textContent().catch(() => 'Timer not found');
    const finalTimer2 = await page2.locator('.timer, [data-testid="timer"], .countdown').textContent().catch(() => 'Timer not found');
    
    console.log('Final timer (Captain 1):', finalTimer1);
    console.log('Final timer (Captain 2):', finalTimer2);
    
    // Check for any error messages
    const errors1 = await page1.locator('.error, .alert-danger, [role="alert"]').allTextContents();
    const errors2 = await page2.locator('.error, .alert-danger, [role="alert"]').allTextContents();
    
    if (errors1.length > 0) console.log('Captain 1 errors:', errors1);
    if (errors2.length > 0) console.log('Captain 2 errors:', errors2);
    
    console.log('=== POTENTIAL ISSUES DETECTED ===');
    
    // Analysis of potential issues
    if (phase1 !== phase2) {
      console.log('❌ ISSUE: Different phases displayed to each captain');
    }
    
    if (timer1 !== timer2) {
      console.log('❌ ISSUE: Different timer values displayed to each captain');
    }
    
    if (heroCards1 === 0 && heroCards2 === 0) {
      console.log('❌ ISSUE: No hero cards visible to either captain');
    }
    
    if (currentTurn1 === 'Turn indicator not found' && currentTurn2 === 'Turn indicator not found') {
      console.log('❌ ISSUE: Turn indicator not found on either page');
    }
    
    if (timer1.includes('Timer not found') || timer2.includes('Timer not found')) {
      console.log('❌ ISSUE: Timer not displaying properly');
    }
    
  } catch (error) {
    console.log('Test error:', error.message);
    await page1.screenshot({ path: 'error-captain1.png', fullPage: true });
    await page2.screenshot({ path: 'error-captain2.png', fullPage: true });
  } finally {
    await context1.close();
    await context2.close();
  }
});