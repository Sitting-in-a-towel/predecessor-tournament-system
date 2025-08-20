const express = require('express');
const fs = require('fs');
const path = require('path');
const postgresService = require('../services/postgresql');
const logger = require('../utils/logger');

const router = express.Router();

router.post('/import-data-only', async (req, res) => {
    try {
        logger.info('📊 IMPORTING DATA ONLY...');
        
        // Try to import just the data
        const dataScript = fs.readFileSync(path.join(__dirname, '..', '..', 'local_data_inserts.sql'), 'utf8');
        await postgresService.query(dataScript);
        logger.info('✅ Data imported successfully');

        res.json({ 
            success: true, 
            message: 'Data imported successfully',
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        logger.error('❌ Data import failed:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

module.exports = router;