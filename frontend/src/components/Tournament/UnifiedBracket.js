import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';
import { toast } from 'react-toastify';
import MatchScoreModal from './MatchScoreModal';
import BracketErrorBoundary from './BracketErrorBoundary';
import './UnifiedBracket.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

// Optimized deep clone function for bracket data
const deepCloneBracket = (obj) => {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime());
  if (obj instanceof Array) return obj.map(item => deepCloneBracket(item));
  
  const cloned = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      cloned[key] = deepCloneBracket(obj[key]);
    }
  }
  return cloned;
};

// Utility function to safely get team ID from team object or string
const getTeamId = (team) => {
  if (!team || team === 'bye') return team || null;
  if (typeof team === 'string') return team;
  return team.team_id || team;
};

const UnifiedBracket = ({ tournamentId, onBracketUpdate }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [tournament, setTournament] = useState(null);
  const [teams, setTeams] = useState([]);
  const [bracketData, setBracketData] = useState(null);
  const [lockedSlots, setLockedSlots] = useState(new Set());
  const [bracketView, setBracketView] = useState('upper'); // For double elimination
  const [isPublished, setIsPublished] = useState(false);
  const [seedingMode, setSeedingMode] = useState('random'); // 'random' or 'manual'
  const [scoreModalOpen, setScoreModalOpen] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [seriesLength, setSeriesLength] = useState(1); // Best of X

  useEffect(() => {
    if (tournamentId) {
      loadData();
    }
  }, [tournamentId]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load tournament details
      const tournamentsResponse = await axios.get(`${API_BASE_URL}/tournaments`, {
        withCredentials: true
      });
      const tournaments = tournamentsResponse.data || [];
      const tournamentData = tournaments.find(t => t.tournament_id === tournamentId);
      setTournament(tournamentData);

      // Load teams
      const teamsResponse = await axios.get(`${API_BASE_URL}/tournaments/${tournamentId}/registrations`, {
        withCredentials: true
      });
      const allRegisteredTeams = teamsResponse.data.registrations || [];
      const checkedInTeams = allRegisteredTeams.filter(team => team.checked_in);
      setTeams(checkedInTeams);

      // Initialize bracket structure based on ALL registered teams
      // This ensures we have enough match boxes for everyone
      if (allRegisteredTeams.length >= 2) {
        initializeBracket(allRegisteredTeams, tournamentData?.bracket_type || 'Single Elimination');
      }
      
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load bracket data');
    } finally {
      setLoading(false);
    }
  };

  const initializeBracket = (availableTeams, bracketType) => {
    const teamCount = availableTeams.length;
    
    if (bracketType === 'Double Elimination') {
      initializeDoubleElimination(teamCount);
    } else {
      initializeSingleElimination(teamCount);
    }
  };

  const initializeSingleElimination = (teamCount) => {
    // Calculate rounds needed for the actual team count
    const rounds = Math.ceil(Math.log2(teamCount));
    
    const bracketStructure = {
      type: 'Single Elimination',
      rounds: [],
      totalRounds: rounds,
      totalTeams: teamCount
    };

    // Calculate matches needed per round starting with actual team count
    let teamsInRound = teamCount;
    
    for (let round = 1; round <= rounds; round++) {
      const matchesInRound = Math.ceil(teamsInRound / 2);
      
      const roundData = {
        round,
        name: getRoundName(round, rounds),
        matches: []
      };

      for (let match = 0; match < matchesInRound; match++) {
        const matchId = `r${round}m${match}`;
        // In the first round, check if this match will have a bye
        // A bye occurs when we have odd teams and this is the last match
        let isByeMatch = false;
        if (round === 1 && teamCount % 2 === 1 && match === matchesInRound - 1) {
          // If we have odd teams, the last match in round 1 will have a bye
          isByeMatch = true;
        }
        
        roundData.matches.push({
          id: matchId,
          round,
          position: match,
          team1: null,
          team2: null,
          winner: null,
          locked: false,
          isBye: isByeMatch,
          nextMatch: round < rounds ? `r${round + 1}m${Math.floor(match / 2)}` : null,
          nextPosition: round < rounds ? (match % 2 === 0 ? 'team1' : 'team2') : null
        });
      }
      
      bracketStructure.rounds.push(roundData);
      
      // Calculate teams advancing to next round
      teamsInRound = matchesInRound;
    }

    setBracketData(bracketStructure);
  };

  const initializeDoubleElimination = (teamCount) => {
    // Special handling for specific team counts to match Challonge structure
    const bracketStructure = {
      type: 'Double Elimination',
      upperBracket: {
        rounds: []
      },
      lowerBracket: {
        rounds: []
      },
      grandFinal: null,
      totalTeams: teamCount
    };

    // Special handling for specific team counts
    if (teamCount === 10) {
      // Upper bracket - ALL 10 teams start here
      // Round 1: 5 matches (10 teams all play)
      bracketStructure.upperBracket.rounds.push({
        round: 1,
        name: 'Round 1',
        matches: [
          { id: 'u1m0', round: 1, position: 0, team1: null, team2: null, winner: null, loser: null, locked: false, isBye: false, winnerTo: 'u2m0', loserTo: 'l1m0' },
          { id: 'u1m1', round: 1, position: 1, team1: null, team2: null, winner: null, loser: null, locked: false, isBye: false, winnerTo: 'u2m0', loserTo: 'l1m0' },
          { id: 'u1m2', round: 1, position: 2, team1: null, team2: null, winner: null, loser: null, locked: false, isBye: false, winnerTo: 'u2m1', loserTo: 'l1m1' },
          { id: 'u1m3', round: 1, position: 3, team1: null, team2: null, winner: null, loser: null, locked: false, isBye: false, winnerTo: 'u2m1', loserTo: 'l1m1' },
          { id: 'u1m4', round: 1, position: 4, team1: null, team2: null, winner: null, loser: null, locked: false, isBye: false, winnerTo: 'u2m2', loserTo: 'l1m2' }
        ]
      });

      // Round 2: 3 matches (5 winners from R1, but only 3 matches so winner of u1m4 gets a bye to round 3)
      bracketStructure.upperBracket.rounds.push({
        round: 2,
        name: 'Quarter-Final',
        matches: [
          { id: 'u2m0', round: 2, position: 0, team1: null, team2: null, winner: null, loser: null, locked: false, isBye: false, winnerTo: 'u3m0', loserTo: 'l2m0' },
          { id: 'u2m1', round: 2, position: 1, team1: null, team2: null, winner: null, loser: null, locked: false, isBye: false, winnerTo: 'u3m0', loserTo: 'l2m1' },
          { id: 'u2m2', round: 2, position: 2, team1: null, team2: null, winner: null, loser: null, locked: false, isBye: false, winnerTo: 'u3m1', loserTo: 'l2m2' }
        ]
      });

      // Round 3: 2 matches (3 winners)
      bracketStructure.upperBracket.rounds.push({
        round: 3,
        name: 'Semi-Final',
        matches: [
          { id: 'u3m0', round: 3, position: 0, team1: null, team2: null, winner: null, loser: null, locked: false, isBye: false, winnerTo: 'u4m0', loserTo: 'l4m0' },
          { id: 'u3m1', round: 3, position: 1, team1: null, team2: null, winner: null, loser: null, locked: false, isBye: false, winnerTo: 'u4m0', loserTo: 'l4m1' }
        ]
      });

      // Round 4: 1 match (Final)
      bracketStructure.upperBracket.rounds.push({
        round: 4,
        name: 'Final',
        matches: [
          { id: 'u4m0', round: 4, position: 0, team1: null, team2: null, winner: null, loser: null, locked: false, isBye: false, winnerTo: 'grand-final', loserTo: 'l5m0' }
        ]
      });

      // Lower bracket - 5 rounds
      // Round 1: 2 matches (4 of the 5 losers from upper R1 play, 1 gets bye)
      bracketStructure.lowerBracket.rounds.push({
        round: 1,
        name: 'Lower Round 1',
        isDropRound: false,
        matches: [
          { id: 'l1m0', round: 1, position: 0, team1: null, team2: null, winner: null, locked: false, winnerTo: 'l2m0' },
          { id: 'l1m1', round: 1, position: 1, team1: null, team2: null, winner: null, locked: false, winnerTo: 'l2m1' }
        ]
      });

      // Round 2: 3 matches (2 winners from L1 + 1 bye from L1 vs 3 losers from upper R2)
      bracketStructure.lowerBracket.rounds.push({
        round: 2,
        name: 'Lower Round 2',
        isDropRound: true,
        matches: [
          { id: 'l2m0', round: 2, position: 0, team1: null, team2: null, winner: null, locked: false, winnerTo: 'l3m0' },
          { id: 'l2m1', round: 2, position: 1, team1: null, team2: null, winner: null, locked: false, winnerTo: 'l3m0' },
          { id: 'l2m2', round: 2, position: 2, team1: null, team2: null, winner: null, locked: false, winnerTo: 'l3m1' }
        ]
      });

      // Round 3: 2 matches (3 winners from L2)
      bracketStructure.lowerBracket.rounds.push({
        round: 3,
        name: 'Lower Round 3',
        isDropRound: false,
        matches: [
          { id: 'l3m0', round: 3, position: 0, team1: null, team2: null, winner: null, locked: false, winnerTo: 'l4m0' },
          { id: 'l3m1', round: 3, position: 1, team1: null, team2: null, winner: null, locked: false, winnerTo: 'l4m1' }
        ]
      });

      // Round 4: 2 matches (2 winners from L3 vs 2 losers from upper R3)
      bracketStructure.lowerBracket.rounds.push({
        round: 4,
        name: 'Lower Round 4',
        isDropRound: true,
        matches: [
          { id: 'l4m0', round: 4, position: 0, team1: null, team2: null, winner: null, locked: false, winnerTo: 'l5m0' },
          { id: 'l4m1', round: 4, position: 1, team1: null, team2: null, winner: null, locked: false, winnerTo: 'l5m0' }
        ]
      });

      // Round 5: 1 match (2 winners from L4 vs 1 loser from upper final)
      bracketStructure.lowerBracket.rounds.push({
        round: 5,
        name: 'Lower Final',
        isDropRound: true,
        matches: [
          { id: 'l5m0', round: 5, position: 0, team1: null, team2: null, winner: null, locked: false, winnerTo: 'grand-final' }
        ]
      });
    } else {
      // General case for other team counts
      const upperRounds = Math.ceil(Math.log2(teamCount));
      
      // Create upper bracket
      // First round should have enough matches for actual team count
      let teamsInRound = teamCount;
      
      for (let round = 1; round <= upperRounds; round++) {
        const matchesInRound = Math.ceil(teamsInRound / 2);
        
        const roundData = {
          round,
          name: getRoundName(round, upperRounds),
          matches: []
        };

        for (let match = 0; match < matchesInRound; match++) {
          const matchId = `u${round}m${match}`;
          // In the first round, check if this match will have a bye  
          let isByeMatch = false;
          if (round === 1 && teamCount % 2 === 1 && match === matchesInRound - 1) {
            // If we have odd teams, the last match in round 1 will have a bye
            isByeMatch = true;
          }
          
          roundData.matches.push({
            id: matchId,
            round,
            position: match,
            team1: null,
            team2: null,
            winner: null,
            loser: null,
            locked: false,
            isBye: isByeMatch,
            winnerTo: round < upperRounds ? `u${round + 1}m${Math.floor(match / 2)}` : 'grand-final',
            loserTo: `l${round === 1 ? 1 : (round - 1) * 2}m${match}`
          });
        }
        
        bracketStructure.upperBracket.rounds.push(roundData);
        teamsInRound = matchesInRound;
      }

      // Create lower bracket
      const lowerRounds = (upperRounds - 1) * 2 - 1;
      for (let round = 1; round <= lowerRounds; round++) {
        const isDropRound = round % 2 === 0;
        const roundData = {
          round,
          name: `Lower Round ${round}`,
          isDropRound,
          matches: []
        };
        
        // Calculate matches based on pattern
        let matchesInRound = 1;
        if (round === 1) {
          matchesInRound = Math.floor(bracketStructure.upperBracket.rounds[0].matches.filter(m => !m.isBye).length / 2);
        } else if (isDropRound) {
          const upperSourceRound = round / 2 + 1;
          if (upperSourceRound <= upperRounds) {
            matchesInRound = bracketStructure.upperBracket.rounds[upperSourceRound - 1].matches.length;
          }
        } else {
          const prevRound = bracketStructure.lowerBracket.rounds[round - 2];
          matchesInRound = Math.ceil(prevRound.matches.length / 2);
        }

        for (let match = 0; match < matchesInRound; match++) {
          roundData.matches.push({
            id: `l${round}m${match}`,
            round,
            position: match,
            team1: null,
            team2: null,
            winner: null,
            locked: false,
            winnerTo: round < lowerRounds ? `l${round + 1}m${Math.floor(match / 2)}` : 'grand-final'
          });
        }
        
        bracketStructure.lowerBracket.rounds.push(roundData);
      }
    }

    // Grand Final
    bracketStructure.grandFinal = {
      id: 'grand-final',
      upperWinner: null,
      lowerWinner: null,
      champion: null,
      needsReset: false,
      locked: false
    };

    setBracketData(bracketStructure);
  };

  const getRoundName = (round, totalRounds) => {
    if (round === totalRounds) return 'Final';
    if (round === totalRounds - 1) return 'Semi-Final';
    if (round === totalRounds - 2) return 'Quarter-Final';
    return `Round ${round}`;
  };

  // Get proper bracket placement order for seeding
  const getBracketPlacementOrder = (teamCount) => {
    const bracketSize = Math.pow(2, Math.ceil(Math.log2(teamCount)));
    const order = [];
    
    // Create seeding pairs using standard tournament bracket seeding
    // This ensures 1 vs 16, 2 vs 15, etc. in proper bracket positions
    const seeds = [];
    for (let i = 1; i <= bracketSize; i++) {
      seeds.push(i);
    }
    
    // Function to create proper bracket pairings
    const createBracketPairs = (seeds) => {
      if (seeds.length === 2) {
        return [[seeds[0], seeds[1]]];
      }
      
      const halfSize = seeds.length / 2;
      const topHalf = seeds.slice(0, halfSize);
      const bottomHalf = seeds.slice(halfSize);
      
      // Pair up seeds: 1 vs last, 2 vs second-to-last, etc.
      const pairs = [];
      for (let i = 0; i < halfSize / 2; i++) {
        pairs.push([topHalf[i], bottomHalf[halfSize - 1 - i]]);
        pairs.push([bottomHalf[i], topHalf[halfSize - 1 - i]]);
      }
      
      return pairs;
    };
    
    const bracketPairs = createBracketPairs(seeds);
    
    // Assign pairs to matches
    bracketPairs.forEach((pair, matchIndex) => {
      const matchId = bracketData?.type === 'Single Elimination' 
        ? `r1m${matchIndex}` 
        : `u1m${matchIndex}`;
      
      order.push({ matchId, position: 'team1', seed: pair[0] });
      order.push({ matchId, position: 'team2', seed: pair[1] });
    });
    
    return order;
  };

  const handleTeamAssignment = (matchId, position, teamId) => {
    if (!isAdmin()) {
      toast.warning('Only admins can manage brackets');
      return;
    }

    if (lockedSlots.has(`${matchId}-${position}`)) {
      toast.warning('This slot is locked');
      return;
    }

    const team = teamId === 'bye' ? 'bye' : teams.find(t => t.team_id === teamId) || null;
    
    setBracketData(prev => {
      const newData = JSON.parse(JSON.stringify(prev)); // Deep clone to avoid mutations
      
      // Find the match being updated
      let targetMatch = null;
      let matchRound = null;
      
      if (prev.type === 'Single Elimination') {
        for (const round of newData.rounds) {
          const match = round.matches.find(m => m.id === matchId);
          if (match) {
            targetMatch = match;
            matchRound = round.round;
            match[position] = team;
            break;
          }
        }
      } else {
        // Handle Double Elimination
        if (matchId.startsWith('u')) {
          for (const round of newData.upperBracket.rounds) {
            const match = round.matches.find(m => m.id === matchId);
            if (match) {
              targetMatch = match;
              matchRound = round.round;
              match[position] = team;
              break;
            }
          }
        } else if (matchId.startsWith('l')) {
          for (const round of newData.lowerBracket.rounds) {
            const match = round.matches.find(m => m.id === matchId);
            if (match) {
              targetMatch = match;
              matchRound = round.round;
              match[position] = team;
              break;
            }
          }
        } else if (matchId === 'grand-final') {
          newData.grandFinal[position] = team;
          return newData;
        }
      }
      
      // Auto-advance logic for rounds after Round 1
      if (targetMatch && matchRound > 1 && team && team !== 'bye') {
        // Find the previous round matches that feed into this match
        const findSourceMatches = () => {
          const sourceMatches = [];
          
          if (prev.type === 'Single Elimination') {
            const prevRound = newData.rounds[matchRound - 2];
            if (prevRound) {
              for (const match of prevRound.matches) {
                if (match.winnerTo === targetMatch.id) {
                  sourceMatches.push(match);
                }
              }
            }
          } else if (matchId.startsWith('u')) {
            // Upper bracket match - check previous upper round
            const prevRound = newData.upperBracket.rounds[matchRound - 2];
            if (prevRound) {
              for (const match of prevRound.matches) {
                if (match.winnerTo === targetMatch.id) {
                  sourceMatches.push(match);
                }
              }
            }
          } else if (matchId.startsWith('l')) {
            // Lower bracket match - could have sources from upper or lower
            // Check lower bracket
            if (matchRound > 1) {
              const prevRound = newData.lowerBracket.rounds[matchRound - 2];
              if (prevRound) {
                for (const match of prevRound.matches) {
                  if (match.winnerTo === targetMatch.id) {
                    sourceMatches.push(match);
                  }
                }
              }
            }
            // Check upper bracket for drop matches
            for (const round of newData.upperBracket.rounds) {
              for (const match of round.matches) {
                if (match.loserTo === targetMatch.id) {
                  sourceMatches.push(match);
                }
              }
            }
          }
          
          return sourceMatches;
        };
        
        const sourceMatches = findSourceMatches();
        
        // Determine winner and loser from source matches
        for (const sourceMatch of sourceMatches) {
          if (sourceMatch.team1 && sourceMatch.team2) {
            // Safe team comparison            
            const assignedTeamId = getTeamId(team);
            const team1Id = getTeamId(sourceMatch.team1);
            const team2Id = getTeamId(sourceMatch.team2);
            
            // Check if the assigned team is one of the teams in source match
            const isTeam1 = team1Id && team1Id === assignedTeamId;
            const isTeam2 = team2Id && team2Id === assignedTeamId;
            
            if (isTeam1 || isTeam2) {
              // This team won, so the other team lost
              const loser = isTeam1 ? sourceMatch.team2 : sourceMatch.team1;
              sourceMatch.winner = team;
              sourceMatch.loser = loser;
              
              // Auto-populate loser in lower bracket if applicable
              if (sourceMatch.loserTo && loser && loser !== 'bye') {
                // Find the lower bracket match
                for (const lowerRound of newData.lowerBracket.rounds) {
                  const loserMatch = lowerRound.matches.find(m => m.id === sourceMatch.loserTo);
                  if (loserMatch) {
                    // Place loser in first available slot
                    if (!loserMatch.team1) {
                      loserMatch.team1 = loser;
                    } else if (!loserMatch.team2) {
                      loserMatch.team2 = loser;
                    }
                    break;
                  }
                }
              }
            }
          }
        }
      }
      
      return newData;
    });
  };

  const toggleLockSlot = (matchId, position) => {
    if (!isAdmin()) {
      return;
    }

    const slotKey = `${matchId}-${position}`;
    setLockedSlots(prev => {
      const newLocked = new Set(prev);
      if (newLocked.has(slotKey)) {
        newLocked.delete(slotKey);
      } else {
        newLocked.add(slotKey);
      }
      return newLocked;
    });
  };

  const addMatch = (bracketType, roundIndex) => {
    if (!isAdmin()) {
      toast.warning('Only admins can add matches');
      return;
    }
    
    if (isPublished) {
      toast.warning('Cannot add matches to published brackets');
      return;
    }

    const newBracketData = deepCloneBracket(bracketData);
    
    if (bracketData.type === 'Single Elimination') {
      const round = newBracketData.rounds[roundIndex];
      const newMatchId = `u${round.round}m${round.matches.length}`;
      
      round.matches.push({
        id: newMatchId,
        round: round.round,
        position: round.matches.length,
        team1: null,
        team2: null,
        winner: null,
        loser: null,
        locked: false,
        isBye: false,
        winnerTo: roundIndex < newBracketData.rounds.length - 1 ? 
          `u${round.round + 1}m${Math.floor(round.matches.length / 2)}` : null
      });
    } else {
      // Double elimination
      if (bracketType === 'upper') {
        const round = newBracketData.upperBracket.rounds[roundIndex];
        const newMatchId = `u${round.round}m${round.matches.length}`;
        
        round.matches.push({
          id: newMatchId,
          round: round.round,
          position: round.matches.length,
          team1: null,
          team2: null,
          winner: null,
          loser: null,
          locked: false,
          isBye: false,
          winnerTo: roundIndex < newBracketData.upperBracket.rounds.length - 1 ? 
            `u${round.round + 1}m${Math.floor(round.matches.length / 2)}` : 'grand-final',
          loserTo: `l${round.round === 1 ? 1 : (round.round - 1) * 2}m${round.matches.length}`
        });
      } else {
        const round = newBracketData.lowerBracket.rounds[roundIndex];
        const newMatchId = `l${round.round}m${round.matches.length}`;
        
        round.matches.push({
          id: newMatchId,
          round: round.round,
          position: round.matches.length,
          team1: null,
          team2: null,
          winner: null,
          locked: false,
          winnerTo: roundIndex < newBracketData.lowerBracket.rounds.length - 1 ? 
            `l${round.round + 1}m${Math.floor(round.matches.length / 2)}` : 'grand-final'
        });
      }
    }
    
    setBracketData(newBracketData);
    toast.success('Match added successfully');
  };

  const removeMatch = (matchId) => {
    if (!isAdmin()) {
      toast.warning('Only admins can remove matches');
      return;
    }
    
    if (isPublished) {
      toast.warning('Cannot remove matches from published brackets');
      return;
    }
    
    if (!window.confirm('Are you sure you want to remove this match?')) {
      return;
    }

    setBracketData(prevBracketData => {
      const newBracketData = deepCloneBracket(prevBracketData);
      let found = false;
      let canRemove = false;
      
      const removeFromRounds = (rounds) => {
        for (const round of rounds) {
          const matchIndex = round.matches.findIndex(m => m.id === matchId);
          if (matchIndex !== -1) {
            const match = round.matches[matchIndex];
            found = true;
            
            // Check if match can be removed (no real teams assigned)
            const hasTeam1 = match.team1 && match.team1 !== '' && match.team1 !== 'bye';
            const hasTeam2 = match.team2 && match.team2 !== '' && match.team2 !== 'bye';
            
            if (!hasTeam1 && !hasTeam2) {
              round.matches.splice(matchIndex, 1);
              // Re-index remaining matches
              round.matches.forEach((m, idx) => {
                m.position = idx;
                // Update match ID to reflect new position
                const matchPrefix = m.id.substring(0, m.id.lastIndexOf('m') + 1);
                m.id = `${matchPrefix}${idx}`;
              });
              canRemove = true;
              return true;
            } else {
              return false;
            }
          }
        }
        return false;
      };
      
      if (newBracketData.type === 'Single Elimination') {
        removeFromRounds(newBracketData.rounds);
      } else {
        if (!removeFromRounds(newBracketData.upperBracket.rounds)) {
          removeFromRounds(newBracketData.lowerBracket.rounds);
        }
      }
      
      if (found && canRemove) {
        toast.success('Match removed');
        return newBracketData;
      } else if (found && !canRemove) {
        toast.error('Cannot remove match with teams assigned');
        return prevBracketData; // Return unchanged data
      } else {
        toast.error('Match not found');
        return prevBracketData;
      }
    });
  };

  // Score modal handlers
  const openScoreModal = (match) => {
    setSelectedMatch(match);
    setScoreModalOpen(true);
  };

  const closeScoreModal = () => {
    setScoreModalOpen(false);
    setSelectedMatch(null);
  };

  const handleSaveScore = async (scoreData) => {
    try {
      // Save progress to backend (implement API endpoint later)
      // Saving score progress
      
      // Update local bracket state with progress
      const newBracketData = deepCloneBracket(bracketData);
      const match = findMatchInBracket(newBracketData, scoreData.matchId);
      
      if (match) {
        match.scores = scoreData.scores;
        match.status = scoreData.status;
        if (scoreData.winner) {
          match.tempWinner = scoreData.winner; // Temporary until published
        }
        setBracketData(newBracketData);
      }
      
      toast.success('Match progress saved');
    } catch (error) {
      console.error('Error saving score:', error);
      toast.error('Failed to save match progress');
    }
  };

  const handlePublishScore = async (scoreData) => {
    try {
      // Publish results and advance teams
      // Publishing score results
      
      const newBracketData = deepCloneBracket(bracketData);
      const match = findMatchInBracket(newBracketData, scoreData.matchId);
      
      if (match && scoreData.winner) {
        // Get team IDs safely        
        const team1Id = getTeamId(match.team1);
        const team2Id = getTeamId(match.team2);
        
        // Find winner and loser teams
        const winnerTeam = teams.find(t => t.team_id === scoreData.winner) || scoreData.winner;
        const loserId = team1Id === scoreData.winner ? team2Id : team1Id;
        const loserTeam = teams.find(t => t.team_id === loserId) || loserId;
        
        // Set match results
        match.scores = scoreData.scores;
        match.winner = winnerTeam;
        match.loser = loserTeam;
        match.status = 'completed';
        
        // Auto-advance teams using existing logic
        if (match.winnerTo) {
          const nextMatch = findMatchInBracket(newBracketData, match.winnerTo);
          if (nextMatch) {
            if (!nextMatch.team1) {
              nextMatch.team1 = winnerTeam;
            } else if (!nextMatch.team2) {
              nextMatch.team2 = winnerTeam;
            }
          }
        }
        
        if (match.loserTo && loserTeam) {
          const loserMatch = findMatchInBracket(newBracketData, match.loserTo);
          if (loserMatch) {
            if (!loserMatch.team1) {
              loserMatch.team1 = loserTeam;
            } else if (!loserMatch.team2) {
              loserMatch.team2 = loserTeam;
            }
          }
        }
        
        setBracketData(newBracketData);
      }
      
      closeScoreModal();
      toast.success('Match results published and teams advanced');
    } catch (error) {
      console.error('Error publishing score:', error);
      toast.error('Failed to publish match results');
    }
  };

  // Helper function to find match in bracket structure
  const findMatchInBracket = (bracketData, matchId) => {
    if (bracketData.type === 'Single Elimination') {
      for (const round of bracketData.rounds) {
        const match = round.matches.find(m => m.id === matchId);
        if (match) return match;
      }
    } else if (bracketData.type === 'Double Elimination') {
      // Check upper bracket
      for (const round of bracketData.upperBracket.rounds) {
        const match = round.matches.find(m => m.id === matchId);
        if (match) return match;
      }
      // Check lower bracket
      for (const round of bracketData.lowerBracket.rounds) {
        const match = round.matches.find(m => m.id === matchId);
        if (match) return match;
      }
      // Check grand final
      if (bracketData.grandFinal) {
        if (matchId === 'grand-final') return { id: 'grand-final', ...bracketData.grandFinal };
        if (matchId === 'grand-final-reset') return { id: 'grand-final-reset', ...bracketData.grandFinal };
      }
    }
    return null;
  };

  const generateBracket = () => {
    if (!isAdmin()) {
      toast.error('Only admins can generate brackets');
      return;
    }

    try {
      // Use ALL checked-in teams, not just teams already placed in bracket
      const availableTeams = [...teams];
      const newBracketData = deepCloneBracket(bracketData); // Deep clone
      
      // Collect locked teams to preserve them
      const lockedTeams = new Map(); // matchId-position -> team
      
      if (newBracketData.type === 'Single Elimination') {
        // First pass: collect locked teams from FIRST ROUND only and clear unlocked slots
        if (newBracketData.rounds.length > 0) {
          const firstRound = newBracketData.rounds[0];
          for (const match of firstRound.matches) {
            if (lockedSlots.has(`${match.id}-team1`) && match.team1) {
              lockedTeams.set(`${match.id}-team1`, match.team1);
            } else {
              match.team1 = null; // Clear unlocked slots
            }
            
            if (lockedSlots.has(`${match.id}-team2`) && match.team2) {
              lockedTeams.set(`${match.id}-team2`, match.team2);
            } else {
              match.team2 = null; // Clear unlocked slots
            }
          }
        }
        
        // Clear all later rounds (they'll be filled by advancement)
        for (let i = 1; i < newBracketData.rounds.length; i++) {
          for (const match of newBracketData.rounds[i].matches) {
            match.team1 = null;
            match.team2 = null;
          }
        }
      } else {
        // For double elimination, only process upper bracket first round
        if (newBracketData.upperBracket.rounds.length > 0) {
          const firstRound = newBracketData.upperBracket.rounds[0];
          for (const match of firstRound.matches) {
            if (lockedSlots.has(`${match.id}-team1`) && match.team1) {
              lockedTeams.set(`${match.id}-team1`, match.team1);
            } else {
              match.team1 = null; // Clear unlocked slots
            }
            
            if (lockedSlots.has(`${match.id}-team2`) && match.team2) {
              lockedTeams.set(`${match.id}-team2`, match.team2);
            } else {
              match.team2 = null; // Clear unlocked slots
            }
          }
        }
        
        // Clear all lower bracket matches (they start empty)
        for (const round of newBracketData.lowerBracket.rounds) {
          for (const match of round.matches) {
            match.team1 = null;
            match.team2 = null;
          }
        }
      }
      
      // Get teams that aren't locked (for placement)
      const lockedTeamIds = new Set();
      for (const team of lockedTeams.values()) {
        const teamId = getTeamId(team);
        if (teamId && teamId !== 'bye') {
          lockedTeamIds.add(teamId);
        }
      }
      
      const unlockedTeams = availableTeams.filter(team => !lockedTeamIds.has(team.team_id));
      
      // Sort unlocked teams based on seeding mode
      let sortedTeams;
      if (seedingMode === 'manual') {
        // Sort by seed number (teams should have a seed property)
        sortedTeams = [...unlockedTeams].sort((a, b) => (a.seed || 999) - (b.seed || 999));
      } else {
        // Random seeding
        sortedTeams = [...unlockedTeams].sort(() => Math.random() - 0.5);
      }
      
      // Debug logging removed for production
      
      // For proper bracket placement with byes (only used for double elimination)
      const placementOrder = getBracketPlacementOrder(availableTeams.length);
      
      // Assign seed numbers to unlocked teams if in manual mode
      if (seedingMode === 'manual') {
        sortedTeams.forEach((team, index) => {
          team.seed = index + 1;
        });
      }
      
      // Place teams in empty slots
      let teamIndex = 0;
      const placedTeams = new Set();
      
      // Bracket type check
      
      if (newBracketData.type === 'Single Elimination') {
        // First restore all locked teams
        for (const [key, team] of lockedTeams) {
          const [matchId, position] = key.split('-');
          const round = newBracketData.rounds.find(r => 
            r.matches.some(m => m.id === matchId)
          );
          if (round) {
            const match = round.matches.find(m => m.id === matchId);
            if (match) {
              match[position] = team;
            }
          }
        }
        
        // Then fill only the unlocked empty slots
        if (newBracketData.rounds.length > 0) {
          const firstRound = newBracketData.rounds[0];
          
          // Count available slots
          let availableSlots = 0;
          for (const match of firstRound.matches) {
            if (!match.team1 && !lockedSlots.has(`${match.id}-team1`)) availableSlots++;
            if (!match.team2 && !lockedSlots.has(`${match.id}-team2`) && !match.isBye) availableSlots++;
          }
          
          for (let i = 0; i < firstRound.matches.length; i++) {
            const match = firstRound.matches[i];
            // Process match slots
            
            // Only assign to unlocked empty slots
            if (!match.team1 && !lockedSlots.has(`${match.id}-team1`) && teamIndex < sortedTeams.length) {
              match.team1 = sortedTeams[teamIndex];
              // Team assigned
              teamIndex++;
            }
            
            if (!match.team2 && !lockedSlots.has(`${match.id}-team2`) && teamIndex < sortedTeams.length && !match.isBye) {
              match.team2 = sortedTeams[teamIndex];
              // Team assigned
              teamIndex++;
            }
          }
          
          // Placement complete
        }
      } else {
        // Double Elimination placement
        // Double elimination placement logic
        
        // First restore all locked teams
        for (const [key, team] of lockedTeams) {
          const [matchId, position] = key.split('-');
          
          // Find and restore the locked team in upper bracket
          for (const round of newBracketData.upperBracket.rounds) {
            const match = round.matches.find(m => m.id === matchId);
            if (match) {
              match[position] = team;
              // Locked team restored
              break;
            }
          }
        }
        
        // Then fill only the unlocked empty slots in round 1
        if (newBracketData.upperBracket.rounds.length > 0) {
          const firstRound = newBracketData.upperBracket.rounds[0];
          
          // Count available slots
          let availableSlots = 0;
          for (const match of firstRound.matches) {
            if (!match.team1 && !lockedSlots.has(`${match.id}-team1`)) availableSlots++;
            if (!match.team2 && !lockedSlots.has(`${match.id}-team2`) && !match.isBye) availableSlots++;
          }
          
          // Place teams in available slots
          for (let i = 0; i < firstRound.matches.length; i++) {
            const match = firstRound.matches[i];
            // Process match slots
            
            // Only assign to unlocked empty slots
            if (!match.team1 && !lockedSlots.has(`${match.id}-team1`) && teamIndex < sortedTeams.length) {
              match.team1 = sortedTeams[teamIndex];
              // Team assigned
              teamIndex++;
            }
            
            if (!match.team2 && !lockedSlots.has(`${match.id}-team2`) && teamIndex < sortedTeams.length && !match.isBye) {
              match.team2 = sortedTeams[teamIndex];
              // Team assigned
              teamIndex++;
            }
          }
          
          // Placement complete
        }
      }
      
      setBracketData(newBracketData);
      
      // Ensure locked slots remain locked after generation
      // (lockedSlots state should persist)
      
      const lockedCount = lockedTeams.size;
      const placedCount = teamIndex;
      
      if (placedCount > 0) {
        toast.success(`Reshuffled bracket! Placed ${placedCount} teams (${lockedCount} locked teams preserved)`);
      } else if (lockedCount > 0) {
        toast.info(`All unlocked slots filled. ${lockedCount} teams are locked.`);
      } else {
        toast.info('Generated new bracket layout');
      }
      
    } catch (error) {
      console.error('Error generating bracket:', error);
      toast.error('Failed to generate bracket');
    }
  };

  const isAdmin = () => {
    return user?.role === 'admin' || user?.isAdmin || 
           (user?.discord_username && user.discord_username.toLowerCase().includes('admin'));
  };

  const canGenerateBracket = () => {
    const checkedInTeams = teams.filter(team => team.checked_in);
    return checkedInTeams.length >= 2 && isAdmin() && !isPublished;
  };

  const publishBracket = () => {
    if (!isAdmin()) {
      toast.error('Only admins can publish brackets');
      return;
    }
    
    if (!window.confirm('Are you sure you want to publish this bracket? This will lock all team placements and the bracket cannot be regenerated.')) {
      return;
    }

    // Lock all slots
    const newLockedSlots = new Set();
    
    if (bracketData.type === 'Single Elimination') {
      for (const round of bracketData.rounds) {
        for (const match of round.matches) {
          if (match.team1) newLockedSlots.add(`${match.id}-team1`);
          if (match.team2) newLockedSlots.add(`${match.id}-team2`);
        }
      }
    } else {
      // Lock only first round of upper bracket
      if (bracketData.upperBracket.rounds.length > 0) {
        const firstRound = bracketData.upperBracket.rounds[0];
        for (const match of firstRound.matches) {
          if (match.team1) newLockedSlots.add(`${match.id}-team1`);
          if (match.team2) newLockedSlots.add(`${match.id}-team2`);
        }
      }
    }
    
    setLockedSlots(newLockedSlots);
    setIsPublished(true);
    toast.success('Bracket published! All teams are now locked.');
    
    // TODO: Save published state to backend
  };

  const unpublishBracket = () => {
    if (!isAdmin()) {
      toast.error('Only admins can unpublish brackets');
      return;
    }

    setIsPublished(false);
    toast.info('Bracket unpublished. You can now edit team placements.');
  };

  if (loading) {
    return <div className="unified-bracket loading">Loading bracket...</div>;
  }

  if (!bracketData) {
    return (
      <div className="unified-bracket">
        <div className="no-bracket">
          <h3>No Bracket Available</h3>
          <p>Not enough teams checked in to create a bracket.</p>
          <p>Need at least 2 teams checked in.</p>
        </div>
      </div>
    );
  }

  return (
    <BracketErrorBoundary>
      <div className="unified-bracket">
        <div className="bracket-header">
        <h3>Tournament Bracket</h3>
        <div className="bracket-controls">
          {bracketData.type === 'Double Elimination' && (
            <div className="bracket-view-selector">
              <button 
                className={`view-btn ${bracketView === 'upper' ? 'active' : ''}`}
                onClick={() => setBracketView('upper')}
              >
                Upper Bracket
              </button>
              <button 
                className={`view-btn ${bracketView === 'lower' ? 'active' : ''}`}
                onClick={() => setBracketView('lower')}
              >
                Lower Bracket
              </button>
              <button 
                className={`view-btn ${bracketView === 'grand-final' ? 'active' : ''}`}
                onClick={() => setBracketView('grand-final')}
              >
                Grand Final
              </button>
            </div>
          )}
          <div className="bracket-actions">
            <span className="bracket-info">
              {teams.length} teams
              {isPublished && <span className="published-badge">Published</span>}
            </span>
            {!isPublished && isAdmin() && (
              <div className="seeding-toggle">
                <label>
                  <input
                    type="checkbox"
                    checked={seedingMode === 'manual'}
                    onChange={(e) => setSeedingMode(e.target.checked ? 'manual' : 'random')}
                  />
                  Manual Seeding
                </label>
              </div>
            )}
            {!isPublished ? (
              <>
                {canGenerateBracket() && (
                  <button 
                    className="btn-primary"
                    onClick={generateBracket}
                    disabled={loading}
                  >
                    Generate Bracket
                  </button>
                )}
                {isAdmin() && bracketData && (
                  <button 
                    className="btn-success"
                    onClick={publishBracket}
                    disabled={loading}
                  >
                    Publish Bracket
                  </button>
                )}
              </>
            ) : (
              isAdmin() && (
                <button 
                  className="btn-secondary"
                  onClick={unpublishBracket}
                  disabled={loading}
                >
                  Unpublish
                </button>
              )
            )}
          </div>
        </div>
      </div>

      <div className="bracket-viewport">
        {bracketData.type === 'Single Elimination' ? (
          <SingleEliminationBracket 
            bracketData={bracketData}
            teams={teams}
            lockedSlots={lockedSlots}
            onTeamAssign={handleTeamAssignment}
            onToggleLock={toggleLockSlot}
            isAdmin={isAdmin}
            isPublished={isPublished}
            onAddMatch={addMatch}
            onRemoveMatch={removeMatch}
            onOpenScoreModal={openScoreModal}
          />
        ) : (
          <>
            {bracketView === 'upper' ? (
              <UpperBracket 
                bracketData={bracketData.upperBracket}
                teams={teams}
                lockedSlots={lockedSlots}
                onTeamAssign={handleTeamAssignment}
                onToggleLock={toggleLockSlot}
                isAdmin={isAdmin}
                isPublished={isPublished}
                onAddMatch={addMatch}
                onRemoveMatch={removeMatch}
                onOpenScoreModal={openScoreModal}
              />
            ) : bracketView === 'lower' ? (
              <LowerBracket 
                bracketData={bracketData.lowerBracket}
                teams={teams}
                lockedSlots={lockedSlots}
                onTeamAssign={handleTeamAssignment}
                onToggleLock={toggleLockSlot}
                isAdmin={isAdmin}
                isPublished={isPublished}
                onAddMatch={addMatch}
                onRemoveMatch={removeMatch}
                onOpenScoreModal={openScoreModal}
              />
            ) : (
              <GrandFinalView
                grandFinal={bracketData.grandFinal}
                teams={teams}
                lockedSlots={lockedSlots}
                onTeamAssign={handleTeamAssignment}
                onToggleLock={toggleLockSlot}
                isAdmin={isAdmin}
                isPublished={isPublished}
              />
            )}
          </>
        )}
      </div>
      
      {/* Score Modal */}
      {scoreModalOpen && selectedMatch && (
        <MatchScoreModal
          match={selectedMatch}
          teams={teams}
          seriesLength={seriesLength}
          onSave={handleSaveScore}
          onPublish={handlePublishScore}
          onClose={closeScoreModal}
        />
      )}
    </div>
    </BracketErrorBoundary>
  );
};

