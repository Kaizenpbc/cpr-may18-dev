const axios = require('axios');

async function debugOrganizationProfile() {
  try {
    console.log('🔍 Debugging Organization Profile Endpoints...\n');

    // 1. Login as organization user
    console.log('1. Logging in as orguser...');
    const loginResponse = await axios.post('http://localhost:3001/api/v1/auth/login', {
      username: 'orguser',
      password: 'test123'
    });

    if (!loginResponse.data.success) {
      console.log('❌ Login failed');
      console.log('Login response:', JSON.stringify(loginResponse.data, null, 2));
      return;
    }

    const token = loginResponse.data.data.accessToken;
    const headers = { 'Authorization': `Bearer ${token}` };
    console.log('✅ Login successful\n');

    // 2. Test GET /organization/profile
    console.log('2. Testing GET /organization/profile...');
    try {
      const profileGet = await axios.get('http://localhost:3001/api/v1/organization/profile', { headers });
      console.log('✅ GET /organization/profile response:');
      console.log(JSON.stringify(profileGet.data, null, 2));
    } catch (error) {
      console.log('❌ GET /organization/profile failed:');
      console.log('Status:', error.response?.status);
      console.log('Error:', error.response?.data || error.message);
    }

    console.log('\n3. Testing PUT /organization/profile...');
    try {
      const profileUpdate = await axios.put('http://localhost:3001/api/v1/organization/profile', {
        name: 'Test Organization Updated',
        address: '123 Test Street',
        phone: '555-1234',
        email: 'test@organization.com'
      }, { headers });
      console.log('✅ PUT /organization/profile response:');
      console.log(JSON.stringify(profileUpdate.data, null, 2));
    } catch (error) {
      console.log('❌ PUT /organization/profile failed:');
      console.log('Status:', error.response?.status);
      console.log('Error:', error.response?.data || error.message);
    }

    // 4. Check what organization routes exist
    console.log('\n4. Checking available organization routes...');
    try {
      const routesResponse = await axios.get('http://localhost:3001/api/v1/organization', { headers });
      console.log('✅ GET /organization response:');
      console.log(JSON.stringify(routesResponse.data, null, 2));
    } catch (error) {
      console.log('❌ GET /organization failed:');
      console.log('Status:', error.response?.status);
      console.log('Error:', error.response?.data || error.message);
    }

  } catch (error) {
    console.error('❌ Debug error:', error.response?.data || error.message);
  }
}

debugOrganizationProfile(); 