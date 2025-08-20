const express = require('express');
const postgresService = require('../services/postgresql');
const logger = require('../utils/logger');

const router = express.Router();

router.post('/create-for-tournament/:tournamentId', async (req, res) => {
    try {
        const tournamentId = req.params.tournamentId;
        logger.info(`Creating test teams for tournament: ${tournamentId}`);
        
        const teams = [
            { 
                name: 'Team Alpha', 
                tag: 'ALPH',
                players: [
                    { name: 'AlphaStrike', isCaptain: true },
                    { name: 'AlphaGuard', isCaptain: false },
                    { name: 'AlphaBlaze', isCaptain: false },
                    { name: 'AlphaVoid', isCaptain: false },
                    { name: 'AlphaRush', isCaptain: false }
                ],
                substitutes: [
                    { name: 'AlphaSub1' },
                    { name: 'AlphaSub2' },
                    { name: 'AlphaSub3' }
                ]
            },
            { 
                name: 'Team Beta', 
                tag: 'BETA',
                players: [
                    { name: 'BetaLeader', isCaptain: true },
                    { name: 'BetaTank', isCaptain: false },
                    { name: 'BetaSupport', isCaptain: false },
                    { name: 'BetaCarry', isCaptain: false },
                    { name: 'BetaJungle', isCaptain: false }
                ],
                substitutes: [
                    { name: 'BetaBackup1' },
                    { name: 'BetaBackup2' },
                    { name: 'BetaBackup3' }
                ]
            },
            { 
                name: 'Team Gamma', 
                tag: 'GAMM',
                players: [
                    { name: 'GammaCommand', isCaptain: true },
                    { name: 'GammaForce', isCaptain: false },
                    { name: 'GammaShield', isCaptain: false },
                    { name: 'GammaSword', isCaptain: false },
                    { name: 'GammaWing', isCaptain: false }
                ],
                substitutes: [
                    { name: 'GammaReserve1' },
                    { name: 'GammaReserve2' },
                    { name: 'GammaReserve3' }
                ]
            },
            { 
                name: 'Team Delta', 
                tag: 'DELT',
                players: [
                    { name: 'DeltaChief', isCaptain: true },
                    { name: 'DeltaStorm', isCaptain: false },
                    { name: 'DeltaFrost', isCaptain: false },
                    { name: 'DeltaFlame', isCaptain: false },
                    { name: 'DeltaWave', isCaptain: false }
                ],
                substitutes: [
                    { name: 'DeltaExtra1' },
                    { name: 'DeltaExtra2' },
                    { name: 'DeltaExtra3' }
                ]
            }
        ];
        
        const createdTeams = [];
        
        // Get the current user (tournament creator) to use as registered_by
        const userQuery = `SELECT id FROM users ORDER BY created_at DESC LIMIT 1`;
        const userResult = await postgresService.query(userQuery);
        const userId = userResult.rows[0]?.id;
        
        if (!userId) {
            throw new Error('No user found to register teams');
        }
        
        for (const team of teams) {
            // Create team
            const teamUUID = require('crypto').randomUUID();
            const teamId = `team_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            const createTeamQuery = `
                INSERT INTO teams (id, team_id, team_name, team_tag, confirmed, created_at, updated_at)
                VALUES ($1, $2, $3, $4, true, NOW(), NOW())
                RETURNING *
            `;
            
            await postgresService.query(createTeamQuery, [
                teamUUID, teamId, team.name, team.tag
            ]);
            
            // Create players (mock users) and add to team
            const playerPositions = ['Carry', 'Support', 'Midlane', 'Offlane', 'Jungle'];
            let captainId = null;
            
            // Create main players
            for (let i = 0; i < team.players.length; i++) {
                const player = team.players[i];
                const playerUUID = require('crypto').randomUUID();
                const discordId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                
                // Create mock user
                const createUserQuery = `
                    INSERT INTO users (id, user_id, discord_id, discord_username, created_at, updated_at)
                    VALUES ($1, $2, $3, $4, NOW(), NOW())
                `;
                
                await postgresService.query(createUserQuery, [
                    playerUUID, 
                    `user_${discordId}`,
                    discordId,
                    player.name
                ]);
                
                // Add to team
                const role = player.isCaptain ? 'captain' : 'player';
                const position = playerPositions[i] || 'Flex';
                
                if (player.isCaptain) {
                    captainId = playerUUID;
                }
                
                const addPlayerQuery = `
                    INSERT INTO team_players (id, team_id, player_id, role, position, joined_at, accepted)
                    VALUES ($1, $2, $3, $4, $5, NOW(), true)
                `;
                
                await postgresService.query(addPlayerQuery, [
                    require('crypto').randomUUID(),
                    teamUUID,
                    playerUUID,
                    role,
                    position
                ]);
            }
            
            // Create substitute players
            for (const sub of team.substitutes) {
                const subUUID = require('crypto').randomUUID();
                const discordId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                
                // Create mock user
                const createUserQuery = `
                    INSERT INTO users (id, user_id, discord_id, discord_username, created_at, updated_at)
                    VALUES ($1, $2, $3, $4, NOW(), NOW())
                `;
                
                await postgresService.query(createUserQuery, [
                    subUUID, 
                    `user_${discordId}`,
                    discordId,
                    sub.name
                ]);
                
                // Add as substitute
                const addSubQuery = `
                    INSERT INTO team_players (id, team_id, player_id, role, position, joined_at, accepted)
                    VALUES ($1, $2, $3, 'substitute', 'Flex', NOW(), true)
                `;
                
                await postgresService.query(addSubQuery, [
                    require('crypto').randomUUID(),
                    teamUUID,
                    subUUID
                ]);
            }
            
            // Update team with captain
            if (captainId) {
                const updateTeamQuery = `
                    UPDATE teams SET captain_id = $1 WHERE id = $2
                `;
                await postgresService.query(updateTeamQuery, [captainId, teamUUID]);
            }
            
            // Register team to tournament
            const registrationQuery = `
                INSERT INTO tournament_registrations (id, tournament_id, team_id, registered_by, registration_date, status, checked_in)
                VALUES ($1, $2, $3, $4, NOW(), 'confirmed', false)
            `;
            
            await postgresService.query(registrationQuery, [
                require('crypto').randomUUID(), tournamentId, teamUUID, userId
            ]);
            
            createdTeams.push({
                team_id: teamId,
                name: team.name,
                tag: team.tag,
                players: team.players.length,
                substitutes: team.substitutes.length,
                captain: team.players.find(p => p.isCaptain)?.name
            });
            
            logger.info(`Created team: ${team.name} with ${team.players.length} players, ${team.substitutes.length} substitutes`);
        }
        
        res.json({
            success: true,
            message: `Created ${createdTeams.length} test teams`,
            teams: createdTeams,
            tournament_id: tournamentId
        });
        
    } catch (error) {
        logger.error('Error creating test teams:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;