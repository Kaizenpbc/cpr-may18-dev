const axios = require('axios');

const API_BASE = 'http://localhost:3001/api/v1';

async function testPaymentRequestDetail() {
  try {
    console.log('🔍 Testing Payment Request Detail Dialog...\n');

    // Login as accountant
    console.log('1. Logging in as accountant...');
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: 'accountant@test.com',
      password: 'test123'
    });

    const token = loginResponse.data.token;
    console.log('✅ Login successful\n');

    // Get payment requests
    console.log('2. Fetching payment requests...');
    const requestsResponse = await axios.get(`${API_BASE}/payment-requests`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const requests = requestsResponse.data.requests;
    console.log(`✅ Found ${requests.length} payment requests`);

    if (requests.length === 0) {
      console.log('❌ No payment requests found to test with');
      return;
    }

    // Test the first payment request
    const testRequest = requests[0];
    console.log('\n3. Testing payment request details:');
    console.log(`   ID: ${testRequest.id}`);
    console.log(`   Amount (raw): ${testRequest.amount} (type: ${typeof testRequest.amount})`);
    console.log(`   Amount (formatted): $${Number(testRequest.amount).toFixed(2)}`);
    console.log(`   Status: ${testRequest.status}`);
    console.log(`   Instructor: ${testRequest.instructor_name}`);

    // Test the amount conversion
    const amount = Number(testRequest.amount);
    if (isNaN(amount)) {
      console.log('❌ ERROR: Amount cannot be converted to number');
    } else {
      console.log(`✅ Amount successfully converted to number: ${amount}`);
      console.log(`✅ Formatted amount: $${amount.toFixed(2)}`);
    }

    // Test getting single payment request detail
    console.log('\n4. Testing single payment request endpoint...');
    const detailResponse = await axios.get(`${API_BASE}/payment-requests/${testRequest.id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const detail = detailResponse.data;
    console.log(`✅ Single payment request retrieved successfully`);
    console.log(`   Amount: $${Number(detail.amount).toFixed(2)}`);
    console.log(`   Status: ${detail.status}`);

    console.log('\n🎉 Payment request detail test completed successfully!');
    console.log('The frontend should now display amounts correctly without errors.');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testPaymentRequestDetail(); 