const express = require('express');
const postgresService = require('../services/postgresql');
const logger = require('../utils/logger');

const router = express.Router();

// Emergency endpoint to check what's happening with drafts in production
router.get('/production-status', async (req, res) => {
    try {
        const status = {
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV,
            database_url_present: !!process.env.DATABASE_URL,
            checks: []
        };

        // 1. Check if we can connect to database
        try {
            await postgresService.query('SELECT NOW()');
            status.checks.push({ test: 'Database Connection', result: 'SUCCESS' });
        } catch (error) {
            status.checks.push({ test: 'Database Connection', result: 'FAILED', error: error.message });
            return res.json(status);
        }

        // 2. Check if draft_sessions table exists  
        try {
            const tableCheck = await postgresService.query(`
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = 'draft_sessions'
                ORDER BY ordinal_position
            `);
            
            if (tableCheck.rows.length > 0) {
                status.checks.push({ 
                    test: 'Draft Sessions Table', 
                    result: 'EXISTS', 
                    columns: tableCheck.rows.length,
                    structure: tableCheck.rows
                });
            } else {
                status.checks.push({ test: 'Draft Sessions Table', result: 'MISSING' });
            }
        } catch (error) {
            status.checks.push({ test: 'Draft Sessions Table', result: 'ERROR', error: error.message });
        }

        // 3. Check recent draft sessions
        try {
            const drafts = await postgresService.query(`
                SELECT draft_id, status, current_phase, created_at 
                FROM draft_sessions 
                ORDER BY created_at DESC 
                LIMIT 5
            `);
            
            status.checks.push({ 
                test: 'Recent Drafts', 
                result: 'SUCCESS', 
                count: drafts.rows.length,
                drafts: drafts.rows
            });
        } catch (error) {
            status.checks.push({ test: 'Recent Drafts', result: 'ERROR', error: error.message });
        }

        // 4. Check specific draft if provided
        if (req.query.draft_id) {
            try {
                const specific = await postgresService.query(`
                    SELECT * FROM draft_sessions WHERE draft_id = $1
                `, [req.query.draft_id]);
                
                status.checks.push({ 
                    test: `Specific Draft: ${req.query.draft_id}`, 
                    result: specific.rows.length > 0 ? 'FOUND' : 'NOT_FOUND',
                    data: specific.rows[0] || null
                });
            } catch (error) {
                status.checks.push({ 
                    test: `Specific Draft: ${req.query.draft_id}`, 
                    result: 'ERROR', 
                    error: error.message 
                });
            }
        }

        res.json(status);
        
    } catch (error) {
        logger.error('Emergency status check failed:', error);
        res.status(500).json({ error: error.message });
    }
});

// Emergency fix to create missing draft_sessions table
router.post('/create-draft-table', async (req, res) => {
    try {
        logger.info('Creating draft_sessions table...');
        
        await postgresService.query(`
            CREATE TABLE IF NOT EXISTS draft_sessions (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                draft_id VARCHAR(255) UNIQUE NOT NULL,
                team1_id UUID,
                team2_id UUID,
                team1_captain_id VARCHAR(255),
                team2_captain_id VARCHAR(255),
                status VARCHAR(50) DEFAULT 'Waiting',
                current_phase VARCHAR(50) DEFAULT 'Coin Toss',
                current_turn VARCHAR(10),
                team1_connected BOOLEAN DEFAULT FALSE,
                team2_connected BOOLEAN DEFAULT FALSE,
                both_teams_connected_at TIMESTAMP,
                coin_choices_enabled_at TIMESTAMP,
                team1_coin_choice VARCHAR(10),
                team2_coin_choice VARCHAR(10),
                coin_toss_result VARCHAR(10),
                coin_toss_winner VARCHAR(10),
                first_pick VARCHAR(10),
                pick_order JSONB DEFAULT '[]'::jsonb,
                ban_order JSONB DEFAULT '[]'::jsonb,
                team1_picks JSONB DEFAULT '[]'::jsonb,
                team2_picks JSONB DEFAULT '[]'::jsonb,
                team1_bans JSONB DEFAULT '[]'::jsonb,
                team2_bans JSONB DEFAULT '[]'::jsonb,
                timer_config JSONB,
                created_by UUID,
                start_time TIMESTAMP,
                end_time TIMESTAMP,
                stopped_at TIMESTAMP,
                stopped_by UUID,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        `);
        
        res.json({ success: true, message: 'Draft sessions table created successfully' });
        
    } catch (error) {
        logger.error('Failed to create draft table:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Emergency endpoint to test creating a simple draft
router.post('/test-draft', async (req, res) => {
    try {
        const testDraftId = `test_draft_${Date.now()}`;
        
        await postgresService.query(`
            INSERT INTO draft_sessions (draft_id, status, current_phase)
            VALUES ($1, 'Waiting', 'Coin Toss')
        `, [testDraftId]);
        
        res.json({ 
            success: true, 
            message: 'Test draft created successfully',
            draft_id: testDraftId,
            url: `https://predecessor-tournament-api.onrender.com/draft/${testDraftId}`
        });
        
    } catch (error) {
        logger.error('Failed to create test draft:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;