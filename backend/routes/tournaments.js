const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const postgresService = require('../services/postgresql');
const logger = require('../utils/logger');

const router = express.Router();

// Get all tournaments (public endpoint)
router.get('/', 
  [
    query('status').optional().isIn(['Planning', 'Registration', 'In Progress', 'Completed', 'Cancelled']),
    query('bracketType').optional().isIn(['Single Elimination', 'Double Elimination', 'Round Robin', 'Swiss'])
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const filters = {};
      if (req.query.status) filters.status = req.query.status;
      if (req.query.bracketType) filters.bracketType = req.query.bracketType;

      const tournaments = await postgresService.getTournaments(filters);
      
      logger.info(`Retrieved ${tournaments.length} tournaments`);
      res.json(tournaments);
    } catch (error) {
      logger.error('Error getting tournaments:', error);
      res.status(500).json({ error: 'Failed to retrieve tournaments' });
    }
  }
);

// Get specific tournament by ID (public endpoint)
router.get('/:id',
  [param('id').isLength({ min: 1 }).trim()],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const tournament = await postgresService.getTournamentById(req.params.id);
      
      if (!tournament) {
        return res.status(404).json({ error: 'Tournament not found' });
      }
      
      res.json(tournament);
    } catch (error) {
      logger.error('Error getting tournament:', error);
      res.status(500).json({ error: 'Failed to retrieve tournament' });
    }
  }
);

