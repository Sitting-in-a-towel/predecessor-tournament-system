const { Client } = require('pg');

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

        // Add sample data with correct column names
        console.log('Adding sample data...');
        
        // Insert sample user
        await client.query(`
            INSERT INTO users (
                user_id, discord_id, discord_username, discord_discriminator, 
                email, avatar_url, is_admin, is_banned
            ) VALUES (
                'user_test_001', 
                '123456789012345678', 
                'TestAdmin', 
                '0001',
                'admin@predecessor-tournaments.com',
                'https://cdn.discordapp.com/avatars/123456789012345678/sample.png',
                true,
                false
            ) ON CONFLICT (user_id) DO NOTHING;
        `);

        // Insert sample tournament
        await client.query(`
            INSERT INTO tournaments (
                tournament_id, name, description, bracket_type, game_format,
                max_teams, start_date, status, created_by
            ) VALUES (
                'tournament_test_001',
                'OCL Sample Tournament',
                'A test tournament for the OCL Predecessor system',
                'Single Elimination',
                'Best of 3',
                16,
                CURRENT_TIMESTAMP + INTERVAL '7 days',
                'Upcoming',
                (SELECT id FROM users WHERE user_id = 'user_test_001')
            ) ON CONFLICT (tournament_id) DO NOTHING;
        `);

        // Insert sample team with correct column names
        await client.query(`
            INSERT INTO teams (
                team_id, team_name, captain_id, tournament_id, confirmed
            ) VALUES (
                'team_test_001',
                'OCL Sample Team',
                (SELECT id FROM users WHERE user_id = 'user_test_001'),
                (SELECT id FROM tournaments WHERE tournament_id = 'tournament_test_001'),
                true
            ) ON CONFLICT (team_id) DO NOTHING;
        `);

        console.log('✅ Sample data added successfully!');
        console.log('🎉 Database setup completed successfully!');

        // Verify data
        const userCount = await client.query('SELECT COUNT(*) FROM users');
        const tournamentCount = await client.query('SELECT COUNT(*) FROM tournaments');
        const teamCount = await client.query('SELECT COUNT(*) FROM teams');

        console.log(`📊 Database contains:`);
        console.log(`   Users: ${userCount.rows[0].count}`);
        console.log(`   Tournaments: ${tournamentCount.rows[0].count}`);
        console.log(`   Teams: ${teamCount.rows[0].count}`);

        console.log('\n✅ Your PostgreSQL database is ready!');
        console.log('🚀 The Render deploy should complete soon and your site will use PostgreSQL!');

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        console.error('Full error:', error);
    } finally {
        await client.end();
    }
}

runMigration();