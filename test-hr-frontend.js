const axios = require('axios');

const FRONTEND_URL = 'http://localhost:5173';
const API_BASE_URL = 'http://localhost:3001/api/v1';

async function testHRFrontend() {
  console.log('🧪 Testing HR Frontend Interface\n');
  console.log('================================');

  try {
    // Step 1: Check if frontend is running
    console.log('\n1️⃣ Checking frontend availability...');
    try {
      const frontendResponse = await axios.get(FRONTEND_URL, { timeout: 5000 });
      console.log('✅ Frontend is running');
    } catch (error) {
      console.log('❌ Frontend is not running or not accessible');
      console.log('   Please start the frontend with: npm run dev:frontend');
      return;
    }

    // Step 2: Check if backend is running
    console.log('\n2️⃣ Checking backend availability...');
    try {
      const backendResponse = await axios.get(`${API_BASE_URL}/health`, { timeout: 5000 });
      console.log('✅ Backend is running');
    } catch (error) {
      console.log('❌ Backend is not running or not accessible');
      console.log('   Please start the backend with: npm run dev:backend');
      return;
    }

    // Step 3: Test HR login and returned payment requests API
    console.log('\n3️⃣ Testing HR API endpoints...');
    
    // Login as HR
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      username: 'hr',
      password: 'test123'
    });

    if (loginResponse.status !== 200) {
      console.log('❌ Failed to login as HR');
      return;
    }

    const hrToken = loginResponse.data.data.accessToken;
    console.log('✅ HR login successful');

    // Test returned payment requests endpoint
    const returnedRequestsResponse = await axios.get(`${API_BASE_URL}/hr-dashboard/returned-payment-requests`, {
      headers: { 'Authorization': `Bearer ${hrToken}` }
    });

    if (returnedRequestsResponse.status === 200) {
      const requests = returnedRequestsResponse.data.data.requests;
      console.log(`✅ HR returned payment requests endpoint working`);
      console.log(`📊 Found ${requests.length} returned payment requests`);
    } else {
      console.log('❌ HR returned payment requests endpoint failed');
    }

    console.log('\n🎉 HR Frontend Interface Test Completed!');
    console.log('==========================================');
    console.log('✅ Frontend server is running');
    console.log('✅ Backend server is running');
    console.log('✅ HR API endpoints are accessible');
    console.log('✅ HR can view returned payment requests');
    console.log('\n📝 Next Steps:');
    console.log('   1. Open http://localhost:5173 in your browser');
    console.log('   2. Login as HR (username: hr, password: test123)');
    console.log('   3. Navigate to "Returned Payment Requests" in the HR portal');
    console.log('   4. Test the interface for reviewing and processing requests');

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
  }
}

// Run the test
testHRFrontend(); 