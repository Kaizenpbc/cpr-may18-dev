const axios = require('axios');

async function testInstructorAPI() {
  try {
    console.log('🧪 Testing instructor API endpoint...\n');

    // First, let's get a JWT token for instructor 2
    console.log('1. Getting JWT token for instructor...');
    const loginResponse = await axios.post('http://localhost:3001/api/v1/auth/login', {
      username: 'instructor',
      password: 'test123'
    });
    
    const token = loginResponse.data.data.access_token;
    console.log('✅ Token obtained successfully');

    // Test the instructor classes endpoint
    console.log('\n2. Testing /instructor/classes endpoint...');
    const classesResponse = await axios.get('http://localhost:3001/api/v1/instructor/classes', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('✅ Classes endpoint response:');
    console.log(JSON.stringify(classesResponse.data, null, 2));

    // Check if we have any courses with student counts
    const courses = classesResponse.data.data || [];
    console.log('\n3. Analyzing course data:');
    courses.forEach((course, index) => {
      console.log(`Course ${index + 1}:`);
      console.log(`  - ID: ${course.id}`);
      console.log(`  - Date: ${course.date}`);
      console.log(`  - Type: ${course.type}`);
      console.log(`  - Location: ${course.location}`);
      console.log(`  - Student Count: ${course.studentcount}`);
      console.log(`  - Max Students: ${course.max_students}`);
      console.log(`  - Current Students: ${course.current_students}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error testing API:');
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    } else if (error.request) {
      console.error('No response received:', error.request);
    } else {
      console.error('Error message:', error.message);
    }
  }
}

testInstructorAPI(); 