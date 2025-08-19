const { test, expect } = require('@playwright/test');

test('Debug Tournament Registration System', async ({ page }) => {
  console.log('🎫 Debugging Tournament Registration...');
  
  // First test without authentication
  console.log('\n1️⃣ Testing tournament registration WITHOUT authentication...');
  
  await page.goto('/tournaments');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  
  const tournamentCards = await page.locator('.tournament-card').all();
  console.log(`Found ${tournamentCards.length} tournament cards`);
  
  if (tournamentCards.length > 0) {
    const firstCard = tournamentCards[0];
    const buttons = await firstCard.locator('button').all();
    console.log(`Found ${buttons.length} buttons in first tournament card (unauthenticated)`);
    
    for (const button of buttons) {
      const buttonText = await button.textContent();
      console.log(`  Button: "${buttonText}"`);
    }
    
    // Check tournament details for registration info
    const cardText = await firstCard.textContent();
    console.log(`Card contains "Registration": ${cardText.includes('Registration')}`);
    console.log(`Card contains "Open": ${cardText.includes('Open')}`);
  }
  
  // Now test WITH authentication
  console.log('\n2️⃣ Testing tournament registration WITH authentication...');
  
  // Login as test admin (who should have registration access)
  const loginResponse = await page.request.post('http://localhost:3001/api/test-auth/login-test-admin');
  const loginData = await loginResponse.json();
  console.log(`Authentication successful: ${loginData.success}`);
  
  if (loginData.success) {
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    const authenticatedCards = await page.locator('.tournament-card').all();
    console.log(`Found ${authenticatedCards.length} tournament cards (authenticated)`);
    
    let totalRegisterButtons = 0;
    
    for (let i = 0; i < authenticatedCards.length; i++) {
      const card = authenticatedCards[i];
      const cardTitle = await card.locator('h3').textContent();
      
      console.log(`\nTournament ${i + 1}: "${cardTitle}"`);
      
      // Check tournament status and registration details
      const statusBadge = await card.locator('.status-badge').textContent().catch(() => 'No status');
      console.log(`  Status: ${statusBadge}`);
      
      const cardDetails = await card.locator('.tournament-details').textContent();
      const hasRegistrationInfo = cardDetails.includes('Registration');
      console.log(`  Has registration info: ${hasRegistrationInfo}`);
      
      if (hasRegistrationInfo) {
        const registrationMatch = cardDetails.match(/Registration:\s*(Open|Closed)/);
        const registrationStatus = registrationMatch ? registrationMatch[1] : 'Unknown';
        console.log(`  Registration status: ${registrationStatus}`);
      }
      
      const buttons = await card.locator('button').all();
      console.log(`  Found ${buttons.length} buttons:`);
      
      for (const button of buttons) {
        const buttonText = await button.textContent();
        const isVisible = await button.isVisible();
        const isEnabled = await button.isEnabled();
        console.log(`    "${buttonText}" - visible: ${isVisible}, enabled: ${isEnabled}`);
        
        if (buttonText.includes('Register')) {
          totalRegisterButtons++;
          
          // Test clicking the register button
          try {
            console.log(`    🎯 Testing registration button click...`);
            await button.click();
            await page.waitForTimeout(2000);
            
            // Check for modal or navigation
            const modal = await page.locator('.modal, [role="dialog"], .modal-overlay').first();
            const modalVisible = await modal.isVisible();
            
            console.log(`    Registration modal opened: ${modalVisible}`);
            
            if (modalVisible) {
              // Analyze modal content
              const modalText = await modal.textContent();
              console.log(`    Modal contains "team": ${modalText.toLowerCase().includes('team')}`);
              console.log(`    Modal contains "register": ${modalText.toLowerCase().includes('register')}`);
              
              const formFields = await modal.locator('input, select, textarea').all();
              console.log(`    Found ${formFields.length} form fields in modal`);
              
              // Close modal
              const closeButton = modal.locator('button:has-text("×"), button:has-text("Close"), .close-button').first();
              if (await closeButton.isVisible()) {
                await closeButton.click();
                await page.waitForTimeout(500);
              } else {
                await page.keyboard.press('Escape');
                await page.waitForTimeout(500);
              }
            } else {
              // Check if navigation occurred
              const currentUrl = page.url();
              console.log(`    After register click URL: ${currentUrl}`);
            }
          } catch (error) {
            console.log(`    ❌ Registration button click failed: ${error.message}`);
          }
          
          break; // Only test first register button
        }
      }
    }
    
    console.log(`\nTotal "Register Team" buttons found: ${totalRegisterButtons}`);
    
    if (totalRegisterButtons === 0) {
      console.log('\n🔍 Investigating why no registration buttons appear...');
      
      // Check what conditions are required for registration buttons
      console.log('Checking tournament conditions for registration buttons:');
      console.log('Requirements from component code:');
      console.log('1. isAuthenticated: ✅ (we are authenticated)');
      console.log('2. tournament.status === "Registration"');
      console.log('3. tournament.registration_open === true');
      
      // Test these conditions on tournaments
      for (let i = 0; i < Math.min(authenticatedCards.length, 3); i++) {
        const card = authenticatedCards[i];
        const cardTitle = await card.locator('h3').textContent();
        const cardDetails = await card.textContent();
        
        console.log(`\nTournament "${cardTitle}":`);
        
        const hasRegistrationStatus = cardDetails.includes('Status: Registration');
        const hasRegistrationOpen = cardDetails.includes('Registration: Open');
        
        console.log(`  Status is "Registration": ${hasRegistrationStatus}`);
        console.log(`  Registration is "Open": ${hasRegistrationOpen}`);
        console.log(`  Should show register button: ${hasRegistrationStatus && hasRegistrationOpen}`);
      }
    }
  }
  
  console.log('\n✅ Tournament registration debugging completed');
});