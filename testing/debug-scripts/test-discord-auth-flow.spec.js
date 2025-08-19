const { test, expect } = require('@playwright/test');

test('Discord Authentication Flow Analysis', async ({ page }) => {
  console.log('🔐 Analyzing Discord Authentication Flow...');
  
  await page.goto('http://localhost:3000');
  
  // Find Discord login button
  const discordButton = await page.locator('text=/login with discord|Login with Discord|discord/i').first();
  
  if (await discordButton.isVisible()) {
    console.log('✅ Found Discord login button');
    
    const href = await discordButton.getAttribute('href');
    console.log(`Discord login URL: ${href}`);
    
    // Check if it's a proper Discord OAuth URL
    if (href && href.includes('discord.com/api/oauth2/authorize')) {
      console.log('✅ Proper Discord OAuth URL detected');
    } else {
      console.log('❌ Discord OAuth URL seems incorrect');
    }
    
    // Don't actually click (would require real Discord auth)
    console.log('ℹ️  Skipping actual Discord auth (would require real user)');
    
  } else {
    console.log('❌ No Discord login button found');
  }
  
  // Test what happens if we manually create a user session
  console.log('\n🧪 Testing manual user authentication...');
  
  // Create a test user (not admin)
  const testUserResponse = await page.request.post('http://localhost:3001/api/test-auth/login-test-admin');
  const userData = await testUserResponse.json();
  console.log(`Test admin created: ${userData.success}`);
  
  if (userData.success) {
    // Now test access as regular user
    console.log('Testing protected pages with authentication...');
    
    // Test teams page with auth
    await page.goto('/teams');
    await page.waitForLoadState('networkidle');
    
    const teamsUrl = page.url();
    console.log(`Teams page with auth: ${teamsUrl}`);
    
    if (teamsUrl.includes('/teams')) {
      console.log('✅ Teams page accessible after authentication');
      
      // Look for team creation functionality
      const createElements = await page.locator('text=/create|Create|new team|New Team/i').all();
      console.log(`Found ${createElements.length} team creation elements`);
      
      // Look for existing teams
      const teamElements = await page.locator('.team-card, .team-item, [data-team]').all();
      console.log(`Found ${teamElements.length} existing team elements`);
      
    } else {
      console.log('❌ Teams page still redirecting after authentication');
    }
    
    // Test profile page with auth
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');
    
    const profileUrl = page.url();
    console.log(`Profile page with auth: ${profileUrl}`);
    
    if (profileUrl.includes('/profile')) {
      console.log('✅ Profile page accessible after authentication');
      
      // Look for profile content
      const profileElements = await page.locator('text=/profile|username|email|team/i').all();
      console.log(`Found ${profileElements.length} profile-related elements`);
      
    } else {
      console.log('❌ Profile page still redirecting after authentication');
    }
    
    // Test draft access with auth
    const draftsResponse = await page.request.get('http://localhost:3001/api/draft');
    const drafts = await draftsResponse.json();
    
    if (drafts.length > 0) {
      const draftId = drafts[0].draft_id;
      await page.goto(`/draft/${draftId}`);
      await page.waitForLoadState('networkidle');
      
      const draftUrl = page.url();
      console.log(`Draft page with auth: ${draftUrl}`);
      
      if (draftUrl.includes('/draft/')) {
        console.log('✅ Draft page accessible after authentication');
        
        // Check for draft functionality
        const draftElements = await page.locator('text=/coin toss|heads|tails|draft|pick|ban/i').all();
        console.log(`Found ${draftElements.length} draft functionality elements`);
        
        // Test coin toss as authenticated user
        const coinButtons = await page.locator('button:has-text("heads"), button:has-text("tails")').all();
        if (coinButtons.length > 0) {
          try {
            await coinButtons[0].click();
            await page.waitForTimeout(2000);
            
            // Check for success or error messages
            const messages = await page.locator('text=/success|error|captain|authorized/i').all();
            console.log(`Found ${messages.length} response messages after coin toss`);
            
            for (const message of messages) {
              const text = await message.textContent();
              console.log(`  Message: "${text?.trim()}"`);
            }
          } catch (error) {
            console.log(`Coin toss failed: ${error.message}`);
          }
        }
        
      } else {
        console.log('❌ Draft page still redirecting after authentication');
      }
    }
  }
  
  // Test tournament registration with auth
  console.log('\n🏆 Testing tournament registration with authentication...');
  
  await page.goto('/tournaments');
  await page.waitForLoadState('networkidle');
  
  const tournaments = await page.locator('.tournament-card, .tournament-item, a[href*="/tournaments/"]').all();
  if (tournaments.length > 0) {
    await tournaments[0].click();
    await page.waitForLoadState('networkidle');
    
    const registerButtons = await page.locator('text=/register|Register|join|Join/i').all();
    console.log(`Found ${registerButtons.length} registration buttons on tournament detail`);
    
    if (registerButtons.length > 0) {
      try {
        await registerButtons[0].click();
        await page.waitForTimeout(2000);
        
        // Check what happens
        const modal = await page.locator('.modal, [role="dialog"]').first();
        const modalVisible = await modal.isVisible();
        console.log(`Registration modal opened: ${modalVisible}`);
        
        if (modalVisible) {
          // Look for team selection
          const teamSelects = await modal.locator('select, option, .team-dropdown').all();
          console.log(`  Found ${teamSelects.length} team selection elements in modal`);
          
          // Look for form fields
          const formFields = await modal.locator('input, select, textarea').all();
          console.log(`  Found ${formFields.length} form fields in registration modal`);
          
          // Close modal
          const closeButton = modal.locator('button:has-text("×"), .close').first();
          if (await closeButton.isVisible()) {
            await closeButton.click();
          }
        }
      } catch (error) {
        console.log(`Registration failed: ${error.message}`);
      }
    }
  }
  
  console.log('\n✅ Discord authentication flow analysis completed');
});