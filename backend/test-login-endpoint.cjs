const axios = require('axios');

async function testLogin() {
  try {
    console.log('🧪 Testing login endpoint...');
    
    const loginData = {
      username: 'sysadmin',
      password: 'test1234'
    };
    
    console.log('📤 Sending login request:', { username: loginData.username, password: '[REDACTED]' });
    
    const response = await axios.post('http://localhost:3001/api/v1/auth/login', loginData, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Login successful!');
    console.log('📦 Response:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.log('❌ Login failed!');
    if (error.response) {
      console.log('📊 Status:', error.response.status);
      console.log('📦 Response:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.log('🚫 Network error:', error.message);
    }
  }
}

testLogin(); 