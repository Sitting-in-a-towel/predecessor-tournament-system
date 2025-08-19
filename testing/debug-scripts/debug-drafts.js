const postgresService = require('./services/postgresql');

async function checkDrafts() {
  try {
    const result = await postgresService.query(
      'SELECT draft_id, team1_id, team2_id, status, created_at FROM draft_sessions WHERE tournament_id = $1 ORDER BY created_at DESC', 
      ['4fe28137-a1c3-426e-bfa0-1ae9c54f58a0']
    );
    
    console.log('=== DRAFTS IN DATABASE ===');
    console.log('Found', result.rows.length, 'drafts:');
    
    result.rows.forEach((row, i) => {
      console.log(`${i+1}. ${row.draft_id} (${row.status}) - Teams: ${row.team1_id} vs ${row.team2_id} - Created: ${row.created_at}`);
    });
    
    console.log('\n=== TESTING DRAFT API ===');
    const apiResult = await postgresService.query(`
      SELECT 
        ds.*,
        COALESCE(t1_specific.team_name, t1_fallback.team_name) as team1_name,
        COALESCE(t2_specific.team_name, t2_fallback.team_name) as team2_name
      FROM draft_sessions ds
      LEFT JOIN teams t1_specific ON ds.team1_id = t1_specific.id
      LEFT JOIN teams t2_specific ON ds.team2_id = t2_specific.id
      LEFT JOIN teams t1_fallback ON ds.team1_captain_id = t1_fallback.captain_id
      LEFT JOIN teams t2_fallback ON ds.team2_captain_id = t2_fallback.captain_id
      WHERE ds.tournament_id = $1
      ORDER BY ds.created_at DESC
    `, ['4fe28137-a1c3-426e-bfa0-1ae9c54f58a0']);
    
    console.log('API query returns', apiResult.rows.length, 'drafts:');
    apiResult.rows.forEach((row, i) => {
      console.log(`${i+1}. ${row.draft_id} - ${row.team1_name || 'Unknown'} vs ${row.team2_name || 'Unknown'}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

checkDrafts();