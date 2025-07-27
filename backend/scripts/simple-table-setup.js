const axios = require('axios');
require('dotenv').config();

const AIRTABLE_META_API = 'https://api.airtable.com/v0/meta';

class SimpleTableSetup {
  constructor() {
    this.personalToken = process.env.AIRTABLE_PERSONAL_TOKEN;
    this.baseId = process.env.AIRTABLE_BASE_ID;
    
    if (!this.personalToken) {
      throw new Error('AIRTABLE_PERSONAL_TOKEN is required in .env file');
    }
    
    if (!this.baseId) {
      throw new Error('AIRTABLE_BASE_ID is required in .env file');
    }
    
    this.headers = {
      'Authorization': `Bearer ${this.personalToken}`,
      'Content-Type': 'application/json'
    };
  }

  async createTables() {
    try {
      console.log(`Setting up tables in existing base: ${this.baseId}...`);
      
      // Step 1: Create basic tables first
      const basicTables = [
        {
          name: 'Users',
          fields: [
            { name: 'UserID', type: 'singleLineText' },
            { name: 'DiscordID', type: 'singleLineText' },
            { name: 'DiscordUsername', type: 'singleLineText' },
            { name: 'Email', type: 'email' },
            { name: 'IsAdmin', type: 'checkbox' },
            { name: 'CreatedAt', type: 'dateTime' }
          ]
        },
        {
          name: 'Tournaments',
          fields: [
            { name: 'TournamentID', type: 'singleLineText' },
            { name: 'TournamentName', type: 'singleLineText' },
            { name: 'GameMode', type: 'singleLineText' },
            { name: 'BracketType', type: 'singleLineText' },
            { name: 'MaxTeams', type: 'number', options: { precision: 0 } },
            { name: 'Status', type: 'singleLineText' },
            { name: 'StartDate', type: 'dateTime' },
            { name: 'CreatedAt', type: 'dateTime' }
          ]
        },
        {
          name: 'Teams',
          fields: [
            { name: 'TeamID', type: 'singleLineText' },
            { name: 'TeamName', type: 'singleLineText' },
            { name: 'TeamLogo', type: 'url' },
            { name: 'Confirmed', type: 'checkbox' },
            { name: 'CreatedAt', type: 'dateTime' }
          ]
        },
        {
          name: 'Heroes',
          fields: [
            { name: 'HeroID', type: 'singleLineText' },
            { name: 'HeroName', type: 'singleLineText' },
            { name: 'Role', type: 'singleLineText' },
            { name: 'ImageURL', type: 'url' },
            { name: 'IsActive', type: 'checkbox' }
          ]
        }
      ];

      // Create basic tables
      for (const tableData of basicTables) {
        await this.createTable(tableData);
        await this.sleep(2000); // Wait 2 seconds between requests
      }

      console.log('\n========================================');
      console.log('✅ Basic tables created successfully!');
      console.log('🔗 Linked fields will be added manually in Airtable UI');
      console.log('========================================');
      
    } catch (error) {
      console.error('❌ Database setup failed:', error.response?.data || error.message);
      throw error;
    }
  }

  async createTable(tableData) {
    try {
      console.log(`Creating table: ${tableData.name}...`);
      
      const response = await axios.post(
        `${AIRTABLE_META_API}/bases/${this.baseId}/tables`,
        tableData,
        { headers: this.headers }
      );
      
      console.log(`✅ Table "${tableData.name}" created successfully!`);
      
    } catch (error) {
      if (error.response?.status === 422 && error.response?.data?.error?.message?.includes('already exists')) {
        console.log(`⚠️  Table "${tableData.name}" already exists, skipping...`);
      } else {
        console.error(`❌ Error creating table "${tableData.name}":`, error.response?.data || error.message);
      }
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Run the setup
async function main() {
  try {
    const setup = new SimpleTableSetup();
    await setup.createTables();
  } catch (error) {
    console.error('Setup failed:', error.message);
    process.exit(1);
  }
}

main();