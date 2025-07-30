const DiscordStrategy = require('passport-discord').Strategy;
// const postgresService = require('../services/postgresql'); // Disabled for production
const logger = require('../utils/logger');

module.exports = function(passport) {
  passport.use(new DiscordStrategy({
    clientID: process.env.DISCORD_CLIENT_ID,
    clientSecret: process.env.DISCORD_CLIENT_SECRET,
    callbackURL: process.env.DISCORD_REDIRECT_URI || "http://localhost:3001/api/auth/discord/callback",
    scope: ['identify', 'email'],
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      logger.info(`Discord OAuth callback for user: ${profile.username}#${profile.discriminator}`);
      
      // Check if user exists in PostgreSQL
      let user = await postgresService.getUserByDiscordId(profile.id);
      
      if (user) {
        // Update existing user's last active time
        await postgresService.updateUserLastActive(user.user_id);
        
        logger.info(`Existing user logged in: ${user.user_id}`);
      } else {
        // Create new user
        const newUser = {
          user_id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          discord_id: profile.id,
          discord_username: profile.username,
          discord_discriminator: profile.discriminator,
          email: profile.email,
          is_admin: false
        };
        
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
          lastActive: user.last_active
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