const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Production database connection
const productionPool = new Pool({
    connectionString: 'postgresql://postgres:Zg15GhlKtyUgFJFSa0WzZ53j9FVZwCl9@dpg-cs1q3sdumphs738qf4e0-a.oregon-postgres.render.com/predecessor_tournaments_8i2c',
    ssl: { rejectUnauthorized: false },
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
});

async function migrateDatabase() {
    try {
        console.log('🗑️  Dropping all tables in production...');
        
        // Drop all tables
        const dropScript = fs.readFileSync(path.join(__dirname, 'drop_all_tables.sql'), 'utf8');
        await productionPool.query(dropScript);
        console.log('✅ Dropped all tables');

        console.log('🏗️  Creating schema from local database...');
        
        // Apply schema
        const schemaScript = fs.readFileSync(path.join(__dirname, 'local_schema.sql'), 'utf8');
        await productionPool.query(schemaScript);
        console.log('✅ Created schema');

        console.log('📊 Loading data from local database...');
        
        // Apply data
        const dataScript = fs.readFileSync(path.join(__dirname, 'local_data.sql'), 'utf8');
        await productionPool.query(dataScript);
        console.log('✅ Loaded data');

        console.log('🎉 Database migration completed successfully!');
        
    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    } finally {
        await productionPool.end();
    }
}

migrateDatabase();