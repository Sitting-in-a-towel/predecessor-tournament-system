const postgresService = require('./services/postgresql');
const fs = require('fs');
const path = require('path');

async function createDraftTables() {
  try {
    console.log('🚀 Creating draft system tables...\n');

    // Check if draft_sessions already exists and has different structure
    const existingTables = await postgresService.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('draft_sessions', 'heroes', 'draft_spectators')"
    );
    const existingTableNames = existingTables.rows.map(row => row.table_name);
    
    // Create heroes table
    const createHeroesTable = `
      CREATE TABLE IF NOT EXISTS heroes (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        role VARCHAR(50) NOT NULL,
        image_url TEXT,
        abilities JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Create draft_spectators table (compatible with existing draft_sessions)
    const createDraftSpectatorsTable = `
      CREATE TABLE IF NOT EXISTS draft_spectators (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        draft_session_id UUID NOT NULL REFERENCES draft_sessions(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(draft_session_id, user_id)
      );
    `;

    console.log('📋 Creating tables...');
    
    await postgresService.query(createHeroesTable);
    console.log('✅ Created/verified heroes table');
    
    // Note: draft_sessions already exists with different structure, skip creation
    if (existingTableNames.includes('draft_sessions')) {
      console.log('ℹ️  Draft_sessions table already exists with different structure, skipping creation');
    }
    
    await postgresService.query(createDraftSpectatorsTable);
    console.log('✅ Created/verified draft_spectators table');

    // Create indexes
    console.log('\n🔗 Creating indexes...');
    
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_heroes_role ON heroes(role);',
      'CREATE INDEX IF NOT EXISTS idx_draft_sessions_status ON draft_sessions(status);',
      'CREATE INDEX IF NOT EXISTS idx_draft_spectators_session ON draft_spectators(draft_session_id);',
      'CREATE INDEX IF NOT EXISTS idx_draft_spectators_user ON draft_spectators(user_id);'
    ];

    for (const index of indexes) {
      await postgresService.query(index);
    }
    console.log('✅ Created all indexes');

    // Insert sample heroes
    console.log('\n🦸 Adding sample heroes...');
    
    const heroes = [
      { name: 'Revenant', role: 'Carry' },
      { name: 'Twinblast', role: 'Carry' },
      { name: 'Wraith', role: 'Carry' },
      { name: 'Murdock', role: 'Carry' },
      { name: 'Sparrow', role: 'Carry' },
      
      { name: 'Khaimera', role: 'Jungle' },
      { name: 'Grux', role: 'Jungle' },
      { name: 'Feng Mao', role: 'Jungle' },
      { name: 'Crunch', role: 'Jungle' },
      { name: 'Kallari', role: 'Jungle' },
      
      { name: 'Gadget', role: 'Mid' },
      { name: 'Gideon', role: 'Mid' },
      { name: 'Howitzer', role: 'Mid' },
      { name: 'The Fey', role: 'Mid' },
      { name: 'Belica', role: 'Mid' },
      
      { name: 'Muriel', role: 'Support' },
      { name: 'Dekker', role: 'Support' },
      { name: 'Narbash', role: 'Support' },
      { name: 'Phase', role: 'Support' },
      { name: 'Riktor', role: 'Support' },
      
      { name: 'Steel', role: 'Offlane' },
      { name: 'Rampage', role: 'Offlane' },
      { name: 'Sevarog', role: 'Offlane' },
      { name: 'Kwang', role: 'Offlane' },
      { name: 'Aurora', role: 'Offlane' }
    ];

    for (const hero of heroes) {
      try {
        await postgresService.query(
          'INSERT INTO heroes (name, role) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING',
          [hero.name, hero.role]
        );
      } catch (error) {
        // Skip if already exists
      }
    }
    
    console.log(`✅ Added ${heroes.length} heroes`);
    console.log('\n🎉 Draft system tables created successfully!');
    
  } catch (error) {
    console.error('❌ Error creating draft tables:', error);
    process.exit(1);
  }
}

createDraftTables();