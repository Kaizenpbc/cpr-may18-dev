const axios = require('axios');

async function checkOrganizationUsers() {
  try {
    console.log('🔍 Checking organization users...\n');

    // First, login as admin to get access
    console.log('1. Logging in as admin...');
    const adminLogin = await axios.post('http://localhost:3001/api/v1/auth/login', {
      username: 'admin',
      password: 'test123'
    });

    if (!adminLogin.data.success) {
      console.log('❌ Admin login failed');
      return;
    }

    const adminToken = adminLogin.data.data.accessToken;
    console.log('✅ Admin login successful\n');

    // Get all users to find organization users
    console.log('2. Getting all users...');
    const usersResponse = await axios.get('http://localhost:3001/api/v1/users', {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });

    if (usersResponse.data.success) {
      const users = usersResponse.data.data || [];
      console.log('Raw users response:', JSON.stringify(users, null, 2));
      const orgUsers = Array.isArray(users) ? users.filter(user => user.role === 'organization') : [];
      
      console.log(`Found ${orgUsers.length} organization users:`);
      orgUsers.forEach(user => {
        console.log(`  - Username: ${user.username}, Email: ${user.email}, Organization ID: ${user.organizationId}`);
      });

      if (orgUsers.length > 0) {
        console.log('\n3. Testing organization login with first user...');
        const testOrgUser = orgUsers[0];
        
        try {
          const orgLogin = await axios.post('http://localhost:3001/api/v1/auth/login', {
            username: testOrgUser.username,
            password: 'test123' // Try default password
          });

          if (orgLogin.data.success) {
            console.log(`✅ Organization login successful with ${testOrgUser.username}`);
            console.log(`   Organization ID: ${orgLogin.data.data.user.organizationId}`);
            console.log(`   Organization Name: ${orgLogin.data.data.user.organizationName}`);
          } else {
            console.log(`❌ Organization login failed with ${testOrgUser.username}`);
          }
        } catch (error) {
          console.log(`❌ Organization login error with ${testOrgUser.username}:`, error.response?.data?.message || error.message);
        }
      } else {
        console.log('❌ No organization users found');
      }
    } else {
      console.log('❌ Failed to get users');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkOrganizationUsers(); 