const postgresService = require('../services/postgresql');

async function runMigration() {
    try {
        console.log('Running Omeda fields migration...');
        
        // Add columns to users table
        await postgresService.query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS omeda_player_id VARCHAR(255),
            ADD COLUMN IF NOT EXISTS omeda_profile_data JSONB,
            ADD COLUMN IF NOT EXISTS omeda_last_sync TIMESTAMP WITH TIME ZONE,
            ADD COLUMN IF NOT EXISTS omeda_sync_enabled BOOLEAN DEFAULT false
        `);
        console.log('✅ Added columns to users table');
        
        // Create index
        await postgresService.query(`
            CREATE INDEX IF NOT EXISTS idx_users_omeda_player_id ON users(omeda_player_id)
        `);
        console.log('✅ Created index on omeda_player_id');
        
        // Create omeda_game_data table
        await postgresService.query(`
            CREATE TABLE IF NOT EXISTS omeda_game_data (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                omeda_match_id VARCHAR(255) NOT NULL,
                match_data JSONB NOT NULL,
                match_date TIMESTAMP WITH TIME ZONE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, omeda_match_id)
            )
        `);
        console.log('✅ Created omeda_game_data table');
        
        // Create indexes
        await postgresService.query(`
            CREATE INDEX IF NOT EXISTS idx_omeda_game_data_user_id ON omeda_game_data(user_id)
        `);
        await postgresService.query(`
            CREATE INDEX IF NOT EXISTS idx_omeda_game_data_match_date ON omeda_game_data(match_date DESC)
        `);
        console.log('✅ Created indexes on omeda_game_data');
        
        console.log('🎉 Migration completed successfully!');
        
    } catch (error) {
        console.error('❌ Migration failed:', error);
    } finally {
        await postgresService.close();
    }
}

runMigration();