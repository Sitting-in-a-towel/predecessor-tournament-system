require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const postgresService = require('./services/postgresql');

async function debugTeams() {
  console.log('=== Debug Teams Local ===\n');
  
  try {
    // Test connection
    await postgresService.testConnection();
    console.log('✅ PostgreSQL connection working\n');
    
    // Check if users exist
    const usersResult = await postgresService.query('SELECT * FROM users ORDER BY created_at DESC LIMIT 3');
    console.log('Recent users in database:');
    usersResult.rows.forEach(user => {
      console.log(`- ${user.discord_username} (ID: ${user.user_id})`);
    });
    
    // Check if teams exist
    const teamsResult = await postgresService.query('SELECT * FROM teams ORDER BY created_at DESC LIMIT 5');
    console.log('\nTeams in database:');
    teamsResult.rows.forEach(team => {
      console.log(`- ${team.team_name} (ID: ${team.team_id}) - Captain: ${team.captain_id}`);
    });
    
    // Check team_players relationships
    const teamPlayersResult = await postgresService.query(`
      SELECT tp.*, t.team_name, u.discord_username 
      FROM team_players tp 
      JOIN teams t ON tp.team_id = t.id 
      JOIN users u ON tp.player_id = u.id 
      ORDER BY tp.joined_at DESC LIMIT 5
    `);
    console.log('\nTeam-Player relationships:');
    teamPlayersResult.rows.forEach(rel => {
      console.log(`- ${rel.discord_username} → ${rel.team_name} (${rel.role})`);
    });
    
    // Test the actual query used by the API
    const testUserId = usersResult.rows[0]?.user_id;
    if (testUserId) {
      console.log(`\nTesting getTeamsByUser for: ${testUserId}`);
      const userTeams = await postgresService.getTeamsByUser(testUserId);
      console.log(`Found ${userTeams.length} teams for this user`);
      userTeams.forEach(team => {
        console.log(`- ${team.team_name} (${team.player_role})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Debug error:', error);
  }
}

debugTeams();