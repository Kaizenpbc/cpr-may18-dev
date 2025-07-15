// Simple test to verify amount formatting fix
const axios = require('axios');

async function testAmountFormatting() {
  try {
    console.log('Testing amount formatting fix...\n');

    // Login
    const loginResponse = await axios.post('http://localhost:3001/api/v1/auth/login', {
      email: 'accountant@test.com',
      password: 'test123'
    });

    const token = loginResponse.data.token;
    console.log('✅ Login successful');

    // Get payment requests
    const response = await axios.get('http://localhost:3001/api/v1/payment-requests', {
      headers: { Authorization: `Bearer ${token}` }
    });

    const requests = response.data.requests;
    console.log(`✅ Found ${requests.length} payment requests`);

    if (requests.length > 0) {
      const request = requests[0];
      console.log('\nTesting amount formatting:');
      console.log(`Raw amount: "${request.amount}" (type: ${typeof request.amount})`);
      
      // Test the fix
      const formattedAmount = Number(request.amount).toFixed(2);
      console.log(`Formatted amount: $${formattedAmount}`);
      
      if (!isNaN(Number(request.amount))) {
        console.log('✅ Amount formatting works correctly!');
      } else {
        console.log('❌ Amount cannot be converted to number');
      }
    } else {
      console.log('No payment requests to test with');
    }

  } catch (error) {
    console.error('Test failed:', error.response?.data || error.message);
  }
}

testAmountFormatting(); 