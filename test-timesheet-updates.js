const axios = require('axios');

const API_BASE = 'http://localhost:3001/api/v1';

async function testTimesheetUpdates() {
  console.log('🧪 Testing Updated Timesheet Functionality...\n');

  try {
    // 1. Test login
    console.log('1. Testing login...');
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      username: 'mike',
      password: 'test123'
    });
    
    // Fix: Extract token from the correct path in response
    const token = loginResponse.data.data?.accessToken || loginResponse.data.accessToken;
    console.log('✅ Login successful');
    console.log('Token extracted:', token ? 'Yes' : 'No');
    console.log('Token length:', token ? token.length : 0, '\n');

    if (!token) {
      console.log('❌ No token found in response');
      console.log('Response structure:', JSON.stringify(loginResponse.data, null, 2));
      return;
    }

    // 2. Test Monday validation
    console.log('2. Testing Monday validation...');
    
    // Test with a Monday date
    const mondayDate = '2025-01-07'; // This is actually a Monday
    console.log(`Testing with Monday date: ${mondayDate}`);
    
    try {
      const mondayResponse = await axios.get(`${API_BASE}/timesheet/week/${mondayDate}/courses`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('✅ Monday date accepted');
      console.log(`Found ${mondayResponse.data.data.total_courses} courses for the week\n`);
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || 
                          error.response?.data?.message || 
                          error.message || 
                          'Unknown error';
      console.log('❌ Monday date rejected:', errorMessage);
      if (error.response?.data) {
        console.log('   Full response:', JSON.stringify(error.response.data, null, 2));
      }
    }

    // Test with a non-Monday date
    const nonMondayDate = '2025-01-14'; // This is a Tuesday
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

    // 3. Test timesheet submission without total hours (should work now)
    console.log('\n3. Testing timesheet submission without total hours...');
    
    try {
      const timesheetData = {
        week_start_date: mondayDate,
        notes: 'Test timesheet without total hours'
        // total_hours is omitted
      };
      
      const submitResponse = await axios.post(`${API_BASE}/timesheet`, timesheetData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('✅ Timesheet submitted without total hours');
      console.log('Timesheet ID:', submitResponse.data.data.id);
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

    // 4. Test timesheet submission with non-Monday date (should fail)
    console.log('\n4. Testing timesheet submission with non-Monday date...');
    
    try {
      const timesheetData = {
        week_start_date: nonMondayDate,
        total_hours: 40,
        notes: 'Test timesheet with non-Monday date'
      };
      
      await axios.post(`${API_BASE}/timesheet`, timesheetData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('❌ Timesheet submission should have failed for non-Monday date');
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || 
                          error.response?.data?.message || 
                          error.message || 
                          'Unknown error';
      console.log('✅ Timesheet submission correctly rejected for non-Monday date:', errorMessage);
    }

    // 5. Test July 15, 2025 (Tuesday) - should be rejected
    console.log('\n5. Testing July 15, 2025 (Tuesday) - should be rejected...');
    
    try {
      const timesheetData = {
        week_start_date: '2025-07-15', // This is a Tuesday
        total_hours: 40,
        notes: 'Test timesheet with July 15 (Tuesday)'
      };
      
      await axios.post(`${API_BASE}/timesheet`, timesheetData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('❌ July 15 (Tuesday) should have been rejected');
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || 
                          error.response?.data?.message || 
                          error.message || 
                          'Unknown error';
      console.log('✅ July 15 (Tuesday) correctly rejected:', errorMessage);
    }

    console.log('\n🎉 All tests completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

testTimesheetUpdates(); 