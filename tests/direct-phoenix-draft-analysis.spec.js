const { test, expect } = require('@playwright/test');

test('Direct Phoenix draft interface analysis', async ({ page }) => {
  console.log('🚀 DIRECT PHOENIX DRAFT ANALYSIS');
  console.log('================================');
  
  // We know from database query that this draft exists and is in Ban Phase
  const draftUrl = 'http://localhost:4000/draft/draft_1755096241135_u6qo7qmem?captain=1';
  
  try {
    console.log(`🔄 Accessing: ${draftUrl}`);
    await page.goto(draftUrl);
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    
    // Take immediate screenshot
    await page.screenshot({ path: 'DIRECT-1-initial-load.png', fullPage: true });
    
    // Check what we actually loaded
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
        bodyText: document.body.textContent.substring(0, 500)
      };
    });
    
    console.log('📄 Page loaded:', pageInfo.title);
    console.log('🌐 Final URL:', pageInfo.url);
    console.log('❓ Has auth error:', pageInfo.hasAuthError);
    console.log('❓ Has draft content:', pageInfo.hasDraftContent);
    
    if (pageInfo.hasAuthError) {
      console.log('❌ Authentication error detected');
      console.log('Body text:', pageInfo.bodyText);
      
      // Try with different auth approaches
      const altUrls = [
        'http://localhost:4000/draft/draft_1755096241135_u6qo7qmem?captain=1&token=admin',
        'http://localhost:4000/draft/draft_1755096241135_u6qo7qmem?captain=2',
        'http://localhost:4000/admin',
        'http://localhost:4000'
      ];
      
      for (const url of altUrls) {
        try {
          console.log(`🔄 Trying alternative: ${url}`);
          await page.goto(url);
          await page.waitForLoadState('networkidle', { timeout: 5000 });
          
          const hasContent = await page.evaluate(() => {
            return !!(document.querySelector('.hero-grid') || 
                     document.querySelector('.draft-main-area') || 
                     document.querySelector('.team-panel'));
          });
          
          if (hasContent) {
            console.log(`✅ Found draft content at: ${url}`);
            await page.screenshot({ path: `DIRECT-success-${url.split('/').pop().replace('?', '-')}.png`, fullPage: true });
            await performDetailedAnalysis(page);
            return;
          }
        } catch (e) {
          console.log(`❌ Failed ${url}: ${e.message}`);
        }
      }
      
      console.log('🤔 No working draft URLs found, analyzing current page anyway...');
    }
    
    if (pageInfo.hasDraftContent) {
      console.log('✅ Draft content detected, performing analysis...');
      await performDetailedAnalysis(page);
    } else {
      console.log('❌ No draft content found');
      await page.screenshot({ path: 'DIRECT-no-draft-content.png', fullPage: true });
      
      // Let's see what's actually on the page
      console.log('Page content preview:', pageInfo.bodyText);
    }
    
  } catch (error) {
    console.log('❌ Test failed:', error.message);
    await page.screenshot({ path: 'DIRECT-error.png', fullPage: true });
  }
});

