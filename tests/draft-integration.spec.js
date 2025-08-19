const { test, expect } = require('@playwright/test');

test('React to Phoenix draft integration', async ({ page }) => {
  // Go to tournament page
  await page.goto('http://localhost:3000/tournaments/67e81a0d-1165-4481-ad58-85da372f86d5');
  
  // Wait for page to load
  await page.waitForTimeout(2000);
  
  // Log available tabs and content
  const tabs = await page.locator('.tournament-tabs, nav, .tab, [role="tablist"]').allTextContents();
  console.log('Available tabs:', tabs);
  
  // Look for any draft-related buttons or links
  const draftElements = await page.locator('*:has-text("Draft"), *:has-text("draft"), button, a').allTextContents();
  console.log('Page elements:', draftElements.slice(0, 20));
  
  // Try clicking on different tabs to find drafts
  const possibleTabs = ['Bracket', 'Teams', 'Check-In'];
  for (const tabName of possibleTabs) {
    const tab = page.locator(`text=${tabName}`).first();
    if (await tab.isVisible()) {
      console.log(`Clicking ${tabName} tab...`);
      await tab.click();
      await page.waitForTimeout(1000);
      
      // Look for draft-related content after clicking
      const draftContent = await page.locator('*:has-text("Draft"), *:has-text("Create Draft"), button').count();
      console.log(`Draft elements in ${tabName} tab:`, draftContent);
      
      if (draftContent > 0) {
        const draftButtons = await page.locator('*:has-text("Draft"), *:has-text("Create Draft"), button').allTextContents();
        console.log(`Draft buttons in ${tabName}:`, draftButtons);
        break;
      }
    }
  }
  
  // Look for dropdown or match selection
  const matchDropdown = page.locator('select, .dropdown, [data-testid="match-select"]').first();
  if (await matchDropdown.isVisible()) {
    await matchDropdown.click();
    // Select first option
    await matchDropdown.selectOption({ index: 1 });
  }
  
  // Look for Create Draft Session button
  const createButton = page.locator('button:has-text("Create Draft Session"), [data-testid="create-draft"]').first();
  
  if (await createButton.isVisible()) {
    console.log('Found Create Draft Session button');
    
    // Click create draft button
    await createButton.click();
    
    // Wait for response
    await page.waitForTimeout(3000);
    
    // Check for success (draft URLs should appear) or error message
    const errorMessage = await page.locator('.error, .alert-error, [class*="error"]').first();
    const successElements = await page.locator('button:has-text("Enter as"), .draft-url, a[href*="/draft/"]');
    
    if (await errorMessage.isVisible()) {
      const errorText = await errorMessage.textContent();
      console.log('ERROR:', errorText);
      
      // Check browser console for additional errors
      page.on('console', msg => {
        if (msg.type() === 'error') {
          console.log('BROWSER ERROR:', msg.text());
        }
      });
      
      // Check network failures
      page.on('requestfailed', request => {
        console.log('NETWORK FAILURE:', request.url(), request.failure().errorText);
      });
      
    } else if (await successElements.count() > 0) {
      console.log('SUCCESS: Draft created, found team entry buttons');
    } else {
      console.log('UNKNOWN STATE: No clear error or success indicators');
      
      // Capture page content for debugging
      const pageContent = await page.content();
      console.log('PAGE CONTENT SNIPPET:', pageContent.substring(0, 500));
    }
  } else {
    console.log('Create Draft Session button not found');
    
    // Log page content to see what's available
    const pageText = await page.textContent('body');
    console.log('PAGE TEXT:', pageText.substring(0, 500));
  }
});