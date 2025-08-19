const postgresService = require('../services/postgresql');

async function debugTournaments() {
  console.log('🔧 Debugging tournament queries...\n');
  
  try {
    // Raw query to check all tournaments
    console.log('1. Raw tournament count...');
    const countResult = await postgresService.query('SELECT COUNT(*) as total FROM tournaments');
    console.log(`✅ Total tournaments: ${countResult.rows[0].total}`);
    
    // Check for any tournaments
    console.log('\n2. All tournaments (first 5)...');
    const allTournaments = await postgresService.query('SELECT tournament_id, name, created_at FROM tournaments ORDER BY created_at DESC LIMIT 5');
    console.log(`✅ Found ${allTournaments.rows.length} tournaments:`);
    allTournaments.rows.forEach(t => {
      console.log(`   - "${t.name}" (ID: ${t.tournament_id})`);
    });
    
    // Test the specific search that was failing
    console.log('\n3. Testing specific search pattern...');
    const searchResult = await postgresService.query(`
      SELECT id, tournament_id, name FROM tournaments 
      WHERE name ILIKE '%test tournament 101%'
    `);
    console.log(`✅ Search result: ${searchResult.rows.length} tournaments`);
    
    if (searchResult.rows.length === 0) {
      console.log('   No tournaments matching "test tournament 101"');
      console.log('   Let me check what tournament names we have...');
      
      const names = await postgresService.query('SELECT name FROM tournaments ORDER BY created_at DESC');
      console.log('   Tournament names:');
      names.rows.forEach(n => console.log(`     - "${n.name}"`));
    }
    
    console.log('\n🎉 Tournament debugging complete!');
    
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

debugTournaments();