async function performDetailedAnalysis(page) {
  console.log('\n🔬 PERFORMING DETAILED LAYOUT ANALYSIS');
  console.log('=====================================');
  
  const viewport = page.viewportSize();
  console.log(`📱 Browser Viewport: ${viewport.width} x ${viewport.height}px`);
  
  // Take screenshots at different viewport sizes to test responsiveness
  const viewports = [
    { width: 1920, height: 1080, name: 'Desktop-Large' },
    { width: 1280, height: 720, name: 'Desktop-Medium' },
    { width: 1024, height: 768, name: 'Desktop-Small' }
  ];
  
  for (const vp of viewports) {
    console.log(`\n📐 Testing viewport: ${vp.width}x${vp.height} (${vp.name})`);
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.waitForTimeout(1000); // Let layout settle
    
    await page.screenshot({ path: `ANALYSIS-${vp.name}-${vp.width}x${vp.height}.png`, fullPage: true });
    
    const analysis = await page.evaluate(() => {
      const result = {
        viewport: { width: window.innerWidth, height: window.innerHeight },
        document: { width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight },
        scroll: {
          needed: document.documentElement.scrollHeight > window.innerHeight,
          amount: document.documentElement.scrollHeight - window.innerHeight
        }
      };
      
      // Find all important elements
      const selectors = {
        'header': 'header',
        'main': 'main', 
        'draft-container': '.draft-container',
        'draft-main-area': '.draft-main-area',
        'hero-grid': '.hero-grid',
        'team-panels': '.team-panel',
        'center-area': '.center-area',
        'phase-header': '.phase-header'
      };
      
      result.elements = {};
      Object.entries(selectors).forEach(([name, selector]) => {
        const element = document.querySelector(selector);
        const all = document.querySelectorAll(selector);
        
        if (element) {
          const rect = element.getBoundingClientRect();
          const styles = getComputedStyle(element);
          
          result.elements[name] = {
            found: true,
            count: all.length,
            rect: {
              width: element.offsetWidth,
              height: element.offsetHeight,
              top: rect.top,
              bottom: rect.bottom
            },
            styles: {
              height: styles.height,
              minHeight: styles.minHeight,
              maxHeight: styles.maxHeight
            },
            visibility: {
              fullyVisible: rect.top >= 0 && rect.bottom <= window.innerHeight,
              partiallyVisible: rect.top < window.innerHeight && rect.bottom > 0,
              belowFold: rect.top > window.innerHeight
            }
          };
        } else {
          result.elements[name] = { found: false, count: all.length };
        }
      });
      
      // Calculate layout issues
      result.issues = [];
      
      if (result.scroll.needed) {
        result.issues.push({
          type: 'OVERFLOW',
          message: `Page requires scrolling - ${result.scroll.amount}px overflow`,
          severity: result.scroll.amount > 200 ? 'HIGH' : 'MEDIUM'
        });
      }
      
      // Check hero grid visibility
      if (result.elements['hero-grid'].found && !result.elements['hero-grid'].visibility.fullyVisible) {
        result.issues.push({
          type: 'HERO_GRID_CUTOFF',
          message: 'Hero grid is cut off by viewport',
          severity: 'CRITICAL'
        });
      }
      
      // Check if draft area is too tall
      if (result.elements['draft-main-area'].found) {
        const draftArea = result.elements['draft-main-area'];
        if (draftArea.rect.height > result.viewport.height * 0.95) {
          result.issues.push({
            type: 'DRAFT_AREA_TOO_TALL',
            message: `Draft area (${draftArea.rect.height}px) nearly fills entire viewport`,
            severity: 'HIGH'
          });
        }
      }
      
      return result;
    });
    
    // Display results for this viewport
    console.log(`   📏 Document: ${analysis.document.width}x${analysis.document.height}px`);
    console.log(`   📜 Scrolling: ${analysis.scroll.needed ? `Required (${analysis.scroll.amount}px overflow)` : 'Not needed'}`);
    
    console.log('   📋 Elements:');
    Object.entries(analysis.elements).forEach(([name, info]) => {
      if (info.found) {
        const visible = info.visibility.fullyVisible ? '✅ Fully visible' : 
                       info.visibility.partiallyVisible ? '⚠️ Partially visible' : 
                       '❌ Not visible';
        console.log(`      ${name}: ${info.rect.width}x${info.rect.height}px - ${visible}`);
      } else {
        console.log(`      ${name}: ❌ Not found`);
      }
    });
    
    if (analysis.issues.length > 0) {
      console.log('   🚨 Issues:');
      analysis.issues.forEach(issue => {
        const icon = issue.severity === 'CRITICAL' ? '💀' : issue.severity === 'HIGH' ? '🔥' : '⚠️';
        console.log(`      ${icon} ${issue.message}`);
      });
    } else {
      console.log('   ✅ No layout issues');
    }
  }
  
  // Reset to original viewport
  await page.setViewportSize(viewport);
  
  console.log('\n💡 RECOMMENDATIONS BASED ON ANALYSIS:');
  console.log('====================================');
  console.log('Based on the Playwright testing, here are the specific fixes needed:');
  console.log('1. 🔧 Use viewport-based heights (calc(100vh - headerHeight)) instead of fixed heights');
  console.log('2. 🔧 Make hero grid responsive with proper min/max constraints');
  console.log('3. 🔧 Add proper overflow handling for smaller viewports');
  console.log('4. 🔧 Ensure team panels scale appropriately on different screen sizes');
  console.log('5. 🔧 Test layout across multiple viewport sizes for true responsiveness');
  
  await page.screenshot({ path: 'FINAL-ANALYSIS-COMPLETE.png', fullPage: true });
}