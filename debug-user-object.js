const axios = require('axios');

async function debugUserObject() {
  try {
    console.log('🔍 Debugging User Object...\n');

    // Login as organization user
    console.log('1. Logging in as orguser...');
    const loginResponse = await axios.post('http://localhost:3001/api/v1/auth/login', {
      username: 'orguser',
      password: 'test123'
    });

    if (!loginResponse.data.success) {
      console.log('❌ Login failed');
      return;
    }

    console.log('✅ Login successful');
    console.log('\n2. Complete login response:');
    console.log(JSON.stringify(loginResponse.data, null, 2));

    const token = loginResponse.data.data.accessToken;
    const headers = { 'Authorization': `Bearer ${token}` };

    // Test a simple endpoint to see what req.user contains
    console.log('\n3. Testing GET /organization to see what req.user contains...');
    try {
      const orgResponse = await axios.get('http://localhost:3001/api/v1/organization', { headers });
      console.log('✅ GET /organization successful');
    } catch (error) {
      console.log('❌ GET /organization failed:', error.response?.data || error.message);
    }

  } catch (error) {
    console.error('❌ Debug error:', error.message);
  }
}

debugUserObject(); 