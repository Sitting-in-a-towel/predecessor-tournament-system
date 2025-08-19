const axios = require('axios');

async function testAdminAuth() {
  console.log('🧪 Testing admin authentication flow...\n');
  
  try {
    // Step 1: Login as test admin
    console.log('Step 1: Logging in as test admin...');
    const loginResponse = await axios.post('http://localhost:3001/api/test-auth/login-test-admin');
    
    if (loginResponse.status === 200) {
      console.log('✅ Test admin login successful');
      console.log('Session created:', loginResponse.data.sessionId);
      
      // Extract cookies
      const cookies = loginResponse.headers['set-cookie'];
      console.log('Cookies:', cookies);
      
      // Step 2: Test admin dashboard access
      console.log('\nStep 2: Testing admin dashboard access...');
      const dashboardResponse = await axios.get('http://localhost:3001/api/admin/dashboard', {
        headers: {
          Cookie: cookies ? cookies.join('; ') : ''
        }
      });
      
      console.log('✅ Admin dashboard access successful');
      console.log('Statistics received:', JSON.stringify(dashboardResponse.data, null, 2));
      
    } else {
      console.log('❌ Test admin login failed:', loginResponse.status);
    }
    
  } catch (error) {
    console.log('❌ Test failed:');
    console.log('Status:', error.response?.status);
    console.log('Error:', error.response?.data?.error || error.message);
    console.log('Details:', error.response?.data?.details);
  }
}

testAdminAuth();