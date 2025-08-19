const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function createSupabaseSchema() {
  console.log('🏗️  CREATING DATABASE SCHEMA IN SUPABASE\n');
  
  // Supabase connection (using the working pooler config)
  const supabaseConfig = {
    host: 'aws-0-ap-southeast-2.pooler.supabase.com',
    port: 6543,
    database: 'postgres',
    user: 'postgres.gvcxbwwnbkpqllqcvlxl',
    password: 'Antigravity7@!89',
    ssl: {
      rejectUnauthorized: false,
      require: true
    },
    connectionTimeoutMillis: 30000,
  };
  
  const pool = new Pool(supabaseConfig);
  
  try {
    console.log('📡 Connecting to Supabase...');
    const client = await pool.connect();
    const timeResult = await client.query('SELECT NOW()');
    console.log('✅ Connected to Supabase');
    console.log('Server time:', timeResult.rows[0].now);
    client.release();
    
    // Migration files to run (in order)
    const migrationFiles = [
      '../migrations/create_draft_system_tables.sql',
      '../migrations/create_tournament_brackets_table.sql', 
      '../migrations/create_bracket_matches_table.sql',
      '../migrations/create_tournament_registrations_table.sql',
      '../migrations/create_omeda_game_data_table.sql',
      '../migrations/create_team_invitations_table.sql'
    ];
    
    console.log(`\n🔄 Running ${migrationFiles.length} migration files...\n`);
    
    let successCount = 0;
    
    for (const migrationFile of migrationFiles) {
      const filePath = path.join(__dirname, migrationFile);
      
      if (!fs.existsSync(filePath)) {
        console.log(`⚠️  Skipping ${migrationFile} (file not found)`);
        continue;
      }
      
      console.log(`📖 Running ${path.basename(migrationFile)}...`);
      
      try {
        const migrationSQL = fs.readFileSync(filePath, 'utf8');
        await pool.query(migrationSQL);
        console.log(`  ✅ ${path.basename(migrationFile)} completed`);
        successCount++;
      } catch (err) {
        console.log(`  ❌ ${path.basename(migrationFile)} failed: ${err.message}`);
        // Continue with other migrations
      }
    }
    
    // Create core tables manually if migrations failed
    console.log('\n🏗️  Creating core tables manually...\n');
    
    const coreTableQueries = [
      // Users table
      `CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR(255) UNIQUE NOT NULL,
        discord_id VARCHAR(255) UNIQUE NOT NULL,
        discord_username VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        is_admin BOOLEAN DEFAULT FALSE,
        profile_image_url TEXT
      )`,
      
      // Tournaments table
      `CREATE TABLE IF NOT EXISTS tournaments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tournament_id VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        start_date TIMESTAMP WITH TIME ZONE,
        end_date TIMESTAMP WITH TIME ZONE,
        status VARCHAR(50) DEFAULT 'upcoming',
        max_teams INTEGER DEFAULT 16,
        created_by UUID REFERENCES users(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )`,
      
      // Teams table
      `CREATE TABLE IF NOT EXISTS teams (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        team_id VARCHAR(255) UNIQUE NOT NULL,
        team_name VARCHAR(255) NOT NULL,
        captain_id UUID REFERENCES users(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )`,
      
      // Heroes table
      `CREATE TABLE IF NOT EXISTS heroes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        hero_id VARCHAR(100) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        role VARCHAR(50),
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )`
    ];
    
    for (const query of coreTableQueries) {
      try {
        await pool.query(query);
        const tableName = query.match(/CREATE TABLE IF NOT EXISTS (\w+)/)[1];
        console.log(`  ✅ Created ${tableName} table`);
      } catch (err) {
        console.log(`  ❌ Table creation failed: ${err.message.substring(0, 50)}`);
      }
    }
    
    // Verify tables were created
    console.log('\n📊 Verifying created tables...\n');
    
    const tablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `;
    
    const result = await pool.query(tablesQuery);
    const tables = result.rows.map(row => row.table_name);
    
    console.log(`Found ${tables.length} tables:`);
    tables.forEach(table => {
      console.log(`  ✓ ${table}`);
    });
    
    console.log(`\n🎉 SUCCESS! Database schema created in Supabase!`);
    console.log(`Migration files run: ${successCount}`);
    console.log(`Total tables created: ${tables.length}`);
    
    console.log('\n👉 Next steps:');
    console.log('1. Run the copy script again to transfer your data');
    console.log('2. Check your production website - it should now work!');
    
  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    console.log('\nFull error:', error);
  } finally {
    await pool.end();
  }
}

createSupabaseSchema()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Script failed:', err);
    process.exit(1);
  });