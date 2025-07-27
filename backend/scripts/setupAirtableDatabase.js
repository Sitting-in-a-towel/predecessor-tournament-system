const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const AIRTABLE_API_BASE = 'https://api.airtable.com/v0';
const AIRTABLE_META_API = 'https://api.airtable.com/v0/meta';

class AirtableDatabaseSetup {
  constructor() {
    this.personalToken = process.env.AIRTABLE_PERSONAL_TOKEN;
    if (!this.personalToken) {
      throw new Error('AIRTABLE_PERSONAL_TOKEN is required in .env file');
    }
    
    this.headers = {
      'Authorization': `Bearer ${this.personalToken}`,
      'Content-Type': 'application/json'
    };
  }

  async createBase() {
    try {
      console.log('Creating Airtable base: "Predecessor Tournament Management"...');
      
      const baseData = {
        name: 'Predecessor Tournament Management',
        tables: [
          {
            name: 'Users',
            fields: [
              { name: 'UserID', type: 'singleLineText' },
              { name: 'DiscordID', type: 'singleLineText' },
              { name: 'DiscordUsername', type: 'singleLineText' },
              { name: 'Email', type: 'email' },
              { name: 'IsAdmin', type: 'checkbox' },
              { name: 'CreatedAt', type: 'dateTime' },
              { name: 'LastActive', type: 'dateTime' }
            ]
          }
        ]
      };

      const response = await axios.post(`${AIRTABLE_META_API}/bases`, baseData, {
        headers: this.headers
      });

      const baseId = response.data.id;
      console.log(`✅ Base created successfully! Base ID: ${baseId}`);
      
      // Update .env file with the base ID
      this.updateEnvFile(baseId);
      
      return baseId;
    } catch (error) {
      console.error('❌ Error creating base:', error.response?.data || error.message);
      throw error;
    }
  }

  async setupTables(baseId) {
    console.log('Setting up database tables...');
    
    try {
      // Create all tables with proper schema
      await this.createUsersTable(baseId);
      await this.createTournamentsTable(baseId);
      await this.createTeamsTable(baseId);
      await this.createMatchesTable(baseId);
      await this.createDraftSessionsTable(baseId);
      await this.createPlayerSignupsTable(baseId);
      await this.createNotificationsTable(baseId);
      await this.createHeroesTable(baseId);
      
      console.log('✅ All tables created successfully!');
    } catch (error) {
      console.error('❌ Error setting up tables:', error);
      throw error;
    }
  }

  async createUsersTable(baseId) {
    const tableData = {
      name: 'Users',
      fields: [
        { name: 'UserID', type: 'singleLineText' },
        { name: 'DiscordID', type: 'singleLineText' },
        { name: 'DiscordUsername', type: 'singleLineText' },
        { name: 'Email', type: 'email' },
        { name: 'IsAdmin', type: 'checkbox' },
        { name: 'CreatedAt', type: 'dateTime' },
        { name: 'LastActive', type: 'dateTime' }
      ]
    };
    
    return this.createTable(baseId, tableData);
  }

  async createTournamentsTable(baseId) {
    const tableData = {
      name: 'Tournaments',
      fields: [
        { name: 'TournamentID', type: 'singleLineText' },
        { name: 'Name', type: 'singleLineText' },
        { name: 'Description', type: 'multilineText' },
        { 
          name: 'BracketType', 
          type: 'singleSelect',
          options: {
            choices: [
              { name: 'Single Elimination' },
              { name: 'Double Elimination' },
              { name: 'Round Robin' },
              { name: 'Swiss' }
            ]
          }
        },
        { 
          name: 'GameFormat', 
          type: 'singleSelect',
          options: {
            choices: [
              { name: 'Best of 1' },
              { name: 'Best of 3' },
              { name: 'Best of 5' }
            ]
          }
        },
        { 
          name: 'QuarterFinalFormat', 
          type: 'singleSelect',
          options: {
            choices: [
              { name: 'Best of 1' },
              { name: 'Best of 3' },
              { name: 'Best of 5' }
            ]
          }
        },
        { 
          name: 'SemiFinalFormat', 
          type: 'singleSelect',
          options: {
            choices: [
              { name: 'Best of 1' },
              { name: 'Best of 3' },
              { name: 'Best of 5' }
            ]
          }
        },
        { 
          name: 'GrandFinalFormat', 
          type: 'singleSelect',
          options: {
            choices: [
              { name: 'Best of 1' },
              { name: 'Best of 3' },
              { name: 'Best of 5' }
            ]
          }
        },
        { name: 'MaxTeams', type: 'number', options: { precision: 0 } },
        { name: 'RegistrationOpen', type: 'checkbox' },
        { name: 'StartDate', type: 'dateTime' },
        { name: 'EndDate', type: 'dateTime' },
        { name: 'CreatedBy', type: 'multipleRecordLinks', options: { linkedTableId: 'Users' } },
        { 
          name: 'Status', 
          type: 'singleSelect',
          options: {
            choices: [
              { name: 'Planning' },
              { name: 'Registration' },
              { name: 'In Progress' },
              { name: 'Completed' },
              { name: 'Cancelled' }
            ]
          }
        }
      ]
    };
    
    return this.createTable(baseId, tableData);
  }

