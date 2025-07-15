const axios = require('axios');

const API_BASE = 'http://localhost:3001/api/v1';

async function cleanupTimesheets() {
  console.log('🧹 Cleaning up timesheets...\n');

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
      console.log(`${index + 1}. ID: ${ts.id} - Week of ${ts.week_start_date} - Status: ${ts.status}`);
    });

    // 3. Delete timesheets with problematic dates
    console.log('\n3. Deleting timesheets with problematic dates...');
    
    const problematicTimesheets = timesheets.filter(ts => 
      ts.week_start_date.includes('T') || 
      ts.week_start_date.includes('2025-07-14') || 
      ts.week_start_date.includes('2025-07-15')
    );

    if (problematicTimesheets.length === 0) {
      console.log('✅ No problematic timesheets found');
      return;
    }

    console.log(`Found ${problematicTimesheets.length} problematic timesheets to delete:`);
    problematicTimesheets.forEach(ts => {
      console.log(`   - ID: ${ts.id}, Week: ${ts.week_start_date}, Status: ${ts.status}`);
    });

    // Note: We can't delete via API since there's no delete endpoint
    // We'll need to use a different approach
    console.log('\n⚠️  Note: No delete endpoint available in API');
    console.log('   You may need to manually delete these from the database or');
    console.log('   modify the backend to handle date comparison properly.');

    // 4. Alternative: Try to submit with a different week
    console.log('\n4. Testing submission with a different week...');
    
    const testWeekStart = '2025-07-21'; // Next week
    
    const timesheetData = {
      week_start_date: testWeekStart,
      total_hours: 35.0,
      courses_taught: 2,
      notes: 'Test timesheet for different week'
    };
    
    try {
      const submitResponse = await axios.post(`${API_BASE}/timesheet`, timesheetData, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ Successfully submitted timesheet for different week!');
      console.log('Response:', JSON.stringify(submitResponse.data, null, 2));
    } catch (error) {
      console.error('❌ Failed to submit timesheet for different week:', error.response?.data || error.message);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

cleanupTimesheets(); 