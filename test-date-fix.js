const axios = require('axios');

async function testDateFix() {
  try {
    // First login to get a valid token
    const loginResponse = await axios.post('http://localhost:3001/api/v1/auth/login', {
      username: 'iffat',
      password: 'password123'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login successful');
    
    // Test organization courses endpoint
    const coursesResponse = await axios.get('http://localhost:3001/api/v1/organization/courses', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Courses endpoint working');
    console.log('📅 Sample course data:');
    
    if (coursesResponse.data.data && coursesResponse.data.data.length > 0) {
      const course = coursesResponse.data.data[0];
      console.log('  - scheduled_date:', course.scheduled_date, '(type:', typeof course.scheduled_date, ')');
      console.log('  - date_requested:', course.date_requested, '(type:', typeof course.date_requested, ')');
      console.log('  - confirmed_date:', course.confirmed_date, '(type:', typeof course.confirmed_date, ')');
      
      // Check if dates are formatted as YYYY-MM-DD strings
      const isDateFormatted = (date) => {
        if (!date) return true; // null is OK
        return typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date);
      };
      
      const allDatesFormatted = isDateFormatted(course.scheduled_date) && 
                               isDateFormatted(course.date_requested) && 
                               isDateFormatted(course.confirmed_date);
      
      if (allDatesFormatted) {
        console.log('✅ All dates are properly formatted as YYYY-MM-DD strings!');
      } else {
        console.log('❌ Some dates are still Date objects or incorrectly formatted');
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testDateFix(); 