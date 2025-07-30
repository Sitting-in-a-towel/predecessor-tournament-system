const { Pool } = require('pg');
const logger = require('../utils/logger');

// Load environment variables from parent directory
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

class PostgreSQLService {
    constructor() {
        this.pool = new Pool({
            host: process.env.POSTGRES_HOST || 'localhost',
            port: parseInt(process.env.POSTGRES_PORT) || 5432,
            database: process.env.POSTGRES_DATABASE || 'predecessor_tournaments',
            user: process.env.POSTGRES_USER || 'postgres',
            password: String(process.env.POSTGRES_PASSWORD || ''),
            // Connection pool settings
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
        });

        // Test connection on startup
        this.testConnection();
    }

    async testConnection() {
        try {
            const client = await this.pool.connect();
            await client.query('SELECT NOW()');
            client.release();
            logger.info('✅ PostgreSQL connection successful');
        } catch (error) {
            logger.error('❌ PostgreSQL connection failed:', error.message);
            throw error;
        }
    }

    // Generic query method
    async query(text, params = []) {
        const start = Date.now();
        try {
            const result = await this.pool.query(text, params);
            const duration = Date.now() - start;
            logger.debug(`Query executed in ${duration}ms: ${text}`);
            return result;
        } catch (error) {
            logger.error('Database query error:', error);
            throw error;
        }
    }

    // Transaction support
    async transaction(callback) {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            const result = await callback(client);
            await client.query('COMMIT');
            return result;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    // User operations
    async createUser(userData) {
        const query = `
            INSERT INTO users (user_id, discord_id, discord_username, discord_discriminator, email, avatar_url, is_admin)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `;
        const values = [
            userData.user_id,
            userData.discord_id,
            userData.discord_username,
            userData.discord_discriminator,
            userData.email,
            userData.avatar_url,
            userData.is_admin || false
        ];
        const result = await this.query(query, values);
        return result.rows[0];
    }

    async getUserByDiscordId(discordId) {
        const query = 'SELECT * FROM users WHERE discord_id = $1';
        const result = await this.query(query, [discordId]);
        return result.rows[0];
    }

    async getUserById(userId) {
        const query = 'SELECT * FROM users WHERE user_id = $1';
        const result = await this.query(query, [userId]);
        return result.rows[0];
    }

    async updateUserLastActive(userId) {
        const query = 'UPDATE users SET last_active = CURRENT_TIMESTAMP WHERE user_id = $1';
        await this.query(query, [userId]);
    }

    // Tournament operations
    async createTournament(tournamentData) {
        const query = `
            INSERT INTO tournaments (tournament_id, name, description, bracket_type, game_format,
                                   quarter_final_format, semi_final_format, grand_final_format,
                                   max_teams, start_date, end_date, status, registration_open, created_by)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            RETURNING *
        `;
        const values = [
            tournamentData.tournament_id,
            tournamentData.name,
            tournamentData.description,
            tournamentData.bracket_type,
            tournamentData.game_format || 'Best of 1',
            tournamentData.quarter_final_format || tournamentData.game_format || 'Best of 1',
            tournamentData.semi_final_format || tournamentData.game_format || 'Best of 1',
            tournamentData.grand_final_format || tournamentData.game_format || 'Best of 1',
            tournamentData.max_teams,
            tournamentData.tournament_start || tournamentData.start_date,
            tournamentData.tournament_end || tournamentData.end_date || null,
            tournamentData.status || 'Registration',
            tournamentData.is_public !== false,
            tournamentData.created_by
        ];
        const result = await this.query(query, values);
        return result.rows[0];
    }

    async getTournaments(filters = {}) {
        let query = `
            SELECT t.*, u.discord_username as creator_username 
            FROM tournaments t 
            LEFT JOIN users u ON t.created_by = u.id
        `;
        const conditions = [];
        const values = [];

        if (filters.status) {
            conditions.push(`t.status = $${values.length + 1}`);
            values.push(filters.status);
        }

        if (filters.is_public !== undefined) {
            conditions.push(`t.is_public = $${values.length + 1}`);
            values.push(filters.is_public);
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        query += ' ORDER BY t.created_at DESC';

        const result = await this.query(query, values);
        return result.rows;
    }

    async getTournamentById(tournamentId) {
        const query = `
            SELECT t.*, u.discord_username as creator_username 
            FROM tournaments t 
            LEFT JOIN users u ON t.created_by = u.id 
            WHERE t.tournament_id = $1
        `;
        const result = await this.query(query, [tournamentId]);
        return result.rows[0];
    }

    // Team operations
    async createTeam(teamData) {
        const query = `
            INSERT INTO teams (team_id, team_name, team_tag, team_logo, tournament_id, captain_id, confirmed)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `;
        const values = [
            teamData.team_id,
            teamData.name || teamData.team_name,
            teamData.tag || teamData.team_tag || null,
            teamData.logo_url || teamData.team_logo || null,
            teamData.tournament_id || null, // Make tournament optional
            teamData.captain_id || teamData.created_by,
            true // Default to confirmed
        ];
        const result = await this.query(query, values);
        return result.rows[0];
    }

    async getTeamsByTournament(tournamentId) {
        const query = `
            SELECT t.*, u.discord_username as captain_username,
                   COUNT(tp.player_id) as player_count
            FROM teams t
            LEFT JOIN users u ON t.captain_id = u.id
            LEFT JOIN team_players tp ON t.id = tp.team_id AND tp.accepted = true
            WHERE t.tournament_id = (SELECT id FROM tournaments WHERE tournament_id = $1)
            GROUP BY t.id, u.discord_username
            ORDER BY t.created_at DESC
        `;
        const result = await this.query(query, [tournamentId]);
        return result.rows;
    }

    async getTeamsByUser(userId) {
        const query = `
            SELECT t.*, tour.name as tournament_name, tour.tournament_id as tournament_ref_id,
                   tp.role as player_role
            FROM teams t
            JOIN team_players tp ON t.id = tp.team_id
            LEFT JOIN tournaments tour ON t.tournament_id = tour.id
            JOIN users u ON tp.player_id = u.id
            WHERE u.user_id = $1 AND tp.accepted = true
            ORDER BY t.created_at DESC
        `;
        const result = await this.query(query, [userId]);
        return result.rows;
    }

    // Team player operations
    async addPlayerToTeam(teamId, userId, role = 'Player') {
        const query = `
            INSERT INTO team_players (team_id, player_id, role, joined_at, accepted)
            VALUES (
                (SELECT id FROM teams WHERE team_id = $1),
                (SELECT id FROM users WHERE user_id = $2),
                $3,
                CURRENT_TIMESTAMP,
                true
            )
            RETURNING *
        `;
        const result = await this.query(query, [teamId, userId, role]);
        return result.rows[0];
    }

    // Heroes operations
    async getHeroes() {
        const query = 'SELECT * FROM heroes ORDER BY name';
        const result = await this.query(query);
        return result.rows;
    }

    // Close connection pool
    async close() {
        await this.pool.end();
        logger.info('PostgreSQL connection pool closed');
    }
}

// Export singleton instance
const postgresService = new PostgreSQLService();
module.exports = postgresService;