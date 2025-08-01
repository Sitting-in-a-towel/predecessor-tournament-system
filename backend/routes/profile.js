const express = require('express');
const router = express.Router();
const postgresService = require('../services/postgresql');
const { requireAuth } = require('../middleware/auth');

// Update Omeda.city player ID
router.post('/omeda/connect', requireAuth, async (req, res) => {
    try {
        const { playerId } = req.body;
        console.log('Connect request - User object:', req.user); // Debug log
        console.log('Connect request - Player ID from body:', playerId);
        const userId = req.user.id || req.user.userID;
        console.log('Connect request - Resolved User ID:', userId);

        if (!playerId || !playerId.trim()) {
            return res.status(400).json({ error: 'Player ID is required' });
        }

        if (!userId) {
            return res.status(400).json({ error: 'User ID not found' });
        }

        // Check if this player ID is already linked to another account
        const existingUser = await postgresService.query(
            'SELECT id, discord_username FROM users WHERE omeda_player_id = $1 AND id != $2',
            [playerId.trim(), userId]
        );

        if (existingUser.rows.length > 0) {
            return res.status(400).json({ 
                error: 'This Omeda.city player ID is already linked to another account. Please contact an admin if you believe this is an error.' 
            });
        }

        // Check if user already has a linked account
        const currentUser = await postgresService.query(
            'SELECT omeda_player_id FROM users WHERE id = $1',
            [userId]
        );

        if (currentUser.rows[0]?.omeda_player_id) {
            return res.status(400).json({ 
                error: 'You already have an Omeda.city account linked. Please contact an admin to change it.' 
            });
        }

        // Update user with Omeda.city player ID
        await postgresService.query(
            `UPDATE users 
             SET omeda_player_id = $1, 
                 omeda_last_sync = CURRENT_TIMESTAMP,
                 omeda_sync_enabled = true
             WHERE id = $2`,
            [playerId.trim(), userId]
        );

        res.json({ 
            message: 'Omeda.city account connected successfully',
            playerId: playerId.trim()
        });

    } catch (error) {
        console.error('Error connecting Omeda.city account:', error);
        res.status(500).json({ error: 'Failed to connect Omeda.city account' });
    }
});

// Disconnect Omeda.city account
router.post('/omeda/disconnect', requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;

        // Clear Omeda.city data
        await postgresService.query(
            `UPDATE users 
             SET omeda_player_id = NULL, 
                 omeda_profile_data = NULL,
                 omeda_last_sync = NULL,
                 omeda_sync_enabled = false
             WHERE id = $1`,
            [userId]
        );

        res.json({ message: 'Omeda.city account disconnected successfully' });

    } catch (error) {
        console.error('Error disconnecting Omeda.city account:', error);
        res.status(500).json({ error: 'Failed to disconnect Omeda.city account' });
    }
});

// Sync Omeda.city data
router.post('/omeda/sync', requireAuth, async (req, res) => {
    try {
        const userId = req.user.id || req.user.userID;

        // Get user's Omeda player ID
        const result = await postgresService.query(
            'SELECT omeda_player_id FROM users WHERE id = $1',
            [userId]
        );

        if (!result.rows.length || !result.rows[0].omeda_player_id) {
            return res.status(400).json({ error: 'No Omeda.city account connected' });
        }

        const playerId = result.rows[0].omeda_player_id;

        // TODO: In the future, fetch actual data from Omeda.city API
        // For now, just update the sync timestamp
        await postgresService.query(
            'UPDATE users SET omeda_last_sync = CURRENT_TIMESTAMP WHERE id = $1',
            [userId]
        );

        res.json({ 
            message: 'Profile synced with Omeda.city successfully',
            lastSync: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error syncing Omeda.city data:', error);
        res.status(500).json({ error: 'Failed to sync with Omeda.city' });
    }
});

// Get player statistics
router.get('/omeda/stats', requireAuth, async (req, res) => {
    try {
        const userId = req.user.id || req.user.userID;
        console.log('Stats request - User ID:', userId);
        console.log('Stats request - Full user object:', req.user);

        // Get user's Omeda player ID  
        const result = await postgresService.query(
            'SELECT omeda_player_id FROM users WHERE id = $1',
            [userId]
        );

        console.log('Database query result:', result.rows);

        if (!result.rows.length || !result.rows[0].omeda_player_id) {
            console.log('No Omeda player ID found for user:', userId);
            return res.status(400).json({ error: 'No Omeda.city account connected' });
        }

        const playerId = result.rows[0].omeda_player_id;
        console.log('Fetching stats for player UUID:', playerId);

        const axios = require('axios');
        
        // Fetch player statistics
        const statsResponse = await axios.get(`https://omeda.city/players/${playerId}/statistics.json`, {
            headers: {
                'Accept': 'application/json'
            }
        });

        // Fetch player info
        const playerResponse = await axios.get(`https://omeda.city/players/${playerId}.json`, {
            headers: {
                'Accept': 'application/json'
            }
        });

        // Fetch player hero statistics for favorite hero
        const heroStatsResponse = await axios.get(`https://omeda.city/players/${playerId}/hero_statistics.json`, {
            headers: {
                'Accept': 'application/json'
            }
        });

        // Get hero information to map hero names
        const heroesResponse = await axios.get('https://omeda.city/heroes.json', {
            headers: {
                'Accept': 'application/json'
            }
        });

        const stats = statsResponse.data;
        const playerInfo = playerResponse.data;
        const heroStats = heroStatsResponse.data;
        const heroes = heroesResponse.data;

        console.log('Player stats response:', JSON.stringify(stats, null, 2));
        console.log('Player info response:', JSON.stringify(playerInfo, null, 2));
        console.log('Hero stats response type:', typeof heroStats);
        console.log('Hero stats is array:', Array.isArray(heroStats));
        if (Array.isArray(heroStats)) {
            console.log('Hero stats response sample (first 2 heroes):', JSON.stringify(heroStats.slice(0, 2), null, 2));
        } else {
            console.log('Hero stats response (full):', JSON.stringify(heroStats, null, 2));
        }

        // Create hero map for lookups
        const heroMap = {};
        heroes.forEach(hero => {
            heroMap[hero.id] = hero;
        });

        // Extract favorite hero and role from stats response
        let favoriteHero = null;
        let favoriteRole = null;
        let avgCsMin = null;
        let avgGoldMin = null;
        
        // Check if favorite_hero is already in the stats response
        if (stats.favorite_hero) {
            favoriteHero = {
                name: stats.favorite_hero.display_name || stats.favorite_hero.name,
                image: stats.favorite_hero.image,
                matches: null, // Not provided in this response
                winrate: null   // Not provided in this response
            };
        }
        
        // Check if favorite_role is already in the stats response
        if (stats.favorite_role) {
            favoriteRole = {
                name: stats.favorite_role,
                matches: null // Not provided in this response
            };
        }

        // Calculate weighted averages from hero statistics
        if (Array.isArray(heroStats) && heroStats.length > 0) {
            let totalMatches = 0;
            let totalCsMinWeighted = 0;
            let totalGoldMinWeighted = 0;
            
            heroStats.forEach(heroStat => {
                if (heroStat.match_count > 0) {
                    totalMatches += heroStat.match_count;
                    if (heroStat.cs_min) {
                        totalCsMinWeighted += heroStat.cs_min * heroStat.match_count;
                    }
                    if (heroStat.gold_min) {
                        totalGoldMinWeighted += heroStat.gold_min * heroStat.match_count;
                    }
                }
            });
            
            if (totalMatches > 0) {
                avgCsMin = totalCsMinWeighted / totalMatches;
                avgGoldMin = totalGoldMinWeighted / totalMatches;
            }
        }

        // Add calculated averages to stats
        const enhancedStats = {
            ...stats,
            avg_cs_min: avgCsMin,
            avg_gold_min: avgGoldMin
        };

        res.json({ 
            stats: enhancedStats,
            player_name: playerInfo.display_name || 'Unknown',
            player_info: {
                region: playerInfo.region,
                rank_image: playerInfo.rank_image
            },
            favorite_hero: favoriteHero,
            favorite_role: favoriteRole
        });

    } catch (error) {
        console.error('Error fetching Omeda.city stats:', error);
        console.error('Error details:', error.response?.data || error.message);
        console.error('Error status:', error.response?.status);
        console.error('Error URL:', error.config?.url);
        
        if (error.response?.status === 404) {
            return res.status(404).json({ 
                error: 'Player statistics not found on Omeda.city',
                url: error.config?.url 
            });
        }
        
        res.status(500).json({ 
            error: 'Failed to fetch player statistics',
            details: error.response?.data || error.message,
            status: error.response?.status,
            url: error.config?.url
        });
    }
});

// Get recent matches for a player
router.get('/omeda/matches', requireAuth, async (req, res) => {
    try {
        const userId = req.user.id || req.user.userID;

        // Get user's Omeda player ID  
        const result = await postgresService.query(
            'SELECT omeda_player_id FROM users WHERE id = $1',
            [userId]
        );

        if (!result.rows.length || !result.rows[0].omeda_player_id) {
            return res.status(400).json({ error: 'No Omeda.city account connected' });
        }

        const playerId = result.rows[0].omeda_player_id;
        console.log('Fetching matches for player UUID:', playerId);

        // Fetch recent matches from Omeda.city API using player UUID
        const axios = require('axios');
        const matchesResponse = await axios.get(`https://omeda.city/players/${playerId}/matches.json`, {
            headers: {
                'Accept': 'application/json'
            },
            params: {
                per_page: 10, // Get last 10 matches
                time_frame: '1W' // Last week
            }
        });

        console.log('Match API response:', matchesResponse.data);
        const playerMatches = matchesResponse.data.matches || matchesResponse.data || [];
        console.log(`Found ${playerMatches.length} matches for player ${playerId}`);

        // Get hero information
        const heroesResponse = await axios.get('https://omeda.city/heroes.json', {
            headers: {
                'Accept': 'application/json'
            }
        });
        const heroes = heroesResponse.data;
        const heroMap = {};
        heroes.forEach(hero => {
            heroMap[hero.id] = hero;
        });

        // Get player info
        const playerResponse = await axios.get(`https://omeda.city/players/${playerId}.json`, {
            headers: {
                'Accept': 'application/json'
            }
        });
        const playerInfo = playerResponse.data;

        // Format matches for frontend
        const formattedMatches = playerMatches.map(match => {
            // Find the player's data in this match
            const playerData = match.players.find(p => p.id === playerId);
            
            if (!playerData) {
                console.error('Player not found in match:', match.id);
                return null;
            }
            
            return {
                id: match.id,
                start_time: match.start_time,
                game_duration: match.game_duration,
                game_mode: match.game_mode,
                winning_team: match.winning_team,
                player_team: playerData.team,
                won: playerData.is_winner,
                hero: heroMap[playerData.hero_id] ? {
                    name: heroMap[playerData.hero_id].display_name,
                    image: heroMap[playerData.hero_id].image
                } : null,
                stats: {
                    kills: playerData.kills,
                    deaths: playerData.deaths,
                    assists: playerData.assists,
                    minions_killed: playerData.minions_killed,
                    gold: playerData.gold_earned || 0,
                    damage_dealt: playerData.total_damage_dealt_to_heroes || 0,
                    damage_taken: playerData.total_damage_taken_from_heroes || 0
                }
            };
        }).filter(match => match !== null);

        res.json({ 
            matches: formattedMatches,
            player_name: playerInfo.display_name || 'Unknown'
        });

    } catch (error) {
        console.error('Error fetching Omeda.city matches:', error);
        console.error('Error details:', error.response?.data || error.message);
        
        if (error.response?.status === 404) {
            return res.status(404).json({ error: 'Player not found on Omeda.city' });
        }
        
        res.status(500).json({ 
            error: 'Failed to fetch match history',
            details: error.response?.data || error.message 
        });
    }
});

module.exports = router;