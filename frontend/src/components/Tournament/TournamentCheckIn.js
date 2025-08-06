import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';
import { toast } from 'react-toastify';
import './TournamentCheckIn.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

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
      const response = await axios.get(`${API_BASE_URL}/tournaments/${tournamentId}/check-in-status`, {
        withCredentials: true
      });
      setCheckInData(response.data);
    } catch (error) {
      console.error('Error loading check-in status:', error);
      toast.error('Failed to load check-in status');
    }
  };

  const loadUserTeam = async () => {
    if (!user) return;
    
    try {
      // Get tournament registrations to find user's team
      const response = await axios.get(`${API_BASE_URL}/tournaments/${tournamentId}/registrations`, {
        withCredentials: true
      });
      
      // Find user's team by checking if they are the captain
      const registrations = response.data.registrations || [];
      const userTeamRegistration = registrations.find(reg => 
        reg.captain_username === user.discord_username
      );
      
      if (userTeamRegistration) {
        setUserTeam({
          team_id: userTeamRegistration.team_id,
          team_name: userTeamRegistration.team_name,
          captain_username: userTeamRegistration.captain_username,
          status: userTeamRegistration.status,
          checked_in: userTeamRegistration.checked_in,
          check_in_time: userTeamRegistration.check_in_time,
          confirmed: userTeamRegistration.status === 'registered'
        });
      }
    } catch (error) {
      console.error('Error loading user team:', error);
    }
  };

  const handleCheckIn = async () => {
    if (!userTeam) return;

    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/tournaments/${tournamentId}/check-in`, {}, {
        withCredentials: true
      });
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
      await axios.post(`${API_BASE_URL}/tournaments/${tournamentId}/admin-toggle-checkin/${teamId}`, {
        checked_in: !currentStatus
      }, {
        withCredentials: true
      });
      toast.success(`Team check-in ${!currentStatus ? 'enabled' : 'disabled'}`);
      await loadCheckInStatus();
    } catch (error) {
      console.error('Error updating check-in:', error);
      toast.error(error.response?.data?.error || 'Failed to update check-in status');
    } finally {
      setLoading(false);
    }
  };

  const canCheckIn = () => {
    if (!userTeam) return false;
    if (!userTeam.confirmed) return false;
    if (userTeam.checked_in) return false;
    // Check if user is team captain (user's discord username matches team captain)
    return userTeam.captain_username === user?.discord_username;
  };

  const getTeamStatus = (team) => {
    if (!team.confirmed) return { status: 'Not Confirmed', className: 'status-error' };
    if (team.checked_in) return { status: 'Checked In', className: 'status-success' };
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
          <h4>Your Team: {userTeam.team_name}</h4>
          <div className="team-checkin-status">
            {userTeam.checked_in ? (
              <div className="checked-in-status">
                <span className="status-badge success">✅ Checked In</span>
                <small>Checked in at: {new Date(userTeam.check_in_time).toLocaleString()}</small>
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
                    {!userTeam.confirmed && <p>⚠️ Team must be confirmed before checking in</p>}
                    {userTeam.confirmed && userTeam.checked_in && <p>✅ Already checked in</p>}
                    {userTeam.confirmed && !userTeam.checked_in && userTeam.captain_username !== user?.discord_username && 
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
                <div key={team.team_id || index} className="team-checkin-item">
                  <div className="team-info">
                    <h5>{team.team_name}</h5>
                    <div className="team-details">
                      <span className="player-count">{team.player_count || 0}/5 players</span>
                      <span className={`team-status ${statusInfo.className}`}>
                        {statusInfo.status}
                      </span>
                    </div>
                    {team.check_in_time && (
                      <small className="checkin-time">
                        Checked in: {new Date(team.check_in_time).toLocaleString()}
                      </small>
                    )}
                  </div>

                  {/* Admin Controls */}
                  {(user?.role === 'admin' || user?.isAdmin) && (
                    <div className="admin-controls">
                      <button
                        className={`btn-admin ${team.checked_in ? 'btn-danger' : 'btn-success'}`}
                        onClick={() => handleAdminToggleCheckIn(team.team_id, team.checked_in)}
                        disabled={loading || !team.confirmed}
                        title={!team.confirmed ? 'Team must be confirmed first' : ''}
                      >
                        {team.checked_in ? 'Uncheck' : 'Check In'}
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