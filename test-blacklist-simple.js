const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api/v1';

async function testBlacklist() {
  try {
    console.log('🔍 Testing Token Blacklist Functionality...\n');

    // 1. Login to get a token
    console.log('1. Logging in...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      username: 'admin',
      password: 'test123'
    });

    const token = loginResponse.data.data.accessToken;
    console.log('✅ Login successful');
    console.log(`   Token: ${token.substring(0, 20)}...`);

    // 2. Test authentication with the token
    console.log('\n2. Testing authentication...');
    const authResponse = await axios.get(`${BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Authentication successful');
    console.log(`   User: ${authResponse.data.data.username}`);

    // 3. Logout to blacklist the token
    console.log('\n3. Logging out...');
    await axios.post(`${BASE_URL}/auth/logout`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Logout successful');

    // 4. Wait a moment for the blacklist to be updated
    console.log('\n4. Waiting for blacklist update...');
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 5. Test authentication again with the same token
    console.log('\n5. Testing authentication after logout...');
    try {
      await axios.get(`${BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('❌ FAILED: Token still works after logout');
    } catch (error) {
      if (error.response && error.response.status === 401) {
        console.log('✅ SUCCESS: Token properly invalidated');
      } else {
        console.log('❌ Unexpected error:', error.message);
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('   Response:', error.response.data);
    }
  }
}

testBlacklist(); 