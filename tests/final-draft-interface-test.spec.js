const { test, expect } = require('@playwright/test');

test('Access Draft Test Tournament detail page and draft interface', async ({ page }) => {
  console.log('=== Final Draft Interface Test ===');
  
  try {
    // Step 1: Go to tournaments
    await page.goto('http://localhost:3000/tournaments');
    await page.waitForLoadState('networkidle');
    console.log('✅ Loaded tournaments page');
    
    // Step 2: Click "View Details" for "Draft Test Tournament"
    const draftTournamentCard = await page.locator('.card:has-text("Draft Test Tournament")');
    if (await draftTournamentCard.isVisible()) {
      console.log('✅ Found Draft Test Tournament card');
      
      const viewDetailsButton = draftTournamentCard.locator('button:has-text("View Details")');
      if (await viewDetailsButton.isVisible()) {
        console.log('🔄 Clicking View Details...');
        await viewDetailsButton.click();
        await page.waitForLoadState('networkidle');
        await page.screenshot({ path: 'final-1-tournament-details.png', fullPage: true });
        console.log('✅ Clicked View Details - now on tournament detail page');
        
        // Step 3: Look for draft-related content on the detail page
        const pageText = await page.textContent('body');
        console.log('📄 Page contains draft-related content:', pageText.includes('draft') || pageText.includes('Draft'));
        
        // Look for various draft-related elements
        const draftElements = [
          'a:has-text("Draft")',
          'button:has-text("Draft")', 
          'a:has-text("Enter as")',
          'a:has-text("Captain")',
          'a[href*="draft"]',
          'a[href*="captain"]',
          'button:has-text("Manage")',
          'a:has-text("Admin")'
        ];
        
        let foundDraftLink = false;
        for (const selector of draftElements) {
          const elements = await page.locator(selector);
          const count = await elements.count();
          if (count > 0) {
            console.log(`✅ Found ${count} elements matching: ${selector}`);
            
            // Click the first one we find
            if (!foundDraftLink) {
              console.log(`🔄 Clicking on: ${selector}`);
              await elements.first().click();
              await page.waitForLoadState('networkidle');
              await page.screenshot({ path: 'final-2-after-draft-click.png', fullPage: true });
              foundDraftLink = true;
              break;
            }
          }
        }
        
        if (!foundDraftLink) {
          console.log('❌ No draft links found on tournament detail page');
          await page.screenshot({ path: 'final-no-draft-links.png', fullPage: true });
          
          // Try scrolling down to see if there are more elements
          await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
          await page.screenshot({ path: 'final-scrolled-down.png', fullPage: true });
        }
        
        // Step 4: Check if we're now on a draft interface
        const hasDraftInterface = await page.evaluate(() => {
          return !!(
            document.querySelector('.hero-grid') || 
            document.querySelector('.draft-main-area') || 
            document.querySelector('.team-panel') ||
            document.querySelector('.pick-ban-phase')
          );
        });
        
        if (hasDraftInterface) {
          console.log('🎉 SUCCESS: Found draft interface!');
          await page.screenshot({ path: 'final-3-draft-interface.png', fullPage: true });
          await analyzeActualDraftInterface(page);
        } else {
          console.log('❌ Still no draft interface found');
          
          // Try some common draft URLs based on the tournament
          const currentUrl = page.url();
          const possibleDraftUrls = [
            currentUrl + '/drafts',
            currentUrl + '/draft',
            currentUrl + '/admin',
            currentUrl.replace('/tournaments/', '/admin/tournaments/'),
          ];
          
          for (const url of possibleDraftUrls) {
            try {
              console.log(`🔄 Trying: ${url}`);
              await page.goto(url);
              await page.waitForLoadState('networkidle', { timeout: 3000 });
              
              const hasDraft = await page.evaluate(() => {
                return !!(document.querySelector('.hero-grid') || document.querySelector('.draft-main-area'));
              });
              
              if (hasDraft) {
                console.log(`🎉 SUCCESS: Found draft interface at ${url}!`);
                await page.screenshot({ path: `final-success-${url.split('/').pop()}.png`, fullPage: true });
                await analyzeActualDraftInterface(page);
                break;
              }
            } catch (e) {
              console.log(`❌ Failed ${url}: ${e.message}`);
            }
          }
        }
      }
    }
    
  } catch (error) {
    console.log('❌ Test error:', error.message);
    await page.screenshot({ path: 'final-error.png', fullPage: true });
  }
});

