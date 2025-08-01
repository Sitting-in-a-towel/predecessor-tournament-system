const express = require('express');
const { body, param, validationResult } = require('express-validator');
const { requireAuth } = require('../middleware/auth');
const postgresService = require('../services/postgresql');
const logger = require('../utils/logger');

const router = express.Router();

// Get user's pending invitations
router.get('/my-invitations', requireAuth, async (req, res) => {
  try {
    const userID = req.user.userID;
    const invitations = await postgresService.getUserPendingInvitations(userID);
    
    logger.info(`Found ${invitations.length} pending invitations for user ${userID}`);
    res.json(invitations);
  } catch (error) {
    logger.error('Error getting user invitations:', error);
    res.status(500).json({ error: 'Failed to retrieve invitations' });
  }
});

// Respond to invitation (accept/decline)
router.post('/:id/respond',
  requireAuth,
  [
    param('id').isUUID(),
    body('response').isIn(['accepted', 'declined'])
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const invitationId = req.params.id;
      const { response } = req.body;
      const userID = req.user.userID;

      logger.info(`User ${userID} responding to invitation ${invitationId} with: ${response}`);

      // Update invitation status
      const updatedInvitation = await postgresService.respondToInvitation(invitationId, userID, response);
      
      if (!updatedInvitation) {
        return res.status(404).json({ error: 'Invitation not found or already responded to' });
      }

      // If accepted, add user to team
      if (response === 'accepted') {
        try {
          // Get the team details
          const teamInvitations = await postgresService.getTeamInvitations(updatedInvitation.team_id);
          const invitation = teamInvitations.find(inv => inv.id === invitationId);
          
          if (invitation) {
            // Add player to team_players table
            await postgresService.addPlayerToTeam(invitation.team_id, userID, invitation.role);
            logger.info(`User ${userID} added to team ${invitation.team_id} as ${invitation.role}`);
          }
        } catch (addPlayerError) {
          logger.error('Error adding player to team:', addPlayerError);
          // Rollback invitation acceptance if adding to team fails
          await postgresService.respondToInvitation(invitationId, userID, 'pending');
          return res.status(500).json({ error: 'Failed to join team' });
        }
      }

      res.json({
        message: response === 'accepted' ? 'Invitation accepted! You have joined the team.' : 'Invitation declined.',
        invitation: updatedInvitation
      });
    } catch (error) {
      logger.error('Error responding to invitation:', error);
      res.status(500).json({ error: 'Failed to respond to invitation' });
    }
  }
);

// Get team's invitations (captain only)
router.get('/team/:teamId', requireAuth, async (req, res) => {
  try {
    const teamId = req.params.teamId;
    const invitations = await postgresService.getTeamInvitations(teamId);
    
    logger.info(`Found ${invitations.length} invitations for team ${teamId}`);
    res.json(invitations);
  } catch (error) {
    logger.error('Error getting team invitations:', error);
    res.status(500).json({ error: 'Failed to retrieve team invitations' });
  }
});

// Cancel/delete an invitation (captain only)
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const invitationId = req.params.id;
    const userID = req.user.userID;
    
    // Get invitation details
    const invitationQuery = `
      SELECT ti.*, t.captain_id, u.user_id as captain_user_id
      FROM team_invitations ti
      JOIN teams t ON ti.team_id = t.id
      JOIN users u ON t.captain_id = u.id
      WHERE ti.id = $1
    `;
    
    const invitationResult = await postgresService.query(invitationQuery, [invitationId]);
    
    if (invitationResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invitation not found' });
    }
    
    const invitation = invitationResult.rows[0];
    
    // Check if user is the team captain
    if (invitation.captain_user_id !== userID) {
      return res.status(403).json({ error: 'Only team captains can cancel invitations' });
    }
    
    // Check if invitation is still pending
    if (invitation.status !== 'pending') {
      return res.status(400).json({ error: 'Only pending invitations can be cancelled' });
    }
    
    // Delete the invitation
    const deleteQuery = `DELETE FROM team_invitations WHERE id = $1`;
    await postgresService.query(deleteQuery, [invitationId]);
    
    logger.info(`Invitation ${invitationId} cancelled by captain ${userID}`);
    res.json({ message: 'Invitation cancelled successfully' });
    
  } catch (error) {
    logger.error('Error cancelling invitation:', error);
    res.status(500).json({ error: 'Failed to cancel invitation' });
  }
});

module.exports = router;