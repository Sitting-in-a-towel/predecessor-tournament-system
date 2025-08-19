const logger = require('../utils/logger');
const postgresService = require('./postgresql');

class DraftSocketService {
  constructor(io) {
    this.io = io;
    this.connectedCaptains = new Map(); // Track connected captains by session ID
  }

  // Initialize socket handlers
  initialize() {
    this.io.on('connection', (socket) => {
      logger.info(`Draft socket connected: ${socket.id}`);

      // Captain joins draft session
      socket.on('join-draft-session', async (data) => {
        try {
          logger.info(`Received join-draft-session from ${socket.id}:`, data);
          await this.handleCaptainJoin(socket, data);
        } catch (error) {
          logger.error(`Error in join-draft-session for ${socket.id}:`, error);
          socket.emit('draft-error', { 
            message: 'Failed to join draft session',
            error: error.message 
          });
        }
      });

      // Captain leaves draft session
      socket.on('leave-draft-session', async (data) => {
        try {
          await this.handleCaptainLeave(socket, data);
        } catch (error) {
          logger.error(`Error in leave-draft-session for ${socket.id}:`, error);
        }
      });

      // Coin toss selection
      socket.on('coin-toss-selection', async (data) => {
        try {
          logger.info(`Received coin-toss-selection from ${socket.id}:`, data);
          await this.handleCoinTossSelection(socket, data);
        } catch (error) {
          logger.error(`Error in coin-toss-selection for ${socket.id}:`, error);
          socket.emit('coin-toss-error', { 
            message: 'Failed to process coin toss selection',
            error: error.message 
          });
        }
      });

      // Hero pick/ban action
      socket.on('draft-action', async (data) => {
        try {
          await this.handleDraftAction(socket, data);
        } catch (error) {
          logger.error(`Error in draft-action for ${socket.id}:`, error);
        }
      });

      // Captain presence heartbeat
      socket.on('captain-heartbeat', async (data) => {
        try {
          await this.handleCaptainHeartbeat(socket, data);
        } catch (error) {
          logger.error(`Error in captain-heartbeat for ${socket.id}:`, error);
        }
      });

      // Disconnection handler
      socket.on('disconnect', () => {
        try {
          this.handleDisconnection(socket);
        } catch (error) {
          logger.error(`Error in disconnect handler for ${socket.id}:`, error);
        }
      });
    });
  }

