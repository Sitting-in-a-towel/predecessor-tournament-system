import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { airtableService } from '../../services/airtableService';
import { toast } from 'react-toastify';
import './TournamentCheckIn.css';

const TournamentCheckIn = ({ tournamentId, onStatusUpdate }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [checkInData, setCheckInData] = useState(null);
  const [userTeam, setUserTeam] = useState(null);

  useEffect(() => {
    if (tournamentId) {
      loadCheckInStatus();
      loadUserTeam();
    }
  }, [tournamentId]);

  const loadCheckInStatus = async () => {
    try {
      const data = await airtableService.getTournamentCheckInStatus(tournamentId);
      setCheckInData(data);
    } catch (error) {
      console.error('Error loading check-in status:', error);
      toast.error('Failed to load check-in status');
    }
  };

  const loadUserTeam = async () => {
    if (!user) return;
    
    try {
      const teams = await airtableService.getMyTeams();
      const tournamentTeam = teams.find(team => 
        team.Tournament && team.Tournament.some(t => t === tournamentId)
      );
      setUserTeam(tournamentTeam);
    } catch (error) {
      console.error('Error loading user team:', error);
    }
  };

  const handleCheckIn = async () => {
    if (!userTeam) return;

    setLoading(true);
    try {
      await airtableService.checkInTeam(tournamentId);
      toast.success('Successfully checked in for tournament!');
      await loadCheckInStatus();
      await loadUserTeam();
      
      if (onStatusUpdate) {
        onStatusUpdate();
      }
    } catch (error) {
      console.error('Error checking in:', error);
      toast.error(error.response?.data?.error || 'Failed to check in');
    } finally {
      setLoading(false);
    }
  };

  const handleAdminToggleCheckIn = async (teamId, currentStatus) => {
    setLoading(true);
    try {
      await airtableService.updateTeamCheckIn(tournamentId, teamId, !currentStatus);
      toast.success(`Team check-in ${!currentStatus ? 'enabled' : 'disabled'}`);
      await loadCheckInStatus();
    } catch (error) {
      console.error('Error updating check-in:', error);
      toast.error('Failed to update check-in status');
    } finally {
      setLoading(false);
    }
  };

  const canCheckIn = () => {
    if (!userTeam) return false;
    if (!userTeam.Confirmed) return false;
    if (userTeam.CheckedIn) return false;
    // Check if user is team captain
    return userTeam.Captain && userTeam.Captain.includes(user?.userID);
  };

  const getTeamStatus = (team) => {
    if (!team.Confirmed) return { status: 'Not Confirmed', className: 'status-error' };
    if (team.CheckedIn) return { status: 'Checked In', className: 'status-success' };
    return { status: 'Ready to Check In', className: 'status-warning' };
  };

  if (!checkInData) {
    return <div className="tournament-checkin loading">Loading check-in status...</div>;
  }

  return (
    <div className="tournament-checkin">
      <div className="checkin-header">
        <h3>Tournament Check-In</h3>
        <div className="checkin-summary">
          <div className="summary-stats">
            <div className="stat-item">
              <label>Teams Registered</label>
              <span>{checkInData.summary.totalTeams}</span>
            </div>
            <div className="stat-item">
              <label>Teams Confirmed</label>
              <span>{checkInData.summary.confirmedTeams}</span>
            </div>
            <div className="stat-item">
              <label>Teams Checked In</label>
              <span className={checkInData.summary.checkedInTeams >= 2 ? 'success' : 'warning'}>
                {checkInData.summary.checkedInTeams}
              </span>
            </div>
          </div>
          
          <div className="tournament-readiness">
            <span className={`readiness-badge ${checkInData.summary.readyToStart ? 'ready' : 'not-ready'}`}>
              {checkInData.summary.readyToStart ? '✅ Ready to Start' : '⏳ Waiting for Teams'}
            </span>
          </div>
        </div>
      </div>

      {/* User Team Check-In Section */}
      {userTeam && (
        <div className="user-team-checkin">
          <h4>Your Team: {userTeam.TeamName}</h4>
          <div className="team-checkin-status">
            {userTeam.CheckedIn ? (
              <div className="checked-in-status">
                <span className="status-badge success">✅ Checked In</span>
                <small>Checked in at: {new Date(userTeam.CheckInTime).toLocaleString()}</small>
              </div>
            ) : (
              <div className="checkin-actions">
                {canCheckIn() ? (
                  <button 
                    className="btn-primary"
                    onClick={handleCheckIn}
                    disabled={loading}
                  >
                    {loading ? 'Checking In...' : 'Check In Team'}
                  </button>
                ) : (
                  <div className="checkin-disabled">
                    {!userTeam.Confirmed && <p>⚠️ Team must be confirmed before checking in</p>}
                    {userTeam.Confirmed && userTeam.CheckedIn && <p>✅ Already checked in</p>}
                    {userTeam.Confirmed && !userTeam.CheckedIn && !userTeam.Captain?.includes(user?.userID) && 
                      <p>ℹ️ Only team captains can check in</p>
                    }
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* All Teams Check-In Status */}
      <div className="all-teams-checkin">
        <h4>Team Check-In Status</h4>
        {checkInData.teams.length === 0 ? (
          <div className="no-teams">
            <p>No teams registered for this tournament yet.</p>
          </div>
        ) : (
          <div className="teams-checkin-list">
            {checkInData.teams.map((team, index) => {
              const statusInfo = getTeamStatus(team);
              return (
                <div key={team.TeamID || index} className="team-checkin-item">
                  <div className="team-info">
                    <h5>{team.TeamName}</h5>
                    <div className="team-details">
                      <span className="player-count">{team.PlayerCount}/5 players</span>
                      <span className={`team-status ${statusInfo.className}`}>
                        {statusInfo.status}
                      </span>
                    </div>
                    {team.CheckInTime && (
                      <small className="checkin-time">
                        Checked in: {new Date(team.CheckInTime).toLocaleString()}
                      </small>
                    )}
                  </div>

                  {/* Admin Controls */}
                  {user?.isAdmin && (
                    <div className="admin-controls">
                      <button
                        className={`btn-admin ${team.CheckedIn ? 'btn-danger' : 'btn-success'}`}
                        onClick={() => handleAdminToggleCheckIn(team.TeamID, team.CheckedIn)}
                        disabled={loading || !team.Confirmed}
                        title={!team.Confirmed ? 'Team must be confirmed first' : ''}
                      >
                        {team.CheckedIn ? 'Uncheck' : 'Check In'}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Check-In Instructions */}
      <div className="checkin-instructions">
        <h4>Check-In Requirements</h4>
        <ul>
          <li>✅ Team must have 5 confirmed players</li>
          <li>✅ Team must be confirmed by the captain</li>
          <li>✅ Only team captains can check in their team</li>
          <li>⏰ Check-in typically opens 30 minutes before tournament start</li>
          <li>🚨 Teams must check in to participate in the tournament</li>
        </ul>
      </div>
    </div>
  );
};

export default TournamentCheckIn;