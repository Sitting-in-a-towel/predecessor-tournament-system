const express = require('express');
const postgresService = require('../services/postgresql');
const logger = require('../utils/logger');

const router = express.Router();

// Create a test draft session for any tournament
router.post('/create-test-draft/:tournamentId', async (req, res) => {
  try {
    const { tournamentId } = req.params;
    
    console.log('Creating test draft for tournament:', tournamentId);
    
    // Get tournament info
    const tournamentQuery = `SELECT * FROM tournaments WHERE id = $1`;
    const tournamentResult = await postgresService.query(tournamentQuery, [tournamentId]);
    
    if (tournamentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Tournament not found' });
    }
    
    const tournament = tournamentResult.rows[0];
    
    // Get some teams (any teams will do for testing)
    const teamsQuery = `SELECT * FROM teams LIMIT 2`;
    const teamsResult = await postgresService.query(teamsQuery, []);
    
    if (teamsResult.rows.length < 2) {
      return res.status(400).json({ error: 'Need at least 2 teams to create a draft' });
    }
    
    const team1 = teamsResult.rows[0];
    const team2 = teamsResult.rows[1];
    
    // Create draft session
    const insertQuery = `
      INSERT INTO draft_sessions (
        tournament_id, 
        team1_id, 
        team2_id, 
        match_id,
        status,
        draft_configuration,
        session_state,
        draft_result
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    
    const draftConfig = {
      timer_enabled: true,
      timer_strategy: "30s_per_round",
      bonus_time: "disabled", 
      coin_toss_enabled: true,
      ban_count: 2,
      strategy: "restricted_no_mirror"
    };
    
    const sessionState = {
      captains_present: false,
      current_phase: "waiting",
      current_turn: null,
      timer_remaining: null
    };
    
    const draftResult = {
      team1_picks: [],
      team2_picks: [],
      team1_bans: [],
      team2_bans: [],
      completed: false
    };
    
    const result = await postgresService.query(insertQuery, [
      tournament.id,
      team1.id,
      team2.id,
      `test_match_${Date.now()}`,
      'waiting',
      JSON.stringify(draftConfig),
      JSON.stringify(sessionState),
      JSON.stringify(draftResult)
    ]);
    
    const createdDraft = result.rows[0];
    
    logger.info(`Test draft created: ${createdDraft.id} for tournament ${tournament.name}`);
    
    res.json({
      success: true,
      message: 'Test draft session created successfully',
      draft: {
        id: createdDraft.id,
        tournament_name: tournament.name,
        team1_name: team1.team_name,
        team2_name: team2.team_name,
        status: createdDraft.status,
        created_at: createdDraft.created_at
      }
    });
    
  } catch (error) {
    logger.error('Error creating test draft:', error);
    res.status(500).json({ 
      error: 'Failed to create test draft',
      details: error.message 
    });
  }
});

module.exports = router;