  // Handle captain joining draft session
  async handleCaptainJoin(socket, { sessionId, userId, teamNumber }) {
    try {
      logger.info(`User ${userId || 'unknown'} joining draft session ${sessionId} as team ${teamNumber}`);

      // Join socket room
      socket.join(`draft-${sessionId}`);
      
      // Check if user is admin - admins can join as any team
      let canJoinAsTeam = true;
      if (userId) {
        const userResult = await postgresService.query(
          'SELECT is_admin FROM users WHERE id = $1',
          [userId]
        );
        const isAdmin = userResult.rows.length > 0 && userResult.rows[0].is_admin === true;
        
        if (!isAdmin) {
          // For non-admins, verify they're actually a member of this team
          const session = await this.getDraftSession(sessionId);
          const teamMemberResult = await postgresService.query(
            `SELECT 1 FROM teams WHERE id = $1 AND $2 = ANY(team_members)`,
            [teamNumber === 1 ? session.team1_id : session.team2_id, userId]
          );
          canJoinAsTeam = teamMemberResult.rows.length > 0;
        }
      }
      
      if (!canJoinAsTeam) {
        socket.emit('draft-error', { 
          message: 'You are not authorized to join as this team' 
        });
        return;
      }
      
      // Store connection info - use socket ID as fallback if no userId
      const captainKey = `${sessionId}-${teamNumber}`;
      this.connectedCaptains.set(captainKey, {
        socketId: socket.id,
        userId: userId || `socket_${socket.id}`,
        sessionId,
        teamNumber,
        joinedAt: new Date(),
        lastActive: new Date()
      });

      // Update database using existing schema - mark team as connected
      const teamConnectedField = `team${teamNumber}_connected`;
      await postgresService.query(
        `UPDATE draft_sessions 
         SET ${teamConnectedField} = true, updated_at = NOW()
         WHERE draft_id = $1`,
        [sessionId]
      );

      // Check current session state
      const session = await this.getDraftSession(sessionId);
      
      // For the new logic: both teams are "connected" if someone has accessed each team's URL
      // This means one admin can represent both teams by opening both URLs
      const bothTeamsRepresented = session.team1_connected && session.team2_connected;

      if (bothTeamsRepresented) {
        // Both teams are now represented - start coin toss
        logger.info(`Both teams represented in session ${sessionId}`);
        
        // Update session state and record timestamp
        await postgresService.query(
          `UPDATE draft_sessions 
           SET both_teams_connected_at = NOW(), updated_at = NOW()
           WHERE draft_id = $1`,
          [sessionId]
        );

        // Broadcast to all participants that both teams are present
        this.io.to(`draft-${sessionId}`).emit('both-captains-present', {
          sessionId,
          team1Connected: true,
          team2Connected: true,
          timestamp: new Date()
        });

        // Start coin toss phase if not already completed
        if (session.current_phase === 'Coin Toss' && !session.coin_toss_winner) {
          await postgresService.query(
            `UPDATE draft_sessions 
             SET coin_choices_enabled_at = NOW(), updated_at = NOW()
             WHERE draft_id = $1`,
            [sessionId]
          );
          
          this.io.to(`draft-${sessionId}`).emit('coin-toss-phase-start', {
            sessionId,
            message: 'Choose heads or tails to determine first pick!'
          });
        }
      } else {
        // Still waiting for the other team to be represented
        const presentCount = (session.team1_connected ? 1 : 0) + (session.team2_connected ? 1 : 0);
        
        // Send waiting message to the socket that just joined
        socket.emit('waiting-for-captain', {
          sessionId,
          presentCount,
          totalNeeded: 2,
          team1Connected: session.team1_connected,
          team2Connected: session.team2_connected,
          message: 'Waiting for other team to connect...'
        });
        
        // Also broadcast the waiting state to all sockets in the room
        this.io.to(`draft-${sessionId}`).emit('waiting-for-captain', {
          sessionId,
          presentCount,
          totalNeeded: 2,
          team1Connected: session.team1_connected,
          team2Connected: session.team2_connected,
          message: 'Waiting for other team to connect...'
        });
      }

      // Send current session state to joining captain
      const sessionState = await this.getDraftSession(sessionId);
      socket.emit('draft-session-state', sessionState);

    } catch (error) {
      logger.error('Error handling captain join:', error);
      socket.emit('draft-error', { 
        message: 'Failed to join draft session',
        error: error.message 
      });
    }
  }

  // Handle captain leaving draft session
  async handleCaptainLeave(socket, { sessionId, userId }) {
    try {
      logger.info(`Captain ${userId} leaving draft session ${sessionId}`);

      // Remove from connected captains
      const captainKeys = Array.from(this.connectedCaptains.keys());
      for (const key of captainKeys) {
        const captain = this.connectedCaptains.get(key);
        if (captain.userId === userId && captain.sessionId === sessionId) {
          this.connectedCaptains.delete(key);
          
          // Update database using existing schema
          const teamConnectedField = `team${captain.teamNumber}_connected`;
          await postgresService.query(
            `UPDATE draft_sessions 
             SET ${teamConnectedField} = false, updated_at = NOW()
             WHERE draft_id = $1`,
            [sessionId]
          );
          break;
        }
      }

      // Leave socket room
      socket.leave(`draft-${sessionId}`);

      // Notify other captain
      this.io.to(`draft-${sessionId}`).emit('captain-left', {
        sessionId,
        userId,
        message: 'Other captain has left the session'
      });

    } catch (error) {
      logger.error('Error handling captain leave:', error);
    }
  }

