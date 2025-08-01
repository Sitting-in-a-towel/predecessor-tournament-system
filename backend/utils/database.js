const logger = require('./logger');

// Database connection utilities
class DatabaseConnection {
  constructor() {
    this.isConnected = false;
  }

  async connectDatabase() {
    try {
      // Verify PostgreSQL connection
      await this.verifyPostgreSQLConnection();
      
      // Run migrations
      await this.runMigrations();
      
      this.isConnected = true;
      logger.info('Database connection established (PostgreSQL)');
      return true;
    } catch (error) {
      logger.error('Database connection failed:', error);
      throw error;
    }
  }

  async verifyPostgreSQLConnection() {
    const postgresService = require('../services/postgresql');
    
    try {
      // Test the PostgreSQL connection
      await postgresService.testConnection();
      logger.info('✅ PostgreSQL connection verified successfully');
    } catch (error) {
      throw new Error(`PostgreSQL connection error: ${error.message}`);
    }
  }

  async runMigrations() {
    const postgresService = require('../services/postgresql');
    
    try {
      // Check if omeda_player_id column exists
      const checkColumn = await postgresService.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'omeda_player_id'
      `);
      
      if (checkColumn.rows.length === 0) {
        logger.info('Running Omeda.city database migration...');
        
        // Add Omeda.city fields to users table
        await postgresService.query(`
          ALTER TABLE users 
          ADD COLUMN IF NOT EXISTS omeda_player_id VARCHAR(255),
          ADD COLUMN IF NOT EXISTS omeda_profile_data JSONB,
          ADD COLUMN IF NOT EXISTS omeda_last_sync TIMESTAMP WITH TIME ZONE,
          ADD COLUMN IF NOT EXISTS omeda_sync_enabled BOOLEAN DEFAULT false
        `);
        
        // Create index
        await postgresService.query(`
          CREATE INDEX IF NOT EXISTS idx_users_omeda_player_id ON users(omeda_player_id)
        `);
        
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
        
        // Create indexes
        await postgresService.query(`
          CREATE INDEX IF NOT EXISTS idx_omeda_game_data_user_id ON omeda_game_data(user_id)
        `);
        await postgresService.query(`
          CREATE INDEX IF NOT EXISTS idx_omeda_game_data_match_date ON omeda_game_data(match_date DESC)
        `);
        
        logger.info('✅ Omeda.city database migration completed successfully');
      } else {
        logger.info('Omeda.city database fields already exist, skipping migration');
      }
    } catch (error) {
      logger.error('Failed to run Omeda.city migration:', error);
      // Don't throw error to prevent server startup failure
    }
  }

  async disconnect() {
    // PostgreSQL pool handles disconnection automatically
    this.isConnected = false;
    logger.info('Database disconnected');
  }

  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      type: 'PostgreSQL',
      timestamp: new Date().toISOString()
    };
  }
}

const dbConnection = new DatabaseConnection();

module.exports = {
  connectDatabase: () => dbConnection.connectDatabase(),
  disconnect: () => dbConnection.disconnect(),
  getConnectionStatus: () => dbConnection.getConnectionStatus()
};