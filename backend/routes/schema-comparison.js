const express = require('express');
const postgresService = require('../services/postgresql');
const logger = require('../utils/logger');
const fs = require('fs').promises;
const path = require('path');

const router = express.Router();

// Compare local vs production database schemas
router.get('/compare', async (req, res) => {
    try {
        logger.info('Starting schema comparison between local and production databases...');
        
        const comparison = {
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV || 'development',
            current_database: process.env.USE_PRODUCTION_DB === 'true' ? 'production' : 'local',
            results: {
                tables: { local: [], production: [], differences: [] },
                columns: { differences: [] },
                indexes: { differences: [] },
                constraints: { differences: [] }
            },
            recommendations: [],
            migration_required: false
        };

        // Get schema from current connection
        const currentSchema = await getCurrentSchema();
        
        // Save current schema to compare with other environment
        comparison.results.tables[comparison.current_database] = currentSchema.tables;
        
        // Check for critical table differences
        await checkCriticalTables(comparison, currentSchema);
        
        // Check column differences for critical tables
        await checkColumnDifferences(comparison, currentSchema);
        
        // Check indexes
        await checkIndexes(comparison, currentSchema);
        
        // Check foreign key constraints
        await checkConstraints(comparison, currentSchema);
        
        // Generate recommendations
        generateRecommendations(comparison);
        
        // Determine if migration is required
        comparison.migration_required = comparison.results.tables.differences.length > 0 ||
                                       comparison.results.columns.differences.length > 0;
        
        logger.info(`Schema comparison completed. Migration required: ${comparison.migration_required}`);
        res.json(comparison);
        
    } catch (error) {
        logger.error('Schema comparison failed:', error);
        res.status(500).json({
            error: 'Schema comparison failed',
            message: error.message
        });
    }
});

