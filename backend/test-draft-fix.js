const postgresService = require('./services/postgresql');

async function testDraftQuery() {
  try {
    console.log('Testing draft query with UUID casting...');
    
    // Test the exact query we're using in the draft route
    const team1Id = 'fbedc7c3-f432-45ff-9ac3-9d859ea806b2';
    const team2Id = 'a6deb4eb-d2cc-4ed9-94ff-4524d71ccb53';
    
    console.log('Testing team1 lookup...');
    const team1Result = await postgresService.query(`
      SELECT t.* FROM teams t
      INNER JOIN tournament_registrations tr ON t.id = tr.team_id
      WHERE tr.id = $1
    `, [team1Id]);
    
    console.log(`Team1 query result: ${team1Result.rows.length} rows`);
    if (team1Result.rows.length > 0) {
      console.log('Team1 found:', team1Result.rows[0]);
    }
    
    console.log('Testing team2 lookup...');
    const team2Result = await postgresService.query(`
      SELECT t.* FROM teams t
      INNER JOIN tournament_registrations tr ON t.id = tr.team_id
      WHERE tr.id = $1
    `, [team2Id]);
    
    console.log(`Team2 query result: ${team2Result.rows.length} rows`);
    if (team2Result.rows.length > 0) {
      console.log('Team2 found:', team2Result.rows[0]);
    }
    
    if (team1Result.rows.length > 0 && team2Result.rows.length > 0) {
      console.log('✅ SUCCESS! Both teams found - PostgreSQL type mismatch is fixed!');
    } else {
      console.log('❌ Teams not found - investigating further...');
      
      // Check if the registration IDs exist at all
      const regCheck1 = await postgresService.query(`
        SELECT * FROM tournament_registrations WHERE id = $1
      `, [team1Id]);
      
      const regCheck2 = await postgresService.query(`
        SELECT * FROM tournament_registrations WHERE id = $1
      `, [team2Id]);
      
      console.log(`Registration 1 exists: ${regCheck1.rows.length > 0}`);
      console.log(`Registration 2 exists: ${regCheck2.rows.length > 0}`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ PostgreSQL Error:', error.message);
    
    if (error.message.includes('character varying = uuid')) {
      console.log('🐛 PostgreSQL type mismatch still occurring');
      console.log('The ::uuid casting is not working as expected');
    }
    
    process.exit(1);
  }
}

testDraftQuery();