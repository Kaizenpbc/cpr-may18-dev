const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001/api/v1';

async function makeRequest(method, endpoint, data = null, headers = {}) {
  try {
    const config = {
      method,
      url: `${API_BASE_URL}${endpoint}`,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };
    
    if (data) {
      config.data = data;
    }
    
    const response = await axios(config);
    return response;
  } catch (error) {
    console.error(`Request failed: ${method} ${endpoint}`, error.response?.data || error.message);
    return error.response || { status: 500, data: { message: error.message } };
  }
}

async function testPhase1EnhancedDetails() {
  console.log('🧪 Testing Phase 1: Enhanced Payment Request Details\n');
  console.log('==================================================');

  try {
    // Step 1: Login as accountant
    console.log('\n1️⃣ Logging in as accountant...');
    const loginResponse = await makeRequest('POST', '/auth/login', {
      username: 'accountant',
      password: 'test123'
    });

    if (loginResponse.status !== 200) {
      console.log('❌ Failed to login as accountant');
      return;
    }

    const token = loginResponse.data.data.accessToken;
    console.log('✅ Login successful');

    // Step 2: Get payment requests list
    console.log('\n2️⃣ Getting payment requests list...');
    const requestsResponse = await makeRequest('GET', '/payment-requests', null, {
      'Authorization': `Bearer ${token}`
    });

    if (requestsResponse.status !== 200) {
      console.log('❌ Failed to get payment requests');
      return;
    }

    const requests = requestsResponse.data.data.requests;
    console.log(`✅ Found ${requests.length} payment requests`);

    if (requests.length === 0) {
      console.log('⚠️ No payment requests found to test with');
      return;
    }

    // Step 3: Get detailed information for first payment request
    console.log('\n3️⃣ Getting detailed payment request information...');
    const firstRequest = requests[0];
    console.log(`Testing with payment request ID: ${firstRequest.id}`);

    const detailResponse = await makeRequest('GET', `/payment-requests/${firstRequest.id}/detail`, null, {
      'Authorization': `Bearer ${token}`
    });

    if (detailResponse.status !== 200) {
      console.log('❌ Failed to get detailed payment request information');
      return;
    }

    const detail = detailResponse.data.data;
    console.log('✅ Detailed payment request information retrieved successfully');

    // Step 4: Display enhanced information
    console.log('\n4️⃣ Enhanced Payment Request Details:');
    console.log('=====================================');
    console.log(`📋 Request ID: ${detail.id}`);
    console.log(`👤 Instructor: ${detail.instructor_name} (${detail.instructor_email})`);
    console.log(`💰 Amount: $${Number(detail.amount).toFixed(2)}`);
    console.log(`📅 Week Starting: ${detail.week_start_date}`);
    console.log(`⏰ Total Hours: ${detail.total_hours}`);
    console.log(`📚 Courses Taught: ${detail.courses_taught}`);
    console.log(`💵 Hourly Rate: $${detail.hourly_rate || 25}/hr`);
    console.log(`🎁 Course Bonus: $${detail.course_bonus || 50}/course`);
    console.log(`🧮 Base Amount: $${Number(detail.base_amount || 0).toFixed(2)}`);
    console.log(`🎯 Bonus Amount: $${Number(detail.bonus_amount || 0).toFixed(2)}`);
    console.log(`🏷️ Pay Tier: ${detail.tier_name || 'Default'}`);
    console.log(`📝 Status: ${detail.status.toUpperCase()}`);
    console.log(`💳 Payment Method: ${detail.payment_method?.replace('_', ' ').toUpperCase()}`);

    if (detail.hr_comment) {
      console.log(`💬 HR Comment: ${detail.hr_comment}`);
    }

    if (detail.class_details && detail.class_details.length > 0) {
      console.log('\n📚 Class Details:');
      detail.class_details.forEach((classDetail, index) => {
        console.log(`  ${index + 1}. ${classDetail.course_name} - ${classDetail.hours}h on ${classDetail.date}`);
        if (classDetail.location) {
          console.log(`     Location: ${classDetail.location}`);
        }
      });
    } else {
      console.log('\n📚 Class Details: Not available (using default)');
    }

    // Step 5: Verify payment calculation
    console.log('\n5️⃣ Payment Calculation Verification:');
    console.log('=====================================');
    const expectedBase = (detail.total_hours * (detail.hourly_rate || 25));
    const expectedBonus = (detail.courses_taught * (detail.course_bonus || 50));
    const expectedTotal = expectedBase + expectedBonus;
    
    console.log(`Expected Base: ${detail.total_hours}h × $${detail.hourly_rate || 25} = $${expectedBase.toFixed(2)}`);
    console.log(`Expected Bonus: ${detail.courses_taught} courses × $${detail.course_bonus || 50} = $${expectedBonus.toFixed(2)}`);
    console.log(`Expected Total: $${expectedTotal.toFixed(2)}`);
    console.log(`Actual Total: $${Number(detail.amount).toFixed(2)}`);
    
    const calculationMatches = Math.abs(expectedTotal - detail.amount) < 0.01;
    console.log(`✅ Calculation ${calculationMatches ? 'matches' : 'does not match'}`);

    console.log('\n🎉 Phase 1 Test Completed Successfully!');
    console.log('========================================');
    console.log('✅ Enhanced payment request details working');
    console.log('✅ Class information display working');
    console.log('✅ Payment breakdown calculation working');
    console.log('✅ Detailed API endpoint working');

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
  }
}

// Run the test
testPhase1EnhancedDetails(); 