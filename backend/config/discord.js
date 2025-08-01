const DiscordStrategy = require('passport-discord').Strategy;
const postgresService = require('../services/postgresql');
const logger = require('../utils/logger');

module.exports = function(passport) {
  passport.use(new DiscordStrategy({
    clientID: process.env.DISCORD_CLIENT_ID,
    clientSecret: process.env.DISCORD_CLIENT_SECRET,
    callbackURL: process.env.DISCORD_REDIRECT_URI || "http://localhost:3001/api/auth/discord/callback",
    scope: ['identify', 'email'],
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      console.log(`[DEBUG] Discord OAuth callback for user: ${profile.username}#${profile.discriminator}`);
      console.log('[DEBUG] Discord profile data:', JSON.stringify(profile, null, 2));
      logger.info(`Discord OAuth callback for user: ${profile.username}#${profile.discriminator}`);
      logger.info('Discord profile data:', JSON.stringify(profile, null, 2));
      
      // Check if user exists in PostgreSQL
      logger.info('Checking for existing user with Discord ID:', profile.id);
      let user = await postgresService.getUserByDiscordId(profile.id);
      
      if (user) {
        // Update existing user's last active time
        logger.info('Found existing user:', user.user_id);
        await postgresService.updateUserLastActive(user.user_id);
        
        logger.info(`Existing user logged in: ${user.user_id}`);
      } else {
        // Create new user
        logger.info('Creating new user for Discord ID:', profile.id);
        const newUser = {
          user_id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          discord_id: profile.id,
          discord_username: profile.username,
          discord_discriminator: profile.discriminator,
          email: profile.email,
          avatar_url: profile.avatar ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png` : null,
          is_admin: false
        };
        
        logger.info('New user data:', JSON.stringify(newUser, null, 2));
        user = await postgresService.createUser(newUser);
        logger.info(`New user created: ${user.user_id}`);
      }
      
      // Return user data for session
      return done(null, {
        id: user.id,
        userID: user.user_id,
        discordID: user.discord_id,
        discordUsername: user.discord_username,
        email: user.email,
        isAdmin: user.is_admin,
        createdAt: user.created_at,
        lastActive: user.last_active
      });
      
    } catch (error) {
      console.error('[DEBUG] Discord OAuth error:', error);
      logger.error('Discord OAuth error:', error);
      return done(error, null);
    }
  }));

  passport.serializeUser((user, done) => {
    done(null, user.userID);
  });

  passport.deserializeUser(async (userID, done) => {
    try {
      const user = await postgresService.getUserById(userID);
      if (user) {
        done(null, {
          id: user.id,
          userID: user.user_id,
          discordID: user.discord_id,
          discordUsername: user.discord_username,
          email: user.email,
          isAdmin: user.is_admin,
          createdAt: user.created_at,
          lastActive: user.last_active,
          omeda_player_id: user.omeda_player_id,
          omeda_last_sync: user.omeda_last_sync,
          omeda_sync_enabled: user.omeda_sync_enabled
        });
      } else {
        done(null, false);
      }
    } catch (error) {
      logger.error('User deserialization error:', error);
      done(error, null);
    }
  });
};