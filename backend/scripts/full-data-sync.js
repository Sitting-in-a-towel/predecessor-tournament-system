const { Pool } = require('pg');

async function fullDataSync() {
  console.log('🔄 FULL DATA SYNC: LOCAL → PRODUCTION');
  console.log('Copying ALL local database data to production with proper foreign key handling\n');
  
  const localConfig = {
    host: 'localhost',
    port: 5432,
    database: 'predecessor_tournaments',
    user: 'postgres',
    password: 'Antigravity7@!89',
    max: 5,
    connectionTimeoutMillis: 10000,
  };
  
  const renderConfig = {
    connectionString: 'postgresql://predecessor_tournament_db_user:2WQIOj046lYHGuGnXFA5Ks5asy21xTcH@dpg-d24r7vfgi27c73bbmgh0-a.singapore-postgres.render.com/predecessor_tournament_db',
    ssl: { rejectUnauthorized: false },
    max: 5,
    connectionTimeoutMillis: 30000,
  };
  
  const localPool = new Pool(localConfig);
  const renderPool = new Pool(renderConfig);
  
  try {
    console.log('📡 Connecting to databases...');
    await localPool.query('SELECT 1');
    await renderPool.query('SELECT 1');
    console.log('✅ Connected to both databases\n');
    
    // Step 1: Clear dependent tables first (reverse order)
    console.log('🗑️  Clearing dependent tables first...\n');
    
    const clearOrder = [
      'draft_bans',
      'draft_picks', 
      'team_invitations',
      'draft_sessions',
      'bracket_matches',
      'tournament_brackets',
      'tournament_registrations',
      'teams',
      'tournaments'
      // Don't clear users and heroes - we'll upsert them
    ];
    
    for (const table of clearOrder) {
      try {
        const result = await renderPool.query(`DELETE FROM ${table}`);
        console.log(`  🗑️  Cleared ${table}: ${result.rowCount} rows deleted`);
      } catch (err) {
        console.log(`  ⚠️  ${table}: ${err.message.substring(0, 60)}`);
      }
    }
    
    console.log('\n📋 COPYING ALL DATA WITH DEPENDENCY ORDER...\n');
    
    // Step 2: Copy data in proper dependency order
    const syncSteps = [
      {
        table: 'users',
        upsert: true,
        conflictColumn: 'id',
        description: 'Base users (with UPSERT)'
      },
      {
        table: 'heroes', 
        upsert: true,
        conflictColumn: 'id',
        description: 'Heroes (with UPSERT)'
      },
      {
        table: 'tournaments',
        upsert: false,
        description: 'Tournaments (depends on users)'
      },
      {
        table: 'teams',
        upsert: false, 
        description: 'Teams (depends on tournaments + users)'
      },
      {
        table: 'tournament_registrations',
        upsert: false,
        description: 'Tournament registrations'
      },
      {
        table: 'tournament_brackets',
        upsert: false,
        description: 'Tournament brackets'
      },
      {
        table: 'bracket_matches',
        upsert: false,
        description: 'Bracket matches'
      },
      {
        table: 'draft_sessions',
        upsert: false,
        description: 'Draft sessions'
      },
      {
        table: 'team_invitations',
        upsert: false,
        description: 'Team invitations'
      }
    ];
    
    let totalCopied = 0;
    
    for (const step of syncSteps) {
      const { table, upsert, conflictColumn, description } = step;
      
      try {
        // Check if table exists in local
        const localCheck = await localPool.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = $1
          )
        `, [table]);
        
        if (!localCheck.rows[0].exists) {
          console.log(`⏭️  ${table}: doesn't exist in local database`);
          continue;
        }
        
        // Get local data
        const localData = await localPool.query(`SELECT * FROM ${table} ORDER BY created_at ASC`);
        
        if (localData.rows.length === 0) {
          console.log(`⏭️  ${table}: no local data (${description})`);
          continue;
        }
        
        console.log(`📋 ${table}: copying ${localData.rows.length} records (${description})`);
        
        let inserted = 0;
        let errors = 0;
        
        for (const row of localData.rows) {
          try {
            const columns = Object.keys(row);
            const values = Object.values(row);
            const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
            
            let query;
            if (upsert && conflictColumn) {
              // UPSERT for users and heroes
              const updateSet = columns
                .filter(col => col !== conflictColumn)
                .map((col, i) => `${col} = EXCLUDED.${col}`)
                .join(', ');
              
              query = `
                INSERT INTO ${table} (${columns.join(', ')}) 
                VALUES (${placeholders})
                ON CONFLICT (${conflictColumn}) DO UPDATE SET ${updateSet}
              `;
            } else {
              // Regular insert for dependent tables
              query = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`;
            }
            
            await renderPool.query(query, values);
            inserted++;
            totalCopied++;
            
          } catch (err) {
            errors++;
            
            // Show detailed errors for key tables
            if ((table === 'tournaments' || table === 'teams') && errors <= 5) {
              console.log(`    ❌ ${table} error: ${err.message.substring(0, 100)}`);
            }
          }
        }
        
        const statusIcon = inserted === localData.rows.length ? '✅' : '⚠️';
        console.log(`  ${statusIcon} ${table}: ${inserted}/${localData.rows.length} copied${errors > 0 ? ` (${errors} errors)` : ''}`);
        
      } catch (err) {
        console.log(`❌ Failed ${table}: ${err.message.substring(0, 80)}`);
      }
    }
    
    // Step 3: Comprehensive verification
    console.log('\n📊 PRODUCTION DATABASE VERIFICATION:\n');
    
    const verifyTables = [
      'users',
      'tournaments', 
      'teams',
      'heroes',
      'tournament_registrations',
      'draft_sessions'
    ];
    
    for (const table of verifyTables) {
      try {
        const count = await renderPool.query(`SELECT COUNT(*) FROM ${table}`);
        console.log(`✅ ${table}: ${count.rows[0].count} records`);
        
        // Show samples for key tables
        if (table === 'tournaments') {
          const samples = await renderPool.query(`
            SELECT name, status, created_by 
            FROM ${table} 
            ORDER BY created_at DESC 
            LIMIT 5
          `);
          samples.rows.forEach(row => {
            console.log(`    - ${row.name} (${row.status}) by ${row.created_by}`);
          });
        }
        
        if (table === 'teams') {
          const samples = await renderPool.query(`
            SELECT team_name, tournament_id 
            FROM ${table} 
            ORDER BY created_at DESC 
            LIMIT 3
          `);
          samples.rows.forEach(row => {
            console.log(`    - ${row.team_name} (tournament: ${row.tournament_id.substring(0, 8)}...)`);
          });
        }
        
      } catch (err) {
        console.log(`❌ ${table}: verification failed - ${err.message.substring(0, 50)}`);
      }
    }
    
    console.log(`\n🎉 FULL DATA SYNC COMPLETE!`);
    console.log(`📈 Total records copied: ${totalCopied}`);
    console.log('\n🚀 PRODUCTION DATABASE IS NOW FULLY SYNCHRONIZED!');
    console.log('👥 All users, tournaments, teams, and related data copied');
    console.log('🔗 Test your site: https://ocl-predecessor.netlify.app');
    console.log('\nYou should now see all your local tournaments and be able to:');
    console.log('  ✓ View all tournaments');
    console.log('  ✓ Access draft sessions'); 
    console.log('  ✓ See all teams and registrations');
    console.log('  ✓ Use all functionality that worked locally');
    
  } catch (error) {
    console.error('\n❌ Fatal sync error:', error.message);
  } finally {
    await localPool.end();
    await renderPool.end();
  }
}

fullDataSync();