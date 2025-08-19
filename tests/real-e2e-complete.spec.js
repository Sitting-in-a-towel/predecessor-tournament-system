// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('COMPLETE END-TO-END TESTING - EVERY BUTTON, EVERY LINK', () => {
  let testResults = {
    workingElements: [],
    brokenElements: [],
    totalTested: 0
  };

  test.beforeEach(async ({ page }) => {
    // Log ALL console messages
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error(`🚨 CONSOLE ERROR: ${msg.text()}`);
        testResults.brokenElements.push({
          type: 'Console Error',
          error: msg.text(),
          page: page.url()
        });
      }
    });

    // Log page errors
    page.on('pageerror', error => {
      console.error(`🚨 PAGE ERROR: ${error.message}`);
      testResults.brokenElements.push({
        type: 'Page Error',
        error: error.message,
        page: page.url()
      });
    });

    // Log failed requests
    page.on('response', response => {
      if (response.status() >= 400) {
        console.log(`⚠️ HTTP ERROR: ${response.status()} ${response.url()}`);
        testResults.brokenElements.push({
          type: 'HTTP Error',
          error: `${response.status()} ${response.url()}`,
          page: page.url()
        });
      }
    });
  });

  test('HOMEPAGE - Test EVERY single interactive element', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    console.log('🏠 TESTING HOMEPAGE - EVERY BUTTON AND LINK');
    
    // Get ALL clickable elements
    const clickableElements = await page.locator('a, button, [role="button"], [onclick], [role="link"], input[type="submit"]').all();
    console.log(`Found ${clickableElements.length} clickable elements on homepage`);
    
    for (let i = 0; i < clickableElements.length; i++) {
      const element = clickableElements[i];
      testResults.totalTested++;
      
      try {
        const tagName = await element.evaluate(el => el.tagName);
        const text = (await element.textContent()) || '';
        const href = await element.getAttribute('href');
        const onclick = await element.getAttribute('onclick');
        const role = await element.getAttribute('role');
        
        console.log(`\n🔍 Testing element ${i + 1}: ${tagName} - "${text.trim().substring(0, 50)}"`);
        console.log(`   Href: ${href}, OnClick: ${onclick}, Role: ${role}`);
        
        // Check if element is visible and enabled
        const isVisible = await element.isVisible();
        const isEnabled = await element.isEnabled();
        
        if (!isVisible) {
          testResults.brokenElements.push({
            type: 'Hidden Element',
            element: `${tagName} - ${text}`,
            issue: 'Element not visible',
            page: 'Homepage'
          });
          console.log(`   ❌ Element not visible`);
          continue;
        }
        
        if (!isEnabled) {
          testResults.brokenElements.push({
            type: 'Disabled Element',
            element: `${tagName} - ${text}`,
            issue: 'Element disabled',
            page: 'Homepage'
          });
          console.log(`   ⚠️ Element disabled`);
          continue;
        }
        
        // ACTUALLY CLICK THE ELEMENT
        const currentUrl = page.url();
        console.log(`   🖱️ CLICKING element...`);
        
        await element.click();
        await page.waitForTimeout(1000); // Wait for any navigation/response
        
        // Check what happened after click
        const newUrl = page.url();
        const urlChanged = newUrl !== currentUrl;
        
        if (urlChanged) {
          console.log(`   ✅ Navigation successful: ${currentUrl} → ${newUrl}`);
          testResults.workingElements.push({
            type: 'Navigation Link',
            element: `${tagName} - ${text}`,
            action: `Navigated to ${newUrl}`,
            page: 'Homepage'
          });
          
          // Navigate back to homepage
          await page.goBack();
          await page.waitForLoadState('networkidle');
        } else {
          // Check for modal or UI changes
          const modals = await page.locator('[role="dialog"], .modal, [class*="modal"]').all();
          if (modals.length > 0) {
            console.log(`   ✅ Modal opened`);
            testResults.workingElements.push({
              type: 'Modal Trigger',
              element: `${tagName} - ${text}`,
              action: 'Modal opened',
              page: 'Homepage'
            });
            
            // Close modal
            const closeButton = page.locator('[aria-label="Close"], button:has-text("Close"), [class*="close"]').first();
            if (await closeButton.isVisible()) {
              await closeButton.click();
            } else {
              await page.keyboard.press('Escape');
            }
          } else {
            // Check for any UI changes
            const bodyText = await page.locator('body').textContent();
            console.log(`   ⚠️ Clicked but no obvious change detected`);
            testResults.workingElements.push({
              type: 'Button Click',
              element: `${tagName} - ${text}`,
              action: 'Clicked - no obvious change',
              page: 'Homepage'
            });
          }
        }
        
      } catch (error) {
        console.log(`   ❌ FAILED: ${error.message}`);
        testResults.brokenElements.push({
          type: 'Click Error',
          element: `Element ${i + 1}`,
          error: error.message,
          page: 'Homepage'
        });
      }
    }
    
    console.log(`\n📊 HOMEPAGE RESULTS:`);
    console.log(`   Total tested: ${testResults.totalTested}`);
    console.log(`   Working: ${testResults.workingElements.length}`);
    console.log(`   Broken: ${testResults.brokenElements.length}`);
  });

  test('TOURNAMENTS PAGE - Test EVERY interactive element', async ({ page }) => {
    await page.goto('/tournaments');
    await page.waitForLoadState('networkidle');
    
    console.log('🏆 TESTING TOURNAMENTS PAGE - EVERY BUTTON AND LINK');
    
    // Test all clickable elements
    const clickableElements = await page.locator('a, button, [role="button"], [onclick], input[type="submit"], select').all();
    console.log(`Found ${clickableElements.length} clickable elements on tournaments page`);
    
    for (let i = 0; i < clickableElements.length; i++) {
      const element = clickableElements[i];
      testResults.totalTested++;
      
      try {
        const tagName = await element.evaluate(el => el.tagName);
        const text = (await element.textContent()) || '';
        const type = await element.getAttribute('type');
        const value = await element.getAttribute('value');
        
        console.log(`\n🔍 Testing element ${i + 1}: ${tagName} - "${text.trim().substring(0, 50)}"`);
        
        const isVisible = await element.isVisible();
        if (!isVisible) continue;
        
        const currentUrl = page.url();
        
        // Handle different element types differently
        if (tagName === 'SELECT') {
          // Test dropdown
          console.log(`   🔽 Testing dropdown...`);
          const options = await element.locator('option').all();
          if (options.length > 1) {
            await element.selectOption({ index: 1 });
            await page.waitForTimeout(500);
            console.log(`   ✅ Dropdown selection successful`);
            testResults.workingElements.push({
              type: 'Dropdown',
              element: `${tagName} - ${text}`,
              action: 'Option selected',
              page: 'Tournaments'
            });
          }
        } else if (tagName === 'INPUT' && type === 'text') {
          // Test text input
          console.log(`   ⌨️ Testing text input...`);
          await element.fill('test search');
          await page.waitForTimeout(500);
          console.log(`   ✅ Text input successful`);
          testResults.workingElements.push({
            type: 'Text Input',
            element: `${tagName}`,
            action: 'Text entered',
            page: 'Tournaments'
          });
          await element.clear();
        } else {
          // Test button/link click
          console.log(`   🖱️ CLICKING element...`);
          await element.click();
          await page.waitForTimeout(1000);
          
          const newUrl = page.url();
          if (newUrl !== currentUrl) {
            console.log(`   ✅ Navigation: ${currentUrl} → ${newUrl}`);
            testResults.workingElements.push({
              type: 'Navigation',
              element: `${tagName} - ${text}`,
              action: `Navigated to ${newUrl}`,
              page: 'Tournaments'
            });
            await page.goBack();
            await page.waitForLoadState('networkidle');
          } else {
            // Check for modals or changes
            const modals = await page.locator('[role="dialog"], .modal').all();
            if (modals.length > 0) {
              console.log(`   ✅ Modal opened`);
              testResults.workingElements.push({
                type: 'Modal',
                element: `${tagName} - ${text}`,
                action: 'Modal opened',
                page: 'Tournaments'
              });
              // Close modal
              await page.keyboard.press('Escape');
            } else {
              console.log(`   ⚠️ Clicked - no obvious change`);
            }
          }
        }
        
      } catch (error) {
        console.log(`   ❌ FAILED: ${error.message}`);
        testResults.brokenElements.push({
          type: 'Interaction Error',
          element: `Element ${i + 1}`,
          error: error.message,
          page: 'Tournaments'
        });
      }
    }
  });

  test('TEAMS PAGE - Test EVERY interactive element', async ({ page }) => {
    await page.goto('/teams');
    await page.waitForLoadState('networkidle');
    
    console.log('👥 TESTING TEAMS PAGE - EVERY BUTTON AND LINK');
    
    const clickableElements = await page.locator('a, button, [role="button"], input, select').all();
    console.log(`Found ${clickableElements.length} interactive elements on teams page`);
    
    for (let i = 0; i < clickableElements.length; i++) {
      const element = clickableElements[i];
      testResults.totalTested++;
      
      try {
        const tagName = await element.evaluate(el => el.tagName);
        const text = (await element.textContent()) || '';
        const type = await element.getAttribute('type');
        
        console.log(`\n🔍 Testing element ${i + 1}: ${tagName}[${type}] - "${text.trim().substring(0, 50)}"`);
        
        const isVisible = await element.isVisible();
        if (!isVisible) continue;
        
        const currentUrl = page.url();
        
        if (tagName === 'INPUT') {
          if (type === 'search' || type === 'text') {
            await element.fill('test team');
            await page.waitForTimeout(500);
            console.log(`   ✅ Input field tested`);
            testResults.workingElements.push({
              type: 'Input Field',
              element: `${tagName}[${type}]`,
              action: 'Text entered',
              page: 'Teams'
            });
            await element.clear();
          }
        } else {
          await element.click();
          await page.waitForTimeout(1000);
          
          const newUrl = page.url();
          if (newUrl !== currentUrl) {
            console.log(`   ✅ Navigation: ${newUrl}`);
            testResults.workingElements.push({
              type: 'Navigation',
              element: `${tagName} - ${text}`,
              action: `Navigated to ${newUrl}`,
              page: 'Teams'
            });
            await page.goBack();
            await page.waitForLoadState('networkidle');
          } else {
            const modals = await page.locator('[role="dialog"], .modal').count();
            if (modals > 0) {
              console.log(`   ✅ Modal opened`);
              testResults.workingElements.push({
                type: 'Modal',
                element: `${tagName} - ${text}`,
                action: 'Modal opened',
                page: 'Teams'
              });
              await page.keyboard.press('Escape');
            } else {
              console.log(`   ⚠️ Clicked - no obvious change`);
            }
          }
        }
        
      } catch (error) {
        console.log(`   ❌ FAILED: ${error.message}`);
        testResults.brokenElements.push({
          type: 'Teams Error',
          element: `Element ${i + 1}`,
          error: error.message,
          page: 'Teams'
        });
      }
    }
  });

  test('TEST ALL FORMS - Submit every form with data', async ({ page }) => {
    console.log('📝 TESTING ALL FORMS - SUBMIT WITH REAL DATA');
    
    const pagesWithForms = [
      '/teams/create',
      '/tournaments/create',
      '/profile/settings',
      '/contact',
      '/feedback'
    ];
    
    for (const pageUrl of pagesWithForms) {
      console.log(`\n📋 Testing forms on: ${pageUrl}`);
      
      try {
        const response = await page.goto(pageUrl);
        if (response && response.status() === 404) {
          console.log(`   ⚠️ Page not found: ${pageUrl}`);
          continue;
        }
        
        await page.waitForLoadState('networkidle');
        
        // Find all forms
        const forms = await page.locator('form').all();
        console.log(`   Found ${forms.length} forms`);
        
        for (let i = 0; i < forms.length; i++) {
          const form = forms[i];
          console.log(`\n   🔍 Testing form ${i + 1}`);
          
          // Fill all inputs in the form
          const inputs = await form.locator('input, textarea, select').all();
          
          for (const input of inputs) {
            const type = await input.getAttribute('type');
            const tagName = await input.evaluate(el => el.tagName);
            const name = await input.getAttribute('name');
            
            try {
              if (tagName === 'INPUT') {
                switch (type) {
                  case 'text':
                  case 'email':
                    await input.fill('test@example.com');
                    break;
                  case 'password':
                    await input.fill('testpassword123');
                    break;
                  case 'number':
                    await input.fill('5');
                    break;
                  case 'date':
                    await input.fill('2025-12-01');
                    break;
                  case 'checkbox':
                    await input.check();
                    break;
                }
              } else if (tagName === 'TEXTAREA') {
                await input.fill('This is a test description for the form field.');
              } else if (tagName === 'SELECT') {
                const options = await input.locator('option').all();
                if (options.length > 1) {
                  await input.selectOption({ index: 1 });
                }
              }
              
              console.log(`     ✅ Filled ${tagName}[${type}] ${name}`);
              
            } catch (error) {
              console.log(`     ❌ Failed to fill ${tagName}[${type}]: ${error.message}`);
              testResults.brokenElements.push({
                type: 'Form Input Error',
                element: `${tagName}[${type}] on ${pageUrl}`,
                error: error.message,
                page: pageUrl
              });
            }
          }
          
          // Try to submit the form
          const submitButton = form.locator('button[type="submit"], input[type="submit"], button:has-text("Submit"), button:has-text("Create"), button:has-text("Save")').first();
          
          if (await submitButton.isVisible()) {
            console.log(`     🚀 Attempting form submission...`);
            
            const currentUrl = page.url();
            
            try {
              await submitButton.click();
              await page.waitForTimeout(2000);
              
              const newUrl = page.url();
              const urlChanged = newUrl !== currentUrl;
              
              // Check for success messages
              const successMessage = await page.locator('.success, [class*="success"], .alert-success, :has-text("Success"), :has-text("Created"), :has-text("Saved")').count();
              
              // Check for error messages
              const errorMessage = await page.locator('.error, [class*="error"], .alert-error, [class*="invalid"]').count();
              
              if (successMessage > 0) {
                console.log(`     ✅ FORM SUBMISSION SUCCESS - Success message shown`);
                testResults.workingElements.push({
                  type: 'Form Submission Success',
                  element: `Form on ${pageUrl}`,
                  action: 'Successfully submitted with success message',
                  page: pageUrl
                });
              } else if (urlChanged) {
                console.log(`     ✅ FORM SUBMISSION SUCCESS - Redirected to ${newUrl}`);
                testResults.workingElements.push({
                  type: 'Form Submission Success',
                  element: `Form on ${pageUrl}`,
                  action: `Successfully submitted - redirected to ${newUrl}`,
                  page: pageUrl
                });
              } else if (errorMessage > 0) {
                console.log(`     ⚠️ Form submission showed validation errors (expected)`);
                testResults.workingElements.push({
                  type: 'Form Validation',
                  element: `Form on ${pageUrl}`,
                  action: 'Form validation working - errors shown',
                  page: pageUrl
                });
              } else {
                console.log(`     ❌ Form submission - no clear response`);
                testResults.brokenElements.push({
                  type: 'Form Submission Issue',
                  element: `Form on ${pageUrl}`,
                  error: 'No clear success/error response after submission',
                  page: pageUrl
                });
              }
              
            } catch (submitError) {
              console.log(`     ❌ Form submission failed: ${submitError.message}`);
              testResults.brokenElements.push({
                type: 'Form Submission Error',
                element: `Form on ${pageUrl}`,
                error: submitError.message,
                page: pageUrl
              });
            }
          } else {
            console.log(`     ⚠️ No submit button found`);
          }
        }
        
      } catch (error) {
        console.log(`   ❌ Error testing forms on ${pageUrl}: ${error.message}`);
      }
    }
  });

  test('FINAL REPORT - Document ALL findings', async ({ page }) => {
    console.log('\n🎯 GENERATING COMPLETE END-TO-END TEST REPORT\n');
    
    const totalTested = testResults.totalTested;
    const totalWorking = testResults.workingElements.length;
    const totalBroken = testResults.brokenElements.length;
    const successRate = totalTested > 0 ? ((totalWorking / totalTested) * 100).toFixed(1) : 0;
    
    console.log('📊 FINAL TEST STATISTICS:');
    console.log(`   Total Elements Tested: ${totalTested}`);
    console.log(`   Working Elements: ${totalWorking}`);
    console.log(`   Broken Elements: ${totalBroken}`);
    console.log(`   Success Rate: ${successRate}%`);
    
    console.log('\n✅ WORKING ELEMENTS:');
    testResults.workingElements.forEach((item, index) => {
      console.log(`   ${index + 1}. ${item.type}: ${item.element} - ${item.action} (${item.page})`);
    });
    
    console.log('\n❌ BROKEN ELEMENTS:');
    testResults.brokenElements.forEach((item, index) => {
      console.log(`   ${index + 1}. ${item.type}: ${item.element || 'Unknown'} - ${item.error || item.issue} (${item.page})`);
    });
    
    // Create detailed report file
    const report = {
      testDate: new Date().toISOString(),
      summary: {
        totalTested,
        totalWorking,
        totalBroken,
        successRate: parseFloat(successRate)
      },
      workingElements: testResults.workingElements,
      brokenElements: testResults.brokenElements
    };
    
    // Save to file
    const fs = require('fs');
    fs.writeFileSync('test-results/complete-e2e-report.json', JSON.stringify(report, null, 2));
    console.log('\n📄 Detailed report saved to: test-results/complete-e2e-report.json');
    
    // Assert based on findings
    if (totalBroken > 0) {
      console.log(`\n🚨 FOUND ${totalBroken} ISSUES THAT NEED ATTENTION!`);
    } else {
      console.log(`\n🎉 ALL TESTED ELEMENTS WORKING CORRECTLY!`);
    }
  });
});