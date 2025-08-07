const postgresService = require('./services/postgresql');

async function testDraftCreation() {
  try {
    console.log('Testing draft session creation...');
    
    // Test data from our Playwright test
    const tournamentId = '4fe28137-a1c3-426e-bfa0-1ae9c54f58a0';
    const team1Id = 'fbedc7c3-f432-45ff-9ac3-9d859ea806b2';  // Registration ID
    const team2Id = 'a6deb4eb-d2cc-4ed9-94ff-4524d71ccb53';  // Registration ID
    
    // Test our team lookup query
    console.log('🔍 Testing team lookup...');
    const team1Result = await postgresService.query(`
      SELECT t.* FROM teams t
      INNER JOIN tournament_registrations tr ON t.id = tr.team_id
      WHERE tr.id = $1
    `, [team1Id]);
    
    const team2Result = await postgresService.query(`
      SELECT t.* FROM teams t
      INNER JOIN tournament_registrations tr ON t.id = tr.team_id
      WHERE tr.id = $1
    `, [team2Id]);
    
    if (team1Result.rows.length === 0 || team2Result.rows.length === 0) {
      console.log('❌ Team lookup failed');
      return;
    }
    
    const team1 = team1Result.rows[0];
    const team2 = team2Result.rows[0];
    
    console.log('✅ Teams found:');
    console.log(`  Team1: ${team1.team_name} (captain: ${team1.captain_id})`);
    console.log(`  Team2: ${team2.team_name} (captain: ${team2.captain_id})`);
    
    // Test draft session creation
    console.log('\n🔍 Testing draft session creation...');
    const draftId = `draft_${Date.now()}_test123`;
    const testUserId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'; // Test admin UUID
    
    console.log('Draft creation parameters:');
    console.log(`  draftId: ${draftId}`);
    console.log(`  team1.captain_id: ${team1.captain_id}`);
    console.log(`  team2.captain_id: ${team2.captain_id}`);
    console.log(`  created_by: ${testUserId}`);
    
    const result = await postgresService.query(`
      INSERT INTO draft_sessions (
        draft_id, team1_captain_id, team2_captain_id, 
        status, current_phase, current_turn, created_by, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      RETURNING *
    `, [
      draftId,
      team1.captain_id,
      team2.captain_id,
      'Waiting',
      'Coin Toss',
      'team1',
      testUserId
    ]);
    
    console.log('✅ Draft session created successfully!');
    console.log('Draft ID:', result.rows[0].draft_id);
    
    // Clean up - delete the test draft
    await postgresService.query('DELETE FROM draft_sessions WHERE draft_id = $1', [draftId]);
    console.log('✅ Test draft cleaned up');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error in draft creation test:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
}

testDraftCreation();