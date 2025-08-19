// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Team Management Tests', () => {
  test('Teams listing page', async ({ page }) => {
    await page.goto('/teams');
    await page.waitForLoadState('networkidle');
    
    // Check for teams display
    const teamsContainer = page.locator('[class*="team"], .teams-list').first();
    
    if (await teamsContainer.isVisible()) {
      // Count teams
      const teamCards = page.locator('[class*="team-card"], [class*="team-item"]');
      const teamCount = await teamCards.count();
      console.log(`Found ${teamCount} teams displayed`);
      
      if (teamCount > 0) {
        // Check first team card
        const firstTeam = teamCards.first();
        
        // Check for team info
        const teamName = await firstTeam.locator('h2, h3, h4, [class*="name"]').textContent();
        console.log(`First team: ${teamName}`);
        
        // Check for team details
        const hasCaptain = await firstTeam.locator('[class*="captain"]').count() > 0;
        const hasMembers = await firstTeam.locator('[class*="member"], [class*="player"]').count() > 0;
        const hasActions = await firstTeam.locator('button, a').count() > 0;
        
        console.log(`Team has: Captain=${hasCaptain}, Members=${hasMembers}, Actions=${hasActions}`);
      }
    } else {
      console.log('No teams container found');
    }
    
    // Check for create team button
    const createButton = page.locator('button:has-text("Create"), a:has-text("Create")').first();
    if (await createButton.isVisible()) {
      console.log('✅ Create team button found');
    }
    
    await page.screenshot({ path: 'test-results/teams-list.png', fullPage: true });
  });

  test('Team creation flow', async ({ page }) => {
    await page.goto('/teams/create');
    
    // Check if requires auth
    if (page.url().includes('/login')) {
      console.log('Team creation requires authentication');
      return;
    }
    
    // Check for form
    const form = page.locator('form, [class*="form"]').first();
    if (await form.isVisible()) {
      console.log('✅ Team creation form found');
      
      // Test form fields
      const teamNameInput = form.locator('input[name*="name"], input[placeholder*="name"]').first();
      const descriptionInput = form.locator('textarea, input[name*="description"]').first();
      const tagInput = form.locator('input[name*="tag"], input[placeholder*="tag"]').first();
      
      if (await teamNameInput.isVisible()) {
        console.log('✅ Team name input found');
        await teamNameInput.fill('Test Team');
      }
      
      if (await descriptionInput.isVisible()) {
        console.log('✅ Description input found');
      }
      
      if (await tagInput.isVisible()) {
        console.log('✅ Team tag input found');
      }
      
      // Check for submit button
      const submitButton = form.locator('button[type="submit"], button:has-text("Create")').first();
      if (await submitButton.isVisible()) {
        console.log('✅ Submit button found');
        const isEnabled = await submitButton.isEnabled();
        console.log(`Submit button enabled: ${isEnabled}`);
      }
    }
    
    await page.screenshot({ path: 'test-results/team-create.png', fullPage: true });
  });

  test('Team details page', async ({ page, request }) => {
    // Get teams from API
    const response = await request.get('http://localhost:3001/api/teams');
    let teams = [];
    
    if (response.ok()) {
      teams = await response.json();
    }
    
    if (teams.length > 0) {
      const team = teams[0];
      console.log(`Testing team: ${team.team_name} (${team.team_id})`);
      
      // Navigate to team details
      await page.goto(`/teams/${team.team_id}`);
      await page.waitForLoadState('networkidle');
      
      // Check for team info
      const teamHeader = page.locator('h1, h2').first();
      if (await teamHeader.isVisible()) {
        const headerText = await teamHeader.textContent();
        console.log(`Team header: ${headerText}`);
      }
      
      // Check for members section
      const membersSection = page.locator('[class*="member"], [class*="player"], [class*="roster"]').first();
      if (await membersSection.isVisible()) {
        console.log('✅ Members section found');
        
        // Count members
        const members = membersSection.locator('[class*="member-item"], [class*="player-item"]');
        const memberCount = await members.count();
        console.log(`Found ${memberCount} team members`);
      }
      
      // Check for team actions
      const editButton = page.locator('button:has-text("Edit"), a:has-text("Edit")').first();
      const inviteButton = page.locator('button:has-text("Invite"), a:has-text("Invite")').first();
      
      if (await editButton.isVisible()) {
        console.log('✅ Edit team button found');
      }
      
      if (await inviteButton.isVisible()) {
        console.log('✅ Invite button found');
      }
    }
  });

  test('Team invitation system', async ({ page }) => {
    await page.goto('/teams');
    
    // Look for invite button on any team
    const inviteButton = page.locator('button:has-text("Invite"), a:has-text("Invite")').first();
    
    if (await inviteButton.isVisible()) {
      await inviteButton.click();
      await page.waitForTimeout(500);
      
      // Check for invite modal
      const modal = page.locator('[role="dialog"], .modal, [class*="modal"]').first();
      if (await modal.isVisible()) {
        console.log('✅ Invite modal opened');
        
        // Check for input fields
        const userInput = modal.locator('input[type="text"], input[placeholder*="user"], input[placeholder*="player"]').first();
        const sendButton = modal.locator('button:has-text("Send"), button:has-text("Invite")').first();
        
        if (await userInput.isVisible()) {
          console.log('✅ User input field found');
        }
        
        if (await sendButton.isVisible()) {
          console.log('✅ Send invite button found');
        }
      }
    }
  });

  test('Team search functionality', async ({ page }) => {
    await page.goto('/teams');
    await page.waitForLoadState('networkidle');
    
    // Look for search input
    const searchInput = page.locator('input[type="search"], input[placeholder*="Search"]').first();
    
    if (await searchInput.isVisible()) {
      console.log('✅ Team search input found');
      
      // Test search
      await searchInput.fill('test');
      await page.waitForTimeout(500);
      
      // Check if results update
      const teamCount = await page.locator('[class*="team-card"], [class*="team-item"]').count();
      console.log(`Teams after search: ${teamCount}`);
    }
  });

  test('Team management actions', async ({ page }) => {
    await page.goto('/teams');
    
    // Check for various team actions
    const actions = [
      { text: 'View', description: 'View team details' },
      { text: 'Edit', description: 'Edit team' },
      { text: 'Leave', description: 'Leave team' },
      { text: 'Delete', description: 'Delete team' },
      { text: 'Manage', description: 'Manage team' }
    ];
    
    for (const action of actions) {
      const button = page.locator(`button:has-text("${action.text}"), a:has-text("${action.text}")`).first();
      if (await button.isVisible()) {
        console.log(`✅ ${action.description} button found`);
      }
    }
  });

  test('Team statistics and performance', async ({ page, request }) => {
    // Get teams
    const response = await request.get('http://localhost:3001/api/teams');
    
    if (response.ok()) {
      const teams = await response.json();
      
      if (teams.length > 0) {
        const team = teams[0];
        
        // Navigate to team page
        await page.goto(`/teams/${team.team_id}`);
        
        // Check for statistics
        const statsSection = page.locator('[class*="stats"], [class*="statistics"]').first();
        if (await statsSection.isVisible()) {
          console.log('✅ Team statistics section found');
          
          // Look for specific stats
          const wins = statsSection.locator(':has-text("Win"), :has-text("win")').first();
          const losses = statsSection.locator(':has-text("Loss"), :has-text("loss")').first();
          const tournaments = statsSection.locator(':has-text("Tournament"), :has-text("tournament")').first();
          
          if (await wins.isVisible()) console.log('✅ Win statistics found');
          if (await losses.isVisible()) console.log('✅ Loss statistics found');
          if (await tournaments.isVisible()) console.log('✅ Tournament statistics found');
        }
      }
    }
  });
});