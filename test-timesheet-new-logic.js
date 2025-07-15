const axios = require('axios');

const API_BASE = 'http://localhost:3001/api/v1';

async function testNewTimesheetLogic() {
  console.log('🧪 Testing New Timesheet Logic (Auto-populated Monday)...\n');

  try {
    // 1. Test login
    console.log('1. Testing login...');
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      username: 'mike',
      password: 'test123'
    });
    
    const token = loginResponse.data.data?.accessToken || loginResponse.data.accessToken;
    console.log('✅ Login successful');
    console.log('Token extracted:', token ? 'Yes' : 'No');
    console.log('Token length:', token ? token.length : 0, '\n');

    if (!token) {
      console.log('❌ No token found in response');
      console.log('Response structure:', JSON.stringify(loginResponse.data, null, 2));
      return;
    }

    // 2. Test getting current week's Monday
    console.log('2. Testing current week Monday calculation...');
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Monday = 1, Sunday = 0
    const monday = new Date(today);
    monday.setDate(today.getDate() - daysToSubtract);
    let mondayDate = monday.toISOString().split('T')[0];
    
    // Format dates in local time
    const pad = (n) => n.toString().padStart(2, '0');
    const todayLocal = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
    const mondayLocal = `${monday.getFullYear()}-${pad(monday.getMonth() + 1)}-${pad(monday.getDate())}`;
    
    console.log(`Today: ${todayLocal} (${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][today.getDay()]})`);
    console.log(`Calculated Monday: ${mondayLocal} (${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][monday.getDay()]})`);
    
    // Use local date for API calls
    mondayDate = mondayLocal;
    
    // Verify it's actually Monday
    if (monday.getDay() === 1) {
      console.log('✅ Monday calculation is correct\n');
    } else {
      console.log('❌ Monday calculation is incorrect\n');
      return;
    }

    // 3. Test getting courses for the current week
    console.log('3. Testing week courses endpoint with calculated Monday...');
    
    try {
      const coursesResponse = await axios.get(`${API_BASE}/timesheet/week/${mondayDate}/courses`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('✅ Week courses endpoint works with calculated Monday');
      console.log(`Found ${coursesResponse.data.data.total_courses} courses for the week\n`);
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || 
                          error.response?.data?.message || 
                          error.message || 
                          'Unknown error';
      console.log('❌ Week courses endpoint failed:', errorMessage);
      if (error.response?.data) {
        console.log('   Full response:', JSON.stringify(error.response.data, null, 2));
      }
      return;
    }

    // 4. Test timesheet submission with calculated Monday
    console.log('4. Testing timesheet submission with calculated Monday...');
    
    try {
      const timesheetData = {
        week_start_date: mondayDate,
        total_hours: 40.5,
        notes: 'Test timesheet with auto-calculated Monday'
      };
      
      const submitResponse = await axios.post(`${API_BASE}/timesheet`, timesheetData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('✅ Timesheet submitted successfully with calculated Monday');
      console.log('Timesheet ID:', submitResponse.data.data.id);
      console.log('Week Start Date:', submitResponse.data.data.week_start_date);
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || 
                          error.response?.data?.message || 
                          error.message || 
                          'Unknown error';
      console.log('❌ Timesheet submission failed:', errorMessage);
      if (error.response?.data) {
        console.log('   Full response:', JSON.stringify(error.response.data, null, 2));
      }
    }

    // 5. Test that non-Monday dates are still rejected
    console.log('\n5. Testing that non-Monday dates are still rejected...');
    
    const nonMondayDate = '2025-07-16'; // Wednesday
    console.log(`Testing with non-Monday date: ${nonMondayDate}`);
    
    try {
      await axios.get(`${API_BASE}/timesheet/week/${nonMondayDate}/courses`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('❌ Non-Monday date should have been rejected');
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || 
                          error.response?.data?.message || 
                          error.message || 
                          'Unknown error';
      console.log('✅ Non-Monday date correctly rejected:', errorMessage);
    }

    console.log('\n🎉 All tests completed!');
    console.log('\n📋 Summary of Changes:');
    console.log('• Frontend now auto-populates Monday of current week');
    console.log('• Week start date field is read-only');
    console.log('• Submission allowed any day from Monday to Sunday');
    console.log('• Backend still validates Monday requirement (safety check)');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

testNewTimesheetLogic(); 