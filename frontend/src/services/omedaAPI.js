import axios from 'axios';

const OMEDA_API_BASE = process.env.REACT_APP_OMEDA_API_URL || 'https://omeda.city/api';

class OmedaAPIService {
  constructor() {
    this.axios = axios.create({
      baseURL: OMEDA_API_BASE,
      timeout: 10000,
    });

    // Add response interceptor for error handling
    this.axios.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error('Omeda API Error:', error);
        // Fallback to cached data or default values if API fails
        return Promise.reject(error);
      }
    );
  }

  // Hero data services
  async getHeroes() {
    try {
      const response = await this.axios.get('/heroes');
      return response.data;
    } catch (error) {
      console.warn('Failed to fetch heroes from Omeda API, using fallback data');
      return this.getFallbackHeroes();
    }
  }

  async getHero(heroId) {
    try {
      const response = await this.axios.get(`/heroes/${heroId}`);
      return response.data;
    } catch (error) {
      console.warn(`Failed to fetch hero ${heroId} from Omeda API`);
      return null;
    }
  }

  async getHeroStats(heroId) {
    try {
      const response = await this.axios.get(`/heroes/${heroId}/stats`);
      return response.data;
    } catch (error) {
      console.warn(`Failed to fetch hero stats for ${heroId}`);
      return null;
    }
  }

  // Player data services (if available)
  async getPlayerData(playerId) {
    try {
      const response = await this.axios.get(`/players/${playerId}`);
      return response.data;
    } catch (error) {
      console.warn(`Failed to fetch player data for ${playerId}`);
      return null;
    }
  }

  async searchPlayers(searchTerm) {
    try {
      const response = await this.axios.get(`/players/search?q=${encodeURIComponent(searchTerm)}`);
      return response.data;
    } catch (error) {
      console.warn('Failed to search players');
      return [];
    }
  }

  // Game data services
  async getGameVersion() {
    try {
      const response = await this.axios.get('/version');
      return response.data;
    } catch (error) {
      console.warn('Failed to get game version');
      return { version: 'Unknown' };
    }
  }

  async getMatchHistory(playerId, limit = 10) {
    try {
      const response = await this.axios.get(`/players/${playerId}/matches?limit=${limit}`);
      return response.data;
    } catch (error) {
      console.warn(`Failed to fetch match history for ${playerId}`);
      return [];
    }
  }

  // Fallback data for when API is unavailable
  getFallbackHeroes() {
    return [
      { id: 'countess', name: 'Countess', role: 'Midlane', image: null },
      { id: 'grux', name: 'Grux', role: 'Jungle', image: null },
      { id: 'sparrow', name: 'Sparrow', role: 'Carry', image: null },
      { id: 'dekker', name: 'Dekker', role: 'Support', image: null },
      { id: 'steel', name: 'Steel', role: 'Offlane', image: null },
      { id: 'muriel', name: 'Muriel', role: 'Support', image: null },
      { id: 'gideon', name: 'Gideon', role: 'Midlane', image: null },
      { id: 'rampage', name: 'Rampage', role: 'Jungle', image: null },
      { id: 'twinblast', name: 'Twinblast', role: 'Carry', image: null },
      { id: 'gadget', name: 'Gadget', role: 'Midlane', image: null },
      { id: 'howitzer', name: 'Howitzer', role: 'Midlane', image: null },
      { id: 'sevarog', name: 'Sevarog', role: 'Jungle', image: null },
      { id: 'belica', name: 'Belica', role: 'Midlane', image: null },
      { id: 'khaimera', name: 'Khaimera', role: 'Jungle', image: null },
      { id: 'narbash', name: 'Narbash', role: 'Support', image: null },
      { id: 'kwang', name: 'Kwang', role: 'Offlane', image: null },
      { id: 'yin', name: 'Yin', role: 'Carry', image: null },
      { id: 'riktor', name: 'Riktor', role: 'Support', image: null },
      { id: 'fengmao', name: 'Feng Mao', role: 'Offlane', image: null },
      { id: 'murdock', name: 'Murdock', role: 'Carry', image: null }
    ];
  }

  // Utility methods
  getHeroImageUrl(heroId) {
    // This would need to be implemented based on Omeda's actual image URLs
    return `${OMEDA_API_BASE}/heroes/${heroId}/image`;
  }

  getRoleColor(role) {
    const roleColors = {
      'Carry': '#ff6b6b',
      'Support': '#4ecdc4',
      'Midlane': '#45b7d1',
      'Offlane': '#f39c12',
      'Jungle': '#9b59b6'
    };
    return roleColors[role] || '#95a5a6';
  }

  // Cache management
  clearCache() {
    // Clear any cached data if implemented
    console.log('Omeda API cache cleared');
  }

  // Health check
  async checkAPIHealth() {
    try {
      const response = await this.axios.get('/health');
      return { status: 'healthy', data: response.data };
    } catch (error) {
      return { status: 'unhealthy', error: error.message };
    }
  }
}

export const omedaAPI = new OmedaAPIService();