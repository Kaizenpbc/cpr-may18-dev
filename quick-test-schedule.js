const axios = require('axios');

async function quickTestSchedule() {
  console.log('🧪 Quick Test: Instructor Schedule Endpoint\n');
  
  try {
    // 1. Login
    console.log('1. 🔐 Logging in...');
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
    
    // 2. Test schedule endpoint
    console.log('\n2. 📋 Testing schedule endpoint...');
    const scheduleResponse = await axios.get('http://localhost:3001/api/v1/instructor/schedule', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    console.log('✅ Schedule endpoint working!');
    console.log(`   Status: ${scheduleResponse.status}`);
    console.log(`   Classes found: ${scheduleResponse.data.data.length}`);
    
    // Show sample data
    if (scheduleResponse.data.data.length > 0) {
      const sample = scheduleResponse.data.data[0];
      console.log('\n   Sample class:');
      console.log(`     ID: ${sample.id}`);
      console.log(`     Course: ${sample.course_name}`);
      console.log(`     Date: ${sample.date}`);
      console.log(`     Status: ${sample.status}`);
      console.log(`     Location: ${sample.location}`);
    }
    
    // 3. Test error handling
    console.log('\n3. 🚨 Testing error handling...');
    
    try {
      await axios.get('http://localhost:3001/api/v1/instructor/schedule');
      console.log('❌ Should have failed without auth');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Properly rejects unauthenticated requests');
      }
    }
    
    console.log('\n🎉 Quick test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data?.error || error.message);
  }
}

quickTestSchedule(); 