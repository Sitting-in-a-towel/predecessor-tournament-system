// Test PostgreSQL connection and basic operations
require('dotenv').config();
const postgresService = require('./services/postgresql');

async function testConnection() {
    console.log('🧪 Testing PostgreSQL Connection...');
    console.log('=====================================');
    
    try {
        // Test basic connection
        console.log('1. Testing database connection...');
        await postgresService.testConnection();
        
        // Test getting users
        console.log('\n2. Testing user queries...');
        const testUser = await postgresService.getUserByDiscordId('123456789012345678');
        if (testUser) {
            console.log('✅ Found test user:', testUser.discord_username);
        } else {
            console.log('❌ Test user not found');
        }
        
        // Test getting tournaments
        console.log('\n3. Testing tournament queries...');
        const tournaments = await postgresService.getTournaments();
        console.log(`✅ Found ${tournaments.length} tournaments`);
        
        if (tournaments.length > 0) {
            console.log('   Sample tournament:', tournaments[0].name);
        }
        
        // Test getting teams
        console.log('\n4. Testing team queries...');
        const teams = await postgresService.getTeamsByUser('user_test_001');
        console.log(`✅ Found ${teams.length} teams for test user`);
        
        // Test getting heroes
        console.log('\n5. Testing hero queries...');
        const heroes = await postgresService.getHeroes();
        console.log(`✅ Found ${heroes.length} heroes`);
        
        console.log('\n🎉 All tests passed! PostgreSQL backend is ready.');
        
    } catch (error) {
        console.log('\n❌ Test failed:', error.message);
        console.log('Stack trace:', error.stack);
    } finally {
        // Close connection
        await postgresService.close();
        process.exit(0);
    }
}

testConnection();