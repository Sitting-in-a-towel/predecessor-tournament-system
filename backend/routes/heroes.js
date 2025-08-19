const express = require('express');
const axios = require('axios');
const logger = require('../utils/logger');

const router = express.Router();

// Cache for heroes data (refresh every hour)
let heroesCache = {
  data: null,
  lastFetch: null,
  ttl: 60 * 60 * 1000 // 1 hour in milliseconds
};

// Get heroes data (with caching)
router.get('/', async (req, res) => {
  try {
    const now = Date.now();
    
    // Check if we have valid cached data
    if (heroesCache.data && heroesCache.lastFetch && (now - heroesCache.lastFetch) < heroesCache.ttl) {
      logger.info('Serving heroes from cache');
      return res.json(heroesCache.data);
    }
    
    logger.info('Fetching heroes from Omeda.city API');
    
    // Fetch from Omeda.city API
    const response = await axios.get('https://omeda.city/heroes.json', {
      timeout: 10000 // 10 second timeout
    });
    
    const heroesData = response.data;
    
    // Transform to our format
    const transformedHeroes = heroesData.map(hero => ({
      id: hero.name.toLowerCase(), // Use internal name as ID
      name: hero.display_name || hero.name,
      role: hero.roles?.[0] || 'Unknown', // Use first role
      image: `https://omeda.city${hero.image}`, // Full image URL
      omedaId: hero.id,
      classes: hero.classes || [],
      roles: hero.roles || []
    }));
    
    // Update cache
    heroesCache.data = transformedHeroes;
    heroesCache.lastFetch = now;
    
    logger.info(`Successfully fetched and transformed ${transformedHeroes.length} heroes`);
    
    res.json(transformedHeroes);
    
  } catch (error) {
    logger.error('Error fetching heroes data:', error);
    
    // If we have stale cached data, serve it
    if (heroesCache.data) {
      logger.info('Serving stale cached heroes data due to API error');
      return res.json(heroesCache.data);
    }
    
    // Otherwise return fallback data
    const fallbackHeroes = [
      { id: 'grux', name: 'Grux', role: 'Offlane', image: '/assets/images/heroes/grux.jpg' },
      { id: 'kwang', name: 'Kwang', role: 'Offlane', image: '/assets/images/heroes/kwang.jpg' },
      { id: 'countess', name: 'Countess', role: 'Midlane', image: '/assets/images/heroes/countess.jpg' },
      { id: 'aurora', name: 'Aurora', role: 'Offlane', image: '/assets/images/heroes/aurora.jpg' },
      { id: 'crunch', name: 'Crunch', role: 'Offlane', image: '/assets/images/heroes/crunch.jpg' }
    ];
    
    logger.info(`Serving ${fallbackHeroes.length} fallback heroes due to API failure`);
    
    res.json(fallbackHeroes);
  }
});

// Clear heroes cache (admin only)
router.delete('/cache', async (req, res) => {
  try {
    heroesCache.data = null;
    heroesCache.lastFetch = null;
    
    logger.info('Heroes cache cleared');
    res.json({ message: 'Heroes cache cleared successfully' });
    
  } catch (error) {
    logger.error('Error clearing heroes cache:', error);
    res.status(500).json({ error: 'Failed to clear heroes cache' });
  }
});

module.exports = router;