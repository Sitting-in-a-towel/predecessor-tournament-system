require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const axios = require('axios');

const PRODUCTION_API_URL = 'https://predecessor-tournament-api.onrender.com/api';

// Test teams data
const testTeams = [
  {
    name: 'Alpha Wolves',
    captain_discord_id: 'test_captain_1',
    captain_username: 'AlphaLeader',
    members: [
      { discord_id: 'test_member_1_1', username: 'AlphaMember1', role: 'Solo' },
      { discord_id: 'test_member_1_2', username: 'AlphaMember2', role: 'Jungle' },
      { discord_id: 'test_member_1_3', username: 'AlphaMember3', role: 'Mid' },
      { discord_id: 'test_member_1_4', username: 'AlphaMember4', role: 'Carry' },
      { discord_id: 'test_member_1_5', username: 'AlphaMember5', role: 'Support' }
    ]
  },
  {
    name: 'Beta Brigade',
    captain_discord_id: 'test_captain_2',
    captain_username: 'BetaCommander',
    members: [
      { discord_id: 'test_member_2_1', username: 'BetaMember1', role: 'Solo' },
      { discord_id: 'test_member_2_2', username: 'BetaMember2', role: 'Jungle' },
      { discord_id: 'test_member_2_3', username: 'BetaMember3', role: 'Mid' },
      { discord_id: 'test_member_2_4', username: 'BetaMember4', role: 'Carry' },
      { discord_id: 'test_member_2_5', username: 'BetaMember5', role: 'Support' }
    ]
  },
  {
    name: 'Gamma Guardians',
    captain_discord_id: 'test_captain_3',
    captain_username: 'GammaGuard',
    members: [
      { discord_id: 'test_member_3_1', username: 'GammaMember1', role: 'Solo' },
      { discord_id: 'test_member_3_2', username: 'GammaMember2', role: 'Jungle' },
      { discord_id: 'test_member_3_3', username: 'GammaMember3', role: 'Mid' },
      { discord_id: 'test_member_3_4', username: 'GammaMember4', role: 'Carry' },
      { discord_id: 'test_member_3_5', username: 'GammaMember5', role: 'Support' }
    ]
  },
  {
    name: 'Delta Dragons',
    captain_discord_id: 'test_captain_4',
    captain_username: 'DeltaDrake',
    members: [
      { discord_id: 'test_member_4_1', username: 'DeltaMember1', role: 'Solo' },
      { discord_id: 'test_member_4_2', username: 'DeltaMember2', role: 'Jungle' },
      { discord_id: 'test_member_4_3', username: 'DeltaMember3', role: 'Mid' },
      { discord_id: 'test_member_4_4', username: 'DeltaMember4', role: 'Carry' },
      { discord_id: 'test_member_4_5', username: 'DeltaMember5', role: 'Support' }
    ]
  },
  {
    name: 'Echo Eagles',
    captain_discord_id: 'test_captain_5',
    captain_username: 'EchoEagle',
    members: [
      { discord_id: 'test_member_5_1', username: 'EchoMember1', role: 'Solo' },
      { discord_id: 'test_member_5_2', username: 'EchoMember2', role: 'Jungle' },
      { discord_id: 'test_member_5_3', username: 'EchoMember3', role: 'Mid' },
      { discord_id: 'test_member_5_4', username: 'EchoMember4', role: 'Carry' },
      { discord_id: 'test_member_5_5', username: 'EchoMember5', role: 'Support' }
    ]
  },
  {
    name: 'Foxtrot Phoenixes',
    captain_discord_id: 'test_captain_6',
    captain_username: 'FoxtrotFlame',
    members: [
      { discord_id: 'test_member_6_1', username: 'FoxtrotMember1', role: 'Solo' },
      { discord_id: 'test_member_6_2', username: 'FoxtrotMember2', role: 'Jungle' },
      { discord_id: 'test_member_6_3', username: 'FoxtrotMember3', role: 'Mid' },
      { discord_id: 'test_member_6_4', username: 'FoxtrotMember4', role: 'Carry' },
      { discord_id: 'test_member_6_5', username: 'FoxtrotMember5', role: 'Support' }
    ]
  },
  {
    name: 'Golf Gladiators',
    captain_discord_id: 'test_captain_7',
    captain_username: 'GolfGladiator',
    members: [
      { discord_id: 'test_member_7_1', username: 'GolfMember1', role: 'Solo' },
      { discord_id: 'test_member_7_2', username: 'GolfMember2', role: 'Jungle' },
      { discord_id: 'test_member_7_3', username: 'GolfMember3', role: 'Mid' },
      { discord_id: 'test_member_7_4', username: 'GolfMember4', role: 'Carry' },
      { discord_id: 'test_member_7_5', username: 'GolfMember5', role: 'Support' }
    ]
  },
  {
    name: 'Hotel Hurricanes',
    captain_discord_id: 'test_captain_8',
    captain_username: 'HotelHurricane',
    members: [
      { discord_id: 'test_member_8_1', username: 'HotelMember1', role: 'Solo' },
      { discord_id: 'test_member_8_2', username: 'HotelMember2', role: 'Jungle' },
      { discord_id: 'test_member_8_3', username: 'HotelMember3', role: 'Mid' },
      { discord_id: 'test_member_8_4', username: 'HotelMember4', role: 'Carry' },
      { discord_id: 'test_member_8_5', username: 'HotelMember5', role: 'Support' }
    ]
  },
  {
    name: 'India Invaders',
    captain_discord_id: 'test_captain_9',
    captain_username: 'IndiaInvader',
    members: [
      { discord_id: 'test_member_9_1', username: 'IndiaMember1', role: 'Solo' },
      { discord_id: 'test_member_9_2', username: 'IndiaMember2', role: 'Jungle' },
      { discord_id: 'test_member_9_3', username: 'IndiaMember3', role: 'Mid' },
      { discord_id: 'test_member_9_4', username: 'IndiaMember4', role: 'Carry' },
      { discord_id: 'test_member_9_5', username: 'IndiaMember5', role: 'Support' }
    ]
  },
  {
    name: 'Juliet Juggernauts',
    captain_discord_id: 'test_captain_10',
    captain_username: 'JulietJuggernaut',
    members: [
      { discord_id: 'test_member_10_1', username: 'JulietMember1', role: 'Solo' },
      { discord_id: 'test_member_10_2', username: 'JulietMember2', role: 'Jungle' },
      { discord_id: 'test_member_10_3', username: 'JulietMember3', role: 'Mid' },
      { discord_id: 'test_member_10_4', username: 'JulietMember4', role: 'Carry' },
      { discord_id: 'test_member_10_5', username: 'JulietMember5', role: 'Support' }
    ]
  }
];

async function addTestTeamsToProduction() {
  console.log('🚀 Starting to add test teams to production...\n');
  
  let successCount = 0;
  let failCount = 0;
  
  for (const team of testTeams) {
    try {
      console.log(`Adding team: ${team.name}...`);
      
      const response = await axios.post(`${PRODUCTION_API_URL}/teams`, team);
      
      if (response.status === 201 || response.status === 200) {
        console.log(`✅ Successfully added: ${team.name} (ID: ${response.data.team_id})`);
        successCount++;
      } else {
        console.log(`❌ Failed to add: ${team.name} - Status: ${response.status}`);
        failCount++;
      }
    } catch (error) {
      console.log(`❌ Error adding ${team.name}:`, error.response?.data?.error || error.message);
      failCount++;
    }
  }
  
  console.log('\n📊 Summary:');
  console.log(`✅ Successfully added: ${successCount} teams`);
  console.log(`❌ Failed to add: ${failCount} teams`);
  console.log('\n🏁 Done!');
}

// Run the script
addTestTeamsToProduction().catch(console.error);