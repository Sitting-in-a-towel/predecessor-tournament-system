require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const axios = require('axios');

async function testDiscordToken() {
  console.log('=== Testing Discord OAuth Token Exchange ===\n');
  
  const clientId = process.env.DISCORD_CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;
  
  console.log('Client ID:', clientId);
  console.log('Client Secret:', '***' + clientSecret.slice(-4));
  
  // Test if we can get basic OAuth2 info
  try {
    const response = await axios.get('https://discord.com/api/oauth2/applications/@me', {
      headers: {
        'Authorization': `Bot ${clientSecret}`
      }
    });
    console.log('\n✅ Discord API connection test passed');
  } catch (error) {
    console.log('\n❌ Discord API test failed:', error.response?.data || error.message);
  }
  
  console.log('\nPossible causes for invalid_client error:');
  console.log('1. Client Secret might have been regenerated on Discord');
  console.log('2. Discord might be rate limiting localhost connections');
  console.log('3. The OAuth2 application might have issues');
  
  console.log('\nRecommended actions:');
  console.log('1. Go to https://discord.com/developers/applications');
  console.log('2. Select your application (ID: ' + clientId + ')');
  console.log('3. Go to OAuth2 > General');
  console.log('4. Verify the Client Secret matches what you have');
  console.log('5. Check if the application is active and not limited');
}

testDiscordToken();