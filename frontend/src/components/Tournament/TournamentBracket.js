import React from 'react';
import UnifiedBracket from './UnifiedBracket';
import './TournamentBracket.css';

const TournamentBracket = ({ tournamentId, onBracketUpdate }) => {
  return <UnifiedBracket tournamentId={tournamentId} onBracketUpdate={onBracketUpdate} />;
};

export default TournamentBracket;