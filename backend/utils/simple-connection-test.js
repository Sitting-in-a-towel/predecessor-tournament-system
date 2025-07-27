const Airtable = require('airtable');
require('dotenv').config();

async function testConnection() {
  try {
    console.log('Testing Airtable connection...');
    console.log('Token:', process.env.AIRTABLE_PERSONAL_TOKEN ? 'Present' : 'Missing');
    console.log('Base ID:', process.env.AIRTABLE_BASE_ID || 'Missing');

    // Configure Airtable
    Airtable.configure({
      endpointUrl: 'https://api.airtable.com',
      apiKey: process.env.AIRTABLE_PERSONAL_TOKEN
    });

    const base = Airtable.base(process.env.AIRTABLE_BASE_ID);
    
    // Try to access Users table
    const users = await base('Users').select({ maxRecords: 1 }).firstPage();
    console.log('✅ Users table accessible - found', users.length, 'records');
    
    // Try to access Tournaments table
    const tournaments = await base('Tournaments').select({ maxRecords: 1 }).firstPage();
    console.log('✅ Tournaments table accessible - found', tournaments.length, 'records');
    
    console.log('🎉 All connections successful!');
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    if (error.statusCode) {
      console.error('Status code:', error.statusCode);
    }
  }
}

testConnection();