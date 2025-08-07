const postgresService = require('./services/postgresql');

async function checkTeams() {
  try {
    // Check the team structure
    const result = await postgresService.query(`
      SELECT id, team_id, team_name, captain_id 
      FROM teams 
      WHERE team_id IN ('team_1754039608317_q04z7jynx', 'team_1754057431987_qltfhi32l')
    `);
    
    console.log('Teams found by team_id:');
    result.rows.forEach(team => {
      console.log(`  - id: ${team.id}, team_id: ${team.team_id}, name: ${team.team_name}`);
    });

    // Also check if those UUIDs exist
    const uuidResult = await postgresService.query(`
      SELECT id, team_id, team_name 
      FROM teams 
      WHERE id IN ('fbedc7c3-f432-45ff-9ac3-9d859ea806b2', 'a6deb4eb-d2cc-4ed9-94ff-4524d71ccb53')
    `);
    
    console.log('\nTeams found by UUID:');
    console.log('Count:', uuidResult.rows.length);
    
    // Check tournament_registrations table
    const regResult = await postgresService.query(`
      SELECT id, team_id, team_name 
      FROM tournament_registrations 
      WHERE tournament_id = (SELECT id FROM tournaments WHERE tournament_id = '67e81a0d-1165-4481-ad58-85da372f86d5')
      AND team_id IN ('team_1754039608317_q04z7jynx', 'team_1754057431987_qltfhi32l')
    `);
    
    console.log('\nRegistrations found:');
    regResult.rows.forEach(reg => {
      console.log(`  - id: ${reg.id}, team_id: ${reg.team_id}, name: ${reg.team_name}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkTeams();