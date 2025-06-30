const axios = require('axios');

async function testSysadminLogin() {
  try {
    console.log('🔐 Testing sysadmin login...\n');
    
    console.log('1. Testing with username: sysadmin, password: test123');
    const response = await axios.post('http://localhost:3001/api/v1/auth/login', {
      username: 'sysadmin',
      password: 'test123'
    });
    
    console.log('✅ Login successful!');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
    if (response.data.data && response.data.data.user) {
      console.log('\nUser details:');
      console.log(`- Username: ${response.data.data.user.username}`);
      console.log(`- Role: ${response.data.data.user.role}`);
      console.log(`- Email: ${response.data.data.user.email}`);
    }
    
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

testSysadminLogin(); 