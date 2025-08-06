import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import axios from 'axios';
import './TournamentDrafts.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const TournamentDrafts = ({ tournamentId, tournament, teams, isAdmin, isTeamCaptain, user }) => {
  const [drafts, setDrafts] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMatch, setSelectedMatch] = useState('');
  const [creatingDraft, setCreatingDraft] = useState(false);

  useEffect(() => {
    loadDraftData();
  }, [tournamentId]);

  const loadDraftData = async () => {
    try {
      setLoading(true);
      
      // Load tournament drafts
      const draftsRes = await axios.get(`${API_BASE_URL}/draft`, {
        withCredentials: true
      });
      
      // Filter drafts for this tournament
      const tournamentDrafts = draftsRes.data.filter(d => 
        teams.some(t => t.team_id === d.team1_name || t.team_id === d.team2_name)
      );
      setDrafts(tournamentDrafts);
      
      // Load bracket data to get matches
      const bracketRes = await axios.get(`${API_BASE_URL}/tournaments/${tournamentId}/bracket`, {
        withCredentials: true
      });
      
      if (bracketRes.data && bracketRes.data.bracket && bracketRes.data.bracket.bracket_data) {
        const bracketData = bracketRes.data.bracket.bracket_data;
        const isPublished = bracketRes.data.bracket.is_published;
        
        if (isPublished) {
          const allMatches = extractMatchesFromBracket(bracketData);
          // Filter out matches that already have drafts or completed results
          const availableMatches = allMatches.filter(match => 
            match.team1 && match.team2 && 
            !match.winner && 
            !tournamentDrafts.some(d => 
              (d.team1_name === getTeamId(match.team1) && d.team2_name === getTeamId(match.team2)) ||
              (d.team1_name === getTeamId(match.team2) && d.team2_name === getTeamId(match.team1))
            )
          );
          setMatches(availableMatches);
        } else {
          setMatches([]);
          if (bracketData) {
            toast.warning('Bracket must be published before creating drafts');
          }
        }
      } else {
        setMatches([]);
      }
      
    } catch (error) {
      console.error('Error loading draft data:', error);
      toast.error('Failed to load draft information');
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

  const handleCreateDraft = async () => {
    if (!selectedMatch) {
      toast.error('Please select a match');
      return;
    }

    try {
      setCreatingDraft(true);
      
      const match = matches.find(m => m.id === selectedMatch);
      if (!match) {
        toast.error('Match not found');
        return;
      }

      // Find the team UUIDs
      const team1 = teams.find(t => t.team_id === getTeamId(match.team1));
      const team2 = teams.find(t => t.team_id === getTeamId(match.team2));
      
      if (!team1 || !team2) {
        toast.error('Teams not found');
        return;
      }

      const response = await axios.post(`${API_BASE_URL}/draft`, {
        tournamentId: tournament.id,
        team1Id: team1.id,
        team2Id: team2.id
      }, { withCredentials: true });

      const draftData = response.data;
      
      // Show draft links
      if (isAdmin) {
        const message = `
Draft created successfully!

Team 1 Captain Link: ${draftData.team1Link}
Team 2 Captain Link: ${draftData.team2Link}
Spectator Link: ${draftData.spectatorLink}
        `.trim();
        
        navigator.clipboard.writeText(message);
        toast.success('Draft links copied to clipboard!', { autoClose: 5000 });
      } else {
        // For team captains, redirect to their draft
        const isCaptainOfTeam1 = team1.captain_id === user.id || team1.captain_username === user.discord_username;
        const link = isCaptainOfTeam1 ? draftData.team1Link : draftData.team2Link;
        window.open(link, '_blank');
      }
      
      loadDraftData(); // Refresh
      setSelectedMatch('');
      
    } catch (error) {
      console.error('Error creating draft:', error);
      toast.error(error.response?.data?.error || 'Failed to create draft');
    } finally {
      setCreatingDraft(false);
    }
  };

  const getMyTeamDraft = () => {
    if (!isTeamCaptain || !user) return null;
    
    // Find drafts where user is a captain
    return drafts.find(draft => {
      const myTeam = teams.find(t => 
        t.captain_id === user.id || t.captain_username === user.discord_username
      );
      return myTeam && (
        draft.team1_name === myTeam.team_id || 
        draft.team2_name === myTeam.team_id
      );
    });
  };

  const getDraftStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'waiting': return '#faa61a';
      case 'in progress': return '#5865f2';
      case 'completed': return '#57f287';
      case 'stopped': return '#ed4245';
      default: return '#b3b3b3';
    }
  };

  if (loading) {
    return <div className="loading-container">Loading draft information...</div>;
  }

  const myDraft = getMyTeamDraft();

  return (
    <div className="tournament-drafts">
      <div className="drafts-header">
        <h2>Hero Draft System</h2>
        <p className="drafts-description">
          Create draft sessions for matches to allow teams to pick and ban heroes before their games.
        </p>
      </div>

      {/* Team Captain View - Show their active draft */}
      {isTeamCaptain && !isAdmin && myDraft && (
        <div className="my-draft-section">
          <h3>Your Active Draft</h3>
          <div className="draft-card active">
            <div className="draft-info">
              <h4>{myDraft.team1_name} vs {myDraft.team2_name}</h4>
              <div className="draft-status">
                <span 
                  className="status-badge"
                  style={{ backgroundColor: getDraftStatusColor(myDraft.status) }}
                >
                  {myDraft.status || 'Unknown'}
                </span>
                <span className="draft-phase">{myDraft.current_phase || 'N/A'}</span>
              </div>
            </div>
            <div className="draft-actions">
              <button 
                className="btn btn-primary"
                onClick={() => {
                  const myTeam = teams.find(t => 
                    t.captain_id === user.id || t.captain_username === user.discord_username
                  );
                  const captainParam = myDraft.team1_name === myTeam.team_id ? '1' : '2';
                  window.open(`/draft/${myDraft.draft_id}?captain=${captainParam}`, '_blank');
                }}
              >
                Enter Draft Room
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Draft Section */}
      {(isAdmin || (isTeamCaptain && !myDraft)) && matches.length > 0 && (
        <div className="create-draft-section">
          <h3>Create New Draft</h3>
          <div className="create-draft-form">
            <div className="form-group">
              <label>Select Match</label>
              <select 
                value={selectedMatch}
                onChange={(e) => setSelectedMatch(e.target.value)}
                disabled={creatingDraft}
              >
                <option value="">Choose a match...</option>
                {matches.map(match => (
                  <option key={match.id} value={match.id}>
                    {getTeamId(match.team1)} vs {getTeamId(match.team2)}
                  </option>
                ))}
              </select>
            </div>
            <button 
              className="btn btn-success"
              onClick={handleCreateDraft}
              disabled={!selectedMatch || creatingDraft}
            >
              {creatingDraft ? 'Creating...' : 'Create Draft Session'}
            </button>
          </div>
        </div>
      )}

      {/* Admin View - All Drafts */}
      {isAdmin && (
        <div className="all-drafts-section">
          <h3>All Tournament Drafts</h3>
          {drafts.length === 0 ? (
            <p className="no-drafts">No draft sessions have been created yet.</p>
          ) : (
            <div className="drafts-grid">
              {drafts.map(draft => (
                <div key={draft.id} className="draft-card">
                  <div className="draft-info">
                    <h4>{draft.team1_name} vs {draft.team2_name}</h4>
                    <div className="draft-status">
                      <span 
                        className="status-badge"
                        style={{ backgroundColor: getDraftStatusColor(draft.status) }}
                      >
                        {draft.status || 'Unknown'}
                      </span>
                      <span className="draft-phase">{draft.current_phase || 'N/A'}</span>
                    </div>
                  </div>
                  <div className="draft-actions">
                    <button 
                      className="btn btn-sm btn-primary"
                      onClick={() => window.open(`/draft/${draft.draft_id}/spectate`, '_blank')}
                    >
                      Spectate
                    </button>
                    <button 
                      className="btn btn-sm btn-secondary"
                      onClick={() => {
                        const links = `
Team 1 Captain: ${window.location.origin}/draft/${draft.draft_id}?captain=1
Team 2 Captain: ${window.location.origin}/draft/${draft.draft_id}?captain=2
Spectator: ${window.location.origin}/draft/${draft.draft_id}/spectate
                        `.trim();
                        navigator.clipboard.writeText(links);
                        toast.info('Links copied to clipboard!');
                      }}
                    >
                      Copy Links
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Spectator Links for Everyone */}
      <div className="spectator-section">
        <h3>Watch Draft Sessions</h3>
        {drafts.length === 0 ? (
          <p className="no-drafts">No active draft sessions to spectate.</p>
        ) : (
          <div className="spectator-links">
            {drafts.map(draft => (
              <div key={draft.id} className="spectator-link-item">
                <span>{draft.team1_name} vs {draft.team2_name}</span>
                <button 
                  className="btn btn-sm btn-outline"
                  onClick={() => window.open(`/draft/${draft.draft_id}/spectate`, '_blank')}
                >
                  Watch Live
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TournamentDrafts;