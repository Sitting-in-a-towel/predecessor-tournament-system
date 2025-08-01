const postgresService = require('../services/postgresql');

async function createTestInvitations() {
    try {
        console.log('Creating test invitations for sitting_in_a_towel...');
        
        // Get your user ID first
        const userQuery = 'SELECT id, discord_username FROM users WHERE discord_username = $1';
        const userResult = await postgresService.query(userQuery, ['sitting_in_a_towel']);
        
        if (userResult.rows.length === 0) {
            console.log('❌ User sitting_in_a_towel not found');
            return;
        }
        
        const user = userResult.rows[0];
        console.log('✅ Found user:', user.discord_username, 'ID:', user.id);
        
        // Get any team to invite from
        const teamQuery = 'SELECT id, team_name FROM teams LIMIT 1';
        const teamResult = await postgresService.query(teamQuery);
        
        if (teamResult.rows.length === 0) {
            console.log('❌ No teams found');
            return;
        }
        
        const team = teamResult.rows[0];
        console.log('✅ Using team:', team.team_name);
        
        // Get an inviter (any other user)
        const inviterQuery = 'SELECT id, discord_username FROM users WHERE discord_username != $1 LIMIT 1';  
        const inviterResult = await postgresService.query(inviterQuery, ['sitting_in_a_towel']);
        
        if (inviterResult.rows.length === 0) {
            console.log('❌ No other users found to be inviter');
            return;
        }
        
        const inviter = inviterResult.rows[0];
        console.log('✅ Using inviter:', inviter.discord_username);
        
        // Create two test invitations
        const invitations = [
            {
                message: 'Test invitation #1 - Please ACCEPT this one to test acceptance flow',
                role: 'Player'
            },
            {
                message: 'Test invitation #2 - Please DECLINE this one to test decline flow', 
                role: 'Substitute'
            }
        ];
        
        for (let i = 0; i < invitations.length; i++) {
            const inv = invitations[i];
            
            const inviteQuery = `
                INSERT INTO team_invitations 
                (team_id, inviter_id, invited_user_id, role, message, expires_at, status, created_at)
                VALUES ($1, $2, $3, $4, $5, $6, 'pending', NOW())
                RETURNING *
            `;
            
            try {
                const result = await postgresService.query(inviteQuery, [
                    team.id,
                    inviter.id, 
                    user.id,
                    inv.role,
                    inv.message,
                    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
                ]);
                
                console.log(`✅ Created invitation ${i + 1}:`);
                console.log('  - Role:', inv.role);
                console.log('  - Message:', inv.message);
                console.log('  - ID:', result.rows[0].id);
            } catch (error) {
                if (error.code === '23505') {
                    console.log(`⚠️  Invitation ${i + 1} already exists (duplicate)`);
                } else {
                    throw error;
                }
            }
        }
        
        console.log('\n🎉 Test invitations created! Check your Profile page and Teams page to see them.');
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await postgresService.close();
    }
}

createTestInvitations();