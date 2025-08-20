const express = require('express');
const postgresService = require('../services/postgresql');
const logger = require('../utils/logger');

const router = express.Router();

router.post('/create-for-tournament/:tournamentId', async (req, res) => {
    try {
        const tournamentId = req.params.tournamentId;
        logger.info(`Creating test teams for tournament: ${tournamentId}`);
        
        const teams = [
            { name: 'Team Alpha', tag: 'ALPH' },
            { name: 'Team Beta', tag: 'BETA' },
            { name: 'Team Gamma', tag: 'GAMM' },
            { name: 'Team Delta', tag: 'DELT' }
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
            
            const teamResult = await postgresService.query(createTeamQuery, [
                teamUUID, teamId, team.name, team.tag
            ]);
            
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
                tag: team.tag
            });
            
            logger.info(`Created and registered team: ${team.name}`);
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