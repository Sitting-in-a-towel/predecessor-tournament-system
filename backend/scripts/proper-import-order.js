const { Pool } = require('pg');

async function properImportOrder() {
  console.log('📋 PROPER IMPORT ORDER: Users → Tournaments → Teams → Everything Else\n');
  
  const localConfig = {
    host: 'localhost',
    port: 5432,
    database: 'predecessor_tournaments',
    user: 'postgres',
    password: 'Antigravity7@!89'
  };
  
  const renderConfig = {
    connectionString: 'postgresql://predecessor_tournament_db_user:2WQIOj046lYHGuGnXFA5Ks5asy21xTcH@dpg-d24r7vfgi27c73bbmgh0-a.singapore-postgres.render.com/predecessor_tournament_db',
    ssl: { rejectUnauthorized: false }
  };
  
  const localPool = new Pool(localConfig);
  const renderPool = new Pool(renderConfig);
  
  try {
    console.log('📡 Connecting...');
    await localPool.query('SELECT 1');
    await renderPool.query('SELECT 1');
    console.log('✅ Connected\n');
    
    // Import in proper dependency order
    const importOrder = [
      'users',
      'heroes', 
      'tournaments',
      'teams',
      'tournament_brackets',
      'bracket_matches',
      'draft_sessions',
      'team_invitations',
      'matches'
    ];
    
    let totalImported = 0;
    
    for (const table of importOrder) {
      try {
        console.log(`📤 Importing ${table}...`);
        
        const localData = await localPool.query(`SELECT * FROM ${table} ORDER BY created_at ASC`);
        
        if (localData.rows.length === 0) {
          console.log(`  ⏭️  No data in local ${table}`);
          continue;
        }
        
        console.log(`  📊 Found ${localData.rows.length} records in local ${table}`);
        
        let imported = 0;
        let errors = 0;
        
        for (const row of localData.rows) {
          try {
            const columns = Object.keys(row);
            const values = Object.values(row);
            const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
            
            await renderPool.query(
              `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`,
              values
            );
            
            imported++;
            totalImported++;
            
          } catch (err) {
            errors++;
            if (errors <= 3) {
              console.log(`    ❌ Error: ${err.message.substring(0, 80)}`);
            }
          }
        }
        
        const status = imported === localData.rows.length ? '✅' : '⚠️';
        console.log(`  ${status} ${table}: ${imported}/${localData.rows.length} imported${errors > 0 ? ` (${errors} errors)` : ''}\n`);
        
      } catch (err) {
        console.log(`  ❌ Failed to import ${table}: ${err.message.substring(0, 100)}\n`);
      }
    }
    
    // Verification with details
    console.log('📊 FINAL VERIFICATION WITH DETAILS:\n');
    
    // Check users
    const userCount = await renderPool.query('SELECT COUNT(*) FROM users');
    console.log(`✅ Users: ${userCount.rows[0].count}`);
    
    // Check tournaments with team counts
    const tournaments = await renderPool.query(`
      SELECT t.name, t.status,
             (SELECT COUNT(*) FROM teams WHERE tournament_id = t.id) as team_count
      FROM tournaments t
      ORDER BY t.created_at
    `);
    
    console.log(`✅ Tournaments: ${tournaments.rows.length}`);
    tournaments.rows.forEach(t => {
      console.log(`  - ${t.name} (${t.status}) - ${t.team_count} teams`);
    });
    
    // Check teams by tournament
    const teamsCount = await renderPool.query('SELECT COUNT(*) FROM teams');
    console.log(`\n✅ Total Teams: ${teamsCount.rows[0].count}`);
    
    if (teamsCount.rows[0].count > 0) {
      const teamsByTournament = await renderPool.query(`
        SELECT t.name as tournament, COUNT(teams.*) as team_count
        FROM tournaments t
        LEFT JOIN teams ON teams.tournament_id = t.id
        GROUP BY t.id, t.name
        ORDER BY team_count DESC
      `);
      
      console.log('Teams by tournament:');
      teamsByTournament.rows.forEach(row => {
        console.log(`  - ${row.tournament}: ${row.team_count} teams`);
      });
    }
    
    console.log(`\n🎉 PROPER IMPORT COMPLETE!`);
    console.log(`📈 Total records imported: ${totalImported}`);
    console.log('\n🔗 Test: https://ocl-predecessor.netlify.app');
    console.log('All tournaments should now have their associated teams and data!');
    
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
  } finally {
    await localPool.end();
    await renderPool.end();
  }
}

properImportOrder();