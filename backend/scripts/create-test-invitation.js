const postgresService = require('../services/postgresql');

async function createTestInvitation() {
    
    try {
        console.log('Creating test team and invitation...');
        
        // First, create a test user (captain)
        const testCaptainUser = {
            user_id: 'test_captain_' + Date.now(),
            discord_username: 'TestCaptain',
            discord_id: '123456789',
            email: 'testcaptain@example.com'
        };
        
        const userQuery = `
            INSERT INTO users (user_id, discord_username, discord_id, email, created_at, updated_at)
            VALUES ($1, $2, $3, $4, NOW(), NOW())
            ON CONFLICT (discord_id) DO UPDATE SET
            user_id = EXCLUDED.user_id,
            discord_username = EXCLUDED.discord_username,
            email = EXCLUDED.email
            RETURNING id
        `;
        
        const userResult = await postgresService.query(userQuery, [
            testCaptainUser.user_id,
            testCaptainUser.discord_username,
            testCaptainUser.discord_id,
            testCaptainUser.email
        ]);
        
        const captainDbId = userResult.rows[0].id;
        console.log('✅ Test captain created with DB ID:', captainDbId);
        
        // Create a test tournament
        const testTournament = {
            tournament_id: 'test_tournament_' + Date.now(),
            name: 'Test Tournament for Invitations',
            description: 'A test tournament to test invitations',
            format: 'Single Elimination',
            status: 'open'
        };
        
        const tournamentQuery = `
            INSERT INTO tournaments (tournament_id, name, description, format, status, created_by, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
            RETURNING id
        `;
        
        const tournamentResult = await postgresService.query(tournamentQuery, [
            testTournament.tournament_id,
            testTournament.name,
            testTournament.description,
            testTournament.format,
            testTournament.status,
            captainDbId
        ]);
        
        const tournamentDbId = tournamentResult.rows[0].id;
        console.log('✅ Test tournament created with DB ID:', tournamentDbId);
        
        // Create a test team
        const testTeam = {
            team_id: 'test_team_' + Date.now(),
            team_name: 'Invitation Test Team',
            tournament_id: tournamentDbId,
            captain_id: captainDbId
        };
        
        const teamQuery = `
            INSERT INTO teams (team_id, team_name, tournament_id, captain_id, created_at, updated_at)
            VALUES ($1, $2, $3, $4, NOW(), NOW())
            RETURNING id
        `;
        
        const teamResult = await postgresService.query(teamQuery, [
            testTeam.team_id,
            testTeam.team_name,
            testTeam.tournament_id,
            testTeam.captain_id
        ]);
        
        const teamDbId = teamResult.rows[0].id;
        console.log('✅ Test team created with DB ID:', teamDbId);
        
        // Create invitation to "Sitting_in_a_towel"
        const invitationQuery = `
            INSERT INTO team_invitations 
            (team_id, inviter_id, invited_discord_username, role, message, expires_at, status, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
            RETURNING *
        `;
        
        const invitation = await postgresService.query(invitationQuery, [
            teamDbId,
            captainDbId,
            'Sitting_in_a_towel',
            'Player',
            'Hey! This is a test invitation to join our test team. Please accept to test the invitation system!',
            new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
            'pending'
        ]);
        
        console.log('✅ Test invitation created!');
        console.log('Team Name:', testTeam.team_name);
        console.log('Team ID:', testTeam.team_id);
        console.log('Invited User:', 'Sitting_in_a_towel');
        console.log('Message:', invitation.rows[0].message);
        console.log('Expires:', invitation.rows[0].expires_at);
        
        console.log('\n🎉 Test setup complete!');
        console.log('Now go to the Profile page to see the invitation.');
        
    } catch (error) {
        console.error('❌ Error creating test invitation:', error);
    } finally {
        await postgresService.close();
    }
}

createTestInvitation();