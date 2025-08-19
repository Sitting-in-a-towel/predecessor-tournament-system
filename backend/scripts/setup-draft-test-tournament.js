const postgresService = require('../services/postgresql');
const { v4: uuidv4 } = require('uuid');

async function setupDraftTestTournament() {
  try {
    console.log('🏗️ Setting up complete draft test tournament...');
    
    // 1. Check if test tournament already exists
    const existingTournament = await postgresService.query(
      'SELECT * FROM tournaments WHERE name = $1',
      ['Draft Test Tournament']
    );
    
    let tournamentId;
    if (existingTournament.rows.length > 0) {
      tournamentId = existingTournament.rows[0].tournament_id;
      console.log('✅ Found existing Draft Test Tournament:', tournamentId);
    } else {
      // Create new tournament
      tournamentId = uuidv4();
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7); // One week from now
      
      await postgresService.query(`
        INSERT INTO tournaments (
          tournament_id, name, description, game_format, bracket_type,
          max_teams, status, registration_open, start_date, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `, [
        tournamentId,
        'Draft Test Tournament',
        'Tournament created specifically for testing the draft system with proper bracket and teams.',
        'Best of 3',
        'Single Elimination',
        8,
        'Registration',
        true,
        futureDate,
        new Date(),
        new Date()
      ]);
      console.log('✅ Created new Draft Test Tournament:', tournamentId);
    }
    
    // 2. Create test teams if they don't exist
    const testTeams = [
      { name: 'Team Alpha', captain: 'AlphaCaptain' },
      { name: 'Team Beta', captain: 'BetaCaptain' },
      { name: 'Team Gamma', captain: 'GammaCaptain' },
      { name: 'Team Delta', captain: 'DeltaCaptain' },
    ];
    
    const createdTeams = [];
    
    for (const team of testTeams) {
      // Check if team exists
      const existing = await postgresService.query(
        'SELECT * FROM teams WHERE team_name = $1',
        [team.name]
      );
      
      if (existing.rows.length > 0) {
        createdTeams.push(existing.rows[0]);
        console.log(`✅ Found existing team: ${team.name}`);
      } else {
        // Create captain user if needed
        let captainUser = await postgresService.query(
          'SELECT * FROM users WHERE discord_username = $1',
          [team.captain]
        );
        
        if (captainUser.rows.length === 0) {
          const captainId = uuidv4();
          const captainUserId = `user_${Date.now()}_${team.captain.toLowerCase()}`;
          
          await postgresService.query(`
            INSERT INTO users (
              id, user_id, discord_id, discord_username, 
              created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6)
          `, [
            captainId,
            captainUserId,
            `${Math.random().toString().substr(2, 18)}`, // Fake Discord ID
            team.captain,
            new Date(),
            new Date()
          ]);
          
          captainUser = await postgresService.query(
            'SELECT * FROM users WHERE id = $1',
            [captainId]
          );
        }
        
        // Create team
        const teamId = uuidv4();
        const teamStringId = `team_${Date.now()}_${team.name.toLowerCase().replace(/\s+/g, '')}`;
        
        const newTeam = await postgresService.query(`
          INSERT INTO teams (
            id, team_id, team_name, captain_id, 
            created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *
        `, [
          teamId,
          teamStringId,
          team.name,
          captainUser.rows[0].id,
          new Date(),
          new Date()
        ]);
        
        createdTeams.push(newTeam.rows[0]);
        console.log(`✅ Created team: ${team.name}`);
      }
    }
    
    // 3. Register teams to tournament
    for (const team of createdTeams) {
      const existing = await postgresService.query(
        'SELECT * FROM tournament_registrations WHERE tournament_id = $1 AND team_id = $2',
        [tournamentId, team.id]
      );
      
      if (existing.rows.length === 0) {
        await postgresService.query(`
          INSERT INTO tournament_registrations (
            tournament_id, team_id, registration_date, status
          ) VALUES ($1, $2, $3, $4)
        `, [
          tournamentId,
          team.id,
          new Date(),
          'registered'
        ]);
        console.log(`✅ Registered ${team.team_name} to tournament`);
      }
    }
    
    // 4. Create a simple bracket
    const bracketData = {
      type: "Single Elimination",
      rounds: [
        {
          round: 1,
          matches: [
            {
              id: "r1m1",
              team1: createdTeams[0]?.team_id || "Team Alpha",
              team2: createdTeams[1]?.team_id || "Team Beta",
              status: "pending"
            },
            {
              id: "r1m2", 
              team1: createdTeams[2]?.team_id || "Team Gamma",
              team2: createdTeams[3]?.team_id || "Team Delta",
              status: "pending"
            }
          ]
        },
        {
          round: 2,
          matches: [
            {
              id: "r2m1",
              team1: "TBD",
              team2: "TBD", 
              status: "pending"
            }
          ]
        }
      ]
    };
    
    // 5. Insert/update bracket
    const existingBracket = await postgresService.query(
      'SELECT * FROM tournament_brackets WHERE tournament_id = $1',
      [tournamentId]
    );
    
    if (existingBracket.rows.length > 0) {
      await postgresService.query(
        'UPDATE tournament_brackets SET bracket_data = $1, is_published = $2, updated_at = $3 WHERE tournament_id = $4',
        [JSON.stringify(bracketData), true, new Date(), tournamentId]
      );
      console.log('✅ Updated tournament bracket');
    } else {
      await postgresService.query(`
        INSERT INTO tournament_brackets (
          tournament_id, bracket_data, is_published, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5)
      `, [
        tournamentId,
        JSON.stringify(bracketData),
        true,
        new Date(),
        new Date()
      ]);
      console.log('✅ Created tournament bracket');
    }
    
    console.log('\n🎉 DRAFT TEST TOURNAMENT SETUP COMPLETE!');
    console.log('==========================================');
    console.log(`Tournament ID: ${tournamentId}`);
    console.log(`Tournament Name: Draft Test Tournament`);
    console.log(`Teams Created: ${createdTeams.length}`);
    console.log(`Bracket: Published with ${bracketData.rounds[0].matches.length} Round 1 matches`);
    console.log('\n✅ Ready for draft testing!');
    console.log('\nNext steps:');
    console.log('1. Log in as admin user');
    console.log('2. Navigate to "Draft Test Tournament"');
    console.log('3. Click Drafts tab');
    console.log('4. Create draft for available matches');
    
    return {
      tournamentId,
      teams: createdTeams,
      bracket: bracketData
    };
    
  } catch (error) {
    console.error('❌ Error setting up draft test tournament:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  setupDraftTestTournament()
    .then(() => {
      console.log('✅ Draft test tournament setup completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Failed to setup draft test tournament:', error);
      process.exit(1);
    });
}

module.exports = { setupDraftTestTournament };