require('dotenv').config();
const { airtableService } = require('../services/airtable');

async function debugAirtable() {
  try {
    console.log('=== DEBUG: Testing Airtable Service ===');
    
    // Test raw tournament data
    console.log('\n1. Testing getTournaments()...');
    const tournaments = await airtableService.getTournaments();
    console.log('Tournaments result:', JSON.stringify(tournaments, null, 2));
    
    // Test raw user data  
    console.log('\n2. Testing Users table access...');
    const Airtable = require('airtable');
    Airtable.configure({
      endpointUrl: 'https://api.airtable.com',
      apiKey: process.env.AIRTABLE_PERSONAL_TOKEN
    });
    const base = Airtable.base(process.env.AIRTABLE_BASE_ID);
    
    const userRecords = await base('Users').select({ maxRecords: 3 }).firstPage();
    console.log('Users found:', userRecords.length);
    
    const tournamentRecords = await base('Tournaments').select({ maxRecords: 3 }).firstPage();
    console.log('Tournament records found:', tournamentRecords.length);
    
    if (tournamentRecords.length > 0) {
      console.log('First tournament fields:', Object.keys(tournamentRecords[0].fields));
      console.log('First tournament data:', tournamentRecords[0].fields);
    }
    
  } catch (error) {
    console.error('Debug failed:', error.message);
    console.error('Full error:', error);
  }
}

debugAirtable();