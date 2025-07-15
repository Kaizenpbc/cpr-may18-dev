const axios = require('axios');

const API_BASE = 'http://localhost:3001/api/v1';

async function testTimesheetSubmission() {
  console.log('🧪 Testing Timesheet Submission...\n');

  try {
    // 1. Login to get a valid token
    console.log('1. Logging in...');
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      username: 'mike',
      password: 'test123'
    });
    
    const token = loginResponse.data.data?.accessToken || loginResponse.data.accessToken;
    console.log('✅ Login successful');
    console.log('Token length:', token ? token.length : 0);

    if (!token) {
      console.log('❌ No token found in response');
      return;
    }

    // 2. Calculate Monday of current week (local time)
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const monday = new Date(today);
    monday.setDate(today.getDate() - daysToSubtract);
    
    const pad = (n) => n.toString().padStart(2, '0');
    const mondayDate = `${monday.getFullYear()}-${pad(monday.getMonth() + 1)}-${pad(monday.getDate())}`;
    
    console.log('\n2. Date calculation:');
    console.log(`Today: ${today.toLocaleDateString()} (${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][today.getDay()]})`);
    console.log(`Monday: ${mondayDate} (${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][monday.getDay()]})`);

    // 3. Submit timesheet
    console.log('\n3. Submitting timesheet...');
    const timesheetData = {
      week_start_date: mondayDate,
      total_hours: 40.5,
      courses_taught: 3,
      notes: 'Test timesheet submission'
    };
    
    console.log('Timesheet data:', JSON.stringify(timesheetData, null, 2));
    
    const submitResponse = await axios.post(`${API_BASE}/timesheet`, timesheetData, {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Timesheet submitted successfully!');
    console.log('Response:', JSON.stringify(submitResponse.data, null, 2));

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testTimesheetSubmission(); 