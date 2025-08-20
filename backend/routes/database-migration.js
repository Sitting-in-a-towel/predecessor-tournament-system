const express = require('express');
const fs = require('fs');
const path = require('path');
const postgresService = require('../services/postgresql');
const logger = require('../utils/logger');

const router = express.Router();

// DANGER: This endpoint completely replaces the production database
router.post('/replace-with-local', async (req, res) => {
    try {
        logger.info('🚨 STARTING COMPLETE DATABASE REPLACEMENT');
        
        // Step 1: Drop all tables
        logger.info('🗑️  Dropping all tables...');
        const dropScript = fs.readFileSync(path.join(__dirname, '..', '..', 'drop_all_tables.sql'), 'utf8');
        await postgresService.query(dropScript);
        logger.info('✅ Dropped all tables');

        // Step 2: Create schema
        logger.info('🏗️  Creating schema...');
        const schemaScript = fs.readFileSync(path.join(__dirname, '..', '..', 'local_schema.sql'), 'utf8');
        await postgresService.query(schemaScript);
        logger.info('✅ Created schema');

        // Step 3: Load data
        logger.info('📊 Loading data...');
        const dataScript = fs.readFileSync(path.join(__dirname, '..', '..', 'local_data.sql'), 'utf8');
        await postgresService.query(dataScript);
        logger.info('✅ Loaded data');

        logger.info('🎉 Database replacement completed successfully!');
        res.json({ 
            success: true, 
            message: 'Production database has been completely replaced with local database',
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        logger.error('❌ Database replacement failed:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

module.exports = router;