  // Handle coin toss selection with race logic
  async handleCoinTossSelection(socket, { sessionId, userId, choice }) {
    try {
      logger.info(`Captain ${userId || 'unknown'} chose ${choice} in session ${sessionId}`);

      // Get current session state
      const session = await this.getDraftSession(sessionId);
      
      // Check if coin toss already completed
      if (session.coin_toss_winner) {
        socket.emit('coin-toss-error', { 
          message: 'Coin toss already completed' 
        });
        return;
      }

      // Determine which team this socket represents
      let teamNumber = null;
      
      // First check if this socket is registered as a captain
      for (const [key, captain] of this.connectedCaptains.entries()) {
        if (captain.socketId === socket.id && captain.sessionId === sessionId) {
          teamNumber = captain.teamNumber;
          break;
        }
      }
      
      // If not found as registered captain, check if user is admin or team member
      if (!teamNumber && userId) {
        // Check if user is admin (admins can represent any team)
        const userResult = await postgresService.query(
          'SELECT is_admin FROM users WHERE id = $1',
          [userId]
        );
        
        const isAdmin = userResult.rows.length > 0 && userResult.rows[0].is_admin === true;
        
        if (isAdmin) {
          // For admins, determine team based on which URL they accessed
          // This should have been set when they joined the session
          for (const [key, captain] of this.connectedCaptains.entries()) {
            if (captain.socketId === socket.id && captain.sessionId === sessionId) {
              teamNumber = captain.teamNumber;
              break;
            }
          }
        } else {
          // Check if user is a member of either team
          const teamMemberResult = await postgresService.query(
            `SELECT team_number FROM (
              SELECT 1 as team_number, team_members FROM teams WHERE id = $2
              UNION ALL
              SELECT 2 as team_number, team_members FROM teams WHERE id = $3
            ) t WHERE $1 = ANY(team_members)`,
            [userId, session.team1_id, session.team2_id]
          );
          
          if (teamMemberResult.rows.length > 0) {
            teamNumber = teamMemberResult.rows[0].team_number;
          }
        }
      }
      
      if (!teamNumber) {
        socket.emit('coin-toss-error', { 
          message: 'You must be an admin or a member of one of the participating teams' 
        });
        return;
      }

      const teamChoiceField = `team${teamNumber}_coin_choice`;
      const otherTeamChoiceField = `team${teamNumber === 1 ? 2 : 1}_coin_choice`;

      // Check if this captain already made a choice
      if (session[teamChoiceField]) {
        socket.emit('coin-toss-error', { 
          message: 'You have already made your choice' 
        });
        return;
      }

      // Check if choice is still available (race condition check)
      if (session[otherTeamChoiceField] === choice) {
        socket.emit('coin-toss-error', { 
          message: `${choice} has already been chosen by the other team` 
        });
        return;
      }

      // Record the choice in the existing schema
      await postgresService.query(
        `UPDATE draft_sessions 
         SET ${teamChoiceField} = $2, updated_at = NOW()
         WHERE draft_id = $1`,
        [sessionId, choice]
      );

      // Broadcast choice to other captain (disable their option)
      this.io.to(`draft-${sessionId}`).emit('coin-toss-choice-made', {
        sessionId,
        choice,
        teamNumber,
        userId,
        choicesRemaining: ['HEADS', 'TAILS'].filter(c => c !== choice)
      });

      // Get updated session to check if both have chosen
      const updatedSession = await this.getDraftSession(sessionId);
      
      // Check if both teams have chosen
      if (updatedSession.team1_coin_choice && updatedSession.team2_coin_choice) {
        // Complete coin toss - simulate coin flip
        const coinResult = Math.random() < 0.5 ? 'HEADS' : 'TAILS';
        
        // Determine winner
        let winningTeam = null;
        if (updatedSession.team1_coin_choice === coinResult) {
          winningTeam = 'team1';
        } else if (updatedSession.team2_coin_choice === coinResult) {
          winningTeam = 'team2';
        } else {
          // Shouldn't happen with HEADS/TAILS, but default to team1
          winningTeam = 'team1';
        }
        
        // Update database with final result using existing schema
        await postgresService.query(
          `UPDATE draft_sessions 
           SET coin_toss_result = $2,
               coin_toss_winner = $3,
               first_pick = $3,
               current_phase = 'Ban Phase',
               current_turn = $3,
               updated_at = NOW()
           WHERE draft_id = $1`,
          [sessionId, coinResult, winningTeam]
        );

        // Broadcast final result and advance to draft phase
        this.io.to(`draft-${sessionId}`).emit('coin-toss-complete', {
          sessionId,
          result: coinResult,
          winner: winningTeam,
          firstPick: winningTeam,
          choices: {
            team1: updatedSession.team1_coin_choice,
            team2: updatedSession.team2_coin_choice
          },
          nextPhase: 'Ban Phase'
        });

        logger.info(`Coin toss completed for session ${sessionId}: ${coinResult}, winner: ${winningTeam}`);
      }

    } catch (error) {
      logger.error('Error handling coin toss selection:', error);
      socket.emit('coin-toss-error', { 
        message: 'Failed to process coin toss selection',
        error: error.message 
      });
    }
  }

