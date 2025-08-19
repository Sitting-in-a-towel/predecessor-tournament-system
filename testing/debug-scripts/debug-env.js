require('dotenv').config({ path: '../.env' });

console.log('Environment variables:');
console.log('POSTGRES_HOST:', process.env.POSTGRES_HOST);
console.log('POSTGRES_PORT:', process.env.POSTGRES_PORT);
console.log('POSTGRES_DATABASE:', process.env.POSTGRES_DATABASE);
console.log('POSTGRES_USER:', process.env.POSTGRES_USER);
console.log('POSTGRES_PASSWORD exists:', !!process.env.POSTGRES_PASSWORD);
console.log('POSTGRES_PASSWORD type:', typeof process.env.POSTGRES_PASSWORD);
console.log('POSTGRES_PASSWORD length:', process.env.POSTGRES_PASSWORD?.length);

// Test with hardcoded values
const { Pool } = require('pg');

const testPool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'predecessor_tournaments',
    user: 'postgres',
    password: 'Antigravity7@!89'
});

async function testHardcoded() {
    try {
        const client = await testPool.connect();
        console.log('✅ Hardcoded connection successful');
        client.release();
        await testPool.end();
    } catch (error) {
        console.log('❌ Hardcoded connection failed:', error.message);
        await testPool.end();
    }
}

testHardcoded();