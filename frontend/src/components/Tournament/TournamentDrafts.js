import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import axios from 'axios';
import './TournamentDrafts.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
const PHOENIX_DRAFT_URL = process.env.REACT_APP_PHOENIX_URL || 
  (process.env.NODE_ENV === 'production' 
    ? 'https://predecessor-draft-phoenix.onrender.com' 
    : 'http://localhost:4000');

// Production fallback: Check if Phoenix is available, otherwise skip Phoenix calls
const PHOENIX_ENABLED = process.env.REACT_APP_PHOENIX_ENABLED !== 'false';

const TournamentDrafts = ({ tournamentId, tournament, teams, isAdmin, isTeamCaptain, user, refreshTrigger }) => {
  const [drafts, setDrafts] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMatch, setSelectedMatch] = useState('');
  const [creatingDraft, setCreatingDraft] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [error, setError] = useState(null);
  const [mounted, setMounted] = useState(true);
  const [showConfigModal, setShowConfigModal] = useState(false);
  
  // Draft configuration state
  const [draftConfig, setDraftConfig] = useState({
    banCount: 4,
    draftStrategy: 'restricted',
    timerEnabled: true,
    bonusTime: 10,
    timerStrategy: '20s per pick'
  });
  
  // Debug: Expose data to console for troubleshooting
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.tournament = tournament;
      window.teams = teams;
      window.matches = matches;
      console.log('🔍 DEBUG: Data exposed to window object');
      console.log('Tournament:', tournament);
      console.log('Teams:', teams);
      console.log('Matches:', matches);
    }
  }, [tournament, teams, matches]);

  // Debug useEffect to track drafts state changes
  useEffect(() => {
    console.log('📊 Drafts state changed:', drafts.length, 'drafts');
    console.log('📊 Current draft IDs:', drafts.map(d => d.draft_id || d.id));
    if (drafts.length === 0) {
      console.log('⚠️ Drafts state is empty - this might be the issue!');
    }
  }, [drafts]);

  useEffect(() => {
    const effectiveTournamentId = tournament?.id || tournamentId;
    
    if (effectiveTournamentId && mounted) {
      console.log('🔄 Tournament changed - loading data for:', effectiveTournamentId);
      
      // Clear previous data
      setMatches([]);
      setDrafts([]);
      
      // Load new data
      loadDraftData();
      
      // Start polling for draft status updates  
      const interval = setInterval(() => {
        if (mounted) {
          pollDraftStatus();
        }
      }, 10000); // Poll every 10 seconds
      
      return () => clearInterval(interval);
    }
  }, [tournament?.id, tournamentId, mounted, refreshTrigger]); // Use specific values, not the objects themselves

  // Cleanup effect
  useEffect(() => {
    return () => {
      setMounted(false);
    };
  }, []);

  const loadDraftData = async () => {
    // Prevent multiple concurrent calls or calls after unmount
    if (isLoadingData || !mounted) {
      console.log('🚫 loadDraftData already running or component unmounted, skipping...');
      return;
    }

    try {
      setError(null); // Clear any previous errors
      setIsLoadingData(true);
      setLoading(true);
      
      // Load tournament-specific drafts
      console.log('Loading drafts for tournament:', tournamentId);
      console.log('Tournament object:', tournament);
      console.log('Using tournament ID:', tournament?.id || tournamentId);
      
      const effectiveTournamentId = tournament?.id || tournamentId;
      
      // Try to load from React backend first
      let backendDrafts = [];
      try {
        const draftsRes = await axios.get(`${API_BASE_URL}/draft?tournamentId=${effectiveTournamentId}`, {
          withCredentials: true
        });
        
        console.log('Raw drafts response from React backend:', draftsRes.data);
        console.log('Number of drafts received from React backend:', draftsRes.data.length);
        backendDrafts = draftsRes.data || [];
      } catch (backendError) {
        console.log('Could not load drafts from React backend:', backendError.message);
        // Continue without backend drafts
      }
      
      // Also try to load Phoenix drafts for this tournament (if Phoenix is enabled)
      let phoenixDrafts = [];
      if (PHOENIX_ENABLED) {
        try {
          console.log('Loading Phoenix drafts for tournament:', effectiveTournamentId);
          const phoenixRes = await axios.get(`${PHOENIX_DRAFT_URL}/api/drafts?tournament_id=${effectiveTournamentId}`, {
            timeout: 5000 // 5 second timeout to avoid hanging in production
          });
          
          if (phoenixRes.data && Array.isArray(phoenixRes.data)) {
            phoenixDrafts = phoenixRes.data.map(draft => ({
              id: draft.id,
              draft_id: draft.draft_id,
              team1_name: draft.team1_name,
              team2_name: draft.team2_name,
              status: draft.status,
              current_phase: draft.current_phase,
              created_at: draft.created_at,
              phoenixDraftId: draft.draft_id // Mark as Phoenix draft
            }));
            console.log('Loaded Phoenix drafts:', phoenixDrafts);
          }
        } catch (phoenixError) {
          console.log('Could not load Phoenix drafts (Phoenix may not be running in production):', phoenixError.message);
          // Continue without Phoenix drafts - this is expected in production
        }
      } else {
        console.log('Phoenix drafts disabled via environment variable');
      }
      
      // Keep any Phoenix-only drafts that were added locally but not yet persisted
      const localPhoenixDrafts = drafts.filter(d => 
        d.phoenixDraftId && 
        !backendDrafts.find(bd => bd.draft_id === d.draft_id) &&
        !phoenixDrafts.find(pd => pd.draft_id === d.draft_id)
      );
      
      console.log('Local Phoenix drafts to preserve:', localPhoenixDrafts);
      console.log('Phoenix drafts from server:', phoenixDrafts);
      
      // Merge all drafts: backend + Phoenix + local Phoenix
      const allDrafts = [...backendDrafts, ...phoenixDrafts, ...localPhoenixDrafts];
      
      // Ensure we have unique drafts
      const uniqueDrafts = allDrafts.filter((draft, index, self) =>
        index === self.findIndex((d) => (d.draft_id || d.id) === (draft.draft_id || draft.id))
      );
      
      console.log('Filtered unique drafts:', uniqueDrafts);
      console.log('Setting drafts state with:', uniqueDrafts.length, 'drafts');
      console.log('Draft IDs being set:', uniqueDrafts.map(d => d.draft_id || d.id));
      
      if (mounted) {
        setDrafts(uniqueDrafts);
      } else {
        console.log('Component unmounted, skipping setDrafts');
      }
      
      // Load bracket data to get matches
      console.log('Loading bracket for tournament:', effectiveTournamentId);
      const bracketRes = await axios.get(`${API_BASE_URL}/tournaments/${effectiveTournamentId}/bracket`, {
        withCredentials: true
      });
      
      console.log('Bracket response:', bracketRes.data);
      
      if (bracketRes.data && bracketRes.data.bracket && bracketRes.data.bracket.bracket_data) {
        const bracketData = bracketRes.data.bracket.bracket_data;
        const isPublished = bracketRes.data.bracket.is_published;
        
        console.log('Bracket data found:', bracketData);
        console.log('Is published:', isPublished);
        console.log('Bracket type:', bracketData?.type);
        
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
            const hasPublishedResults = !!match.winner || match.status === 'completed';
            
            // Must not have an existing draft (compare using team IDs)
            const hasExistingDraft = uniqueDrafts.some(d => {
              const matchTeam1Id = getTeamId(match.team1);
              const matchTeam2Id = getTeamId(match.team2);
              return (d.team1_id === matchTeam1Id && d.team2_id === matchTeam2Id) ||
                     (d.team1_id === matchTeam2Id && d.team2_id === matchTeam1Id);
            });
            
            // Special logging for the problematic match
            const isIceWolvesMatch = (
              (getTeamName(match.team1).includes('Ice Wolves') && getTeamName(match.team2).includes('Crimson Knights')) ||
              (getTeamName(match.team1).includes('Crimson Knights') && getTeamName(match.team2).includes('Ice Wolves'))
            );
            
            if (isIceWolvesMatch) {
              console.log('🔍 DEBUGGING ICE WOLVES MATCH:', {
                team1: match.team1,
                team2: match.team2,
                team1Name: getTeamName(match.team1),
                team2Name: getTeamName(match.team2),
                hasValidTeams,
                hasPublishedResults,
                hasExistingDraft,
                winner: match.winner,
                status: match.status,
                matchObject: match
              });
            }
            
            console.log(`Match ${getTeamName(match.team1)} vs ${getTeamName(match.team2)}:`, {
              hasValidTeams,
              hasPublishedResults,
              hasExistingDraft,
              included: hasValidTeams && !hasPublishedResults && !hasExistingDraft
            });
            
            return hasValidTeams && !hasPublishedResults && !hasExistingDraft;
          });
          
          console.log('Available matches after filtering:', availableMatches.length, availableMatches);
          if (mounted) {
            setMatches(availableMatches);
          }
        } else {
          console.log('Bracket not published');
          if (mounted) {
            setMatches([]);
          }
          if (bracketData) {
            toast.warning('Bracket must be published before creating drafts');
          }
        }
      } else {
        console.log('No bracket data found');
        if (mounted) {
          setMatches([]);
        }
      }
      
    } catch (error) {
      const effectiveTournamentId = tournament?.id || tournamentId;
      console.error('❌ Error in loadDraftData:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      console.error('API URL attempted:', `${API_BASE_URL}/draft?tournamentId=${effectiveTournamentId}`);
      
      // Set error state for display
      if (mounted) {
        setError(`Failed to load drafts: ${error.message}`);
        
        // Clear stale data on error to prevent showing wrong matches
        console.log('🧹 Clearing stale data due to API error');
        setMatches([]);
        setDrafts([]);
      }
      
      if (error.response?.status === 404) {
        toast.error('No drafts found for this tournament');
      } else if (error.response?.status === 500) {
        toast.error('Server error loading drafts - please check console for details');
      } else {
        toast.error(`Failed to load draft information: ${error.message}`);
      }
    } finally {
      if (mounted) {
        setLoading(false);
        setIsLoadingData(false);
      }
    }
  };

  const pollDraftStatus = async () => {
    try {
      // Check Phoenix for draft status updates on active drafts
      const activeDrafts = drafts.filter(draft => 
        draft.status === 'Waiting' || draft.status === 'In Progress'
      );
      
      for (const draft of activeDrafts) {
        try {
          const statusResponse = await axios.get(
            `${PHOENIX_DRAFT_URL}/api/drafts/${draft.draft_id}/status`
          );
          
          const phoenixStatus = statusResponse.data;
          
          // If status changed or draft completed, update React backend
          if (phoenixStatus.status !== draft.status || phoenixStatus.status === 'completed') {
            console.log(`Draft ${draft.draft_id} status changed: ${draft.status} -> ${phoenixStatus.status}`);
            
            // Update React backend with Phoenix results
            await axios.put(`${API_BASE_URL}/draft/${draft.draft_id}/sync`, {
              phoenixStatus: phoenixStatus,
              status: phoenixStatus.status,
              currentPhase: phoenixStatus.current_phase,
              results: phoenixStatus.picks
            }, { withCredentials: true });
            
            // Refresh draft data to show updates
            loadDraftData();
            
            if (phoenixStatus.status === 'completed') {
              toast.success(`Draft completed: ${getTeamName(draft.team1_name)} vs ${getTeamName(draft.team2_name)}`);
            }
          }
        } catch (error) {
          // Silently ignore individual draft polling errors
          console.warn(`Failed to poll status for draft ${draft.draft_id}:`, error.message);
        }
      }
    } catch (error) {
      // Silently ignore polling errors to avoid spam
      console.warn('Draft status polling error:', error.message);
    }
  };

  const extractMatchesFromBracket = (bracketData) => {
    console.log('🔍 EXTRACTING MATCHES FROM BRACKET');
    console.log('Bracket data received:', bracketData);
    console.log('Bracket type:', bracketData?.type);
    console.log('Bracket keys:', Object.keys(bracketData || {}));
    
    const matches = [];
    
    try {
      // Handle different bracket structures
      if (bracketData?.type === 'Single Elimination') {
        console.log('Processing Single Elimination bracket');
        
        if (bracketData.rounds && Array.isArray(bracketData.rounds)) {
          console.log(`Found ${bracketData.rounds.length} rounds`);
          
          bracketData.rounds.forEach((round, roundIndex) => {
            console.log(`Processing round ${roundIndex + 1}:`, round);
            console.log(`Round keys:`, Object.keys(round));
            
            if (round.matches && Array.isArray(round.matches)) {
              console.log(`Round ${roundIndex + 1} has ${round.matches.length} matches`);
              
              round.matches.forEach((match, matchIndex) => {
                console.log(`Match ${matchIndex + 1}:`, match);
                
                if (match.team1 && match.team2 && 
                    match.team1 !== 'bye' && match.team2 !== 'bye' &&
                    match.team1 !== 'TBD' && match.team2 !== 'TBD') {
                  
                  const processedMatch = {
                    ...match,
                    roundName: getRoundName('SE', roundIndex + 1, bracketData.rounds.length),
                    bracketType: 'SE',
                    id: match.id || `r${roundIndex + 1}m${matchIndex + 1}`
                  };
                  
                  matches.push(processedMatch);
                  console.log(`✅ Added match: ${match.team1} vs ${match.team2}`);
                } else {
                  console.log(`❌ Skipped match - invalid teams: ${match.team1} vs ${match.team2}`);
                }
              });
            } else {
              console.log(`❌ Round ${roundIndex + 1} has no matches array`);
            }
          });
        } else {
          console.log('❌ No rounds array found in Single Elimination bracket');
        }
      } else if (bracketData?.type === 'Double Elimination') {
        console.log('Processing Double Elimination bracket');
        
        // Extract from upper bracket
        if (bracketData.upperBracket?.rounds) {
          console.log(`Upper bracket has ${bracketData.upperBracket.rounds.length} rounds`);
          bracketData.upperBracket.rounds.forEach((round, roundIndex) => {
            if (round.matches) {
              round.matches.forEach(match => {
                if (match.team1 && match.team2 && 
                    match.team1 !== 'bye' && match.team2 !== 'bye' &&
                    match.team1 !== 'TBD' && match.team2 !== 'TBD') {
                  matches.push({
                    ...match,
                    roundName: getRoundName('UB', roundIndex + 1, bracketData.upperBracket.rounds.length),
                    bracketType: 'UB'
                  });
                  console.log(`✅ Added UB match: ${match.team1} vs ${match.team2}`);
                }
              });
            }
          });
        }
        
        // Extract from lower bracket
        if (bracketData.lowerBracket?.rounds) {
          console.log(`Lower bracket has ${bracketData.lowerBracket.rounds.length} rounds`);
          bracketData.lowerBracket.rounds.forEach((round, roundIndex) => {
            if (round.matches) {
              round.matches.forEach(match => {
                if (match.team1 && match.team2 && 
                    match.team1 !== 'bye' && match.team2 !== 'bye' &&
                    match.team1 !== 'TBD' && match.team2 !== 'TBD') {
                  matches.push({
                    ...match,
                    roundName: getRoundName('LB', roundIndex + 1, bracketData.lowerBracket.rounds.length),
                    bracketType: 'LB'
                  });
                  console.log(`✅ Added LB match: ${match.team1} vs ${match.team2}`);
                }
              });
            }
          });
        }
      } else {
        console.log('❌ Unsupported bracket type or missing type:', bracketData?.type);
        
        // Try to extract matches from any structure we can find
        console.log('🔍 Attempting to find matches in any available structure...');
        
        // Check if matches are directly in the bracket data
        if (bracketData?.matches && Array.isArray(bracketData.matches)) {
          console.log('Found matches directly in bracket data');
          bracketData.matches.forEach(match => {
            if (match.team1 && match.team2 && 
                match.team1 !== 'bye' && match.team2 !== 'bye' &&
                match.team1 !== 'TBD' && match.team2 !== 'TBD') {
              matches.push({
                ...match,
                roundName: 'Round 1',
                bracketType: 'UNKNOWN'
              });
              console.log(`✅ Added direct match: ${match.team1} vs ${match.team2}`);
            }
          });
        }
        
        // Check all properties for match arrays
        Object.keys(bracketData || {}).forEach(key => {
          const value = bracketData[key];
          if (Array.isArray(value)) {
            console.log(`Checking array property: ${key}`);
            value.forEach((item, index) => {
              if (item && typeof item === 'object' && item.team1 && item.team2) {
                console.log(`Found potential match in ${key}[${index}]:`, item);
                if (item.team1 !== 'bye' && item.team2 !== 'bye' &&
                    item.team1 !== 'TBD' && item.team2 !== 'TBD') {
                  matches.push({
                    ...item,
                    roundName: `${key} ${index + 1}`,
                    bracketType: 'DISCOVERED'
                  });
                  console.log(`✅ Added discovered match: ${item.team1} vs ${item.team2}`);
                }
              }
            });
          }
        });
      }
      
      console.log(`🎯 EXTRACTION COMPLETE: Found ${matches.length} valid matches`);
      matches.forEach((match, i) => {
        console.log(`Match ${i + 1}: ${match.team1} vs ${match.team2} (${match.roundName})`);
      });
      
    } catch (error) {
      console.error('❌ Error extracting matches:', error);
    }
    
    return matches;
  };
  
  const getRoundName = (bracket, roundNum, totalRounds) => {
    if (bracket === 'SE') {
      if (roundNum === totalRounds) return 'Finals';
      if (roundNum === totalRounds - 1) return 'Semi Finals';
      if (roundNum === totalRounds - 2) return 'Quarter Finals';
      return `Round ${roundNum}`;
    }
    
    if (bracket === 'UB') {
      if (roundNum === totalRounds) return 'UB Finals';
      if (roundNum === totalRounds - 1) return 'UB SF';
      if (roundNum === totalRounds - 2) return 'UB QF';
      return `UB R${roundNum}`;
    }
    
    if (bracket === 'LB') {
      if (roundNum === totalRounds) return 'LB Finals';
      if (roundNum === totalRounds - 1) return 'LB SF';
      return `LB R${roundNum}`;
    }
    
    return `R${roundNum}`;
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
        const foundTeam = teams?.find(t => t && t.team_id === team);
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

    let phoenixPayload = null; // Declare at function scope for error handling
    let team1 = null; // Declare at function scope for error handling
    let team2 = null; // Declare at function scope for error handling
    
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
      const matchTeam1Id = getTeamId(match.team1);
      const matchTeam2Id = getTeamId(match.team2);
      
      console.log('Looking for teams:', { matchTeam1Id, matchTeam2Id });
      console.log('Available teams:', teams.map(t => ({ id: t.id, team_id: t.team_id, team_name: t.team_name })));
      
      // Try to find teams by team_id
      team1 = teams?.find(t => t && t.team_id === matchTeam1Id);
      team2 = teams?.find(t => t && t.team_id === matchTeam2Id);
      
      // If not found by team_id, try by team_name (in case match stores team names)
      if (!team1 && match.team1?.team_name) {
        team1 = teams?.find(t => t && t.team_name === match.team1.team_name);
      }
      if (!team2 && match.team2?.team_name) {
        team2 = teams?.find(t => t && t.team_name === match.team2.team_name);
      }
      
      console.log('Found teams:', { team1, team2 });
      
      if (!team1 || !team2) {
        const missing = [];
        if (!team1) missing.push(`Team 1: ${matchTeam1Id || match.team1?.team_name || 'unknown'}`);
        if (!team2) missing.push(`Team 2: ${matchTeam2Id || match.team2?.team_name || 'unknown'}`);
        toast.error(`Teams not found: ${missing.join(', ')}`);
        return;
      }

      // Ensure UUIDs exist for teams
      const ensureUuid = (id) => {
        if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
          return `${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 4)}-${Math.random().toString(36).substr(2, 4)}-${Math.random().toString(36).substr(2, 4)}-${Math.random().toString(36).substr(2, 12)}`.replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5');
        }
        return id;
      };
      
      const team1Id = ensureUuid(team1.id);
      const team2Id = ensureUuid(team2.id);
      
      // Don't send captain IDs if they don't exist in the database
      // The Phoenix system will handle drafts without captain IDs
      console.log('Creating draft with:', {
        tournamentId: tournament.id,
        team1Id,
        team2Id
      });
      
      // Generate unique draft ID
      const draftId = `draft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      console.log('Creating React backend draft with ID:', draftId);
      
      // Create draft in React backend first (this has proper authentication)
      const response = await axios.post(`${API_BASE_URL}/draft`, {
        tournamentId: tournament.id,
        team1Id: team1Id,
        team2Id: team2Id,
        phoenixDraftId: draftId,
        draftConfig: draftConfig  // Send entire config object
      }, { withCredentials: true });
      
      const draftData = response.data;
      console.log('✅ React backend response:', draftData);
      
      // Phoenix URLs will be used when users click "Enter as team" buttons
      // No need to pre-create in Phoenix as it will be handled by LiveView authentication
      
      // Show success message and refresh data
      toast.success('Draft session created successfully!', { autoClose: 3000 });
      
      // Add the draft to the local state immediately for better UX
      const newDraft = {
        id: draftData.id || draftId,
        draft_id: draftData.draft_id || draftId,
        team1_name: team1.team_id || team1.team_name,
        team2_name: team2.team_id || team2.team_name,
        status: 'Waiting',
        current_phase: 'Coin Toss',
        created_at: new Date().toISOString(),
        phoenixDraftId: draftData.draft_id || draftId
      };
      
      // Add to drafts state immediately
      setDrafts(prevDrafts => [...prevDrafts, newDraft]);
      
      // Don't auto-refresh since it clears Phoenix-only drafts
      // The draft is already added to the state above
      console.log('Draft added to state. Not auto-refreshing to preserve Phoenix draft.');
      
      setSelectedMatch('');
      
      // Show the draft information
      console.log('Draft created:', draftData);
      console.log('Draft URLs:');
      console.log('  Team 1:', `${PHOENIX_DRAFT_URL}/draft/${draftData.draft_id || draftId}?captain=1`);
      console.log('  Team 2:', `${PHOENIX_DRAFT_URL}/draft/${draftData.draft_id || draftId}?captain=2`);
      
    } catch (error) {
      console.error('Error creating draft:', error);
      console.error('Error response:', error.response);
      
      if (error.response?.data) {
        console.error('Backend error response:', error.response.data);
        console.error('Error details:', error.response.data.details);
      }
      
      // Log the exact payload that was sent
      console.error('Phoenix payload that was sent:', phoenixPayload);
      console.error('Team data used:', { team1, team2 });
      
      // Handle specific error cases
      if (error.response?.status === 409) {
        toast.warning('A draft session already exists for this match');
      } else if (error.response?.status === 422) {
        const details = error.response.data?.details;
        const errorMsg = details ? `Validation error: ${JSON.stringify(details)}` : 'Invalid data provided';
        toast.error(errorMsg);
      } else if (error.response?.status === 400) {
        const details = error.response.data?.details || error.response.data?.error;
        console.error('400 Bad Request details:', details);
        toast.error(`Bad Request: ${typeof details === 'object' ? JSON.stringify(details) : details}`);
      } else if (error.response?.status >= 500) {
        const errorText = error.response.data?.error || 'Server error';
        console.error('500 Server error details:', error.response.data);
        toast.error(`Server error: ${errorText} - Check console for details`);
      } else if (error.code === 'ERR_NETWORK') {
        toast.error('Network error - Phoenix server may not be running on port 4000');
      } else {
        const errorMsg = error.response?.data?.error || error.message || 'Failed to create draft';
        toast.error(errorMsg);
      }
    } finally {
      setCreatingDraft(false);
    }
  };

  const getMyTeamDraft = () => {
    if (!isTeamCaptain || !user) return null;
    
    // Find drafts where user is a captain
    return drafts.find(draft => {
      const myTeam = teams?.find(t => 
        t && (t.captain_id === user?.id || t.captain_username === user?.discord_username)
      );
      return myTeam && (
        draft.team1_name === myTeam.team_id || 
        draft.team2_name === myTeam.team_id
      );
    });
  };

  const handleResetDraft = async (draftId) => {
    const confirmReset = window.confirm(
      'Are you sure you want to reset this draft? This will:\n' +
      '- Reset the draft to Coin Toss phase\n' +
      '- Clear all picks and bans\n' +
      '- Disconnect both teams\n' +
      '- Clear coin toss results\n\n' +
      'This action cannot be undone.'
    );
    
    if (!confirmReset) return;
    
    try {
      const response = await axios.post(`${API_BASE_URL}/draft/${draftId}/reset`, {}, {
        withCredentials: true
      });
      
      toast.success('Draft reset successfully!');
      
      // Refresh draft data to show updated status
      setTimeout(() => {
        loadDraftData();
      }, 500);
      
    } catch (error) {
      console.error('Error resetting draft:', error);
      if (error.response?.status === 404) {
        toast.error('Draft not found');
      } else if (error.response?.status === 403) {
        toast.error('Only admins can reset drafts');
      } else {
        toast.error(error.response?.data?.error || 'Failed to reset draft');
      }
    }
  };

  const handleDeleteDraft = async (draftId, matchName) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to DELETE this draft?\n\n` +
      `Match: ${matchName}\n` +
      `Draft ID: ${draftId}\n\n` +
      `⚠️ WARNING: This will permanently delete the draft and cannot be undone!\n\n` +
      `After deletion, a new draft can be created for this match.`
    );
    
    if (!confirmDelete) return;
    
    try {
      const response = await axios.delete(`${API_BASE_URL}/draft/${draftId}`, {
        withCredentials: true
      });
      
      toast.success(`Draft deleted successfully! You can now create a new draft for ${matchName}.`);
      
      // Immediately remove the deleted draft from state for instant UI update
      setDrafts(prevDrafts => prevDrafts.filter(draft => 
        (draft.draft_id || draft.id) !== draftId
      ));
      
      // Reset selected match
      setSelectedMatch('');
      
      // Also refresh data to ensure consistency (but UI already updated)
      setTimeout(() => {
        loadDraftData();
      }, 500);
      
    } catch (error) {
      console.error('Error deleting draft:', error);
      if (error.response?.status === 404) {
        toast.error('Draft not found');
      } else if (error.response?.status === 403) {
        toast.error('Only admins can delete drafts');
      } else {
        toast.error(error.response?.data?.error || 'Failed to delete draft');
      }
    }
  };

  const isUserInTeam = (user, teamName) => {
    if (!user || !teams) return false;
    
    // Find the team by name
    const team = teams?.find(t => 
      t && (t.team_name === teamName || t.team_id === teamName)
    );
    
    if (!team) return false;
    
    // Check if user is captain or member
    return team.captain_id === user.id || 
           team.captain_username === user.discord_username ||
           team.members?.some(member => member.user_id === user.id);
  };

  // Generate authenticated Phoenix draft URL
  const generateAuthenticatedDraftUrl = async (draftId, captain = null) => {
    try {
      console.log('🔐 Starting authentication process...');
      console.log('User:', user);
      console.log('Draft ID:', draftId);
      console.log('Captain:', captain);
      
      if (!user?.userID) {
        console.warn('❌ Cannot generate authenticated URL - user not logged in');
        return `${PHOENIX_DRAFT_URL}/draft/${draftId}${captain ? `?captain=${captain}` : ''}`;
      }

      console.log('📞 Requesting token from Phoenix...');
      // Request authentication token from Phoenix
      const response = await axios.post(`${PHOENIX_DRAFT_URL}/api/auth/token`, {
        user_id: user.userID,
        draft_id: draftId,
        captain: captain
      });

      console.log('✅ Phoenix token response:', response.data);

      if (response.data.draft_url) {
        console.log('🎯 Using Phoenix-provided draft URL:', response.data.draft_url);
        return response.data.draft_url;
      }

      // Fallback to manual URL construction if draft_url not provided
      const constructedUrl = `${PHOENIX_DRAFT_URL}/draft/${draftId}?token=${response.data.token}${captain ? `&captain=${captain}` : ''}`;
      console.log('🔧 Using constructed URL:', constructedUrl);
      return constructedUrl;
      
    } catch (error) {
      console.error('❌ Failed to generate authenticated URL:', error);
      console.error('Error details:', error.response?.data);
      
      // Fallback to non-authenticated URL
      console.warn('⚠️ Using non-authenticated URL as fallback');
      return `${PHOENIX_DRAFT_URL}/draft/${draftId}${captain ? `?captain=${captain}` : ''}`;
    }
  };

  // Check if a match already has an active draft
  const matchHasActiveDraft = (match) => {
    if (!drafts || !match.team1 || !match.team2) return false;
    
    // Get team IDs for comparison
    const matchTeam1Id = getTeamId(match.team1);
    const matchTeam2Id = getTeamId(match.team2);
    
    const hasActiveDraft = drafts.some(draft => {
      if (!draft || draft.status === 'Completed' || draft.status === 'Stopped') return false;
      
      // Handle different data formats - draft might have team names or team IDs
      let draftTeam1Id, draftTeam2Id;
      
      // If draft.team1_name looks like a team_id, use it directly
      if (typeof draft.team1_name === 'string' && draft.team1_name.startsWith('team_')) {
        draftTeam1Id = draft.team1_name;
        draftTeam2Id = draft.team2_name;
      } else {
        // Otherwise, find the team_id by team name
        const team1 = teams?.find(t => t && t.team_name === draft.team1_name);
        const team2 = teams?.find(t => t && t.team_name === draft.team2_name);
        draftTeam1Id = team1?.team_id;
        draftTeam2Id = team2?.team_id;
      }
      
      // Skip if we couldn't determine team IDs
      if (!draftTeam1Id || !draftTeam2Id) {
        return false;
      }
      
      // Check both team arrangements (A vs B or B vs A)
      return (draftTeam1Id === matchTeam1Id && draftTeam2Id === matchTeam2Id) ||
             (draftTeam1Id === matchTeam2Id && draftTeam2Id === matchTeam1Id);
    });
    return hasActiveDraft;
  };

  // Filter matches to only show those without active drafts
  const availableMatches = matches.filter(match => !matchHasActiveDraft(match));

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

      {/* Error Display */}
      {error && (
        <div className="error-message" style={{ 
          background: '#ffe6e6', 
          border: '1px solid #ff4444', 
          padding: '10px', 
          borderRadius: '5px',
          margin: '10px 0',
          color: '#cc0000'
        }}>
          <strong>Error:</strong> {error}
        </div>
      )}

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
                onClick={async () => {
                  const myTeam = teams?.find(t => 
                    t && (t.captain_id === user?.id || t.captain_username === user?.discord_username)
                  );
                  const captainParam = myDraft.team1_name === myTeam.team_id ? '1' : '2';
                  // Redirect to Phoenix draft system with authentication
                  const url = await generateAuthenticatedDraftUrl(myDraft.draft_id, captainParam);
                  window.open(url, '_blank');
                }}
              >
                Enter Draft Room
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Debug Info */}
      {isAdmin && (
        <div className="debug-info" style={{ backgroundColor: '#333', padding: '10px', margin: '10px 0', borderRadius: '4px' }}>
          <h4>Debug Information (Admin Only)</h4>
          <p>isAdmin: {String(isAdmin)}</p>
          <p>isTeamCaptain: {String(isTeamCaptain)}</p>
          <p>matches.length: {matches.length}</p>
          <p>loading: {String(loading)}</p>
          <p>tournament ID: {tournament?.id || tournamentId}</p>
          <p>user ID: {user?.id}</p>
          <p>bracket API called: {String(!!tournament?.id)}</p>
          {matches.length > 0 && (
            <details>
              <summary>Available Matches ({matches.length})</summary>
              <pre style={{ fontSize: '12px', overflow: 'auto' }}>
                {JSON.stringify(matches, null, 2)}
              </pre>
            </details>
          )}
          {matches.length === 0 && (
            <details>
              <summary>Troubleshooting - Why No Matches?</summary>
              <div style={{ fontSize: '12px', color: '#ccc' }}>
                <p>Check browser console for detailed bracket extraction logs.</p>
                <p>Common issues:</p>
                <ul>
                  <li>Bracket API returned empty/invalid data</li>
                  <li>Bracket structure doesn't match expected format</li>
                  <li>All matches filtered out (TBD teams, existing drafts, etc.)</li>
                  <li>Tournament bracket not published</li>
                </ul>
              </div>
            </details>
          )}
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
                {availableMatches.length === 0 ? (
                  <option disabled>No available matches (all have active drafts)</option>
                ) : (
                  availableMatches.map(match => (
                    <option key={match.id} value={match.id}>
                      {match.roundName || getMatchRound(match)} - {getTeamName(match.team1)} vs {getTeamName(match.team2)}
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Configuration Button */}
            {selectedMatch && (
              <div className="config-actions">
                <button 
                  className="btn btn-outline btn-sm"
                  onClick={() => setShowConfigModal(true)}
                >
                  ⚙️ Configure Draft Settings
                </button>
                <span className="config-preview">
                  {draftConfig.banCount} bans • {draftConfig.draftStrategy} • 
                  {draftConfig.timerEnabled ? ` Timer: ${draftConfig.bonusTime}s bonus` : ' No timer strategy'}
                </span>
              </div>
            )}

            <button 
              className="btn btn-success"
              onClick={() => selectedMatch ? setShowConfigModal(true) : null}
              disabled={!selectedMatch || creatingDraft || availableMatches.length === 0}
            >
              {creatingDraft ? 'Creating...' : 
               availableMatches.length === 0 ? 'No matches available' : 
               'Create Draft Session'}
            </button>
          </div>
        </div>
      )}

      {/* Tournament Drafts Section - For Admins and Team Captains */}
      {/* TODO: Remove || true after fixing auth */}
      {(isAdmin || isTeamCaptain || true) && (
        <div className="tournament-drafts-section">
          <h3>Tournament Drafts</h3>
          {drafts.length === 0 ? (
            <div className="no-drafts">
              <p>No draft sessions have been created yet for this tournament.</p>
            </div>
          ) : (
            <div className="drafts-list">
            {drafts
              .filter(draft => draft && draft.id) // Filter out null drafts
              .sort((a, b) => {
                // Sort by status: active drafts first, then by creation date
                const statusPriority = { 'Waiting': 0, 'In Progress': 1, 'Completed': 2, 'Stopped': 3 };
                const aStatus = statusPriority[a.status] ?? 4;
                const bStatus = statusPriority[b.status] ?? 4;
                if (aStatus !== bStatus) return aStatus - bStatus;
                return new Date(b.created_at) - new Date(a.created_at);
              })
              .map(draft => {
                const myTeam = teams?.find(t => 
                  t && (t.captain_id === user?.id || t.captain_username === user?.discord_username)
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
                      {/* Team-Specific Links */}
                      <div className="captain-links">
                        {/* Team 1 Button - Only show to Team 1 members or admins */}
                        {(isAdmin || (user && isUserInTeam(user, draft.team1_name))) && (
                          <div className="team-link">
                            <span className="team-name">{getTeamName(draft.team1_name)}</span>
                            <a 
                              className="btn btn-sm btn-primary"
                              href="#"
                              onClick={async (e) => {
                                e.preventDefault();
                                const url = await generateAuthenticatedDraftUrl(draft.draft_id, '1');
                                window.open(url, '_blank');
                              }}
                              onMouseDown={async (e) => {
                                // Handle middle click (mouse button 1) and right click (mouse button 2)
                                if (e.button === 1) { // Middle click
                                  e.preventDefault();
                                  const url = await generateAuthenticatedDraftUrl(draft.draft_id, '1');
                                  window.open(url, '_blank');
                                }
                              }}
                              onContextMenu={async (e) => {
                                // Update href for right-click menu
                                const url = await generateAuthenticatedDraftUrl(draft.draft_id, '1');
                                e.target.href = url;
                              }}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              Enter as {getTeamName(draft.team1_name)}
                            </a>
                          </div>
                        )}
                        
                        {/* Team 2 Button - Only show to Team 2 members or admins */}
                        {(isAdmin || (user && isUserInTeam(user, draft.team2_name))) && (
                          <div className="team-link">
                            <span className="team-name">{getTeamName(draft.team2_name)}</span>
                            <a 
                              className="btn btn-sm btn-primary"
                              href="#"
                              onClick={async (e) => {
                                e.preventDefault();
                                const url = await generateAuthenticatedDraftUrl(draft.draft_id, '2');
                                window.open(url, '_blank');
                              }}
                              onMouseDown={async (e) => {
                                // Handle middle click (mouse button 1) and right click (mouse button 2)
                                if (e.button === 1) { // Middle click
                                  e.preventDefault();
                                  const url = await generateAuthenticatedDraftUrl(draft.draft_id, '2');
                                  window.open(url, '_blank');
                                }
                              }}
                              onContextMenu={async (e) => {
                                // Update href for right-click menu
                                const url = await generateAuthenticatedDraftUrl(draft.draft_id, '2');
                                e.target.href = url;
                              }}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              Enter as {getTeamName(draft.team2_name)}
                            </a>
                          </div>
                        )}
                      </div>
                      
                      {/* Spectator Link - Show to everyone not in either team, or admins */}
                      {(!user || !isUserInTeam(user, draft.team1_name) && !isUserInTeam(user, draft.team2_name) || isAdmin) && (
                        <div className="spectator-link">
                          <span>Spectate:</span>
                          <button 
                            className="btn btn-sm btn-outline"
                            onClick={() => {
                              // Direct link to spectate route - no authentication needed for spectators
                              const spectateUrl = `${PHOENIX_DRAFT_URL}/draft/${draft.draft_id}/spectate`;
                              window.open(spectateUrl, '_blank');
                            }}
                          >
                            Watch Live
                          </button>
                        </div>
                      )}
                      
                      {/* Admin Actions */}
                      {isAdmin && (
                        <div className="admin-actions">
                          <button 
                            className="btn btn-sm btn-warning"
                            onClick={() => handleResetDraft(draft.draft_id)}
                            style={{ marginLeft: '8px' }}
                          >
                            Reset Draft
                          </button>
                          <button 
                            className="btn btn-sm btn-danger"
                            onClick={() => handleDeleteDraft(draft.draft_id, `${getTeamName(draft.team1_name)} vs ${getTeamName(draft.team2_name)}`)}
                            style={{ marginLeft: '8px' }}
                            title="Delete this draft permanently"
                          >
                            🗑️ Delete
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
      {/* TODO: Fix spectator logic */}
      {(!isAdmin && !isTeamCaptain && !true) && drafts.length > 0 && (
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
                    onClick={() => {
                      const spectateUrl = `${PHOENIX_DRAFT_URL}/draft/${draft.draft_id}/spectate`;
                      window.open(spectateUrl, '_blank');
                    }}
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

      {/* Draft Configuration Modal */}
      {showConfigModal && (
        <div className="modal-overlay" onClick={() => setShowConfigModal(false)}>
          <div className="modal-content draft-config-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Draft Configuration</h3>
              <button 
                className="modal-close-btn"
                onClick={() => setShowConfigModal(false)}
              >
                ×
              </button>
            </div>
            
            <div className="modal-body">
              <div className="config-form">
                <div className="config-row">
                  <div className="form-group">
                    <label>Number of Bans</label>
                    <select 
                      value={draftConfig.banCount}
                      onChange={(e) => setDraftConfig(prev => ({ ...prev, banCount: parseInt(e.target.value) }))}
                    >
                      <option value={2}>2 bans per team</option>
                      <option value={3}>3 bans per team</option>
                      <option value={4}>4 bans per team</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Draft Strategy</label>
                    <select 
                      value={draftConfig.draftStrategy}
                      onChange={(e) => setDraftConfig(prev => ({ ...prev, draftStrategy: e.target.value }))}
                    >
                      <option value="free pick">Free Pick (Mirror picks allowed)</option>
                      <option value="restricted">Restricted (No Mirror Picks)</option>
                    </select>
                  </div>
                </div>

                <div className="config-row">
                  <div className="form-group checkbox-group">
                    <label className="checkbox-label">
                      <input 
                        type="checkbox"
                        checked={draftConfig.timerEnabled}
                        onChange={(e) => setDraftConfig(prev => ({ ...prev, timerEnabled: e.target.checked }))}
                      />
                      Enable Timer Strategy
                    </label>
                    <p className="help-text">Base timer always runs (20s). This adds bonus time pools.</p>
                  </div>
                </div>

                {draftConfig.timerEnabled && (
                  <div className="config-row timer-options">
                    <div className="form-group">
                      <label>Bonus Time per Team</label>
                      <select 
                        value={draftConfig.bonusTime}
                        onChange={(e) => setDraftConfig(prev => ({ ...prev, bonusTime: e.target.value === 'disabled' ? 'disabled' : parseInt(e.target.value) }))}
                      >
                        <option value="disabled">No Bonus Time</option>
                        <option value={10}>10 seconds</option>
                        <option value={15}>15 seconds</option>
                        <option value={20}>20 seconds</option>
                        <option value={25}>25 seconds</option>
                        <option value={30}>30 seconds</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Timer Strategy</label>
                      <select 
                        value={draftConfig.timerStrategy}
                        onChange={(e) => setDraftConfig(prev => ({ ...prev, timerStrategy: e.target.value }))}
                      >
                        <option value="20s per pick">20s per pick</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="modal-footer">
              <button 
                className="btn btn-secondary"
                onClick={() => setShowConfigModal(false)}
              >
                Cancel
              </button>
              <button 
                className="btn btn-success"
                onClick={() => {
                  setShowConfigModal(false);
                  handleCreateDraft();
                }}
                disabled={!selectedMatch || creatingDraft}
              >
                {creatingDraft ? 'Creating...' : 'Create Draft Session'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TournamentDrafts;