// Get detailed schema information
async function getCurrentSchema() {
    const schema = {
        tables: [],
        columns: {},
        indexes: {},
        constraints: {}
    };
    
    // Get all tables
    const tablesResult = await postgresService.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        ORDER BY table_name
    `);
    
    schema.tables = tablesResult.rows.map(row => row.table_name);
    
    // Get columns for each table
    for (const table of schema.tables) {
        const columnsResult = await postgresService.query(`
            SELECT 
                column_name,
                data_type,
                is_nullable,
                column_default,
                character_maximum_length,
                numeric_precision,
                numeric_scale
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = $1
            ORDER BY ordinal_position
        `, [table]);
        
        schema.columns[table] = columnsResult.rows;
    }
    
    // Get indexes
    const indexesResult = await postgresService.query(`
        SELECT 
            schemaname,
            tablename,
            indexname,
            indexdef
        FROM pg_indexes
        WHERE schemaname = 'public'
        ORDER BY tablename, indexname
    `);
    
    for (const index of indexesResult.rows) {
        if (!schema.indexes[index.tablename]) {
            schema.indexes[index.tablename] = [];
        }
        schema.indexes[index.tablename].push({
            name: index.indexname,
            definition: index.indexdef
        });
    }
    
    // Get foreign key constraints
    const constraintsResult = await postgresService.query(`
        SELECT
            tc.table_name,
            tc.constraint_name,
            tc.constraint_type,
            kcu.column_name,
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
        LEFT JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
            AND ccu.table_schema = tc.table_schema
        WHERE tc.table_schema = 'public'
        AND tc.constraint_type = 'FOREIGN KEY'
        ORDER BY tc.table_name, tc.constraint_name
    `);
    
    for (const constraint of constraintsResult.rows) {
        if (!schema.constraints[constraint.table_name]) {
            schema.constraints[constraint.table_name] = [];
        }
        schema.constraints[constraint.table_name].push({
            name: constraint.constraint_name,
            type: constraint.constraint_type,
            column: constraint.column_name,
            references: `${constraint.foreign_table_name}(${constraint.foreign_column_name})`
        });
    }
    
    return schema;
}

// Check for critical tables that must exist
async function checkCriticalTables(comparison, currentSchema) {
    const criticalTables = [
        'users',
        'tournaments',
        'teams',
        'tournament_registrations',
        'draft_sessions',
        'team_players',
        'team_invitations'
    ];
    
    const missingTables = criticalTables.filter(table => !currentSchema.tables.includes(table));
    const deprecatedTables = ['tournament_teams', 'airtable_sync', 'supabase_migrations'];
    const foundDeprecated = currentSchema.tables.filter(table => deprecatedTables.includes(table));
    
    if (missingTables.length > 0) {
        comparison.results.tables.differences.push({
            type: 'MISSING_CRITICAL_TABLES',
            tables: missingTables,
            severity: 'HIGH'
        });
    }
    
    if (foundDeprecated.length > 0) {
        comparison.results.tables.differences.push({
            type: 'DEPRECATED_TABLES_FOUND',
            tables: foundDeprecated,
            severity: 'MEDIUM'
        });
    }
}

// Check column differences for critical tables
async function checkColumnDifferences(comparison, currentSchema) {
    const criticalColumns = {
        'draft_sessions': ['id', 'draft_id', 'team1_id', 'team2_id', 'status', 'current_phase'],
        'tournaments': ['id', 'tournament_id', 'name', 'status', 'created_by'],
        'teams': ['id', 'team_id', 'team_name', 'captain_id'],
        'users': ['id', 'user_id', 'discord_id', 'discord_username']
    };
    
    for (const [table, requiredColumns] of Object.entries(criticalColumns)) {
        if (currentSchema.columns[table]) {
            const existingColumns = currentSchema.columns[table].map(col => col.column_name);
            const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));
            
            if (missingColumns.length > 0) {
                comparison.results.columns.differences.push({
                    table,
                    type: 'MISSING_COLUMNS',
                    columns: missingColumns,
                    severity: 'HIGH'
                });
            }
        }
    }
}

// Check indexes
async function checkIndexes(comparison, currentSchema) {
    const requiredIndexes = {
        'draft_sessions': ['draft_id'],
        'tournaments': ['tournament_id'],
        'teams': ['team_id'],
        'users': ['discord_id', 'user_id']
    };
    
    for (const [table, indexColumns] of Object.entries(requiredIndexes)) {
        if (currentSchema.indexes[table]) {
            const existingIndexColumns = currentSchema.indexes[table]
                .map(idx => idx.definition)
                .join(' ')
                .toLowerCase();
            
            const missingIndexes = indexColumns.filter(col => 
                !existingIndexColumns.includes(col.toLowerCase())
            );
            
            if (missingIndexes.length > 0) {
                comparison.results.indexes.differences.push({
                    table,
                    type: 'MISSING_INDEXES',
                    columns: missingIndexes,
                    severity: 'LOW'
                });
            }
        }
    }
}

// Check foreign key constraints
async function checkConstraints(comparison, currentSchema) {
    const requiredConstraints = {
        'tournament_registrations': {
            'tournament_id': 'tournaments(id)',
            'team_id': 'teams(id)'
        },
        'draft_sessions': {
            'team1_id': 'tournament_registrations(id)',
            'team2_id': 'tournament_registrations(id)'
        },
        'team_players': {
            'team_id': 'teams(id)',
            'player_id': 'users(id)'
        }
    };
    
    for (const [table, constraints] of Object.entries(requiredConstraints)) {
        if (currentSchema.constraints[table]) {
            const existingConstraints = currentSchema.constraints[table];
            
            for (const [column, reference] of Object.entries(constraints)) {
                const hasConstraint = existingConstraints.some(c => 
                    c.column === column && c.references === reference
                );
                
                if (!hasConstraint) {
                    comparison.results.constraints.differences.push({
                        table,
                        type: 'MISSING_CONSTRAINT',
                        column,
                        reference,
                        severity: 'MEDIUM'
                    });
                }
            }
        }
    }
}

// Generate recommendations based on differences
function generateRecommendations(comparison) {
    const recommendations = [];
    
    // Check for missing critical tables
    const missingTables = comparison.results.tables.differences
        .find(diff => diff.type === 'MISSING_CRITICAL_TABLES');
    
    if (missingTables) {
        recommendations.push({
            priority: 'CRITICAL',
            action: 'CREATE_TABLES',
            message: `Missing critical tables: ${missingTables.tables.join(', ')}. Run database migration immediately.`,
            command: 'npm run migrate:production'
        });
    }
    
    // Check for deprecated tables
    const deprecatedTables = comparison.results.tables.differences
        .find(diff => diff.type === 'DEPRECATED_TABLES_FOUND');
    
    if (deprecatedTables) {
        recommendations.push({
            priority: 'MEDIUM',
            action: 'REMOVE_DEPRECATED',
            message: `Deprecated tables found: ${deprecatedTables.tables.join(', ')}. These should be removed.`,
            command: `DROP TABLE IF EXISTS ${deprecatedTables.tables.join(', ')};`
        });
    }
    
    // Check for missing columns
    if (comparison.results.columns.differences.length > 0) {
        const criticalMissing = comparison.results.columns.differences
            .filter(diff => diff.severity === 'HIGH');
        
        if (criticalMissing.length > 0) {
            recommendations.push({
                priority: 'HIGH',
                action: 'ADD_COLUMNS',
                message: 'Critical columns missing from tables. Database schema update required.',
                tables: criticalMissing.map(diff => diff.table)
            });
        }
    }
    
    // Check for missing constraints
    if (comparison.results.constraints.differences.length > 0) {
        recommendations.push({
            priority: 'LOW',
            action: 'ADD_CONSTRAINTS',
            message: 'Some foreign key constraints are missing. This may affect data integrity.',
            count: comparison.results.constraints.differences.length
        });
    }
    
    comparison.recommendations = recommendations;
}

// Export current schema to file
router.get('/export', async (req, res) => {
    try {
        const schema = await getCurrentSchema();
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const environment = process.env.USE_PRODUCTION_DB === 'true' ? 'production' : 'local';
        
        const exportData = {
            timestamp,
            environment,
            database: process.env.USE_PRODUCTION_DB === 'true' ? 
                'Render PostgreSQL' : 'Local PostgreSQL',
            schema
        };
        
        const filename = `schema_${environment}_${timestamp}.json`;
        const filepath = path.join(__dirname, '../../backups', filename);
        
        // Ensure backups directory exists
        await fs.mkdir(path.dirname(filepath), { recursive: true });
        
        // Write schema to file
        await fs.writeFile(filepath, JSON.stringify(exportData, null, 2));
        
        logger.info(`Schema exported to ${filename}`);
        
        res.json({
            success: true,
            filename,
            path: filepath,
            environment,
            tableCount: schema.tables.length
        });
        
    } catch (error) {
        logger.error('Schema export failed:', error);
        res.status(500).json({
            error: 'Schema export failed',
            message: error.message
        });
    }
});

// Generate migration SQL based on differences
router.post('/generate-migration', async (req, res) => {
    try {
        const { sourceSchema, targetSchema } = req.body;
        
        if (!sourceSchema || !targetSchema) {
            return res.status(400).json({ 
                error: 'Both source and target schemas are required' 
            });
        }
        
        const migrationSQL = [];
        
        // Generate CREATE TABLE statements for missing tables
        const missingTables = targetSchema.tables.filter(table => 
            !sourceSchema.tables.includes(table)
        );
        
        for (const table of missingTables) {
            if (targetSchema.columns[table]) {
                const columns = targetSchema.columns[table];
                const columnDefs = columns.map(col => {
                    let def = `${col.column_name} ${col.data_type}`;
                    if (col.character_maximum_length) {
                        def += `(${col.character_maximum_length})`;
                    }
                    if (col.is_nullable === 'NO') {
                        def += ' NOT NULL';
                    }
                    if (col.column_default) {
                        def += ` DEFAULT ${col.column_default}`;
                    }
                    return def;
                }).join(',\n    ');
                
                migrationSQL.push(`CREATE TABLE IF NOT EXISTS ${table} (\n    ${columnDefs}\n);`);
            }
        }
        
        // Generate ALTER TABLE statements for missing columns
        for (const table of sourceSchema.tables) {
            if (targetSchema.columns[table] && sourceSchema.columns[table]) {
                const sourceColumns = sourceSchema.columns[table].map(c => c.column_name);
                const targetColumns = targetSchema.columns[table];
                
                const missingColumns = targetColumns.filter(col => 
                    !sourceColumns.includes(col.column_name)
                );
                
                for (const col of missingColumns) {
                    let alterSQL = `ALTER TABLE ${table} ADD COLUMN ${col.column_name} ${col.data_type}`;
                    if (col.character_maximum_length) {
                        alterSQL += `(${col.character_maximum_length})`;
                    }
                    if (col.column_default) {
                        alterSQL += ` DEFAULT ${col.column_default}`;
                    }
                    migrationSQL.push(alterSQL + ';');
                }
            }
        }
        
        // Generate DROP TABLE statements for deprecated tables
        const deprecatedTables = sourceSchema.tables.filter(table => 
            !targetSchema.tables.includes(table) && 
            ['tournament_teams', 'airtable_sync'].includes(table)
        );
        
        for (const table of deprecatedTables) {
            migrationSQL.push(`DROP TABLE IF EXISTS ${table} CASCADE;`);
        }
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `migration_${timestamp}.sql`;
        const filepath = path.join(__dirname, '../../migrations', filename);
        
        // Ensure migrations directory exists
        await fs.mkdir(path.dirname(filepath), { recursive: true });
        
        // Write migration SQL to file
        await fs.writeFile(filepath, migrationSQL.join('\n\n'));
        
        res.json({
            success: true,
            filename,
            path: filepath,
            statements: migrationSQL.length,
            migration: migrationSQL
        });
        
    } catch (error) {
        logger.error('Migration generation failed:', error);
        res.status(500).json({
            error: 'Migration generation failed',
            message: error.message
        });
    }
});

// Quick schema health check
router.get('/health', async (req, res) => {
    try {
        const health = {
            timestamp: new Date().toISOString(),
            database: process.env.USE_PRODUCTION_DB === 'true' ? 'production' : 'local',
            status: 'checking',
            issues: []
        };
        
        // Quick check for critical tables
        const criticalTables = [
            'users', 'tournaments', 'teams', 
            'tournament_registrations', 'draft_sessions'
        ];
        
        for (const table of criticalTables) {
            const result = await postgresService.query(`
                SELECT COUNT(*) as count 
                FROM information_schema.tables 
                WHERE table_name = $1
            `, [table]);
            
            if (result.rows[0].count === '0') {
                health.issues.push(`Missing critical table: ${table}`);
            }
        }
        
        // Check for deprecated tables
        const deprecatedTables = ['tournament_teams', 'airtable_sync'];
        for (const table of deprecatedTables) {
            const result = await postgresService.query(`
                SELECT COUNT(*) as count 
                FROM information_schema.tables 
                WHERE table_name = $1
            `, [table]);
            
            if (result.rows[0].count !== '0') {
                health.issues.push(`Deprecated table still exists: ${table}`);
            }
        }
        
        health.status = health.issues.length === 0 ? 'healthy' : 'issues_found';
        
        res.json(health);
        
    } catch (error) {
        logger.error('Schema health check failed:', error);
        res.status(500).json({
            status: 'error',
            error: error.message
        });
    }
});

module.exports = router;