  // Handle draft actions (hero pick/ban)
  async handleDraftAction(socket, { sessionId, action, heroId, userId }) {
    try {
      logger.info(`Draft action: ${action} hero ${heroId} by ${userId} in session ${sessionId}`);
      
      // TODO: Implement hero draft logic
      // This will be built in Phase 3 (hero draft interface)
      
      // Broadcast to all participants
      this.io.to(`draft-${sessionId}`).emit('draft-update', {
        sessionId,
        action,
        heroId,
        userId,
        timestamp: new Date()
      });

    } catch (error) {
      logger.error('Error handling draft action:', error);
      socket.emit('draft-error', { 
        message: 'Failed to process draft action',
        error: error.message 
      });
    }
  }

  // Handle captain heartbeat for presence detection
  async handleCaptainHeartbeat(socket, { sessionId, userId }) {
    try {
      // Update last active timestamp
      const captainKeys = Array.from(this.connectedCaptains.keys());
      for (const key of captainKeys) {
        const captain = this.connectedCaptains.get(key);
        if (captain.userId === userId && captain.sessionId === sessionId) {
          captain.lastActive = new Date();
          break;
        }
      }

      // Update database
      await postgresService.query(
        `UPDATE draft_participants 
         SET last_active = $2
         WHERE session_id = $1 AND user_id = $3`,
        [sessionId, new Date(), userId]
      );

    } catch (error) {
      logger.error('Error handling captain heartbeat:', error);
    }
  }

  // Handle socket disconnection
  handleDisconnection(socket) {
    logger.info(`Draft socket disconnected: ${socket.id}`);
    
    // Find and remove captain from connected list
    const captainKeys = Array.from(this.connectedCaptains.keys());
    for (const key of captainKeys) {
      const captain = this.connectedCaptains.get(key);
      if (captain.socketId === socket.id) {
        logger.info(`Captain ${captain.userId} disconnected from session ${captain.sessionId}`);
        
        // Mark as not present in database
        postgresService.query(
          `UPDATE draft_participants 
           SET is_present = false, last_active = $2
           WHERE session_id = $1 AND user_id = $3`,
          [captain.sessionId, new Date(), captain.userId]
        ).catch(error => {
          logger.error('Error updating captain presence on disconnect:', error);
        });

        // Notify other participants
        this.io.to(`draft-${captain.sessionId}`).emit('captain-disconnected', {
          sessionId: captain.sessionId,
          userId: captain.userId,
          teamNumber: captain.teamNumber
        });

        this.connectedCaptains.delete(key);
        break;
      }
    }
  }

  // Helper method to get draft session with team/user details
  async getDraftSession(sessionId) {
    const result = await postgresService.query(
      `SELECT ds.*, 
       t1.team_id as team1_name, t2.team_id as team2_name,
       u1.user_id as team1_captain_name, u2.user_id as team2_captain_name
       FROM draft_sessions ds
       LEFT JOIN teams t1 ON ds.team1_id = t1.id
       LEFT JOIN teams t2 ON ds.team2_id = t2.id  
       LEFT JOIN users u1 ON ds.team1_captain_id = u1.id
       LEFT JOIN users u2 ON ds.team2_captain_id = u2.id
       WHERE ds.draft_id = $1`,
      [sessionId]
    );
    return result.rows[0];
  }

  // Get connected captains count for a session
  getConnectedCaptainsCount(sessionId) {
    let count = 0;
    for (const captain of this.connectedCaptains.values()) {
      if (captain.sessionId === sessionId) {
        count++;
      }
    }
    return count;
  }
}

module.exports = DraftSocketService;