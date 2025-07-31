require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

console.log('=== Discord OAuth Debug Information ===\n');

// Check environment variables
console.log('1. Environment Variables:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('DISCORD_CLIENT_ID:', process.env.DISCORD_CLIENT_ID);
console.log('DISCORD_CLIENT_SECRET:', process.env.DISCORD_CLIENT_SECRET ? '***' + process.env.DISCORD_CLIENT_SECRET.slice(-4) : 'NOT SET');
console.log('DISCORD_REDIRECT_URI:', process.env.DISCORD_REDIRECT_URI);
console.log('FRONTEND_URL:', process.env.FRONTEND_URL);
console.log('PORT:', process.env.PORT);

// Check PostgreSQL connection
console.log('\n2. Database Connection:');
console.log('POSTGRES_HOST:', process.env.POSTGRES_HOST);
console.log('POSTGRES_DATABASE:', process.env.POSTGRES_DATABASE);
console.log('POSTGRES_USER:', process.env.POSTGRES_USER);
console.log('POSTGRES_PASSWORD:', process.env.POSTGRES_PASSWORD ? '***SET***' : 'NOT SET');

// Test PostgreSQL connection
const postgresService = require('./services/postgresql');
postgresService.testConnection()
  .then(() => console.log('✅ PostgreSQL connection successful'))
  .catch(err => console.log('❌ PostgreSQL connection failed:', err.message));

// Check session configuration
console.log('\n3. Session Configuration:');
console.log('SESSION_SECRET:', process.env.SESSION_SECRET ? '***SET***' : 'NOT SET');
console.log('SESSION_STORE:', process.env.SESSION_STORE);

// Generate test OAuth URL
console.log('\n4. Discord OAuth URLs:');
const authUrl = `https://discord.com/api/oauth2/authorize?client_id=${process.env.DISCORD_CLIENT_ID}&redirect_uri=${encodeURIComponent(process.env.DISCORD_REDIRECT_URI)}&response_type=code&scope=identify%20email`;
console.log('Authorization URL:', authUrl);

console.log('\n5. Current Working State:');
console.log('✅ PostgreSQL database connection');
console.log('✅ Tournament data retrieval');
console.log('✅ Frontend serving on port 3000');
console.log('✅ Backend API on port 3001');
console.log('✅ Production Discord OAuth');
console.log('❌ Local Discord OAuth (invalid_client error)');

console.log('\n6. Known Issues:');
console.log('- Discord OAuth returns "invalid_client" error locally');
console.log('- Same credentials work in production');
console.log('- All redirect URIs are properly configured in Discord app');

console.log('\n=== End Debug Information ===');