// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Profile and Admin Tests', () => {
  test('User profile page', async ({ page }) => {
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');
    
    // Check if requires auth
    if (page.url().includes('/login')) {
      console.log('Profile requires authentication');
      return;
    }
    
    // Check for profile sections
    const profileContainer = page.locator('[class*="profile"], .user-profile').first();
    
    if (await profileContainer.isVisible()) {
      console.log('✅ Profile container found');
      
      // Check for user info
      const username = page.locator('[class*="username"], [class*="discord"]').first();
      const avatar = page.locator('img[src*="avatar"], img[alt*="avatar"], [class*="avatar"]').first();
      
      if (await username.isVisible()) {
        const name = await username.textContent();
        console.log(`Username: ${name}`);
      }
      
      if (await avatar.isVisible()) {
        console.log('✅ User avatar found');
      }
      
      // Check for profile sections
      const sections = ['Account', 'Teams', 'Statistics', 'Settings', 'Omeda'];
      for (const section of sections) {
        const sectionElement = page.locator(`[class*="${section.toLowerCase()}"], :has-text("${section}")`).first();
        if (await sectionElement.isVisible()) {
          console.log(`✅ ${section} section found`);
        }
      }
    }
    
    await page.screenshot({ path: 'test-results/profile-page.png', fullPage: true });
  });

  test('Omeda.city integration', async ({ page }) => {
    await page.goto('/profile');
    
    if (page.url().includes('/login')) {
      return;
    }
    
    // Look for Omeda section
    const omedaSection = page.locator('[class*="omeda"], :has-text("Omeda")').first();
    
    if (await omedaSection.isVisible()) {
      console.log('✅ Omeda.city section found');
      
      // Check for connect button
      const connectButton = page.locator('button:has-text("Connect"), button:has-text("Sync")').first();
      if (await connectButton.isVisible()) {
        console.log('✅ Omeda connect/sync button found');
      }
      
      // Check for player stats
      const stats = ['MMR', 'Rank', 'Games', 'Win Rate'];
      for (const stat of stats) {
        const statElement = page.locator(`:has-text("${stat}")`).first();
        if (await statElement.isVisible()) {
          console.log(`✅ ${stat} stat found`);
        }
      }
      
      // Check for favorite hero
      const heroSection = page.locator('[class*="hero"], :has-text("Hero")').first();
      if (await heroSection.isVisible()) {
        console.log('✅ Favorite hero section found');
      }
    }
  });

  test('Profile settings', async ({ page }) => {
    await page.goto('/profile/settings');
    
    if (page.url().includes('/login')) {
      return;
    }
    
    // Check for settings form
    const settingsForm = page.locator('form, [class*="settings"]').first();
    
    if (await settingsForm.isVisible()) {
      console.log('✅ Settings form found');
      
      // Check for setting options
      const settings = [
        { name: 'notifications', type: 'checkbox' },
        { name: 'privacy', type: 'select' },
        { name: 'theme', type: 'select' },
        { name: 'language', type: 'select' }
      ];
      
      for (const setting of settings) {
        const input = page.locator(`[name*="${setting.name}"], [id*="${setting.name}"]`).first();
        if (await input.isVisible()) {
          console.log(`✅ ${setting.name} setting found`);
        }
      }
      
      // Check for save button
      const saveButton = page.locator('button:has-text("Save"), button[type="submit"]').first();
      if (await saveButton.isVisible()) {
        console.log('✅ Save settings button found');
      }
    }
  });

  test('Admin dashboard access', async ({ page, request }) => {
    // First test with test admin auth
    const loginResponse = await request.post('http://localhost:3001/api/test-auth/login-test-admin');
    
    if (loginResponse.ok()) {
      console.log('✅ Test admin login successful');
      
      // Test admin API
      const dashboardResponse = await request.get('http://localhost:3001/api/admin/dashboard', {
        headers: {
          'Cookie': loginResponse.headers()['set-cookie'] || ''
        }
      });
      
      if (dashboardResponse.ok()) {
        const data = await dashboardResponse.json();
        console.log('Admin dashboard stats:');
        console.log(`- Total users: ${data.totalUsers}`);
        console.log(`- Total teams: ${data.totalTeams}`);
        console.log(`- Total tournaments: ${data.totalTournaments}`);
        console.log(`- Total matches: ${data.totalMatches}`);
      }
    }
    
    // Try to access admin UI
    await page.goto('/admin/dashboard');
    
    if (!page.url().includes('/login')) {
      // Check for admin UI elements
      const adminContainer = page.locator('[class*="admin"], .dashboard').first();
      
      if (await adminContainer.isVisible()) {
        console.log('✅ Admin dashboard UI found');
        
        // Check for statistics cards
        const statCards = page.locator('[class*="stat"], [class*="card"]');
        const cardCount = await statCards.count();
        console.log(`Found ${cardCount} statistics cards`);
        
        // Check for admin sections
        const sections = ['Users', 'Teams', 'Tournaments', 'Reports'];
        for (const section of sections) {
          const sectionElement = page.locator(`:has-text("${section}")`).first();
          if (await sectionElement.isVisible()) {
            console.log(`✅ ${section} section found`);
          }
        }
      }
      
      await page.screenshot({ path: 'test-results/admin-dashboard.png', fullPage: true });
    } else {
      console.log('Admin dashboard redirected to login (expected for non-admin users)');
    }
  });

  test('Admin team management', async ({ page }) => {
    await page.goto('/admin/teams');
    
    if (page.url().includes('/login')) {
      return;
    }
    
    // Check for team management UI
    const teamsTable = page.locator('table, [class*="table"]').first();
    
    if (await teamsTable.isVisible()) {
      console.log('✅ Teams table found');
      
      // Check for team actions
      const actions = ['Edit', 'Delete', 'View'];
      for (const action of actions) {
        const button = page.locator(`button:has-text("${action}")`).first();
        if (await button.isVisible()) {
          console.log(`✅ ${action} action found`);
        }
      }
    }
  });

  test('Admin tournament management', async ({ page }) => {
    await page.goto('/admin/tournaments');
    
    if (page.url().includes('/login')) {
      return;
    }
    
    // Check for tournament management
    const tournamentsList = page.locator('[class*="tournament"], table').first();
    
    if (await tournamentsList.isVisible()) {
      console.log('✅ Tournament management UI found');
      
      // Check for create button
      const createButton = page.locator('button:has-text("Create"), a:has-text("Create")').first();
      if (await createButton.isVisible()) {
        console.log('✅ Create tournament button found');
      }
      
      // Check for tournament actions
      const actions = ['Edit', 'Delete', 'Start', 'Cancel'];
      for (const action of actions) {
        const button = page.locator(`button:has-text("${action}")`).first();
        if (await button.isVisible()) {
          console.log(`✅ ${action} action found`);
        }
      }
    }
  });

  test('User invitations and notifications', async ({ page }) => {
    await page.goto('/profile');
    
    if (page.url().includes('/login')) {
      return;
    }
    
    // Check for invitations section
    const invitationsSection = page.locator('[class*="invitation"], :has-text("Invitation")').first();
    
    if (await invitationsSection.isVisible()) {
      console.log('✅ Invitations section found');
      
      // Check for invitation actions
      const acceptButton = page.locator('button:has-text("Accept")').first();
      const declineButton = page.locator('button:has-text("Decline")').first();
      
      if (await acceptButton.isVisible()) {
        console.log('✅ Accept invitation button found');
      }
      
      if (await declineButton.isVisible()) {
        console.log('✅ Decline invitation button found');
      }
    }
    
    // Check for notifications
    const notificationsIcon = page.locator('[class*="notification"], [aria-label*="notification"]').first();
    if (await notificationsIcon.isVisible()) {
      console.log('✅ Notifications icon found');
    }
  });
});