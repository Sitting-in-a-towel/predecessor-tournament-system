const express = require('express');
const multer = require('multer');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const postgresService = require('../services/postgresql');
const logger = require('../utils/logger');

const router = express.Router();

// Configure multer for file uploads
const upload = multer({ dest: 'uploads/' });

router.post('/restore', upload.single('backup'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No backup file provided' });
        }

        logger.info('🚨 STARTING DATABASE RESTORE FROM BACKUP');
        
        // Step 1: Drop entire schema and recreate
        logger.info('🗑️  Dropping entire schema...');
        await postgresService.query('DROP SCHEMA IF EXISTS public CASCADE;');
        await postgresService.query('CREATE SCHEMA public;');
        logger.info('✅ Dropped and recreated schema');

        // Step 2: Use pg_restore to restore the backup
        logger.info('🔄 Restoring from backup file...');
        
        const backupFilePath = req.file.path;
        const connectionString = process.env.DATABASE_URL || process.env.PRODUCTION_DATABASE_URL;
        
        return new Promise((resolve, reject) => {
            const pgRestore = spawn('pg_restore', [
                '--verbose',
                '--clean',
                '--no-acl',
                '--no-owner',
                '--dbname', connectionString,
                backupFilePath
            ]);

            let output = '';
            let error = '';

            pgRestore.stdout.on('data', (data) => {
                output += data.toString();
                logger.info(`pg_restore: ${data.toString().trim()}`);
            });

            pgRestore.stderr.on('data', (data) => {
                error += data.toString();
                logger.info(`pg_restore stderr: ${data.toString().trim()}`);
            });

            pgRestore.on('close', (code) => {
                // Clean up uploaded file
                fs.unlinkSync(backupFilePath);
                
                if (code === 0) {
                    logger.info('🎉 Database restore completed successfully!');
                    res.json({ 
                        success: true, 
                        message: 'Database restored from backup successfully',
                        output: output,
                        timestamp: new Date().toISOString()
                    });
                } else {
                    logger.error(`❌ pg_restore failed with code ${code}`);
                    res.status(500).json({ 
                        success: false, 
                        error: `Restore failed with code ${code}`,
                        output: output,
                        stderr: error,
                        timestamp: new Date().toISOString()
                    });
                }
            });
        });
        
    } catch (error) {
        logger.error('❌ Database restore failed:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

module.exports = router;