const axios = require('axios');

const API_BASE = 'http://localhost:3001/api/v1';

async function testWithAuth() {
  console.log('🧪 Testing API endpoints with authentication...\n');
  
  try {
    // First, try to login to get a token
    console.log('🔐 Attempting to login...');
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      username: 'instructor',
      password: 'test123'
    });
    
    if (loginResponse.data.success) {
      const token = loginResponse.data.data.accessToken;
      console.log('✅ Login successful, got token');
      
      // Test authenticated endpoints
      const authHeaders = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };
      
      const endpointsToTest = [
        '/instructors/classes',
        '/instructors/availability',
        '/instructors/classes/today'
      ];
      
      for (const endpoint of endpointsToTest) {
        try {
          console.log(`\nTesting authenticated: ${endpoint}`);
          const response = await axios.get(`${API_BASE}${endpoint}`, {
            headers: authHeaders,
            timeout: 5000
          });
          
          if (response.status === 200) {
            console.log(`✅ ${endpoint} - SUCCESS`);
            console.log(`   Data received: ${response.data.success ? 'Yes' : 'No'}`);
          } else {
            console.log(`⚠️  ${endpoint} - STATUS ${response.status}`);
          }
        } catch (error) {
          console.log(`❌ ${endpoint} - ERROR: ${error.response?.status || error.message}`);
        }
      }
      
    } else {
      console.log('❌ Login failed');
    }
    
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('❌ Backend server not running');
    } else {
      console.log('❌ Login error:', error.response?.data || error.message);
    }
  }
  
  console.log('\n🎯 Authentication testing completed!');
}

testWithAuth().catch(console.error); 