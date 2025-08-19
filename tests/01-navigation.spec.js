// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Navigation and Homepage Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    
    // Log any console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error(`Console error: ${msg.text()}`);
      }
    });
    
    // Log any page errors
    page.on('pageerror', error => {
      console.error(`Page error: ${error.message}`);
    });
  });

  test('Homepage loads correctly', async ({ page }) => {
    // Check page title
    await expect(page).toHaveTitle(/Predecessor Tournament/);
    
    // Check main content loads
    const mainContent = page.locator('main, #root, .app-container').first();
    await expect(mainContent).toBeVisible();
    
    // Screenshot homepage
    await page.screenshot({ path: 'test-results/homepage.png', fullPage: true });
  });

  test('Navigation menu is accessible', async ({ page }) => {
    // Check for navigation elements
    const nav = page.locator('nav, .navbar, .navigation, header').first();
    await expect(nav).toBeVisible();
    
    // Find all navigation links
    const navLinks = nav.locator('a, button');
    const linkCount = await navLinks.count();
    console.log(`Found ${linkCount} navigation links`);
    
    // Test each navigation link
    for (let i = 0; i < linkCount; i++) {
      const link = navLinks.nth(i);
      const text = await link.textContent();
      const href = await link.getAttribute('href');
      console.log(`Nav link ${i}: "${text}" -> ${href}`);
      
      // Check link is visible and clickable
      await expect(link).toBeVisible();
      const isClickable = await link.isEnabled();
      expect(isClickable).toBeTruthy();
    }
  });

  test('All main pages are accessible', async ({ page }) => {
    const routes = [
      { path: '/', name: 'Home' },
      { path: '/tournaments', name: 'Tournaments' },
      { path: '/teams', name: 'Teams' },
      { path: '/profile', name: 'Profile' },
      { path: '/login', name: 'Login' },
      { path: '/admin/dashboard', name: 'Admin Dashboard' },
    ];
    
    for (const route of routes) {
      console.log(`Testing route: ${route.name} (${route.path})`);
      
      const response = await page.goto(route.path);
      
      // Check response status
      if (response) {
        const status = response.status();
        console.log(`${route.name} response status: ${status}`);
        
        // Page should load (200) or redirect (301/302) for auth
        expect([200, 301, 302, 304]).toContain(status);
      }
      
      // Check for error messages
      const errorElements = page.locator('.error, .error-message, [class*="error"]');
      const errorCount = await errorElements.count();
      if (errorCount > 0) {
        const errorText = await errorElements.first().textContent();
        console.log(`Error on ${route.name}: ${errorText}`);
      }
      
      // Screenshot each page
      await page.screenshot({ 
        path: `test-results/page-${route.name.toLowerCase().replace(/\s+/g, '-')}.png`,
        fullPage: true 
      });
    }
  });

  test('Footer and important links work', async ({ page }) => {
    // Check for footer
    const footer = page.locator('footer, .footer').first();
    if (await footer.isVisible()) {
      // Find all footer links
      const footerLinks = footer.locator('a');
      const linkCount = await footerLinks.count();
      console.log(`Found ${linkCount} footer links`);
      
      for (let i = 0; i < linkCount; i++) {
        const link = footerLinks.nth(i);
        const text = await link.textContent();
        const href = await link.getAttribute('href');
        console.log(`Footer link: "${text}" -> ${href}`);
      }
    }
  });

  test('Check for broken images', async ({ page }) => {
    // Find all images
    const images = page.locator('img');
    const imageCount = await images.count();
    console.log(`Found ${imageCount} images`);
    
    const brokenImages = [];
    for (let i = 0; i < imageCount; i++) {
      const img = images.nth(i);
      const src = await img.getAttribute('src');
      const alt = await img.getAttribute('alt');
      
      // Check if image loads
      const isVisible = await img.isVisible();
      const naturalWidth = await img.evaluate(node => node.naturalWidth);
      
      if (isVisible && naturalWidth === 0 && src) {
        brokenImages.push({ src, alt });
        console.log(`Broken image: ${src} (alt: ${alt})`);
      }
    }
    
    console.log(`Total broken images: ${brokenImages.length}`);
  });

  test('Responsive design check', async ({ page }) => {
    const viewports = [
      { width: 1920, height: 1080, name: 'Desktop' },
      { width: 768, height: 1024, name: 'Tablet' },
      { width: 375, height: 667, name: 'Mobile' },
    ];
    
    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.waitForTimeout(500); // Wait for responsive adjustments
      
      // Check navigation is still accessible
      const nav = page.locator('nav, .navbar, .navigation, header').first();
      await expect(nav).toBeVisible();
      
      // Screenshot responsive view
      await page.screenshot({ 
        path: `test-results/responsive-${viewport.name.toLowerCase()}.png`,
        fullPage: true 
      });
      
      console.log(`✅ ${viewport.name} view (${viewport.width}x${viewport.height}) tested`);
    }
  });
});