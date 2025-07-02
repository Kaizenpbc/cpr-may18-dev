const axios = require('axios');
const jwt = require('jsonwebtoken');

// JWT secret (matches backend's ACCESS_TOKEN_SECRET)
const JWT_SECRET = 'access_secret';

async function testOrgCourses() {
  try {
    console.log('=== STARTING DETAILED API TRACE ===');
    
    // Create a JWT token for organization user
    const token = jwt.sign(
      {
        id: 3,
        username: 'orguser',
        role: 'organization',
        organizationId: 1
      },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    console.log('JWT token created successfully');
    console.log('Testing organization courses API...');
    
    const response = await axios.get('http://localhost:3001/api/v1/organization/courses', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('\n=== API RESPONSE DETAILS ===');
    console.log('Response status:', response.status);
    console.log('Response headers:', JSON.stringify(response.headers, null, 2));
    
    console.log('\n=== FULL RESPONSE DATA ===');
    console.log(JSON.stringify(response.data, null, 2));
    
    if (response.data.data && response.data.data.length > 0) {
      console.log('\n=== FIRST COURSE RECORD ANALYSIS ===');
      const firstCourse = response.data.data[0];
      
      console.log('All fields in first course:');
      Object.keys(firstCourse).forEach(key => {
        console.log(`  ${key}: ${firstCourse[key]} (type: ${typeof firstCourse[key]})`);
      });
      
      console.log('\n=== COURSE TYPE NAME ANALYSIS ===');
      console.log('course_type_name value:', firstCourse.course_type_name);
      console.log('course_type_name type:', typeof firstCourse.course_type_name);
      console.log('course_type_name is null:', firstCourse.course_type_name === null);
      console.log('course_type_name is undefined:', firstCourse.course_type_name === undefined);
      console.log('course_type_name length:', firstCourse.course_type_name ? firstCourse.course_type_name.length : 'N/A');
      
      console.log('\n=== DATABASE JOIN ANALYSIS ===');
      console.log('course_type_id:', firstCourse.course_type_id);
      console.log('instructor:', firstCourse.instructor);
      console.log('students_attended:', firstCourse.students_attended);
      console.log('request_submitted_date:', firstCourse.request_submitted_date);
      
    } else {
      console.log('\n⚠️ No course data returned from API');
    }
    
    console.log('\n=== TRACE COMPLETE ===');
    
  } catch (error) {
    console.error('❌ ERROR during API test:');
    console.error('Error message:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testOrgCourses(); 