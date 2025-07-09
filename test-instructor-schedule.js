const axios = require('axios');

async function testInstructorSchedule() {
  let token;
  
  try {
    console.log('🧪 Testing Instructor Schedule Endpoint\n');
    console.log('=' .repeat(50));
    
    // 1. Login to get token
    console.log('\n1. 🔐 Authenticating as instructor...');
    const loginResponse = await axios.post('http://localhost:3001/api/v1/auth/login', {
      username: 'instructor',
      password: 'test123'
    });
    
    token = loginResponse.data.data?.accessToken;
    
    if (!token) {
      console.log('❌ Authentication failed - no token received');
      return;
    }
    
    console.log('✅ Authentication successful');
    console.log(`   User ID: ${loginResponse.data.data.user.id}`);
    console.log(`   Username: ${loginResponse.data.data.user.username}`);
    console.log(`   Role: ${loginResponse.data.data.user.role}`);
    
    const headers = { 'Authorization': `Bearer ${token}` };
    
    // 2. Test GET /instructor/schedule
    console.log('\n2. 📋 Testing GET /instructor/schedule...');
    console.log('   Endpoint: GET http://localhost:3001/api/v1/instructor/schedule');
    
    const scheduleResponse = await axios.get('http://localhost:3001/api/v1/instructor/schedule', { headers });
    
    console.log('✅ Schedule endpoint successful');
    console.log(`   Status Code: ${scheduleResponse.status}`);
    console.log(`   Response Time: ${scheduleResponse.headers['x-response-time'] || 'N/A'}`);
    
    const scheduleData = scheduleResponse.data;
    
    // Validate response structure
    console.log('\n3. 🔍 Validating response structure...');
    
    if (!scheduleData.success) {
      console.log('❌ Response success flag is false');
      return;
    }
    
    if (!Array.isArray(scheduleData.data)) {
      console.log('❌ Response data is not an array');
      return;
    }
    
    console.log('✅ Response structure is valid');
    console.log(`   Total scheduled classes: ${scheduleData.data.length}`);
    
    // 4. Analyze schedule data
    console.log('\n4. 📊 Analyzing schedule data...');
    
    if (scheduleData.data.length === 0) {
      console.log('ℹ️  No scheduled classes found');
    } else {
      // Group by status
      const statusCounts = {};
      const dateCounts = {};
      const courseTypes = new Set();
      
      scheduleData.data.forEach((classItem, index) => {
        // Count by status
        const status = classItem.status || 'unknown';
        statusCounts[status] = (statusCounts[status] || 0) + 1;
        
        // Count by date
        const date = classItem.date || 'no-date';
        dateCounts[date] = (dateCounts[date] || 0) + 1;
        
        // Collect course types
        if (classItem.course_name) {
          courseTypes.add(classItem.course_name);
        }
        
        // Log first few classes for inspection
        if (index < 3) {
          console.log(`   Class ${index + 1}:`);
          console.log(`     ID: ${classItem.id}`);
          console.log(`     Course: ${classItem.course_name || 'N/A'}`);
          console.log(`     Date: ${classItem.date || 'N/A'}`);
          console.log(`     Time: ${classItem.start_time || 'N/A'} - ${classItem.end_time || 'N/A'}`);
          console.log(`     Location: ${classItem.location || 'N/A'}`);
          console.log(`     Status: ${classItem.status || 'N/A'}`);
          console.log(`     Organization: ${classItem.organizationname || 'N/A'}`);
        }
      });
      
      console.log('\n   📈 Schedule Statistics:');
      console.log(`     Status breakdown: ${JSON.stringify(statusCounts)}`);
      console.log(`     Unique dates: ${Object.keys(dateCounts).length}`);
      console.log(`     Course types: ${Array.from(courseTypes).join(', ')}`);
      
      // Find upcoming classes
      const today = new Date().toISOString().split('T')[0];
      const upcomingClasses = scheduleData.data.filter(cls => 
        cls.date && cls.date >= today && cls.status !== 'completed'
      );
      
      console.log(`     Upcoming classes: ${upcomingClasses.length}`);
      
      // Find today's classes
      const todaysClasses = scheduleData.data.filter(cls => 
        cls.date === today
      );
      
      console.log(`     Today's classes: ${todaysClasses.length}`);
    }
    
    // 5. Test error scenarios
    console.log('\n5. 🚨 Testing error scenarios...');
    
    // Test without authentication
    try {
      await axios.get('http://localhost:3001/api/v1/instructor/schedule');
      console.log('❌ Should have failed without authentication');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Properly rejects requests without authentication');
      } else {
        console.log(`⚠️  Unexpected error without auth: ${error.response?.status}`);
      }
    }
    
    // Test with invalid token
    try {
      await axios.get('http://localhost:3001/api/v1/instructor/schedule', {
        headers: { 'Authorization': 'Bearer invalid-token' }
      });
      console.log('❌ Should have failed with invalid token');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Properly rejects requests with invalid token');
      } else {
        console.log(`⚠️  Unexpected error with invalid token: ${error.response?.status}`);
      }
    }
    
    // 6. Test with different user roles (if possible)
    console.log('\n6. 👥 Testing with different user roles...');
    
    // Try to login as a different user type
    try {
      const adminLoginResponse = await axios.post('http://localhost:3001/api/v1/auth/login', {
        username: 'admin',
        password: 'test123'
      });
      
      const adminToken = adminLoginResponse.data.data?.accessToken;
      if (adminToken) {
        const adminHeaders = { 'Authorization': `Bearer ${adminToken}` };
        
        try {
          await axios.get('http://localhost:3001/api/v1/instructor/schedule', { headers: adminHeaders });
          console.log('⚠️  Admin can access instructor schedule (this might be expected)');
        } catch (error) {
          if (error.response?.status === 403) {
            console.log('✅ Properly restricts access to instructors only');
          } else {
            console.log(`⚠️  Unexpected error for admin: ${error.response?.status}`);
          }
        }
      }
    } catch (error) {
      console.log('ℹ️  Could not test with admin user (login failed)');
    }
    
    // 7. Performance test
    console.log('\n7. ⚡ Performance testing...');
    
    const startTime = Date.now();
    const performancePromises = [];
    
    // Make 5 concurrent requests
    for (let i = 0; i < 5; i++) {
      performancePromises.push(
        axios.get('http://localhost:3001/api/v1/instructor/schedule', { headers })
      );
    }
    
    try {
      const results = await Promise.all(performancePromises);
      const endTime = Date.now();
      const avgResponseTime = (endTime - startTime) / results.length;
      
      console.log(`✅ Concurrent requests successful`);
      console.log(`   Average response time: ${avgResponseTime.toFixed(2)}ms`);
      console.log(`   All requests returned ${results[0].data.data.length} classes`);
    } catch (error) {
      console.log('❌ Performance test failed:', error.message);
    }
    
    // 8. Data validation
    console.log('\n8. ✅ Data validation...');
    
    if (scheduleData.data.length > 0) {
      const sampleClass = scheduleData.data[0];
      const requiredFields = ['id', 'course_id', 'instructor_id', 'start_time', 'end_time', 'status'];
      const missingFields = requiredFields.filter(field => !sampleClass.hasOwnProperty(field));
      
      if (missingFields.length === 0) {
        console.log('✅ All required fields are present');
      } else {
        console.log(`⚠️  Missing required fields: ${missingFields.join(', ')}`);
      }
      
      // Check data types
      const typeChecks = [
        { field: 'id', expected: 'number', actual: typeof sampleClass.id },
        { field: 'course_id', expected: 'number', actual: typeof sampleClass.course_id },
        { field: 'instructor_id', expected: 'number', actual: typeof sampleClass.instructor_id },
        { field: 'status', expected: 'string', actual: typeof sampleClass.status }
      ];
      
      const typeErrors = typeChecks.filter(check => check.actual !== check.expected);
      
      if (typeErrors.length === 0) {
        console.log('✅ Data types are correct');
      } else {
        console.log('⚠️  Data type issues:');
        typeErrors.forEach(error => {
          console.log(`     ${error.field}: expected ${error.expected}, got ${error.actual}`);
        });
      }
    } else {
      console.log('ℹ️  No data to validate');
    }
    
    console.log('\n🎉 Instructor Schedule Endpoint Testing Completed!');
    console.log('=' .repeat(50));
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.response?.data?.error || error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Run the test
testInstructorSchedule(); 