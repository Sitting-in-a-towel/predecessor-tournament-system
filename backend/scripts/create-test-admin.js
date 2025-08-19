const postgresService = require('../services/postgresql');
const { v4: uuidv4 } = require('uuid');

async function createTestAdmin() {
  try {
    console.log('🔧 Creating test admin user...');
    
    // Check if test admin already exists
    const existingUser = await postgresService.query(
      'SELECT * FROM users WHERE discord_username = $1',
      ['TestAdmin']
    );
    
    if (existingUser.rows.length > 0) {
      console.log('✅ Test admin user already exists');
      console.log('User details:', {
        id: existingUser.rows[0].id,
        discord_username: existingUser.rows[0].discord_username,
        role: existingUser.rows[0].role
      });
      return existingUser.rows[0];
    }
    
    // Create test admin user
    const userId = uuidv4();
    const userStringId = `user_${Date.now()}_admin`;
    
    const insertUserResult = await postgresService.query(`
      INSERT INTO users (
        id, user_id, discord_id, discord_username, avatar, 
        email, role, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9
      ) RETURNING *
    `, [
      userId,
      userStringId,
      '123456789012345678', // Fake Discord ID
      'TestAdmin',
      'https://cdn.discordapp.com/embed/avatars/0.png',
      'testadmin@example.com',
      'admin',
      new Date(),
      new Date()
    ]);
    
    const newUser = insertUserResult.rows[0];
    console.log('✅ Test admin user created successfully');
    console.log('User details:', {
      id: newUser.id,
      discord_username: newUser.discord_username,
      role: newUser.role
    });
    
    return newUser;
    
  } catch (error) {
    console.error('❌ Error creating test admin:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  createTestAdmin()
    .then(() => {
      console.log('✅ Test admin creation completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Failed to create test admin:', error);
      process.exit(1);
    });
}

module.exports = { createTestAdmin };