async function analyzeActualDraftInterface(page) {
  console.log('\n🔍 ===== ANALYZING ACTUAL DRAFT INTERFACE =====');
  
  const viewport = page.viewportSize();
  console.log(`📱 Viewport: ${viewport.width}x${viewport.height}`);
  
  // Take a full page screenshot first
  await page.screenshot({ path: 'ANALYSIS-draft-interface-fullpage.png', fullPage: true });
  
  const analysis = await page.evaluate(() => {
    const data = {
      url: window.location.href,
      pageSize: {
        window: { width: window.innerWidth, height: window.innerHeight },
        document: { width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight }
      },
      overflow: {
        vertical: document.documentElement.scrollHeight > window.innerHeight,
        horizontal: document.documentElement.scrollWidth > window.innerWidth,
        verticalAmount: document.documentElement.scrollHeight - window.innerHeight,
        horizontalAmount: document.documentElement.scrollWidth - window.innerWidth
      }
    };
    
    // Find and measure all draft-related elements
    const elements = {
      'Header': 'header',
      'Main Container': 'main',
      'Draft Container': '.draft-container', 
      'Draft Main Area': '.draft-main-area',
      'Pick/Ban Phase': '.pick-ban-phase',
      'Hero Grid Container': '.hero-grid-container',
      'Hero Grid': '.hero-grid',
      'Hero Cards': '.hero-card',
      'Team Panels': '.team-panel',
      'Center Area': '.center-area',
      'Phase Header': '.phase-header'
    };
    
    data.elements = {};
    
    Object.entries(elements).forEach(([name, selector]) => {
      const element = document.querySelector(selector);
      const allElements = document.querySelectorAll(selector);
      
      if (element) {
        const rect = element.getBoundingClientRect();
        const styles = window.getComputedStyle(element);
        
        data.elements[name] = {
          found: true,
          count: allElements.length,
          size: { width: element.offsetWidth, height: element.offsetHeight },
          position: { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right },
          styles: {
            height: styles.height,
            maxHeight: styles.maxHeight,
            minHeight: styles.minHeight,
            overflow: styles.overflow,
            overflowY: styles.overflowY,
            display: styles.display
          },
          visibility: {
            inViewport: rect.top < data.pageSize.window.height && rect.bottom > 0,
            fullyVisible: rect.top >= 0 && rect.bottom <= data.pageSize.window.height,
            topCut: rect.top < 0,
            bottomCut: rect.bottom > data.pageSize.window.height
          }
        };
      } else {
        data.elements[name] = { found: false, count: allElements.length };
      }
    });
    
    // Analyze specific problems
    data.problems = [];
    
    if (data.overflow.vertical) {
      data.problems.push({
        type: 'VERTICAL_OVERFLOW',
        severity: 'HIGH',
        message: `Page overflows by ${data.overflow.verticalAmount}px vertically`,
        impact: 'Users need to scroll to see all content'
      });
    }
    
    if (data.elements['Hero Grid'] && data.elements['Hero Grid'].found) {
      const heroGrid = data.elements['Hero Grid'];
      if (!heroGrid.visibility.fullyVisible) {
        data.problems.push({
          type: 'HERO_GRID_NOT_VISIBLE',
          severity: 'CRITICAL', 
          message: 'Hero grid is not fully visible in viewport',
          details: {
            top: heroGrid.position.top,
            bottom: heroGrid.position.bottom,
            viewportHeight: data.pageSize.window.height
          }
        });
      }
    }
    
    if (data.elements['Draft Main Area'] && data.elements['Draft Main Area'].found) {
      const draftArea = data.elements['Draft Main Area'];
      if (draftArea.size.height > data.pageSize.window.height) {
        data.problems.push({
          type: 'DRAFT_AREA_TOO_TALL',
          severity: 'HIGH',
          message: `Draft area (${draftArea.size.height}px) is taller than viewport (${data.pageSize.window.height}px)`,
          ratio: (draftArea.size.height / data.pageSize.window.height).toFixed(2)
        });
      }
    }
    
    return data;
  });
  
  // Display analysis results
  console.log(`🌐 URL: ${analysis.url}`);
  console.log(`📏 Window: ${analysis.pageSize.window.width}x${analysis.pageSize.window.height}`);
  console.log(`📄 Document: ${analysis.pageSize.document.width}x${analysis.pageSize.document.height}`);
  console.log(`📜 Overflow: ${analysis.overflow.vertical ? `❌ YES (${analysis.overflow.verticalAmount}px)` : '✅ NO'}`);
  
  console.log('\n📋 ELEMENTS:');
  Object.entries(analysis.elements).forEach(([name, info]) => {
    if (info.found) {
      let status = '✅ FOUND';
      if (info.visibility) {
        if (!info.visibility.inViewport) status = '❌ NOT IN VIEWPORT';
        else if (!info.visibility.fullyVisible) status = '⚠️ PARTIALLY VISIBLE';
        else status = '✅ FULLY VISIBLE';
      }
      
      console.log(`  ${name}: ${info.size ? `${info.size.width}x${info.size.height}px` : `${info.count} items`} - ${status}`);
      
      if (info.visibility && !info.visibility.fullyVisible) {
        const issues = [];
        if (info.visibility.topCut) issues.push(`top cut off by ${Math.abs(info.position.top)}px`);
        if (info.visibility.bottomCut) issues.push(`bottom extends ${info.position.bottom - analysis.pageSize.window.height}px below viewport`);
        if (issues.length > 0) console.log(`    ↳ ${issues.join(', ')}`);
      }
    } else {
      console.log(`  ${name}: ❌ NOT FOUND`);
    }
  });
  
  if (analysis.problems.length > 0) {
    console.log('\n🚨 PROBLEMS IDENTIFIED:');
    analysis.problems.forEach((problem, index) => {
      const icon = problem.severity === 'CRITICAL' ? '💀' : problem.severity === 'HIGH' ? '🔥' : '⚠️';
      console.log(`  ${index + 1}. ${icon} [${problem.severity}] ${problem.message}`);
      if (problem.impact) console.log(`     Impact: ${problem.impact}`);
      if (problem.details) console.log(`     Details:`, problem.details);
    });
    
    console.log('\n💡 RECOMMENDED FIXES:');
    analysis.problems.forEach((problem, index) => {
      console.log(`  ${index + 1}. Fix for ${problem.type}:`);
      
      switch (problem.type) {
        case 'VERTICAL_OVERFLOW':
          console.log('     - Use calc(100vh - headerHeight) for main container height');
          console.log('     - Add overflow-y: auto to scrollable areas');
          console.log('     - Remove fixed heights that cause overflow');
          break;
        case 'HERO_GRID_NOT_VISIBLE':
          console.log('     - Reduce header/other element heights');
          console.log('     - Use flex layout to fit content in viewport');
          console.log('     - Add proper viewport height calculations');
          break;
        case 'DRAFT_AREA_TOO_TALL':
          console.log('     - Use min-height instead of height for responsive design');
          console.log('     - Implement responsive breakpoints');
          console.log('     - Consider horizontal layout on smaller screens');
          break;
      }
    });
  } else {
    console.log('\n✅ NO PROBLEMS FOUND - Layout looks good!');
  }
  
  console.log('\n📊 SUMMARY:');
  const criticalIssues = analysis.problems.filter(p => p.severity === 'CRITICAL').length;
  const highIssues = analysis.problems.filter(p => p.severity === 'HIGH').length;
  const totalIssues = analysis.problems.length;
  
  console.log(`Issues Found: ${totalIssues} total (${criticalIssues} critical, ${highIssues} high priority)`);
  console.log(`Interface Type: ${analysis.elements['Hero Grid'].found ? '✅ DRAFT INTERFACE' : '❌ NOT DRAFT INTERFACE'}`);
  console.log(`Viewport Fit: ${!analysis.overflow.vertical ? '✅ FITS PERFECTLY' : '❌ NEEDS SCROLLING'}`);
  
  return analysis;
}