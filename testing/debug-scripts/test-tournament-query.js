const postgres = require('./services/postgresql');

async function testTournamentQuery() {
  try {
    const tournamentId = '67e81a0d-1165-4481-ad58-85da372f86d5';
    
    console.log('🧪 Testing tournament query fix...');
    console.log('Tournament ID:', tournamentId);
    
    const query = `SELECT * FROM tournaments WHERE id::text = $1 OR tournament_id::text = $1`;
    console.log('Query:', query);
    
    const result = await postgres.query(query, [tournamentId]);
    
    console.log('✅ Query successful!');
    console.log('Tournaments found:', result.rows.length);
    
    if (result.rows.length > 0) {
      const tournament = result.rows[0];
      console.log('Tournament details:');
      console.log('  Name:', tournament.name);
      console.log('  ID (UUID):', tournament.id);
      console.log('  Tournament ID (UUID):', tournament.tournament_id);
    }
    
    process.exit(0);
    
  } catch (error) {
    console.log('❌ Query failed:');
    console.log('Error message:', error.message);
    console.log('Error code:', error.code);
    console.log('Position:', error.position);
    
    process.exit(1);
  }
}

testTournamentQuery();