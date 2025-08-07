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
      
      // Load tournament-specific drafts
      console.log('Loading drafts for tournament:', tournamentId);
      const draftsRes = await axios.get(`${API_BASE_URL}/draft?tournamentId=${tournamentId}`, {
        withCredentials: true
      });
      
      console.log('Raw drafts response:', draftsRes.data);
      
      // Ensure we have unique drafts
      const uniqueDrafts = draftsRes.data.filter((draft, index, self) =>
        index === self.findIndex((d) => d.id === draft.id)
      );
      
      console.log('Filtered unique drafts:', uniqueDrafts);
      setDrafts(uniqueDrafts);
      
      // Load bracket data to get matches
      const bracketRes = await axios.get(`${API_BASE_URL}/tournaments/${tournamentId}/bracket`, {
        withCredentials: true
      });
      
      if (bracketRes.data && bracketRes.data.bracket && bracketRes.data.bracket.bracket_data) {
        const bracketData = bracketRes.data.bracket.bracket_data;
        const isPublished = bracketRes.data.bracket.is_published;
        
        if (isPublished) {
          const allMatches = extractMatchesFromBracket(bracketData);
          console.log('All matches extracted:', allMatches.length, allMatches);
          
          // Filter matches: exclude those with published results or existing drafts
          const availableMatches = allMatches.filter(match => {
            // Must have valid teams
            const hasValidTeams = match.team1 && match.team2 && 
              match.team1 !== '' && match.team2 !== '' && 
              match.team1 !== 'bye' && match.team2 !== 'bye';
            
            // Must not have a winner (no published results)
            const hasPublishedResults = match.winner || match.status === 'completed';
            
            // Must not have an existing draft (compare using team IDs)
            const hasExistingDraft = uniqueDrafts.some(d => {
              const matchTeam1Id = getTeamId(match.team1);
              const matchTeam2Id = getTeamId(match.team2);
              return (d.team1_id === matchTeam1Id && d.team2_id === matchTeam2Id) ||
                     (d.team1_id === matchTeam2Id && d.team2_id === matchTeam1Id);
            });
            
            return hasValidTeams && !hasPublishedResults && !hasExistingDraft;
          });
          
          console.log('Available matches after filtering:', availableMatches.length, availableMatches);
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
    if (!team) return '';
    if (typeof team === 'string') return team;
    // Handle case where team is already a full team object
    return team?.team_id || team?.id || team?.name || '';
  };

  const getTeamName = (team) => {
    if (typeof team === 'string') {
      // Check if it looks like a team_id (starts with "team_")
      if (team.startsWith('team_')) {
        const foundTeam = teams.find(t => t.team_id === team);
        return foundTeam?.team_name || team;
      }
      // Otherwise it's already a team name
      return team;
    }
    return team?.team_name || team?.name || team || '';
  };

  const getMatchRound = (match) => {
    if (match.id && match.id.includes('r') && match.id.includes('m')) {
      const roundMatch = match.id.match(/r(\d+)m\d+/);
      if (roundMatch) {
        return `R${roundMatch[1]}`;
      }
    }
    return 'R?';
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

      console.log('Selected match:', match);
      console.log('Match team1:', match.team1);
      console.log('Match team2:', match.team2);

      // Find the team UUIDs
      const team1Id = getTeamId(match.team1);
      const team2Id = getTeamId(match.team2);
      
      console.log('Looking for teams:', { team1Id, team2Id });
      console.log('Available teams:', teams.map(t => ({ id: t.id, team_id: t.team_id, team_name: t.team_name })));
      
      // Try to find teams by team_id
      let team1 = teams.find(t => t.team_id === team1Id);
      let team2 = teams.find(t => t.team_id === team2Id);
      
      // If not found by team_id, try by team_name (in case match stores team names)
      if (!team1 && match.team1?.team_name) {
        team1 = teams.find(t => t.team_name === match.team1.team_name);
      }
      if (!team2 && match.team2?.team_name) {
        team2 = teams.find(t => t.team_name === match.team2.team_name);
      }
      
      console.log('Found teams:', { team1, team2 });
      
      if (!team1 || !team2) {
        const missing = [];
        if (!team1) missing.push(`Team 1: ${team1Id || match.team1?.team_name || 'unknown'}`);
        if (!team2) missing.push(`Team 2: ${team2Id || match.team2?.team_name || 'unknown'}`);
        toast.error(`Teams not found: ${missing.join(', ')}`);
        return;
      }

      console.log('Creating draft with:', {
        tournamentId: tournament.id,
        team1Id: team1.id,
        team2Id: team2.id
      });
      
      const response = await axios.post(`${API_BASE_URL}/draft`, {
        tournamentId: tournament.id,
        team1Id: team1.id,
        team2Id: team2.id
      }, { withCredentials: true });

      const draftData = response.data;
      
      // Show success message and refresh data
      toast.success('Draft session created successfully!', { autoClose: 3000 });
      
      // Force refresh with delay to ensure backend has processed
      setTimeout(async () => {
        console.log('Refreshing draft data after creation...');
        await loadDraftData();
        console.log('Draft data refreshed. Current drafts:', drafts.length);
      }, 1000);
      
      setSelectedMatch('');
      
      // Show the draft information
      console.log('Draft created:', draftData);
      
    } catch (error) {
      console.error('Error creating draft:', error);
      if (error.response?.data) {
        console.error('Backend error response:', error.response.data);
      }
      
      // Handle specific error cases
      if (error.response?.status === 409) {
        toast.warning('A draft session already exists for this match');
      } else {
        toast.error(error.response?.data?.error || 'Failed to create draft');
      }
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
              <h4>{getTeamName(myDraft.team1_name)} vs {getTeamName(myDraft.team2_name)}</h4>
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
                data-testid="match-select"
                value={selectedMatch}
                onChange={(e) => setSelectedMatch(e.target.value)}
                disabled={creatingDraft}
              >
                <option value="">Choose a match...</option>
                {matches.map(match => (
                  <option key={match.id} value={match.id}>
                    {getMatchRound(match)} - {getTeamName(match.team1)} vs {getTeamName(match.team2)}
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

      {/* Tournament Drafts Section - For Admins and Team Captains */}
      {(isAdmin || isTeamCaptain) && (
        <div className="tournament-drafts-section">
          <h3>Tournament Drafts</h3>
          {drafts.length === 0 ? (
            <div className="no-drafts">
              <p>No draft sessions have been created yet for this tournament.</p>
            </div>
          ) : (
            <div className="drafts-list">
            {drafts
              .sort((a, b) => {
                // Sort by status: active drafts first, then by creation date
                const statusPriority = { 'Waiting': 0, 'In Progress': 1, 'Completed': 2, 'Stopped': 3 };
                const aStatus = statusPriority[a.status] ?? 4;
                const bStatus = statusPriority[b.status] ?? 4;
                if (aStatus !== bStatus) return aStatus - bStatus;
                return new Date(b.created_at) - new Date(a.created_at);
              })
              .map(draft => {
                const myTeam = teams.find(t => 
                  t.captain_id === user.id || t.captain_username === user.discord_username
                );
                const isMyDraft = myTeam && (
                  draft.team1_name === myTeam.team_id || 
                  draft.team2_name === myTeam.team_id
                );
                
                // Only show drafts that user has access to
                if (!isAdmin && !isMyDraft) return null;
                
                return (
                  <div key={draft.id} className="draft-item">
                    <div className="draft-header">
                      <h4>{getTeamName(draft.team1_name)} vs {getTeamName(draft.team2_name)}</h4>
                      <div className="draft-status">
                        <span 
                          className="status-badge"
                          style={{ backgroundColor: getDraftStatusColor(draft.status) }}
                        >
                          {draft.status || 'Unknown'}
                        </span>
                        <span className="draft-phase">{draft.current_phase || 'Waiting'}</span>
                      </div>
                    </div>
                    
                    <div className="draft-links">
                      {/* Team Captain Links */}
                      {(isAdmin || isMyDraft) && (
                        <div className="captain-links">
                          <div className="team-link">
                            <span className="team-name">{getTeamName(draft.team1_name)}</span>
                            <button 
                              className="btn btn-sm btn-primary"
                              onClick={() => window.open(`/draft/${draft.draft_id}?captain=1`, '_blank')}
                            >
                              Enter Draft
                            </button>
                          </div>
                          <div className="team-link">
                            <span className="team-name">{getTeamName(draft.team2_name)}</span>
                            <button 
                              className="btn btn-sm btn-primary"
                              onClick={() => window.open(`/draft/${draft.draft_id}?captain=2`, '_blank')}
                            >
                              Enter Draft
                            </button>
                          </div>
                        </div>
                      )}
                      
                      {/* Spectator Link */}
                      <div className="spectator-link">
                        <span>Spectate:</span>
                        <button 
                          className="btn btn-sm btn-outline"
                          onClick={() => window.open(`/draft/${draft.draft_id}/spectate`, '_blank')}
                        >
                          Watch Live
                        </button>
                      </div>
                      
                      {/* Admin Actions */}
                      {isAdmin && (
                        <div className="admin-actions">
                          <button 
                            className="btn btn-sm btn-secondary"
                            onClick={() => {
                              const links = `Draft Links for ${getTeamName(draft.team1_name)} vs ${getTeamName(draft.team2_name)}:

${getTeamName(draft.team1_name)} Captain: ${window.location.origin}/draft/${draft.draft_id}?captain=1
${getTeamName(draft.team2_name)} Captain: ${window.location.origin}/draft/${draft.draft_id}?captain=2
Spectator: ${window.location.origin}/draft/${draft.draft_id}/spectate`;
                              navigator.clipboard.writeText(links);
                              toast.info('All links copied to clipboard!');
                            }}
                          >
                            Copy All Links
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
              .filter(Boolean)
            }
          </div>
          )}
        </div>
      )}

      {/* Public Spectator Section - For Everyone */}
      {!isAdmin && !isTeamCaptain && drafts.length > 0 && (
        <div className="spectator-section">
          <h3>Watch Draft Sessions</h3>
          <div className="spectator-links">
            {drafts
              .filter(draft => draft.status === 'In Progress' || draft.status === 'Waiting')
              .map(draft => (
                <div key={`spectator-${draft.id}`} className="spectator-link-item">
                  <div className="match-info">
                    <span className="match-title">{getTeamName(draft.team1_name)} vs {getTeamName(draft.team2_name)}</span>
                    <span 
                      className="status-badge small"
                      style={{ backgroundColor: getDraftStatusColor(draft.status) }}
                    >
                      {draft.status}
                    </span>
                  </div>
                  <button 
                    className="btn btn-sm btn-outline"
                    onClick={() => window.open(`/draft/${draft.draft_id}/spectate`, '_blank')}
                  >
                    Watch Live
                  </button>
                </div>
              ))
            }
          </div>
          {drafts.filter(draft => draft.status === 'In Progress' || draft.status === 'Waiting').length === 0 && (
            <p className="no-drafts">No active draft sessions to spectate at the moment.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default TournamentDrafts;