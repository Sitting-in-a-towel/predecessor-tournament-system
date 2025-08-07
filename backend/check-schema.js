const postgresService = require("./services/postgresql");

async function checkSchema() {
  try {
    console.log("Checking tournament_registrations schema...");
    const schemaResult = await postgresService.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = "tournament_registrations" 
      ORDER BY ordinal_position;
    `);
    
    console.log("tournament_registrations columns:");
    schemaResult.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });
    
    console.log("\nChecking teams schema...");
    const teamsSchema = await postgresService.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = "teams" 
      ORDER BY ordinal_position;
    `);
    
    console.log("teams columns:");
    teamsSchema.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });
    
    // Sample some actual data
    console.log("\nSample tournament_registrations data:");
    const sampleRegs = await postgresService.query(`
      SELECT id, team_id, tournament_id 
      FROM tournament_registrations 
      LIMIT 3;
    `);
    
    sampleRegs.rows.forEach(row => {
      console.log(`  id: ${row.id} (${typeof row.id}), team_id: ${row.team_id} (${typeof row.team_id})`);
    });
    
    console.log("\nSample teams data:");
    const sampleTeams = await postgresService.query(`
      SELECT id, team_id, team_name 
      FROM teams 
      LIMIT 3;
    `);
    
    sampleTeams.rows.forEach(row => {
      console.log(`  id: ${row.id} (${typeof row.id}), team_id: ${row.team_id} (${typeof row.team_id})`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error("Schema check error:", error.message);
    process.exit(1);
  }
}

checkSchema();
