const logger = require('./logger');

// Database connection utilities
class DatabaseConnection {
  constructor() {
    this.isConnected = false;
  }

  async connectDatabase() {
    try {
      // For Airtable, we don't need a persistent connection
      // Just verify that our credentials are valid
      await this.verifyAirtableConnection();
      
      this.isConnected = true;
      logger.info('Database connection established (Airtable)');
      return true;
    } catch (error) {
      logger.error('Database connection failed:', error);
      throw error;
    }
  }

  async verifyAirtableConnection() {
    const Airtable = require('airtable');
    
    // Check required environment variables
    if (!process.env.AIRTABLE_PERSONAL_TOKEN) {
      throw new Error('AIRTABLE_PERSONAL_TOKEN is required');
    }
    
    if (!process.env.AIRTABLE_BASE_ID) {
      throw new Error('AIRTABLE_BASE_ID is required');
    }

    // Configure Airtable
    Airtable.configure({
      endpointUrl: 'https://api.airtable.com',
      apiKey: process.env.AIRTABLE_PERSONAL_TOKEN
    });

    const base = Airtable.base(process.env.AIRTABLE_BASE_ID);
    
    try {
      // Simple connection test - just try to access Users table
      await base('Users').select({ maxRecords: 1 }).firstPage();
      logger.info('✅ Airtable connection verified successfully');
    } catch (error) {
      if (error.statusCode === 401) {
        throw new Error('Invalid Airtable credentials - check your personal access token');
      } else if (error.statusCode === 403) {
        throw new Error('Airtable access denied - token needs more permissions');
      } else if (error.statusCode === 404) {
        throw new Error('Users table not found - please create tables manually first');
      } else {
        throw new Error(`Airtable connection error: ${error.message}`);
      }
    }
  }

  async disconnect() {
    // Airtable doesn't require explicit disconnection
    this.isConnected = false;
    logger.info('Database disconnected');
  }

  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      type: 'Airtable',
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