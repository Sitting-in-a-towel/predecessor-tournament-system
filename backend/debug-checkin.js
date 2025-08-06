const postgresService = require('./services/postgresql');

async function debugCheckIn() {
  try {
    console.log('Checking tournaments table...');
    const tournaments = await postgresService.query(
      'SELECT id, tournament_id, name FROM tournaments WHERE tournament_id = $1',
      ['836ac9f9-a145-4393-adf0-1e8b3b4a35d4']
    );
    
    console.log('Tournament found:', tournaments.rows.length);
    tournaments.rows.forEach(t => {
      console.log('- ID:', t.id, 'Tournament ID:', t.tournament_id, 'Name:', t.name);
    });
    
    if (tournaments.rows.length > 0) {
      const tournamentPK = tournaments.rows[0].id;
      console.log('\nChecking registrations for tournament PK:', tournamentPK);
      
      const regs = await postgresService.query(
        'SELECT * FROM tournament_registrations WHERE tournament_id = $1',
        [tournamentPK]
      );
      
      console.log('Registrations found:', regs.rows.length);
      regs.rows.forEach(reg => {
        console.log('- Team:', reg.team_id, 'Checked in:', reg.checked_in, 'Status:', reg.status);
      });
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  }
  process.exit(0);
}

debugCheckIn();