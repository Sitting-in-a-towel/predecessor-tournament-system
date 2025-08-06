const postgresService = require('./services/postgresql');

async function fixTeamSize() {
  try {
    // Check current fdss team players
    const result = await postgresService.query(`
      SELECT tp.*, u.user_id 
      FROM team_players tp
      JOIN users u ON tp.player_id = u.id
      JOIN teams t ON tp.team_id = t.id 
      WHERE t.team_id = $1
      ORDER BY tp.joined_at
    `, ['fdss']);
    
    console.log(`Current fdss team players: ${result.rows.length}`);
    result.rows.forEach((player, i) => {
      console.log(`${i+1}. ${player.user_id} (${player.role})`);
    });
    
    if (result.rows.length > 4) {
      console.log('Removing excess player to make team 5 total (4 players + 1 captain)');
      await postgresService.query('DELETE FROM team_players WHERE id = $1', [result.rows[4].id]);
      console.log('Removed excess player');
    }
    
    // Verify the final count
    const finalResult = await postgresService.query(`
      SELECT COUNT(*) as count
      FROM team_players tp
      JOIN teams t ON tp.team_id = t.id 
      WHERE t.team_id = $1 AND tp.accepted = true AND tp.role = 'player'
    `, ['fdss']);
    
    console.log(`Final player count (excluding captain): ${finalResult.rows[0].count}`);
    console.log(`Total team size: ${parseInt(finalResult.rows[0].count) + 1} (including captain)`);
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixTeamSize();