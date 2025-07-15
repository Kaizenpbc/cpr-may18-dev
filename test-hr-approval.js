const http = require('http');

// Test configuration
const HR_USER = {
  username: 'hr',
  password: 'test123'  // Try common password
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

// Login as HR
async function loginAsHR() {
  console.log('🔐 Logging in as HR...');
  const response = await makeRequest('POST', '/api/v1/auth/login', {
    username: HR_USER.username,
    password: HR_USER.password
  });

  if (response.status === 200) {
    authToken = response.data.data.accessToken;
    console.log('✅ HR login successful');
    return true;
  } else {
    console.log('❌ HR login failed:', response.data);
    return false;
  }
}

// Get pending timesheets
async function getPendingTimesheets() {
  console.log('\n📊 Getting pending timesheets...');
  const response = await makeRequest('GET', '/api/v1/timesheet?status=pending');
  
  console.log(`Status: ${response.status}`);
  if (response.status === 200) {
    const timesheets = response.data.data.timesheets;
    console.log(`Found ${timesheets.length} pending timesheets`);
    return timesheets;
  } else {
    console.log('❌ Failed to get timesheets:', response.data);
    return [];
  }
}

// Approve a timesheet
async function approveTimesheet(timesheetId) {
  console.log(`\n✅ Approving timesheet ID: ${timesheetId}`);
  const response = await makeRequest('POST', `/api/v1/timesheet/${timesheetId}/approve`, {
    action: 'approve',
    comment: 'Test approval - should trigger payment request creation'
  });
  
  console.log(`Status: ${response.status}`);
  if (response.status === 200) {
    console.log('✅ Timesheet approved successfully');
    console.log('Response:', response.data);
    return response.data;
  } else {
    console.log('❌ Failed to approve timesheet:', response.data);
    return null;
  }
}

// Check payment requests after approval
async function checkPaymentRequests() {
  console.log('\n💰 Checking payment requests after approval...');
  
  // Login as accountant to check payment requests
  const accountantResponse = await makeRequest('POST', '/api/v1/auth/login', {
    username: 'accountant',
    password: 'test123'
  });

  if (accountantResponse.status === 200) {
    const accountantToken = accountantResponse.data.data.accessToken;
    
    const response = await makeRequest('GET', '/api/v1/payment-requests', null, {
      'Authorization': `Bearer ${accountantToken}`
    });
    
    console.log(`Status: ${response.status}`);
    if (response.status === 200) {
      const requests = response.data.data.requests;
      console.log(`Found ${requests.length} payment requests after approval`);
      if (requests.length > 0) {
        console.log('✅ Payment request was created successfully!');
        console.log('Latest payment request:', requests[0]);
      } else {
        console.log('❌ No payment request was created');
      }
      return requests;
    } else {
      console.log('❌ Failed to get payment requests:', response.data);
      return [];
    }
  } else {
    console.log('❌ Failed to login as accountant');
    return [];
  }
}

// Main test function
async function testHRApproval() {
  console.log('🎯 Testing HR Timesheet Approval Workflow\n');
  console.log('=========================================');

  try {
    // Step 1: Login as HR
    const loginSuccess = await loginAsHR();
    if (!loginSuccess) {
      console.log('❌ Cannot proceed without HR login');
      return;
    }

    // Step 2: Get pending timesheets
    const pendingTimesheets = await getPendingTimesheets();
    if (pendingTimesheets.length === 0) {
      console.log('❌ No pending timesheets to approve');
      return;
    }

    // Step 3: Approve the first pending timesheet
    const firstTimesheet = pendingTimesheets[0];
    console.log(`\n📝 Approving timesheet: ID ${firstTimesheet.id}, Instructor: ${firstTimesheet.instructor_name}, Week: ${firstTimesheet.week_start_date}`);
    
    const approvalResult = await approveTimesheet(firstTimesheet.id);
    if (!approvalResult) {
      console.log('❌ Timesheet approval failed');
      return;
    }

    // Step 4: Wait a moment for async processing
    console.log('\n⏳ Waiting 3 seconds for payment request creation...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Step 5: Check if payment request was created
    await checkPaymentRequests();

    console.log('\n🎉 HR Approval Test Completed!');
    console.log('================================');

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
  }
}

testHRApproval(); 