const Airtable = require('airtable');
const logger = require('../utils/logger');

// Configure Airtable
Airtable.configure({
  endpointUrl: 'https://api.airtable.com',
  apiKey: process.env.AIRTABLE_PERSONAL_TOKEN
});

const base = Airtable.base(process.env.AIRTABLE_BASE_ID);

class AirtableService {
  constructor() {
    this.tables = {
      users: base('Users'),
      tournaments: base('Tournaments'),
      teams: base('Teams'),
      matches: base('Matches'),
      draftSessions: base('DraftSessions'),
      playerSignups: base('PlayerSignups'),
      notifications: base('Notifications'),
      heroes: base('Heroes')
    };
  }

  // User management
  async getUserByDiscordID(discordID) {
    try {
      const records = await this.tables.users.select({
        filterByFormula: `{DiscordID} = '${discordID}'`,
        maxRecords: 1
      }).firstPage();
      
      if (records.length > 0) {
        const record = records[0];
        return {
          recordId: record.id,
          UserID: record.get('UserID'),
          DiscordID: record.get('DiscordID'),
          DiscordUsername: record.get('DiscordUsername'),
          Email: record.get('Email'),
          IsAdmin: record.get('IsAdmin') || false,
          CreatedAt: record.get('CreatedAt'),
          LastActive: record.get('LastActive')
        };
      }
      return null;
    } catch (error) {
      logger.error('Error getting user by Discord ID:', error);
      throw error;
    }
  }

  async getUserByID(userID) {
    try {
      const records = await this.tables.users.select({
        filterByFormula: `{UserID} = '${userID}'`,
        maxRecords: 1
      }).firstPage();
      
      if (records.length > 0) {
        const record = records[0];
        return {
          recordId: record.id,
          UserID: record.get('UserID'),
          DiscordID: record.get('DiscordID'),
          DiscordUsername: record.get('DiscordUsername'),
          Email: record.get('Email'),
          IsAdmin: record.get('IsAdmin') || false,
          CreatedAt: record.get('CreatedAt'),
          LastActive: record.get('LastActive')
        };
      }
      return null;
    } catch (error) {
      logger.error('Error getting user by ID:', error);
      throw error;
    }
  }

  async createUser(userData) {
    try {
      const records = await this.tables.users.create([
        {
          fields: userData
        }
      ]);
      
      const record = records[0];
      return {
        recordId: record.id,
        UserID: record.get('UserID'),
        DiscordID: record.get('DiscordID'),
        DiscordUsername: record.get('DiscordUsername'),
        Email: record.get('Email'),
        IsAdmin: record.get('IsAdmin') || false,
        CreatedAt: record.get('CreatedAt'),
        LastActive: record.get('LastActive')
      };
    } catch (error) {
      logger.error('Error creating user:', error);
      throw error;
    }
  }

  async updateUser(userID, updates) {
    try {
      // First find the record
      const records = await this.tables.users.select({
        filterByFormula: `{UserID} = '${userID}'`,
        maxRecords: 1
      }).firstPage();

      if (records.length === 0) {
        throw new Error('User not found');
      }

      const record = records[0];
      const updatedRecords = await this.tables.users.update([
        {
          id: record.id,
          fields: updates
        }
      ]);

      const updatedRecord = updatedRecords[0];
      return {
        recordId: updatedRecord.id,
        UserID: updatedRecord.get('UserID'),
        DiscordID: updatedRecord.get('DiscordID'),
        DiscordUsername: updatedRecord.get('DiscordUsername'),
        Email: updatedRecord.get('Email'),
        IsAdmin: updatedRecord.get('IsAdmin') || false,
        CreatedAt: updatedRecord.get('CreatedAt'),
        LastActive: updatedRecord.get('LastActive')
      };
    } catch (error) {
      logger.error('Error updating user:', error);
      throw error;
    }
  }

  async getAllUsers() {
    try {
      const records = await this.tables.users.select({
        sort: [{ field: 'CreatedAt', direction: 'desc' }]
      }).all();

      return records.map(record => ({
        recordId: record.id,
        UserID: record.get('UserID'),
        DiscordID: record.get('DiscordID'),
        DiscordUsername: record.get('DiscordUsername'),
        Email: record.get('Email'),
        IsAdmin: record.get('IsAdmin') || false,
        CreatedAt: record.get('CreatedAt'),
        LastActive: record.get('LastActive')
      }));
    } catch (error) {
      logger.error('Error getting all users:', error);
      throw error;
    }
  }

