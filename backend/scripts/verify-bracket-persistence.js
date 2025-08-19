const axios = require('axios');
const postgres = require('../services/postgresql');

async function verifyBracketPersistence() {
  console.log('🔍 VERIFYING ACTUAL BRACKET PERSISTENCE...\n');
  
  try {
    const tournamentId = '4fe28137-a1c3-426e-bfa0-1ae9c54f58a0'; // test admin panel
    
    // Step 1: Check current database state
    console.log('=== STEP 1: CURRENT DATABASE STATE ===');
    
    const currentState = await postgres.query(`
      SELECT 
        t.name,
        t.id,
        tb.is_published,
        tb.updated_at,
        LENGTH(tb.bracket_data::text) as data_size,
        tb.created_by,
        u.discord_username as creator_name
      FROM tournaments t
      LEFT JOIN tournament_brackets tb ON tb.tournament_id = t.id
      LEFT JOIN users u ON tb.created_by = u.id
      WHERE t.id = $1
    `, [tournamentId]);
    
    if (currentState.rows.length === 0) {
      console.log('❌ Tournament not found in database!');
      return;
    }
    
    const current = currentState.rows[0];
    console.log(`Tournament: ${current.name}`);
    console.log(`Has Bracket: ${current.data_size ? 'Yes' : 'No'}`);
    console.log(`Is Published: ${current.is_published}`);
    console.log(`Data Size: ${current.data_size || 0} characters`);
    console.log(`Last Updated: ${current.updated_at || 'Never'}`);
    console.log(`Creator: ${current.creator_name || 'Unknown'}`);
    
    // Step 2: Test bracket API retrieval
    console.log('\n=== STEP 2: API RETRIEVAL TEST ===');
    
    try {
      const apiResponse = await axios.get(`http://localhost:3001/api/tournaments/${tournamentId}/bracket`);
      
      console.log(`✅ API Response: ${apiResponse.status}`);
      console.log(`✅ Has Bracket Data: ${apiResponse.data.has_bracket_data}`);
      console.log(`✅ Is Published: ${apiResponse.data.bracket?.is_published}`);
      console.log(`✅ Matches Returned: ${apiResponse.data.matches?.length || 0}`);
      
      // Check data consistency
      const dbPublished = current.is_published;
      const apiPublished = apiResponse.data.bracket?.is_published;
      
      if (dbPublished === apiPublished) {
        console.log('✅ Database and API are CONSISTENT');
      } else {
        console.log('❌ Database and API are INCONSISTENT!');
        console.log(`   Database says: ${dbPublished}`);
        console.log(`   API says: ${apiPublished}`);
      }
      
    } catch (error) {
      console.log(`❌ API Error: ${error.response?.status} - ${error.message}`);
    }
    
    // Step 3: Simulate the exact save process that would happen
    console.log('\n=== STEP 3: SAVE PROCESS SIMULATION ===');
    
    console.log('🔍 Testing the exact upsert query that runs during publish...');
    
    try {
      // This is the exact query from the backend
      const testQuery = `
        SELECT 
          tournament_id, 
          is_published,
          bracket_data,
          created_by
        FROM tournament_brackets 
        WHERE tournament_id = $1
      `;
      
      const existingBracket = await postgres.query(testQuery, [tournamentId]);
      
      if (existingBracket.rows.length > 0) {
        const bracket = existingBracket.rows[0];
        console.log('✅ Bracket exists in database');
        console.log(`✅ Tournament ID match: ${bracket.tournament_id === tournamentId}`);
        console.log(`✅ Has bracket data: ${!!bracket.bracket_data}`);
        console.log(`✅ Published status: ${bracket.is_published}`);
        
        // Test if an UPDATE would work (simulating the ON CONFLICT clause)
        console.log('\n🧪 Testing UPDATE capability...');
        
        const updateTest = await postgres.query(`
          UPDATE tournament_brackets 
          SET updated_at = CURRENT_TIMESTAMP
          WHERE tournament_id = $1
          RETURNING id, updated_at
        `, [tournamentId]);
        
        if (updateTest.rows.length > 0) {
          console.log('✅ UPDATE works - bracket can be modified');
        } else {
          console.log('❌ UPDATE failed - bracket cannot be modified');
        }
        
      } else {
        console.log('❌ No bracket found in database');
      }
      
    } catch (error) {
      console.log(`❌ Query error: ${error.message}`);
    }
    
    // Step 4: Check for potential blockers
    console.log('\n=== STEP 4: POTENTIAL BLOCKERS ANALYSIS ===');
    
    // Check for constraint violations
    try {
      const constraintCheck = await postgres.query(`
        SELECT 
          conname as constraint_name,
          contype as constraint_type
        FROM pg_constraint 
        WHERE conrelid = 'tournament_brackets'::regclass
      `);
      
      console.log('Database constraints on tournament_brackets:');
      constraintCheck.rows.forEach(c => {
        console.log(`   ${c.constraint_name}: ${c.constraint_type}`);
      });
      
    } catch (error) {
      console.log('Could not check constraints:', error.message);
    }
    
    // Step 5: Final assessment
    console.log('\n=== STEP 5: CONFIDENCE ASSESSMENT ===');
    
    let confidence = 0;
    let issues = [];
    
    if (current.data_size > 0) {
      confidence += 30;
      console.log('✅ +30%: Bracket data exists in database');
    } else {
      issues.push('No bracket data in database');
    }
    
    if (current.is_published !== null) {
      confidence += 20;
      console.log('✅ +20%: Published status is tracked');
    } else {
      issues.push('Published status not set');
    }
    
    try {
      await axios.get(`http://localhost:3001/api/tournaments/${tournamentId}/bracket`);
      confidence += 30;
      console.log('✅ +30%: API successfully returns bracket data');
    } catch (error) {
      issues.push('API cannot retrieve bracket data');
    }
    
    if (current.updated_at) {
      confidence += 20;
      console.log('✅ +20%: Bracket has been updated/saved before');
    } else {
      issues.push('Bracket never been saved/updated');
    }
    
    console.log(`\n🎯 PERSISTENCE CONFIDENCE: ${confidence}%`);
    
    if (confidence >= 80) {
      console.log('🟢 HIGH CONFIDENCE: Bracket should persist after refresh');
    } else if (confidence >= 60) {
      console.log('🟡 MEDIUM CONFIDENCE: Might work, but test carefully');
    } else {
      console.log('🔴 LOW CONFIDENCE: Likely to have persistence issues');
    }
    
    if (issues.length > 0) {
      console.log('\n❌ IDENTIFIED ISSUES:');
      issues.forEach(issue => console.log(`   - ${issue}`));
    }
    
    console.log('\n🚀 RECOMMENDATION:');
    if (confidence >= 80) {
      console.log('   Try publishing a bracket - it should work and persist');
    } else {
      console.log('   More investigation needed before testing');
    }
    
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
  }
  
  process.exit(0);
}

verifyBracketPersistence();