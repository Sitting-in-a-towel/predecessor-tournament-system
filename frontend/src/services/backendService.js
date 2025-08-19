import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

class BackendService {
  constructor() {
    this.axios = axios.create({
      baseURL: API_BASE_URL,
      withCredentials: true,
    });
  }

  // Tournament methods
  async getTournaments() {
    try {
      const response = await this.axios.get('/tournaments');
      return response.data;
    } catch (error) {
      console.error('Error fetching tournaments:', error);
      throw error;
    }
  }

  async getTournament(id) {
    try {
      const response = await this.axios.get(`/tournaments/${id}`);
      const tournament = response.data;
      
      // Map backend snake_case to frontend PascalCase
      return {
        ...tournament,
        Name: tournament.name,
        Description: tournament.description,
        BracketType: tournament.bracket_type,
        GameFormat: tournament.game_format,
        QuarterFinalFormat: tournament.quarter_final_format,
        SemiFinalFormat: tournament.semi_final_format,
        GrandFinalFormat: tournament.grand_final_format,
        MaxTeams: tournament.max_teams,
        Status: tournament.status,
        StartDate: tournament.start_date,
        EndDate: tournament.end_date,
        RegistrationOpen: tournament.registration_open
      };
    } catch (error) {
      console.error('Error fetching tournament:', error);
      throw error;
    }
  }

  async getTeamsByTournament(tournamentId) {
    try {
      const response = await this.axios.get(`/tournaments/${tournamentId}/teams`);
      const teams = response.data;
      
      // Map backend snake_case to frontend PascalCase
      return teams.map(team => ({
        ...team,
        TeamID: team.team_id,
        TeamName: team.team_name,
        TeamTag: team.team_tag,
        TeamLogo: team.team_logo,
        Confirmed: team.checked_in || false,
        Players: Array.from({ length: team.player_count || 0 }, (_, i) => ({ id: i + 1 })), // Mock players array
        Substitutes: [] // Mock substitutes array
      }));
    } catch (error) {
      console.error('Error fetching tournament teams:', error);
      throw error;
    }
  }

  // Team methods
  async getTeams() {
    try {
      const response = await this.axios.get('/teams');
      return response.data;
    } catch (error) {
      console.error('Error fetching teams:', error);
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

  async createTeam(teamData) {
    try {
      const response = await this.axios.post('/teams', teamData);
      return response.data;
    } catch (error) {
      console.error('Error creating team:', error);
      throw error;
    }
  }

  // Draft methods
  async getDraft(tournamentId) {
    try {
      const response = await this.axios.get(`/draft/${tournamentId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching draft:', error);
      throw error;
    }
  }
}

export const backendService = new BackendService();