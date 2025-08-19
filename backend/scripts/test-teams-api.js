const axios = require('axios');
const { Pool } = require('pg');

async function testTeamsAPI() {
  try {
    console.log('🌐 Testing /teams API endpoint...\n');
    
    // Get tournament ID first
    const pool = new Pool({
      connectionString: 'postgresql://predecessor_tournament_db_user:2WQIOj046lYHGuGnXFA5Ks5asy21xTcH@dpg-d24r7vfgi27c73bbmgh0-a.singapore-postgres.render.com/predecessor_tournament_db',
      ssl: { rejectUnauthorized: false }
    });
    
    const tournamentResult = await pool.query(`
      SELECT tournament_id, name FROM tournaments 
      WHERE name ILIKE '%test tournament 101%' 
      ORDER BY created_at DESC LIMIT 1
    `);
    
    if (tournamentResult.rows.length === 0) {
      console.log('❌ No tournament found');
      return;
    }
    
    const tournament = tournamentResult.rows[0];
    console.log(`🏆 Found tournament: ${tournament.name}`);
    console.log(`   Tournament ID: ${tournament.tournament_id}`);
    
    await pool.end();
    
    // Test the API endpoint (assuming backend is running on port 3001)
    const url = `http://localhost:3001/api/tournaments/${tournament.tournament_id}/teams`;
    console.log(`\n📡 Calling API: ${url}`);
    
    const response = await axios.get(url);
    
    console.log(`✅ API Response Status: ${response.status}`);
    console.log(`📊 Teams returned: ${response.data.length}`);
    
    if (response.data.length > 0) {
      console.log('\nTeams:');
      response.data.forEach((team, i) => {
        console.log(`  ${i+1}. ${team.team_name} (${team.team_tag || 'no tag'})`);
        console.log(`      Captain: ${team.captain_username}`);
        console.log(`      Players: ${team.player_count}/5`);
        console.log(`      Confirmed: ${team.confirmed}`);
      });
    }
    
    console.log('\n🎉 API endpoint is working correctly!');
    console.log('The teams should now be visible on your tournament page!');
    
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('⚠️  Backend server is not running');
      console.log('   Start the backend with: npm run dev');
      console.log('   Then refresh your tournament page');
    } else {
      console.log('❌ API Error:', error.message);
      if (error.response) {
        console.log('   Status:', error.response.status);
        console.log('   Data:', error.response.data);
      }
    }
  }
}

testTeamsAPI();