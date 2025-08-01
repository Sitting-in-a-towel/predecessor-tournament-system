const postgresService = require('../services/postgresql');

async function setupTournamentRegistrationTables() {
    try {
        console.log('Setting up tournament registration tables...');
        
        // Create tournament_registrations table
        await postgresService.query(`
            CREATE TABLE IF NOT EXISTS tournament_registrations (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
                team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
                registered_by UUID NOT NULL REFERENCES users(id),
                registration_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                status VARCHAR(50) DEFAULT 'registered',
                checked_in BOOLEAN DEFAULT false,
                check_in_time TIMESTAMP WITH TIME ZONE,
                UNIQUE(tournament_id, team_id)
            )
        `);
        console.log('✅ Created tournament_registrations table');
        
        // Create indexes
        await postgresService.query(`
            CREATE INDEX IF NOT EXISTS idx_tournament_registrations_tournament ON tournament_registrations(tournament_id)
        `);
        console.log('✅ Created tournament index');
        
        await postgresService.query(`
            CREATE INDEX IF NOT EXISTS idx_tournament_registrations_team ON tournament_registrations(team_id)
        `);
        console.log('✅ Created team index');
        
        // Add comments for documentation
        await postgresService.query(`
            COMMENT ON TABLE tournament_registrations IS 'Stores team registrations for tournaments'
        `);
        await postgresService.query(`
            COMMENT ON COLUMN tournament_registrations.status IS 'Registration status: registered, confirmed, disqualified'
        `);
        await postgresService.query(`
            COMMENT ON COLUMN tournament_registrations.checked_in IS 'Whether team has checked in for tournament'
        `);
        
        console.log('🎉 Tournament registration tables setup completed successfully!');
        
    } catch (error) {
        console.error('❌ Setup failed:', error);
    } finally {
        await postgresService.close();
    }
}

setupTournamentRegistrationTables();