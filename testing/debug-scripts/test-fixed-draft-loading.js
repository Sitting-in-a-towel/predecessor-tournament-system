const postgresService = require('./services/postgresql');

async function testFixedDraftLoading() {
  try {
    console.log('=== TESTING FIXED DRAFT LOADING ===');
    
    const tournamentId = '4fe28137-a1c3-426e-bfa0-1ae9c54f58a0';
    
    // Use the same query as the fixed API endpoint
    const result = await postgresService.query(`
      SELECT 
        ds.*,
        t1.team_name as team1_name,
        t2.team_name as team2_name,
        t1.team_id as team1_id_display,
        t2.team_id as team2_id_display,
        u1.discord_username as team1_captain_name,
        u2.discord_username as team2_captain_name
      FROM draft_sessions ds
      -- Join with tournament registrations (ds.team1_id is registration.id)
      LEFT JOIN tournament_registrations tr1 ON ds.team1_id = tr1.id
      LEFT JOIN tournament_registrations tr2 ON ds.team2_id = tr2.id
      -- Then join with teams to get team names
      LEFT JOIN teams t1 ON tr1.team_id = t1.id
      LEFT JOIN teams t2 ON tr2.team_id = t2.id
      LEFT JOIN users u1 ON ds.team1_captain_id = u1.id
      LEFT JOIN users u2 ON ds.team2_captain_id = u2.id
      WHERE 
        -- Filter by tournament through registrations
        (tr1.tournament_id = $1 OR tr2.tournament_id = $1)
      ORDER BY ds.created_at DESC
    `, [tournamentId]);
    
    console.log(`\n✅ FIXED QUERY RESULTS:`);
    console.log(`Found ${result.rows.length} drafts for tournament`);
    
    result.rows.slice(0, 5).forEach((draft, i) => {
      console.log(`${i+1}. ${draft.draft_id}`);
      console.log(`   Teams: ${draft.team1_name || 'NULL'} vs ${draft.team2_name || 'NULL'}`);
      console.log(`   Status: ${draft.status}`);
      console.log('');
    });
    
    if (result.rows.length > 0 && result.rows[0].team1_name) {
      console.log('🎉 SUCCESS! Team names are now loading correctly!');
      console.log('✅ Your drafts will now appear in the UI with proper team names');
    } else {
      console.log('❌ Still having issues - team names are null');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

testFixedDraftLoading();