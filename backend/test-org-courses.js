const axios = require('axios');

async function testOrgCourses() {
  try {
    console.log('Testing organization courses API...');
    const response = await axios.get('http://localhost:3001/api/v1/organization/courses', {
      headers: {
        'Authorization': 'Bearer test-token'
      }
    });
    
    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(response.data, null, 2));
    
    if (response.data.data && response.data.data.length > 0) {
      console.log('\nFirst course record:');
      console.log(JSON.stringify(response.data.data[0], null, 2));
      
      const firstCourse = response.data.data[0];
      console.log('\nCourse type name:', firstCourse.course_type_name);
      console.log('Course type name type:', typeof firstCourse.course_type_name);
      console.log('Course type name is null:', firstCourse.course_type_name === null);
      console.log('Course type name is undefined:', firstCourse.course_type_name === undefined);
    }
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testOrgCourses(); 