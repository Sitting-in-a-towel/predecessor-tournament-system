require('dotenv').config({ path: '../.env' });
const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'predecessor_tournaments',
    user: 'postgres',
    password: 'Antigravity7@!89'
});

async function checkTeamsSchema() {
    try {
        console.log('👥 Checking teams table structure...');
        
        const columnsResult = await pool.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_name = 'teams' 
            ORDER BY ordinal_position
        `);
        
        console.log('\n👥 teams table structure:');
        columnsResult.rows.forEach(row => {
            console.log(`  - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
        });
        
    } catch (error) {
        console.log('❌ Error:', error.message);
    } finally {
        await pool.end();
    }
}

checkTeamsSchema();