const axios = require('axios');

async function testBrowserCourseRequest() {
  try {
    console.log('🔍 Testing Browser Course Request Form...\n');

    // 1. Test course types API (what the frontend calls)
    console.log('1. Testing course types API (frontend endpoint)...');
    const courseTypesResponse = await axios.get('http://localhost:3001/api/v1/course-types');
    
    if (courseTypesResponse.data.success) {
      console.log('✅ Course types API working');
      console.log('   Response format check:');
      console.log('   - Has "id" field:', courseTypesResponse.data.data[0].hasOwnProperty('id'));
      console.log('   - Has "name" field:', courseTypesResponse.data.data[0].hasOwnProperty('name'));
      console.log('   - Old "coursetypeid" field:', courseTypesResponse.data.data[0].hasOwnProperty('coursetypeid'));
      console.log('   - Old "coursetypename" field:', courseTypesResponse.data.data[0].hasOwnProperty('coursetypename'));
      
      console.log('\n   Available courses:');
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

    console.log('✅ Login successful');
    console.log('   User role:', loginResponse.data.data.user.role);
    console.log('   Organization ID:', loginResponse.data.data.user.organizationId);

    // 3. Test frontend accessibility
    console.log('\n3. Testing frontend accessibility...');
    try {
      const frontendResponse = await axios.get('http://localhost:5173', { timeout: 5000 });
      console.log('✅ Frontend accessible');
      console.log('   Status:', frontendResponse.status);
    } catch (error) {
      console.log('❌ Frontend not accessible:', error.message);
    }

    console.log('\n🎉 Browser Course Request Test Complete!');
    console.log('\n📝 Next Steps:');
    console.log('1. Open http://localhost:5173 in your browser');
    console.log('2. Login with orguser / test123');
    console.log('3. Navigate to the course request form');
    console.log('4. Check if course names are now showing in the dropdown');

  } catch (error) {
    console.error('❌ Test error:', error.response?.data || error.message);
  }
}

testBrowserCourseRequest(); 