  // Tournament management
  async getTournaments(filters = {}) {
    try {
      let filterFormula = '';
      if (filters.status) {
        filterFormula = `{Status} = '${filters.status}'`;
      }

      const selectOptions = {
        sort: [{ field: 'StartDate', direction: 'desc' }]
      };
      
      if (filterFormula) {
        selectOptions.filterByFormula = filterFormula;
      }
      
      const records = await this.tables.tournaments.select(selectOptions).all();

      return records.map(record => ({
        recordId: record.id,
        TournamentID: record.get('TournamentID'),
        Name: record.get('Name'),
        Description: record.get('Description'),
        BracketType: record.get('BracketType'),
        GameFormat: record.get('GameFormat'),
        QuarterFinalFormat: record.get('QuarterFinalFormat'),
        SemiFinalFormat: record.get('SemiFinalFormat'),
        GrandFinalFormat: record.get('GrandFinalFormat'),
        MaxTeams: record.get('MaxTeams'),
        RegistrationOpen: record.get('RegistrationOpen'),
        StartDate: record.get('StartDate'),
        EndDate: record.get('EndDate'),
        Status: record.get('Status'),
        CreatedBy: record.get('CreatedBy')
      }));
    } catch (error) {
      logger.error('Error getting tournaments:', error);
      throw error;
    }
  }

  async createTournament(tournamentData) {
    try {
      const records = await this.tables.tournaments.create([
        {
          fields: tournamentData
        }
      ]);

      const record = records[0];
      return {
        recordId: record.id,
        TournamentID: record.get('TournamentID'),
        Name: record.get('Name'),
        Description: record.get('Description'),
        BracketType: record.get('BracketType'),
        GameFormat: record.get('GameFormat'),
        MaxTeams: record.get('MaxTeams'),
        Status: record.get('Status'),
        StartDate: record.get('StartDate'),
        CreatedBy: record.get('CreatedBy')
      };
    } catch (error) {
      logger.error('Error creating tournament:', error);
      throw error;
    }
  }

  // Team management
  async getTeams() {
    try {
      const records = await this.tables.teams.select({
        sort: [{ field: 'CreatedAt', direction: 'desc' }]
      }).all();

      return records.map(record => ({
        recordId: record.id,
        TeamID: record.get('TeamID'),
        TeamName: record.get('TeamName'),
        Captain: record.get('Captain'),
        Players: record.get('Players'),
        Substitutes: record.get('Substitutes'),
        Confirmed: record.get('Confirmed'),
        CreatedAt: record.get('CreatedAt'),
        TeamLogo: record.get('TeamLogo'),
        Tournament: record.get('Tournament')
      }));
    } catch (error) {
      logger.error('Error getting teams:', error);
      throw error;
    }
  }

  async getTeamsByTournament(tournamentID) {
    try {
      const records = await this.tables.teams.select({
        filterByFormula: `SEARCH('${tournamentID}', ARRAYJOIN({Tournament}))`,
        sort: [{ field: 'CreatedAt', direction: 'desc' }]
      }).all();

      return records.map(record => ({
        recordId: record.id,
        TeamID: record.get('TeamID'),
        TeamName: record.get('TeamName'),
        Captain: record.get('Captain'),
        Players: record.get('Players'),
        Substitutes: record.get('Substitutes'),
        Confirmed: record.get('Confirmed'),
        CreatedAt: record.get('CreatedAt'),
        TeamLogo: record.get('TeamLogo')
      }));
    } catch (error) {
      logger.error('Error getting teams by tournament:', error);
      throw error;
    }
  }

  async createTeam(teamData) {
    try {
      const records = await this.tables.teams.create([
        {
          fields: teamData
        }
      ]);

      const record = records[0];
      return {
        recordId: record.id,
        TeamID: record.get('TeamID'),
        TeamName: record.get('TeamName'),
        Captain: record.get('Captain'),
        Players: record.get('Players'),
        Confirmed: record.get('Confirmed'),
        CreatedAt: record.get('CreatedAt')
      };
    } catch (error) {
      logger.error('Error creating team:', error);
      throw error;
    }
  }

