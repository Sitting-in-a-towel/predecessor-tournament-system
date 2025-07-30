require('dotenv').config({ path: '../.env' });
const postgresService = require('./services/postgresql');

async function debugTournamentCreation() {
    try {
        console.log('🔍 Debugging Tournament Creation...');
        
        // Test tournament data similar to what the frontend sends
        const testTournamentData = {
            tournament_id: `tour_test_${Date.now()}`,
            name: 'Test Tournament Debug',
            description: 'Testing tournament creation',
            bracket_type: 'Single Elimination',
            game_format: 'Best of 1',
            quarter_final_format: 'Best of 1',
            semi_final_format: 'Best of 1', 
            grand_final_format: 'Best of 1',
            max_teams: 8,
            registration_start: new Date().toISOString(),
            registration_end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            tournament_start: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
            created_by: null, // Will get user UUID
            status: 'Registration',
            is_public: true
        };

        // Get test user UUID
        console.log('1. Getting test user...');
        const testUser = await postgresService.getUserByDiscordId('123456789012345678');
        if (!testUser) {
            console.log('❌ Test user not found');
            return;
        }
        console.log('✅ Found test user:', testUser.discord_username);
        
        // Set the creator
        testTournamentData.created_by = testUser.id; // Use UUID, not user_id
        
        console.log('2. Creating tournament...');
        console.log('Tournament data:', testTournamentData);
        
        const tournament = await postgresService.createTournament(testTournamentData);
        console.log('✅ Tournament created successfully!');
        console.log('Tournament:', tournament);
        
    } catch (error) {
        console.log('❌ Error creating tournament:', error.message);
        console.log('Full error:', error);
    } finally {
        await postgresService.close();
        process.exit(0);
    }
}

debugTournamentCreation();