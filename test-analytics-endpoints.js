const axios = require('axios');

async function testAnalyticsEndpoints() {
  try {
    console.log('🔍 Testing Organization Analytics Endpoints...\n');

    // 1. Login as organization user
    console.log('1. Logging in as orguser...');
    const loginResponse = await axios.post('http://localhost:3001/api/v1/auth/login', {
      username: 'orguser',
      password: 'test123'
    });

    if (!loginResponse.data.success) {
      console.log('❌ Login failed');
      return;
    }

    const token = loginResponse.data.data.accessToken;
    const headers = { 'Authorization': `Bearer ${token}` };
    console.log('✅ Login successful\n');

    // 2. Test course request analytics
    console.log('2. Testing GET /organization/analytics/course-requests...');
    try {
      const analyticsResponse = await axios.get('http://localhost:3001/api/v1/organization/analytics/course-requests?timeframe=12', { headers });
      console.log('✅ Course request analytics response:');
      console.log('Status:', analyticsResponse.status);
      console.log('Data:', JSON.stringify(analyticsResponse.data, null, 2));
    } catch (error) {
      console.log('❌ Course request analytics failed:');
      console.log('Status:', error.response?.status);
      console.log('Error:', error.response?.data || error.message);
    }

    // 3. Test student participation analytics
    console.log('\n3. Testing GET /organization/analytics/student-participation...');
    try {
      const studentAnalyticsResponse = await axios.get('http://localhost:3001/api/v1/organization/analytics/student-participation?timeframe=12', { headers });
      console.log('✅ Student participation analytics response:');
      console.log('Status:', studentAnalyticsResponse.status);
      console.log('Data:', JSON.stringify(studentAnalyticsResponse.data, null, 2));
    } catch (error) {
      console.log('❌ Student participation analytics failed:');
      console.log('Status:', error.response?.status);
      console.log('Error:', error.response?.data || error.message);
    }

    // 4. Test billing analytics
    console.log('\n4. Testing GET /organization/analytics/billing...');
    try {
      const billingAnalyticsResponse = await axios.get('http://localhost:3001/api/v1/organization/analytics/billing?timeframe=12', { headers });
      console.log('✅ Billing analytics response:');
      console.log('Status:', billingAnalyticsResponse.status);
      console.log('Data:', JSON.stringify(billingAnalyticsResponse.data, null, 2));
    } catch (error) {
      console.log('❌ Billing analytics failed:');
      console.log('Status:', error.response?.status);
      console.log('Error:', error.response?.data || error.message);
    }

  } catch (error) {
    console.error('❌ Test error:', {
      message: error.message,
      response: error.response?.data,
      stack: error.stack
    });
  }
}

testAnalyticsEndpoints(); 