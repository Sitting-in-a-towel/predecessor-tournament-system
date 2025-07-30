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