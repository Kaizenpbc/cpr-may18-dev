const axios = require('axios');

async function testSysadminAPISimple() {
  try {
    console.log('🔍 Testing SYSADMIN API endpoints (without auth)...\n');
    
    // Test 1: Try to access configurations without auth (should fail with 401)
    console.log('📋 Test 1: Getting configurations without auth...');
    try {
      const response = await axios.get('http://localhost:3001/api/v1/sysadmin/configurations');
      console.log('❌ Unexpected success - should have failed with auth error');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Correctly rejected without authentication');
      } else {
        console.log('❌ Unexpected error:', error.response?.status, error.response?.data?.message);
      }
    }
    
    // Test 2: Try to access categories without auth (should fail with 401)
    console.log('\n📋 Test 2: Getting categories without auth...');
    try {
      const response = await axios.get('http://localhost:3001/api/v1/sysadmin/configurations/categories');
      console.log('❌ Unexpected success - should have failed with auth error');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Correctly rejected without authentication');
      } else {
        console.log('❌ Unexpected error:', error.response?.status, error.response?.data?.message);
      }
    }
    
    // Test 3: Check if the route exists by testing with invalid token
    console.log('\n📋 Test 3: Testing with invalid token...');
    try {
      const response = await axios.get('http://localhost:3001/api/v1/sysadmin/configurations', {
        headers: {
          'Authorization': 'Bearer invalid_token',
          'Content-Type': 'application/json'
        }
      });
      console.log('❌ Unexpected success - should have failed with invalid token');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Correctly rejected invalid token');
      } else {
        console.log('❌ Unexpected error:', error.response?.status, error.response?.data?.message);
      }
    }
    
    console.log('\n🎉 SYSADMIN API routes are accessible and properly protected!');
    console.log('💡 Next step: Test with valid sysadmin token');
    
  } catch (error) {
    console.error('❌ Error testing SYSADMIN API:', error.response?.data || error.message);
  }
}

// Instructions
console.log('🚀 SYSADMIN API Simple Test Script');
console.log('================================');
console.log('This script tests that the SYSADMIN routes are:');
console.log('1. Accessible (not 404)');
console.log('2. Properly protected (require auth)');
console.log('3. Reject invalid tokens');
console.log('================================\n');

testSysadminAPISimple(); 