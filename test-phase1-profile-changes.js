const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001/api/v1';

async function testPhase1() {
  try {
    console.log('🧪 Testing Phase 1: Profile Change Request Submission\n');

    // Test 1: Login as an instructor
    console.log('1️⃣ Testing instructor login...');
    const instructorLogin = await axios.post(`${API_BASE_URL}/auth/login`, {
      username: 'instructor',
      password: 'test123'
    });

    if (!instructorLogin.data.success) {
      console.log('❌ Instructor login failed:', instructorLogin.data.message);
      return;
    }

    console.log('✅ Instructor login successful!');
    const instructorToken = instructorLogin.data.data.accessToken || instructorLogin.data.data.token;

    // Test 2: Submit a profile change request
    console.log('\n2️⃣ Testing profile change request submission...');
    const changeRequest = {
      field_name: 'name',
      new_value: 'John Updated Doe',
      change_type: 'instructor'
    };

    const submitResponse = await axios.post(`${API_BASE_URL}/profile-changes`, changeRequest, {
      headers: { Authorization: `Bearer ${instructorToken}` }
    });

    if (submitResponse.data.success) {
      console.log('✅ Profile change request submitted successfully!');
      console.log(`   - Request ID: ${submitResponse.data.data.id}`);
      console.log(`   - Field: ${submitResponse.data.data.field_name}`);
      console.log(`   - New Value: ${submitResponse.data.data.new_value}`);
      console.log(`   - Status: ${submitResponse.data.data.status}`);
    } else {
      console.log('❌ Profile change submission failed:', submitResponse.data.message);
    }

    // Test 3: Get user's profile changes
    console.log('\n3️⃣ Testing get user profile changes...');
    const getChangesResponse = await axios.get(`${API_BASE_URL}/profile-changes`, {
      headers: { Authorization: `Bearer ${instructorToken}` }
    });

    if (getChangesResponse.data.success) {
      console.log('✅ Profile changes retrieved successfully!');
      console.log(`   - Number of changes: ${getChangesResponse.data.data.length}`);
      if (getChangesResponse.data.data.length > 0) {
        const latestChange = getChangesResponse.data.data[0];
        console.log(`   - Latest change: ${latestChange.field_name} → ${latestChange.new_value} (${latestChange.status})`);
      }
    } else {
      console.log('❌ Get profile changes failed:', getChangesResponse.data.message);
    }

    // Test 4: Try to submit duplicate request (should fail)
    console.log('\n4️⃣ Testing duplicate request prevention...');
    try {
      await axios.post(`${API_BASE_URL}/profile-changes`, changeRequest, {
        headers: { Authorization: `Bearer ${instructorToken}` }
      });
      console.log('❌ Should have failed - duplicate request');
    } catch (error) {
      if (error.response?.status === 400) {
        console.log('✅ Correctly prevented duplicate request (400 Bad Request)');
        console.log(`   - Error: ${error.response.data.message}`);
      } else {
        console.log('⚠️  Unexpected error:', error.response?.status, error.response?.data?.message);
      }
    }

    // Test 5: Login as HR and check pending changes
    console.log('\n5️⃣ Testing HR access to pending changes...');
    const hrLogin = await axios.post(`${API_BASE_URL}/auth/login`, {
      username: 'hr',
      password: 'test123'
    });

    if (hrLogin.data.success) {
      console.log('✅ HR login successful!');
      const hrToken = hrLogin.data.data.accessToken || hrLogin.data.data.token;

      const pendingChangesResponse = await axios.get(`${API_BASE_URL}/hr/profile-changes`, {
        headers: { Authorization: `Bearer ${hrToken}` }
      });

      if (pendingChangesResponse.data.success) {
        console.log('✅ HR can access pending changes!');
        console.log(`   - Pending changes: ${pendingChangesResponse.data.data.length}`);
        if (pendingChangesResponse.data.data.length > 0) {
          const pendingChange = pendingChangesResponse.data.data[0];
          console.log(`   - Change: ${pendingChange.field_name} → ${pendingChange.new_value}`);
          console.log(`   - User: ${pendingChange.username} (${pendingChange.role})`);
        }
      } else {
        console.log('❌ HR access to pending changes failed:', pendingChangesResponse.data.message);
      }
    } else {
      console.log('❌ HR login failed:', hrLogin.data.message);
    }

    console.log('\n🎉 Phase 1 testing completed!');

  } catch (error) {
    console.error('❌ Phase 1 test failed:', error.response?.data?.message || error.message);
  }
}

async function main() {
  try {
    await testPhase1();
  } catch (error) {
    console.error('❌ Test suite failed:', error);
  }
}

if (require.main === module) {
  main();
} 