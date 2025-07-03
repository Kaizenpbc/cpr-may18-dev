const axios = require('axios');

async function testFrontendAnalytics() {
  try {
    console.log('🔍 Testing Frontend Analytics Components...\n');

    // 1. Test if frontend can access analytics endpoints
    console.log('1. Testing frontend access to analytics endpoints...');
    
    // First login to get a token
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
    console.log('2. Testing course request analytics...');
    try {
      const courseAnalytics = await axios.get('http://localhost:3001/api/v1/organization/analytics/course-requests?timeframe=12', { headers });
      console.log('✅ Course analytics accessible from frontend');
      console.log('   Summary:', courseAnalytics.data.data.summary);
      console.log('   Course types:', courseAnalytics.data.data.courseTypes.length);
    } catch (error) {
      console.log('❌ Course analytics failed:', error.response?.data || error.message);
    }

    // 3. Test student participation analytics
    console.log('\n3. Testing student participation analytics...');
    try {
      const studentAnalytics = await axios.get('http://localhost:3001/api/v1/organization/analytics/student-participation?timeframe=12', { headers });
      console.log('✅ Student analytics accessible from frontend');
      console.log('   Summary:', studentAnalytics.data.data.summary);
    } catch (error) {
      console.log('❌ Student analytics failed:', error.response?.data || error.message);
    }

    // 4. Test billing analytics
    console.log('\n4. Testing billing analytics...');
    try {
      const billingAnalytics = await axios.get('http://localhost:3001/api/v1/organization/analytics/billing?timeframe=12', { headers });
      console.log('✅ Billing analytics accessible from frontend');
      console.log('   Summary:', billingAnalytics.data.data.summary);
    } catch (error) {
      console.log('❌ Billing analytics failed:', error.response?.data || error.message);
    }

    // 5. Test frontend organization portal access
    console.log('\n5. Testing frontend organization portal...');
    try {
      const frontendResponse = await axios.get('http://localhost:5173', { timeout: 5000 });
      console.log('✅ Frontend organization portal accessible');
      console.log('   Status:', frontendResponse.status);
    } catch (error) {
      console.log('❌ Frontend access failed:', error.message);
    }

    console.log('\n🎉 Frontend Analytics Test Complete!');

  } catch (error) {
    console.error('❌ Test error:', error.response?.data || error.message);
  }
}

testFrontendAnalytics(); 