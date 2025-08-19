const { Pool } = require('pg');

async function compareAdminPanelTournament() {
  console.log('🔍 COMPARING "test admin panel" TOURNAMENT DATA\n');
  
  const localConfig = {
    host: 'localhost',
    port: 5432,
    database: 'predecessor_tournaments',
    user: 'postgres',
    password: 'Antigravity7@!89'
  };
  
  const renderConfig = {
    connectionString: 'postgresql://predecessor_tournament_db_user:2WQIOj046lYHGuGnXFA5Ks5asy21xTcH@dpg-d24r7vfgi27c73bbmgh0-a.singapore-postgres.render.com/predecessor_tournament_db',
    ssl: { rejectUnauthorized: false }
  };
  
  const localPool = new Pool(localConfig);
  const renderPool = new Pool(renderConfig);
  
  try {
    console.log('📡 Connecting to both databases...');
    await localPool.query('SELECT 1');
    await renderPool.query('SELECT 1');
    console.log('✅ Connected to both databases\n');
    
    // Find "test admin panel" tournament in both databases
    console.log('🏆 TOURNAMENT DATA COMPARISON:\n');
    
    const localTournament = await localPool.query(`
      SELECT * FROM tournaments 
      WHERE name = 'test admin panel' 
      ORDER BY created_at DESC 
      LIMIT 1
    `);
    
    const prodTournament = await renderPool.query(`
      SELECT * FROM tournaments 
      WHERE name = 'test admin panel' 
      ORDER BY created_at DESC 
      LIMIT 1
    `);
    
    if (localTournament.rows.length === 0) {
      console.log('❌ LOCAL: No "test admin panel" tournament found');
    } else {
      console.log('📊 LOCAL TOURNAMENT DATA:');
      const local = localTournament.rows[0];
      console.log(`  ID: ${local.id}`);
      console.log(`  Tournament ID: ${local.tournament_id}`);
      console.log(`  Name: ${local.name}`);
      console.log(`  Status: ${local.status}`);
      console.log(`  Bracket Type: ${local.bracket_type}`);
      console.log(`  Game Format: ${local.game_format}`);
      console.log(`  Max Teams: ${local.max_teams}`);
      console.log(`  Current Teams: ${local.current_teams}`);
      console.log(`  Registration Open: ${local.registration_open}`);
      console.log(`  Check-in Enabled: ${local.check_in_enabled}`);
      console.log(`  Created By: ${local.created_by}`);
      console.log(`  Created At: ${local.created_at}`);
    }
    
    console.log('\n');
    
    if (prodTournament.rows.length === 0) {
      console.log('❌ PRODUCTION: No "test admin panel" tournament found');
    } else {
      console.log('📊 PRODUCTION TOURNAMENT DATA:');
      const prod = prodTournament.rows[0];
      console.log(`  ID: ${prod.id}`);
      console.log(`  Tournament ID: ${prod.tournament_id}`);
      console.log(`  Name: ${prod.name}`);
      console.log(`  Status: ${prod.status}`);
      console.log(`  Bracket Type: ${prod.bracket_type}`);
      console.log(`  Game Format: ${prod.game_format}`);
      console.log(`  Max Teams: ${prod.max_teams}`);
      console.log(`  Current Teams: ${prod.current_teams}`);
      console.log(`  Registration Open: ${prod.registration_open}`);
      console.log(`  Check-in Enabled: ${prod.check_in_enabled}`);
      console.log(`  Created By: ${prod.created_by}`);
      console.log(`  Created At: ${prod.created_at}`);
    }
    
    // Compare teams
    console.log('\n👥 TEAMS COMPARISON:\n');
    
    let localTeams = [];
    let prodTeams = [];
    
    if (localTournament.rows.length > 0) {
      const localTeamsResult = await localPool.query(`
        SELECT * FROM teams 
        WHERE tournament_id = $1 
        ORDER BY created_at
      `, [localTournament.rows[0].id]);
      
      localTeams = localTeamsResult.rows;
      console.log(`📊 LOCAL TEAMS (${localTeams.length} total):`);
      localTeams.forEach((team, i) => {
        console.log(`  ${i+1}. ${team.team_name} (${team.team_tag || 'no tag'})`);
        console.log(`      ID: ${team.id}`);
        console.log(`      Team ID: ${team.team_id}`);
        console.log(`      Captain: ${team.captain_id}`);
        console.log(`      Confirmed: ${team.confirmed}`);
        console.log(`      Checked In: ${team.checked_in}`);
        console.log(`      Created: ${team.created_at}`);
      });
    }
    
    if (prodTournament.rows.length > 0) {
      const prodTeamsResult = await renderPool.query(`
        SELECT * FROM teams 
        WHERE tournament_id = $1 
        ORDER BY created_at
      `, [prodTournament.rows[0].id]);
      
      prodTeams = prodTeamsResult.rows;
      console.log(`\n📊 PRODUCTION TEAMS (${prodTeams.length} total):`);
      prodTeams.forEach((team, i) => {
        console.log(`  ${i+1}. ${team.team_name} (${team.team_tag || 'no tag'})`);
        console.log(`      ID: ${team.id}`);
        console.log(`      Team ID: ${team.team_id}`);
        console.log(`      Captain: ${team.captain_id}`);
        console.log(`      Confirmed: ${team.confirmed}`);
        console.log(`      Checked In: ${team.checked_in}`);
        console.log(`      Created: ${team.created_at}`);
      });
    }
    
    // Check tournament brackets
    console.log('\n🏆 TOURNAMENT BRACKETS COMPARISON:\n');
    
    if (localTournament.rows.length > 0) {
      const localBrackets = await localPool.query(`
        SELECT * FROM tournament_brackets 
        WHERE tournament_id = $1
      `, [localTournament.rows[0].id]);
      
      console.log(`📊 LOCAL BRACKETS: ${localBrackets.rows.length} found`);
      localBrackets.rows.forEach((bracket, i) => {
        console.log(`  ${i+1}. Bracket ID: ${bracket.id}`);
        console.log(`      Type: ${bracket.bracket_type}`);
        console.log(`      Published: ${bracket.published}`);
        console.log(`      Data: ${typeof bracket.bracket_data === 'object' ? 'JSON Object' : bracket.bracket_data}`);
      });
    }
    
    if (prodTournament.rows.length > 0) {
      const prodBrackets = await renderPool.query(`
        SELECT * FROM tournament_brackets 
        WHERE tournament_id = $1
      `, [prodTournament.rows[0].id]);
      
      console.log(`\n📊 PRODUCTION BRACKETS: ${prodBrackets.rows.length} found`);
      prodBrackets.rows.forEach((bracket, i) => {
        console.log(`  ${i+1}. Bracket ID: ${bracket.id}`);
        console.log(`      Type: ${bracket.bracket_type}`);
        console.log(`      Published: ${bracket.published}`);
        console.log(`      Data: ${typeof bracket.bracket_data === 'object' ? 'JSON Object' : bracket.bracket_data}`);
      });
    }
    
    // Check draft sessions
    console.log('\n⚔️  DRAFT SESSIONS COMPARISON:\n');
    
    if (localTournament.rows.length > 0) {
      const localDrafts = await localPool.query(`
        SELECT * FROM draft_sessions 
        WHERE tournament_id = $1
      `, [localTournament.rows[0].id]);
      
      console.log(`📊 LOCAL DRAFT SESSIONS: ${localDrafts.rows.length} found`);
      localDrafts.rows.forEach((draft, i) => {
        console.log(`  ${i+1}. Draft ID: ${draft.id}`);
        console.log(`      Match ID: ${draft.match_id}`);
        console.log(`      Status: ${draft.status}`);
        console.log(`      Team 1: ${draft.team1_id}`);
        console.log(`      Team 2: ${draft.team2_id}`);
      });
    }
    
    if (prodTournament.rows.length > 0) {
      const prodDrafts = await renderPool.query(`
        SELECT * FROM draft_sessions 
        WHERE tournament_id = $1
      `, [prodTournament.rows[0].id]);
      
      console.log(`\n📊 PRODUCTION DRAFT SESSIONS: ${prodDrafts.rows.length} found`);
      prodDrafts.rows.forEach((draft, i) => {
        console.log(`  ${i+1}. Draft ID: ${draft.id}`);
        console.log(`      Match ID: ${draft.match_id}`);
        console.log(`      Status: ${draft.status}`);
        console.log(`      Team 1: ${draft.team1_id}`);
        console.log(`      Team 2: ${draft.team2_id}`);
      });
    }
    
    // Summary of differences
    console.log('\n🔍 SUMMARY OF DIFFERENCES:\n');
    
    if (localTournament.rows.length === 0 && prodTournament.rows.length === 0) {
      console.log('❌ "test admin panel" tournament not found in either database');
    } else if (localTournament.rows.length === 0) {
      console.log('⚠️  Tournament only exists in PRODUCTION');
    } else if (prodTournament.rows.length === 0) {
      console.log('⚠️  Tournament only exists in LOCAL');
    } else {
      console.log('✅ Tournament exists in both databases');
      console.log(`   Local teams: ${localTeams.length}, Production teams: ${prodTeams.length}`);
      
      const local = localTournament.rows[0];
      const prod = prodTournament.rows[0];
      
      const differences = [];
      
      if (local.status !== prod.status) differences.push(`Status: Local="${local.status}" vs Prod="${prod.status}"`);
      if (local.bracket_type !== prod.bracket_type) differences.push(`Bracket Type: Local="${local.bracket_type}" vs Prod="${prod.bracket_type}"`);
      if (local.game_format !== prod.game_format) differences.push(`Game Format: Local="${local.game_format}" vs Prod="${prod.game_format}"`);
      if (local.max_teams !== prod.max_teams) differences.push(`Max Teams: Local=${local.max_teams} vs Prod=${prod.max_teams}`);
      if (local.current_teams !== prod.current_teams) differences.push(`Current Teams: Local=${local.current_teams} vs Prod=${prod.current_teams}`);
      if (local.registration_open !== prod.registration_open) differences.push(`Registration Open: Local=${local.registration_open} vs Prod=${prod.registration_open}`);
      if (local.check_in_enabled !== prod.check_in_enabled) differences.push(`Check-in Enabled: Local=${local.check_in_enabled} vs Prod=${prod.check_in_enabled}`);
      
      if (differences.length > 0) {
        console.log('\n🔄 FIELD DIFFERENCES:');
        differences.forEach(diff => console.log(`   - ${diff}`));
      } else {
        console.log('✅ Tournament fields are identical');
      }
      
      if (localTeams.length !== prodTeams.length) {
        console.log(`⚠️  Team count mismatch: Local=${localTeams.length}, Production=${prodTeams.length}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error comparing data:', error.message);
  } finally {
    await localPool.end();
    await renderPool.end();
  }
}

compareAdminPanelTournament();