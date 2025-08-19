const { Pool } = require('pg');

async function matchLocalSchema() {
  console.log('🔧 MATCHING SUPABASE SCHEMA TO LOCAL DATABASE\n');
  
  // Local database config
  const localConfig = {
    host: 'localhost',
    port: 5432,
    database: 'predecessor_tournaments',
    user: 'postgres',
    password: 'Antigravity7@!89',
    connectionTimeoutMillis: 10000,
  };
  
  // Supabase config
  const supabaseConfig = {
    host: 'aws-0-ap-southeast-2.pooler.supabase.com',
    port: 6543,
    database: 'postgres',
    user: 'postgres.gvcxbwwnbkpqllqcvlxl',
    password: 'Antigravity7@!89',
    ssl: { rejectUnauthorized: false, require: true },
    connectionTimeoutMillis: 30000,
  };
  
  const localPool = new Pool(localConfig);
  const supabasePool = new Pool(supabaseConfig);
  
  try {
    console.log('📡 Connecting to both databases...');
    await localPool.query('SELECT 1');
    await supabasePool.query('SELECT 1');
    console.log('✅ Connected to both databases\n');
    
    // Tables to analyze
    const tablesToFix = ['users', 'tournaments', 'teams', 'heroes', 'draft_sessions'];
    
    for (const table of tablesToFix) {
      console.log(`🔍 Analyzing ${table} table...`);
      
      try {
        // Get columns from local database
        const localColumnsQuery = `
          SELECT column_name, data_type, is_nullable, column_default
          FROM information_schema.columns 
          WHERE table_schema = 'public' AND table_name = $1
          ORDER BY ordinal_position
        `;
        const localColumns = await localPool.query(localColumnsQuery, [table]);
        
        // Get columns from Supabase
        const supabaseColumns = await supabasePool.query(localColumnsQuery, [table]);
        
        console.log(`  Local columns: ${localColumns.rows.length}`);
        console.log(`  Supabase columns: ${supabaseColumns.rows.length}`);
        
        // Find missing columns in Supabase
        const localColumnNames = localColumns.rows.map(row => row.column_name);
        const supabaseColumnNames = supabaseColumns.rows.map(row => row.column_name);
        const missingColumns = localColumns.rows.filter(col => 
          !supabaseColumnNames.includes(col.column_name)
        );
        
        if (missingColumns.length > 0) {
          console.log(`  📋 Adding ${missingColumns.length} missing columns:`);
          
          for (const col of missingColumns) {
            const columnName = col.column_name;
            const dataType = col.data_type;
            const nullable = col.is_nullable === 'YES' ? '' : 'NOT NULL';
            const defaultValue = col.column_default ? `DEFAULT ${col.column_default}` : '';
            
            const alterQuery = `ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${columnName} ${dataType} ${nullable} ${defaultValue}`;
            
            try {
              await supabasePool.query(alterQuery);
              console.log(`    ✅ Added ${columnName} (${dataType})`);
            } catch (err) {
              console.log(`    ❌ Failed to add ${columnName}: ${err.message.substring(0, 50)}`);
            }
          }
        } else {
          console.log(`  ✅ No missing columns`);
        }
        
      } catch (err) {
        console.log(`  ❌ Error analyzing ${table}: ${err.message}`);
      }
      
      console.log();
    }
    
    // Add specific missing columns we know about
    console.log('🔧 Adding known missing columns...\n');
    
    const specificFixes = [
      {
        table: 'users',
        columns: [
          'ALTER TABLE users ADD COLUMN IF NOT EXISTS discord_discriminator VARCHAR(10)',
          'ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT',
          'ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name VARCHAR(255)'
        ]
      },
      {
        table: 'teams', 
        columns: [
          'ALTER TABLE teams ADD COLUMN IF NOT EXISTS team_tag VARCHAR(10)',
          'ALTER TABLE teams ADD COLUMN IF NOT EXISTS logo_url TEXT',
          'ALTER TABLE teams ADD COLUMN IF NOT EXISTS description TEXT'
        ]
      },
      {
        table: 'tournaments',
        columns: [
          'ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS bracket_type VARCHAR(50) DEFAULT \'single_elimination\'',
          'ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS entry_fee DECIMAL(10,2) DEFAULT 0',
          'ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS prize_pool DECIMAL(10,2) DEFAULT 0'
        ]
      },
      {
        table: 'heroes',
        columns: [
          'ALTER TABLE heroes ADD COLUMN IF NOT EXISTS image_url TEXT',
          'ALTER TABLE heroes ADD COLUMN IF NOT EXISTS pick_rate DECIMAL(5,4) DEFAULT 0.0000',
          'ALTER TABLE heroes ADD COLUMN IF NOT EXISTS ban_rate DECIMAL(5,4) DEFAULT 0.0000'
        ]
      },
      {
        table: 'draft_sessions',
        columns: [
          'ALTER TABLE draft_sessions ADD COLUMN IF NOT EXISTS draft_id VARCHAR(255) UNIQUE',
          'ALTER TABLE draft_sessions ADD COLUMN IF NOT EXISTS spectator_url TEXT'
        ]
      }
    ];
    
    for (const fix of specificFixes) {
      console.log(`📋 Updating ${fix.table} table...`);
      for (const query of fix.columns) {
        try {
          await supabasePool.query(query);
          const columnName = query.match(/ADD COLUMN IF NOT EXISTS (\w+)/)[1];
          console.log(`  ✅ Added ${columnName}`);
        } catch (err) {
          console.log(`  ⚠️  Query failed: ${err.message.substring(0, 50)}`);
        }
      }
    }
    
    console.log('\n🎉 Schema matching complete!');
    console.log('\n👉 Now run the copy script again - it should work!');
    
  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
  } finally {
    await localPool.end();
    await supabasePool.end();
  }
}

matchLocalSchema();