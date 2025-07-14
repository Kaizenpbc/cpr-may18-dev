const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001/api/v1';

async function testHRLogin() {
  try {
    console.log('🧪 Testing HR user login and access...\n');

    // Test 1: Login as HR user
    console.log('1️⃣ Testing HR login...');
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      username: 'hr',
      password: 'test123'
    });

    if (loginResponse.data.success) {
      console.log('✅ HR login successful!');
      console.log(`   - User ID: ${loginResponse.data.data.user.id}`);
      console.log(`   - Username: ${loginResponse.data.data.user.username}`);
      console.log(`   - Role: ${loginResponse.data.data.user.role}`);
      
      const token = loginResponse.data.data.accessToken || loginResponse.data.data.token;
      if (token) {
        console.log(`   - Token: ${token.substring(0, 20)}...`);
      } else {
        console.log('   - Token: Not found in response');
        console.log('   - Response structure:', JSON.stringify(loginResponse.data, null, 2));
        return;
      }
      
      // Test 2: Access HR dashboard
      console.log('\n2️⃣ Testing HR dashboard access...');
      const dashboardResponse = await axios.get(`${API_BASE_URL}/hr/dashboard`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (dashboardResponse.data.success) {
        console.log('✅ HR dashboard access successful!');
        console.log('   Dashboard data:');
        console.log(`   - Pending Approvals: ${dashboardResponse.data.data.pendingApprovals}`);
        console.log(`   - Active Instructors: ${dashboardResponse.data.data.activeInstructors}`);
        console.log(`   - Organizations: ${dashboardResponse.data.data.organizations}`);
        console.log(`   - Expiring Certifications: ${dashboardResponse.data.data.expiringCertifications}`);
      } else {
        console.log('❌ HR dashboard access failed:', dashboardResponse.data.message);
      }

      // Test 3: Access profile changes
      console.log('\n3️⃣ Testing profile changes access...');
      const profileChangesResponse = await axios.get(`${API_BASE_URL}/hr/profile-changes`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (profileChangesResponse.data.success) {
        console.log('✅ Profile changes access successful!');
        console.log(`   - Pending changes: ${profileChangesResponse.data.data.length}`);
      } else {
        console.log('❌ Profile changes access failed:', profileChangesResponse.data.message);
      }

      // Test 4: Test unauthorized access (should fail)
      console.log('\n4️⃣ Testing unauthorized endpoint access...');
      try {
        await axios.get(`${API_BASE_URL}/instructor/dashboard`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        console.log('❌ Should have failed - HR accessing instructor endpoint');
      } catch (error) {
        if (error.response?.status === 403) {
          console.log('✅ Correctly blocked from instructor endpoint (403 Forbidden)');
        } else {
          console.log('⚠️  Unexpected error:', error.response?.status, error.response?.data?.message);
        }
      }

    } else {
      console.log('❌ HR login failed:', loginResponse.data.message);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data?.message || error.message);
  }
}

async function main() {
  try {
    await testHRLogin();
    console.log('\n🎉 HR user test completed!');
  } catch (error) {
    console.error('❌ Test suite failed:', error);
  }
}

if (require.main === module) {
  main();
} 