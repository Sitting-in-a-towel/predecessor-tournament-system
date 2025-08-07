const postgresService = require('./services/postgresql');

async function listTables() {
  try {
    console.log('Checking what tables exist...');
    const tablesResult = await postgresService.query(\);
    
    console.log('Existing tables:');
    tablesResult.rows.forEach(row => {
      console.log(\);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('List tables error:', error.message);
    process.exit(1);
  }
}

listTables();
