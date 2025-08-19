const { Pool } = require('pg');
const logger = require('../utils/logger');

// Load environment variables from parent directory
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

class PostgreSQLService {
    constructor() {
        // Use production database if USE_PRODUCTION_DB=true, otherwise use local
        const useProduction = process.env.USE_PRODUCTION_DB === 'true';
        
        const config = useProduction ? {
            connectionString: process.env.PRODUCTION_DATABASE_URL,
            ssl: { rejectUnauthorized: false },
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 10000,
            acquireTimeoutMillis: 10000,
        } : {
            host: process.env.POSTGRES_HOST || 'localhost',
            port: parseInt(process.env.POSTGRES_PORT) || 5432,
            database: process.env.POSTGRES_DATABASE || 'predecessor_tournaments',
            user: process.env.POSTGRES_USER || 'postgres',
            password: String(process.env.POSTGRES_PASSWORD || ''),
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 10000,
            acquireTimeoutMillis: 10000,
        };
        
        console.log(`🗄️  Using ${useProduction ? 'PRODUCTION' : 'LOCAL'} database`);
        if (useProduction) {
            console.log('   → Render PostgreSQL (production data)');
        } else {
            console.log('   → Local PostgreSQL (localhost)');
        }
        
        this.pool = new Pool(config);

        // Test connection on startup
        this.testConnection();
    }

    async testConnection(retries = 3) {
        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                logger.info(`Testing PostgreSQL connection (attempt ${attempt}/${retries})`);
                const client = await this.pool.connect();
                await client.query('SELECT NOW()');
                client.release();
                logger.info('✅ PostgreSQL connection successful');
                return;
            } catch (error) {
                logger.error(`❌ PostgreSQL connection failed (attempt ${attempt}/${retries}):`, error.message);
                
                if (attempt === retries) {
                    logger.error('Final attempt failed, but continuing with startup...');
                    // Don't throw - let the server start anyway for debugging
                    return;
                } else {
                    // Wait before retry
                    await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
                }
            }
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
        // First try using the tournament_teams junction table (production structure)
        try {
            const junctionQuery = `
                SELECT t.*, u.discord_username as captain_username,
                       COUNT(DISTINCT tp.player_id) as player_count,
                       tt.checked_in, tt.registration_date
                FROM tournament_teams tt
                JOIN teams t ON tt.team_id = t.team_id
                LEFT JOIN users u ON t.captain_id = u.id
                LEFT JOIN team_players tp ON t.team_id = tp.team_id
                WHERE tt.tournament_id = $1
                GROUP BY t.team_id, t.team_name, t.captain_id, t.created_at, t.max_team_size, 
                         u.discord_username, tt.checked_in, tt.registration_date
                ORDER BY t.created_at DESC
            `;
            const result = await this.query(junctionQuery, [tournamentId]);
            
            // If we got results, return them
            if (result.rows.length > 0) {
                return result.rows;
            }
        } catch (junctionError) {
            console.log('Junction table query failed, trying legacy structure:', junctionError.message);
        }
        
