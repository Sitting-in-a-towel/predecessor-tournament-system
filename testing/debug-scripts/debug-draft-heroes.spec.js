const { test, expect } = require('@playwright/test');

test('Debug Draft Hero Selection', async ({ page }) => {
  console.log('🔍 Debugging Draft Hero Selection...');
  
  // Login as admin first
  await page.request.post('http://localhost:3001/api/test-auth/login-test-admin');
  
  // Get available drafts
  const draftsResponse = await page.request.get('http://localhost:3001/api/draft');
  const drafts = await draftsResponse.json();
  console.log(`Found ${drafts.length} draft sessions`);
  
  if (drafts.length === 0) {
    console.log('❌ No draft sessions found');
    return;
  }
  
  const draftId = drafts[0].draft_id;
  console.log(`Testing draft: ${draftId}`);
  console.log(`Draft status: ${drafts[0].status}`);
  console.log(`Draft phase: ${drafts[0].current_phase}`);
  
  await page.goto(`http://localhost:3000/draft/${draftId}`);
  await page.waitForLoadState('networkidle');
  
  console.log(`Current URL: ${page.url()}`);
  
  // Wait for heroes to load (they might load asynchronously)
  await page.waitForTimeout(3000);
  
  // Check for different hero selectors
  const heroSelectors = [
    '.hero-item',
    '.hero-card', 
    '[data-hero]',
    '.hero-grid .hero',
    '.hero-selection .hero',
    'img[alt*="hero" i]',
    'img[src*="hero" i]',
    'img[src*="omeda" i]',
    '.hero-placeholder'
  ];
  
  let totalHeroes = 0;
  for (const selector of heroSelectors) {
    const heroes = await page.locator(selector).all();
    if (heroes.length > 0) {
      console.log(`  Found ${heroes.length} heroes using selector: ${selector}`);
      totalHeroes = Math.max(totalHeroes, heroes.length);
    }
  }
  
  console.log(`Total unique heroes found: ${totalHeroes}`);
  
  if (totalHeroes === 0) {
    console.log('❌ No heroes found! Investigating further...');
    
    // Check for loading states
    const loadingElements = await page.locator('text=/loading|Loading|LOADING/i').all();
    console.log(`Found ${loadingElements.length} loading indicators`);
    
    // Check for error messages
    const errorElements = await page.locator('text=/error|Error|ERROR|failed|Failed/i').all();
    console.log(`Found ${errorElements.length} error messages`);
    
    for (const error of errorElements) {
      const errorText = await error.textContent();
      console.log(`  Error: "${errorText?.trim()}"`);
    }
    
    // Check network requests
    console.log('Checking for hero API requests...');
    
    // Reload page and monitor network
    page.on('response', response => {
      if (response.url().includes('hero') || response.url().includes('draft')) {
        console.log(`  API Response: ${response.url()} - Status: ${response.status()}`);
      }
    });
    
    await page.reload();
    await page.waitForTimeout(5000);
    
    // Check console logs for errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`  Console Error: ${msg.text()}`);
      }
    });
    
    // Look for any hero-related content in the page
    const pageText = await page.textContent('body');
    const hasHeroText = pageText.includes('hero') || pageText.includes('Hero') || pageText.includes('pick') || pageText.includes('ban');
    console.log(`Page contains hero-related text: ${hasHeroText}`);
    
    // Check draft phase state
    const phaseElements = await page.locator('text=/phase|Phase|PHASE/i').all();
    console.log(`Found ${phaseElements.length} phase indicators`);
    
    for (const phase of phaseElements.slice(0, 3)) {
      const phaseText = await phase.textContent();
      console.log(`  Phase info: "${phaseText?.trim()}"`);
    }
  }
});