  async createTeamsTable(baseId) {
    const tableData = {
      name: 'Teams',
      fields: [
        { name: 'TeamID', type: 'singleLineText' },
        { name: 'TeamName', type: 'singleLineText' },
        { name: 'Captain', type: 'multipleRecordLinks', options: { linkedTableId: 'Users' } },
        { name: 'Players', type: 'multipleRecordLinks', options: { linkedTableId: 'Users' } },
        { name: 'Substitutes', type: 'multipleRecordLinks', options: { linkedTableId: 'Users' } },
        { name: 'Tournament', type: 'multipleRecordLinks', options: { linkedTableId: 'Tournaments' } },
        { name: 'Confirmed', type: 'checkbox' },
        { name: 'CreatedAt', type: 'dateTime' },
        { name: 'TeamLogo', type: 'url' }
      ]
    };
    
    return this.createTable(baseId, tableData);
  }

  async createMatchesTable(baseId) {
    const tableData = {
      name: 'Matches',
      fields: [
        { name: 'MatchID', type: 'singleLineText' },
        { name: 'Tournament', type: 'multipleRecordLinks', options: { linkedTableId: 'Tournaments' } },
        { name: 'Team1', type: 'multipleRecordLinks', options: { linkedTableId: 'Teams' } },
        { name: 'Team2', type: 'multipleRecordLinks', options: { linkedTableId: 'Teams' } },
        { name: 'ScheduledTime', type: 'dateTime' },
        { name: 'ActualStartTime', type: 'dateTime' },
        { name: 'EndTime', type: 'dateTime' },
        { 
          name: 'Status', 
          type: 'singleSelect',
          options: {
            choices: [
              { name: 'Scheduled' },
              { name: 'In Progress' },
              { name: 'Completed' },
              { name: 'Postponed' },
              { name: 'Cancelled' }
            ]
          }
        },
        { name: 'Winner', type: 'multipleRecordLinks', options: { linkedTableId: 'Teams' } },
        { name: 'Score', type: 'singleLineText' },
        { name: 'BracketRound', type: 'singleLineText' }
      ]
    };
    
    return this.createTable(baseId, tableData);
  }

  async createDraftSessionsTable(baseId) {
    const tableData = {
      name: 'DraftSessions',
      fields: [
        { name: 'DraftID', type: 'singleLineText' },
        { name: 'Match', type: 'multipleRecordLinks', options: { linkedTableId: 'Matches' } },
        { name: 'Team1Captain', type: 'multipleRecordLinks', options: { linkedTableId: 'Users' } },
        { name: 'Team2Captain', type: 'multipleRecordLinks', options: { linkedTableId: 'Users' } },
        { 
          name: 'FirstPickTeam', 
          type: 'singleSelect',
          options: {
            choices: [
              { name: 'Team1' },
              { name: 'Team2' }
            ]
          }
        },
        { 
          name: 'CoinTossWinner', 
          type: 'singleSelect',
          options: {
            choices: [
              { name: 'Team1' },
              { name: 'Team2' }
            ]
          }
        },
        { name: 'DraftOrder', type: 'multilineText' },
        { name: 'BanCount', type: 'number', options: { precision: 0 } },
        { name: 'Team1Picks', type: 'multilineText' },
        { name: 'Team1Bans', type: 'multilineText' },
        { name: 'Team2Picks', type: 'multilineText' },
        { name: 'Team2Bans', type: 'multilineText' },
        { 
          name: 'Status', 
          type: 'singleSelect',
          options: {
            choices: [
              { name: 'Waiting' },
              { name: 'In Progress' },
              { name: 'Completed' },
              { name: 'Cancelled' }
            ]
          }
        },
        { name: 'StartTime', type: 'dateTime' },
        { name: 'EndTime', type: 'dateTime' },
        { name: 'SpectatorLink', type: 'url' },
        { name: 'Team1CaptainLink', type: 'url' },
        { name: 'Team2CaptainLink', type: 'url' }
      ]
    };
    
    return this.createTable(baseId, tableData);
  }

