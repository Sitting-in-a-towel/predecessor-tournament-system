const postgresService = require('./postgresql');
const logger = require('../utils/logger');

class DraftDatabaseService {
  // Create a new draft session
  async createDraftSession(tournamentId, matchId, team1Id, team2Id, team1CaptainId, team2CaptainId, configuration = {}) {
    try {
      const defaultConfig = {
        timer_enabled: true,
        timer_strategy: "20s_per_pick",
        bonus_time: "disabled", 
        coin_toss_enabled: true,
        ban_count: 2,
        strategy: "restricted_no_mirror"
      };

      const finalConfig = { ...defaultConfig, ...configuration };

      const result = await postgresService.query(
        `INSERT INTO draft_sessions (
          tournament_id, match_id, team1_id, team2_id, 
          team1_captain_id, team2_captain_id, draft_configuration
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *`,
        [tournamentId, matchId, team1Id, team2Id, team1CaptainId, team2CaptainId, JSON.stringify(finalConfig)]
      );

      logger.info(`Created draft session ${result.rows[0].id} for match ${matchId}`);
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating draft session:', error);
      throw error;
    }
  }

  // Get draft session by ID
  async getDraftSession(sessionId) {
    try {
      const result = await postgresService.query(
        `SELECT ds.*, 
         t1.team_id as team1_name, t2.team_id as team2_name,
         u1.user_id as team1_captain_name, u2.user_id as team2_captain_name
         FROM draft_sessions ds
         LEFT JOIN teams t1 ON ds.team1_id = t1.id
         LEFT JOIN teams t2 ON ds.team2_id = t2.id  
         LEFT JOIN users u1 ON ds.team1_captain_id = u1.id
         LEFT JOIN users u2 ON ds.team2_captain_id = u2.id
         WHERE ds.id = $1`,
        [sessionId]
      );

      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error getting draft session:', error);
      throw error;
    }
  }

  // Find or create draft session for tournament match
  async findOrCreateDraftSession(tournamentId, matchId, team1Id, team2Id, team1CaptainId, team2CaptainId) {
    try {
      // First try to find existing session
      const existing = await postgresService.query(
        `SELECT * FROM draft_sessions 
         WHERE tournament_id = $1 AND match_id = $2 
         AND status IN ('waiting', 'coin_toss', 'drafting')`,
        [tournamentId, matchId]
      );

      if (existing.rows.length > 0) {
        logger.info(`Found existing draft session ${existing.rows[0].id} for match ${matchId}`);
        return existing.rows[0];
      }

      // Create new session
      return await this.createDraftSession(tournamentId, matchId, team1Id, team2Id, team1CaptainId, team2CaptainId);
    } catch (error) {
      logger.error('Error finding/creating draft session:', error);
      throw error;
    }
  }

  // Update session state
  async updateSessionState(sessionId, stateUpdates) {
    try {
      const result = await postgresService.query(
        `UPDATE draft_sessions 
         SET session_state = COALESCE(session_state, '{}') || $2,
             updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [sessionId, JSON.stringify(stateUpdates)]
      );

      return result.rows[0];
    } catch (error) {
      logger.error('Error updating session state:', error);
      throw error;
    }
  }

  // Update coin toss result
  async updateCoinTossResult(sessionId, coinTossData) {
    try {
      const result = await postgresService.query(
        `UPDATE draft_sessions 
         SET coin_toss_result = $2,
             updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [sessionId, JSON.stringify(coinTossData)]
      );

      return result.rows[0];
    } catch (error) {
      logger.error('Error updating coin toss result:', error);
      throw error;
    }
  }

  // Add participant to session
  async addParticipant(sessionId, userId, teamNumber) {
    try {
      const result = await postgresService.query(
        `INSERT INTO draft_participants (session_id, user_id, team_number, is_present, joined_at, last_active)
         VALUES ($1, $2, $3, true, NOW(), NOW())
         ON CONFLICT (session_id, user_id) 
         DO UPDATE SET is_present = true, joined_at = NOW(), last_active = NOW()
         RETURNING *`,
        [sessionId, userId, teamNumber]
      );

      return result.rows[0];
    } catch (error) {
      logger.error('Error adding participant:', error);
      throw error;
    }
  }

  // Update participant presence
  async updateParticipantPresence(sessionId, userId, isPresent) {
    try {
      await postgresService.query(
        `UPDATE draft_participants 
         SET is_present = $3, last_active = NOW()
         WHERE session_id = $1 AND user_id = $2`,
        [sessionId, userId, isPresent]
      );
    } catch (error) {
      logger.error('Error updating participant presence:', error);
      throw error;
    }
  }

