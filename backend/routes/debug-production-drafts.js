const express = require('express');
const postgresService = require('../services/postgresql');
const logger = require('../utils/logger');

const router = express.Router();

// Debug endpoint to check production draft issues
router.get('/check-draft-system', async (req, res) => {
    try {
        logger.info('Debugging production draft system...');
        
        const debug = {
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV || 'development',
            database_config: {
                using_production: process.env.USE_PRODUCTION_DB === 'true',
                database_url_exists: !!process.env.DATABASE_URL
            },
            checks: []
        };

        // 1. Check database connection
        try {
            const connectionTest = await postgresService.query('SELECT NOW() as current_time');
            debug.checks.push({
                test: 'Database Connection',
                status: 'PASS',
                details: `Connected successfully. Server time: ${connectionTest.rows[0].current_time}`
            });
        } catch (error) {
            debug.checks.push({
                test: 'Database Connection',
                status: 'FAIL',
                error: error.message
            });
        }

        // 2. Check if draft_sessions table exists
        try {
            const tableCheck = await postgresService.query(`
                SELECT table_name, column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = 'draft_sessions' 
                ORDER BY ordinal_position
            `);
            
            if (tableCheck.rows.length > 0) {
                debug.checks.push({
                    test: 'Draft Sessions Table',
                    status: 'PASS',
                    details: `Table exists with ${tableCheck.rows.length} columns`,
                    columns: tableCheck.rows.map(row => `${row.column_name} (${row.data_type})`)
                });
            } else {
                debug.checks.push({
                    test: 'Draft Sessions Table',
                    status: 'FAIL',
                    error: 'Table does not exist'
                });
            }
        } catch (error) {
            debug.checks.push({
                test: 'Draft Sessions Table',
                status: 'FAIL',
                error: error.message
            });
        }

        // 3. Check recent draft sessions
        try {
            const recentDrafts = await postgresService.query(`
                SELECT 
                    id, session_id, tournament_id, team1_id, team2_id, 
                    status, created_at, current_phase
                FROM draft_sessions 
                ORDER BY created_at DESC 
                LIMIT 5
            `);
            
            debug.checks.push({
                test: 'Recent Draft Sessions',
                status: 'PASS',
                details: `Found ${recentDrafts.rows.length} recent draft sessions`,
                drafts: recentDrafts.rows
            });
        } catch (error) {
            debug.checks.push({
                test: 'Recent Draft Sessions',
                status: 'FAIL',
                error: error.message
            });
        }

        // 4. Check tournaments table
        try {
            const tournaments = await postgresService.query(`
                SELECT id, name, status, created_at 
                FROM tournaments 
                ORDER BY created_at DESC 
                LIMIT 3
            `);
            
            debug.checks.push({
                test: 'Tournaments Table',
                status: 'PASS',
                details: `Found ${tournaments.rows.length} tournaments`,
                tournaments: tournaments.rows
            });
        } catch (error) {
            debug.checks.push({
                test: 'Tournaments Table',
                status: 'FAIL',
                error: error.message
            });
        }

        // 5. Check Phoenix draft route accessibility
        try {
            // We can't directly test Phoenix from here, but we can check if the data exists
            // that Phoenix would need
            const phoenixDataCheck = await postgresService.query(`
                SELECT 
                    ds.session_id,
                    ds.status,
                    t.name as tournament_name,
                    t1.team_name as team1_name,
                    t2.team_name as team2_name
                FROM draft_sessions ds
                LEFT JOIN tournaments t ON ds.tournament_id = t.id
                LEFT JOIN teams t1 ON ds.team1_id = t1.id
                LEFT JOIN teams t2 ON ds.team2_id = t2.id
                WHERE ds.status != 'completed'
                ORDER BY ds.created_at DESC
                LIMIT 5
            `);
            
            debug.checks.push({
                test: 'Phoenix Data Requirements',
                status: 'PASS',
                details: `Found ${phoenixDataCheck.rows.length} active draft sessions with complete data`,
                active_drafts: phoenixDataCheck.rows
            });
        } catch (error) {
            debug.checks.push({
                test: 'Phoenix Data Requirements',
                status: 'FAIL',
                error: error.message
            });
        }

        // 6. Check specific draft session by ID if provided
        const sessionId = req.query.session_id;
        if (sessionId) {
            try {
                const specificDraft = await postgresService.query(`
                    SELECT 
                        ds.*,
                        t.name as tournament_name,
                        t1.team_name as team1_name,
                        t2.team_name as team2_name
                    FROM draft_sessions ds
                    LEFT JOIN tournaments t ON ds.tournament_id = t.id
                    LEFT JOIN teams t1 ON ds.team1_id = t1.id
                    LEFT JOIN teams t2 ON ds.team2_id = t2.id
                    WHERE ds.session_id = $1
                `, [sessionId]);
                
                if (specificDraft.rows.length > 0) {
                    debug.checks.push({
                        test: `Specific Draft Session: ${sessionId}`,
                        status: 'PASS',
                        details: 'Draft session found in database',
                        draft_data: specificDraft.rows[0]
                    });
                } else {
                    debug.checks.push({
                        test: `Specific Draft Session: ${sessionId}`,
                        status: 'FAIL',
                        error: 'Draft session not found in database'
                    });
                }
            } catch (error) {
                debug.checks.push({
                    test: `Specific Draft Session: ${sessionId}`,
                    status: 'FAIL',
                    error: error.message
                });
            }
        }

        // Summary
        const passed = debug.checks.filter(c => c.status === 'PASS').length;
        const failed = debug.checks.filter(c => c.status === 'FAIL').length;
        
        debug.summary = {
            total_checks: debug.checks.length,
            passed,
            failed,
            overall_status: failed === 0 ? 'HEALTHY' : 'ISSUES_FOUND'
        };

        logger.info(`Production draft debug completed: ${passed}/${debug.checks.length} checks passed`);
        
        res.json(debug);
        
    } catch (error) {
        logger.error('Production draft debug failed:', error);
        res.status(500).json({
            error: 'Debug check failed',
            message: error.message
        });
    }
});

// Quick fix endpoint to create missing draft sessions table if needed
router.post('/fix-draft-table', async (req, res) => {
    try {
        logger.info('Attempting to fix draft sessions table...');
        
        // Check if table exists first
        const tableExists = await postgresService.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_name = 'draft_sessions'
        `);
        
        if (tableExists.rows.length === 0) {
            // Create the table
            await postgresService.query(`
                CREATE TABLE IF NOT EXISTS draft_sessions (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    session_id VARCHAR(255) UNIQUE NOT NULL,
                    tournament_id UUID REFERENCES tournaments(id),
                    team1_id UUID REFERENCES teams(id),
                    team2_id UUID REFERENCES teams(id),
                    status VARCHAR(50) DEFAULT 'waiting',
                    current_phase VARCHAR(50) DEFAULT 'coin_toss',
                    current_team VARCHAR(10),
                    timer_remaining INTEGER DEFAULT 30,
                    pick_order JSONB,
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW()
                )
            `);
            
            res.json({
                success: true,
                message: 'Draft sessions table created successfully'
            });
        } else {
            res.json({
                success: true,
                message: 'Draft sessions table already exists'
            });
        }
        
    } catch (error) {
        logger.error('Failed to fix draft table:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;