// Create new tournament (authenticated users only)
router.post('/',
  requireAuth,
  [
    body('name').isLength({ min: 3, max: 100 }).trim().escape(),
    body('description').optional().isLength({ max: 1000 }).trim().escape(),
    body('bracketType').isIn(['Single Elimination', 'Double Elimination', 'Round Robin', 'Swiss']),
    body('gameFormat').isIn(['Best of 1', 'Best of 3', 'Best of 5']),
    body('quarterFinalFormat').optional().isIn(['Best of 1', 'Best of 3', 'Best of 5']),
    body('semiFinalFormat').optional().isIn(['Best of 1', 'Best of 3', 'Best of 5']),
    body('grandFinalFormat').optional().isIn(['Best of 1', 'Best of 3', 'Best of 5']),
    body('maxTeams').isInt({ min: 2, max: 64 }),
    body('startDate').isISO8601().toDate(),
    body('endDate').optional({ nullable: true, checkFalsy: true }).isISO8601().toDate()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.error('Tournament validation errors:', errors.array());
        return res.status(400).json({ errors: errors.array() });
      }

      logger.info('Creating tournament with data:', req.body);
      logger.info('User object:', req.user);
      
      // Get user's PostgreSQL UUID
      let userUUID = req.user.id;
      if (!userUUID && req.user.userID) {
        logger.info('Looking up user by userID:', req.user.userID);
        const userRecord = await postgresService.getUserById(req.user.userID);
        logger.info('Found user record:', userRecord);
        userUUID = userRecord?.id;
      }
      
      if (!userUUID) {
        logger.error('No user UUID found for tournament creation');
        return res.status(400).json({ error: 'User authentication error' });
      }

      const tournamentData = {
        tournament_id: `tour_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: req.body.name,
        description: req.body.description || '',
        bracket_type: req.body.bracketType,
        game_format: req.body.gameFormat,
        quarter_final_format: req.body.quarterFinalFormat || req.body.gameFormat,
        semi_final_format: req.body.semiFinalFormat || req.body.gameFormat,
        grand_final_format: req.body.grandFinalFormat || req.body.gameFormat,
        max_teams: req.body.maxTeams,
        start_date: req.body.startDate,
        end_date: req.body.endDate || null,
        created_by: userUUID,
        status: 'Registration',
        is_public: true
      };

      logger.info('Sending tournament data to PostgreSQL:', tournamentData);
      const tournament = await postgresService.createTournament(tournamentData);
      
      logger.info(`Tournament created: ${tournament.tournament_id} by user ${req.user.userID}`);
      res.status(201).json(tournament);
    } catch (error) {
      logger.error('Error creating tournament:', error);
      res.status(500).json({ error: 'Failed to create tournament' });
    }
  }
);

// Update tournament (admin or creator only)
router.put('/:id',
  requireAuth,
  [
    param('id').isLength({ min: 1 }).trim(),
    body('name').optional().isLength({ min: 3, max: 100 }).trim().escape(),
    body('description').optional().isLength({ max: 1000 }).trim().escape(),
    body('status').optional().isIn(['Planning', 'Registration', 'In Progress', 'Completed', 'Cancelled']),
    body('registrationOpen').optional().isBoolean()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // TODO: Implement tournament update logic
      // - Check if user is admin or tournament creator
      // - Update tournament in Airtable
      
      res.json({ message: 'Tournament update endpoint - to be implemented' });
    } catch (error) {
      logger.error('Error updating tournament:', error);
      res.status(500).json({ error: 'Failed to update tournament' });
    }
  }
);

// Delete tournament (admin only)
router.delete('/:id',
  requireAdmin,
  [param('id').isLength({ min: 1 }).trim()],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // Check if tournament exists first
      const tournament = await postgresService.getTournamentById(req.params.id);
      if (!tournament) {
        return res.status(404).json({ error: 'Tournament not found' });
      }

      // Delete the tournament and all related data
      const deletedTournament = await postgresService.deleteTournament(req.params.id);
      
      logger.info(`Tournament ${req.params.id} deleted by admin ${req.user.id}`);
      res.json({ 
        message: 'Tournament deleted successfully',
        tournament: deletedTournament 
      });
    } catch (error) {
      logger.error('Error deleting tournament:', error);
      res.status(500).json({ error: 'Failed to delete tournament' });
    }
  }
);

// Get tournament teams
router.get('/:id/teams',
  [param('id').isLength({ min: 1 }).trim()],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const teams = await postgresService.getTeamsByTournament(req.params.id);
      
      logger.info(`Retrieved ${teams.length} teams for tournament ${req.params.id}`);
      res.json(teams);
    } catch (error) {
      logger.error('Error getting tournament teams:', error);
      res.status(500).json({ error: 'Failed to retrieve tournament teams' });
    }
  }
);

// Team check-in for tournament
router.post('/:id/checkin',
  requireAuth,
  [param('id').isLength({ min: 1 }).trim()],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const tournamentId = req.params.id;
      const userID = req.user.userID;

      // Get user's Airtable record ID
      const userRecord = await airtableService.getUserByID(userID);
      if (!userRecord) {
        return res.status(400).json({ error: 'User record not found' });
      }

      // Find user's teams in this tournament
      const teams = await airtableService.getTeamsByTournament(tournamentId);
      const userTeams = teams.filter(team => {
        const isCaptain = team.Captain && team.Captain.includes(userRecord.recordId);
        const isPlayer = team.Players && team.Players.includes(userRecord.recordId);
        return isCaptain || isPlayer;
      });

      if (userTeams.length === 0) {
        return res.status(403).json({ error: 'You are not part of any team in this tournament' });
      }

      // Only team captains can check in
      const captainTeams = userTeams.filter(team => 
        team.Captain && team.Captain.includes(userRecord.recordId)
      );

      if (captainTeams.length === 0) {
        return res.status(403).json({ error: 'Only team captains can check in for their team' });
      }

      const team = captainTeams[0]; // User should only captain one team per tournament

      // Check if team is confirmed
      if (!team.Confirmed) {
        return res.status(400).json({ error: 'Team must be confirmed before checking in' });
      }

      // Check if already checked in
      if (team.CheckedIn) {
        return res.status(400).json({ error: 'Team is already checked in' });
      }

      // Perform check-in
      await airtableService.updateTeam(team.recordId, {
        CheckedIn: true,
        CheckInTime: new Date().toISOString()
      });

      logger.info(`Team ${team.TeamName} (${team.TeamID}) checked in for tournament ${tournamentId} by captain ${userID}`);
      res.json({ 
        message: 'Team successfully checked in for tournament',
        team: {
          TeamID: team.TeamID,
          TeamName: team.TeamName,
          CheckedIn: true,
          CheckInTime: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Error checking in team:', error);
      res.status(500).json({ error: 'Failed to check in team' });
    }
  }
);

// Get tournament check-in status
router.get('/:id/checkin-status',
  [param('id').isLength({ min: 1 }).trim()],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const tournamentId = req.params.id;
      const teams = await airtableService.getTeamsByTournament(tournamentId);
      
      const checkinStatus = teams.map(team => ({
        TeamID: team.TeamID,
        TeamName: team.TeamName,
        Confirmed: team.Confirmed || false,
        CheckedIn: team.CheckedIn || false,
        CheckInTime: team.CheckInTime || null,
        PlayerCount: team.Players?.length || 0
      }));

      const totalTeams = teams.length;
      const confirmedTeams = teams.filter(team => team.Confirmed).length;
      const checkedInTeams = teams.filter(team => team.CheckedIn).length;

      logger.info(`Check-in status for tournament ${tournamentId}: ${checkedInTeams}/${confirmedTeams} teams checked in`);
      res.json({
        tournamentId,
        summary: {
          totalTeams,
          confirmedTeams,
          checkedInTeams,
          readyToStart: checkedInTeams >= 2 // Minimum for tournament
        },
        teams: checkinStatus
      });
    } catch (error) {
      logger.error('Error getting check-in status:', error);
      res.status(500).json({ error: 'Failed to retrieve check-in status' });
    }
  }
);

// Admin: Force check-in status
router.put('/:id/teams/:teamId/checkin',
  requireAdmin,
  [
    param('id').isLength({ min: 1 }).trim(),
    param('teamId').isLength({ min: 1 }).trim(),
    body('checkedIn').isBoolean()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id: tournamentId, teamId } = req.params;
      const { checkedIn } = req.body;

      // Find the team
      const teams = await airtableService.getTeamsByTournament(tournamentId);
      const team = teams.find(t => t.TeamID === teamId);

      if (!team) {
        return res.status(404).json({ error: 'Team not found in this tournament' });
      }

      // Update check-in status
      const updates = { CheckedIn: checkedIn };
      if (checkedIn) {
        updates.CheckInTime = new Date().toISOString();
      } else {
        updates.CheckInTime = null;
      }

      await airtableService.updateTeam(team.recordId, updates);

      logger.info(`Admin ${req.user.userID} ${checkedIn ? 'checked in' : 'unchecked'} team ${team.TeamName} for tournament ${tournamentId}`);
      res.json({ 
        message: `Team ${checkedIn ? 'checked in' : 'check-in removed'} successfully`,
        team: {
          TeamID: team.TeamID,
          TeamName: team.TeamName,
          CheckedIn: checkedIn,
          CheckInTime: updates.CheckInTime
        }
      });
    } catch (error) {
      logger.error('Error updating team check-in status:', error);
      res.status(500).json({ error: 'Failed to update check-in status' });
    }
  }
);

// Get tournament check-in status (for Check-In tab)
router.get('/:tournamentId/check-in-status', async (req, res) => {
  try {
    const { tournamentId } = req.params;

    // Get tournament info
    const tournamentQuery = `
      SELECT name, status, check_in_enabled, check_in_start, start_date 
      FROM tournaments 
      WHERE tournament_id = $1
    `;
    const tournamentResult = await postgresService.query(tournamentQuery, [tournamentId]);
    
    if (tournamentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    const tournament = tournamentResult.rows[0];

    // Get all registered teams with check-in status
    // Need to get tournament's primary key (id) to query registrations
    const tournamentPK = await postgresService.query(
      'SELECT id FROM tournaments WHERE tournament_id = $1',
      [tournamentId]
    );
    
    if (tournamentPK.rows.length === 0) {
      return res.status(404).json({ error: 'Tournament not found' });
    }
    
    const teamsQuery = `
      SELECT 
        t.team_id,
        t.team_name,
        tr.status,
        tr.check_in_time,
        tr.checked_in,
        u.discord_username as captain_username,
        5 as player_count
      FROM tournament_registrations tr
      JOIN teams t ON tr.team_id = t.id
      JOIN users u ON t.captain_id = u.id
      WHERE tr.tournament_id = $1
      ORDER BY t.team_name
    `;
    const teamsResult = await postgresService.query(teamsQuery, [tournamentPK.rows[0].id]);

    // Calculate summary statistics
    const totalTeams = teamsResult.rows.length;
    const confirmedTeams = teamsResult.rows.filter(team => team.status === 'registered').length;
    const checkedInTeams = teamsResult.rows.filter(team => team.checked_in).length;
    const readyToStart = checkedInTeams >= 2; // Minimum teams for tournament

    const teams = teamsResult.rows.map(team => ({
      team_id: team.team_id,
      team_name: team.team_name,
      captain_username: team.captain_username,
      status: team.status,
      checked_in: team.checked_in,
      check_in_time: team.check_in_time,
      player_count: team.player_count,
      confirmed: team.status === 'registered'
    }));

    res.json({
      tournament: {
        name: tournament.name,
        status: tournament.status,
        check_in_enabled: tournament.check_in_enabled,
        check_in_start: tournament.check_in_start,
        start_date: tournament.start_date
      },
      summary: {
        totalTeams,
        confirmedTeams,
        checkedInTeams,
        readyToStart
      },
      teams
    });

  } catch (error) {
    logger.error('Error getting check-in status:', error);
    res.status(500).json({ error: 'Failed to get check-in status' });
  }
});

// Team check-in endpoint (for team captains)
router.post('/:tournamentId/check-in', requireAuth, async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const userId = req.user.id;

    // Get tournament primary key first
    const tournamentPK = await postgresService.query(
      'SELECT id FROM tournaments WHERE tournament_id = $1',
      [tournamentId]
    );
    
    if (tournamentPK.rows.length === 0) {
      return res.status(404).json({ error: 'Tournament not found' });
    }
    
    // Find user's team for this tournament
    const teamQuery = `
      SELECT t.id, t.team_id, t.team_name, tr.status, tr.checked_in
      FROM teams t
      JOIN tournament_registrations tr ON tr.team_id = t.id
      WHERE t.captain_id = $1 AND tr.tournament_id = $2
    `;
    const teamResult = await postgresService.query(teamQuery, [userId, tournamentPK.rows[0].id]);

    if (teamResult.rows.length === 0) {
      return res.status(404).json({ error: 'No team found for this tournament' });
    }

    const team = teamResult.rows[0];

    // Check if team is confirmed/registered
    if (team.status !== 'registered') {
      return res.status(400).json({ error: 'Team must be confirmed before checking in' });
    }

    // Check if already checked in
    if (team.checked_in) {
      return res.status(400).json({ error: 'Team is already checked in' });
    }

    // Update check-in status
    const updateQuery = `
      UPDATE tournament_registrations 
      SET checked_in = true, check_in_time = NOW()
      WHERE tournament_id = $1 AND team_id = $2
      RETURNING check_in_time
    `;
    const updateResult = await postgresService.query(updateQuery, [tournamentPK.rows[0].id, team.id]);

    logger.info(`Team ${team.team_name} checked in for tournament ${tournamentId} by captain ${req.user.discord_username}`);

    res.json({
      message: 'Successfully checked in for tournament',
      team: {
        team_id: team.team_id,
        team_name: team.team_name,
        checked_in: true,
        check_in_time: updateResult.rows[0].check_in_time
      }
    });

  } catch (error) {
    logger.error('Error checking in team:', error);
    res.status(500).json({ error: 'Failed to check in team' });
  }
});

// Admin toggle check-in (for admins to manually check in/out teams)
router.post('/:tournamentId/admin-toggle-checkin/:teamId', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { tournamentId, teamId } = req.params;
    const { checked_in } = req.body;

    // Get tournament primary key first
    const tournamentPK = await postgresService.query(
      'SELECT id FROM tournaments WHERE tournament_id = $1',
      [tournamentId]
    );
    
    if (tournamentPK.rows.length === 0) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    // Get team info
    const teamQuery = `
      SELECT t.team_id, t.team_name, tr.status, tr.checked_in
      FROM teams t
      JOIN tournament_registrations tr ON tr.team_id = t.id
      WHERE t.team_id = $1 AND tr.tournament_id = $2
    `;
    const teamResult = await postgresService.query(teamQuery, [teamId, tournamentPK.rows[0].id]);

    if (teamResult.rows.length === 0) {
      return res.status(404).json({ error: 'Team not found in this tournament' });
    }

    const team = teamResult.rows[0];

    // Check if team is confirmed/registered
    if (team.status !== 'registered') {
      return res.status(400).json({ error: 'Team must be confirmed before checking in' });
    }

    // Update check-in status
    const updateQuery = `
      UPDATE tournament_registrations 
      SET checked_in = $1, check_in_time = ${checked_in ? 'NOW()' : 'NULL'}
      WHERE tournament_id = $2 AND team_id = (SELECT id FROM teams WHERE team_id = $3)
      RETURNING check_in_time
    `;
    const updateResult = await postgresService.query(updateQuery, [checked_in, tournamentPK.rows[0].id, teamId]);

    logger.info(`Admin ${req.user.discord_username} ${checked_in ? 'checked in' : 'unchecked'} team ${team.team_name} for tournament ${tournamentId}`);

    res.json({
      message: `Team ${checked_in ? 'checked in' : 'check-in removed'} successfully`,
      team: {
        team_id: team.team_id,
        team_name: team.team_name,
        checked_in: checked_in,
        check_in_time: updateResult.rows[0]?.check_in_time || null
      }
    });

  } catch (error) {
    logger.error('Error updating team check-in status:', error);
    res.status(500).json({ error: 'Failed to update check-in status' });
  }
});

module.exports = router;