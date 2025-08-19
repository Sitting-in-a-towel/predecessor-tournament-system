#!/usr/bin/env node
/**
 * Test Current API State
 * 
 * This script tests the actual API endpoints to see exactly what's failing
 */

const postgresService = require('../services/postgresql');
const axios = require('axios');

class APITester {
  constructor() {
    this.baseURL = 'http://localhost:3001/api';
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = type === 'error' ? '❌' : type === 'warning' ? '⚠️' : type === 'success' ? '✅' : '📍';
    console.log(`[${timestamp}] ${prefix} ${message}`);
  }

  async testDatabase() {
    this.log('=== DATABASE STATE TEST ===');
    
    try {
      // Get a sample tournament
      const tournamentsQuery = `
        SELECT id, tournament_id, name 
        FROM tournaments 
        ORDER BY created_at DESC 
        LIMIT 1
      `;
      const tournaments = await postgresService.query(tournamentsQuery);
      
      if (tournaments.rows.length === 0) {
        this.log('No tournaments found', 'warning');
        return null;
      }

      const tournament = tournaments.rows[0];
      this.log(`Testing with tournament: ${tournament.name}`);
      this.log(`  Primary Key (id): ${tournament.id}`);
      this.log(`  Public ID (tournament_id): ${tournament.tournament_id}`);

      // Check if bracket exists
      const bracketQuery = `
        SELECT * FROM tournament_brackets 
        WHERE tournament_id = $1
      `;
      const brackets = await postgresService.query(bracketQuery, [tournament.id]);
      this.log(`Brackets found using primary key: ${brackets.rows.length}`);

      const bracketsPublic = await postgresService.query(bracketQuery, [tournament.tournament_id]);
      this.log(`Brackets found using public ID: ${bracketsPublic.rows.length}`);

      // Check if registrations exist
      try {
        const regQuery = `
          SELECT * FROM tournament_registrations 
          WHERE tournament_id = $1
        `;
        const regs = await postgresService.query(regQuery, [tournament.id]);
        this.log(`Registrations found using primary key: ${regs.rows.length}`);

        const regsPublic = await postgresService.query(regQuery, [tournament.tournament_id]);
        this.log(`Registrations found using public ID: ${regsPublic.rows.length}`);
      } catch (error) {
        this.log(`tournament_registrations table missing: ${error.message}`, 'warning');
      }

      return tournament;
      
    } catch (error) {
      this.log(`Database test failed: ${error.message}`, 'error');
      return null;
    }
  }

  async testAPIEndpoints(tournament) {
    if (!tournament) return;
    
    this.log('\n=== API ENDPOINT TESTS ===');
    
    // Test bracket endpoint with primary key
    try {
      this.log(`Testing bracket API with primary key: ${tournament.id}`);
      const response = await axios.get(`${this.baseURL}/tournaments/${tournament.id}/bracket`);
      this.log(`✅ Bracket API with primary key: SUCCESS`, 'success');
      this.log(`   Brackets returned: ${response.data.has_bracket_data ? 'Yes' : 'No'}`);
      this.log(`   Matches returned: ${response.data.matches?.length || 0}`);
    } catch (error) {
      this.log(`❌ Bracket API with primary key: FAILED - ${error.response?.status} ${error.message}`, 'error');
    }

    // Test bracket endpoint with public ID
    try {
      this.log(`Testing bracket API with public ID: ${tournament.tournament_id}`);
      const response = await axios.get(`${this.baseURL}/tournaments/${tournament.tournament_id}/bracket`);
      this.log(`✅ Bracket API with public ID: SUCCESS`, 'success');
      this.log(`   Brackets returned: ${response.data.has_bracket_data ? 'Yes' : 'No'}`);
      this.log(`   Matches returned: ${response.data.matches?.length || 0}`);
    } catch (error) {
      this.log(`❌ Bracket API with public ID: FAILED - ${error.response?.status} ${error.message}`, 'error');
    }

    // Test draft endpoint with primary key
    try {
      this.log(`Testing draft API with primary key: ${tournament.id}`);
      const response = await axios.get(`${this.baseURL}/draft?tournamentId=${tournament.id}`);
      this.log(`✅ Draft API with primary key: SUCCESS`, 'success');
      this.log(`   Drafts returned: ${response.data?.length || 0}`);
    } catch (error) {
      this.log(`❌ Draft API with primary key: FAILED - ${error.response?.status} ${error.message}`, 'error');
    }

    // Test draft endpoint with public ID
    try {
      this.log(`Testing draft API with public ID: ${tournament.tournament_id}`);
      const response = await axios.get(`${this.baseURL}/draft?tournamentId=${tournament.tournament_id}`);
      this.log(`✅ Draft API with public ID: SUCCESS`, 'success');
      this.log(`   Drafts returned: ${response.data?.length || 0}`);
    } catch (error) {
      this.log(`❌ Draft API with public ID: FAILED - ${error.response?.status} ${error.message}`, 'error');
    }
  }

  async run() {
    this.log('🧪 Starting API state testing...', 'info');
    
    try {
      const tournament = await this.testDatabase();
      await this.testAPIEndpoints(tournament);
      
      this.log('\n✅ API testing complete!', 'success');
      
    } catch (error) {
      this.log(`API testing failed: ${error.message}`, 'error');
      process.exit(1);
    }
  }
}

// Run the test if called directly
if (require.main === module) {
  const tester = new APITester();
  tester.run().then(() => {
    process.exit(0);
  }).catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}

module.exports = APITester;