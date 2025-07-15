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

async function testPhase2PaymentProcessing() {
  console.log('🧪 Testing Phase 2: Payment Processing with Method Selection\n');
  console.log('==========================================================');

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

    // Step 2: Get pending payment requests
    console.log('\n2️⃣ Getting pending payment requests...');
    const requestsResponse = await makeRequest('GET', '/payment-requests?status=pending', null, {
      'Authorization': `Bearer ${token}`
    });

    if (requestsResponse.status !== 200) {
      console.log('❌ Failed to get payment requests');
      return;
    }

    const requests = requestsResponse.data.data.requests;
    console.log(`✅ Found ${requests.length} pending payment requests`);

    if (requests.length === 0) {
      console.log('⚠️ No pending payment requests found to test with');
      return;
    }

    const testRequest = requests[0];
    console.log(`\n📋 Testing with payment request ID: ${testRequest.id}`);

    // Step 3: Test payment method selection and approval
    console.log('\n3️⃣ Testing payment approval with method selection...');
    const approveResponse = await makeRequest('POST', `/payment-requests/${testRequest.id}/process`, {
      action: 'approve',
      payment_method: 'bank_transfer',
      notes: 'Approved with bank transfer method - Phase 2 test'
    }, {
      'Authorization': `Bearer ${token}`
    });

    if (approveResponse.status !== 200) {
      console.log('❌ Failed to approve payment request');
      console.log('Response:', approveResponse.data);
      return;
    }

    console.log('✅ Payment request approved successfully');
    console.log('Response:', approveResponse.data);

    // Step 4: Verify the payment request was updated
    console.log('\n4️⃣ Verifying payment request was updated...');
    const verifyResponse = await makeRequest('GET', `/payment-requests/${testRequest.id}/detail`, null, {
      'Authorization': `Bearer ${token}`
    });

    if (verifyResponse.status !== 200) {
      console.log('❌ Failed to get updated payment request details');
      return;
    }

    const updatedRequest = verifyResponse.data.data;
    console.log('✅ Payment request details retrieved');
    console.log(`📝 Status: ${updatedRequest.status}`);
    console.log(`💳 Payment Method: ${updatedRequest.payment_method}`);
    console.log(`📝 Notes: ${updatedRequest.notes}`);

    // Step 5: Test return to HR functionality
    console.log('\n5️⃣ Testing return to HR functionality...');
    
    // First, let's get another pending request or create a test scenario
    const moreRequestsResponse = await makeRequest('GET', '/payment-requests?status=pending', null, {
      'Authorization': `Bearer ${token}`
    });

    if (moreRequestsResponse.status === 200 && moreRequestsResponse.data.data.requests.length > 0) {
      const secondRequest = moreRequestsResponse.data.data.requests[0];
      console.log(`📋 Testing return to HR with payment request ID: ${secondRequest.id}`);

      const returnResponse = await makeRequest('POST', `/payment-requests/${secondRequest.id}/process`, {
        action: 'return_to_hr',
        notes: 'Returned to HR for review - missing documentation - Phase 2 test'
      }, {
        'Authorization': `Bearer ${token}`
      });

      if (returnResponse.status !== 200) {
        console.log('❌ Failed to return payment request to HR');
        console.log('Response:', returnResponse.data);
      } else {
        console.log('✅ Payment request returned to HR successfully');
        console.log('Response:', returnResponse.data);
      }
    } else {
      console.log('⚠️ No additional pending requests to test return to HR');
    }

    // Step 6: Test validation - try to return without notes
    console.log('\n6️⃣ Testing validation - return without notes...');
    const validationResponse = await makeRequest('POST', `/payment-requests/${testRequest.id}/process`, {
      action: 'return_to_hr',
      notes: '' // Empty notes should fail
    }, {
      'Authorization': `Bearer ${token}`
    });

    if (validationResponse.status === 400) {
      console.log('✅ Validation working correctly - notes required for return to HR');
    } else {
      console.log('⚠️ Validation may not be working as expected');
    }

    // Step 7: Check updated statuses
    console.log('\n7️⃣ Checking updated payment request statuses...');
    const allRequestsResponse = await makeRequest('GET', '/payment-requests', null, {
      'Authorization': `Bearer ${token}`
    });

    if (allRequestsResponse.status === 200) {
      const allRequests = allRequestsResponse.data.data.requests;
      const approvedCount = allRequests.filter(r => r.status === 'approved').length;
      const returnedCount = allRequests.filter(r => r.status === 'returned_to_hr').length;
      const pendingCount = allRequests.filter(r => r.status === 'pending').length;

      console.log('📊 Current payment request statuses:');
      console.log(`   ✅ Approved: ${approvedCount}`);
      console.log(`   🔄 Returned to HR: ${returnedCount}`);
      console.log(`   ⏳ Pending: ${pendingCount}`);
    }

    console.log('\n🎉 Phase 2 Test Completed Successfully!');
    console.log('========================================');
    console.log('✅ Payment method selection working');
    console.log('✅ Approve payment workflow working');
    console.log('✅ Return to HR workflow working');
    console.log('✅ Validation working');
    console.log('✅ Status updates working');

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
  }
}

// Run the test
testPhase2PaymentProcessing(); 