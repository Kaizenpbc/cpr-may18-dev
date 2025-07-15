const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001/api/v1';

async function testReturnPaymentToHR() {
  console.log('🧪 Testing Return Payment Request to HR\n');
  console.log('======================================');

  try {
    // Step 1: Login as accountant
    console.log('\n1️⃣ Logging in as accountant...');
    const accountantLoginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      username: 'accountant',
      password: 'test123'
    });

    if (accountantLoginResponse.status !== 200) {
      console.log('❌ Failed to login as accountant');
      return;
    }

    const accountantToken = accountantLoginResponse.data.data.accessToken;
    console.log('✅ Accountant login successful');

    // Step 2: Get pending payment requests
    console.log('\n2️⃣ Getting pending payment requests...');
    const pendingRequestsResponse = await axios.get(`${API_BASE_URL}/payment-requests`, {
      headers: { 'Authorization': `Bearer ${accountantToken}` },
      params: { status: 'pending', limit: 10 }
    });

    if (pendingRequestsResponse.status !== 200) {
      console.log('❌ Failed to get pending payment requests');
      return;
    }

    const pendingRequests = pendingRequestsResponse.data.data.requests;
    console.log(`✅ Found ${pendingRequests.length} pending payment requests`);

    if (pendingRequests.length === 0) {
      console.log('❌ No pending payment requests to return to HR');
      return;
    }

    // Step 3: Return the first pending request to HR
    console.log('\n3️⃣ Returning payment request to HR...');
    const firstRequest = pendingRequests[0];
    console.log(`📋 Returning payment request ID: ${firstRequest.id} (Instructor: ${firstRequest.instructor_name})`);

    const returnResponse = await axios.post(`${API_BASE_URL}/payment-requests/${firstRequest.id}/process`, {
      action: 'return_to_hr',
      notes: 'Returning to HR for review - missing documentation and verification needed'
    }, {
      headers: { 'Authorization': `Bearer ${accountantToken}` }
    });

    if (returnResponse.status !== 200) {
      console.log('❌ Failed to return payment request to HR');
      console.log('Response:', returnResponse.data);
      return;
    }

    console.log('✅ Successfully returned payment request to HR');
    console.log('Response:', returnResponse.data);

    // Step 4: Verify the payment request status was updated
    console.log('\n4️⃣ Verifying payment request status...');
    const verifyResponse = await axios.get(`${API_BASE_URL}/payment-requests/${firstRequest.id}/detail`, {
      headers: { 'Authorization': `Bearer ${accountantToken}` }
    });

    if (verifyResponse.status === 200) {
      const updatedRequest = verifyResponse.data.data;
      console.log('✅ Payment request details retrieved');
      console.log(`📝 Status: ${updatedRequest.status}`);
      console.log(`📝 Notes: ${updatedRequest.notes}`);
    }

    // Step 5: Login as HR and check if the returned request appears
    console.log('\n5️⃣ Logging in as HR to check returned payment requests...');
    const hrLoginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      username: 'hr',
      password: 'test123'
    });

    if (hrLoginResponse.status !== 200) {
      console.log('❌ Failed to login as HR');
      return;
    }

    const hrToken = hrLoginResponse.data.data.accessToken;
    console.log('✅ HR login successful');

    // Step 6: Check returned payment requests
    console.log('\n6️⃣ Checking returned payment requests in HR portal...');
    const returnedRequestsResponse = await axios.get(`${API_BASE_URL}/hr-dashboard/returned-payment-requests`, {
      headers: { 'Authorization': `Bearer ${hrToken}` }
    });

    if (returnedRequestsResponse.status === 200) {
      const returnedRequests = returnedRequestsResponse.data.data.requests;
      console.log(`✅ Found ${returnedRequests.length} returned payment requests in HR portal`);
      
      if (returnedRequests.length > 0) {
        console.log('📋 Returned payment requests:');
        returnedRequests.forEach((request, index) => {
          console.log(`   ${index + 1}. ID: ${request.id}, Instructor: ${request.instructor_name}, Amount: $${request.amount}`);
        });
      }
    } else {
      console.log('❌ Failed to get returned payment requests from HR portal');
    }

    console.log('\n🎉 Test Completed Successfully!');
    console.log('================================');
    console.log('✅ Accountant successfully returned payment request to HR');
    console.log('✅ HR portal now shows the returned payment request');
    console.log('\n📝 Next Steps:');
    console.log('   1. Open http://localhost:5173 in your browser');
    console.log('   2. Login as HR (username: hr, password: test123)');
    console.log('   3. Navigate to "Returned Payment Requests" in the HR portal');
    console.log('   4. You should now see the returned payment request');
    console.log('   5. Test the interface for reviewing and processing the request');

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the test
testReturnPaymentToHR(); 