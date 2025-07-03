const axios = require('axios');

async function testInstructorEndpoints() {
  let token;
  
  try {
    console.log('🧪 Testing Instructor API Endpoints\n');
    
    // 1. Login to get token
    console.log('1. 🔐 Testing Login...');
    const loginResponse = await axios.post('http://localhost:3001/api/v1/auth/login', {
      username: 'instructor',
      password: 'test123'
    });
    
    console.log('Login response:', JSON.stringify(loginResponse.data, null, 2));
    
    // Check different possible token locations
    token = loginResponse.data.data?.accessToken || 
            loginResponse.data.data?.access_token || 
            loginResponse.data.access_token || 
            loginResponse.data.token ||
            loginResponse.headers?.['x-access-token'];
    
    if (!token) {
      console.log('❌ No token found in login response');
      return;
    }
    
    console.log('✅ Login successful, token obtained');
    console.log('Token (first 20 chars):', token.substring(0, 20) + '...\n');
    
    const headers = { 'Authorization': `Bearer ${token}` };
    
    // 2. Test GET /availability
    console.log('2. 📅 Testing GET /availability...');
    try {
      const availabilityResponse = await axios.get('http://localhost:3001/api/v1/instructor/availability', { headers });
      console.log('✅ GET /availability successful');
      console.log(`   Found ${availabilityResponse.data.data.length} availability records\n`);
    } catch (error) {
      console.log('❌ GET /availability failed:', error.response?.data?.error || error.message, '\n');
    }
    
    // 3. Test POST /availability
    console.log('3. ➕ Testing POST /availability...');
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];
      
      const postAvailabilityResponse = await axios.post('http://localhost:3001/api/v1/instructor/availability', 
        { date: tomorrowStr }, 
        { headers }
      );
      console.log('✅ POST /availability successful');
      console.log(`   Added availability for ${tomorrowStr}\n`);
    } catch (error) {
      console.log('❌ POST /availability failed:', error.response?.data?.error || error.message, '\n');
    }
    
    // 4. Test GET /classes
    console.log('4. 📚 Testing GET /classes...');
    try {
      const classesResponse = await axios.get('http://localhost:3001/api/v1/instructor/classes', { headers });
      console.log('✅ GET /classes successful');
      console.log(`   Found ${classesResponse.data.data.length} classes\n`);
    } catch (error) {
      console.log('❌ GET /classes failed:', error.response?.data?.error || error.message, '\n');
    }
    
    // 5. Test GET /classes/completed
    console.log('5. ✅ Testing GET /classes/completed...');
    try {
      const completedResponse = await axios.get('http://localhost:3001/api/v1/instructor/classes/completed', { headers });
      console.log('✅ GET /classes/completed successful');
      console.log(`   Found ${completedResponse.data.data.length} completed classes\n`);
    } catch (error) {
      console.log('❌ GET /classes/completed failed:', error.response?.data?.error || error.message, '\n');
    }
    
    // 6. Test GET /classes/today
    console.log('6. 📅 Testing GET /classes/today...');
    try {
      const todayResponse = await axios.get('http://localhost:3001/api/v1/instructor/classes/today', { headers });
      console.log('✅ GET /classes/today successful');
      console.log(`   Found ${todayResponse.data.data.length} classes today\n`);
    } catch (error) {
      console.log('❌ GET /classes/today failed:', error.response?.data?.error || error.message, '\n');
    }
    
    // 7. Test GET /schedule (missing endpoint)
    console.log('7. 📋 Testing GET /schedule...');
    try {
      const scheduleResponse = await axios.get('http://localhost:3001/api/v1/instructor/schedule', { headers });
      console.log('✅ GET /schedule successful');
      console.log(`   Found ${scheduleResponse.data.data.length} scheduled classes\n`);
    } catch (error) {
      console.log('❌ GET /schedule failed (endpoint missing):', error.response?.data?.error || error.message, '\n');
    }
    
    // 8. Test PUT /availability (missing endpoint)
    console.log('8. 🔄 Testing PUT /availability...');
    try {
      const putAvailabilityResponse = await axios.put('http://localhost:3001/api/v1/instructor/availability', 
        { availability: [{ date: '2025-07-15', status: 'available' }] }, 
        { headers }
      );
      console.log('✅ PUT /availability successful\n');
    } catch (error) {
      console.log('❌ PUT /availability failed (endpoint missing):', error.response?.data?.error || error.message, '\n');
    }
    
    // 9. Test PUT /profile (missing endpoint)
    console.log('9. 👤 Testing PUT /profile...');
    try {
      const profileResponse = await axios.put('http://localhost:3001/api/v1/instructor/profile', 
        { username: 'instructor', email: 'instructor@test.com' }, 
        { headers }
      );
      console.log('✅ PUT /profile successful\n');
    } catch (error) {
      console.log('❌ PUT /profile failed (endpoint missing):', error.response?.data?.error || error.message, '\n');
    }
    
    // 10. Test GET /attendance (missing endpoint)
    console.log('10. 📊 Testing GET /attendance...');
    try {
      const attendanceResponse = await axios.get('http://localhost:3001/api/v1/instructor/attendance', { headers });
      console.log('✅ GET /attendance successful');
      console.log(`   Found ${attendanceResponse.data.data.length} attendance records\n`);
    } catch (error) {
      console.log('❌ GET /attendance failed (endpoint missing):', error.response?.data?.error || error.message, '\n');
    }
    
    // 11. Test class-specific endpoints if we have classes
    console.log('11. 🎯 Testing class-specific endpoints...');
    try {
      const classesResponse = await axios.get('http://localhost:3001/api/v1/instructor/classes', { headers });
      const classes = classesResponse.data.data;
      
      if (classes.length > 0) {
        const firstClass = classes[0];
        console.log(`   Testing with class ID: ${firstClass.id}`);
        
        // Test GET /classes/:classId/students
        try {
          const studentsResponse = await axios.get(`http://localhost:3001/api/v1/instructor/classes/${firstClass.id}/students`, { headers });
          console.log('   ✅ GET /classes/:classId/students successful');
          console.log(`      Found ${studentsResponse.data.data.length} students\n`);
        } catch (error) {
          console.log('   ❌ GET /classes/:classId/students failed:', error.response?.data?.error || error.message, '\n');
        }
        
        // Test POST /classes/:classId/complete
        try {
          // Find a non-completed class to test with
          const nonCompletedClass = classes.find(cls => cls.status !== 'completed');
          if (nonCompletedClass) {
            const completeResponse = await axios.post(`http://localhost:3001/api/v1/instructor/classes/${nonCompletedClass.id}/complete`, 
              { instructor_comments: 'Test completion' }, 
              { headers }
            );
            console.log('   ✅ POST /classes/:classId/complete successful\n');
          } else {
            console.log('   ⚠️ No non-completed classes available to test completion\n');
          }
        } catch (error) {
          console.log('   ❌ POST /classes/:classId/complete failed:', error.response?.data?.error || error.message, '\n');
        }
        
        // Test POST /classes/:classId/attendance (missing endpoint)
        try {
          const attendanceResponse = await axios.post(`http://localhost:3001/api/v1/instructor/classes/${firstClass.id}/attendance`, 
            { students: [{ id: 1, attended: true }] }, 
            { headers }
          );
          console.log('   ✅ POST /classes/:classId/attendance successful\n');
        } catch (error) {
          console.log('   ❌ POST /classes/:classId/attendance failed (endpoint missing):', error.response?.data?.error || error.message, '\n');
        }
        
      } else {
        console.log('   ⚠️ No classes found to test class-specific endpoints\n');
      }
    } catch (error) {
      console.log('   ❌ Failed to get classes for testing:', error.response?.data?.error || error.message, '\n');
    }
    
    console.log('🎉 Instructor endpoint testing completed!\n');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data?.error || error.message);
  }
}

testInstructorEndpoints(); 