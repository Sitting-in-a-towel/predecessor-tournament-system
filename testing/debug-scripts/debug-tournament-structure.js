const postgresService = require('./services/postgresql');

(async () => {
  try {
    console.log('🔍 Checking tournament table structure...\n');
    
    // Get the specific tournament by ID
    const tournamentByIdResult = await postgresService.query(
      'SELECT id, tournament_id, name FROM tournaments WHERE id = $1', 
      ['4fe28137-a1c3-426e-bfa0-1ae9c54f58a0']
    );
    
    console.log('Query by id (UUID):');
    console.log(tournamentByIdResult.rows);
    
    // Now check what the bracket API is actually looking for
    const tournamentByTournamentIdResult = await postgresService.query(
      'SELECT id, tournament_id, name FROM tournaments WHERE tournament_id = $1', 
      ['4fe28137-a1c3-426e-bfa0-1ae9c54f58a0']
    );
    
    console.log('\nQuery by tournament_id (what the API is doing):');
    console.log(tournamentByTournamentIdResult.rows);
    
    // Check the bracket data
    const bracketResult = await postgresService.query(
      'SELECT tournament_id, is_published, bracket_data FROM tournament_brackets WHERE tournament_id = $1',
      ['4fe28137-a1c3-426e-bfa0-1ae9c54f58a0']
    );
    
    console.log('\nBracket data for this tournament:');
    console.log(bracketResult.rows.length > 0 ? 'Found bracket data' : 'No bracket data');
    if (bracketResult.rows.length > 0) {
      console.log('Published:', bracketResult.rows[0].is_published);
      console.log('Has bracket_data:', !!bracketResult.rows[0].bracket_data);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    process.exit(0);
  }
})();