const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: 'postgresql://predecessor_tournament_db_user:2WQIOj046lYHGuGnXFA5Ks5asy21xTcH@dpg-d24r7vfgi27c73bbmgh0-a.singapore-postgres.render.com/predecessor_tournament_db',
  ssl: { rejectUnauthorized: false }
});

async function addTeamsToTournament() {
  try {
    console.log('Connecting to production database...');
    
    // First, verify the tournament exists
    const tournamentCheck = await pool.query(
      "SELECT tournament_id, name, max_teams FROM tournaments WHERE name = 'Test tournament 101'"
    );
    
    if (tournamentCheck.rows.length === 0) {
      console.log('Tournament 101 not found!');
      return;
    }
    
    console.log('Found tournament:', tournamentCheck.rows[0]);
    const tournamentId = tournamentCheck.rows[0].tournament_id;
    
    // Get the team IDs that we created earlier
    const teams = await pool.query(
      "SELECT team_id, team_name FROM teams WHERE team_name IN ('Team Alpha', 'Team Beta', 'Team Gamma', 'Team Delta')"
    );
    
    console.log('Found ' + teams.rows.length + ' teams:', teams.rows.map(t => t.team_name));
    
    if (teams.rows.length === 0) {
      console.log('No teams found! Creating them first...');
      
      // Create the teams if they don't exist
      const teamData = [
        { name: 'Team Alpha', captain: 'CaptainAlpha#0001' },
        { name: 'Team Beta', captain: 'CaptainBeta#0002' },
        { name: 'Team Gamma', captain: 'CaptainGamma#0003' },
        { name: 'Team Delta', captain: 'CaptainDelta#0004' }
      ];
      
      for (const team of teamData) {
        const result = await pool.query(
          'INSERT INTO teams (team_name, captain_username, created_at, max_team_size) VALUES ($1, $2, NOW(), 5) RETURNING team_id, team_name',
          [team.name, team.captain]
        );
        console.log('Created team:', result.rows[0]);
      }
      
      // Re-fetch the teams
      const newTeams = await pool.query(
        "SELECT team_id, team_name FROM teams WHERE team_name IN ('Team Alpha', 'Team Beta', 'Team Gamma', 'Team Delta')"
      );
      teams.rows = newTeams.rows;
    }
    
    // Add each team to the tournament
    for (const team of teams.rows) {
      try {
        await pool.query(
          'INSERT INTO tournament_teams (tournament_id, team_id, registration_date, checked_in) VALUES ($1, $2, NOW(), false) ON CONFLICT (tournament_id, team_id) DO UPDATE SET registration_date = NOW()',
          [tournamentId, team.team_id]
        );
        console.log('Added ' + team.team_name + ' to tournament 101');
      } catch (err) {
        console.log('Error adding ' + team.team_name + ':', err.message);
      }
    }
    
    // Verify the teams were added
    const verifyResult = await pool.query(
      "SELECT t.team_name, tt.checked_in FROM tournament_teams tt JOIN teams t ON tt.team_id = t.team_id WHERE tt.tournament_id = $1",
      [tournamentId]
    );
    
    console.log('\nTeams now in tournament 101: ' + verifyResult.rows.length);
    verifyResult.rows.forEach(t => console.log('  - ' + t.team_name + ' (checked in: ' + t.checked_in + ')'));
    
    // Update tournament registration count
    await pool.query(
      "UPDATE tournaments SET current_registered = $1 WHERE tournament_id = $2",
      [verifyResult.rows.length, tournamentId]
    );
    
    console.log('\nTournament registration count updated.');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

addTeamsToTournament();