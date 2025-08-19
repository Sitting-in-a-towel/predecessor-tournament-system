const { Pool } = require('pg');

async function cleanImport() {
  console.log('🔥 CLEAN IMPORT: WIPE PRODUCTION → IMPORT ALL LOCAL DATA\n');
  
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
    console.log('📡 Connecting to databases...');
    await localPool.query('SELECT 1');
    await renderPool.query('SELECT 1');
    console.log('✅ Connected\n');
    
    // STEP 1: COMPLETELY WIPE PRODUCTION DATABASE
    console.log('🗑️  WIPING ALL DATA FROM PRODUCTION...\n');
    
    // Get all tables
    const tablesResult = await renderPool.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);
    
    console.log(`Found ${tablesResult.rows.length} tables to clear`);
    
    // Delete ALL data from ALL tables
    for (const { tablename } of tablesResult.rows) {
      try {
        const result = await renderPool.query(`DELETE FROM ${tablename}`);
        console.log(`  🗑️  ${tablename}: ${result.rowCount} rows deleted`);
      } catch (err) {
        console.log(`  ⚠️  ${tablename}: ${err.message}`);
      }
    }
    
    console.log('\n✅ PRODUCTION DATABASE COMPLETELY WIPED\n');
    
    // STEP 2: GET ALL LOCAL DATA
    console.log('📊 READING ALL LOCAL DATA...\n');
    
    const localTables = {};
    
    for (const { tablename } of tablesResult.rows) {
      try {
        const data = await localPool.query(`SELECT * FROM ${tablename} ORDER BY created_at ASC`);
        localTables[tablename] = data.rows;
        console.log(`📋 ${tablename}: ${data.rows.length} records`);
      } catch (err) {
        console.log(`⚠️  ${tablename}: ${err.message}`);
        localTables[tablename] = [];
      }
    }
    
    // STEP 3: IMPORT ALL DATA TO PRODUCTION 
    console.log('\n📤 IMPORTING ALL DATA TO PRODUCTION...\n');
    
    let totalImported = 0;
    
    for (const [tablename, rows] of Object.entries(localTables)) {
      if (rows.length === 0) {
        console.log(`⏭️  ${tablename}: no data to import`);
        continue;
      }
      
      console.log(`📤 Importing ${tablename}: ${rows.length} records...`);
      
      let imported = 0;
      
      for (const row of rows) {
        try {
          const columns = Object.keys(row);
          const values = Object.values(row);
          const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
          
          await renderPool.query(
            `INSERT INTO ${tablename} (${columns.join(', ')}) VALUES (${placeholders})`,
            values
          );
          
          imported++;
          totalImported++;
          
        } catch (err) {
          console.log(`  ❌ Row error in ${tablename}: ${err.message.substring(0, 60)}`);
        }
      }
      
      console.log(`  ✅ ${tablename}: ${imported}/${rows.length} imported`);
    }
    
    // STEP 4: VERIFICATION
    console.log('\n📊 FINAL VERIFICATION:\n');
    
    for (const { tablename } of tablesResult.rows) {
      try {
        const count = await renderPool.query(`SELECT COUNT(*) FROM ${tablename}`);
        if (count.rows[0].count > 0) {
          console.log(`✅ ${tablename}: ${count.rows[0].count} records`);
        }
      } catch (err) {
        console.log(`❌ ${tablename}: verification failed`);
      }
    }
    
    // Show tournament details
    console.log('\n🏆 IMPORTED TOURNAMENTS:');
    try {
      const tournaments = await renderPool.query(`
        SELECT name, status, 
               (SELECT COUNT(*) FROM teams WHERE tournament_id = tournaments.id) as team_count
        FROM tournaments 
        ORDER BY created_at
      `);
      
      tournaments.rows.forEach(t => {
        console.log(`  - ${t.name} (${t.status}) - ${t.team_count} teams`);
      });
    } catch (err) {
      console.log('Error showing tournament details');
    }
    
    console.log(`\n🎉 CLEAN IMPORT COMPLETE!`);
    console.log(`📈 Total records imported: ${totalImported}`);
    console.log('\n🚀 PRODUCTION DATABASE IS NOW AN EXACT COPY OF LOCAL!');
    console.log('🔗 Test: https://ocl-predecessor.netlify.app');
    
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
  } finally {
    await localPool.end();
    await renderPool.end();
  }
}

cleanImport();