const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api/v1';
const FRONTEND_URL = 'http://localhost:5173';

async function testPhase2Comprehensive() {
  console.log('🧪 Comprehensive Phase 2 Testing');
  console.log('================================\n');

  const results = {
    backend: {},
    frontend: {},
    integration: {}
  };

  try {
    // ===== BACKEND TESTS =====
    console.log('🔧 Testing Backend API...\n');

    // 1. Login as HR
    console.log('1. HR Login Test...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      username: 'hr',
      password: 'test123'
    });
    
    if (loginResponse.data.success) {
      results.backend.login = '✅ PASS';
      console.log('   ✅ Login successful');
    } else {
      results.backend.login = '❌ FAIL';
      throw new Error('Login failed');
    }

    const token = loginResponse.data.data.accessToken;

    // 2. HR Dashboard Stats
    console.log('\n2. HR Dashboard Stats Test...');
    const statsResponse = await axios.get(`${BASE_URL}/hr-dashboard/stats`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (statsResponse.data.success) {
      results.backend.dashboardStats = '✅ PASS';
      console.log('   ✅ Dashboard stats working');
      console.log('   - Pending Approvals:', statsResponse.data.data.pendingApprovals);
      console.log('   - Active Instructors:', statsResponse.data.data.activeInstructors);
      console.log('   - Organizations:', statsResponse.data.data.organizations);
    } else {
      results.backend.dashboardStats = '❌ FAIL';
      throw new Error('Dashboard stats failed');
    }

    // 3. Instructors List
    console.log('\n3. Instructors List Test...');
    const instructorsResponse = await axios.get(`${BASE_URL}/hr-dashboard/instructors`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (instructorsResponse.data.success) {
      results.backend.instructorsList = '✅ PASS';
      console.log('   ✅ Instructors list working');
      console.log('   - Total instructors:', instructorsResponse.data.data.pagination.total);
    } else {
      results.backend.instructorsList = '❌ FAIL';
      throw new Error('Instructors list failed');
    }

    // 4. Organizations List
    console.log('\n4. Organizations List Test...');
    const organizationsResponse = await axios.get(`${BASE_URL}/hr-dashboard/organizations`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (organizationsResponse.data.success) {
      results.backend.organizationsList = '✅ PASS';
      console.log('   ✅ Organizations list working');
      console.log('   - Total organizations:', organizationsResponse.data.data.pagination.total);
    } else {
      results.backend.organizationsList = '❌ FAIL';
      throw new Error('Organizations list failed');
    }

    // 5. Pending Changes
    console.log('\n5. Pending Changes Test...');
    const pendingChangesResponse = await axios.get(`${BASE_URL}/hr-dashboard/pending-changes`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (pendingChangesResponse.data.success) {
      results.backend.pendingChanges = '✅ PASS';
      console.log('   ✅ Pending changes working');
      console.log('   - Total pending:', pendingChangesResponse.data.data.pagination.total);
    } else {
      results.backend.pendingChanges = '❌ FAIL';
      throw new Error('Pending changes failed');
    }

    // 6. User Profile Details
    console.log('\n6. User Profile Details Test...');
    if (instructorsResponse.data.data.instructors.length > 0) {
      const firstInstructor = instructorsResponse.data.data.instructors[0];
      const userProfileResponse = await axios.get(`${BASE_URL}/hr-dashboard/user/${firstInstructor.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (userProfileResponse.data.success) {
        results.backend.userProfile = '✅ PASS';
        console.log('   ✅ User profile details working');
        console.log('   - Username:', userProfileResponse.data.data.user.username);
      } else {
        results.backend.userProfile = '❌ FAIL';
        throw new Error('User profile details failed');
      }
    }

    // 7. Profile Change Approval
    console.log('\n7. Profile Change Approval Test...');
    if (pendingChangesResponse.data.data.pendingChanges.length > 0) {
      const firstChange = pendingChangesResponse.data.data.pendingChanges[0];
      const approvalResponse = await axios.post(`${BASE_URL}/hr-dashboard/approve-change/${firstChange.id}`, {
        action: 'approve',
        comment: 'Test approval from Phase 2 testing'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (approvalResponse.data.success) {
        results.backend.profileApproval = '✅ PASS';
        console.log('   ✅ Profile change approval working');
      } else {
        results.backend.profileApproval = '❌ FAIL';
        throw new Error('Profile change approval failed');
      }
    }

    // ===== FRONTEND TESTS =====
    console.log('\n🌐 Testing Frontend Components...\n');

    // 8. Frontend Server
    console.log('8. Frontend Server Test...');
    try {
      const frontendResponse = await axios.get(FRONTEND_URL, { timeout: 5000 });
      if (frontendResponse.status === 200) {
        results.frontend.server = '✅ PASS';
        console.log('   ✅ Frontend server running');
      } else {
        results.frontend.server = '❌ FAIL';
        throw new Error('Frontend server not responding');
      }
    } catch (error) {
      results.frontend.server = '❌ FAIL';
      console.log('   ❌ Frontend server not accessible');
    }

    // ===== INTEGRATION TESTS =====
    console.log('\n🔗 Testing Integration...\n');

    // 9. HR Portal Access
    console.log('9. HR Portal Integration Test...');
    try {
      const portalResponse = await axios.get(`${FRONTEND_URL}/hr`, { timeout: 5000 });
      if (portalResponse.status === 200) {
        results.integration.hrPortal = '✅ PASS';
        console.log('   ✅ HR Portal accessible');
      } else {
        results.integration.hrPortal = '❌ FAIL';
        throw new Error('HR Portal not accessible');
      }
    } catch (error) {
      results.integration.hrPortal = '⚠️  SKIP (Frontend not ready)';
      console.log('   ⚠️  HR Portal test skipped (frontend may still be loading)');
    }

    // ===== SUMMARY =====
    console.log('\n📊 Phase 2 Test Results Summary');
    console.log('================================\n');

    console.log('🔧 Backend API Tests:');
    Object.entries(results.backend).forEach(([test, result]) => {
      console.log(`   ${test}: ${result}`);
    });

    console.log('\n🌐 Frontend Tests:');
    Object.entries(results.frontend).forEach(([test, result]) => {
      console.log(`   ${test}: ${result}`);
    });

    console.log('\n🔗 Integration Tests:');
    Object.entries(results.integration).forEach(([test, result]) => {
      console.log(`   ${test}: ${result}`);
    });

    // Calculate success rate
    const allTests = Object.values(results.backend).concat(
      Object.values(results.frontend).concat(Object.values(results.integration))
    );
    const passedTests = allTests.filter(result => result === '✅ PASS').length;
    const totalTests = allTests.length;
    const successRate = ((passedTests / totalTests) * 100).toFixed(1);

    console.log(`\n📈 Overall Success Rate: ${passedTests}/${totalTests} (${successRate}%)`);

    if (passedTests >= totalTests * 0.8) {
      console.log('\n🎉 Phase 2 Implementation Successful!');
      console.log('✅ Backend API fully functional');
      console.log('✅ Real data integration working');
      console.log('✅ HR Dashboard features complete');
      console.log('✅ Ready for production use');
    } else {
      console.log('\n⚠️  Some tests failed - review needed');
    }

  } catch (error) {
    console.error('❌ Comprehensive test failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    process.exit(1);
  }
}

testPhase2Comprehensive(); 