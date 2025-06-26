const axios = require('axios');

async function testLogin() {
  try {
    console.log('🔐 Testing login endpoint...\n');
    
    const response = await axios.post('http://localhost:3001/api/v1/auth/login', {
      username: 'instructor',
      password: 'test123'
    });
    
    console.log('✅ Login successful!');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('❌ Login failed:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

testLogin(); 