  async updateTeam(recordId, updates) {
    try {
      const updatedRecords = await this.tables.teams.update([
        {
          id: recordId,
          fields: updates
        }
      ]);

      const record = updatedRecords[0];
      return {
        recordId: record.id,
        TeamID: record.get('TeamID'),
        TeamName: record.get('TeamName'),
        Captain: record.get('Captain'),
        Players: record.get('Players'),
        Substitutes: record.get('Substitutes'),
        Confirmed: record.get('Confirmed'),
        CreatedAt: record.get('CreatedAt'),
        TeamLogo: record.get('TeamLogo'),
        Tournament: record.get('Tournament'),
        ConfirmedAt: record.get('ConfirmedAt')
      };
    } catch (error) {
      logger.error('Error updating team:', error);
      throw error;
    }
  }

  // Heroes management (for draft system)
  async getHeroes() {
    try {
      const records = await this.tables.heroes.select({
        filterByFormula: '{Enabled} = TRUE()',
        sort: [{ field: 'HeroName', direction: 'asc' }]
      }).all();

      return records.map(record => ({
        recordId: record.id,
        HeroID: record.get('HeroID'),
        HeroName: record.get('HeroName'),
        Role: record.get('Role'),
        ImageURL: record.get('ImageURL'),
        OmedaID: record.get('OmedaID'),
        Enabled: record.get('Enabled')
      }));
    } catch (error) {
      logger.error('Error getting heroes:', error);
      throw error;
    }
  }

  // Match management
  async getMatches() {
    try {
      const records = await this.tables.matches.select({
        sort: [{ field: 'CreatedAt', direction: 'desc' }]
      }).all();

      return records.map(record => ({
        recordId: record.id,
        MatchID: record.get('MatchID'),
        Tournament: record.get('Tournament'),
        Team1: record.get('Team1'),
        Team2: record.get('Team2'),
        Round: record.get('Round'),
        MatchType: record.get('MatchType'),
        Status: record.get('Status'),
        ScheduledTime: record.get('ScheduledTime'),
        StartedAt: record.get('StartedAt'),
        CompletedAt: record.get('CompletedAt'),
        Winner: record.get('Winner'),
        Team1Score: record.get('Team1Score'),
        Team2Score: record.get('Team2Score'),
        GameLength: record.get('GameLength'),
        Notes: record.get('Notes'),
        CreatedAt: record.get('CreatedAt'),
        CreatedBy: record.get('CreatedBy'),
        StartedBy: record.get('StartedBy'),
        ReportedBy: record.get('ReportedBy')
      }));
    } catch (error) {
      logger.error('Error getting matches:', error);
      throw error;
    }
  }

  async getMatchesByTournament(tournamentID) {
    try {
      const records = await this.tables.matches.select({
        filterByFormula: `SEARCH('${tournamentID}', ARRAYJOIN({Tournament}))`,
        sort: [{ field: 'CreatedAt', direction: 'desc' }]
      }).all();

      return records.map(record => ({
        recordId: record.id,
        MatchID: record.get('MatchID'),
        Tournament: record.get('Tournament'),
        Team1: record.get('Team1'),
        Team2: record.get('Team2'),
        Round: record.get('Round'),
        MatchType: record.get('MatchType'),
        Status: record.get('Status'),
        ScheduledTime: record.get('ScheduledTime'),
        StartedAt: record.get('StartedAt'),
        CompletedAt: record.get('CompletedAt'),
        Winner: record.get('Winner'),
        Team1Score: record.get('Team1Score'),
        Team2Score: record.get('Team2Score'),
        GameLength: record.get('GameLength'),
        Notes: record.get('Notes'),
        CreatedAt: record.get('CreatedAt'),
        CreatedBy: record.get('CreatedBy'),
        StartedBy: record.get('StartedBy'),
        ReportedBy: record.get('ReportedBy')
      }));
    } catch (error) {
      logger.error('Error getting matches by tournament:', error);
      throw error;
    }
  }

  async createMatch(matchData) {
    try {
      const records = await this.tables.matches.create([
        {
          fields: matchData
        }
      ]);

      const record = records[0];
      return {
        recordId: record.id,
        MatchID: record.get('MatchID'),
        Tournament: record.get('Tournament'),
        Team1: record.get('Team1'),
        Team2: record.get('Team2'),
        Round: record.get('Round'),
        MatchType: record.get('MatchType'),
        Status: record.get('Status'),
        ScheduledTime: record.get('ScheduledTime'),
        CreatedAt: record.get('CreatedAt'),
        CreatedBy: record.get('CreatedBy')
      };
    } catch (error) {
      logger.error('Error creating match:', error);
      throw error;
    }
  }

