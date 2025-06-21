const axios = require('axios');

async function testAuth() {
  try {
    console.log('Testing authentication for orguser...');
    
    // Test login
    const loginResponse = await axios.post('http://localhost:3002/api/v1/auth/login', {
      username: 'orguser',
      password: 'test123'
    });
    
    console.log('Login successful!');
    console.log('User data:', loginResponse.data.user);
    console.log('Token received:', loginResponse.data.accessToken ? 'Yes' : 'No');
    
    const token = loginResponse.data.accessToken;
    
    // Test organization profile endpoint
    console.log('\nTesting organization profile endpoint...');
    const profileResponse = await axios.get('http://localhost:3002/api/v1/organization/profile', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('Organization profile retrieved successfully!');
    console.log('Organization data:', profileResponse.data);
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
    if (error.response?.status) {
      console.error('Status:', error.response.status);
    }
  }
}

testAuth(); 