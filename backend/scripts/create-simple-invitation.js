const postgresService = require('../services/postgresql');

async function createSimpleInvitation() {
    try {
        console.log('Creating invitation for Sitting_in_a_towel...');
        
        // Get your team UUID
        const teamQuery = `SELECT id, team_id, team_name FROM teams WHERE team_id = 'team_1753799369897_5qe5zf15w'`;
        const teamResult = await postgresService.query(teamQuery);
        
        if (teamResult.rows.length === 0) {
            console.log('❌ Team not found');
            return;
        }
        
        const team = teamResult.rows[0];
        console.log('✅ Found team:', team.team_name, '(UUID:', team.id + ')');
        
        // Get any user to be the inviter (captain)
        const userQuery = `SELECT id, discord_username FROM users LIMIT 1`;
        const userResult = await postgresService.query(userQuery);
        
        if (userResult.rows.length === 0) {
            console.log('❌ No users found');
            return;
        }
        
        const inviter = userResult.rows[0];
        console.log('✅ Using inviter:', inviter.discord_username);
        
        // Create the invitation
        const invitationQuery = `
            INSERT INTO team_invitations 
            (team_id, inviter_id, invited_discord_username, role, message, expires_at, status, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
            RETURNING *
        `;
        
        const invitation = await postgresService.query(invitationQuery, [
            team.id, // Use the UUID
            inviter.id, // Use the inviter UUID
            'Sitting_in_a_towel',
            'Player',
            'Test invitation! Please accept to test the invitation system.',
            new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
            'pending'
        ]);
        
        console.log('✅ Invitation created successfully!');
        console.log('- Team:', team.team_name);
        console.log('- Invited user:', 'Sitting_in_a_towel');
        console.log('- Role:', 'Player');
        console.log('- Status:', 'pending');
        console.log('- Expires:', invitation.rows[0].expires_at);
        console.log('\n🎉 Go to your Profile page to see the invitation!');
        
    } catch (error) {
        console.error('❌ Error creating invitation:', error);
    } finally {
        await postgresService.close();
    }
}

createSimpleInvitation();