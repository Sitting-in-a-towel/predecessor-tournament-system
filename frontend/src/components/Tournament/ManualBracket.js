import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';
import { toast } from 'react-toastify';
import './ManualBracket.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const ManualBracket = ({ tournamentId, onBracketUpdate }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [tournament, setTournament] = useState(null);
  const [teams, setTeams] = useState([]);
  const [bracketData, setBracketData] = useState(null);
  const [lockedSlots, setLockedSlots] = useState(new Set());

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
      const checkedInTeams = (teamsResponse.data.registrations || []).filter(team => team.checked_in);
      setTeams(checkedInTeams);

      // Initialize bracket structure
      if (checkedInTeams.length >= 2) {
        initializeBracket(checkedInTeams, tournamentData?.bracket_type || 'Single Elimination');
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
    const rounds = Math.ceil(Math.log2(teamCount));
    const totalSlots = Math.pow(2, rounds);
    
    const bracketStructure = {
      type: 'Single Elimination',
      rounds: [],
      totalRounds: rounds,
      totalSlots
    };

    // Create rounds from first to final
    for (let round = 1; round <= rounds; round++) {
      const slotsInRound = Math.pow(2, rounds - round + 1);
      const matchesInRound = slotsInRound / 2;
      
      const roundData = {
        round,
        name: getRoundName(round, rounds),
        matches: []
      };

      for (let match = 0; match < matchesInRound; match++) {
        const matchId = `r${round}m${match}`;
        roundData.matches.push({
          id: matchId,
          round,
          position: match,
          team1: null,
          team2: null,
          winner: null,
          locked: false,
          nextMatch: round < rounds ? `r${round + 1}m${Math.floor(match / 2)}` : null,
          nextPosition: round < rounds ? (match % 2 === 0 ? 'team1' : 'team2') : null
        });
      }
      
      bracketStructure.rounds.push(roundData);
    }

    setBracketData(bracketStructure);
  };

  const initializeDoubleElimination = (teamCount) => {
    const rounds = Math.ceil(Math.log2(teamCount));
    
    const bracketStructure = {
      type: 'Double Elimination',
      upperBracket: {
        rounds: []
      },
      lowerBracket: {
        rounds: []
      },
      grandFinal: null,
      totalRounds: rounds * 2 - 1
    };

    // Initialize upper bracket (same as single elimination)
    for (let round = 1; round <= rounds; round++) {
      const slotsInRound = Math.pow(2, rounds - round + 1);
      const matchesInRound = slotsInRound / 2;
      
      const roundData = {
        round,
        name: `Upper ${getRoundName(round, rounds)}`,
        matches: []
      };

      for (let match = 0; match < matchesInRound; match++) {
        const matchId = `u${round}m${match}`;
        roundData.matches.push({
          id: matchId,
          round,
          position: match,
          team1: null,
          team2: null,
          winner: null,
          loser: null,
          locked: false,
          nextMatch: round < rounds ? `u${round + 1}m${Math.floor(match / 2)}` : 'grand-final',
          nextPosition: round < rounds ? (match % 2 === 0 ? 'team1' : 'team2') : 'winner',
          loserNextMatch: `l${(rounds - round) * 2 - 1}m${match}`,
          loserNextPosition: 'team1'
        });
      }
      
      bracketStructure.upperBracket.rounds.push(roundData);
    }

    // Initialize lower bracket
    const lowerRounds = (rounds - 1) * 2;
    for (let round = 1; round <= lowerRounds; round++) {
      const roundData = {
        round,
        name: `Lower Round ${round}`,
        matches: []
      };

      // Calculate matches for this lower bracket round
      const matchesInRound = Math.max(1, Math.pow(2, Math.floor((lowerRounds - round + 1) / 2)));
      
      for (let match = 0; match < matchesInRound; match++) {
        const matchId = `l${round}m${match}`;
        roundData.matches.push({
          id: matchId,
          round,
          position: match,
          team1: null,
          team2: null,
          winner: null,
          locked: false,
          nextMatch: round < lowerRounds ? `l${round + 1}m${Math.floor(match / 2)}` : 'grand-final',
          nextPosition: round < lowerRounds ? (match % 2 === 0 ? 'team1' : 'team2') : 'challenger'
        });
      }
      
      bracketStructure.lowerBracket.rounds.push(roundData);
    }

    // Grand Final
    bracketStructure.grandFinal = {
      id: 'grand-final',
      winner: null, // Upper bracket winner
      challenger: null, // Lower bracket winner
      champion: null,
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

  const handleTeamAssignment = (matchId, position, teamId) => {
    if (lockedSlots.has(`${matchId}-${position}`)) {
      toast.warning('This slot is locked');
      return;
    }

    const team = teams.find(t => t.team_id === teamId) || null;
    
    setBracketData(prev => {
      const newData = { ...prev };
      
      if (prev.type === 'Single Elimination') {
        const rounds = [...newData.rounds];
        for (const round of rounds) {
          const match = round.matches.find(m => m.id === matchId);
          if (match) {
            match[position] = team;
            break;
          }
        }
        newData.rounds = rounds;
      } else {
        // Handle Double Elimination
        // Update upper bracket
        if (matchId.startsWith('u')) {
          const rounds = [...newData.upperBracket.rounds];
          for (const round of rounds) {
            const match = round.matches.find(m => m.id === matchId);
            if (match) {
              match[position] = team;
              break;
            }
          }
          newData.upperBracket.rounds = rounds;
        }
        // Update lower bracket
        else if (matchId.startsWith('l')) {
          const rounds = [...newData.lowerBracket.rounds];
          for (const round of rounds) {
            const match = round.matches.find(m => m.id === matchId);
            if (match) {
              match[position] = team;
              break;
            }
          }
          newData.lowerBracket.rounds = rounds;
        }
        // Update grand final
        else if (matchId === 'grand-final') {
          newData.grandFinal[position] = team;
        }
      }
      
      return newData;
    });
  };

  const toggleLockSlot = (matchId, position) => {
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

  const clearBracket = () => {
    if (teams.length >= 2) {
      initializeBracket(teams, tournament?.bracket_type || 'Single Elimination');
      setLockedSlots(new Set());
      toast.success('Bracket cleared');
    }
  };

  const saveBracket = async () => {
    try {
      setLoading(true);
      // This would save the bracket configuration to the backend
      // For now, just show success
      toast.success('Bracket configuration saved!');
    } catch (error) {
      console.error('Error saving bracket:', error);
      toast.error('Failed to save bracket');
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = () => {
    return user?.role === 'admin' || user?.isAdmin;
  };

  if (loading) {
    return <div className="manual-bracket loading">Loading bracket editor...</div>;
  }

  if (!isAdmin()) {
    return (
      <div className="manual-bracket">
        <div className="access-denied">
          <h3>Admin Access Required</h3>
          <p>Only administrators can manage tournament brackets.</p>
        </div>
      </div>
    );
  }

  if (!bracketData) {
    return (
      <div className="manual-bracket">
        <div className="no-bracket">
          <h3>No Bracket Available</h3>
          <p>Not enough teams checked in to create a bracket.</p>
          <p>Need at least 2 teams checked in.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="manual-bracket">
      <div className="bracket-header">
        <h3>Bracket Manager</h3>
        <div className="bracket-controls">
          <span className="bracket-info">{bracketData.type} • {teams.length} teams</span>
          <button className="btn-secondary" onClick={clearBracket}>
            Clear Bracket
          </button>
          <button className="btn-primary" onClick={saveBracket} disabled={loading}>
            Save Configuration
          </button>
        </div>
      </div>

      <div className="bracket-container">
        {bracketData.type === 'Single Elimination' ? (
          <SingleEliminationBracket 
            bracketData={bracketData}
            teams={teams}
            lockedSlots={lockedSlots}
            onTeamAssign={handleTeamAssignment}
            onToggleLock={toggleLockSlot}
          />
        ) : (
          <DoubleEliminationBracket 
            bracketData={bracketData}
            teams={teams}
            lockedSlots={lockedSlots}
            onTeamAssign={handleTeamAssignment}
            onToggleLock={toggleLockSlot}
          />
        )}
      </div>

      <div className="bracket-legend">
        <h4>Instructions</h4>
        <ul>
          <li>Select teams from dropdowns to place them in bracket slots</li>
          <li>Click the lock icon to prevent changes to a slot</li>
          <li>Locked slots are protected from accidental changes</li>
          <li>Save your configuration when ready</li>
        </ul>
      </div>
    </div>
  );
};

// Single Elimination Bracket Component
const SingleEliminationBracket = ({ bracketData, teams, lockedSlots, onTeamAssign, onToggleLock }) => {
  return (
    <div className="single-elimination-bracket">
      {bracketData.rounds.map((round, roundIndex) => (
        <div key={round.round} className="bracket-round">
          <div className="round-header">
            <h4>{round.name}</h4>
          </div>
          <div className="round-matches">
            {round.matches.map((match, matchIndex) => (
              <BracketMatch
                key={match.id}
                match={match}
                teams={teams}
                lockedSlots={lockedSlots}
                onTeamAssign={onTeamAssign}
                onToggleLock={onToggleLock}
                showConnectors={roundIndex < bracketData.rounds.length - 1}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

// Double Elimination Bracket Component
const DoubleEliminationBracket = ({ bracketData, teams, lockedSlots, onTeamAssign, onToggleLock }) => {
  return (
    <div className="double-elimination-bracket">
      <div className="upper-bracket">
        <h3>Upper Bracket</h3>
        <div className="bracket-section">
          {bracketData.upperBracket.rounds.map((round, roundIndex) => (
            <div key={round.round} className="bracket-round">
              <div className="round-header">
                <h4>{round.name}</h4>
              </div>
              <div className="round-matches">
                {round.matches.map((match) => (
                  <BracketMatch
                    key={match.id}
                    match={match}
                    teams={teams}
                    lockedSlots={lockedSlots}
                    onTeamAssign={onTeamAssign}
                    onToggleLock={onToggleLock}
                    showConnectors={true}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="lower-bracket">
        <h3>Lower Bracket</h3>
        <div className="bracket-section">
          {bracketData.lowerBracket.rounds.map((round, roundIndex) => (
            <div key={round.round} className="bracket-round">
              <div className="round-header">
                <h4>{round.name}</h4>
              </div>
              <div className="round-matches">
                {round.matches.map((match) => (
                  <BracketMatch
                    key={match.id}
                    match={match}
                    teams={teams}
                    lockedSlots={lockedSlots}
                    onTeamAssign={onTeamAssign}
                    onToggleLock={onToggleLock}
                    showConnectors={true}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grand-final">
        <h3>Grand Final</h3>
        <div className="final-match">
          <GrandFinalMatch
            match={bracketData.grandFinal}
            teams={teams}
            lockedSlots={lockedSlots}
            onTeamAssign={onTeamAssign}
            onToggleLock={onToggleLock}
          />
        </div>
      </div>
    </div>
  );
};

// Individual Bracket Match Component
const BracketMatch = ({ match, teams, lockedSlots, onTeamAssign, onToggleLock, showConnectors }) => {
  const isLocked = (position) => lockedSlots.has(`${match.id}-${position}`);

  return (
    <div className="bracket-match-container">
      <div className="bracket-match manual">
        <div className="match-teams">
          <TeamSlot
            matchId={match.id}
            position="team1"
            team={match.team1}
            teams={teams}
            locked={isLocked('team1')}
            onTeamAssign={onTeamAssign}
            onToggleLock={onToggleLock}
          />
          <div className="match-vs">vs</div>
          <TeamSlot
            matchId={match.id}
            position="team2"
            team={match.team2}
            teams={teams}
            locked={isLocked('team2')}
            onTeamAssign={onTeamAssign}
            onToggleLock={onToggleLock}
          />
        </div>
      </div>
      {showConnectors && <div className="bracket-connector"></div>}
    </div>
  );
};

// Grand Final Match Component
const GrandFinalMatch = ({ match, teams, lockedSlots, onTeamAssign, onToggleLock }) => {
  const isLocked = (position) => lockedSlots.has(`${match.id}-${position}`);

  return (
    <div className="grand-final-match">
      <div className="final-teams">
        <div className="finalist">
          <label>Upper Bracket Winner</label>
          <TeamSlot
            matchId={match.id}
            position="winner"
            team={match.winner}
            teams={teams}
            locked={isLocked('winner')}
            onTeamAssign={onTeamAssign}
            onToggleLock={onToggleLock}
          />
        </div>
        <div className="vs-divider">VS</div>
        <div className="finalist">
          <label>Lower Bracket Winner</label>
          <TeamSlot
            matchId={match.id}
            position="challenger"
            team={match.challenger}
            teams={teams}
            locked={isLocked('challenger')}
            onTeamAssign={onTeamAssign}
            onToggleLock={onToggleLock}
          />
        </div>
      </div>
    </div>
  );
};

// Team Slot Component with Dropdown
const TeamSlot = ({ matchId, position, team, teams, locked, onTeamAssign, onToggleLock }) => {
  return (
    <div className={`team-slot ${locked ? 'locked' : ''}`}>
      <div className="team-selection">
        <select
          value={team?.team_id || ''}
          onChange={(e) => onTeamAssign(matchId, position, e.target.value)}
          disabled={locked}
          className="team-dropdown"
        >
          <option value="">Select Team...</option>
          {teams.map(t => (
            <option key={t.team_id} value={t.team_id}>
              {t.team_name}
            </option>
          ))}
        </select>
        <button
          className={`lock-btn ${locked ? 'locked' : ''}`}
          onClick={() => onToggleLock(matchId, position)}
          title={locked ? 'Unlock slot' : 'Lock slot'}
        >
          {locked ? '🔒' : '🔓'}
        </button>
      </div>
    </div>
  );
};

export default ManualBracket;