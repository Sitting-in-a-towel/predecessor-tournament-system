import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import axios from 'axios';
import './DraftManagementModal.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const DraftManagementModal = ({ isOpen, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [drafts, setDrafts] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [matches, setMatches] = useState([]);
  const [showCreateDraft, setShowCreateDraft] = useState(false);
  
  // Create draft form state
  const [selectedTournament, setSelectedTournament] = useState('');
  const [selectedMatch, setSelectedMatch] = useState('');
  const [tournamentTeams, setTournamentTeams] = useState([]);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [draftsResponse, tournamentsResponse] = await Promise.all([
        axios.get(`${API_BASE_URL}/draft`, { withCredentials: true }),
        axios.get(`${API_BASE_URL}/tournaments`, { withCredentials: true })
      ]);

      setDrafts(draftsResponse.data);
      setTournaments(tournamentsResponse.data);
    } catch (error) {
      console.error('Error loading draft management data:', error);
      toast.error('Failed to load draft data');
    } finally {
      setLoading(false);
    }
  };

  const loadTournamentMatches = async (tournamentId) => {
    if (!tournamentId) {
      setMatches([]);
      setTournamentTeams([]);
      return;
    }

    try {
      setLoading(true);

      // Load tournament teams
      const teamsResponse = await axios.get(`${API_BASE_URL}/tournaments/${tournamentId}/registrations`, {
        withCredentials: true
      });
      setTournamentTeams(teamsResponse.data);

      // Load bracket data to get matches
      const bracketResponse = await axios.get(`${API_BASE_URL}/tournaments/${tournamentId}/bracket`, {
        withCredentials: true
      });

      if (bracketResponse.data && bracketResponse.data.bracket && bracketResponse.data.bracket.bracket_data) {
        const bracketData = bracketResponse.data.bracket.bracket_data;
        const isPublished = bracketResponse.data.bracket.is_published;
        
        if (isPublished) {
          const allMatches = extractMatchesFromBracket(bracketData);
          
          // Filter out matches that already have drafts or completed results
          const existingDrafts = drafts.filter(d => 
            teamsResponse.data.some(t => t.team_id === d.team1_name || t.team_id === d.team2_name)
          );
          
          const availableMatches = allMatches.filter(match => 
            match.team1 && match.team2 && 
            !match.winner && 
            !existingDrafts.some(d => 
              (d.team1_name === getTeamId(match.team1) && d.team2_name === getTeamId(match.team2)) ||
              (d.team1_name === getTeamId(match.team2) && d.team2_name === getTeamId(match.team1))
            )
          );
          
          setMatches(availableMatches);
        } else {
          setMatches([]);
          toast.warning('Bracket must be published before creating drafts');
        }
      } else {
        setMatches([]);
      }
    } catch (error) {
      console.error('Error loading tournament matches:', error);
      toast.error('Failed to load tournament matches');
      setMatches([]);
      setTournamentTeams([]);
    } finally {
      setLoading(false);
    }
  };

  const extractMatchesFromBracket = (bracketData) => {
    const matches = [];
    
    if (bracketData.type === 'Single Elimination') {
      bracketData.rounds.forEach(round => {
        round.matches.forEach(match => {
          if (match.team1 && match.team2) {
            matches.push(match);
          }
        });
      });
    } else if (bracketData.type === 'Double Elimination') {
      // Extract from upper bracket
      bracketData.upperBracket.rounds.forEach(round => {
        round.matches.forEach(match => {
          if (match.team1 && match.team2) {
            matches.push(match);
          }
        });
      });
      // Extract from lower bracket
      bracketData.lowerBracket.rounds.forEach(round => {
        round.matches.forEach(match => {
          if (match.team1 && match.team2) {
            matches.push(match);
          }
        });
      });
    }
    
    return matches;
  };

  const getTeamId = (team) => {
    if (typeof team === 'string') return team;
    return team?.team_id || team?.name || '';
  };

  // Load matches when tournament is selected
  useEffect(() => {
    if (selectedTournament) {
      loadTournamentMatches(selectedTournament);
    }
  }, [selectedTournament, drafts]);

  const handleCreateDraft = async (e) => {
    e.preventDefault();
    
    if (!selectedTournament || !selectedMatch) {
      toast.error('Please select tournament and match');
      return;
    }

    try {
      setLoading(true);
      
      // Find the selected match
      const match = matches.find(m => m.id === selectedMatch);
      if (!match) {
        toast.error('Selected match not found');
        return;
      }

      // Find the team UUIDs from tournament teams
      const team1 = tournamentTeams.find(t => t.team_id === getTeamId(match.team1));
      const team2 = tournamentTeams.find(t => t.team_id === getTeamId(match.team2));
      
      if (!team1 || !team2) {
        toast.error('Match teams not found in tournament registrations');
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
      setSelectedMatch('');
      loadData(); // Refresh the list
      
      // Show the draft links
      const draftData = response.data;
      const linkMessage = `
Draft created for ${getTeamId(match.team1)} vs ${getTeamId(match.team2)}

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
                        onChange={(e) => {
                          setSelectedTournament(e.target.value);
                          setSelectedMatch(''); // Reset match selection
                        }}
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
                      <label>Match</label>
                      <select 
                        value={selectedMatch}
                        onChange={(e) => setSelectedMatch(e.target.value)}
                        required
                        disabled={!selectedTournament}
                      >
                        <option value="">
                          {!selectedTournament 
                            ? 'Select tournament first' 
                            : matches.length === 0 
                              ? 'No available matches (bracket must be published)'
                              : 'Select a match'
                          }
                        </option>
                        {matches.map(match => (
                          <option key={match.id} value={match.id}>
                            {getTeamId(match.team1)} vs {getTeamId(match.team2)}
                          </option>
                        ))}
                      </select>
                      {selectedTournament && matches.length === 0 && (
                        <small className="form-help">
                          No matches available. Make sure the bracket is published and has matches without scores.
                        </small>
                      )}
                    </div>

                    <div className="form-actions">
                      <button 
                        type="submit" 
                        className="btn btn-success" 
                        disabled={loading || !selectedMatch}
                      >
                        {loading ? 'Creating...' : 'Create Draft Session'}
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