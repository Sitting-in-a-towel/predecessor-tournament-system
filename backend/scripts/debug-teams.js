require('dotenv').config({ path: '../.env' });
const { airtableService } = require('../services/airtable');
const logger = require('../utils/logger');

async function debugTeams() {
  try {
    console.log('=== Debugging Teams Issue ===\n');
    
    // Get all teams
    const teams = await airtableService.getTeams();
    console.log(`Total teams in database: ${teams.length}`);
    
    // Show each team
    teams.forEach(team => {
      console.log(`\nTeam: ${team.TeamName}`);
      console.log(`  ID: ${team.TeamID}`);
      console.log(`  Record ID: ${team.recordId}`);
      console.log(`  Captain: ${team.Captain}`);
      console.log(`  Players: ${team.Players}`);
      console.log(`  Tournament: ${team.Tournament}`);
      console.log(`  Logo: ${team.TeamLogo || 'No logo'}`);
    });
    
    // Get all users to check their record IDs
    console.log('\n=== Users ===');
    const users = await airtableService.getAllUsers();
    users.forEach(user => {
      console.log(`\nUser: ${user.DiscordUsername}`);
      console.log(`  UserID: ${user.UserID}`);
      console.log(`  Record ID: ${user.recordId}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// Add getAllUsers method if it doesn't exist
if (!airtableService.getAllUsers) {
  airtableService.getAllUsers = async function() {
    try {
      const records = await this.tables.users.select().all();
      return records.map(record => ({
        recordId: record.id,
        UserID: record.get('UserID'),
        DiscordID: record.get('DiscordID'),
        DiscordUsername: record.get('DiscordUsername'),
        Email: record.get('Email'),
        IsAdmin: record.get('IsAdmin') || false
      }));
    } catch (error) {
      console.error('Error getting all users:', error);
      throw error;
    }
  };
}

debugTeams();