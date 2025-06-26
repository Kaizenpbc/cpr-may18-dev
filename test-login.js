const axios = require('axios');

async function testLogin() {
  try {
    console.log('🔐 Testing instructor login...\n');

    // Test login with instructor credentials
    console.log('1. Attempting login with instructor/test123...');
    const loginResponse = await axios.post('http://localhost:3001/api/v1/auth/login', {
      username: 'instructor',
      password: 'test123'
    });
    
    console.log('✅ Login successful!');
    console.log('Response:', JSON.stringify(loginResponse.data, null, 2));
    
    const token = loginResponse.data.data.access_token;
    console.log('\n2. Testing instructor classes endpoint...');
    
    const classesResponse = await axios.get('http://localhost:3001/api/v1/instructor/classes', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('✅ Classes endpoint response:');
    console.log(JSON.stringify(classesResponse.data, null, 2));

    // Check student counts
    const courses = classesResponse.data.data || [];
    console.log('\n3. Student count analysis:');
    courses.forEach((course, index) => {
      console.log(`Course ${index + 1}:`);
      console.log(`  - ID: ${course.id}`);
      console.log(`  - Date: ${course.date}`);
      console.log(`  - Type: ${course.type}`);
      console.log(`  - Student Count: ${course.studentcount}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error('Message:', error.message);
    }
  }
}

testLogin(); 