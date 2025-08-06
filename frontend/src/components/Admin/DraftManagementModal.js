import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import axios from 'axios';
import './DraftManagementModal.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const DraftManagementModal = ({ isOpen, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [drafts, setDrafts] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [teams, setTeams] = useState([]);
  const [showCreateDraft, setShowCreateDraft] = useState(false);
  
  // Create draft form state
  const [selectedTournament, setSelectedTournament] = useState('');
  const [selectedTeam1, setSelectedTeam1] = useState('');
  const [selectedTeam2, setSelectedTeam2] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [draftsResponse, tournamentsResponse, teamsResponse] = await Promise.all([
        axios.get(`${API_BASE_URL}/draft`, { withCredentials: true }),
        axios.get(`${API_BASE_URL}/tournaments`, { withCredentials: true }),
        axios.get(`${API_BASE_URL}/teams`, { withCredentials: true })
      ]);

      setDrafts(draftsResponse.data);
      setTournaments(tournamentsResponse.data);
      setTeams(teamsResponse.data);
    } catch (error) {
      console.error('Error loading draft management data:', error);
      toast.error('Failed to load draft data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDraft = async (e) => {
    e.preventDefault();
    
    if (!selectedTournament || !selectedTeam1 || !selectedTeam2) {
      toast.error('Please select tournament and both teams');
      return;
    }

    if (selectedTeam1 === selectedTeam2) {
      toast.error('Please select different teams');
      return;
    }

    try {
      setLoading(true);
      
      // Find the team UUIDs
      const team1 = teams.find(t => t.team_id === selectedTeam1);
      const team2 = teams.find(t => t.team_id === selectedTeam2);
      
      if (!team1 || !team2) {
        toast.error('Selected teams not found');
        return;
      }

      const response = await axios.post(`${API_BASE_URL}/draft`, {
        tournamentId: selectedTournament,
        team1Id: team1.id,
        team2Id: team2.id
      }, { withCredentials: true });

      toast.success('Draft session created successfully!');
      setShowCreateDraft(false);
      setSelectedTournament('');
      setSelectedTeam1('');
      setSelectedTeam2('');
      loadData(); // Refresh the list
      
      // Show the draft links
      const draftData = response.data;
      const linkMessage = `
Draft created successfully!

Team 1 Captain Link: ${draftData.team1Link}
Team 2 Captain Link: ${draftData.team2Link}
Spectator Link: ${draftData.spectatorLink}

Copy these links and send them to the team captains.
      `.trim();
      
      // Show in a copyable format
      navigator.clipboard.writeText(linkMessage);
      toast.info('Draft links copied to clipboard!', { autoClose: 5000 });
      
    } catch (error) {
      console.error('Error creating draft:', error);
      toast.error(error.response?.data?.error || 'Failed to create draft session');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'waiting': return '#faa61a';
      case 'in progress': return '#5865f2';
      case 'completed': return '#57f287';
      case 'stopped': return '#ed4245';
      default: return '#b3b3b3';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-container draft-management-modal">
        <div className="modal-header">
          <h2>Draft Management</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-content">
          {loading ? (
            <div className="loading-spinner">Loading...</div>
          ) : (
            <>
              <div className="draft-actions">
                <button 
                  className="btn btn-primary"
                  onClick={() => setShowCreateDraft(!showCreateDraft)}
                >
                  {showCreateDraft ? 'Cancel' : 'Create New Draft'}
                </button>
              </div>

              {showCreateDraft && (
                <div className="create-draft-form">
                  <h3>Create Draft Session</h3>
                  <form onSubmit={handleCreateDraft}>
                    <div className="form-group">
                      <label>Tournament</label>
                      <select 
                        value={selectedTournament}
                        onChange={(e) => setSelectedTournament(e.target.value)}
                        required
                      >
                        <option value="">Select Tournament</option>
                        {tournaments.map(tournament => (
                          <option key={tournament.id} value={tournament.id}>
                            {tournament.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Team 1</label>
                      <select 
                        value={selectedTeam1}
                        onChange={(e) => setSelectedTeam1(e.target.value)}
                        required
                      >
                        <option value="">Select Team 1</option>
                        {teams.map(team => (
                          <option key={team.id} value={team.team_id}>
                            {team.team_id}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Team 2</label>
                      <select 
                        value={selectedTeam2}
                        onChange={(e) => setSelectedTeam2(e.target.value)}
                        required
                      >
                        <option value="">Select Team 2</option>
                        {teams.map(team => (
                          <option key={team.id} value={team.team_id}>
                            {team.team_id}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-actions">
                      <button type="submit" className="btn btn-success" disabled={loading}>
                        Create Draft Session
                      </button>
                    </div>
                  </form>
                </div>
              )}

              <div className="drafts-list">
                <h3>Existing Draft Sessions</h3>
                {drafts.length === 0 ? (
                  <p className="no-data">No draft sessions found</p>
                ) : (
                  <div className="drafts-table">
                    <table>
                      <thead>
                        <tr>
                          <th>Draft ID</th>
                          <th>Team 1</th>
                          <th>Team 2</th>
                          <th>Status</th>
                          <th>Phase</th>
                          <th>Created</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {drafts.map(draft => (
                          <tr key={draft.id}>
                            <td>{draft.draft_id}</td>
                            <td>{draft.team1_name || 'Unknown'}</td>
                            <td>{draft.team2_name || 'Unknown'}</td>
                            <td>
                              <span 
                                className="status-badge"
                                style={{ backgroundColor: getStatusColor(draft.status) }}
                              >
                                {draft.status || 'Unknown'}
                              </span>
                            </td>
                            <td>{draft.current_phase || 'N/A'}</td>
                            <td>{formatDate(draft.created_at)}</td>
                            <td>
                              <div className="draft-actions">
                                <button 
                                  className="btn btn-sm btn-primary"
                                  onClick={() => window.open(`/draft/${draft.draft_id}/spectate`, '_blank')}
                                >
                                  View
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default DraftManagementModal;