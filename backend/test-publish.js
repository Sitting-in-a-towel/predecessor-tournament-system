const axios = require('axios');

async function testPublishBracket() {
  try {
    const tournamentId = '67e81a0d-1165-4481-ad58-85da372f86d5';
    const apiUrl = 'http://localhost:3001/api';
    
    console.log('Testing bracket publish...');
    console.log('Tournament ID:', tournamentId);
    
    // First, get current bracket data
    const getResponse = await axios.get(`${apiUrl}/tournaments/${tournamentId}/bracket`);
    console.log('Current published status:', getResponse.data.bracket?.is_published);
    
    if (getResponse.data.bracket?.bracket_data) {
      // Test publishing with explicit true value
      const publishData = {
        bracketData: getResponse.data.bracket.bracket_data,
        lockedSlots: getResponse.data.bracket.locked_slots || [],
        isPublished: true,  // Explicit true
        seedingMode: getResponse.data.bracket.seeding_mode || 'random',
        seriesLength: getResponse.data.bracket.series_length || 1
      };
      
      console.log('Sending publish request with isPublished:', publishData.isPublished, typeof publishData.isPublished);
      
      const postResponse = await axios.post(`${apiUrl}/tournaments/${tournamentId}/bracket`, publishData, {
        withCredentials: true,
        headers: {
          'Cookie': 'connect.sid=test-session' // Mock session for test
        }
      });
      
      console.log('POST response status:', postResponse.status);
      console.log('POST response bracket is_published:', postResponse.data.bracket?.is_published);
      
      // Verify the save
      const verifyResponse = await axios.get(`${apiUrl}/tournaments/${tournamentId}/bracket`);
      console.log('After save - published status:', verifyResponse.data.bracket?.is_published);
      
    } else {
      console.log('No bracket data found');
    }
    
  } catch (error) {
    console.error('Test error:', error.response?.data || error.message);
  }
}

testPublishBracket();