        // Fallback to legacy structure where teams have tournament_id directly
        const query = `
            SELECT t.*, u.discord_username as captain_username,
                   COUNT(CASE WHEN tp.role = 'player' THEN 1 END) + 1 as player_count
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

    async deleteTournament(tournamentId) {
        // Start a transaction to ensure all related data is deleted
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            
            // First delete all drafts related to this tournament
            await client.query('DELETE FROM drafts WHERE tournament_id = (SELECT id FROM tournaments WHERE tournament_id = $1)', [tournamentId]);
            
            // Delete all team_players entries for teams in this tournament
            await client.query('DELETE FROM team_players WHERE team_id IN (SELECT id FROM teams WHERE tournament_id = (SELECT id FROM tournaments WHERE tournament_id = $1))', [tournamentId]);
            
            // Delete all teams in this tournament
            await client.query('DELETE FROM teams WHERE tournament_id = (SELECT id FROM tournaments WHERE tournament_id = $1)', [tournamentId]);
            
            // Finally delete the tournament itself
            const result = await client.query('DELETE FROM tournaments WHERE tournament_id = $1 RETURNING *', [tournamentId]);
            
            await client.query('COMMIT');
            return result.rows[0];
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async getTeamsByUser(userId) {
        // Get teams where user is captain OR player
        const query = `
            SELECT DISTINCT t.*, 
                   tour.name as tournament_name, 
                   tour.tournament_id as tournament_ref_id,
                   CASE 
                     WHEN t.captain_id = u.id THEN 'captain'
                     ELSE COALESCE(tp.role, 'captain')
                   END as player_role,
                   (SELECT COUNT(*) FROM team_players tp2 WHERE tp2.team_id = t.id AND tp2.accepted = true AND tp2.role = 'player') + 1 as player_count
            FROM teams t
            LEFT JOIN team_players tp ON t.id = tp.team_id AND tp.accepted = true
            LEFT JOIN tournaments tour ON t.tournament_id = tour.id
            JOIN users u ON (u.user_id = $1 AND (t.captain_id = u.id OR tp.player_id = u.id))
            ORDER BY t.created_at DESC
        `;
        const result = await this.query(query, [userId]);
        return result.rows;
    }

    async getTeamById(teamId) {
        const query = `
            SELECT t.*, u.discord_username as captain_username
            FROM teams t
            LEFT JOIN users u ON t.captain_id = u.id
            WHERE t.team_id = $1
        `;
        const result = await this.query(query, [teamId]);
        return result.rows[0];
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

    // Team invitation operations
    async createTeamInvitation(invitationData) {
        // First, try to find the user by username or email
        let invitedUserId = null;
        if (invitationData.invited_discord_username || invitationData.invited_discord_email) {
            const userQuery = `
                SELECT id FROM users 
                WHERE discord_username = $1 OR email = $2 
                LIMIT 1
            `;
            const userResult = await this.query(userQuery, [
                invitationData.invited_discord_username || null,
                invitationData.invited_discord_email || null
            ]);
            if (userResult.rows.length > 0) {
                invitedUserId = userResult.rows[0].id;
            }
        }

        const query = `
            INSERT INTO team_invitations 
            (team_id, inviter_id, invited_discord_username, invited_discord_email, 
             invited_user_id, role, message, expires_at)
            VALUES 
            ((SELECT id FROM teams WHERE team_id = $1),
             (SELECT id FROM users WHERE user_id = $2),
             $3, $4, $5, $6, $7, $8)
            RETURNING *
        `;
        const values = [
            invitationData.team_id,
            invitationData.inviter_id,
            invitationData.invited_discord_username || null,
            invitationData.invited_discord_email || null,
            invitedUserId,
            invitationData.role || 'Player',
            invitationData.message || null,
            invitationData.expires_at || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days default
        ];
        const result = await this.query(query, values);
        return result.rows[0];
    }

    async getTeamInvitations(teamId) {
        const query = `
            SELECT ti.*, 
                   t.team_name,
                   inviter.discord_username as inviter_username,
                   invited.discord_username as invited_username,
                   invited.email as invited_email
            FROM team_invitations ti
            JOIN teams t ON ti.team_id = t.id
            JOIN users inviter ON ti.inviter_id = inviter.id
            LEFT JOIN users invited ON ti.invited_user_id = invited.id
            WHERE t.team_id = $1
            ORDER BY ti.created_at DESC
        `;
        const result = await this.query(query, [teamId]);
        return result.rows;
    }

    async getUserPendingInvitations(userId) {
        // First get the user's discord username and email
        const userQuery = `SELECT discord_username, email FROM users WHERE user_id = $1`;
        const userResult = await this.query(userQuery, [userId]);
        
        if (userResult.rows.length === 0) return [];
        
        const user = userResult.rows[0];
        
        // Find invitations by user_id OR by matching discord username/email
        const query = `
            SELECT ti.*, 
                   t.team_name, t.team_id,
                   inviter.discord_username as inviter_username
            FROM team_invitations ti
            JOIN teams t ON ti.team_id = t.id
            JOIN users inviter ON ti.inviter_id = inviter.id
            WHERE (ti.invited_user_id = (SELECT id FROM users WHERE user_id = $1)
                   OR (ti.invited_discord_username = $2 AND ti.invited_user_id IS NULL)
                   OR (ti.invited_discord_email = $3 AND ti.invited_user_id IS NULL))
            AND ti.status = 'pending'
            AND ti.expires_at > NOW()
            ORDER BY ti.created_at DESC
        `;
        const result = await this.query(query, [userId, user.discord_username, user.email]);
        return result.rows;
    }

    async respondToInvitation(invitationId, userId, response) {
        const query = `
            UPDATE team_invitations 
            SET status = $2, responded_at = NOW()
            WHERE id = $1 
            AND invited_user_id = (SELECT id FROM users WHERE user_id = $3)
            AND status = 'pending'
            AND expires_at > NOW()
            RETURNING *
        `;
        const result = await this.query(query, [invitationId, response, userId]);
        return result.rows[0];
    }

    async findUserByDiscordInfo(username, email) {
        const query = `
            SELECT * FROM users 
            WHERE discord_username = $1 OR email = $2 
            LIMIT 1
        `;
        const result = await this.query(query, [username, email]);
        return result.rows[0];
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