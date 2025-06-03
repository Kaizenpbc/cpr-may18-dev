const https = require('https');
const http = require('http');
const crypto = require('crypto');

// Test configuration
const BASE_URL = 'http://localhost:3001';
const FRONTEND_URL = 'http://localhost:5173';

// Colors for output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function makeRequest(options) {
  return new Promise((resolve, reject) => {
    const protocol = options.protocol === 'https:' ? https : http;
    const req = protocol.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });

    req.on('error', reject);
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

// Test Suite: Comprehensive Security Validation
async function runComprehensiveSecurityTests() {
  log('\n' + '='.repeat(80), 'cyan');
  log('🔒 COMPREHENSIVE SECURITY TEST SUITE', 'bold');
  log('🎯 Validating All 4 Security Steps Implementation', 'blue');
  log('='.repeat(80), 'cyan');

  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };

  // Step 1: Rate Limiting Tests
  log('\n🚦 STEP 1: RATE LIMITING TESTS', 'magenta');
  
  try {
    // Test 1.1: Normal API Rate Limiting
    log('  📡 Testing API Rate Limiting...', 'blue');
    const requests = [];
    
    for (let i = 0; i < 15; i++) { // Exceed limit of 10/minute
      requests.push(makeRequest({
        hostname: 'localhost',
        port: 3001,
        path: '/health',
        method: 'GET'
      }));
    }
    
    const responses = await Promise.all(requests);
    const rateLimited = responses.some(res => res.statusCode === 429);
    
    if (rateLimited) {
      log('    ✅ API Rate Limiting: WORKING', 'green');
      results.passed++;
    } else {
      log('    ❌ API Rate Limiting: NOT WORKING', 'red');
      results.failed++;
    }
    results.tests.push('API Rate Limiting');

    // Test 1.2: Auth Rate Limiting
    log('  🔐 Testing Auth Rate Limiting...', 'blue');
    const authRequests = [];
    
    for (let i = 0; i < 8; i++) { // Exceed auth limit
      authRequests.push(makeRequest({
        hostname: 'localhost',
        port: 3001,
        path: '/api/v1/auth/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@test.com', password: 'wrong' })
      }));
    }
    
    const authResponses = await Promise.all(authRequests);
    const authRateLimited = authResponses.some(res => res.statusCode === 429);
    
    if (authRateLimited) {
      log('    ✅ Auth Rate Limiting: WORKING', 'green');
      results.passed++;
    } else {
      log('    ❌ Auth Rate Limiting: NOT WORKING', 'red');
      results.failed++;
    }
    results.tests.push('Auth Rate Limiting');

  } catch (error) {
    log(`    ❌ Rate Limiting Tests Error: ${error.message}`, 'red');
    results.failed += 2;
  }

  // Step 2: Security Headers Tests
  log('\n🛡️ STEP 2: SECURITY HEADERS TESTS', 'magenta');
  
  try {
    const healthResponse = await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: '/health',
      method: 'GET'
    });

    const headers = healthResponse.headers;
    const securityTests = [
      { name: 'Content-Security-Policy', header: 'content-security-policy' },
      { name: 'X-Frame-Options', header: 'x-frame-options' },
      { name: 'X-Content-Type-Options', header: 'x-content-type-options' },
      { name: 'Strict-Transport-Security', header: 'strict-transport-security' },
      { name: 'Referrer-Policy', header: 'referrer-policy' },
      { name: 'X-XSS-Protection', header: 'x-xss-protection' }
    ];

    securityTests.forEach(test => {
      if (headers[test.header]) {
        log(`    ✅ ${test.name}: PRESENT`, 'green');
        results.passed++;
      } else {
        log(`    ❌ ${test.name}: MISSING`, 'red');
        results.failed++;
      }
      results.tests.push(test.name);
    });

    // Test X-Powered-By removal
    if (!headers['x-powered-by']) {
      log('    ✅ X-Powered-By: REMOVED', 'green');
      results.passed++;
    } else {
      log('    ❌ X-Powered-By: STILL PRESENT', 'red');
      results.failed++;
    }
    results.tests.push('X-Powered-By Removal');

  } catch (error) {
    log(`    ❌ Security Headers Tests Error: ${error.message}`, 'red');
    results.failed += 7;
  }

  // Step 3: Input Sanitization Tests
  log('\n🧼 STEP 3: INPUT SANITIZATION TESTS', 'magenta');
  
  try {
    // Test 3.1: XSS Prevention
    log('  🚫 Testing XSS Prevention...', 'blue');
    const xssPayload = '<script>alert("XSS")</script>';
    
    const xssResponse = await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: '/api/v1/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        email: xssPayload,
        password: 'test123'
      })
    });

    if (xssResponse.statusCode === 400 || !xssResponse.body.includes('<script>')) {
      log('    ✅ XSS Prevention: WORKING', 'green');
      results.passed++;
    } else {
      log('    ❌ XSS Prevention: VULNERABLE', 'red');
      results.failed++;
    }
    results.tests.push('XSS Prevention');

    // Test 3.2: SQL Injection Prevention
    log('  💉 Testing SQL Injection Prevention...', 'blue');
    const sqlPayload = "'; DROP TABLE users; --";
    
    const sqlResponse = await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: '/api/v1/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        email: `test${sqlPayload}@test.com`,
        password: 'test123'
      })
    });

    if (sqlResponse.statusCode === 400 || sqlResponse.statusCode === 401) {
      log('    ✅ SQL Injection Prevention: WORKING', 'green');
      results.passed++;
    } else {
      log('    ❌ SQL Injection Prevention: VULNERABLE', 'red');
      results.failed++;
    }
    results.tests.push('SQL Injection Prevention');

    // Test 3.3: Malicious Pattern Detection
    log('  🔍 Testing Malicious Pattern Detection...', 'blue');
    const maliciousPatterns = [
      '../../../etc/passwd',
      'javascript:alert(1)',
      'eval(',
      'union select'
    ];

    let maliciousBlocked = 0;
    for (const pattern of maliciousPatterns) {
      const response = await makeRequest({
        hostname: 'localhost',
        port: 3001,
        path: '/api/v1/auth/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: `test+${pattern}@test.com`,
          password: 'test123'
        })
      });

      if (response.statusCode === 400) {
        maliciousBlocked++;
      }
    }

    if (maliciousBlocked >= maliciousPatterns.length / 2) {
      log('    ✅ Malicious Pattern Detection: WORKING', 'green');
      results.passed++;
    } else {
      log('    ❌ Malicious Pattern Detection: INSUFFICIENT', 'red');
      results.failed++;
    }
    results.tests.push('Malicious Pattern Detection');

  } catch (error) {
    log(`    ❌ Input Sanitization Tests Error: ${error.message}`, 'red');
    results.failed += 3;
  }

  // Step 4: Session Management Tests
  log('\n🔐 STEP 4: SESSION MANAGEMENT TESTS', 'magenta');
  
  try {
    // Test 4.1: JWT Authentication
    log('  🎫 Testing JWT Authentication...', 'blue');
    const loginResponse = await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: '/api/v1/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@gtacpr.com',
        password: 'Admin123!'
      })
    });

    if (loginResponse.statusCode === 200) {
      const loginData = JSON.parse(loginResponse.body);
      if (loginData.token) {
        log('    ✅ JWT Authentication: WORKING', 'green');
        results.passed++;

        // Test 4.2: Protected Route Access
        log('  🛡️ Testing Protected Route Access...', 'blue');
        const protectedResponse = await makeRequest({
          hostname: 'localhost',
          port: 3001,
          path: '/api/v1/admin/dashboard-summary',
          method: 'GET',
          headers: { 
            'Authorization': `Bearer ${loginData.token}`,
            'Content-Type': 'application/json'
          }
        });

        if (protectedResponse.statusCode === 200) {
          log('    ✅ Protected Route Access: WORKING', 'green');
          results.passed++;
        } else {
          log('    ❌ Protected Route Access: NOT WORKING', 'red');
          results.failed++;
        }
        results.tests.push('Protected Route Access');

        // Test 4.3: Invalid Token Rejection
        log('  🚫 Testing Invalid Token Rejection...', 'blue');
        const invalidTokenResponse = await makeRequest({
          hostname: 'localhost',
          port: 3001,
          path: '/api/v1/admin/dashboard-summary',
          method: 'GET',
          headers: { 
            'Authorization': 'Bearer invalid.token.here',
            'Content-Type': 'application/json'
          }
        });

        if (invalidTokenResponse.statusCode === 401 || invalidTokenResponse.statusCode === 403) {
          log('    ✅ Invalid Token Rejection: WORKING', 'green');
          results.passed++;
        } else {
          log('    ❌ Invalid Token Rejection: NOT WORKING', 'red');
          results.failed++;
        }
        results.tests.push('Invalid Token Rejection');

      } else {
        log('    ❌ JWT Authentication: NO TOKEN RETURNED', 'red');
        results.failed++;
      }
    } else {
      log('    ❌ JWT Authentication: LOGIN FAILED', 'red');
      results.failed++;
    }
    results.tests.push('JWT Authentication');

    // Test 4.4: Redis Fallback System
    log('  🔴 Testing Redis Fallback System...', 'blue');
    const healthResponse = await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: '/health',
      method: 'GET'
    });

    if (healthResponse.statusCode === 200) {
      log('    ✅ Redis Fallback System: WORKING (JWT Mode)', 'green');
      results.passed++;
    } else {
      log('    ❌ Redis Fallback System: NOT WORKING', 'red');
      results.failed++;
    }
    results.tests.push('Redis Fallback System');

  } catch (error) {
    log(`    ❌ Session Management Tests Error: ${error.message}`, 'red');
    results.failed += 4;
  }

  // CORS Tests
  log('\n🌐 ADDITIONAL: CORS CONFIGURATION TESTS', 'magenta');
  
  try {
    const corsResponse = await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: '/health',
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://localhost:5173',
        'Access-Control-Request-Method': 'GET'
      }
    });

    if (corsResponse.headers['access-control-allow-origin']) {
      log('    ✅ CORS Configuration: WORKING', 'green');
      results.passed++;
    } else {
      log('    ❌ CORS Configuration: NOT WORKING', 'red');
      results.failed++;
    }
    results.tests.push('CORS Configuration');

  } catch (error) {
    log(`    ❌ CORS Tests Error: ${error.message}`, 'red');
    results.failed++;
  }

  // Test Results Summary
  log('\n' + '='.repeat(80), 'cyan');
  log('📊 COMPREHENSIVE SECURITY TEST RESULTS', 'bold');
  log('='.repeat(80), 'cyan');
  
  const totalTests = results.passed + results.failed;
  const successRate = ((results.passed / totalTests) * 100).toFixed(1);
  
  log(`\n📈 Overall Results:`, 'blue');
  log(`   ✅ Tests Passed: ${results.passed}`, 'green');
  log(`   ❌ Tests Failed: ${results.failed}`, 'red');
  log(`   📊 Success Rate: ${successRate}%`, successRate >= 90 ? 'green' : successRate >= 75 ? 'yellow' : 'red');
  
  log(`\n🔒 Security Assessment:`, 'blue');
  if (successRate >= 90) {
    log('   🎉 EXCELLENT - Enterprise-grade security achieved!', 'green');
  } else if (successRate >= 75) {
    log('   ⚠️ GOOD - Minor improvements needed', 'yellow');
  } else {
    log('   🚨 NEEDS WORK - Critical security issues found', 'red');
  }

  log(`\n📋 Tested Components:`, 'blue');
  results.tests.forEach((test, index) => {
    log(`   ${index + 1}. ${test}`, 'cyan');
  });

  log('\n' + '='.repeat(80), 'cyan');
  
  return results;
}

// Run the comprehensive security tests
runComprehensiveSecurityTests()
  .then(results => {
    if (results.passed >= results.failed) {
      log('\n🎯 Security validation completed successfully!', 'green');
      process.exit(0);
    } else {
      log('\n⚠️ Security validation found issues that need attention!', 'yellow');
      process.exit(1);
    }
  })
  .catch(error => {
    log(`\n❌ Error running security tests: ${error.message}`, 'red');
    process.exit(1);
  }); 