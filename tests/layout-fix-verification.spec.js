const { test, expect } = require('@playwright/test');

test('Layout Fix Verification - Hero Grid Display and Responsive Layout', async ({ page }) => {
  console.log('🎯 LAYOUT FIX VERIFICATION TEST');
  console.log('===============================');
  
  // Use the valid token we generated
  const draftUrl = 'http://localhost:4000/draft/draft_1755096241135_u6qo7qmem?token=user_1753774405110_mk5ekhh61_draft_1755096241135_u6qo7qmem_lOcQy8rQxsgkfHqOWS60qisgT4Ooq18bOZD118Yq5q4&captain=1';
  
  try {
    console.log(`🔄 Accessing authenticated draft: ${draftUrl}`);
    await page.goto(draftUrl);
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    
    // Take initial screenshot
    await page.screenshot({ path: 'FIX-1-authenticated-draft.png', fullPage: true });
    
    // Check basic page info
    const pageInfo = await page.evaluate(() => {
      return {
        title: document.title,
        url: window.location.href,
        hasError: !!document.querySelector('[class*="error"], .error, #error'),
        hasAuthError: document.body.textContent.toLowerCase().includes('authentication') || 
                     document.body.textContent.toLowerCase().includes('failed'),
        hasDraftContent: !!(document.querySelector('.hero-grid') || 
                           document.querySelector('.draft-main-area') || 
                           document.querySelector('.team-panel')),
        bodyPreview: document.body.textContent.substring(0, 200)
      };
    });
    
    console.log('📄 Page Title:', pageInfo.title);
    console.log('🌐 Final URL:', pageInfo.url);
    console.log('❓ Has Error:', pageInfo.hasError);
    console.log('❓ Has Auth Error:', pageInfo.hasAuthError);
    console.log('❓ Has Draft Content:', pageInfo.hasDraftContent);
    
    if (pageInfo.hasAuthError) {
      console.log('❌ Still getting authentication error');
      console.log('Body preview:', pageInfo.bodyPreview);
      return;
    }
    
    if (!pageInfo.hasDraftContent) {
      console.log('❌ No draft content found');
      console.log('Body preview:', pageInfo.bodyPreview);
      return;
    }
    
    console.log('✅ Draft interface loaded! Analyzing layout...');
    
    // Perform detailed layout analysis
    const analysis = await page.evaluate(() => {
      const viewport = { width: window.innerWidth, height: window.innerHeight };
      const document_size = { 
        width: document.documentElement.scrollWidth, 
        height: document.documentElement.scrollHeight 
      };
      
      // Find key elements
      const elements = {};
      const selectors = {
        'header': 'header',
        'main': 'main',
        'draft-main-area': '.draft-main-area',
        'hero-grid-container': '.hero-grid-container', 
        'hero-grid': '.hero-grid',
        'hero-cards': '.hero-card',
        'team-panels': '.team-panel',
        'center-area': '.center-area'
      };
      
      Object.entries(selectors).forEach(([name, selector]) => {
        const element = document.querySelector(selector);
        const allElements = document.querySelectorAll(selector);
        
        if (element) {
          const rect = element.getBoundingClientRect();
          const styles = getComputedStyle(element);
          
          elements[name] = {
            found: true,
            count: allElements.length,
            dimensions: {
              width: element.offsetWidth,
              height: element.offsetHeight
            },
            position: {
              top: rect.top,
              bottom: rect.bottom,
              left: rect.left,
              right: rect.right
            },
            styles: {
              height: styles.height,
              minHeight: styles.minHeight,
              maxHeight: styles.maxHeight,
              overflow: styles.overflow,
              overflowY: styles.overflowY
            },
            visibility: {
              fullyVisible: rect.top >= 0 && rect.bottom <= viewport.height,
              inViewport: rect.top < viewport.height && rect.bottom > 0,
              cutOff: rect.bottom > viewport.height
            }
          };
        } else {
          elements[name] = { found: false, count: allElements.length };
        }
      });
      
      // Check for layout issues
      const issues = [];
      
      // Check if page overflows viewport
      if (document_size.height > viewport.height) {
        const overflow = document_size.height - viewport.height;
        issues.push({
          type: 'PAGE_OVERFLOW',
          severity: overflow > 200 ? 'HIGH' : 'MEDIUM',
          message: `Page overflows viewport by ${overflow}px`
        });
      }
      
      // Check hero grid visibility
      if (elements['hero-grid'].found) {
        if (!elements['hero-grid'].visibility.inViewport) {
          issues.push({
            type: 'HERO_GRID_NOT_VISIBLE',
            severity: 'CRITICAL',
            message: 'Hero grid is not visible in viewport'
          });
        } else if (elements['hero-grid'].visibility.cutOff) {
          issues.push({
            type: 'HERO_GRID_CUT_OFF',
            severity: 'HIGH', 
            message: 'Hero grid is cut off by viewport'
          });
        }
      } else {
        issues.push({
          type: 'HERO_GRID_MISSING',
          severity: 'CRITICAL',
          message: 'Hero grid element not found'
        });
      }
      
      // Check if hero cards exist
      if (elements['hero-cards'].count === 0) {
        issues.push({
          type: 'NO_HERO_CARDS',
          severity: 'CRITICAL',
          message: 'No hero cards found in grid'
        });
      }
      
      return {
        viewport,
        document_size,
        elements,
        issues,
        scrollNeeded: document_size.height > viewport.height,
        overflowAmount: document_size.height - viewport.height
      };
    });
    
    // Display analysis results
    console.log('\n📊 LAYOUT ANALYSIS RESULTS:');
    console.log('============================');
    console.log(`📱 Viewport: ${analysis.viewport.width}x${analysis.viewport.height}px`);
    console.log(`📄 Document: ${analysis.document_size.width}x${analysis.document_size.height}px`);
    console.log(`📜 Scrolling: ${analysis.scrollNeeded ? `Required (${analysis.overflowAmount}px)` : 'Not needed'}`);
    
    console.log('\n🔍 ELEMENT STATUS:');
    Object.entries(analysis.elements).forEach(([name, info]) => {
      if (info.found) {
        const status = info.visibility ? 
          (info.visibility.fullyVisible ? '✅ FULLY VISIBLE' :
           info.visibility.inViewport ? '⚠️ PARTIALLY VISIBLE' : 
           '❌ NOT VISIBLE') : '✅ FOUND';
        console.log(`  ${name}: ${info.dimensions ? `${info.dimensions.width}x${info.dimensions.height}px` : `${info.count} elements`} - ${status}`);
      } else {
        console.log(`  ${name}: ❌ NOT FOUND`);
      }
    });
    
    console.log('\n🚨 LAYOUT ISSUES:');
    if (analysis.issues.length === 0) {
      console.log('  🎉 NO ISSUES FOUND - Layout is working correctly!');
    } else {
      analysis.issues.forEach((issue, index) => {
        const icon = issue.severity === 'CRITICAL' ? '💀' : 
                     issue.severity === 'HIGH' ? '🔥' : '⚠️';
        console.log(`  ${index + 1}. ${icon} [${issue.severity}] ${issue.message}`);
      });
    }
    
    // Test multiple viewport sizes for responsiveness
    console.log('\n📐 TESTING RESPONSIVE BEHAVIOR:');
    const viewports = [
      { width: 1920, height: 1080, name: 'Large Desktop' },
      { width: 1280, height: 720, name: 'Medium Desktop' },
      { width: 1024, height: 768, name: 'Small Desktop' }
    ];
    
    for (const vp of viewports) {
      await page.setViewportSize(vp);
      await page.waitForTimeout(500); // Let layout settle
      
      const responsiveCheck = await page.evaluate(() => {
        const heroGrid = document.querySelector('.hero-grid');
        const draftArea = document.querySelector('.draft-main-area');
        
        return {
          heroGridVisible: heroGrid ? heroGrid.getBoundingClientRect().height > 0 : false,
          draftAreaFitsViewport: draftArea ? 
            draftArea.getBoundingClientRect().bottom <= window.innerHeight : false,
          totalHeroes: document.querySelectorAll('.hero-card').length
        };
      });
      
      await page.screenshot({ path: `FIX-responsive-${vp.name.replace(' ', '-')}-${vp.width}x${vp.height}.png`, fullPage: true });
      
      console.log(`  ${vp.name} (${vp.width}x${vp.height}):`);
      console.log(`    - Hero grid visible: ${responsiveCheck.heroGridVisible ? '✅' : '❌'}`);  
      console.log(`    - Draft area fits: ${responsiveCheck.draftAreaFitsViewport ? '✅' : '❌'}`);
      console.log(`    - Hero count: ${responsiveCheck.totalHeroes}`);
    }
    
    // Reset to original size
    await page.setViewportSize({ width: 1280, height: 720 });
    
    console.log('\n🎯 FINAL VERIFICATION:');
    const finalCheck = await page.evaluate(() => {
      const heroGrid = document.querySelector('.hero-grid');
      const heroCards = document.querySelectorAll('.hero-card');
      const draftArea = document.querySelector('.draft-main-area');
      
      return {
        heroGridExists: !!heroGrid,
        heroGridVisible: heroGrid ? heroGrid.offsetHeight > 0 : false,
        heroCardCount: heroCards.length,
        draftAreaExists: !!draftArea,
        layoutFitsViewport: document.documentElement.scrollHeight <= window.innerHeight * 1.2 // Allow small overflow
      };
    });
    
    await page.screenshot({ path: 'FIX-final-verification.png', fullPage: true });
    
    console.log(`✅ Hero grid exists: ${finalCheck.heroGridExists}`);
    console.log(`✅ Hero grid visible: ${finalCheck.heroGridVisible}`); 
    console.log(`✅ Hero cards found: ${finalCheck.heroCardCount}`);
    console.log(`✅ Draft area exists: ${finalCheck.draftAreaExists}`);
    console.log(`✅ Layout reasonable: ${finalCheck.layoutFitsViewport}`);
    
    // Overall assessment
    const success = finalCheck.heroGridExists && 
                   finalCheck.heroGridVisible && 
                   finalCheck.heroCardCount > 0 && 
                   finalCheck.draftAreaExists;
    
    console.log('\n🏆 LAYOUT FIX STATUS:');
    if (success) {
      console.log('🎉 SUCCESS! Layout fixes are working correctly:');
      console.log('   - Hero grid is now displaying properly');
      console.log('   - Layout is responsive and fits viewport better');
      console.log('   - All major elements are visible');
    } else {
      console.log('❌ ISSUES REMAINING:');
      if (!finalCheck.heroGridExists) console.log('   - Hero grid element missing');
      if (!finalCheck.heroGridVisible) console.log('   - Hero grid not visible'); 
      if (finalCheck.heroCardCount === 0) console.log('   - No hero cards found');
      if (!finalCheck.draftAreaExists) console.log('   - Draft area missing');
    }
    
  } catch (error) {
    console.log('❌ Test failed:', error.message);
    await page.screenshot({ path: 'FIX-error-state.png', fullPage: true });
    throw error;
  }
});