  async updateMatch(recordId, updates) {
    try {
      const updatedRecords = await this.tables.matches.update([
        {
          id: recordId,
          fields: updates
        }
      ]);

      const record = updatedRecords[0];
      return {
        recordId: record.id,
        MatchID: record.get('MatchID'),
        Tournament: record.get('Tournament'),
        Team1: record.get('Team1'),
        Team2: record.get('Team2'),
        Round: record.get('Round'),
        MatchType: record.get('MatchType'),
        Status: record.get('Status'),
        ScheduledTime: record.get('ScheduledTime'),
        StartedAt: record.get('StartedAt'),
        CompletedAt: record.get('CompletedAt'),
        Winner: record.get('Winner'),
        Team1Score: record.get('Team1Score'),
        Team2Score: record.get('Team2Score'),
        GameLength: record.get('GameLength'),
        Notes: record.get('Notes'),
        CreatedAt: record.get('CreatedAt'),
        CreatedBy: record.get('CreatedBy'),
        StartedBy: record.get('StartedBy'),
        ReportedBy: record.get('ReportedBy')
      };
    } catch (error) {
      logger.error('Error updating match:', error);
      throw error;
    }
  }

  async deleteMatch(recordId) {
    try {
      await this.tables.matches.destroy([recordId]);
      return true;
    } catch (error) {
      logger.error('Error deleting match:', error);
      throw error;
    }
  }

  // Draft session management
  async getDraftSessions() {
    try {
      const records = await this.tables.draftSessions.select({
        sort: [{ field: 'CreatedAt', direction: 'desc' }]
      }).all();

      return records.map(record => ({
        recordId: record.id,
        DraftID: record.get('DraftID'),
        Match: record.get('Match'),
        Team1Captain: record.get('Team1Captain'),
        Team2Captain: record.get('Team2Captain'),
        Status: record.get('Status'),
        CreatedAt: record.get('CreatedAt'),
        StartTime: record.get('StartTime'),
        CompletedAt: record.get('CompletedAt'),
        CurrentPhase: record.get('CurrentPhase'),
        CurrentTurn: record.get('CurrentTurn'),
        CoinTossWinner: record.get('CoinTossWinner'),
        FirstPick: record.get('FirstPick'),
        PickOrder: record.get('PickOrder'),
        BanOrder: record.get('BanOrder'),
        Team1Picks: record.get('Team1Picks'),
        Team2Picks: record.get('Team2Picks'),
        Team1Bans: record.get('Team1Bans'),
        Team2Bans: record.get('Team2Bans'),
        CreatedBy: record.get('CreatedBy')
      }));
    } catch (error) {
      logger.error('Error getting draft sessions:', error);
      throw error;
    }
  }

  async createDraftSession(draftData) {
    try {
      const records = await this.tables.draftSessions.create([
        {
          fields: draftData
        }
      ]);

      const record = records[0];
      return {
        recordId: record.id,
        DraftID: record.get('DraftID'),
        Match: record.get('Match'),
        Team1Captain: record.get('Team1Captain'),
        Team2Captain: record.get('Team2Captain'),
        Status: record.get('Status'),
        CreatedAt: record.get('CreatedAt'),
        CurrentPhase: record.get('CurrentPhase'),
        CurrentTurn: record.get('CurrentTurn')
      };
    } catch (error) {
      logger.error('Error creating draft session:', error);
      throw error;
    }
  }

  async updateDraftSession(draftID, updates) {
    try {
      const records = await this.tables.draftSessions.select({
        filterByFormula: `{DraftID} = '${draftID}'`,
        maxRecords: 1
      }).firstPage();

      if (records.length === 0) {
        throw new Error('Draft session not found');
      }

      const record = records[0];
      const updatedRecords = await this.tables.draftSessions.update([
        {
          id: record.id,
          fields: updates
        }
      ]);

      return updatedRecords[0];
    } catch (error) {
      logger.error('Error updating draft session:', error);
      throw error;
    }
  }
}

const airtableService = new AirtableService();
module.exports = { airtableService };