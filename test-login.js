const axios = require('axios');

async function testLogin() {
  try {
    console.log('Testing login...');
    const response = await axios.post('http://localhost:3001/api/v1/auth/login', {
      username: 'hr',
      password: 'test123'
    });
    
    console.log('Login response:', JSON.stringify(response.data, null, 2));
    
    if (response.data.success && response.data.data) {
      console.log('✅ Login successful');
      console.log('Token type:', typeof response.data.data.accessToken);
      console.log('Token length:', response.data.data.accessToken?.length);
      console.log('Token preview:', response.data.data.accessToken?.substring(0, 20) + '...');
    } else {
      console.log('❌ Login failed:', response.data);
    }
  } catch (error) {
    console.error('❌ Login error:', error.response?.data || error.message);
  }
}

testLogin(); 