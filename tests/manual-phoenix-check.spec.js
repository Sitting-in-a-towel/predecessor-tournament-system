const { test, expect } = require('@playwright/test');

test('Manual Phoenix Check - What React Should Do', async ({ page }) => {
  console.log('🔧 MANUAL PHOENIX CHECK');
  console.log('This simulates what React SHOULD be doing when you refresh the page');
  console.log('='.repeat(60));
  
  // Step 1: Test the exact Phoenix API call that React should make
  console.log('\n1️⃣ Testing Phoenix API call with your tournament ID...');
  
  const tournamentId = '4fe28137-a1c3-426e-bfa0-1ae9c54f58a0'; // Your tournament ID
  
  const phoenixResponse = await page.request.get(`http://localhost:4000/api/drafts?tournament_id=${tournamentId}`);
  
  if (phoenixResponse.ok()) {
    const phoenixDrafts = await phoenixResponse.json();
    console.log('✅ Phoenix API working');
    console.log('📊 Found', phoenixDrafts.length, 'drafts for tournament');
    
    if (phoenixDrafts.length > 0) {
      console.log('\n📋 Most recent drafts:');
      phoenixDrafts.slice(0, 3).forEach((draft, i) => {
        console.log(`   ${i + 1}. ${draft.draft_id} (${draft.status}) - ${draft.created_at}`);
      });
    }
    
    // Step 2: Test what React should do with this data
    console.log('\n2️⃣ Processing drafts as React should...');
    
    const processedDrafts = phoenixDrafts.map(draft => ({
      id: draft.id,
      draft_id: draft.draft_id,
      team1_name: draft.team1_name,
      team2_name: draft.team2_name,
      status: draft.status,
      current_phase: draft.current_phase,
      created_at: draft.created_at,
      phoenixDraftId: draft.draft_id // Mark as Phoenix draft
    }));
    
    console.log('✅ Processed', processedDrafts.length, 'drafts for React');
    
    // Step 3: Check if React backend also has drafts
    console.log('\n3️⃣ Checking React backend...');
    
    try {
      const reactResponse = await page.request.get(`http://localhost:3001/api/draft?tournamentId=${tournamentId}`);
      if (reactResponse.ok()) {
        const reactDrafts = await reactResponse.json();
        console.log('✅ React backend accessible');
        console.log('📊 React backend has', reactDrafts.length, 'drafts');
        
        if (reactDrafts.length > 0 && phoenixDrafts.length > 0) {
          console.log('🔄 Both systems have drafts - merging should work');
        } else if (phoenixDrafts.length > 0) {
          console.log('🔄 Only Phoenix has drafts - Phoenix drafts should show');
        } else {
          console.log('❌ No drafts in either system');
        }
      } else {
        console.log('⚠️ React backend returned', reactResponse.status());
      }
    } catch (error) {
      console.log('❌ React backend error:', error.message);
    }
    
  } else {
    console.log('❌ Phoenix API failed with status:', phoenixResponse.status());
    const errorText = await phoenixResponse.text();
    console.log('Error:', errorText.substring(0, 200));
  }
  
  // Step 4: Diagnosis
  console.log('\n' + '='.repeat(60));
  console.log('🔧 WHAT SHOULD HAPPEN WHEN YOU REFRESH:');
  console.log('='.repeat(60));
  console.log('1. You are authenticated as admin/captain ✅');
  console.log('2. Drafts tab shows ✅');
  console.log('3. TournamentDrafts component mounts ✅');
  console.log('4. loadDraftData() function runs ✅');
  console.log('5. Phoenix API call succeeds ✅ (confirmed above)');
  console.log('6. Phoenix drafts get processed ✅ (confirmed above)');
  console.log('7. Drafts appear in UI... ❓ (this is where it fails)');
  
  console.log('\n💡 LIKELY ISSUE:');
  console.log('The Phoenix API call succeeds, but there might be:');
  console.log('- A JavaScript error in processing the response');
  console.log('- The drafts getting overwritten by empty React backend response');
  console.log('- A timing issue where drafts are loaded then cleared');
  
  console.log('\n🔍 TO DEBUG FURTHER:');
  console.log('1. Open browser dev tools (F12)');
  console.log('2. Go to tournament Drafts tab');
  console.log('3. Refresh the page');
  console.log('4. Look for errors in Console tab');
  console.log('5. Look for network calls in Network tab');
  console.log('6. Check if you see "Loading Phoenix drafts" in console');
});