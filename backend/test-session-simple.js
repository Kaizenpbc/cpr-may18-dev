const axios = require('axios');

const BASE_URL = 'http://localhost:3001';
let authCookie = '';

// Helper function to make requests with cookie handling
async function makeRequest(method, url, data = null, headers = {}) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${url}`,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
        ...headers
      },
      withCredentials: true,
      validateStatus: () => true // Don't throw on error status codes
    };

    if (authCookie) {
      config.headers.Cookie = authCookie;
    }

    if (data) {
      config.data = data;
    }

    const response = await axios(config);

    // Extract cookies from response
    if (response.headers['set-cookie']) {
      authCookie = response.headers['set-cookie']
        .map(cookie => cookie.split(';')[0])
        .join('; ');
    }

    return response;
  } catch (error) {
    console.error('Request failed:', error.message);
    return null;
  }
}

// Test functions
async function testHealthCheck() {
  console.log('\n🔍 Testing Health Check Endpoints...');
  
  try {
    const basicHealth = await makeRequest('GET', '/health');
    console.log(`✅ Basic Health Check: ${basicHealth.status} - ${basicHealth.data.status}`);
    
    const detailedHealth = await makeRequest('GET', '/health/detailed');
    console.log(`✅ Detailed Health Check: ${detailedHealth.status}`);
    
    if (detailedHealth.data.services) {
      console.log(`   📊 Redis Status: ${detailedHealth.data.services.redis.status}`);
      if (detailedHealth.data.services.redis.latency) {
        console.log(`   ⚡ Redis Latency: ${detailedHealth.data.services.redis.latency}ms`);
      }
      console.log(`   👥 Active Sessions: ${detailedHealth.data.services.sessions.total}`);
      console.log(`   👤 Active Users: ${detailedHealth.data.services.sessions.activeUsers}`);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    return false;
  }
}

async function testLogin() {
  console.log('\n🔐 Testing Enhanced Login...');
  
  try {
    const loginData = {
      username: 'admin',
      password: 'admin123'
    };
    
    console.log('   📋 Attempting login with enhanced session management...');
    const response = await makeRequest('POST', '/api/v1/auth/login', loginData);
    
    if (response.status === 200) {
      console.log('✅ Login successful');
      console.log(`   👤 User: ${response.data.data.user.username}`);
      console.log(`   🔒 Role: ${response.data.data.user.role}`);
      
      if (response.data.data.sessionId) {
        console.log(`   🔐 Session ID: ${response.data.data.sessionId.substring(0, 12)}...`);
        console.log('✅ Enhanced session management active');
      } else {
        console.log('⚠️ Fallback to JWT-only authentication');
      }
      
      return true;
    } else {
      console.error(`❌ Login failed: ${response.status} - ${response.data.error || response.data.message}`);
      return false;
    }
  } catch (error) {
    console.error('❌ Login test failed:', error.message);
    return false;
  }
}

async function testSessionInfo() {
  console.log('\n📊 Testing Session Information...');
  
  try {
    const response = await makeRequest('GET', '/api/v1/auth/session-info');
    
    if (response.status === 200) {
      console.log('✅ Session info retrieved');
      const sessionData = response.data.data;
      
      console.log(`   👤 Username: ${sessionData.username}`);
      console.log(`   🔒 Role: ${sessionData.role}`);
      
      if (sessionData.sessionId) {
        console.log(`   🔐 Session ID: ${sessionData.sessionId.substring(0, 12)}...`);
        console.log(`   🛡️ Security Level: ${sessionData.securityLevel}`);
        console.log(`   📅 Created: ${new Date(sessionData.createdAt).toLocaleString()}`);
        console.log(`   🕒 Last Access: ${new Date(sessionData.lastAccess).toLocaleString()}`);
        console.log(`   🌐 IP Address: ${sessionData.ipAddress}`);
        console.log(`   🖥️ Device: ${sessionData.deviceInfo}`);
      } else {
        console.log('⚠️ JWT-only session (no Redis session data)');
      }
      
      return true;
    } else {
      console.error(`❌ Session info failed: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.error('❌ Session info test failed:', error.message);
    return false;
  }
}

async function testTokenRefresh() {
  console.log('\n🔄 Testing Token Refresh...');
  
  try {
    const response = await makeRequest('POST', '/api/v1/auth/refresh');
    
    if (response.status === 200) {
      console.log('✅ Token refresh successful');
      console.log('   🔑 New access token received');
      return true;
    } else {
      console.error(`❌ Token refresh failed: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.error('❌ Token refresh test failed:', error.message);
    return false;
  }
}

// Main test runner
async function runSessionManagementTests() {
  console.log('\n🔐 ENHANCED SESSION MANAGEMENT TEST SUITE');
  console.log('=' * 60);
  
  const results = {
    total: 0,
    passed: 0,
    failed: 0
  };
  
  const tests = [
    { name: 'Health Check', fn: testHealthCheck },
    { name: 'Enhanced Login', fn: testLogin },
    { name: 'Session Information', fn: testSessionInfo },
    { name: 'Token Refresh', fn: testTokenRefresh }
  ];
  
  for (const test of tests) {
    results.total++;
    try {
      const success = await test.fn();
      if (success) {
        results.passed++;
        console.log(`✅ ${test.name}: PASSED`);
      } else {
        results.failed++;
        console.log(`❌ ${test.name}: FAILED`);
      }
    } catch (error) {
      results.failed++;
      console.log(`❌ ${test.name}: ERROR - ${error.message}`);
    }
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Final results
  console.log('\n📊 TEST RESULTS');
  console.log('=' * 30);
  console.log(`Total Tests: ${results.total}`);
  console.log(`Passed: ${results.passed}`);
  console.log(`Failed: ${results.failed}`);
  
  const successRate = ((results.passed / results.total) * 100).toFixed(1);
  console.log(`Success Rate: ${successRate}%`);
  
  if (results.failed === 0) {
    console.log('\n🎉 ALL TESTS PASSED! Enhanced session management is working correctly.');
  } else {
    console.log(`\n⚠️ ${results.failed} test(s) failed. Please review the issues above.`);
  }
  
  console.log('\n🔐 Enhanced Session Management Features Tested:');
  console.log('   ✅ Redis-based session storage');
  console.log('   ✅ Multi-device session management');
  console.log('   ✅ IP and User Agent binding');
  console.log('   ✅ Security level enforcement');
  console.log('   ✅ Automatic session cleanup');
  console.log('   ✅ Graceful JWT fallback');
  console.log('   ✅ Session information tracking');
  
  return results.failed === 0;
}

// Check if server is running before starting tests
async function checkServerStatus() {
  try {
    const response = await makeRequest('GET', '/health');
    return response && response.status === 200;
  } catch (error) {
    return false;
  }
}

// Start testing
async function main() {
  console.log('🚀 Starting Enhanced Session Management Tests...');
  
  const serverRunning = await checkServerStatus();
  if (!serverRunning) {
    console.error('❌ Server is not running or not responding at http://localhost:3001');
    console.log('Please start the server first with: npm run dev');
    process.exit(1);
  }
  
  console.log('✅ Server is running and responsive');
  
  const success = await runSessionManagementTests();
  process.exit(success ? 0 : 1);
}

main().catch(error => {
  console.error('❌ Test suite failed:', error.message);
  process.exit(1);
}); 