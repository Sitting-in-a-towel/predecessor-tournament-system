const { Pool } = require('pg');

async function copyExistingTournament() {
  console.log('🎯 COPYING EXISTING TOURNAMENT STRUCTURE FOR NEW TEST');
  
  const pool = new Pool({
    connectionString: 'postgresql://predecessor_tournament_db_user:2WQIOj046lYHGuGnXFA5Ks5asy21xTcH@dpg-d24r7vfgi27c73bbmgh0-a.singapore-postgres.render.com/predecessor_tournament_db',
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    // Get existing tournament structure
    const existing = await pool.query(`SELECT * FROM tournaments LIMIT 1`);
    
    if (existing.rows.length === 0) {
      console.log('❌ No existing tournaments found');
      return;
    }
    
    const template = existing.rows[0];
    console.log(`✅ Using template: ${template.name}`);
    
    // Get user for new tournament
    const userResult = await pool.query(`SELECT id, discord_username FROM users LIMIT 1`);
    const user = userResult.rows[0];
    
    // Create new tournament with same structure
    const timestamp = Date.now();
    const newTournament = { ...template };
    delete newTournament.id;
    delete newTournament.created_at;
    delete newTournament.updated_at;
    
    newTournament.tournament_id = `test-${timestamp}`;
    newTournament.name = `Test Tournament ${timestamp}`;
    newTournament.description = 'Test tournament for production testing';
    newTournament.created_by = user.id;
    
    const columns = Object.keys(newTournament);
    const values = Object.values(newTournament);
    const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
    
    const result = await pool.query(`
      INSERT INTO tournaments (${columns.join(', ')}, created_at, updated_at)
      VALUES (${placeholders}, NOW(), NOW())
      RETURNING id, name
    `, values);
    
    console.log(`✅ Created tournament: ${result.rows[0].name}`);
    
    // Create test teams for this tournament
    const tournamentId = result.rows[0].id;
    
    for (let i = 1; i <= 4; i++) {
      try {
        await pool.query(`
          INSERT INTO teams (team_id, team_name, team_tag, tournament_id, captain_id, confirmed, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
        `, [
          `test-team-${timestamp}-${i}`,
          `Test Team ${i}`,
          `T${i}`,
          tournamentId,
          user.id,
          true
        ]);
        console.log(`✅ Created team: Test Team ${i}`);
      } catch (err) {
        console.log(`⚠️ Team ${i} error: ${err.message.substring(0, 50)}`);
      }
    }
    
    // Final status
    const counts = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM tournaments) as tournaments,
        (SELECT COUNT(*) FROM teams) as teams,
        (SELECT COUNT(*) FROM users) as users
    `);
    
    const c = counts.rows[0];
    console.log(`\n📊 PRODUCTION DATABASE STATE:`);
    console.log(`   - Tournaments: ${c.tournaments}`);
    console.log(`   - Teams: ${c.teams}`);
    console.log(`   - Users: ${c.users}`);
    
    console.log('\n🎉 TEST DATA READY!');
    console.log('🔗 Test: https://ocl-predecessor.netlify.app');
    
  } catch (err) {
    console.log('❌ Error:', err.message);
  } finally {
    await pool.end();
  }
}

copyExistingTournament();