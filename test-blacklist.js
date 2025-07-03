const axios = require('axios');

async function testBlacklist() {
  try {
    console.log('🔍 Testing Token Blacklist...\n');

    // 1. Login as admin
    console.log('1. Logging in as admin...');
    const loginResponse = await axios.post('http://localhost:3001/api/v1/auth/login', {
      username: 'admin',
      password: 'test123'
    });

    if (!loginResponse.data.success) {
      console.log('❌ Admin login failed:', loginResponse.data.message);
      return;
    }

    const token = loginResponse.data.data.accessToken;
    const headers = { 'Authorization': `Bearer ${token}` };
    console.log('✅ Admin login successful');
    console.log('   Token:', token.substring(0, 20) + '...');

    // 2. Verify authentication before logout
    console.log('\n2. Verifying authentication before logout...');
    try {
      const authResponse = await axios.get('http://localhost:3001/api/v1/auth/me', { headers });
      console.log('✅ Authentication verified');
      console.log('   User:', authResponse.data.data.user.username);
    } catch (error) {
      console.log('❌ Authentication check failed:', error.response?.data?.message);
      return;
    }

    // 3. Perform logout
    console.log('\n3. Performing logout...');
    try {
      const logoutResponse = await axios.post('http://localhost:3001/api/v1/auth/logout', {}, { headers });
      console.log('✅ Logout API call successful');
      console.log('   Response:', logoutResponse.data);
    } catch (error) {
      console.log('❌ Logout API failed:', error.response?.data?.message || error.message);
      return;
    }

    // 4. Wait a moment for the blacklist to be updated
    console.log('\n4. Waiting for blacklist update...');
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 5. Test authentication immediately after logout (with same token)
    console.log('\n5. Testing authentication after logout (with same token)...');
    try {
      const authResponse = await axios.get('http://localhost:3001/api/v1/auth/me', { headers });
      console.log('⚠️  User still authenticated with same token');
      console.log('   User:', authResponse.data.data.user.username);
      console.log('   ❌ BLACKLIST NOT WORKING - Token should be invalidated');
    } catch (error) {
      console.log('✅ User properly logged out (auth check failed)');
      console.log('   Status:', error.response?.status);
      console.log('   Message:', error.response?.data?.message);
      console.log('   ✅ BLACKLIST WORKING - Token properly invalidated');
    }

    // 6. Test with a new login
    console.log('\n6. Testing with a new login...');
    try {
      const newLoginResponse = await axios.post('http://localhost:3001/api/v1/auth/login', {
        username: 'admin',
        password: 'test123'
      });

      if (newLoginResponse.data.success) {
        const newToken = newLoginResponse.data.data.accessToken;
        const newHeaders = { 'Authorization': `Bearer ${newToken}` };
        console.log('✅ New login successful');
        console.log('   New token:', newToken.substring(0, 20) + '...');

        // Test authentication with new token
        const newAuthResponse = await axios.get('http://localhost:3001/api/v1/auth/me', { headers: newHeaders });
        console.log('✅ Authentication with new token successful');
        console.log('   User:', newAuthResponse.data.data.user.username);
      }
    } catch (error) {
      console.log('❌ New login failed:', error.response?.data?.message);
    }

    console.log('\n🎉 Blacklist Test Complete!');

  } catch (error) {
    console.error('❌ Test error:', error.response?.data || error.message);
  }
}

testBlacklist(); 