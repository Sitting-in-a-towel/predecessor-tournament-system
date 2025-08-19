const { test, expect } = require('@playwright/test');

test('Admin access to Drafts tab and draft creation', async ({ page }) => {
  // First, we need to simulate admin login
  // In a real test, you'd use proper authentication flow
  // For now, we'll inject admin user data into localStorage
  
  await page.goto('http://localhost:3000/tournaments/67e81a0d-1165-4481-ad58-85da372f86d5');
  
  // Wait for page to load
  await page.waitForTimeout(2000);
  
  // Inject admin user into localStorage to simulate login
  await page.evaluate(() => {
    const adminUser = {
      id: 'admin-test-id',
      discord_username: 'TestAdmin',
      discord_id: '123456789',
      isAdmin: true,
      role: 'admin'
    };
    
    localStorage.setItem('auth_user', JSON.stringify(adminUser));
    localStorage.setItem('auth_token', 'test-admin-token');
    
    // Dispatch a storage event to trigger auth context update
    window.dispatchEvent(new Event('storage'));
  });
  
  // Reload page to apply authentication
  await page.reload();
  await page.waitForTimeout(2000);
  
  // Now check for available tabs
  const tabs = await page.locator('.tournament-tabs button').allTextContents();
  console.log('Available tabs for admin:', tabs);
  
  // Look for Drafts tab specifically
  const draftsTab = page.locator('button:has-text("Drafts")');
  
  if (await draftsTab.isVisible()) {
    console.log('SUCCESS: Drafts tab is visible for admin user');
    
    // Click on Drafts tab
    await draftsTab.click();
    await page.waitForTimeout(1500);
    
    // Look for draft creation interface
    const draftElements = await page.locator('.drafts-tab').textContent();
    console.log('Drafts tab content preview:', draftElements ? draftElements.substring(0, 300) : 'No content');
    
    // Look for match selection dropdown
    const matchDropdown = page.locator('select, .dropdown, [name="selectedMatch"]').first();
    if (await matchDropdown.isVisible()) {
      console.log('Found match selection dropdown');
      
      // Try to select a match
      await matchDropdown.click();
      await page.waitForTimeout(500);
      
      // Get available options
      const options = await page.locator('select option, .dropdown option').allTextContents();
      console.log('Available match options:', options.slice(0, 5));
      
      // Select first available match (if any)
      if (options.length > 1) {
        await matchDropdown.selectOption({ index: 1 });
        console.log('Selected match from dropdown');
        
        // Look for Create Draft Session button
        const createButton = page.locator('button:has-text("Create Draft Session"), button:has-text("Create Draft")').first();
        
        if (await createButton.isVisible()) {
          console.log('Found Create Draft Session button');
          
          // Click create draft button
          await createButton.click();
          await page.waitForTimeout(3000);
          
          // Check for success or error
          const errorMessage = await page.locator('.error, .alert-error, [class*="error"], .notification.error').first();
          const successMessage = await page.locator('.success, .alert-success, [class*="success"], .notification.success').first();
          const draftUrls = await page.locator('a[href*="/draft/"], button:has-text("Enter as"), .draft-url').count();
          
          if (await errorMessage.isVisible()) {
            const errorText = await errorMessage.textContent();
            console.log('ERROR creating draft:', errorText);
            
            // Check console for more details
            page.on('console', msg => {
              if (msg.type() === 'error') {
                console.log('BROWSER ERROR:', msg.text());
              }
            });
            
          } else if (await successMessage.isVisible()) {
            const successText = await successMessage.textContent();
            console.log('SUCCESS creating draft:', successText);
            
          } else if (draftUrls > 0) {
            console.log('SUCCESS: Draft URLs found, draft created successfully');
            
            // Log the draft URLs for manual testing
            const draftLinks = await page.locator('a[href*="/draft/"]').allTextContents();
            console.log('Draft links found:', draftLinks);
            
          } else {
            console.log('UNKNOWN STATE: No clear success or error indicators');
            
            // Capture more details
            const pageContent = await page.textContent('.drafts-tab');
            console.log('Current drafts tab content:', pageContent ? pageContent.substring(0, 500) : 'No content');
          }
        } else {
          console.log('Create Draft Session button not found');
        }
      } else {
        console.log('No matches available in dropdown');
      }
    } else {
      console.log('Match selection dropdown not found');
      
      // Look for other draft creation elements
      const draftButtons = await page.locator('button').allTextContents();
      const relevantButtons = draftButtons.filter(btn => 
        btn.toLowerCase().includes('draft') || 
        btn.toLowerCase().includes('create') ||
        btn.toLowerCase().includes('start')
      );
      console.log('Relevant buttons in drafts tab:', relevantButtons);
    }
    
  } else {
    console.log('ERROR: Drafts tab not visible even for admin user');
    
    // Debug: Check if authentication worked
    const authStatus = await page.evaluate(() => {
      const user = localStorage.getItem('auth_user');
      const token = localStorage.getItem('auth_token');
      return { hasUser: !!user, hasToken: !!token, userData: user };
    });
    console.log('Auth status:', authStatus);
    
    // Check page for any authentication indicators
    const pageText = await page.textContent('body');
    const hasLogin = pageText.includes('Login') || pageText.includes('login');
    console.log('Page has login elements:', hasLogin);
  }
  
  // Final state capture
  const finalPageContent = await page.textContent('.tournament-content');
  console.log('Final tournament content preview:', finalPageContent ? finalPageContent.substring(0, 200) : 'No content');
});