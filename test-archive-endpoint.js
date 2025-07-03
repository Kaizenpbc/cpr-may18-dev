const axios = require('axios');

async function testArchiveEndpoint() {
  try {
    console.log('🔍 Testing Organization Archive Endpoint...\n');

    // 1. Login as organization user
    console.log('1. Logging in as orguser...');
    const loginResponse = await axios.post('http://localhost:3001/api/v1/auth/login', {
      username: 'orguser',
      password: 'test123'
    });

    if (!loginResponse.data.success) {
      console.log('❌ Login failed');
      return;
    }

    const token = loginResponse.data.data.accessToken;
    const headers = { 'Authorization': `Bearer ${token}` };
    console.log('✅ Login successful\n');

    // 2. Test GET /organization/archive
    console.log('2. Testing GET /organization/archive...');
    try {
      const archiveResponse = await axios.get('http://localhost:3001/api/v1/organization/archive', { headers });
      console.log('✅ GET /organization/archive response:');
      console.log('Status:', archiveResponse.status);
      console.log('Data length:', archiveResponse.data.data?.length || 0);
      console.log('Sample data:', JSON.stringify(archiveResponse.data.data?.[0] || 'No archived courses', null, 2));
    } catch (error) {
      console.log('❌ GET /organization/archive failed:');
      console.log('Status:', error.response?.status);
      console.log('Error:', error.response?.data || error.message);
    }

  } catch (error) {
    console.error('❌ Test error:', error.response?.data || error.message);
  }
}

testArchiveEndpoint(); 