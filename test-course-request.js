const axios = require('axios');

async function testCourseRequest() {
  try {
    console.log('🔍 Testing Organization Course Request Endpoint...\n');

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

    // 2. Get course types first
    console.log('2. Getting course types...');
    try {
      const courseTypesResponse = await axios.get('http://localhost:3001/api/v1/course-types', { headers });
      console.log('✅ Course types response:');
      console.log('Full response:', JSON.stringify(courseTypesResponse.data, null, 2));
      console.log('Available course types:', courseTypesResponse.data.data?.map(ct => ({ id: ct.id, name: ct.name })));
      
      const courseTypeId = courseTypesResponse.data.data?.[0]?.id;
      if (!courseTypeId) {
        console.log('❌ No course types available');
        return;
      }

      // 3. Test course request with correct field names
      console.log('\n3. Testing POST /organization/course-request...');
      const courseRequestData = {
        scheduledDate: '2025-08-15',
        location: 'Test Location',
        courseTypeId: courseTypeId,
        registeredStudents: 15,
        notes: 'Test course request'
      };

      console.log('Request data:', courseRequestData);

      const courseRequestResponse = await axios.post('http://localhost:3001/api/v1/organization/course-request', courseRequestData, { headers });
      console.log('✅ Course request response:');
      console.log('Status:', courseRequestResponse.status);
      console.log('Data:', JSON.stringify(courseRequestResponse.data, null, 2));

    } catch (error) {
      console.log('❌ Course request failed:');
      console.log('Status:', error.response?.status);
      console.log('Error:', error.response?.data || error.message);
    }

  } catch (error) {
    console.error('❌ Test error:', error.response?.data || error.message);
  }
}

testCourseRequest(); 