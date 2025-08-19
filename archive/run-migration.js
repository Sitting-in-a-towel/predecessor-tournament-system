const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Use the Render PostgreSQL connection string
const connectionString = 'postgresql://predecessor_tournament_db_user:2WQIOj046lYHGuGnXFA5Ks5asy21xTcH@dpg-d24r7vfgi27c73bbmgh0-a.singapore-postgres.render.com/predecessor_tournament_db';

async function runMigration() {
    const client = new Client({
        connectionString: connectionString,
        ssl: {
            rejectUnauthorized: false // Required for Render PostgreSQL
        }
    });

    try {
        console.log('Connecting to Render PostgreSQL...');
        await client.connect();
        console.log('✅ Connected successfully!');

        // Read the schema file
        const schemaPath = path.join(__dirname, 'DATABASE_MIGRATION', 'postgresql_schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');

        console.log('Running database schema...');
        await client.query(schema);
        console.log('✅ Database schema created successfully!');

        // Read and run sample data if it exists
        const sampleDataPath = path.join(__dirname, 'DATABASE_MIGRATION', 'populate_sample_data.sql');
        if (fs.existsSync(sampleDataPath)) {
            console.log('Adding sample data...');
            const sampleData = fs.readFileSync(sampleDataPath, 'utf8');
            await client.query(sampleData);
            console.log('✅ Sample data added successfully!');
        }

        console.log('🎉 Migration completed successfully!');

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        console.error('Full error:', error);
    } finally {
        await client.end();
    }
}

runMigration();