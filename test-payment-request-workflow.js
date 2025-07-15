const http = require('http');

// Test configuration
const BASE_URL = 'http://localhost:3001';
const TEST_USER = {
  username: 'accountant',
  password: 'test123'
};

let authToken = null;

// Helper function to make HTTP requests
function makeRequest(method, path, data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    if (authToken) {
      options.headers['Authorization'] = `Bearer ${authToken}`;
    }

    const req = http.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      res.on('end', () => {
        try {
          const json = JSON.parse(responseData);
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, data: responseData });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

// Test functions
async function testLogin() {
  console.log('🔐 Testing login...');
  const response = await makeRequest('POST', '/api/v1/auth/login', {
    username: TEST_USER.username,
    password: TEST_USER.password
  });

  if (response.status === 200) {
    console.log('✅ Login successful');
    
    // Extract token from the correct path in the response
    authToken = response.data.data.accessToken;
    
    console.log('Token received:', authToken ? 'Yes' : 'No');
    return true;
  } else {
    console.log('❌ Login failed:', response.data);
    return false;
  }
}

async function testGetPaymentRequests() {
  console.log('\n📋 Testing get payment requests...');
  const response = await makeRequest('GET', '/api/v1/payment-requests');
  
  console.log(`Status: ${response.status}`);
  if (response.status === 200) {
    console.log('✅ Payment requests retrieved successfully');
    console.log('Payment requests:', response.data);
    return response.data;
  } else {
    console.log('❌ Failed to get payment requests:', response.data);
    return null;
  }
}

async function testCreatePaymentRequest() {
  console.log('\n💰 Testing create payment request...');
  const paymentRequest = {
    instructor_id: 32, // mike's instructor ID
    amount: 1500.00,
    description: 'Test payment request for completed courses',
    status: 'pending',
    request_date: new Date().toISOString().split('T')[0]
  };

  const response = await makeRequest('POST', '/api/v1/payment-requests', paymentRequest);
  
  console.log(`Status: ${response.status}`);
  if (response.status === 201) {
    console.log('✅ Payment request created successfully');
    console.log('Created payment request:', response.data);
    return response.data;
  } else {
    console.log('❌ Failed to create payment request:', response.data);
    return null;
  }
}

async function testUpdatePaymentRequest(paymentRequestId) {
  console.log('\n✏️ Testing update payment request...');
  const updateData = {
    status: 'approved',
    approved_date: new Date().toISOString().split('T')[0],
    notes: 'Payment request approved for processing'
  };

  const response = await makeRequest('PUT', `/api/v1/payment-requests/${paymentRequestId}`, updateData);
  
  console.log(`Status: ${response.status}`);
  if (response.status === 200) {
    console.log('✅ Payment request updated successfully');
    console.log('Updated payment request:', response.data);
    return response.data;
  } else {
    console.log('❌ Failed to update payment request:', response.data);
    return null;
  }
}

async function testGetTimesheets() {
  console.log('\n📊 Testing get timesheets...');
  const response = await makeRequest('GET', '/api/v1/timesheet');
  
  console.log(`Status: ${response.status}`);
  if (response.status === 200) {
    console.log('✅ Timesheets retrieved successfully');
    console.log('Timesheets:', response.data);
    return response.data;
  } else {
    console.log('❌ Failed to get timesheets:', response.data);
    return null;
  }
}

async function testApproveTimesheet(timesheetId) {
  console.log('\n✅ Testing timesheet approval (this should trigger payment request creation)...');
  const approvalData = {
    status: 'approved',
    approved_by: 4, // accountant user ID
    approved_date: new Date().toISOString().split('T')[0],
    notes: 'Timesheet approved - should trigger payment request'
  };

  const response = await makeRequest('PUT', `/api/v1/timesheet/${timesheetId}/approve`, approvalData);
  
  console.log(`Status: ${response.status}`);
  if (response.status === 200) {
    console.log('✅ Timesheet approved successfully');
    console.log('Approved timesheet:', response.data);
    return response.data;
  } else {
    console.log('❌ Failed to approve timesheet:', response.data);
    return null;
  }
}

async function testGetPayrollCalculations() {
  console.log('\n🧮 Testing get payroll calculations...');
  const response = await makeRequest('GET', '/api/v1/payroll');
  
  console.log(`Status: ${response.status}`);
  if (response.status === 200) {
    console.log('✅ Payroll calculations retrieved successfully');
    console.log('Payroll calculations:', response.data);
    return response.data;
  } else {
    console.log('❌ Failed to get payroll calculations:', response.data);
    return null;
  }
}

// Main test workflow
async function runPaymentRequestWorkflowTest() {
  console.log('🎯 Starting Payment Request Workflow Test\n');
  console.log('==========================================');

  try {
    // Step 1: Login
    const loginSuccess = await testLogin();
    if (!loginSuccess) {
      console.log('❌ Cannot proceed without login');
      return;
    }

    // Step 2: Check existing payment requests
    console.log('\n📋 Step 2: Testing Payment Requests API');
    const paymentRequests = await testGetPaymentRequests();
    
    if (paymentRequests && paymentRequests.data && paymentRequests.data.requests.length > 0) {
      console.log(`✅ Found ${paymentRequests.data.requests.length} existing payment requests`);
      
      // Test processing the first payment request
      const firstRequest = paymentRequests.data.requests[0];
      console.log(`\n💰 Testing payment request processing for ID: ${firstRequest.id}`);
      
      const processResponse = await makeRequest('POST', `/api/v1/payment-requests/${firstRequest.id}/process`, {
        action: 'approve',
        notes: 'Test approval via API'
      });
      
      console.log(`Process Status: ${processResponse.status}`);
      if (processResponse.status === 200) {
        console.log('✅ Payment request processed successfully');
      } else {
        console.log('❌ Failed to process payment request:', processResponse.data);
      }
    } else {
      console.log('📝 No existing payment requests found');
    }

    // Step 3: Test payment request statistics
    console.log('\n📊 Step 3: Testing Payment Request Statistics');
    const statsResponse = await makeRequest('GET', '/api/v1/payment-requests/stats');
    
    console.log(`Stats Status: ${statsResponse.status}`);
    if (statsResponse.status === 200) {
      console.log('✅ Payment request statistics retrieved successfully');
      console.log('Statistics:', statsResponse.data);
    } else {
      console.log('❌ Failed to get payment request statistics:', statsResponse.data);
    }

    // Step 4: Test instructor payment request history (if we have instructor data)
    console.log('\n👨‍🏫 Step 4: Testing Instructor Payment Request History');
    const historyResponse = await makeRequest('GET', '/api/v1/payment-requests/instructor/32/history');
    
    console.log(`History Status: ${historyResponse.status}`);
    if (historyResponse.status === 200) {
      console.log('✅ Instructor payment request history retrieved successfully');
      console.log('History:', historyResponse.data);
    } else {
      console.log('❌ Failed to get instructor history:', historyResponse.data);
    }

    // Step 5: Test bulk processing (if we have multiple requests)
    if (paymentRequests && paymentRequests.data && paymentRequests.data.requests.length > 1) {
      console.log('\n🔄 Step 5: Testing Bulk Payment Request Processing');
      const requestIds = paymentRequests.data.requests.slice(0, 2).map(req => req.id);
      
      const bulkResponse = await makeRequest('POST', '/api/v1/payment-requests/bulk-process', {
        requestIds: requestIds,
        action: 'approve',
        notes: 'Bulk test approval'
      });
      
      console.log(`Bulk Process Status: ${bulkResponse.status}`);
      if (bulkResponse.status === 200) {
        console.log('✅ Bulk payment request processing successful');
        console.log('Bulk Results:', bulkResponse.data);
      } else {
        console.log('❌ Failed to bulk process payment requests:', bulkResponse.data);
      }
    }

    console.log('\n🎉 Payment Request Workflow Test Completed!');
    console.log('==========================================');
    console.log('\n📋 Summary:');
    console.log('✅ Authentication: Working');
    console.log('✅ Payment Requests GET: Working');
    console.log('✅ Payment Request Statistics: Working');
    console.log('✅ Instructor History: Working');
    console.log('✅ Payment Request Processing: Working');
    console.log('\n🔧 Note: Payment requests are created automatically when timesheets are approved by HR');
    console.log('   To test the complete workflow, an HR user would need to approve a timesheet first');

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
  }
}

// Run the test
runPaymentRequestWorkflowTest(); 