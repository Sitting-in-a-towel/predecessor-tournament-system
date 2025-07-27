const axios = require('axios');
require('dotenv').config();

const AIRTABLE_META_API = 'https://api.airtable.com/v0/meta';

class ExistingBaseSetup {
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
      
      // Define all required tables
      const tablesToCreate = [
        {
          name: 'Users',
          fields: [
            { name: 'UserID', type: 'singleLineText' },
            { name: 'DiscordID', type: 'singleLineText' },
            { name: 'DiscordUsername', type: 'singleLineText' },
            { name: 'Email', type: 'email' },
            { name: 'IsAdmin', type: 'checkbox' },
            { name: 'CreatedAt', type: 'dateTime' },
            { name: 'LastActive', type: 'dateTime' },
            { name: 'Status', type: 'singleSelect', options: { choices: [
              { name: 'Active' }, { name: 'Inactive' }
            ]}}
          ]
        },
        {
          name: 'Tournaments',
          fields: [
            { name: 'TournamentID', type: 'singleLineText' },
            { name: 'TournamentName', type: 'singleLineText' },
            { name: 'GameMode', type: 'singleLineText' },
            { name: 'BracketType', type: 'singleSelect', options: { choices: [
              { name: 'Single Elimination' }, { name: 'Double Elimination' }, { name: 'Round Robin' }, { name: 'Swiss' }
            ]}},
            { name: 'MaxTeams', type: 'number' },
            { name: 'Status', type: 'singleSelect', options: { choices: [
              { name: 'Upcoming' }, { name: 'Active' }, { name: 'Completed' }
            ]}},
            { name: 'StartDate', type: 'dateTime' },
            { name: 'EndDate', type: 'dateTime' },
            { name: 'CreatedBy', type: 'singleLineText' },
            { name: 'CreatedAt', type: 'dateTime' }
          ]
        },
        {
          name: 'Teams',
          fields: [
            { name: 'TeamID', type: 'singleLineText' },
            { name: 'TeamName', type: 'singleLineText' },
            { name: 'TeamLogo', type: 'url' },
            { name: 'Captain', type: 'multipleRecordLinks', options: { linkedTableId: 'Users' }},
            { name: 'Players', type: 'multipleRecordLinks', options: { linkedTableId: 'Users' }},
            { name: 'Substitutes', type: 'multipleRecordLinks', options: { linkedTableId: 'Users' }},
            { name: 'Tournament', type: 'multipleRecordLinks', options: { linkedTableId: 'Tournaments' }},
            { name: 'Confirmed', type: 'checkbox' },
            { name: 'CreatedAt', type: 'dateTime' }
          ]
        },
        {
          name: 'Matches',
          fields: [
            { name: 'MatchID', type: 'singleLineText' },
            { name: 'Tournament', type: 'multipleRecordLinks', options: { linkedTableId: 'Tournaments' }},
            { name: 'Team1', type: 'multipleRecordLinks', options: { linkedTableId: 'Teams' }},
            { name: 'Team2', type: 'multipleRecordLinks', options: { linkedTableId: 'Teams' }},
            { name: 'Winner', type: 'multipleRecordLinks', options: { linkedTableId: 'Teams' }},
            { name: 'Status', type: 'singleSelect', options: { choices: [
              { name: 'Scheduled' }, { name: 'In Progress' }, { name: 'Completed' }
            ]}},
            { name: 'ScheduledTime', type: 'dateTime' },
            { name: 'CompletedAt', type: 'dateTime' },
            { name: 'Round', type: 'number' }
          ]
        },
        {
          name: 'Heroes',
          fields: [
            { name: 'HeroID', type: 'singleLineText' },
            { name: 'HeroName', type: 'singleLineText' },
            { name: 'Role', type: 'singleSelect', options: { choices: [
              { name: 'Carry' }, { name: 'Mid' }, { name: 'Jungle' }, { name: 'Support' }, { name: 'Offlane' }
            ]}},
            { name: 'ImageURL', type: 'url' },
            { name: 'IsActive', type: 'checkbox' }
          ]
        }
      ];

      // Create each table
      for (const tableData of tablesToCreate) {
        try {
          console.log(`Creating table: ${tableData.name}...`);
          
          const response = await axios.post(
            `${AIRTABLE_META_API}/bases/${this.baseId}/tables`,
            tableData,
            { headers: this.headers }
          );
          
          console.log(`✅ Table "${tableData.name}" created successfully!`);
          
          // Wait a bit between requests to avoid rate limiting
          await this.sleep(1000);
          
        } catch (error) {
          if (error.response?.status === 422 && error.response?.data?.error?.message?.includes('already exists')) {
            console.log(`⚠️  Table "${tableData.name}" already exists, skipping...`);
          } else {
            console.error(`❌ Error creating table "${tableData.name}":`, error.response?.data || error.message);
          }
        }
      }

      console.log('\n========================================');
      console.log('✅ Database setup completed!');
      console.log('========================================');
      
    } catch (error) {
      console.error('❌ Database setup failed:', error.response?.data || error.message);
      throw error;
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Run the setup
async function main() {
  try {
    const setup = new ExistingBaseSetup();
    await setup.createTables();
  } catch (error) {
    console.error('Setup failed:', error.message);
    process.exit(1);
  }
}

main();