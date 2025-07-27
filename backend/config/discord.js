const DiscordStrategy = require('passport-discord').Strategy;
const { airtableService } = require('../services/airtable');
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
      
      // Check if user exists in Airtable
      let user = await airtableService.getUserByDiscordID(profile.id);
      
      if (user) {
        // Update existing user's last active time
        await airtableService.updateUser(user.UserID, {
          LastActive: new Date().toISOString(),
          DiscordUsername: `${profile.username}#${profile.discriminator}`,
          Email: profile.email
        });
        
        logger.info(`Existing user logged in: ${user.UserID}`);
      } else {
        // Create new user
        const newUser = {
          UserID: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          DiscordID: profile.id,
          DiscordUsername: `${profile.username}#${profile.discriminator}`,
          Email: profile.email,
          IsAdmin: false,
          CreatedAt: new Date().toISOString(),
          LastActive: new Date().toISOString()
        };
        
        user = await airtableService.createUser(newUser);
        logger.info(`New user created: ${user.UserID}`);
      }
      
      // Return user data for session
      return done(null, {
        userID: user.UserID,
        discordID: user.DiscordID,
        discordUsername: user.DiscordUsername,
        email: user.Email,
        isAdmin: user.IsAdmin,
        createdAt: user.CreatedAt,
        lastActive: user.LastActive
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
      const user = await airtableService.getUserByID(userID);
      if (user) {
        done(null, {
          userID: user.UserID,
          discordID: user.DiscordID,
          discordUsername: user.DiscordUsername,
          email: user.Email,
          isAdmin: user.IsAdmin,
          createdAt: user.CreatedAt,
          lastActive: user.LastActive
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