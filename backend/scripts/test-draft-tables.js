const postgresService = require('../services/postgresql');

async function testDraftTables() {
  try {
    console.log('🔄 Testing draft tables creation step by step...');
    
    // Step 1: Create draft_sessions table
    console.log('1. Creating draft_sessions table...');
    await postgresService.query(`
      CREATE TABLE IF NOT EXISTS draft_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
        match_id VARCHAR(255),
        team1_id UUID REFERENCES teams(id) ON DELETE CASCADE,
        team2_id UUID REFERENCES teams(id) ON DELETE CASCADE,
        team1_captain_id UUID REFERENCES users(id) ON DELETE SET NULL,
        team2_captain_id UUID REFERENCES users(id) ON DELETE SET NULL,
        draft_configuration JSONB DEFAULT '{"timer_enabled": true}'::jsonb,
        session_state JSONB DEFAULT '{"current_phase": "waiting"}'::jsonb,
        coin_toss_result JSONB DEFAULT NULL,
        draft_result JSONB DEFAULT '{"completed": false}'::jsonb,
        match_code VARCHAR(50) DEFAULT NULL,
        status VARCHAR(50) DEFAULT 'waiting',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        started_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
        completed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
      )
    `);
    console.log('✓ draft_sessions created');
    
    // Step 2: Create draft_participants table
    console.log('2. Creating draft_participants table...');
    await postgresService.query(`
      CREATE TABLE IF NOT EXISTS draft_participants (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id UUID REFERENCES draft_sessions(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        team_number INTEGER NOT NULL CHECK (team_number IN (1, 2)),
        is_present BOOLEAN DEFAULT false,
        joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        socket_id VARCHAR(255) DEFAULT NULL,
        UNIQUE(session_id, user_id)
      )
    `);
    console.log('✓ draft_participants created');
    
    // Step 3: Create draft_actions table
    console.log('3. Creating draft_actions table...');
    await postgresService.query(`
      CREATE TABLE IF NOT EXISTS draft_actions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id UUID REFERENCES draft_sessions(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        action_type VARCHAR(50) NOT NULL,
        action_data JSONB DEFAULT '{}',
        phase VARCHAR(50) DEFAULT NULL,
        team_number INTEGER DEFAULT NULL,
        hero_id VARCHAR(100) DEFAULT NULL,
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        timer_remaining INTEGER DEFAULT NULL,
        success BOOLEAN DEFAULT true,
        error_message TEXT DEFAULT NULL
      )
    `);
    console.log('✓ draft_actions created');
    
    // Step 4: Create indexes
    console.log('4. Creating indexes...');
    await postgresService.query('CREATE INDEX IF NOT EXISTS idx_draft_sessions_tournament ON draft_sessions(tournament_id)');
    await postgresService.query('CREATE INDEX IF NOT EXISTS idx_draft_sessions_status ON draft_sessions(status)');
    await postgresService.query('CREATE INDEX IF NOT EXISTS idx_draft_participants_session ON draft_participants(session_id)');
    await postgresService.query('CREATE INDEX IF NOT EXISTS idx_draft_actions_session ON draft_actions(session_id)');
    console.log('✓ indexes created');
    
    // Step 5: Test hero data exists
    console.log('5. Checking heroes data...');
    const heroCount = await postgresService.query('SELECT COUNT(*) FROM heroes WHERE is_active = true');
    console.log(`✓ Heroes available: ${heroCount.rows[0].count}`);
    
    // Step 6: Verify tables
    const tables = await postgresService.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('draft_sessions', 'draft_participants', 'draft_actions')
      ORDER BY table_name
    `);
    
    console.log('📋 Draft tables created:');
    tables.rows.forEach(row => {
      console.log(`  ✓ ${row.table_name}`);
    });
    
    console.log('🎉 Draft system database setup completed successfully!');
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    console.error('Details:', error);
    process.exit(1);
  }
}

testDraftTables()
  .then(() => {
    console.log('Setup script completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('Setup script failed:', error);
    process.exit(1);
  });