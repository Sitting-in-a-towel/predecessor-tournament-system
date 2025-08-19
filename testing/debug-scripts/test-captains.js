const pg = require('./services/postgresql');

async function test() {
  try {
    const result = await pg.query(`
      SELECT 
        t.id, 
        t.team_name, 
        t.captain_id,
        u.user_id as captain_user_id
      FROM teams t 
      INNER JOIN tournament_registrations tr ON t.id = tr.team_id 
      LEFT JOIN users u ON t.captain_id = u.id
      WHERE tr.tournament_id = $1
    `, ['4fe28137-a1c3-426e-bfa0-1ae9c54f58a0']);
    
    console.log('Teams found:', result.rows.length);
    result.rows.forEach(team => {
      console.log(`${team.team_name}:`);
      console.log(`  - captain_id (binary): ${team.captain_id}`);
      console.log(`  - captain_user_id (string): ${team.captain_user_id}`);
    });
  } catch (error) {
    console.error('Error:', error.message);
  }
  process.exit(0);
}

test();