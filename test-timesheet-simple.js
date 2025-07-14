const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api/v1';

async function testTimesheetSubmission() {
  try {
    console.log('🔐 Logging in as instructor...');
    
    // Login as instructor
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      username: 'instructor',
      password: 'test123'
    });
    
    const token = loginResponse.data.data?.accessToken || loginResponse.data.token;
    console.log('✅ Login successful');
    
    // Submit a timesheet
    console.log('📝 Submitting timesheet...');
    const timesheetData = {
      week_start_date: '2025-03-03', // Different week
      total_hours: 35.5,
      courses_taught: 4,
      notes: 'Test timesheet from simple test'
    };
    
    const timesheetResponse = await axios.post(`${BASE_URL}/timesheet`, timesheetData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Timesheet submitted successfully:', timesheetResponse.data);
    
    // Get timesheets
    console.log('📋 Getting timesheets...');
    const getTimesheetsResponse = await axios.get(`${BASE_URL}/timesheet`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('✅ Timesheets retrieved:', getTimesheetsResponse.data);
    
    return true;
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    return false;
  }
}

testTimesheetSubmission().then(success => {
  console.log(success ? '🎉 All tests passed!' : '💥 Tests failed!');
  process.exit(success ? 0 : 1);
}); 