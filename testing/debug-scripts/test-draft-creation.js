const pg = require('./services/postgresql');
const winston = require('winston');

// Create a test logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

async function testDraftCreation() {
  console.log('\n=== TESTING DRAFT CREATION SYSTEM ===\n');
  
  const tournamentId = '4fe28137-a1c3-426e-bfa0-1ae9c54f58a0';
  const team1Id = '1e1b7c3f-bde7-469d-9ccd-30e431889ab6'; // Thunder Hawks registration ID
  const team2Id = 'ad791180-90ba-4b70-8ba9-9702ba36d77c'; // Storm Eagles registration ID
  
  try {
    // Step 1: Check tournament exists
    console.log('1. Checking tournament...');
    const tournamentResult = await pg.query(
      'SELECT * FROM tournaments WHERE id = $1',
      [tournamentId]
    );
    console.log(`   ✓ Tournament found: ${tournamentResult.rows[0]?.name || 'NOT FOUND'}`);
    
    // Step 2: Check teams with captain info
    console.log('\n2. Checking teams and captains...');
    const team1Query = `
      SELECT t.*, u.user_id as captain_user_id 
      FROM teams t
      INNER JOIN tournament_registrations tr ON t.id = tr.team_id
      LEFT JOIN users u ON t.captain_id = u.id
      WHERE tr.id = $1
    `;
    
    const team1Result = await pg.query(team1Query, [team1Id]);
    const team2Result = await pg.query(team1Query, [team2Id]);
    
    if (team1Result.rows.length === 0) {
      console.log('   ✗ Team 1 NOT FOUND');
    } else {
      const team1 = team1Result.rows[0];
      console.log(`   ✓ Team 1: ${team1.team_name}`);
      console.log(`     - captain_id: ${team1.captain_id}`);
      console.log(`     - captain_user_id: ${team1.captain_user_id}`);
    }
    
    if (team2Result.rows.length === 0) {
      console.log('   ✗ Team 2 NOT FOUND');
    } else {
      const team2 = team2Result.rows[0];
      console.log(`   ✓ Team 2: ${team2.team_name}`);
      console.log(`     - captain_id: ${team2.captain_id}`);
      console.log(`     - captain_user_id: ${team2.captain_user_id}`);
    }
    
    // Step 3: Check for existing drafts
    console.log('\n3. Checking for existing drafts...');
    const existingDraftQuery = `
      SELECT * FROM draft_sessions 
      WHERE ((team1_id = $1 AND team2_id = $2) 
         OR (team1_id = $2 AND team2_id = $1))
         AND status IN ('Waiting', 'In Progress')
    `;
    
    const existingDraft = await pg.query(existingDraftQuery, [team1Id, team2Id]);
    console.log(`   Existing active drafts: ${existingDraft.rows.length}`);
    if (existingDraft.rows.length > 0) {
      console.log(`   Draft ID: ${existingDraft.rows[0].draft_id}`);
      console.log(`   Status: ${existingDraft.rows[0].status}`);
    }
    
    // Step 4: Simulate draft creation
    console.log('\n4. Testing draft creation...');
    const draftId = `test_draft_${Date.now()}`;
    const team1 = team1Result.rows[0];
    const team2 = team2Result.rows[0];
    
    console.log('   Insert parameters:');
    console.log(`   - draft_id: ${draftId}`);
    console.log(`   - team1_captain_id: ${team1.captain_user_id}`);
    console.log(`   - team2_captain_id: ${team2.captain_user_id}`);
    console.log(`   - team1_id: ${team1Id}`);
    console.log(`   - team2_id: ${team2Id}`);
    
    // Try the actual insert
    try {
      const insertQuery = `
        INSERT INTO draft_sessions (
          draft_id, team1_captain_id, team2_captain_id, 
          team1_id, team2_id,
          status, current_phase, current_turn, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `;
      
      // Get a real user UUID from the database for created_by
      const userResult = await pg.query('SELECT id FROM users LIMIT 1');
      const createdBy = userResult.rows.length > 0 ? userResult.rows[0].id : null;
      
      const result = await pg.query(insertQuery, [
        draftId,
        team1.captain_user_id || null,  // Use null if no captain
        team2.captain_user_id || null,  // Use null if no captain
        team1Id,
        team2Id,
        'Waiting',
        'Coin Toss',
        'team1',
        createdBy  // Use real UUID from database
      ]);
      
      console.log('   ✓ Draft created successfully!');
      console.log(`   Draft ID: ${result.rows[0].draft_id}`);
      
      // Clean up test draft
      await pg.query('DELETE FROM draft_sessions WHERE draft_id = $1', [draftId]);
      console.log('   ✓ Test draft cleaned up');
      
    } catch (insertError) {
      console.log('   ✗ Draft creation failed:');
      console.log(`   Error: ${insertError.message}`);
      console.log(`   Code: ${insertError.code}`);
      console.log(`   Detail: ${insertError.detail}`);
    }
    
    // Step 5: Check draft listing query
    console.log('\n5. Testing draft listing query...');
    try {
      const listQuery = `
        SELECT 
          ds.*,
          t1.team_name as team1_name,
          t2.team_name as team2_name,
          u1.discord_username as team1_captain_name,
          u2.discord_username as team2_captain_name
        FROM draft_sessions ds
        LEFT JOIN tournament_registrations tr1 ON ds.team1_id = tr1.id
        LEFT JOIN tournament_registrations tr2 ON ds.team2_id = tr2.id
        LEFT JOIN teams t1 ON tr1.team_id = t1.id
        LEFT JOIN teams t2 ON tr2.team_id = t2.id
        LEFT JOIN users u1 ON ds.team1_captain_id = u1.user_id
        LEFT JOIN users u2 ON ds.team2_captain_id = u2.user_id
        WHERE 
          (tr1.tournament_id = $1 OR tr2.tournament_id = $1)
        ORDER BY ds.created_at DESC
        LIMIT 5
      `;
      
      const listResult = await pg.query(listQuery, [tournamentId]);
      console.log(`   ✓ Query executed successfully`);
      console.log(`   Found ${listResult.rows.length} drafts`);
      
    } catch (listError) {
      console.log('   ✗ List query failed:');
      console.log(`   Error: ${listError.message}`);
    }
    
  } catch (error) {
    console.error('\n✗ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
  
  console.log('\n=== TEST COMPLETE ===\n');
  process.exit(0);
}

testDraftCreation();