  async createPlayerSignupsTable(baseId) {
    const tableData = {
      name: 'PlayerSignups',
      fields: [
        { name: 'SignupID', type: 'singleLineText' },
        { name: 'User', type: 'multipleRecordLinks', options: { linkedTableId: 'Users' } },
        { name: 'Tournament', type: 'multipleRecordLinks', options: { linkedTableId: 'Tournaments' } },
        { name: 'LookingForTeam', type: 'checkbox' },
        { 
          name: 'PreferredRole', 
          type: 'singleSelect',
          options: {
            choices: [
              { name: 'Carry' },
              { name: 'Support' },
              { name: 'Midlane' },
              { name: 'Offlane' },
              { name: 'Jungle' },
              { name: 'Flex' }
            ]
          }
        },
        { 
          name: 'Experience', 
          type: 'singleSelect',
          options: {
            choices: [
              { name: 'Beginner' },
              { name: 'Intermediate' },
              { name: 'Advanced' },
              { name: 'Professional' }
            ]
          }
        },
        { name: 'AvailableTimes', type: 'multilineText' },
        { name: 'ContactInfo', type: 'singleLineText' },
        { 
          name: 'Status', 
          type: 'singleSelect',
          options: {
            choices: [
              { name: 'Available' },
              { name: 'Invited' },
              { name: 'Joined Team' }
            ]
          }
        },
        { name: 'CreatedAt', type: 'dateTime' }
      ]
    };
    
    return this.createTable(baseId, tableData);
  }

  async createNotificationsTable(baseId) {
    const tableData = {
      name: 'Notifications',
      fields: [
        { name: 'NotificationID', type: 'singleLineText' },
        { name: 'User', type: 'multipleRecordLinks', options: { linkedTableId: 'Users' } },
        { 
          name: 'Type', 
          type: 'singleSelect',
          options: {
            choices: [
              { name: 'Team Invite' },
              { name: 'Tournament Update' },
              { name: 'Match Scheduled' },
              { name: 'Draft Starting' },
              { name: 'General' }
            ]
          }
        },
        { name: 'Title', type: 'singleLineText' },
        { name: 'Message', type: 'multilineText' },
        { name: 'Read', type: 'checkbox' },
        { name: 'CreatedAt', type: 'dateTime' },
        { name: 'RelatedTournament', type: 'multipleRecordLinks', options: { linkedTableId: 'Tournaments' } },
        { name: 'RelatedTeam', type: 'multipleRecordLinks', options: { linkedTableId: 'Teams' } }
      ]
    };
    
    return this.createTable(baseId, tableData);
  }

  async createHeroesTable(baseId) {
    const tableData = {
      name: 'Heroes',
      fields: [
        { name: 'HeroID', type: 'singleLineText' },
        { name: 'HeroName', type: 'singleLineText' },
        { 
          name: 'Role', 
          type: 'singleSelect',
          options: {
            choices: [
              { name: 'Carry' },
              { name: 'Support' },
              { name: 'Midlane' },
              { name: 'Offlane' },
              { name: 'Jungle' }
            ]
          }
        },
        { name: 'ImageURL', type: 'url' },
        { name: 'OmedaID', type: 'singleLineText' },
        { name: 'Enabled', type: 'checkbox' },
        { name: 'LastUpdated', type: 'dateTime' }
      ]
    };
    
    return this.createTable(baseId, tableData);
  }

  async createTable(baseId, tableData) {
    try {
      console.log(`Creating table: ${tableData.name}...`);
      
      const response = await axios.post(
        `${AIRTABLE_META_API}/bases/${baseId}/tables`,
        tableData,
        { headers: this.headers }
      );
      
      console.log(`✅ Table "${tableData.name}" created successfully`);
      return response.data;
    } catch (error) {
      console.error(`❌ Error creating table "${tableData.name}":`, error.response?.data || error.message);
      throw error;
    }
  }

