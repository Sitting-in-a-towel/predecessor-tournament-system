const postgresService = require('../services/postgresql');

async function updateAdminRole() {
  try {
    console.log('🔧 Updating TestAdmin role...');
    
    const result = await postgresService.query(
      'UPDATE users SET is_admin = $1 WHERE discord_username = $2 RETURNING *',
      [true, 'TestAdmin']
    );
    
    if (result.rows.length > 0) {
      console.log('✅ TestAdmin role updated to admin');
      console.log('Updated user:', {
        id: result.rows[0].id,
        discord_username: result.rows[0].discord_username,
        is_admin: result.rows[0].is_admin
      });
    } else {
      console.log('❌ TestAdmin user not found');
    }
    
  } catch (error) {
    console.error('❌ Error updating admin role:', error);
  }
}

updateAdminRole().then(() => process.exit(0));