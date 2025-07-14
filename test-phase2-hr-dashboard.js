const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api/v1';

async function testHRDashboard() {
  console.log('🧪 Testing Phase 2 - HR Dashboard API');
  console.log('=====================================\n');

  try {
    // Step 1: Login as HR user
    console.log('1. Logging in as HR user...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      username: 'hr',
      password: 'test123'
    });

    console.log('Login response:', JSON.stringify(loginResponse.data, null, 2));

    if (!loginResponse.data.success) {
      throw new Error('Login failed');
    }

    // Extract token from the correct field
    const token = loginResponse.data.data.accessToken;
    if (!token) {
      throw new Error('No token received from login');
    }

    console.log('✅ Login successful');
    console.log('Token received:', token.substring(0, 50) + '...\n');

    // Step 2: Test HR Dashboard Stats
    console.log('2. Testing HR Dashboard Stats...');
    const statsResponse = await axios.get(`${BASE_URL}/hr-dashboard/stats`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (statsResponse.data.success) {
      console.log('✅ Dashboard stats retrieved successfully');
      console.log('   - Pending Approvals:', statsResponse.data.data.pendingApprovals);
      console.log('   - Active Instructors:', statsResponse.data.data.activeInstructors);
      console.log('   - Organizations:', statsResponse.data.data.organizations);
      console.log('   - Expiring Certifications:', statsResponse.data.data.expiringCertifications);
    } else {
      throw new Error('Failed to get dashboard stats');
    }

    // Step 3: Test Instructors List
    console.log('\n3. Testing Instructors List...');
    const instructorsResponse = await axios.get(`${BASE_URL}/hr-dashboard/instructors`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (instructorsResponse.data.success) {
      console.log('✅ Instructors list retrieved successfully');
      console.log('   - Total instructors:', instructorsResponse.data.data.pagination.total);
      console.log('   - Instructors returned:', instructorsResponse.data.data.instructors.length);
    } else {
      throw new Error('Failed to get instructors list');
    }

    // Step 4: Test Organizations List
    console.log('\n4. Testing Organizations List...');
    const organizationsResponse = await axios.get(`${BASE_URL}/hr-dashboard/organizations`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (organizationsResponse.data.success) {
      console.log('✅ Organizations list retrieved successfully');
      console.log('   - Total organizations:', organizationsResponse.data.data.pagination.total);
      console.log('   - Organizations returned:', organizationsResponse.data.data.organizations.length);
    } else {
      throw new Error('Failed to get organizations list');
    }

    // Step 5: Test Pending Changes
    console.log('\n5. Testing Pending Changes...');
    const pendingChangesResponse = await axios.get(`${BASE_URL}/hr-dashboard/pending-changes`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (pendingChangesResponse.data.success) {
      console.log('✅ Pending changes retrieved successfully');
      console.log('   - Total pending changes:', pendingChangesResponse.data.data.pagination.total);
      console.log('   - Changes returned:', pendingChangesResponse.data.data.pendingChanges.length);
    } else {
      throw new Error('Failed to get pending changes');
    }

    // Step 6: Test User Profile (if there are instructors)
    if (instructorsResponse.data.data.instructors.length > 0) {
      console.log('\n6. Testing User Profile Details...');
      const firstInstructor = instructorsResponse.data.data.instructors[0];
      const userProfileResponse = await axios.get(`${BASE_URL}/hr-dashboard/user/${firstInstructor.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (userProfileResponse.data.success) {
        console.log('✅ User profile details retrieved successfully');
        console.log('   - Username:', userProfileResponse.data.data.user.username);
        console.log('   - Profile changes:', userProfileResponse.data.data.profileChanges.length);
        console.log('   - Course history:', userProfileResponse.data.data.courseHistory.length);
      } else {
        throw new Error('Failed to get user profile details');
      }
    }

    console.log('\n🎉 Phase 2 HR Dashboard API Tests Completed Successfully!');
    console.log('✅ All endpoints are working correctly');
    console.log('✅ Real data is being returned');
    console.log('✅ Frontend can now display comprehensive HR dashboard');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    process.exit(1);
  }
}

testHRDashboard(); 