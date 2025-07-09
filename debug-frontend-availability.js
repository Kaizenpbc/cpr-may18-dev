const axios = require('axios');

async function debugFrontendAvailability() {
  try {
    console.log('🔍 Debugging frontend availability processing...\n');
    
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
    
    // 2. Get availability data (simulating what the frontend receives)
    const availabilityResponse = await axios.get('http://localhost:3001/api/v1/instructor/availability', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    console.log('✅ Availability endpoint working!');
    
    // 3. Simulate the frontend data processing
    const rawData = availabilityResponse.data.data;
    console.log('\n📊 Raw availability data from backend:');
    console.log(JSON.stringify(rawData, null, 2));
    
    // Simulate the extractData function
    const extractData = (response) => {
      return response.data?.data || response.data || response;
    };
    
    const extractedData = extractData(availabilityResponse.data);
    console.log('\n📊 Extracted data (what frontend receives):');
    console.log(JSON.stringify(extractedData, null, 2));
    
    // 4. Simulate the MyScheduleView filtering logic
    console.log('\n🔍 Simulating MyScheduleView filtering logic...');
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    console.log(`Today (start of day): ${today.toISOString()}`);
    
    const filteredAvailability = extractedData.filter((availability) => {
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
    
    // 5. Check if the issue is with date comparison
    console.log('\n🔍 Checking date comparison logic...');
    extractedData.forEach(avail => {
      const availabilityDate = new Date(avail.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      console.log(`Date comparison for ${avail.date}:`);
      console.log(`  Availability date: ${availabilityDate.toISOString()}`);
      console.log(`  Today (start): ${today.toISOString()}`);
      console.log(`  Is after today: ${availabilityDate >= today}`);
      console.log(`  Date comparison: ${availabilityDate.getTime()} >= ${today.getTime()} = ${availabilityDate.getTime() >= today.getTime()}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

debugFrontendAvailability(); 