  // Get session participants
  async getSessionParticipants(sessionId) {
    try {
      const result = await postgresService.query(
        `SELECT dp.*, u.user_id as username, u.discord_username
         FROM draft_participants dp
         JOIN users u ON dp.user_id = u.id
         WHERE dp.session_id = $1
         ORDER BY dp.team_number`,
        [sessionId]
      );

      return result.rows;
    } catch (error) {
      logger.error('Error getting session participants:', error);
      throw error;
    }
  }

  // Log draft action
  async logAction(sessionId, userId, actionType, actionData = {}, phase = null, teamNumber = null, heroId = null) {
    try {
      const result = await postgresService.query(
        `INSERT INTO draft_actions (
          session_id, user_id, action_type, action_data, 
          phase, team_number, hero_id, timestamp
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        RETURNING *`,
        [sessionId, userId, actionType, JSON.stringify(actionData), phase, teamNumber, heroId]
      );

      return result.rows[0];
    } catch (error) {
      logger.error('Error logging draft action:', error);
      throw error;
    }
  }

  // Get draft action history
  async getActionHistory(sessionId, limit = 50) {
    try {
      const result = await postgresService.query(
        `SELECT da.*, u.user_id as username
         FROM draft_actions da
         LEFT JOIN users u ON da.user_id = u.id
         WHERE da.session_id = $1
         ORDER BY da.timestamp DESC
         LIMIT $2`,
        [sessionId, limit]
      );

      return result.rows;
    } catch (error) {
      logger.error('Error getting action history:', error);
      throw error;
    }
  }

  // Get all heroes
  async getAllHeroes(roleFilter = null) {
    try {
      let query = `SELECT * FROM heroes WHERE is_active = true`;
      let params = [];

      if (roleFilter) {
        query += ` AND role = $1`;
        params.push(roleFilter);
      }

      query += ` ORDER BY role, name`;

      const result = await postgresService.query(query, params);
      return result.rows;
    } catch (error) {
      logger.error('Error getting heroes:', error);
      throw error;
    }
  }

  // Update draft result (picks/bans)
  async updateDraftResult(sessionId, draftData) {
    try {
      const result = await postgresService.query(
        `UPDATE draft_sessions 
         SET draft_result = $2,
             updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [sessionId, JSON.stringify(draftData)]
      );

      return result.rows[0];
    } catch (error) {
      logger.error('Error updating draft result:', error);
      throw error;
    }
  }

  // Complete draft session
  async completeDraftSession(sessionId, matchCode = null) {
    try {
      const result = await postgresService.query(
        `UPDATE draft_sessions 
         SET status = 'completed',
             completed_at = NOW(),
             match_code = $2,
             session_state = COALESCE(session_state, '{}') || '{"current_phase": "completed"}',
             updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [sessionId, matchCode]
      );

      return result.rows[0];
    } catch (error) {
      logger.error('Error completing draft session:', error);
      throw error;
    }
  }

  // Cancel draft session
  async cancelDraftSession(sessionId, reason = null) {
    try {
      await this.logAction(sessionId, null, 'cancel', { reason }, 'cancelled');

      const result = await postgresService.query(
        `UPDATE draft_sessions 
         SET status = 'cancelled',
             session_state = COALESCE(session_state, '{}') || '{"current_phase": "cancelled"}',
             updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [sessionId]
      );

      return result.rows[0];
    } catch (error) {
      logger.error('Error cancelling draft session:', error);
      throw error;
    }
  }

  // Get active draft sessions
  async getActiveDraftSessions() {
    try {
      const result = await postgresService.query(
        `SELECT ds.*, 
         t1.team_id as team1_name, t2.team_id as team2_name,
         COUNT(dp.id) as participant_count
         FROM draft_sessions ds
         LEFT JOIN teams t1 ON ds.team1_id = t1.id
         LEFT JOIN teams t2 ON ds.team2_id = t2.id
         LEFT JOIN draft_participants dp ON ds.id = dp.session_id AND dp.is_present = true
         WHERE ds.status IN ('waiting', 'coin_toss', 'drafting')
         GROUP BY ds.id, t1.team_id, t2.team_id
         ORDER BY ds.created_at DESC`,
        []
      );

      return result.rows;
    } catch (error) {
      logger.error('Error getting active draft sessions:', error);
      throw error;
    }
  }

  // Cleanup old sessions (for maintenance)
  async cleanupOldSessions(daysOld = 7) {
    try {
      const result = await postgresService.query(
        `UPDATE draft_sessions 
         SET status = 'cancelled'
         WHERE status IN ('waiting', 'coin_toss') 
         AND created_at < NOW() - INTERVAL '${daysOld} days'
         RETURNING id`,
        []
      );

      logger.info(`Cleaned up ${result.rows.length} old draft sessions`);
      return result.rows.length;
    } catch (error) {
      logger.error('Error cleaning up old sessions:', error);
      throw error;
    }
  }
}

module.exports = new DraftDatabaseService();