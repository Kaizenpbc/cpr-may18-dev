const axios = require('axios');

async function testCourseRequestForm() {
  try {
    console.log('🔍 Testing Course Request Form...\n');

    // 1. Test course types API
    console.log('1. Testing course types API...');
    const courseTypesResponse = await axios.get('http://localhost:3001/api/v1/course-types');
    
    if (courseTypesResponse.data.success) {
      console.log('✅ Course types API working');
      console.log('   Available courses:');
      courseTypesResponse.data.data.forEach(course => {
        console.log(`   - ${course.name} (ID: ${course.id})`);
      });
    } else {
      console.log('❌ Course types API failed');
      return;
    }

    // 2. Test organization login
    console.log('\n2. Testing organization login...');
    const loginResponse = await axios.post('http://localhost:3001/api/v1/auth/login', {
      username: 'orguser',
      password: 'test123'
    });

    if (!loginResponse.data.success) {
      console.log('❌ Login failed');
      return;
    }

    const token = loginResponse.data.data.accessToken;
    console.log('✅ Login successful');

    // 3. Test course request submission
    console.log('\n3. Testing course request submission...');
    const courseRequestData = {
      courseTypeId: courseTypesResponse.data.data[0].id, // Use first available course
      scheduledDate: new Date().toISOString().split('T')[0],
      location: 'Test Location',
      registeredStudents: '10',
      notes: 'Test course request from script'
    };

    const requestResponse = await axios.post(
      'http://localhost:3001/api/v1/organization/course-request',
      courseRequestData,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );

    if (requestResponse.data.success) {
      console.log('✅ Course request submitted successfully');
      console.log('   Response:', JSON.stringify(requestResponse.data, null, 2));
    } else {
      console.log('❌ Course request failed:', requestResponse.data.message);
    }

    console.log('\n🎉 Course Request Form Test Complete!');

  } catch (error) {
    console.error('❌ Test error:', error.response?.data || error.message);
  }
}

testCourseRequestForm(); 