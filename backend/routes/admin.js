const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const postgresService = require('../services/postgresql');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// Get admin dashboard statistics
router.get('/dashboard', requireAuth, requireAdmin, async (req, res) => {
  try {
    // Get tournament statistics
    const tournamentQuery = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'In Progress' THEN 1 END) as active,
        COUNT(CASE WHEN status = 'Completed' THEN 1 END) as completed,
        COUNT(CASE WHEN status IN ('Registration', 'Upcoming') THEN 1 END) as upcoming
      FROM tournaments
    `;
    const tournamentStats = await postgresService.query(tournamentQuery);

    // Get team statistics
    const teamQuery = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN confirmed = true THEN 1 END) as confirmed,
        COUNT(CASE WHEN confirmed = false THEN 1 END) as pending
      FROM teams
    `;
    const teamStats = await postgresService.query(teamQuery);

    // Get user statistics
    const userQuery = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN last_active > NOW() - INTERVAL '30 days' THEN 1 END) as active
      FROM users
    `;
    const userStats = await postgresService.query(userQuery);

    // Get registration statistics (as a proxy for matches for now)
    const registrationQuery = `
      SELECT COUNT(*) as total FROM tournament_registrations
    `;
    const registrationStats = await postgresService.query(registrationQuery);

    const stats = {
      tournaments: tournamentStats.rows[0],
      teams: teamStats.rows[0],
      users: userStats.rows[0],
      matches: {
        total: parseInt(registrationStats.rows[0].total),
        completed: 0, // TODO: implement when match system exists
        scheduled: 0  // TODO: implement when match system exists
      }
    };

    res.json(stats);
  } catch (error) {
    logger.error('Error getting admin dashboard:', error);
    res.status(500).json({ error: 'Failed to retrieve dashboard data' });
  }
});

// Get all users (admin only)
router.get('/users',
  requireAuth,
  requireAdmin,
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 })
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 50;
      const offset = (page - 1) * limit;

      const query = `
        SELECT 
          user_id,
          discord_username,
          email,
          is_admin,
          created_at,
          last_active,
          omeda_player_id
        FROM users 
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2
      `;
      
      const countQuery = `SELECT COUNT(*) as total FROM users`;
      
      const [users, totalCount] = await Promise.all([
        postgresService.query(query, [limit, offset]),
        postgresService.query(countQuery)
      ]);
      
      res.json({
        users: users.rows,
        pagination: {
          page,
          limit,
          total: parseInt(totalCount.rows[0].total),
          pages: Math.ceil(parseInt(totalCount.rows[0].total) / limit)
        }
      });
    } catch (error) {
      logger.error('Error getting users:', error);
      res.status(500).json({ error: 'Failed to retrieve users' });
    }
  }
);

// Update user (admin only)
router.put('/users/:id',
  requireAuth,
  requireAdmin,
  [
    param('id').isLength({ min: 1 }).trim(),
    body('isAdmin').optional().isBoolean(),
    body('discordUsername').optional().isLength({ min: 1, max: 50 }).trim().escape()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const { isAdmin } = req.body;

      const query = `
        UPDATE users 
        SET is_admin = $1 
        WHERE user_id = $2
        RETURNING user_id, discord_username, is_admin
      `;
      
      const result = await postgresService.query(query, [isAdmin, id]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      logger.info(`Admin ${req.user.userID} updated user ${id} admin status to ${isAdmin}`);
      
      res.json({
        message: `User ${isAdmin ? 'promoted to' : 'demoted from'} admin`,
        user: result.rows[0]
      });
    } catch (error) {
      logger.error('Error updating user:', error);
      res.status(500).json({ error: 'Failed to update user' });
    }
  }
);

// Get recent system activity
router.get('/activity', requireAuth, requireAdmin, async (req, res) => {
  try {
    // Get recent tournaments
    const tournamentActivity = await postgresService.query(`
      SELECT 
        'tournament_created' as type,
        'Tournament "' || name || '" was created' as description,
        created_at as timestamp
      FROM tournaments 
      ORDER BY created_at DESC 
      LIMIT 5
    `);

    // Get recent team registrations
    const teamActivity = await postgresService.query(`
      SELECT 
        'team_registered' as type,
        'Team "' || t.team_name || '" registered for tournament' as description,
        tr.registration_date as timestamp
      FROM tournament_registrations tr
      JOIN teams t ON tr.team_id = t.id
      ORDER BY tr.registration_date DESC 
      LIMIT 5
    `);

    // Get recent user registrations
    const userActivity = await postgresService.query(`
      SELECT 
        'user_joined' as type,
        'User "' || discord_username || '" joined the platform' as description,
        created_at as timestamp
      FROM users 
      ORDER BY created_at DESC 
      LIMIT 5
    `);

    // Combine and sort all activities
    const allActivity = [
      ...tournamentActivity.rows,
      ...teamActivity.rows,
      ...userActivity.rows
    ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
     .slice(0, 10);

    res.json(allActivity);
  } catch (error) {
    logger.error('Error fetching activity:', error);
    res.status(500).json({ error: 'Failed to fetch activity' });
  }
});

// Create new tournament (admin only)
router.post('/tournaments', requireAuth, requireAdmin, async (req, res) => {
  try {
    const {
      name,
      description,
      format,
      maxTeams,
      registrationStart,
      registrationEnd,
      tournamentStart,
      rules
    } = req.body;

    // Need to get the UUID id from the user_id string
    const userResult = await postgresService.query(
      'SELECT id FROM users WHERE user_id = $1',
      [req.user.userID]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(400).json({ error: 'User not found' });
    }
    
    const createdBy = userResult.rows[0].id;

    // Note: Using start_date for registration start and check_in_start for tournament start
    // since the database schema doesn't have separate registration dates
    const query = `
      INSERT INTO tournaments (
        tournament_id, name, description, bracket_type, 
        game_format, quarter_final_format, semi_final_format, grand_final_format,
        max_teams, start_date, check_in_start,
        status, created_by, registration_open, current_teams, check_in_enabled
      ) VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'Registration', $11, true, 0, false)
      RETURNING *
    `;

    // Set default game formats based on bracket type
    const gameFormat = 'Best of 3';
    const quarterFinalFormat = 'Best of 3';
    const semiFinalFormat = 'Best of 5';
    const grandFinalFormat = 'Best of 5';

    const values = [
      name, description || '', format, 
      gameFormat, quarterFinalFormat, semiFinalFormat, grandFinalFormat,
      maxTeams,
      registrationStart, tournamentStart,
      createdBy
    ];

    const result = await postgresService.query(query, values);
    
    logger.info(`Admin ${createdBy} created tournament: ${name}`);
    
    res.status(201).json({
      message: 'Tournament created successfully',
      tournament: result.rows[0]
    });
  } catch (error) {
    logger.error('Error creating tournament:', error);
    res.status(500).json({ error: 'Failed to create tournament' });
  }
});

// Get all tournaments (admin view with more details)
router.get('/tournaments', requireAuth, requireAdmin, async (req, res) => {
  try {
    const query = `
      SELECT 
        t.*,
        u.discord_username as creator_name,
        COUNT(tr.team_id) as registered_teams
      FROM tournaments t
      LEFT JOIN users u ON t.created_by = u.user_id
      LEFT JOIN tournament_registrations tr ON t.tournament_id = tr.tournament_id
      GROUP BY t.tournament_id, u.discord_username
      ORDER BY t.created_at DESC
    `;
    
    const result = await postgresService.query(query);
    
    res.json(result.rows);
  } catch (error) {
    logger.error('Error getting tournaments for admin:', error);
    res.status(500).json({ error: 'Failed to retrieve tournaments' });
  }
});

// Force update tournament status
router.put('/tournaments/:id/status',
  [
    param('id').isLength({ min: 1 }).trim(),
    body('status').isIn(['Planning', 'Registration', 'In Progress', 'Completed', 'Cancelled'])
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // TODO: Implement tournament status update
      logger.info(`Admin ${req.user.userID} updating tournament ${req.params.id} status to ${req.body.status}`);
      res.json({ message: 'Tournament status update endpoint - to be implemented' });
    } catch (error) {
      logger.error('Error updating tournament status:', error);
      res.status(500).json({ error: 'Failed to update tournament status' });
    }
  }
);

// Update tournament details (admin or creator)
router.put('/tournaments/:id', requireAuth, [
  param('id').isLength({ min: 1 }).trim(),
  body('name').optional().isLength({ min: 1, max: 255 }).trim(),
  body('description').optional().isLength({ max: 1000 }).trim(),
  body('bracket_type').optional().isIn(['Single Elimination', 'Double Elimination', 'Round Robin', 'Swiss']),
  body('game_format').optional().isIn(['Best of 1', 'Best of 3', 'Best of 5']),
  body('quarter_final_format').optional().isIn(['Best of 1', 'Best of 3', 'Best of 5']),
  body('semi_final_format').optional().isIn(['Best of 1', 'Best of 3', 'Best of 5']),
  body('grand_final_format').optional().isIn(['Best of 1', 'Best of 3', 'Best of 5']),
  body('max_teams').optional().isInt({ min: 2, max: 64 }),
  body('registration_open').optional().isBoolean(),
  body('status').optional().isIn(['Planning', 'Registration', 'In Progress', 'Completed', 'Cancelled']),
  body('start_date').optional().isISO8601().toDate(),
  body('registration_start').optional().isISO8601().toDate(),
  body('registration_end').optional().isISO8601().toDate()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id: tournamentId } = req.params;
    const userId = req.user.id || req.user.userID;

    // Get tournament to check permissions
    const tournamentQuery = `SELECT * FROM tournaments WHERE tournament_id = $1`;
    const tournamentResult = await postgresService.query(tournamentQuery, [tournamentId]);
    
    if (tournamentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    const tournament = tournamentResult.rows[0];

    // Check permissions - admin or creator
    const isAdmin = req.user.role === 'admin';
    const isCreator = tournament.created_by === userId || tournament.created_by === req.user.id;

    if (!isAdmin && !isCreator) {
      return res.status(403).json({ error: 'Only tournament creators and administrators can edit tournaments' });
    }

    // Build update query dynamically
    const allowedFields = [
      'name', 'description', 'bracket_type', 'game_format', 
      'quarter_final_format', 'semi_final_format', 'grand_final_format',
      'max_teams', 'registration_open', 'status', 'start_date', 
      'registration_start', 'registration_end'
    ];

    const updates = {};
    const values = [];
    let paramIndex = 1;

    for (const field of allowedFields) {
      if (req.body.hasOwnProperty(field)) {
        updates[field] = `$${paramIndex}`;
        values.push(req.body[field]);
        paramIndex++;
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    const updateQuery = `
      UPDATE tournaments 
      SET ${Object.keys(updates).map(key => `${key} = ${updates[key]}`).join(', ')}, 
          updated_at = NOW()
      WHERE tournament_id = $${paramIndex}
      RETURNING *
    `;
    values.push(tournamentId);

    const result = await postgresService.query(updateQuery, values);

    logger.info(`User ${userId} updated tournament ${tournamentId}: ${Object.keys(updates).join(', ')}`);
    
    res.json({
      message: 'Tournament updated successfully',
      tournament: result.rows[0]
    });
  } catch (error) {
    logger.error('Error updating tournament:', error);
    res.status(500).json({ error: 'Failed to update tournament' });
  }
});

// Get system logs
router.get('/logs',
  [
    query('level').optional().isIn(['error', 'warn', 'info', 'debug']),
    query('limit').optional().isInt({ min: 1, max: 1000 })
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // TODO: Implement log retrieval
      res.json({ message: 'System logs endpoint - to be implemented' });
    } catch (error) {
      logger.error('Error getting system logs:', error);
      res.status(500).json({ error: 'Failed to retrieve system logs' });
    }
  }
);

// Manage heroes (enable/disable for drafts)
router.put('/heroes/:id',
  [
    param('id').isLength({ min: 1 }).trim(),
    body('enabled').isBoolean()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // TODO: Implement hero enable/disable
      logger.info(`Admin ${req.user.userID} ${req.body.enabled ? 'enabled' : 'disabled'} hero ${req.params.id}`);
      res.json({ message: 'Hero management endpoint - to be implemented' });
    } catch (error) {
      logger.error('Error managing hero:', error);
      res.status(500).json({ error: 'Failed to manage hero' });
    }
  }
);

// Emergency stop draft
router.post('/drafts/:id/emergency-stop',
  [param('id').isLength({ min: 1 }).trim()],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // TODO: Implement emergency draft stop
      logger.warn(`Admin ${req.user.userID} performed emergency stop on draft ${req.params.id}`);
      
      // Broadcast emergency stop to all draft participants
      const io = req.app.get('io');
      io.to(`draft-${req.params.id}`).emit('emergency-stop', {
        reason: 'Emergency stop by administrator',
        timestamp: new Date().toISOString()
      });

      res.json({ message: 'Emergency draft stop executed' });
    } catch (error) {
      logger.error('Error performing emergency stop:', error);
      res.status(500).json({ error: 'Failed to perform emergency stop' });
    }
  }
);

// Backup database
router.post('/backup', async (req, res) => {
  try {
    // TODO: Implement database backup
    logger.info(`Database backup initiated by admin ${req.user.userID}`);
    res.json({ message: 'Database backup endpoint - to be implemented' });
  } catch (error) {
    logger.error('Error creating backup:', error);
    res.status(500).json({ error: 'Failed to create backup' });
  }
});

module.exports = router;