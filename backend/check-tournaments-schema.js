require('dotenv').config({ path: '../.env' });
const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'predecessor_tournaments',
    user: 'postgres',
    password: 'Antigravity7@!89'
});

async function checkTournamentsSchema() {
    try {
        console.log('🏆 Checking tournaments table structure...');
        
        const columnsResult = await pool.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_name = 'tournaments' 
            ORDER BY ordinal_position
        `);
        
        console.log('\n🏆 tournaments table structure:');
        if (columnsResult.rows.length === 0) {
            console.log('  ❌ Table not found!');
        } else {
            columnsResult.rows.forEach(row => {
                console.log(`  - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
            });
        }
        
    } catch (error) {
        console.log('❌ Error:', error.message);
    } finally {
        await pool.end();
    }
}

checkTournamentsSchema();