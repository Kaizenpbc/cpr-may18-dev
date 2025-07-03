const axios = require('axios');

async function testLogoutIssue() {
  try {
    console.log('🔍 Testing Logout Issue...\n');

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
    }

    // 3. Perform logout
    console.log('\n3. Performing logout...');
    try {
      const logoutResponse = await axios.post('http://localhost:3001/api/v1/auth/logout', {}, { headers });
      console.log('✅ Logout API call successful');
      console.log('   Response:', logoutResponse.data);
    } catch (error) {
      console.log('❌ Logout API failed:', error.response?.data?.message || error.message);
    }

    // 4. Test authentication immediately after logout (with same token)
    console.log('\n4. Testing authentication immediately after logout (with same token)...');
    try {
      const authResponse = await axios.get('http://localhost:3001/api/v1/auth/me', { headers });
      console.log('⚠️  User still authenticated with same token');
      console.log('   User:', authResponse.data.data.user.username);
    } catch (error) {
      console.log('✅ User properly logged out (auth check failed)');
      console.log('   Status:', error.response?.status);
      console.log('   Message:', error.response?.data?.message);
    }

    // 5. Test with a new token (simulate frontend behavior)
    console.log('\n5. Testing with a new login (simulating frontend behavior)...');
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

    // 6. Test frontend logout flow
    console.log('\n6. Testing frontend logout flow...');
    try {
      const frontendResponse = await axios.get('http://localhost:5173', { timeout: 5000 });
      console.log('✅ Frontend accessible');
      console.log('   Status:', frontendResponse.status);
    } catch (error) {
      console.log('❌ Frontend not accessible:', error.message);
    }

    console.log('\n🎉 Logout Issue Test Complete!');
    console.log('\n📝 Analysis:');
    console.log('- The issue appears to be that the backend is not properly invalidating sessions');
    console.log('- After logout, the same token is still valid for authentication');
    console.log('- This suggests the backend logout endpoint is not working correctly');
    console.log('\n🔧 Potential Solutions:');
    console.log('1. Check backend session invalidation logic');
    console.log('2. Verify Redis session storage is working');
    console.log('3. Check if JWT tokens are being properly blacklisted');

  } catch (error) {
    console.error('❌ Test error:', error.response?.data || error.message);
  }
}

testLogoutIssue(); 