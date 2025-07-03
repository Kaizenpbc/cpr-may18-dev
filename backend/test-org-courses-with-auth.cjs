const axios = require('axios');

async function testOrgCoursesWithAuth() {
  try {
    console.log('Testing organization courses API with authentication...');
    
    // First, login as an instructor user (coujoe)
    console.log('1. Logging in as instructor user...');
    const loginResponse = await axios.post('http://localhost:3001/api/v1/auth/login', {
      username: 'coujoe',
      password: 'test123'
    });
    
    if (!loginResponse.data.success) {
      console.error('Login failed:', loginResponse.data);
      return;
    }
    
    const token = loginResponse.data.data.token;
    console.log('2. Login successful, got token');
    
    // Now test the organization courses endpoint (as admin, we can access all orgs)
    console.log('3. Testing organization courses endpoint...');
    const coursesResponse = await axios.get('http://localhost:3001/api/v1/organization/courses?organization_id=2', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('Response status:', coursesResponse.status);
    console.log('Response success:', coursesResponse.data.success);
    
    if (coursesResponse.data.data && coursesResponse.data.data.length > 0) {
      console.log('\n=== FIRST COURSE RECORD ===');
      const firstCourse = coursesResponse.data.data[0];
      console.log(JSON.stringify(firstCourse, null, 2));
      
      console.log('\n=== DATE FIELD ANALYSIS ===');
      console.log('date_requested:', firstCourse.date_requested, '(type:', typeof firstCourse.date_requested, ')');
      console.log('scheduled_date:', firstCourse.scheduled_date, '(type:', typeof firstCourse.scheduled_date, ')');
      console.log('confirmed_date:', firstCourse.confirmed_date, '(type:', typeof firstCourse.confirmed_date, ')');
      console.log('request_submitted_date:', firstCourse.request_submitted_date, '(type:', typeof firstCourse.request_submitted_date, ')');
      
      // Check if dates are formatted as YYYY-MM-DD
      const dateFields = ['date_requested', 'scheduled_date', 'confirmed_date', 'request_submitted_date'];
      console.log('\n=== DATE FORMATTING CHECK ===');
      dateFields.forEach(field => {
        const value = firstCourse[field];
        if (value) {
          const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
          const isFullDateTime = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value);
          console.log(`${field}: ${isDateOnly ? '✅ DATE-ONLY' : isFullDateTime ? '❌ FULL-DATETIME' : '❓ UNKNOWN FORMAT'}`);
        } else {
          console.log(`${field}: null/undefined`);
        }
      });
    } else {
      console.log('No courses found in response');
    }
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
    if (error.response?.status) {
      console.error('Status:', error.response.status);
    }
  }
}

testOrgCoursesWithAuth(); 