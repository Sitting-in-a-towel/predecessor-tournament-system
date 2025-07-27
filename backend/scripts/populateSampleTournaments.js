const { airtableService } = require('../services/airtable');
require('dotenv').config();

class SampleDataPopulator {
  constructor() {
    this.sampleTournaments = [
      {
        TournamentID: 'tour_summer_2025',
        Name: 'Summer Championship 2025',
        Description: 'Premier tournament featuring the best Predecessor teams competing for glory and substantial prizes. This championship will showcase the highest level of competitive play with Bo3 group stages and Bo5 finals.',
        BracketType: 'Double Elimination',
        GameFormat: 'Best of 3',
        QuarterFinalFormat: 'Best of 3',
        SemiFinalFormat: 'Best of 5',
        GrandFinalFormat: 'Best of 5',
        MaxTeams: 16,
        RegistrationOpen: true,
        StartDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week from now
        EndDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 2 weeks from now
        Status: 'Registration'
      },
      {
        TournamentID: 'tour_weekly_42',
        Name: 'Weekly Cup #42',
        Description: 'Fast-paced weekly competition with single elimination format. Perfect for teams looking to practice their competitive skills in a shorter tournament format.',
        BracketType: 'Single Elimination',
        GameFormat: 'Best of 1',
        QuarterFinalFormat: 'Best of 1',
        SemiFinalFormat: 'Best of 3',
        GrandFinalFormat: 'Best of 3',
        MaxTeams: 8,
        RegistrationOpen: false,
        StartDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
        EndDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day from now
        Status: 'In Progress'
      },
      {
        TournamentID: 'tour_newcomer_jan',
        Name: 'Newcomer Tournament January',
        Description: 'A welcoming tournament designed for new players and teams just getting started with competitive Predecessor. Round robin format ensures everyone gets plenty of matches.',
        BracketType: 'Round Robin',
        GameFormat: 'Best of 1',
        QuarterFinalFormat: 'Best of 1',
        SemiFinalFormat: 'Best of 1',
        GrandFinalFormat: 'Best of 3',
        MaxTeams: 6,
        RegistrationOpen: true,
        StartDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 2 weeks from now
        EndDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(), // 3 weeks from now
        Status: 'Planning'
      },
      {
        TournamentID: 'tour_winter_complete',
        Name: 'Winter Championship 2024',
        Description: 'The completed winter championship that featured 32 teams in an epic double elimination bracket. Shadow Wolves claimed victory in a thrilling 5-game grand final.',
        BracketType: 'Double Elimination',
        GameFormat: 'Best of 3',
        QuarterFinalFormat: 'Best of 3',
        SemiFinalFormat: 'Best of 5',
        GrandFinalFormat: 'Best of 5',
        MaxTeams: 32,
        RegistrationOpen: false,
        StartDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(), // 2 months ago
        EndDate: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(), // 1.5 months ago
        Status: 'Completed'
      }
    ];

    this.sampleTeams = [
      {
        TeamID: 'team_shadow_wolves',
        TeamName: 'Shadow Wolves',
        Confirmed: true,
        CreatedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 1 month ago
        TeamLogo: null
      },
      {
        TeamID: 'team_lightning_strike',
        TeamName: 'Lightning Strike',
        Confirmed: true,
        CreatedAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
        TeamLogo: null
      },
      {
        TeamID: 'team_crimson_guard',
        TeamName: 'Crimson Guard',
        Confirmed: false,
        CreatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
        TeamLogo: null
      },
      {
        TeamID: 'team_azure_phoenix',
        TeamName: 'Azure Phoenix',
        Confirmed: true,
        CreatedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
        TeamLogo: null
      },
      {
        TeamID: 'team_iron_titans',
        TeamName: 'Iron Titans',
        Confirmed: true,
        CreatedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
        TeamLogo: null
      }
    ];

    this.samplePlayerSignups = [
      {
        SignupID: 'signup_001',
        LookingForTeam: true,
        PreferredRole: 'Carry',
        Experience: 'Advanced',
        AvailableTimes: 'Weekday evenings (7-11 PM EST), Weekend afternoons',
        ContactInfo: 'Discord: ProCarry#1234',
        Status: 'Available',
        CreatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        SignupID: 'signup_002',
        LookingForTeam: true,
        PreferredRole: 'Support',
        Experience: 'Intermediate',
        AvailableTimes: 'Weekend mornings and evenings',
        ContactInfo: 'Discord: SupportMain#5678',
        Status: 'Available',
        CreatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        SignupID: 'signup_003',
        LookingForTeam: false,
        PreferredRole: 'Jungle',
        Experience: 'Professional',
        AvailableTimes: 'Flexible schedule',
        ContactInfo: 'Discord: JungleKing#9999',
        Status: 'Joined Team',
        CreatedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];

    this.additionalHeroes = [
      { HeroID: 'hero_006', HeroName: 'Muriel', Role: 'Support', Enabled: true },
      { HeroID: 'hero_007', HeroName: 'Gideon', Role: 'Midlane', Enabled: true },
      { HeroID: 'hero_008', HeroName: 'Rampage', Role: 'Jungle', Enabled: true },
      { HeroID: 'hero_009', HeroName: 'Twinblast', Role: 'Carry', Enabled: true },
      { HeroID: 'hero_010', HeroName: 'Gadget', Role: 'Midlane', Enabled: true },
      { HeroID: 'hero_011', HeroName: 'Howitzer', Role: 'Midlane', Enabled: true },
      { HeroID: 'hero_012', HeroName: 'Sevarog', Role: 'Jungle', Enabled: true },
      { HeroID: 'hero_013', HeroName: 'Belica', Role: 'Midlane', Enabled: true },
      { HeroID: 'hero_014', HeroName: 'Khaimera', Role: 'Jungle', Enabled: true },
      { HeroID: 'hero_015', HeroName: 'Narbash', Role: 'Support', Enabled: true },
      { HeroID: 'hero_016', HeroName: 'Kwang', Role: 'Offlane', Enabled: false }, // Disabled for testing
      { HeroID: 'hero_017', HeroName: 'Yin', Role: 'Carry', Enabled: true },
      { HeroID: 'hero_018', HeroName: 'Riktor', Role: 'Support', Enabled: true },
      { HeroID: 'hero_019', HeroName: 'Feng Mao', Role: 'Offlane', Enabled: true },
      { HeroID: 'hero_020', HeroName: 'Murdock', Role: 'Carry', Enabled: true }
    ];
  }

  async populateAllSampleData() {
    try {
      console.log('🎯 Starting sample data population...\n');

      // Add additional heroes first
      await this.populateAdditionalHeroes();

      // Add sample tournaments
      await this.populateTournaments();

      // Add sample teams
      await this.populateTeams();

      // Add sample player signups
      await this.populatePlayerSignups();

      // Add some notifications
      await this.populateNotifications();

      console.log('\n🎉 Sample data population completed successfully!');
      console.log('\nSample data includes:');
      console.log('📋 4 tournaments (various statuses)');
      console.log('👥 5 teams');
      console.log('🔍 3 player signups');
      console.log('🦸 20 heroes total');
      console.log('📢 Sample notifications');
      console.log('\nYou can now test the full tournament workflow!');

    } catch (error) {
      console.error('❌ Error populating sample data:', error);
      throw error;
    }
  }

  async populateAdditionalHeroes() {
    try {
      console.log('Adding additional heroes...');
      
      // We'll use the base Airtable API since our service might need existing users
      const axios = require('axios');
      const baseId = process.env.AIRTABLE_BASE_ID;
      
      if (!baseId) {
        throw new Error('AIRTABLE_BASE_ID not found in environment variables');
      }

      const heroRecords = this.additionalHeroes.map(hero => ({
        fields: {
          ...hero,
          LastUpdated: new Date().toISOString()
        }
      }));

      // Add heroes in batches of 10 (Airtable limit)
      for (let i = 0; i < heroRecords.length; i += 10) {
        const batch = heroRecords.slice(i, i + 10);
        
        await axios.post(
          `https://api.airtable.com/v0/${baseId}/Heroes`,
          { records: batch },
          {
            headers: {
              'Authorization': `Bearer ${process.env.AIRTABLE_PERSONAL_TOKEN}`,
              'Content-Type': 'application/json'
            }
          }
        );
      }

      console.log(`✅ Added ${this.additionalHeroes.length} additional heroes`);
    } catch (error) {
      console.error('Error adding heroes:', error.response?.data || error.message);
    }
  }

  async populateTournaments() {
    try {
      console.log('Creating sample tournaments...');
      
      for (const tournament of this.sampleTournaments) {
        try {
          const created = await airtableService.createTournament(tournament);
          console.log(`✅ Created tournament: ${tournament.Name}`);
        } catch (error) {
          console.warn(`⚠️  Could not create tournament ${tournament.Name}:`, error.message);
        }
      }
    } catch (error) {
      console.error('Error creating tournaments:', error);
    }
  }

  async populateTeams() {
    try {
      console.log('Creating sample teams...');
      
      for (const team of this.sampleTeams) {
        try {
          const created = await airtableService.createTeam(team);
          console.log(`✅ Created team: ${team.TeamName}`);
        } catch (error) {
          console.warn(`⚠️  Could not create team ${team.TeamName}:`, error.message);
        }
      }
    } catch (error) {
      console.error('Error creating teams:', error);
    }
  }

  async populatePlayerSignups() {
    try {
      console.log('Creating sample player signups...');
      
      const axios = require('axios');
      const baseId = process.env.AIRTABLE_BASE_ID;
      
      const signupRecords = this.samplePlayerSignups.map(signup => ({
        fields: signup
      }));

      await axios.post(
        `https://api.airtable.com/v0/${baseId}/PlayerSignups`,
        { records: signupRecords },
        {
          headers: {
            'Authorization': `Bearer ${process.env.AIRTABLE_PERSONAL_TOKEN}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log(`✅ Created ${this.samplePlayerSignups.length} player signups`);
    } catch (error) {
      console.error('Error creating player signups:', error.response?.data || error.message);
    }
  }

  async populateNotifications() {
    try {
      console.log('Creating sample notifications...');
      
      const sampleNotifications = [
        {
          NotificationID: 'notif_001',
          Type: 'Tournament Update',
          Title: 'Summer Championship Registration Open',
          Message: 'Registration is now open for the Summer Championship 2025! Sign up your team before spots fill up.',
          Read: false,
          CreatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          NotificationID: 'notif_002',
          Type: 'General',
          Title: 'Welcome to Predecessor Tournaments',
          Message: 'Welcome to our tournament management system! Create or join teams, participate in drafts, and compete in tournaments.',
          Read: false,
          CreatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
        }
      ];

      const axios = require('axios');
      const baseId = process.env.AIRTABLE_BASE_ID;
      
      const notificationRecords = sampleNotifications.map(notification => ({
        fields: notification
      }));

      await axios.post(
        `https://api.airtable.com/v0/${baseId}/Notifications`,
        { records: notificationRecords },
        {
          headers: {
            'Authorization': `Bearer ${process.env.AIRTABLE_PERSONAL_TOKEN}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log(`✅ Created ${sampleNotifications.length} notifications`);
    } catch (error) {
      console.error('Error creating notifications:', error.response?.data || error.message);
    }
  }
}

// Run if called directly
if (require.main === module) {
  const populator = new SampleDataPopulator();
  populator.populateAllSampleData().catch(error => {
    console.error('Sample data population failed:', error);
    process.exit(1);
  });
}

module.exports = SampleDataPopulator;