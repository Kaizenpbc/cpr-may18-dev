const axios = require('axios');

async function checkAvailability() {
  try {
    console.log('🔍 Checking instructor availability data...\n');
    
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
    
    // 2. Get availability
    const availabilityResponse = await axios.get('http://localhost:3001/api/v1/instructor/availability', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    console.log('✅ Availability endpoint working!');
    console.log(`Status: ${availabilityResponse.status}`);
    console.log(`Data count: ${availabilityResponse.data.data.length}`);
    
    // Show the actual data
    console.log('\n📊 Availability data:');
    console.log(JSON.stringify(availabilityResponse.data, null, 2));
    
    // 3. Check if there are any future availability dates
    const today = new Date().toISOString().split('T')[0];
    const futureAvailability = availabilityResponse.data.data.filter(avail => 
      avail.date >= today
    );
    
    console.log(`\n📅 Future availability (from ${today}): ${futureAvailability.length}`);
    if (futureAvailability.length > 0) {
      console.log('Future dates:');
      futureAvailability.forEach(avail => {
        console.log(`  - ${avail.date} (${avail.status})`);
      });
    } else {
      console.log('❌ No future availability found - this is why "My Courses" shows no availability!');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

checkAvailability(); 