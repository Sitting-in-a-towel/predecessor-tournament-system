// Debug script to check team data structure
// Run this in your browser console on the drafts page

console.log('=== DEBUGGING TEAM DATA ===');

// Check if tournament data exists
if (window.tournament) {
  console.log('Tournament ID:', window.tournament.id);
  console.log('Tournament:', window.tournament);
} else {
  console.log('❌ Tournament data not found on window object');
}

// Check teams data
if (window.teams) {
  console.log('Teams array length:', window.teams.length);
  console.log('Teams data:', window.teams);
  
  window.teams.forEach((team, index) => {
    console.log(`Team ${index + 1}:`, {
      id: team.id,
      team_id: team.team_id,
      team_name: team.team_name,
      captain_id: team.captain_id,
      hasUuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(team.id),
      captainHasUuid: team.captain_id ? /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(team.captain_id) : false
    });
  });
} else {
  console.log('❌ Teams data not found on window object');
}

// Check matches data
if (window.matches) {
  console.log('Matches array length:', window.matches.length);
  console.log('Sample matches:', window.matches.slice(0, 3));
} else {
  console.log('❌ Matches data not found on window object');
}

console.log('=== END DEBUG ===');