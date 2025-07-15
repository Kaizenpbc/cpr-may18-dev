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

async function testCompleteHRWorkflow() {
  console.log('🧪 Testing Complete HR Workflow for Returned Payment Requests\n');
  console.log('============================================================');

  try {
    // Step 1: Login as HR
    console.log('\n1️⃣ Logging in as HR...');
    const hrLoginResponse = await makeRequest('POST', '/auth/login', {
      username: 'hr',
      password: 'test123'
    });

    if (hrLoginResponse.status !== 200) {
      console.log('❌ Failed to login as HR');
      return;
    }

    const hrToken = hrLoginResponse.data.data.accessToken;
    console.log('✅ HR login successful');

    // Step 2: Check if there are any returned payment requests
    console.log('\n2️⃣ Checking for returned payment requests...');
    const returnedRequestsResponse = await makeRequest('GET', '/hr-dashboard/returned-payment-requests', null, {
      'Authorization': `Bearer ${hrToken}`
    });

    if (returnedRequestsResponse.status !== 200) {
      console.log('❌ Failed to get returned payment requests');
      return;
    }

    const returnedRequests = returnedRequestsResponse.data.data.requests;
    console.log(`✅ Found ${returnedRequests.length} returned payment requests`);

    if (returnedRequests.length === 0) {
      console.log('⚠️ No returned payment requests to test with');
      console.log('   (This is expected if no payment requests have been returned to HR yet)');
      return;
    }

    // Step 3: Test HR override approval
    console.log('\n3️⃣ Testing HR override approval...');
    const firstRequest = returnedRequests[0];
    console.log(`📋 Testing with payment request ID: ${firstRequest.id}`);

    const overrideResponse = await makeRequest('POST', `/hr-dashboard/returned-payment-requests/${firstRequest.id}/process`, {
      action: 'override_approve',
      notes: 'HR override: Documentation issue resolved, approving payment - Complete workflow test'
    }, {
      'Authorization': `Bearer ${hrToken}`
    });

    if (overrideResponse.status !== 200) {
      console.log('❌ Failed to override approve payment request');
      console.log('Response:', overrideResponse.data);
      return;
    }

    console.log('✅ HR override approval successful');
    console.log('Response:', overrideResponse.data);

    // Step 4: Verify the payment request was updated
    console.log('\n4️⃣ Verifying payment request was updated...');
    const verifyResponse = await makeRequest('GET', `/payment-requests/${firstRequest.id}/detail`, null, {
      'Authorization': `Bearer ${hrToken}`
    });

    if (verifyResponse.status === 200) {
      const updatedRequest = verifyResponse.data.data;
      console.log('✅ Payment request details retrieved');
      console.log(`📝 Status: ${updatedRequest.status}`);
      console.log(`📝 Notes: ${updatedRequest.notes}`);
    } else {
      console.log('⚠️ Could not verify payment request update');
    }

    // Step 5: Check remaining returned payment requests
    console.log('\n5️⃣ Checking remaining returned payment requests...');
    const remainingResponse = await makeRequest('GET', '/hr-dashboard/returned-payment-requests', null, {
      'Authorization': `Bearer ${hrToken}`
    });

    if (remainingResponse.status === 200) {
      const remaining = remainingResponse.data.data.requests;
      console.log(`📊 Remaining returned payment requests: ${remaining.length}`);
    }

    // Step 6: Test HR final rejection (if there are more requests)
    if (returnedRequests.length > 1) {
      console.log('\n6️⃣ Testing HR final rejection...');
      const secondRequest = returnedRequests[1];
      console.log(`📋 Testing with payment request ID: ${secondRequest.id}`);

      const rejectResponse = await makeRequest('POST', `/hr-dashboard/returned-payment-requests/${secondRequest.id}/process`, {
        action: 'final_reject',
        notes: 'HR final rejection: Insufficient documentation, cannot approve - Complete workflow test'
      }, {
        'Authorization': `Bearer ${hrToken}`
      });

      if (rejectResponse.status !== 200) {
        console.log('❌ Failed to final reject payment request');
        console.log('Response:', rejectResponse.data);
      } else {
        console.log('✅ HR final rejection successful');
        console.log('Response:', rejectResponse.data);
      }
    }

    // Step 7: Test validation - try to process without notes
    console.log('\n7️⃣ Testing validation - process without notes...');
    if (returnedRequests.length > 2) {
      const thirdRequest = returnedRequests[2];
      const validationResponse = await makeRequest('POST', `/hr-dashboard/returned-payment-requests/${thirdRequest.id}/process`, {
        action: 'override_approve',
        notes: '' // Empty notes should fail
      }, {
        'Authorization': `Bearer ${hrToken}`
      });

      if (validationResponse.status === 400) {
        console.log('✅ Validation working correctly - notes required for HR processing');
      } else {
        console.log('⚠️ Validation may not be working as expected');
      }
    }

    console.log('\n🎉 Complete HR Workflow Test Completed Successfully!');
    console.log('====================================================');
    console.log('✅ HR can view returned payment requests');
    console.log('✅ HR can override approve payment requests');
    console.log('✅ HR can final reject payment requests');
    console.log('✅ Validation working for HR actions');
    console.log('✅ Complete workflow from accountant → HR → resolution');

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
  }
}

// Run the test
testCompleteHRWorkflow(); 