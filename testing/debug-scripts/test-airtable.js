const Airtable = require('airtable');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: '.env' });

console.log('Testing Airtable connection...');
console.log('Token exists:', !!process.env.AIRTABLE_PERSONAL_TOKEN);
console.log('Base ID exists:', !!process.env.AIRTABLE_BASE_ID);

const airtable = new Airtable({ apiKey: process.env.AIRTABLE_PERSONAL_TOKEN });
const base = airtable.base(process.env.AIRTABLE_BASE_ID);

async function testConnection() {
    try {
        console.log('Attempting to connect to Airtable...');
        
        // Try to get just one record from Users table
        const records = await base('Users').select({
            maxRecords: 1
        }).firstPage();
        
        console.log('✅ Airtable connection successful!');
        console.log(`Found ${records.length} user record(s)`);
        
        if (records.length > 0) {
            console.log('Sample record:', {
                id: records[0].id,
                fields: Object.keys(records[0].fields)
            });
        }
        
    } catch (error) {
        console.log('❌ Airtable connection failed:', error.message);
        console.log('Error type:', error.error || 'Unknown');
        
        if (error.statusCode === 401) {
            console.log('\nPossible solutions:');
            console.log('1. Check if your Airtable Personal Access Token is still valid');
            console.log('2. Verify the token has read access to the base');
            console.log('3. Check if you\'ve hit API rate limits');
        }
    }
}

testConnection();