const axios = require('axios');

async function addTestAvailability() {
  try {
    console.log('🔧 Adding test availability...\n');
    
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
    
    // 2. Add availability for tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    
    console.log(`📅 Adding availability for: ${tomorrowStr}`);
    
    const addResponse = await axios.post('http://localhost:3001/api/v1/instructor/availability', 
      { date: tomorrowStr }, 
      { headers }
    );
    
    console.log('✅ Availability added successfully');
    console.log('Response:', JSON.stringify(addResponse.data, null, 2));
    
    // 3. Get all availability to verify
    console.log('\n📋 Getting all availability...');
    const availabilityResponse = await axios.get('http://localhost:3001/api/v1/instructor/availability', { headers });
    
    console.log('✅ Availability retrieved successfully');
    console.log(`Total availability records: ${availabilityResponse.data.data.length}`);
    console.log('All availability:');
    availabilityResponse.data.data.forEach(avail => {
      console.log(`  - ${avail.date} (${avail.status})`);
    });
    
    // 4. Check if tomorrow's availability is there
    const tomorrowAvailability = availabilityResponse.data.data.find(avail => avail.date === tomorrowStr);
    if (tomorrowAvailability) {
      console.log(`\n✅ Tomorrow's availability (${tomorrowStr}) is present in the data`);
    } else {
      console.log(`\n❌ Tomorrow's availability (${tomorrowStr}) is NOT present in the data`);
    }
    
    console.log('\n🎉 Test completed! Now check the frontend to see if the availability shows up.');
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

addTestAvailability(); 