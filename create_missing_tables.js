const { Pool } = require('pg');

// Database configuration - using production database
const pool = new Pool({
  connectionString: 'postgresql://predecessor_tournament_db_user:2WQIOj046lYHGuGnXFA5Ks5asy21xTcH@dpg-d24r7vfgi27c73bbmgh0-a.oregon-postgres.render.com/predecessor_tournament_db',
  ssl: {
    rejectUnauthorized: false
  }
});

async function createMissingTables() {
  const client = await pool.connect();
  
  try {
    console.log('Connected to database');
    
    // Create draft_picks table
    const createDraftPicksTable = `
      CREATE TABLE IF NOT EXISTS draft_picks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        draft_session_id UUID REFERENCES draft_sessions(id) ON DELETE CASCADE,
        team VARCHAR(50) NOT NULL,
        hero_id VARCHAR(100) NOT NULL,
        hero_name VARCHAR(100),
        pick_number INTEGER NOT NULL,
        player_name VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;
    
    // Create draft_bans table
    const createDraftBansTable = `
      CREATE TABLE IF NOT EXISTS draft_bans (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        draft_session_id UUID REFERENCES draft_sessions(id) ON DELETE CASCADE,
        team VARCHAR(50) NOT NULL,
        hero_id VARCHAR(100) NOT NULL,
        hero_name VARCHAR(100),
        ban_number INTEGER NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;
    
    console.log('Creating draft_picks table...');
    await client.query(createDraftPicksTable);
    console.log('✅ draft_picks table created successfully');
    
    console.log('Creating draft_bans table...');
    await client.query(createDraftBansTable);
    console.log('✅ draft_bans table created successfully');
    
    // Create indexes
    console.log('Creating indexes...');
    await client.query('CREATE INDEX IF NOT EXISTS idx_draft_picks_session_id ON draft_picks(draft_session_id);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_draft_bans_session_id ON draft_bans(draft_session_id);');
    console.log('✅ Indexes created successfully');
    
    console.log('🎉 All tables created successfully!');
    
  } catch (error) {
    console.error('Error creating tables:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

createMissingTables();