const axios = require('axios');

const API_BASE = 'http://localhost:3001/api/v1';

async function checkExistingTimesheets() {
  console.log('🔍 Checking existing timesheets...\n');

  try {
    // 1. Login
    console.log('1. Logging in...');
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      username: 'mike',
      password: 'test123'
    });
    
    const token = loginResponse.data.data?.accessToken || loginResponse.data.accessToken;
    console.log('✅ Login successful');

    // 2. Get timesheets
    console.log('\n2. Getting timesheets...');
    const timesheetsResponse = await axios.get(`${API_BASE}/timesheet`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const timesheets = timesheetsResponse.data.data.timesheets;
    console.log(`Found ${timesheets.length} timesheets:`);
    
    timesheets.forEach((ts, index) => {
      console.log(`${index + 1}. Week of ${ts.week_start_date} - Status: ${ts.status} - Hours: ${ts.total_hours} - Courses: ${ts.courses_taught}`);
    });

    // 3. Check if there's one for current week
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const monday = new Date(today);
    monday.setDate(today.getDate() - daysToSubtract);
    
    const pad = (n) => n.toString().padStart(2, '0');
    const currentWeekStart = `${monday.getFullYear()}-${pad(monday.getMonth() + 1)}-${pad(monday.getDate())}`;
    
    const existingForCurrentWeek = timesheets.find(ts => ts.week_start_date === currentWeekStart);
    
    if (existingForCurrentWeek) {
      console.log(`\n⚠️  Timesheet already exists for current week (${currentWeekStart}):`);
      console.log(`   ID: ${existingForCurrentWeek.id}`);
      console.log(`   Status: ${existingForCurrentWeek.status}`);
      console.log(`   Hours: ${existingForCurrentWeek.total_hours}`);
      console.log(`   Courses: ${existingForCurrentWeek.courses_taught}`);
      console.log(`   Notes: ${existingForCurrentWeek.notes || 'None'}`);
    } else {
      console.log(`\n✅ No timesheet exists for current week (${currentWeekStart})`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

checkExistingTimesheets(); 