  updateEnvFile(baseId) {
    const envPath = path.join(__dirname, '..', '.env');
    const frontendEnvPath = path.join(__dirname, '..', '..', 'frontend', '.env');
    
    try {
      // Update backend .env
      if (fs.existsSync(envPath)) {
        let envContent = fs.readFileSync(envPath, 'utf8');
        if (envContent.includes('AIRTABLE_BASE_ID=')) {
          envContent = envContent.replace(/AIRTABLE_BASE_ID=.*/, `AIRTABLE_BASE_ID=${baseId}`);
        } else {
          envContent += `\nAIRTABLE_BASE_ID=${baseId}\n`;
        }
        fs.writeFileSync(envPath, envContent);
        console.log('✅ Backend .env file updated with Base ID');
      }

      // Update frontend .env if it exists
      if (fs.existsSync(frontendEnvPath)) {
        let envContent = fs.readFileSync(frontendEnvPath, 'utf8');
        if (envContent.includes('REACT_APP_AIRTABLE_BASE_ID=')) {
          envContent = envContent.replace(/REACT_APP_AIRTABLE_BASE_ID=.*/, `REACT_APP_AIRTABLE_BASE_ID=${baseId}`);
        } else {
          envContent += `\nREACT_APP_AIRTABLE_BASE_ID=${baseId}\n`;
        }
        fs.writeFileSync(frontendEnvPath, envContent);
        console.log('✅ Frontend .env file updated with Base ID');
      }
    } catch (error) {
      console.warn('⚠️  Could not update .env files automatically:', error.message);
      console.log(`Please manually add AIRTABLE_BASE_ID=${baseId} to your .env files`);
    }
  }

  async populateSampleData(baseId) {
    console.log('Populating sample data...');
    
    try {
      // Add sample heroes
      await this.addSampleHeroes(baseId);
      
      // Add sample users
      await this.addSampleUsers(baseId);
      
      console.log('✅ Sample data populated successfully!');
    } catch (error) {
      console.error('❌ Error populating sample data:', error.response?.data || error.message);
    }
  }

  async addSampleHeroes(baseId) {
    const sampleHeroes = [
      { HeroID: 'hero_001', HeroName: 'Countess', Role: 'Midlane', Enabled: true, LastUpdated: new Date().toISOString() },
      { HeroID: 'hero_002', HeroName: 'Grux', Role: 'Jungle', Enabled: true, LastUpdated: new Date().toISOString() },
      { HeroID: 'hero_003', HeroName: 'Sparrow', Role: 'Carry', Enabled: true, LastUpdated: new Date().toISOString() },
      { HeroID: 'hero_004', HeroName: 'Dekker', Role: 'Support', Enabled: true, LastUpdated: new Date().toISOString() },
      { HeroID: 'hero_005', HeroName: 'Steel', Role: 'Offlane', Enabled: true, LastUpdated: new Date().toISOString() }
    ];

    const records = sampleHeroes.map(hero => ({ fields: hero }));
    
    await axios.post(`${AIRTABLE_API_BASE}/${baseId}/Heroes`, { records }, { headers: this.headers });
    console.log('✅ Sample heroes added');
  }

  async addSampleUsers(baseId) {
    const sampleUsers = [
      {
        UserID: 'user_001',
        DiscordID: '123456789',
        DiscordUsername: 'ProPlayer1#1234',
        Email: 'player1@example.com',
        IsAdmin: false,
        CreatedAt: new Date().toISOString(),
        LastActive: new Date().toISOString()
      },
      {
        UserID: 'admin_001',
        DiscordID: '987654321',
        DiscordUsername: 'TourneyAdmin#5678',
        Email: 'admin@example.com',
        IsAdmin: true,
        CreatedAt: new Date().toISOString(),
        LastActive: new Date().toISOString()
      }
    ];

    const records = sampleUsers.map(user => ({ fields: user }));
    
    await axios.post(`${AIRTABLE_API_BASE}/${baseId}/Users`, { records }, { headers: this.headers });
    console.log('✅ Sample users added');
  }

  async run() {
    try {
      console.log('🚀 Starting Airtable Database Setup...\n');
      
      // Create base and get ID
      const baseId = await this.createBase();
      
      // Wait a moment for base creation to complete
      console.log('Waiting for base creation to complete...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Set up all tables
      await this.setupTables(baseId);
      
      // Wait a moment for tables to be created
      console.log('Waiting for table creation to complete...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Populate sample data
      await this.populateSampleData(baseId);
      
      console.log('\n🎉 Database setup completed successfully!');
      console.log(`📋 Base ID: ${baseId}`);
      console.log('🔗 Access your base at: https://airtable.com');
      console.log('\nNext steps:');
      console.log('1. Configure Discord OAuth in your .env file');
      console.log('2. Run the development server with: launchers\\start_development.bat');
      
    } catch (error) {
      console.error('\n💥 Database setup failed:', error.message);
      process.exit(1);
    }
  }
}

// Run setup if called directly
if (require.main === module) {
  const setup = new AirtableDatabaseSetup();
  setup.run();
}

module.exports = AirtableDatabaseSetup;