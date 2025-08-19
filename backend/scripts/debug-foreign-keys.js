const { Pool } = require('pg');

async function debugForeignKeys() {
  console.log('🔍 DEBUGGING FOREIGN KEY ISSUES\n');
  
  const localConfig = {
    host: 'localhost',
    port: 5432,
    database: 'predecessor_tournaments',
    user: 'postgres',
    password: 'Antigravity7@!89',
    max: 5,
    connectionTimeoutMillis: 10000,
  };
  
  const renderConfig = {
    connectionString: 'postgresql://predecessor_tournament_db_user:2WQIOj046lYHGuGnXFA5Ks5asy21xTcH@dpg-d24r7vfgi27c73bbmgh0-a.singapore-postgres.render.com/predecessor_tournament_db',
    ssl: { rejectUnauthorized: false },
    max: 5,
    connectionTimeoutMillis: 30000,
  };
  
  const localPool = new Pool(localConfig);
  const renderPool = new Pool(renderConfig);
  
  try {
    console.log('📡 Connecting...');
    await localPool.query('SELECT 1');
    await renderPool.query('SELECT 1');
    console.log('✅ Connected\n');
    
    // Check local users vs tournaments
    console.log('👥 LOCAL USERS:');
    const localUsers = await localPool.query(`SELECT id, user_id, discord_username, discord_id FROM users ORDER BY created_at`);
    localUsers.rows.forEach((user, i) => {
      console.log(`  ${i+1}. ${user.discord_username || user.user_id} (ID: ${user.id.substring(0, 8)}...)`);
    });
    
    console.log('\n🏆 LOCAL TOURNAMENTS AND THEIR CREATORS:');
    const localTournaments = await localPool.query(`
      SELECT t.id, t.name, t.created_by, u.discord_username 
      FROM tournaments t 
      LEFT JOIN users u ON t.created_by = u.id 
      ORDER BY t.created_at
    `);
    localTournaments.rows.forEach((tournament, i) => {
      console.log(`  ${i+1}. ${tournament.name}`);
      console.log(`      Created by: ${tournament.created_by ? tournament.created_by.substring(0, 8) + '...' : 'NULL'}`);
      console.log(`      User: ${tournament.discord_username || 'NOT FOUND'}`);
    });
    
    console.log('\n🎯 PRODUCTION USERS:');
    const prodUsers = await renderPool.query(`SELECT id, user_id, discord_username FROM users ORDER BY created_at`);
    prodUsers.rows.forEach((user, i) => {
      console.log(`  ${i+1}. ${user.discord_username || user.user_id} (ID: ${user.id.substring(0, 8)}...)`);
    });
    
    // Find missing users
    console.log('\n❌ MISSING USERS IN PRODUCTION:');
    const localUserIds = localUsers.rows.map(u => u.id);
    const prodUserIds = prodUsers.rows.map(u => u.id);
    
    const missingUsers = localUsers.rows.filter(localUser => 
      !prodUserIds.includes(localUser.id)
    );
    
    if (missingUsers.length > 0) {
      console.log('Found missing users:');
      missingUsers.forEach(user => {
        console.log(`  - ${user.discord_username || user.user_id} (${user.id})`);
      });
      
      // Try to insert missing users manually
      console.log('\n🔧 ATTEMPTING TO INSERT MISSING USERS...');
      
      for (const user of missingUsers) {
        try {
          const columns = Object.keys(user);
          const values = Object.values(user);
          const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
          
          await renderPool.query(`
            INSERT INTO users (${columns.join(', ')}) 
            VALUES (${placeholders})
          `, values);
          
          console.log(`  ✅ Inserted: ${user.discord_username || user.user_id}`);
        } catch (err) {
          console.log(`  ❌ Failed to insert ${user.discord_username || user.user_id}: ${err.message.substring(0, 80)}`);
        }
      }
    } else {
      console.log('No missing users found');
    }
    
    // Check tournaments that need these users
    console.log('\n🏆 TOURNAMENTS NEEDING MISSING USERS:');
    const problemTournaments = localTournaments.rows.filter(tournament => 
      tournament.created_by && !prodUserIds.includes(tournament.created_by)
    );
    
    if (problemTournaments.length > 0) {
      problemTournaments.forEach(tournament => {
        console.log(`  - ${tournament.name} needs user ${tournament.created_by.substring(0, 8)}...`);
      });
    } else {
      console.log('All tournament creators should exist in production now');
    }
    
    // Final user count verification
    console.log('\n📊 FINAL USER COUNTS:');
    const finalLocal = await localPool.query('SELECT COUNT(*) FROM users');
    const finalProd = await renderPool.query('SELECT COUNT(*) FROM users');
    
    console.log(`Local users: ${finalLocal.rows[0].count}`);
    console.log(`Production users: ${finalProd.rows[0].count}`);
    
    if (finalLocal.rows[0].count === finalProd.rows[0].count) {
      console.log('✅ User counts match! Ready to retry tournament copy');
    } else {
      console.log('❌ User counts still don\'t match');
    }
    
  } catch (error) {
    console.error('❌ Debug error:', error.message);
  } finally {
    await localPool.end();
    await renderPool.end();
  }
}

debugForeignKeys();