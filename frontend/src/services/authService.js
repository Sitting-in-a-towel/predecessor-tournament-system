import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3002/api';

class AuthService {
  constructor() {
    this.axios = axios.create({
      baseURL: API_BASE_URL,
      withCredentials: true,
    });
  }

  async getCurrentUser() {
    try {
      const response = await this.axios.get('/auth/me');
      return response.data;
    } catch (error) {
      if (error.response?.status === 401) {
        return null; // Not authenticated
      }
      throw error;
    }
  }

  async logout() {
    try {
      await this.axios.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  }

  // Discord OAuth is handled by redirecting to /api/auth/discord
  initiateDiscordLogin() {
    window.location.href = `${API_BASE_URL}/auth/discord`;
  }
}

export const authService = new AuthService();