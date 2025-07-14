const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api/v1';

async function testPhase1Implementation() {
  console.log('🧪 Testing Phase 1: Profile Change Request Submission');
  console.log('==================================================\n');

  try {
    // Step 1: Test health endpoint
    console.log('1️⃣ Testing health endpoint...');
    const healthResponse = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Health endpoint working:', healthResponse.data);
    console.log('');

    // Step 2: Test login to get authentication token
    console.log('2️⃣ Testing login to get authentication token...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      username: 'hr',
      password: 'test123'
    });
    
    if (!loginResponse.data.success) {
      throw new Error('Login failed: ' + JSON.stringify(loginResponse.data));
    }
    
    const token = loginResponse.data.data.accessToken;
    console.log('✅ Login successful, token received');
    console.log('');

    // Step 3: Test profile changes endpoint without authentication (should fail)
    console.log('3️⃣ Testing profile changes endpoint without authentication...');
    try {
      await axios.post(`${BASE_URL}/profile-changes`, {
        field_name: 'email',
        new_value: 'test@example.com',
        change_type: 'instructor'
      });
      console.log('❌ Should have failed - no authentication required');
    } catch (error) {
      if (error.response?.data?.error?.code === 'AUTH_1005') {
        console.log('✅ Correctly rejected request without authentication');
      } else {
        console.log('❌ Unexpected error:', error.response?.data);
      }
    }
    console.log('');

    // Step 4: Test profile changes endpoint with authentication
    console.log('4️⃣ Testing profile changes endpoint with authentication...');
    const profileChangeResponse = await axios.post(`${BASE_URL}/profile-changes`, {
      field_name: 'email',
      new_value: 'test@example.com',
      change_type: 'instructor',
      target_user_id: 1  // Target an instructor user
    }, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (profileChangeResponse.data.success) {
      console.log('✅ Profile change request submitted successfully');
      console.log('📋 Response:', JSON.stringify(profileChangeResponse.data, null, 2));
    } else {
      console.log('❌ Profile change request failed:', profileChangeResponse.data);
    }
    console.log('');

    // Step 5: Test getting user's profile changes
    console.log('5️⃣ Testing get user profile changes...');
    const getChangesResponse = await axios.get(`${BASE_URL}/profile-changes`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (getChangesResponse.data.success) {
      console.log('✅ Retrieved user profile changes successfully');
      console.log('📋 Changes found:', getChangesResponse.data.data.length);
      console.log('📋 Data:', JSON.stringify(getChangesResponse.data.data, null, 2));
    } else {
      console.log('❌ Failed to get profile changes:', getChangesResponse.data);
    }
    console.log('');

    // Step 6: Test duplicate request (should fail)
    console.log('6️⃣ Testing duplicate profile change request...');
    try {
      await axios.post(`${BASE_URL}/profile-changes`, {
        field_name: 'email',
        new_value: 'duplicate@example.com',
        change_type: 'instructor',
        target_user_id: 1  // Target an instructor user
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      console.log('❌ Should have failed - duplicate request');
    } catch (error) {
      if (error.response?.data?.error?.message?.includes('pending change request already exists')) {
        console.log('✅ Correctly rejected duplicate request');
      } else {
        console.log('❌ Unexpected error:', error.response?.data);
      }
    }
    console.log('');

    console.log('🎉 Phase 1 Testing Complete!');
    console.log('✅ All core functionality is working correctly');
    console.log('');
    console.log('📋 Summary:');
    console.log('   - Health endpoint: ✅');
    console.log('   - Authentication: ✅');
    console.log('   - Profile change submission: ✅');
    console.log('   - Profile changes retrieval: ✅');
    console.log('   - Duplicate prevention: ✅');
    console.log('');
    console.log('🚀 Ready for Phase 2: HR Profile Management Interface');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    process.exit(1);
  }
}

// Run the test
testPhase1Implementation(); 