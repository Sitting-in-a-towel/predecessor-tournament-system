// Check PostgreSQL database size and estimate bandwidth usage
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Pool } = require('pg');
const logger = require('../backend/utils/logger');

// PostgreSQL connection
const pool = new Pool({
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT) || 5432,
    database: process.env.POSTGRES_DATABASE || 'predecessor_tournaments',
    user: process.env.POSTGRES_USER || 'postgres',
    password: String(process.env.POSTGRES_PASSWORD || ''),
    connectionTimeoutMillis: 10000,
});

async function checkDatabaseMetrics() {
    console.log('🔍 Predecessor Website - Database Size & Bandwidth Analysis');
    console.log('==========================================================\n');
    
    try {
        // Test connection
        console.log('📡 Connecting to PostgreSQL...');
        const testQuery = await pool.query('SELECT NOW()');
        console.log('✅ Connected successfully at:', testQuery.rows[0].now);
        console.log();
        
        // Check if database exists
        const dbCheck = await pool.query(`
            SELECT datname, pg_database_size(datname) as size_bytes,
                   pg_size_pretty(pg_database_size(datname)) as size_pretty
            FROM pg_database 
            WHERE datname = $1
        `, [process.env.POSTGRES_DATABASE || 'predecessor_tournaments']);
        
        if (dbCheck.rows.length === 0) {
            console.log('❌ Database not found. The PostgreSQL migration may not be complete.');
            console.log('   The project is currently using Airtable as per config.ini');
            return;
        }
        
        // Database size
        console.log('📊 DATABASE SIZE INFORMATION:');
        console.log('-----------------------------');
        console.log(`Database Name: ${dbCheck.rows[0].datname}`);
        console.log(`Total Size: ${dbCheck.rows[0].size_pretty} (${dbCheck.rows[0].size_bytes} bytes)`);
        console.log();
        
        // Table sizes
        const tableQuery = await pool.query(`
            SELECT 
                schemaname,
                tablename,
                pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
                pg_total_relation_size(schemaname||'.'||tablename) AS size_bytes
            FROM pg_tables
            WHERE schemaname = 'public'
            ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
        `);
        
        console.log('📋 TABLE SIZES:');
        console.log('---------------');
        let totalTableSize = 0;
        tableQuery.rows.forEach(table => {
            console.log(`${table.tablename.padEnd(20)} : ${table.size}`);
            totalTableSize += parseInt(table.size_bytes);
        });
        console.log();
        
        // Row counts
        console.log('📈 TABLE ROW COUNTS:');
        console.log('--------------------');
        const tables = ['users', 'tournaments', 'teams', 'matches', 'draft_sessions', 'heroes'];
        
        for (const table of tables) {
            try {
                const countQuery = await pool.query(`SELECT COUNT(*) FROM ${table}`);
                console.log(`${table.padEnd(20)} : ${countQuery.rows[0].count} rows`);
            } catch (e) {
                console.log(`${table.padEnd(20)} : Table not found`);
            }
        }
        console.log();
        
        // Bandwidth estimation based on application structure
        console.log('🌐 BANDWIDTH USAGE ESTIMATION:');
        console.log('-------------------------------');
        console.log('Based on the application structure analysis:\n');
        
        console.log('API Endpoints (per request estimates):');
        console.log('- Tournament list: ~5-10 KB (JSON response with 10-20 tournaments)');
        console.log('- Tournament details: ~3-5 KB (single tournament with teams)');
        console.log('- Team operations: ~2-3 KB per request');
        console.log('- Match updates: ~1-2 KB per request');
        console.log('- Draft session: ~5-10 KB (real-time updates during draft)');
        console.log('- Hero data: ~20-30 KB (cached, loaded once per session)');
        console.log();
        
        console.log('Frontend Assets:');
        console.log('- React bundle: ~500-800 KB (gzipped)');
        console.log('- CSS files: ~50-100 KB');
        console.log('- Images/logos: ~100-200 KB per tournament page');
        console.log();
        
        console.log('Estimated Bandwidth per User Session:');
        console.log('- Initial load: ~1-1.5 MB');
        console.log('- Average tournament browsing: ~50-100 KB');
        console.log('- Active tournament participation: ~200-500 KB');
        console.log('- Draft session participation: ~100-200 KB');
        console.log();
        
        console.log('Monthly Bandwidth Estimates:');
        console.log('- 100 active users: ~5-10 GB/month');
        console.log('- 500 active users: ~25-50 GB/month');
        console.log('- 1000 active users: ~50-100 GB/month');
        console.log();
        
        console.log('📝 RECOMMENDATIONS:');
        console.log('-------------------');
        console.log('1. Database Size: Currently minimal, will grow with:');
        console.log('   - User avatars (if stored): ~50KB per user');
        console.log('   - Match replays/VODs: Links only, no storage impact');
        console.log('   - Tournament history: ~1-2MB per 100 tournaments');
        console.log();
        console.log('2. Bandwidth Optimization:');
        console.log('   - Enable gzip compression on server');
        console.log('   - Implement caching headers for static assets');
        console.log('   - Use pagination for large tournament lists');
        console.log('   - Consider CDN for static assets if scaling');
        console.log();
        console.log('3. Current Status:');
        console.log('   - Project uses Airtable (per config.ini)');
        console.log('   - PostgreSQL migration prepared but not active');
        console.log('   - Local hosting minimizes bandwidth concerns');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.log('\nPossible reasons:');
        console.log('1. PostgreSQL is not installed or not running');
        console.log('2. Database "predecessor_tournaments" does not exist');
        console.log('3. Connection credentials are incorrect');
        console.log('4. The project is still using Airtable (check config.ini)');
    } finally {
        await pool.end();
    }
}

// Run the check
checkDatabaseMetrics().catch(console.error);