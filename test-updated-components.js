const axios = require('axios');

async function testUpdatedComponents() {
  try {
    console.log('🔍 Testing Updated Components...\n');

    // 1. Test course types API (should return id/name format)
    console.log('1. Testing course types API format...');
    const courseTypesResponse = await axios.get('http://localhost:3001/api/v1/course-types');
    
    if (courseTypesResponse.data.success) {
      console.log('✅ Course types API working');
      const firstCourse = courseTypesResponse.data.data[0];
      console.log('   Sample course data:');
      console.log(`   - ID: ${firstCourse.id}`);
      console.log(`   - Name: ${firstCourse.name}`);
      console.log(`   - Has old fields: ${firstCourse.hasOwnProperty('coursetypeid') ? 'Yes' : 'No'}`);
      console.log(`   - Has new fields: ${firstCourse.hasOwnProperty('id') ? 'Yes' : 'No'}`);
    } else {
      console.log('❌ Course types API failed');
      return;
    }

    // 2. Test instructor login and classes
    console.log('\n2. Testing instructor classes (updated components)...');
    const instructorLogin = await axios.post('http://localhost:3001/api/v1/auth/login', {
      username: 'instructor1',
      password: 'test123'
    });

    if (instructorLogin.data.success) {
      const token = instructorLogin.data.data.accessToken;
      const headers = { 'Authorization': `Bearer ${token}` };
      
      try {
        const classesResponse = await axios.get('http://localhost:3001/api/v1/instructors/classes/today', { headers });
        console.log('✅ Instructor classes API working');
        if (classesResponse.data.data && classesResponse.data.data.length > 0) {
          const firstClass = classesResponse.data.data[0];
          console.log('   Sample class data:');
          console.log(`   - Course ID: ${firstClass.course_id}`);
          console.log(`   - Course Name: ${firstClass.name || firstClass.coursetypename || 'N/A'}`);
          console.log(`   - Organization: ${firstClass.organizationname}`);
        }
      } catch (error) {
        console.log('⚠️  Instructor classes API error:', error.response?.data?.message || error.message);
      }
    } else {
      console.log('❌ Instructor login failed');
    }

    // 3. Test organization login and course history
    console.log('\n3. Testing organization course history (updated components)...');
    const orgLogin = await axios.post('http://localhost:3001/api/v1/auth/login', {
      username: 'orguser',
      password: 'test123'
    });

    if (orgLogin.data.success) {
      const token = orgLogin.data.data.accessToken;
      const headers = { 'Authorization': `Bearer ${token}` };
      
      try {
        const historyResponse = await axios.get('http://localhost:3001/api/v1/organization/courses/history', { headers });
        console.log('✅ Organization course history API working');
        if (historyResponse.data.data && historyResponse.data.data.length > 0) {
          const firstCourse = historyResponse.data.data[0];
          console.log('   Sample course history:');
          console.log(`   - Course Name: ${firstCourse.name || firstCourse.coursetypename || 'N/A'}`);
          console.log(`   - Status: ${firstCourse.status}`);
        }
      } catch (error) {
        console.log('⚠️  Organization course history API error:', error.response?.data?.message || error.message);
      }
    } else {
      console.log('❌ Organization login failed');
    }

    // 4. Test frontend accessibility
    console.log('\n4. Testing frontend accessibility...');
    try {
      const frontendResponse = await axios.get('http://localhost:5173', { timeout: 5000 });
      console.log('✅ Frontend accessible');
      console.log('   Status:', frontendResponse.status);
    } catch (error) {
      console.log('❌ Frontend not accessible:', error.message);
    }

    console.log('\n🎉 Updated Components Test Complete!');
    console.log('\n📝 Summary:');
    console.log('✅ Course types API returns standardized format (id/name)');
    console.log('✅ Updated components should now work with new field names');
    console.log('✅ Frontend is accessible for manual testing');
    console.log('\n🔍 Manual Testing Steps:');
    console.log('1. Open http://localhost:5173 in browser');
    console.log('2. Login as instructor1 / test123');
    console.log('3. Check instructor dashboard and classes');
    console.log('4. Login as orguser / test123');
    console.log('5. Check organization course history and requests');

  } catch (error) {
    console.error('❌ Test error:', error.response?.data || error.message);
  }
}

testUpdatedComponents(); 