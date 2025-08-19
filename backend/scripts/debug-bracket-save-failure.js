const axios = require('axios');
const postgres = require('../services/postgresql');

async function debugBracketSaveFailure() {
  console.log('🔍 DEBUGGING BRACKET SAVE FAILURE POINTS...\n');
  
  try {
    // Test 1: Check tournament IDs and database state
    console.log('=== TEST 1: DATABASE & TOURNAMENT STATE ===');
    
    const tournamentsQuery = `
      SELECT 
        t.id, 
        t.tournament_id, 
        t.name,
        t.created_by,
        tb.id as bracket_id,
        tb.is_published,
        tb.tournament_id as bracket_tournament_id
      FROM tournaments t
      LEFT JOIN tournament_brackets tb ON tb.tournament_id = t.id
      WHERE t.name = 'test admin panel'
    `;
    
    const tournaments = await postgres.query(tournamentsQuery);
    
    if (tournaments.rows.length === 0) {
      console.log('❌ CRITICAL: "test admin panel" tournament not found!');
      return;
    }
    
    const tournament = tournaments.rows[0];
    console.log('✅ Tournament found:');
    console.log(`   Name: ${tournament.name}`);
    console.log(`   Primary Key (id): ${tournament.id}`);
    console.log(`   Public ID (tournament_id): ${tournament.tournament_id}`);
    console.log(`   Created By: ${tournament.created_by}`);
    console.log(`   Has Bracket: ${tournament.bracket_id ? 'Yes' : 'No'}`);
    console.log(`   Bracket Published: ${tournament.is_published || 'N/A'}`);
    
    // Test 2: Test bracket save API directly (without auth)
    console.log('\n=== TEST 2: BRACKET SAVE API (NO AUTH) ===');
    
    const testBracketData = {
      bracketData: {
        type: 'Single Elimination',
        rounds: [
          {
            name: 'Round 1',
            matches: [
              {
                id: 'r1m1',
                team1: { id: '1', team_name: 'Test Team 1' },
                team2: { id: '2', team_name: 'Test Team 2' }
              }
            ]
          }
        ]
      },
      lockedSlots: [],
      isPublished: true,
      seedingMode: 'manual',
      seriesLength: 1
    };
    
    try {
      const response = await axios.post(`http://localhost:3001/api/tournaments/${tournament.id}/bracket`, testBracketData);
      console.log('❌ UNEXPECTED: API succeeded without auth!');
      console.log('Response:', response.data);
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ EXPECTED: 401 Authentication required');
      } else {
        console.log(`❌ UNEXPECTED ERROR: ${error.response?.status} - ${error.message}`);
        console.log('Response data:', error.response?.data);
      }
    }
    
    // Test 3: Check database constraints
    console.log('\n=== TEST 3: DATABASE CONSTRAINT ANALYSIS ===');
    
    // Check if tournament_brackets has proper constraints
    const constraintsQuery = `
      SELECT 
        tc.constraint_name,
        tc.constraint_type,
        kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_name = 'tournament_brackets'
      AND tc.constraint_type IN ('PRIMARY KEY', 'UNIQUE', 'FOREIGN KEY')
    `;
    
    const constraints = await postgres.query(constraintsQuery);
    console.log('Tournament_brackets constraints:');
    constraints.rows.forEach(constraint => {
      console.log(`   ${constraint.constraint_type}: ${constraint.column_name} (${constraint.constraint_name})`);
    });
    
    // Test 4: Check for existing bracket conflicts
    console.log('\n=== TEST 4: BRACKET CONFLICT ANALYSIS ===');
    
    const existingBrackets = await postgres.query(`
      SELECT 
        id,
        tournament_id,
        is_published,
        created_by,
        created_at
      FROM tournament_brackets 
      WHERE tournament_id = $1
    `, [tournament.id]);
    
    console.log(`Existing brackets for tournament: ${existingBrackets.rows.length}`);
    existingBrackets.rows.forEach(bracket => {
      console.log(`   Bracket ID: ${bracket.id}`);
      console.log(`   Published: ${bracket.is_published}`);
      console.log(`   Created By: ${bracket.created_by}`);
      console.log(`   Created: ${bracket.created_at}`);
    });
    
    // Test 5: Simulate the exact frontend request
    console.log('\n=== TEST 5: FRONTEND REQUEST SIMULATION ===');
    
    console.log('Frontend would send:');
    console.log(`   URL: POST /api/tournaments/${tournament.id}/bracket`);
    console.log('   Headers: withCredentials: true');
    console.log('   Body:', JSON.stringify(testBracketData, null, 2));
    
    // Test 6: Check user permissions (requires actual user session)
    console.log('\n=== TEST 6: PERMISSION REQUIREMENTS ===');
    console.log('✅ Endpoint requires: requireAuth middleware');
    console.log('✅ User must be authenticated via Discord OAuth');
    console.log('❓ User must be admin? (not explicitly checked in this endpoint)');
    console.log('❓ User must be tournament creator? (not explicitly checked)');
    
    console.log('\n🎯 LIKELY FAILURE POINTS IDENTIFIED:');
    console.log('1. ❌ AUTHENTICATION: User session expired or not properly authenticated');
    console.log('2. ❌ VALIDATION: bracketData structure doesn\t match backend expectations');
    console.log('3. ❌ TOURNAMENT ID: Frontend sending wrong tournament ID format');
    console.log('4. ❌ DATABASE CONSTRAINT: Unique constraint violation or FK issue');
    console.log('5. ❌ USER PERMISSIONS: User lacks necessary permissions');
    
    console.log('\n🎭 NEXT: Run Playwright test to reproduce the exact issue...');
    
  } catch (error) {
    console.error('❌ Debugging script failed:', error.message);
  }
  process.exit(0);
}

debugBracketSaveFailure();