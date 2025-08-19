const { test, expect } = require('@playwright/test');

test('Complete Admin Dashboard Testing', async ({ page }) => {
  console.log('👑 Testing Admin Dashboard Functionality...');
  
  // Login as admin
  const loginResponse = await page.request.post('http://localhost:3001/api/test-auth/login-test-admin');
  const loginData = await loginResponse.json();
  console.log(`Admin login success: ${loginData.success}`);
  
  if (!loginData.success) {
    console.log('❌ Failed to login as admin');
    return;
  }
  
  // Navigate to admin dashboard
  await page.goto('http://localhost:3000/admin/dashboard');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  
  console.log(`Current URL: ${page.url()}`);
  
  // Check if we're actually on admin dashboard
  const isAdminDashboard = page.url().includes('/admin/dashboard');
  console.log(`On admin dashboard: ${isAdminDashboard}`);
  
  if (!isAdminDashboard) {
    console.log('❌ Not on admin dashboard - checking redirect...');
    const currentUrl = page.url();
    console.log(`Redirected to: ${currentUrl}`);
    return;
  }
  
  // Test dashboard statistics
  console.log('📊 Testing Dashboard Statistics...');
  
  const statElements = await page.locator('.stat-card, .stat-item, .dashboard-stat').all();
  console.log(`Found ${statElements.length} stat cards`);
  
  // Look for numbers/statistics
  const numberElements = await page.locator('text=/\\d+/').all();
  console.log(`Found ${numberElements.length} numeric elements`);
  
  let totalValue = 0;
  for (let i = 0; i < Math.min(numberElements.length, 10); i++) {
    const text = await numberElements[i].textContent();
    const number = parseInt(text?.match(/\\d+/)?.[0] || '0');
    if (number > 0) totalValue += number;
    console.log(`  Stat ${i + 1}: "${text?.trim()}" (${number})`);
  }
  
  console.log(`Total statistical value: ${totalValue}`);
  if (totalValue === 0) {
    console.log('❌ All statistics showing 0 - possible data loading issue');
  }
  
  // Test admin buttons
  console.log('🔘 Testing Admin Buttons...');
  
  const adminButtons = await page.locator('button').all();
  console.log(`Found ${adminButtons.length} buttons`);
  
  const buttonResults = [];
  for (let i = 0; i < adminButtons.length; i++) {
    const button = adminButtons[i];
    const buttonText = await button.textContent();
    const isVisible = await button.isVisible();
    const isEnabled = await button.isEnabled();
    
    const result = {
      text: buttonText?.trim(),
      visible: isVisible,
      enabled: isEnabled,
      clickable: isVisible && isEnabled
    };
    
    buttonResults.push(result);
    console.log(`  Button "${result.text}": visible=${result.visible}, enabled=${result.enabled}`);
    
    // Test clicking important admin buttons
    if (result.clickable && (
      result.text?.includes('Create Tournament') ||
      result.text?.includes('Manage Users') ||
      result.text?.includes('Manage Drafts')
    )) {
      try {
        await button.click();
        await page.waitForTimeout(1000);
        
        // Check if modal opened
        const modal = page.locator('.modal, [role="dialog"], .modal-overlay').first();
        const modalVisible = await modal.isVisible();
        console.log(`    Modal opened for "${result.text}": ${modalVisible}`);
        
        if (modalVisible) {
          // Try to close modal
          const closeButtons = await modal.locator('button:has-text("×"), button:has-text("Close"), button:has-text("Cancel")').all();
          if (closeButtons.length > 0) {
            await closeButtons[0].click();
            await page.waitForTimeout(500);
          } else {
            await page.keyboard.press('Escape');
            await page.waitForTimeout(500);
          }
        }
      } catch (error) {
        console.log(`    ❌ Failed to click "${result.text}": ${error.message}`);
      }
    }
  }
  
  // Test data refresh
  console.log('🔄 Testing Data Refresh...');
  
  const refreshButton = adminButtons.find(async (btn) => {
    const text = await btn.textContent();
    return text?.includes('Refresh');
  });
  
  if (refreshButton && await refreshButton.isVisible()) {
    try {
      await refreshButton.click();
      await page.waitForTimeout(2000);
      console.log('✅ Refresh button clicked successfully');
    } catch (error) {
      console.log(`❌ Refresh failed: ${error.message}`);
    }
  }
  
  // Test admin sections
  console.log('📋 Testing Admin Sections...');
  
  const sections = ['statistics', 'recent activity', 'system health', 'user management'];
  for (const section of sections) {
    const sectionElements = await page.locator(`text=/${section}/i`).all();
    console.log(`  Found ${sectionElements.length} "${section}" elements`);
  }
  
  // Check for error messages
  console.log('🚨 Checking for Errors...');
  
  const errorElements = await page.locator('text=/error|Error|ERROR|failed|Failed|FAILED/i').all();
  console.log(`Found ${errorElements.length} error messages`);
  
  for (const error of errorElements) {
    const errorText = await error.textContent();
    console.log(`  ❌ Error: "${errorText?.trim()}"`);
  }
  
  // Test navigation within admin
  console.log('🧭 Testing Admin Navigation...');
  
  const adminLinks = await page.locator('a[href*="/admin"], .nav-link').all();
  console.log(`Found ${adminLinks.length} admin navigation links`);
  
  for (const link of adminLinks.slice(0, 3)) {
    const href = await link.getAttribute('href');
    const text = await link.textContent();
    console.log(`  Admin link: "${text?.trim()}" -> ${href}`);
  }
  
  console.log('✅ Admin Dashboard testing completed');
});