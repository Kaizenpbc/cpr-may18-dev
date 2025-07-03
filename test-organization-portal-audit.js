const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:3001/api/v1';
const FRONTEND_URL = 'http://localhost:5173';

// Test results storage
const testResults = [];
let authToken = null;
let organizationId = null;

function addResult(category, testName, success, details = '') {
  testResults.push({
    category,
    testName,
    success,
    details,
    timestamp: new Date().toISOString()
  });
}

async function makeRequest(method, endpoint, data = null, headers = {}) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
        ...headers
      }
    };

    if (data) {
      config.data = data;
    }

    const response = await axios(config);
    return { success: true, status: response.status, data: response.data };
  } catch (error) {
    return { 
      success: false, 
      status: error.response?.status, 
      data: error.response?.data || error.message 
    };
  }
}

async function testOrganizationPortal() {
  console.log('🔍 ORGANIZATION PORTAL DEEP AUDIT');
  console.log('=' .repeat(60));
  console.log('');

  // 1. Authentication Tests
  console.log('1. 🔐 TESTING AUTHENTICATION');
  console.log('-'.repeat(30));
  
  try {
    // Login as organization user
    console.log('   Testing organization login...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      username: 'orguser',
      password: 'test123'
    });

    if (loginResponse.data.success && loginResponse.data.data.accessToken) {
      authToken = loginResponse.data.data.accessToken;
      organizationId = loginResponse.data.data.user.organizationId;
      addResult('Authentication', 'Organization Login', true, 'Login successful');
      console.log('   ✅ Organization login successful');
    } else {
      addResult('Authentication', 'Organization Login', false, 'No token received');
      console.log('   ❌ Organization login failed');
      return;
    }
  } catch (error) {
    addResult('Authentication', 'Organization Login', false, error.response?.data?.message || error.message);
    console.log('   ❌ Organization login failed:', error.response?.data?.message || error.message);
    return;
  }

  // 2. Organization Profile Tests
  console.log('\n2. 🏢 TESTING ORGANIZATION PROFILE');
  console.log('-'.repeat(30));

  // Get organization profile
  const profileGet = await makeRequest('GET', '/organization/profile');
  addResult('Profile', 'GET /organization/profile', profileGet.success,
    profileGet.success ? `Status: ${profileGet.status}` : profileGet.data?.message || profileGet.data);
  console.log(`   ${profileGet.success ? '✅' : '❌'} GET /organization/profile: ${profileGet.success ? 'PASS' : 'FAIL'}`);

  // Update organization profile
  const profileUpdate = await makeRequest('PUT', '/organization/profile', {
    name: 'Test Organization Updated',
    address: '123 Test Street',
    phone: '555-1234',
    email: 'test@organization.com'
  });
  addResult('Profile', 'PUT /organization/profile', profileUpdate.success,
    profileUpdate.success ? `Status: ${profileUpdate.status}` : profileUpdate.data?.message || profileUpdate.data);
  console.log(`   ${profileUpdate.success ? '✅' : '❌'} PUT /organization/profile: ${profileUpdate.success ? 'PASS' : 'FAIL'}`);

  // 3. Course Management Tests
  console.log('\n3. 📚 TESTING COURSE MANAGEMENT');
  console.log('-'.repeat(30));

  // Get organization courses
  const coursesGet = await makeRequest('GET', '/organization/courses');
  addResult('Courses', 'GET /organization/courses', coursesGet.success,
    coursesGet.success ? `Status: ${coursesGet.status}, Courses: ${coursesGet.data?.data?.length || 0}` : coursesGet.data?.message || coursesGet.data);
  console.log(`   ${coursesGet.success ? '✅' : '❌'} GET /organization/courses: ${coursesGet.success ? 'PASS' : 'FAIL'}`);

  // Get archived courses
  const archivedGet = await makeRequest('GET', '/organization/archive');
  addResult('Courses', 'GET /organization/archive', archivedGet.success,
    archivedGet.success ? `Status: ${archivedGet.status}, Archived: ${archivedGet.data?.data?.length || 0}` : archivedGet.data?.message || archivedGet.data);
  console.log(`   ${archivedGet.success ? '✅' : '❌'} GET /organization/archive: ${archivedGet.success ? 'PASS' : 'FAIL'}`);

  // Request new course
  const courseRequest = await makeRequest('POST', '/organization/course-request', {
    courseType: 'CPR Basic',
    preferredDate: '2025-08-15',
    classSize: 15,
    location: 'Test Location',
    notes: 'Test course request'
  });
  addResult('Courses', 'POST /organization/course-request', courseRequest.success,
    courseRequest.success ? `Status: ${courseRequest.status}` : courseRequest.data?.message || courseRequest.data);
  console.log(`   ${courseRequest.success ? '✅' : '❌'} POST /organization/course-request: ${courseRequest.success ? 'PASS' : 'FAIL'}`);

  // 4. Billing Tests
  console.log('\n4. 💰 TESTING BILLING');
  console.log('-'.repeat(30));

  // Get billing summary
  const billingSummary = await makeRequest('GET', '/organization/billing-summary');
  addResult('Billing', 'GET /organization/billing-summary', billingSummary.success,
    billingSummary.success ? `Status: ${billingSummary.status}` : billingSummary.data?.message || billingSummary.data);
  console.log(`   ${billingSummary.success ? '✅' : '❌'} GET /organization/billing-summary: ${billingSummary.success ? 'PASS' : 'FAIL'}`);

  // Get invoices
  const invoicesGet = await makeRequest('GET', '/organization/invoices');
  addResult('Billing', 'GET /organization/invoices', invoicesGet.success,
    invoicesGet.success ? `Status: ${invoicesGet.status}, Invoices: ${invoicesGet.data?.data?.length || 0}` : invoicesGet.data?.message || invoicesGet.data);
  console.log(`   ${invoicesGet.success ? '✅' : '❌'} GET /organization/invoices: ${invoicesGet.success ? 'PASS' : 'FAIL'}`);

  // 5. Analytics Tests
  console.log('\n5. 📊 TESTING ANALYTICS');
  console.log('-'.repeat(30));

  // Course request analytics
  const courseAnalytics = await makeRequest('GET', '/organization/analytics/course-requests?timeframe=12');
  addResult('Analytics', 'GET /organization/analytics/course-requests', courseAnalytics.success,
    courseAnalytics.success ? `Status: ${courseAnalytics.status}` : courseAnalytics.data?.message || courseAnalytics.data);
  console.log(`   ${courseAnalytics.success ? '✅' : '❌'} GET /organization/analytics/course-requests: ${courseAnalytics.success ? 'PASS' : 'FAIL'}`);

  // Student participation analytics
  const studentAnalytics = await makeRequest('GET', '/organization/analytics/student-participation?timeframe=12');
  addResult('Analytics', 'GET /organization/analytics/student-participation', studentAnalytics.success,
    studentAnalytics.success ? `Status: ${studentAnalytics.status}` : studentAnalytics.data?.message || studentAnalytics.data);
  console.log(`   ${studentAnalytics.success ? '✅' : '❌'} GET /organization/analytics/student-participation: ${studentAnalytics.success ? 'PASS' : 'FAIL'}`);

  // 6. Pricing Tests
  console.log('\n6. 💵 TESTING PRICING');
  console.log('-'.repeat(30));

  // Get organization pricing
  const pricingGet = await makeRequest('GET', `/organization-pricing/organization/${organizationId}`);
  addResult('Pricing', 'GET /organization-pricing/organization/:id', pricingGet.success,
    pricingGet.success ? `Status: ${pricingGet.status}` : pricingGet.data?.message || pricingGet.data);
  console.log(`   ${pricingGet.success ? '✅' : '❌'} GET /organization-pricing/organization/:id: ${pricingGet.success ? 'PASS' : 'FAIL'}`);

  // Calculate course cost
  const costCalculation = await makeRequest('POST', '/organization-pricing/calculate-cost', {
    organizationId: organizationId,
    classTypeId: 1,
    studentCount: 15
  });
  addResult('Pricing', 'POST /organization-pricing/calculate-cost', costCalculation.success,
    costCalculation.success ? `Status: ${costCalculation.status}` : costCalculation.data?.message || costCalculation.data);
  console.log(`   ${costCalculation.success ? '✅' : '❌'} POST /organization-pricing/calculate-cost: ${costCalculation.success ? 'PASS' : 'FAIL'}`);

  // 7. Student Management Tests
  console.log('\n7. 👥 TESTING STUDENT MANAGEMENT');
  console.log('-'.repeat(30));

  // Get course types for reference
  const courseTypes = await makeRequest('GET', '/course-types');
  addResult('Students', 'GET /course-types', courseTypes.success,
    courseTypes.success ? `Status: ${courseTypes.status}, Types: ${courseTypes.data?.data?.length || 0}` : courseTypes.data?.message || courseTypes.data);
  console.log(`   ${courseTypes.success ? '✅' : '❌'} GET /course-types: ${courseTypes.success ? 'PASS' : 'FAIL'}`);

  // Upload students (if we have a course request)
  if (courseRequest.success && courseRequest.data?.data?.id) {
    const uploadStudents = await makeRequest('POST', '/organization/upload-students', {
      courseRequestId: courseRequest.data.data.id,
      students: [
        { first_name: 'John', last_name: 'Doe', email: 'john.doe@test.com' },
        { first_name: 'Jane', last_name: 'Smith', email: 'jane.smith@test.com' }
      ]
    });
    addResult('Students', 'POST /organization/upload-students', uploadStudents.success,
      uploadStudents.success ? `Status: ${uploadStudents.status}` : uploadStudents.data?.message || uploadStudents.data);
    console.log(`   ${uploadStudents.success ? '✅' : '❌'} POST /organization/upload-students: ${uploadStudents.success ? 'PASS' : 'FAIL'}`);
  } else {
    addResult('Students', 'POST /organization/upload-students', false, 'Skipped - no course request available');
    console.log('   ⚠️ POST /organization/upload-students: SKIPPED (no course request)');
  }

  // 8. Frontend Component Tests
  console.log('\n8. 🖥️ TESTING FRONTEND COMPONENTS');
  console.log('-'.repeat(30));

  // Test if frontend is accessible
  try {
    const frontendResponse = await axios.get(FRONTEND_URL, { timeout: 5000 });
    addResult('Frontend', 'Frontend Accessibility', true, `Status: ${frontendResponse.status}`);
    console.log('   ✅ Frontend is accessible');
  } catch (error) {
    addResult('Frontend', 'Frontend Accessibility', false, error.message);
    console.log('   ❌ Frontend is not accessible:', error.message);
  }

  // 9. Data Flow Tests
  console.log('\n9. 🔄 TESTING DATA FLOW');
  console.log('-'.repeat(30));

  // Test data consistency
  const profileData = profileGet.success ? profileGet.data : null;
  const coursesData = coursesGet.success ? coursesGet.data : null;
  const billingData = billingSummary.success ? billingSummary.data : null;

  if (profileData && coursesData && billingData) {
    addResult('Data Flow', 'Data Consistency', true, 'All data sources accessible');
    console.log('   ✅ Data consistency: PASS');
  } else {
    addResult('Data Flow', 'Data Consistency', false, 'Some data sources unavailable');
    console.log('   ❌ Data consistency: FAIL');
  }

  // 10. Performance Tests
  console.log('\n10. ⚡ TESTING PERFORMANCE');
  console.log('-'.repeat(30));

  // Test response times
  const startTime = Date.now();
  await makeRequest('GET', '/organization/profile');
  const responseTime = Date.now() - startTime;

  if (responseTime < 1000) {
    addResult('Performance', 'Response Time', true, `${responseTime}ms`);
    console.log(`   ✅ Response time: ${responseTime}ms (GOOD)`);
  } else {
    addResult('Performance', 'Response Time', false, `${responseTime}ms (SLOW)`);
    console.log(`   ⚠️ Response time: ${responseTime}ms (SLOW)`);
  }

  // Print Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 ORGANIZATION PORTAL AUDIT SUMMARY');
  console.log('='.repeat(60));

  const categories = [...new Set(testResults.map(r => r.category))];
  
  categories.forEach(category => {
    const categoryResults = testResults.filter(r => r.category === category);
    const passed = categoryResults.filter(r => r.success).length;
    const total = categoryResults.length;
    const percentage = Math.round((passed / total) * 100);
    
    console.log(`\n${category.toUpperCase()}: ${passed}/${total} (${percentage}%)`);
    categoryResults.forEach(result => {
      const status = result.success ? '✅' : '❌';
      console.log(`  ${status} ${result.testName}: ${result.details}`);
    });
  });

  // Overall statistics
  const totalPassed = testResults.filter(r => r.success).length;
  const totalTests = testResults.length;
  const overallPercentage = Math.round((totalPassed / totalTests) * 100);

  console.log('\n' + '='.repeat(60));
  console.log(`🎯 OVERALL RESULTS: ${totalPassed}/${totalTests} (${overallPercentage}%)`);
  console.log('='.repeat(60));

  if (overallPercentage >= 90) {
    console.log('🌟 EXCELLENT: Organization Portal is highly functional!');
  } else if (overallPercentage >= 75) {
    console.log('✅ GOOD: Organization Portal is mostly functional with minor issues.');
  } else if (overallPercentage >= 50) {
    console.log('⚠️ FAIR: Organization Portal has significant issues that need attention.');
  } else {
    console.log('❌ POOR: Organization Portal has major issues requiring immediate attention.');
  }

  // Failed tests summary
  const failedTests = testResults.filter(r => !r.success);
  if (failedTests.length > 0) {
    console.log('\n🔍 FAILED TESTS REQUIRING ATTENTION:');
    failedTests.forEach(test => {
      console.log(`  ❌ ${test.category} - ${test.testName}: ${test.details}`);
    });
  }

  console.log('\n✨ Audit completed!');
}

// Run the audit
testOrganizationPortal().catch(console.error); 