import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

class AirtableService {
  constructor() {
    this.axios = axios.create({
      baseURL: API_BASE_URL,
      withCredentials: true,
    });
  }

  // Tournament services
  async getTournaments(filters = {}) {
    try {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.bracketType) params.append('bracketType', filters.bracketType);
      
      const response = await this.axios.get(`/tournaments?${params}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching tournaments:', error);
      throw error;
    }
  }

  async getTournament(id) {
    try {
      const response = await this.axios.get(`/tournaments/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching tournament:', error);
      throw error;
    }
  }

  async createTournament(tournamentData) {
    try {
      const response = await this.axios.post('/tournaments', tournamentData);
      return response.data;
    } catch (error) {
      console.error('Error creating tournament:', error);
      throw error;
    }
  }

  async updateTournament(id, updates) {
    try {
      const response = await this.axios.put(`/tournaments/${id}`, updates);
      return response.data;
    } catch (error) {
      console.error('Error updating tournament:', error);
      throw error;
    }
  }

  async getTournamentTeams(id) {
    try {
      const response = await this.axios.get(`/tournaments/${id}/teams`);
      return response.data;
    } catch (error) {
      console.error('Error fetching tournament teams:', error);
      throw error;
    }
  }

  // Team services
  async getMyTeams() {
    try {
      const response = await this.axios.get('/teams/my-teams');
      return response.data;
    } catch (error) {
      console.error('Error fetching user teams:', error);
      throw error;
    }
  }

  async createTeam(teamData) {
    try {
      const response = await this.axios.post('/teams', teamData);
      return response.data;
    } catch (error) {
      console.error('Error creating team:', error);
      throw error;
    }
  }

  async getTeam(id) {
    try {
      const response = await this.axios.get(`/teams/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching team:', error);
      throw error;
    }
  }

  async updateTeam(id, updates) {
    try {
      const response = await this.axios.put(`/teams/${id}`, updates);
      return response.data;
    } catch (error) {
      console.error('Error updating team:', error);
      throw error;
    }
  }

  async invitePlayer(teamId, playerId, role = 'player') {
    try {
      const response = await this.axios.post(`/teams/${teamId}/invite`, {
        playerID: playerId,
        role
      });
      return response.data;
    } catch (error) {
      console.error('Error inviting player:', error);
      throw error;
    }
  }

  async removePlayer(teamId, playerId) {
    try {
      const response = await this.axios.delete(`/teams/${teamId}/players/${playerId}`);
      return response.data;
    } catch (error) {
      console.error('Error removing player:', error);
      throw error;
    }
  }

  async confirmTeam(teamId) {
    try {
      const response = await this.axios.post(`/teams/${teamId}/confirm`);
      return response.data;
    } catch (error) {
      console.error('Error confirming team:', error);
      throw error;
    }
  }

  // Draft services
  async createDraftSession(draftData) {
    try {
      const response = await this.axios.post('/draft', draftData);
      return response.data;
    } catch (error) {
      console.error('Error creating draft session:', error);
      throw error;
    }
  }

  async getDraftSession(id) {
    try {
      const response = await this.axios.get(`/draft/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching draft session:', error);
      throw error;
    }
  }

  async performCoinToss(draftId) {
    try {
      const response = await this.axios.post(`/draft/${draftId}/coin-toss`);
      return response.data;
    } catch (error) {
      console.error('Error performing coin toss:', error);
      throw error;
    }
  }

  async performDraftAction(draftId, action, heroId, team) {
    try {
      const response = await this.axios.post(`/draft/${draftId}/action`, {
        action,
        heroID: heroId,
        team
      });
      return response.data;
    } catch (error) {
      console.error('Error performing draft action:', error);
      throw error;
    }
  }

  async getDraftHeroes(draftId) {
    try {
      const response = await this.axios.get(`/draft/${draftId}/heroes`);
      return response.data;
    } catch (error) {
      console.error('Error fetching draft heroes:', error);
      throw error;
    }
  }

  // Admin services
  async getAdminDashboard() {
    try {
      const response = await this.axios.get('/admin/dashboard');
      return response.data;
    } catch (error) {
      console.error('Error fetching admin dashboard:', error);
      throw error;
    }
  }

  async getAllTeams() {
    try {
      const response = await this.axios.get('/admin/teams');
      return response.data;
    } catch (error) {
      console.error('Error fetching all teams:', error);
      throw error;
    }
  }

  async getAllUsers() {
    try {
      const response = await this.axios.get('/admin/users');
      return response.data;
    } catch (error) {
      console.error('Error fetching all users:', error);
      throw error;
    }
  }

  async getAllMatches() {
    try {
      const response = await this.axios.get('/admin/matches');
      return response.data;
    } catch (error) {
      console.error('Error fetching all matches:', error);
      throw error;
    }
  }

  async getRecentActivity(limit = 10) {
    try {
      const response = await this.axios.get(`/admin/activity?limit=${limit}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching recent activity:', error);
      throw error;
    }
  }

  async checkConnection() {
    try {
      const response = await this.axios.get('/health');
      return response.status === 200;
    } catch (error) {
      console.error('Error checking connection:', error);
      return false;
    }
  }

  async getUsers(page = 1, limit = 50) {
    try {
      const response = await this.axios.get(`/admin/users?page=${page}&limit=${limit}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  }

  async updateUser(id, updates) {
    try {
      const response = await this.axios.put(`/admin/users/${id}`, updates);
      return response.data;
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  async getAllTournaments() {
    try {
      const response = await this.axios.get('/admin/tournaments');
      return response.data;
    } catch (error) {
      console.error('Error fetching all tournaments:', error);
      throw error;
    }
  }

  async updateTournamentStatus(id, status) {
    try {
      const response = await this.axios.put(`/admin/tournaments/${id}/status`, { status });
      return response.data;
    } catch (error) {
      console.error('Error updating tournament status:', error);
      throw error;
    }
  }

  async emergencyStopDraft(draftId) {
    try {
      const response = await this.axios.post(`/admin/drafts/${draftId}/emergency-stop`);
      return response.data;
    } catch (error) {
      console.error('Error performing emergency stop:', error);
      throw error;
    }
  }

  async createBackup() {
    try {
      const response = await this.axios.post('/admin/backup');
      return response.data;
    } catch (error) {
      console.error('Error creating backup:', error);
      throw error;
    }
  }
}

export const airtableService = new AirtableService();