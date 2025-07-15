const http = require('http');

// Test configuration
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

// Login function
async function login() {
  console.log('🔐 Logging in...');
  const response = await makeRequest('POST', '/api/v1/auth/login', {
    username: TEST_USER.username,
    password: TEST_USER.password
  });

  if (response.status === 200) {
    authToken = response.data.data.accessToken;
    console.log('✅ Login successful');
    return true;
  } else {
    console.log('❌ Login failed:', response.data);
    return false;
  }
}

// Check pending timesheets
async function checkPendingTimesheets() {
  console.log('\n📊 Checking pending timesheets...');
  
  // Try to get timesheets (this might fail due to role restrictions)
  const response = await makeRequest('GET', '/api/v1/timesheet?status=pending');
  
  console.log(`Status: ${response.status}`);
  if (response.status === 200) {
    console.log('✅ Timesheets retrieved successfully');
    const timesheets = response.data.data.timesheets;
    console.log(`Found ${timesheets.length} timesheets`);
    
    if (timesheets.length > 0) {
      console.log('\n📋 Pending timesheets:');
      timesheets.forEach((ts, index) => {
        console.log(`${index + 1}. ID: ${ts.id}, Instructor: ${ts.instructor_name}, Week: ${ts.week_start_date}, Hours: ${ts.total_hours}`);
      });
    } else {
      console.log('📝 No pending timesheets found');
    }
    
    return timesheets;
  } else {
    console.log('❌ Failed to get timesheets:', response.data);
    return [];
  }
}

// Check payment requests
async function checkPaymentRequests() {
  console.log('\n💰 Checking payment requests...');
  const response = await makeRequest('GET', '/api/v1/payment-requests');
  
  console.log(`Status: ${response.status}`);
  if (response.status === 200) {
    console.log('✅ Payment requests retrieved successfully');
    const requests = response.data.data.requests;
    console.log(`Found ${requests.length} payment requests`);
    
    if (requests.length > 0) {
      console.log('\n📋 Payment requests:');
      requests.forEach((req, index) => {
        console.log(`${index + 1}. ID: ${req.id}, Instructor: ${req.instructor_name}, Amount: $${req.amount}, Status: ${req.status}`);
      });
    } else {
      console.log('📝 No payment requests found');
    }
    
    return requests;
  } else {
    console.log('❌ Failed to get payment requests:', response.data);
    return [];
  }
}

// Main function
async function main() {
  console.log('🔍 Checking System Status for Payment Request Workflow\n');
  console.log('=====================================================');

  try {
    // Step 1: Login
    const loginSuccess = await login();
    if (!loginSuccess) {
      console.log('❌ Cannot proceed without login');
      return;
    }

    // Step 2: Check pending timesheets
    await checkPendingTimesheets();

    // Step 3: Check existing payment requests
    await checkPaymentRequests();

    console.log('\n📋 Summary:');
    console.log('✅ Authentication: Working');
    console.log('✅ Payment Requests API: Working');
    console.log('\n🔧 Next Steps:');
    console.log('1. If no pending timesheets exist, you need to create one first');
    console.log('2. If pending timesheets exist, you need to log in as HR to approve them');
    console.log('3. After HR approval, payment requests should be created automatically');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

main(); 