// Single Elimination Bracket Component
const SingleEliminationBracket = ({ bracketData, teams, lockedSlots, onTeamAssign, onToggleLock, isAdmin, isPublished, onAddMatch, onRemoveMatch, onOpenScoreModal }) => {
  return (
    <div className="single-elimination-bracket">
      {bracketData.rounds.map((round, roundIndex) => (
        <div key={round.round} className="bracket-column">
          <div className="round-header">
            <h4>{round.name}</h4>
          </div>
          <div className="round-matches">
            {round.matches.map((match) => (
              <CompactMatch
                key={match.id}
                match={match}
                teams={teams}
                lockedSlots={lockedSlots}
                onTeamAssign={onTeamAssign}
                onToggleLock={onToggleLock}
                isAdmin={isAdmin}
                isPublished={isPublished}
                showDropIndicator={true}
                onRemoveMatch={onRemoveMatch}
                onOpenScoreModal={onOpenScoreModal}
              />
            ))}
          </div>
          {isAdmin && !isPublished && (
            <div className="round-actions">
              <button 
                className="btn-add-match"
                onClick={() => onAddMatch('single', roundIndex)}
                title="Add match to this round"
              >
                + Add Match
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

// Upper Bracket Component
const UpperBracket = ({ bracketData, teams, lockedSlots, onTeamAssign, onToggleLock, isAdmin, isPublished, onAddMatch, onRemoveMatch, onOpenScoreModal }) => {
  return (
    <div className="upper-bracket-view">
      {bracketData.rounds.map((round, roundIndex) => (
        <div key={round.round} className="bracket-column">
          <div className="round-header">
            <h4>{round.name}</h4>
          </div>
          <div className="round-matches">
            {round.matches.map((match) => (
              <CompactMatch
                key={match.id}
                match={match}
                teams={teams}
                lockedSlots={lockedSlots}
                onTeamAssign={onTeamAssign}
                onToggleLock={onToggleLock}
                isAdmin={isAdmin}
                isPublished={isPublished}
                showDropIndicator={true}
                onRemoveMatch={onRemoveMatch}
                onOpenScoreModal={onOpenScoreModal}
              />
            ))}
          </div>
          {isAdmin && !isPublished && (
            <div className="round-actions">
              <button 
                className="btn-add-match"
                onClick={() => onAddMatch('upper', roundIndex)}
                title="Add match to this round"
              >
                + Add Match
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

// Lower Bracket Component
const LowerBracket = ({ bracketData, teams, lockedSlots, onTeamAssign, onToggleLock, isAdmin, isPublished, onAddMatch, onRemoveMatch, onOpenScoreModal }) => {
  return (
    <div className="lower-bracket-view">
      {bracketData.rounds.map((round, roundIndex) => (
        <div key={round.round} className={`bracket-column ${round.isDropRound ? 'drop-round' : ''}`}>
          <div className="round-header">
            <h4>{round.name}</h4>
          </div>
          <div className="round-matches">
            {round.matches.map((match) => (
              <CompactMatch
                key={match.id}
                match={match}
                teams={teams}
                lockedSlots={lockedSlots}
                onTeamAssign={onTeamAssign}
                onToggleLock={onToggleLock}
                isAdmin={isAdmin}
                isPublished={isPublished}
                showDropIndicator={true}
                onRemoveMatch={onRemoveMatch}
                onOpenScoreModal={onOpenScoreModal}
              />
            ))}
          </div>
          {isAdmin && !isPublished && (
            <div className="round-actions">
              <button 
                className="btn-add-match"
                onClick={() => onAddMatch('lower', roundIndex)}
                title="Add match to this round"
              >
                + Add Match
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

// Compact Match Component
const CompactMatch = ({ match, teams, lockedSlots, onTeamAssign, onToggleLock, isAdmin, isPublished, showDropIndicator, onRemoveMatch, onOpenScoreModal }) => {
  const isLocked = (position) => lockedSlots.has(`${match.id}-${position}`);
  const isBye = match.isBye || false;

  // Determine where the loser goes
  const getLoserDestination = () => {
    if (!match.loserTo || !showDropIndicator) return null;
    
    // Parse the loser destination
    if (match.loserTo.startsWith('l')) {
      const roundMatch = match.loserTo.match(/l(\d+)m(\d+)/);
      if (roundMatch) {
        return `Loser to LB Round ${roundMatch[1]}`;
      }
    }
    return null;
  };

  const loserDest = getLoserDestination();
  const hasScoreButton = isAdmin && match.team1 && match.team2 && match.team1 !== '' && match.team2 !== '' && 
                        match.team1 !== 'bye' && match.team2 !== 'bye';

  return (
    <div className={`compact-match ${isBye ? 'bye' : ''} ${loserDest ? 'has-drop' : ''} ${hasScoreButton ? 'has-score-btn' : ''}`}>
      {isAdmin && !isPublished && onRemoveMatch && (() => {
        const hasTeam1 = match.team1 && match.team1 !== '' && match.team1 !== 'bye';
        const hasTeam2 = match.team2 && match.team2 !== '' && match.team2 !== 'bye';
        return !hasTeam1 && !hasTeam2;
      })() && (
        <button 
          className="match-remove-btn"
          onClick={() => onRemoveMatch(match.id)}
          title="Remove this match"
        >
          ×
        </button>
      )}
      <CompactTeamSlot
        matchId={match.id}
        position="team1"
        team={match.team1}
        teams={teams}
        locked={isLocked('team1')}
        onTeamAssign={onTeamAssign}
        onToggleLock={onToggleLock}
        isAdmin={isAdmin}
        isPublished={isPublished}
        isWinner={match.winner && match.team1 && match.winner.team_id === match.team1.team_id}
        isLoser={match.loser && match.team1 && match.loser.team_id === match.team1.team_id}
      />
      <div className="vs-separator"></div>
      {isAdmin && match.team1 && match.team2 && match.team1 !== '' && match.team2 !== '' && 
       match.team1 !== 'bye' && match.team2 !== 'bye' && (
        <button 
          className="match-score-btn"
          onClick={() => onOpenScoreModal(match)}
          title="Enter match scores"
        >
          📊
        </button>
      )}
      <CompactTeamSlot
        matchId={match.id}
        position="team2"
        team={match.team2}
        teams={teams}
        locked={isLocked('team2')}
        onTeamAssign={onTeamAssign}
        onToggleLock={onToggleLock}
        isAdmin={isAdmin}
        isBye={isBye}
        isPublished={isPublished}
        isWinner={match.winner && match.team2 && match.winner.team_id === match.team2.team_id}
        isLoser={match.loser && match.team2 && match.loser.team_id === match.team2.team_id}
      />
      {loserDest && (
        <div className="drop-indicator">
          <span className="drop-arrow">↓</span>
          <span className="drop-label">{loserDest}</span>
        </div>
      )}
    </div>
  );
};

// Compact Team Slot Component
const CompactTeamSlot = ({ matchId, position, team, teams, locked, onTeamAssign, onToggleLock, isAdmin, isBye, isPublished, isWinner, isLoser }) => {
  // BYE slots are now editable like regular slots per user request

  return (
    <div className={`compact-team-slot ${locked ? 'locked' : ''} ${isPublished ? 'published' : ''} ${isWinner ? 'winner' : ''} ${isLoser ? 'loser' : ''}`}>
      {isAdmin && !isPublished ? (
        <>
          <select
            value={team?.team_id || ''}
            onChange={(e) => onTeamAssign(matchId, position, e.target.value)}
            disabled={locked}
            className="compact-team-dropdown"
          >
            <option value="">TBD</option>
            <option value="bye">BYE</option>
            {teams.map(t => (
              <option key={t.team_id} value={t.team_id}>
                {t.team_name}
              </option>
            ))}
          </select>
          <button
            className={`compact-lock-btn ${locked ? 'locked' : ''}`}
            onClick={() => onToggleLock(matchId, position)}
            title={locked ? 'Unlock' : 'Lock'}
          >
            {locked ? '🔒' : '🔓'}
          </button>
        </>
      ) : (
        <div className="team-display">
          {team ? (team === 'bye' || team.team_id === 'bye' ? 'BYE' : team.team_name) : 'TBD'}
        </div>
      )}
    </div>
  );
};

// Grand Final View Component
const GrandFinalView = ({ grandFinal, teams, lockedSlots, onTeamAssign, onToggleLock, isAdmin, isPublished }) => {
  return (
    <div className="grand-final-view">
      <div className="grand-final-container">
        <div className="grand-final-header">
          <h4>Grand Final</h4>
          <p className="grand-final-info">
            Upper bracket winner has 1 life, lower bracket winner needs to win twice
          </p>
        </div>
        
        <div className="grand-final-matches">
          <div className="grand-final-match">
            <h5>Match 1</h5>
            <CompactMatch
              match={{
                id: 'grand-final',
                team1: grandFinal.upperWinner,
                team2: grandFinal.lowerWinner,
                isBye: false
              }}
              teams={teams}
              lockedSlots={lockedSlots}
              onTeamAssign={onTeamAssign}
              onToggleLock={onToggleLock}
              isAdmin={isAdmin}
              isPublished={isPublished}
            />
          </div>
          
          {grandFinal.needsReset && (
            <div className="grand-final-match reset-match">
              <h5>Reset Match</h5>
              <p className="reset-info">Lower bracket winner won match 1</p>
              <CompactMatch
                match={{
                  id: 'grand-final-reset',
                  team1: grandFinal.upperWinner,
                  team2: grandFinal.lowerWinner,
                  isBye: false
                }}
                teams={teams}
                lockedSlots={lockedSlots}
                onTeamAssign={onTeamAssign}
                onToggleLock={onToggleLock}
                isAdmin={isAdmin}
                isPublished={isPublished}
              />
            </div>
          )}
        </div>
        
        {grandFinal.champion && (
          <div className="tournament-champion">
            <h4>🏆 Tournament Champion</h4>
            <div className="champion-name">{grandFinal.champion.team_name}</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UnifiedBracket;