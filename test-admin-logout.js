const axios = require('axios');

async function testAdminLogout() {
  try {
    console.log('🔍 Testing Admin Logout Functionality...\n');

    // 1. Test with a working user first (orguser)
    console.log('1. Testing with organization user first...');
    const orgLoginResponse = await axios.post('http://localhost:3001/api/v1/auth/login', {
      username: 'orguser',
      password: 'test123'
    });

    if (!orgLoginResponse.data.success) {
      console.log('❌ Organization user login failed:', orgLoginResponse.data.message);
      return;
    }

    const orgToken = orgLoginResponse.data.data.accessToken;
    const orgHeaders = { 'Authorization': `Bearer ${orgToken}` };
    console.log('✅ Organization user login successful');
    console.log('   User:', orgLoginResponse.data.data.user.username);
    console.log('   Role:', orgLoginResponse.data.data.user.role);

    // 2. Test organization user logout
    console.log('\n2. Testing organization user logout...');
    try {
      const orgLogoutResponse = await axios.post('http://localhost:3001/api/v1/auth/logout', {}, { headers: orgHeaders });
      console.log('✅ Organization user logout API call successful');
      console.log('   Response:', orgLogoutResponse.data);
    } catch (error) {
      console.log('❌ Organization user logout API failed:');
      console.log('   Status:', error.response?.status);
      console.log('   Message:', error.response?.data?.message || error.message);
    }

    // 3. Test admin login with different passwords
    console.log('\n3. Testing admin login with different passwords...');
    const adminPasswords = ['admin123', 'admin', 'password', 'test123'];
    
    for (const password of adminPasswords) {
      try {
        console.log(`   Trying admin / ${password}...`);
        const adminLoginResponse = await axios.post('http://localhost:3001/api/v1/auth/login', {
          username: 'admin',
          password: password
        });

        if (adminLoginResponse.data.success) {
          console.log(`✅ Admin login successful with password: ${password}`);
          const adminToken = adminLoginResponse.data.data.accessToken;
          const adminHeaders = { 'Authorization': `Bearer ${adminToken}` };
          
          // Test admin logout
          console.log('\n4. Testing admin logout...');
          try {
            const adminLogoutResponse = await axios.post('http://localhost:3001/api/v1/auth/logout', {}, { headers: adminHeaders });
            console.log('✅ Admin logout API call successful');
            console.log('   Response:', adminLogoutResponse.data);
          } catch (error) {
            console.log('❌ Admin logout API failed:');
            console.log('   Status:', error.response?.status);
            console.log('   Message:', error.response?.data?.message || error.message);
          }
          break;
        }
      } catch (error) {
        console.log(`   ❌ Failed with password: ${password}`);
      }
    }

    // 5. Test if user is still authenticated after logout
    console.log('\n5. Testing authentication after logout...');
    try {
      const authCheckResponse = await axios.get('http://localhost:3001/api/v1/auth/me', { headers: orgHeaders });
      console.log('⚠️  User still authenticated after logout');
      console.log('   Response:', authCheckResponse.data);
    } catch (error) {
      console.log('✅ User properly logged out (auth check failed)');
      console.log('   Status:', error.response?.status);
      console.log('   Message:', error.response?.data?.message || error.message);
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

    console.log('\n🎉 Admin Logout Test Complete!');
    console.log('\n📝 Manual Testing Steps:');
    console.log('1. Open http://localhost:5173 in browser');
    console.log('2. Login as admin (try different passwords)');
    console.log('3. Try to logout from the admin interface');
    console.log('4. Check if you are redirected to login page');

  } catch (error) {
    console.error('❌ Test error:', error.response?.data || error.message);
  }
}

testAdminLogout(); 