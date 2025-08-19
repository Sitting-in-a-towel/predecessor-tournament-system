const { test, expect } = require('@playwright/test');

test('Comprehensive Exfang Timer System Analysis', async ({ page }) => {
  console.log('🕐 COMPREHENSIVE EXFANG TIMER SYSTEM ANALYSIS');
  console.log('='.repeat(60));
  
  let analysisData = {
    timerSystem: {},
    draftSettings: {},
    autoSelection: {},
    visualElements: {},
    draftFlow: {}
  };

  // === STEP 1: INITIAL NAVIGATION AND HOMEPAGE ANALYSIS ===
  console.log('\n📍 STEP 1: HOMEPAGE AND INITIAL NAVIGATION');
  await page.goto('https://exfang.fly.dev/', { waitUntil: 'networkidle' });
  
  // Take initial screenshot
  await page.screenshot({ path: 'screenshots/exfang-homepage-timer-analysis.png', fullPage: true });
  
  // Look for any timer-related settings on homepage
  const homepageContent = await page.textContent('body');
  const timerMentions = homepageContent.match(/timer|time|second|minute|duration|timeout/gi) || [];
  console.log(`⏱️ Timer-related words on homepage: ${timerMentions.length} (${timerMentions.slice(0,5).join(', ')})`);

  // === STEP 2: DRAFT CREATION AND CONFIGURATION ANALYSIS ===
  console.log('\n📍 STEP 2: DRAFT CREATION AND SETTINGS ANALYSIS');
  
  // Click "New draft" button
  try {
    await page.waitForSelector('button:has-text("New draft")', { timeout: 5000 });
    await page.click('button:has-text("New draft")');
    await page.waitForLoadState('networkidle');
    
    // Take screenshot of draft creation form
    await page.screenshot({ path: 'screenshots/exfang-draft-creation-form.png', fullPage: true });
    
    // === ANALYZE DRAFT CONFIGURATION OPTIONS ===
    console.log('\n⚙️ ANALYZING DRAFT CONFIGURATION OPTIONS...');
    
    // Check for all form elements
    const formElements = await page.locator('input, select, textarea, button').all();
    console.log(`📋 Found ${formElements.length} form elements`);
    
    // Analyze each form element for timer-related configurations
    for (let i = 0; i < formElements.length; i++) {
      try {
        const element = formElements[i];
        const tagName = await element.evaluate(el => el.tagName.toLowerCase());
        const type = await element.getAttribute('type') || '';
        const placeholder = await element.getAttribute('placeholder') || '';
        const value = await element.inputValue().catch(() => '');
        const innerText = await element.innerText().catch(() => '');
        
        // Check if this element is timer-related
        const isTimerRelated = 
          /timer|time|second|minute|duration|timeout/gi.test(placeholder + innerText + value);
        
        if (isTimerRelated || tagName === 'select') {
          console.log(`   🔍 ${tagName}${type ? `[${type}]` : ''}: "${placeholder || innerText}" = "${value}"`);
          
          // If it's a select, get all options
          if (tagName === 'select') {
            const options = await element.locator('option').all();
            console.log(`      📝 Options: ${options.length}`);
            for (let j = 0; j < Math.min(options.length, 10); j++) {
              const optionText = await options[j].innerText();
              const optionValue = await options[j].getAttribute('value');
              console.log(`        - "${optionText}" (value: ${optionValue})`);
              
              // Store timer-related settings
              if (/timer|time|second|minute|duration/gi.test(optionText)) {
                if (!analysisData.draftSettings.timerOptions) {
                  analysisData.draftSettings.timerOptions = [];
                }
                analysisData.draftSettings.timerOptions.push({
                  text: optionText,
                  value: optionValue
                });
              }
            }
          }
        }
      } catch (e) {
        console.log(`   ⚠️ Error analyzing form element ${i}: ${e.message}`);
      }
    }

    // Fill out form with basic information
    console.log('\n📝 FILLING DRAFT FORM...');
    
    try {
      // Fill team names
      const teamInputs = await page.locator('input[placeholder*="Dawn"], input[placeholder*="Dusk"], input[placeholder*="Team"]').all();
      if (teamInputs.length >= 2) {
        await teamInputs[0].fill('Timer Test Team A');
        await teamInputs[1].fill('Timer Test Team B');
        console.log('✅ Filled team names');
      }

      // Try to find and interact with timer-related settings
      const selectElements = await page.locator('select').all();
      console.log(`🎛️ Found ${selectElements.length} select dropdowns`);
      
      for (let i = 0; i < selectElements.length; i++) {
        const select = selectElements[i];
        const selectText = await select.innerText().catch(() => '');
        console.log(`   Select ${i}: Contains "${selectText.substring(0, 50)}"`);
        
        // Test different timer configurations if available
        if (/timer|time|duration/gi.test(selectText)) {
          console.log('   ⏱️ This appears to be a timer configuration!');
          const options = await select.locator('option').all();
          for (let j = 0; j < Math.min(options.length, 3); j++) {
            const optionText = await options[j].innerText();
            console.log(`     - Option: ${optionText}`);
          }
        }
      }

    } catch (error) {
      console.log(`   ⚠️ Form filling error: ${error.message}`);
    }

    // === STEP 3: CREATE DRAFT AND ANALYZE ACTIVE DRAFT ===
    console.log('\n📍 STEP 3: CREATING DRAFT TO ANALYZE ACTIVE TIMER SYSTEM');
    
    // Submit the draft
    const submitButton = page.locator('button:has-text("Submit")').first();
    if (await submitButton.isVisible()) {
      console.log('🚀 Submitting draft...');
      
      // Monitor network requests
      const requests = [];
      page.on('request', req => {
        requests.push(`${req.method()} ${req.url()}`);
      });
      
      await submitButton.click();
      await page.waitForTimeout(3000);
      
      console.log('📡 Recent network requests:');
      requests.slice(-5).forEach(req => console.log(`   ${req}`));
      
      // Take screenshot after submission
      await page.screenshot({ path: 'screenshots/exfang-after-draft-creation.png', fullPage: true });
      
      const currentUrl = page.url();
      console.log(`📍 Current URL: ${currentUrl}`);
      
      // === STEP 4: ANALYZE ACTIVE DRAFT INTERFACE ===
      console.log('\n📍 STEP 4: ANALYZING ACTIVE DRAFT INTERFACE');
      
      // Look for timer elements in the active draft
      const draftContent = await page.textContent('body');
      
      // Search for timer patterns
      const timerPatterns = [
        /\d{1,2}:\d{2}/g,           // MM:SS format
        /\d+\s*(second|sec|s)\b/gi, // "30 seconds", "30s"
        /\d+\s*(minute|min|m)\b/gi, // "5 minutes", "5m"  
        /time\s*left/gi,            // "Time left"
        /timer/gi,                  // "Timer", "timer"
        /countdown/gi,              // "Countdown"
        /pick\s*time/gi,            // "Pick time"
        /ban\s*time/gi              // "Ban time"
      ];
      
      console.log('\n⏱️ TIMER ELEMENT ANALYSIS:');
      timerPatterns.forEach((pattern, index) => {
        const matches = draftContent.match(pattern) || [];
        if (matches.length > 0) {
          console.log(`   Pattern ${index + 1} (${pattern}): ${matches.slice(0, 5).join(', ')}`);
          
          // Store timer findings
          if (!analysisData.timerSystem.foundTimers) {
            analysisData.timerSystem.foundTimers = [];
          }
          analysisData.timerSystem.foundTimers.push({
            pattern: pattern.toString(),
            matches: matches.slice(0, 10)
          });
        }
      });

      // Look for specific timer-related CSS classes or IDs
      const timerSelectors = [
        '[class*="timer"]',
        '[class*="countdown"]', 
        '[class*="time"]',
        '[id*="timer"]',
        '[id*="countdown"]',
        '[id*="time"]'
      ];
      
      console.log('\n🎨 TIMER UI ELEMENTS:');
      for (const selector of timerSelectors) {
        try {
          const elements = await page.locator(selector).all();
          if (elements.length > 0) {
            console.log(`   ${selector}: Found ${elements.length} elements`);
            
            for (let i = 0; i < Math.min(elements.length, 3); i++) {
              const element = elements[i];
              const text = await element.innerText().catch(() => '');
              const className = await element.getAttribute('class') || '';
              console.log(`     - Text: "${text}" | Class: "${className}"`);
            }
            
            // Store visual timer elements
            if (!analysisData.visualElements.timerElements) {
              analysisData.visualElements.timerElements = [];
            }
            analysisData.visualElements.timerElements.push({
              selector: selector,
              count: elements.length
            });
          }
        } catch (e) {
          // Silent fail for non-existent selectors
        }
      }

      // === STEP 5: ANALYZE DRAFT PHASES AND FLOW ===
      console.log('\n📍 STEP 5: DRAFT FLOW AND PHASES ANALYSIS');
      
      // Look for phase indicators
      const phasePatterns = [
        /coin\s*toss/gi,
        /ban\s*phase/gi,
        /pick\s*phase/gi,
        /draft\s*phase/gi,
        /selection/gi,
        /turn/gi,
        /waiting/gi
      ];
      
      console.log('\n🎯 DRAFT PHASES DETECTED:');
      phasePatterns.forEach((pattern, index) => {
        const matches = draftContent.match(pattern) || [];
        if (matches.length > 0) {
          console.log(`   ${pattern}: ${matches.slice(0, 3).join(', ')}`);
          
          if (!analysisData.draftFlow.phases) {
            analysisData.draftFlow.phases = [];
          }
          analysisData.draftFlow.phases.push({
            pattern: pattern.toString(),
            matches: matches.slice(0, 5)
          });
        }
      });

      // === STEP 6: TEST DRAFT ACCESS WITH SECOND PLAYER ===
      console.log('\n📍 STEP 6: TESTING MULTIPLAYER TIMER BEHAVIOR');
      
      // Extract draft token/URL for second player
      let draftToken = null;
      if (currentUrl.includes('/draft/')) {
        draftToken = currentUrl.split('/draft/')[1].split(/[?#]/)[0];
      } else {
        // Look for tokens in the content
        const tokenPatterns = /[A-Z0-9]{4,8}/g;
        const tokens = draftContent.match(tokenPatterns) || [];
        if (tokens.length > 0) {
          draftToken = tokens[0];
        }
      }
      
      if (draftToken) {
        console.log(`🔑 Found draft token: ${draftToken}`);
        
        try {
          // Open second browser context for multiplayer testing
          const page2 = await page.context().newPage();
          await page2.goto('https://exfang.fly.dev/');
          
          // Try to access the draft
          const accessButton = page2.locator('button:has-text("Draft access")').first();
          if (await accessButton.isVisible({ timeout: 3000 })) {
            await accessButton.click();
            await page2.waitForTimeout(1000);
            
            // Enter the token
            const tokenInput = page2.locator('input').first();
            await tokenInput.fill(draftToken);
            await page2.locator('button:has-text("Submit")').first().click();
            await page2.waitForTimeout(2000);
            
            // Take screenshot of player 2 view
            await page2.screenshot({ path: 'screenshots/exfang-player2-view.png', fullPage: true });
            
            console.log(`🎮 Player 2 URL: ${page2.url()}`);
            
            // Compare timer states between both players
            const player2Content = await page2.textContent('body');
            const player1Timers = draftContent.match(/\d{1,2}:\d{2}/g) || [];
            const player2Timers = player2Content.match(/\d{1,2}:\d{2}/g) || [];
            
            console.log(`⏱️ Player 1 timers: ${player1Timers.slice(0, 3).join(', ')}`);
            console.log(`⏱️ Player 2 timers: ${player2Timers.slice(0, 3).join(', ')}`);
            
            if (player1Timers.join() === player2Timers.join()) {
              console.log('✅ Timers are synchronized between players');
              analysisData.timerSystem.synchronized = true;
            } else {
              console.log('⚠️ Timer synchronization differences detected');
              analysisData.timerSystem.synchronized = false;
            }
            
          } else {
            console.log('⚠️ Draft access button not found on homepage');
          }
          
          await page2.close();
        } catch (error) {
          console.log(`⚠️ Multiplayer test error: ${error.message}`);
        }
      }

      // === STEP 7: TEST TIMER EXPIRATION BEHAVIOR ===
      console.log('\n📍 STEP 7: TESTING TIMER EXPIRATION AND AUTO-SELECTION');
      
      // Look for active timers and wait to see what happens
      const currentTimers = await page.locator('[class*="timer"], [id*="timer"]').all();
      if (currentTimers.length > 0) {
        console.log(`⏰ Found ${currentTimers.length} active timer elements`);
        
        // Monitor for 30 seconds to see timer behavior
        console.log('⏳ Monitoring timer behavior for 30 seconds...');
        
        let timerStates = [];
        for (let second = 0; second < 30; second += 5) {
          await page.waitForTimeout(5000);
          
          const currentContent = await page.textContent('body');
          const visibleTimers = currentContent.match(/\d{1,2}:\d{2}/g) || [];
          
          timerStates.push({
            second: second + 5,
            timers: visibleTimers.slice(0, 3)
          });
          
          console.log(`   ${second + 5}s: ${visibleTimers.slice(0, 3).join(', ')}`);
          
          // Check if anything auto-selected
          const selectionPatterns = /selected|auto|timeout|expired/gi;
          const autoSelections = currentContent.match(selectionPatterns) || [];
          if (autoSelections.length > 0) {
            console.log(`   🤖 Auto-selection detected: ${autoSelections.slice(0, 3).join(', ')}`);
            
            analysisData.autoSelection.detected = true;
            analysisData.autoSelection.triggers = autoSelections.slice(0, 5);
          }
        }
        
        // Take final screenshot after monitoring
        await page.screenshot({ path: 'screenshots/exfang-after-timer-monitoring.png', fullPage: true });
        
        // Analyze timer progression
        if (timerStates.length > 1) {
          const firstTimers = timerStates[0].timers;
          const lastTimers = timerStates[timerStates.length - 1].timers;
          
          console.log('\n📊 TIMER PROGRESSION ANALYSIS:');
          console.log(`   Start: ${firstTimers.join(', ')}`);
          console.log(`   End:   ${lastTimers.join(', ')}`);
          
          if (firstTimers.length > 0 && lastTimers.length > 0) {
            // Try to parse and compare timer values
            try {
              const parseTimer = (timer) => {
                const [min, sec] = timer.split(':').map(Number);
                return min * 60 + sec;
              };
              
              const firstSeconds = parseTimer(firstTimers[0]);
              const lastSeconds = parseTimer(lastTimers[0]);
              const elapsed = firstSeconds - lastSeconds;
              
              console.log(`   ⏱️ Timer decreased by ${elapsed} seconds over monitoring period`);
              
              if (elapsed > 0) {
                analysisData.timerSystem.countdownConfirmed = true;
                analysisData.timerSystem.tickRate = elapsed / 30; // seconds per second (should be ~1)
              }
            } catch (e) {
              console.log('   ⚠️ Timer parsing error - may not be standard format');
            }
          }
        }
      } else {
        console.log('⚠️ No active timers found to monitor');
      }

    } else {
      console.log('⚠️ Submit button not found - cannot create draft for analysis');
    }

  } catch (error) {
    console.log(`⚠️ Draft creation failed: ${error.message}`);
    await page.screenshot({ path: 'screenshots/exfang-draft-creation-error.png', fullPage: true });
  }

  // === STEP 8: FINAL ANALYSIS AND SUMMARY ===
  console.log('\n📍 STEP 8: COMPREHENSIVE ANALYSIS SUMMARY');
  console.log('='.repeat(60));
  
  console.log('\n🕐 TIMER SYSTEM FINDINGS:');
  if (analysisData.timerSystem.foundTimers) {
    analysisData.timerSystem.foundTimers.forEach((finding, index) => {
      console.log(`   ${index + 1}. ${finding.pattern}: ${finding.matches.join(', ')}`);
    });
  } else {
    console.log('   ❌ No timer patterns detected');
  }
  
  console.log('\n⚙️ DRAFT SETTINGS FINDINGS:');
  if (analysisData.draftSettings.timerOptions) {
    analysisData.draftSettings.timerOptions.forEach((option, index) => {
      console.log(`   ${index + 1}. "${option.text}" (value: ${option.value})`);
    });
  } else {
    console.log('   ❌ No timer configuration options found');
  }
  
  console.log('\n🤖 AUTO-SELECTION FINDINGS:');
  if (analysisData.autoSelection.detected) {
    console.log('   ✅ Auto-selection behavior detected');
    console.log(`   🎯 Triggers: ${analysisData.autoSelection.triggers.join(', ')}`);
  } else {
    console.log('   ❓ Auto-selection behavior not observed during monitoring');
  }
  
  console.log('\n🎨 VISUAL TIMER ELEMENTS:');
  if (analysisData.visualElements.timerElements) {
    analysisData.visualElements.timerElements.forEach((element, index) => {
      console.log(`   ${index + 1}. ${element.selector}: ${element.count} elements`);
    });
  } else {
    console.log('   ❌ No visual timer elements detected');
  }
  
  console.log('\n🎯 DRAFT FLOW PHASES:');
  if (analysisData.draftFlow.phases) {
    analysisData.draftFlow.phases.forEach((phase, index) => {
      console.log(`   ${index + 1}. ${phase.pattern}: ${phase.matches.join(', ')}`);
    });
  } else {
    console.log('   ❌ No draft phases detected');
  }
  
  console.log('\n🔄 SYNCHRONIZATION STATUS:');
  if (analysisData.timerSystem.synchronized !== undefined) {
    console.log(`   ${analysisData.timerSystem.synchronized ? '✅' : '⚠️'} Timer synchronization: ${analysisData.timerSystem.synchronized ? 'Working' : 'Issues detected'}`);
  } else {
    console.log('   ❓ Synchronization not tested (multiplayer access failed)');
  }
  
  // Save analysis data to JSON file for further processing
  const fs = require('fs');
  fs.writeFileSync('exfang-timer-analysis-data.json', JSON.stringify(analysisData, null, 2));
  console.log('\n💾 Analysis data saved to exfang-timer-analysis-data.json');
  
  console.log('\n✅ COMPREHENSIVE TIMER SYSTEM ANALYSIS COMPLETE!');
  console.log('📊 Check screenshots/ folder for visual evidence');
  console.log('📄 Check exfang-timer-analysis-data.json for structured data');
});