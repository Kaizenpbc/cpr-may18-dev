const axios = require('axios');

async function testAvailabilityDisplay() {
  try {
    console.log('🔍 Testing availability display...\n');
    
    // 1. Login
    const loginResponse = await axios.post('http://localhost:3001/api/v1/auth/login', {
      username: 'instructor',
      password: 'test123'
    });
    
    const token = loginResponse.data.data?.accessToken;
    if (!token) {
      console.log('❌ No token received');
      return;
    }
    
    console.log('✅ Login successful');
    
    const headers = { 'Authorization': `Bearer ${token}` };
    
    // 2. Get current availability
    console.log('\n📋 Getting current availability...');
    const availabilityResponse = await axios.get('http://localhost:3001/api/v1/instructor/availability', { headers });
    
    console.log('✅ Availability retrieved successfully');
    console.log(`Total availability records: ${availabilityResponse.data.data.length}`);
    console.log('Current availability:');
    availabilityResponse.data.data.forEach(avail => {
      console.log(`  - ${avail.date} (${avail.status})`);
    });
    
    // 3. Simulate the frontend processing logic
    console.log('\n🔍 Simulating frontend processing...');
    
    const availableDates = availabilityResponse.data.data;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Filter future availability (same logic as MyScheduleView)
    const filteredAvailability = availableDates.filter((availability) => {
      const availabilityDate = new Date(availability.date);
      const isAfterToday = availabilityDate >= today;
      console.log(`Filtering ${availability.date}: date=${availabilityDate.toISOString()}, today=${today.toISOString()}, isAfterToday=${isAfterToday}`);
      return isAfterToday;
    });
    
    console.log(`\n📅 Filtered availability (future dates): ${filteredAvailability.length}`);
    if (filteredAvailability.length > 0) {
      console.log('Future availability:');
      filteredAvailability.forEach(avail => {
        console.log(`  - ${avail.date} (${avail.status})`);
      });
    } else {
      console.log('❌ No future availability found after filtering!');
    }
    
    // 4. Simulate the schedule entry creation
    console.log('\n🔍 Simulating schedule entry creation...');
    
    const scheduleEntries = filteredAvailability.map((availability) => {
      return {
        key: `available-${availability.id}`,
        date: availability.date,
        displayDate: availability.date, // Simplified for testing
        status: 'AVAILABLE',
        organization: 'Available',
        courseType: 'Available',
        location: 'Available',
        studentCount: 0,
        studentsAttendance: 0,
      };
    });
    
    console.log(`Created ${scheduleEntries.length} schedule entries:`);
    scheduleEntries.forEach(entry => {
      console.log(`  - ${entry.displayDate}: ${entry.status} (${entry.organization})`);
    });
    
    // 5. Test calendar day rendering logic
    console.log('\n🔍 Testing calendar day rendering...');
    
    const testDates = ['2025-07-06', '2025-07-15']; // Tomorrow and the existing availability
    
    testDates.forEach(testDate => {
      console.log(`\nTesting calendar day: ${testDate}`);
      
      const isAvailable = availableDates.some((availability) => {
        const availabilityDate = availability.date.includes('T') 
          ? availability.date.split('T')[0] // Simple date extraction
          : availability.date;
        const matches = availabilityDate === testDate;
        
        console.log(`  Checking availability: ${availability.date} -> ${availabilityDate} matches ${testDate}: ${matches}`);
        return matches;
      });
      
      console.log(`  Result: ${isAvailable ? 'AVAILABLE' : 'NOT AVAILABLE'}`);
    });
    
    // 6. Summary
    console.log('\n📊 Summary:');
    console.log(`- Total availability records: ${availableDates.length}`);
    console.log(`- Future availability records: ${filteredAvailability.length}`);
    console.log(`- Schedule entries created: ${scheduleEntries.length}`);
    
    if (filteredAvailability.length > 0) {
      console.log('✅ Availability data is present and should be displayed in the frontend');
      console.log('🎯 Next steps:');
      console.log('  1. Open the frontend in your browser');
      console.log('  2. Navigate to the instructor portal');
      console.log('  3. Go to "My Schedule" or "My Courses"');
      console.log('  4. Check if the availability dates are highlighted in green on the calendar');
      console.log('  5. Check if the availability appears in the schedule list');
    } else {
      console.log('❌ No availability data found - this explains why nothing shows up in the frontend');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testAvailabilityDisplay(); 