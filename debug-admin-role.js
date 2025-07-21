const axios = require('axios');

// Configuration
const API_BASE_URL = 'http://localhost:3001/api/v1';
const TEST_COURSE_ID = 33; // The course ID from the error message

async function debugAdminRole() {
  console.log('🔍 Debugging Admin Role Issue');
  console.log('================================\n');

  try {
    // Step 1: Check if backend is running
    console.log('1. Checking backend health...');
    const healthResponse = await axios.get(`${API_BASE_URL}/health`);
    console.log('✅ Backend is running:', healthResponse.status);
    console.log('');

    // Step 2: Test admin login with correct credentials
    console.log('2. Testing admin login...');
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      username: 'admin',
      password: 'password'  // Try common default password
    });

    if (loginResponse.data.success) {
      const token = loginResponse.data.data.accessToken;
      console.log('✅ Admin login successful');
      console.log('   User:', loginResponse.data.data.user.username);
      console.log('   Role:', loginResponse.data.data.user.role);
      console.log('   Token:', token.substring(0, 20) + '...');
      console.log('');

      // Step 3: Test auth/me endpoint
      console.log('3. Testing auth/me endpoint...');
      const meResponse = await axios.get(`${API_BASE_URL}/auth/me`, {
        headers: { Authorization: token }
      });
      console.log('✅ Auth/me successful');
      console.log('   User:', meResponse.data.data.user.username);
      console.log('   Role:', meResponse.data.data.user.role);
      console.log('   ID:', meResponse.data.data.user.id);
      console.log('');

      // Step 4: Test the problematic endpoint
      console.log(`4. Testing admin/courses/${TEST_COURSE_ID}/students endpoint...`);
      try {
        const studentsResponse = await axios.get(`${API_BASE_URL}/admin/courses/${TEST_COURSE_ID}/students`, {
          headers: { Authorization: token }
        });
        console.log('✅ Students endpoint successful');
        console.log('   Students count:', studentsResponse.data.data.length);
        if (studentsResponse.data.data.length > 0) {
          console.log('   First student:', studentsResponse.data.data[0]?.first_name + ' ' + studentsResponse.data.data[0]?.last_name);
        }
      } catch (error) {
        console.log('❌ Students endpoint failed');
        console.log('   Status:', error.response?.status);
        console.log('   Error:', error.response?.data?.error?.message);
        console.log('   Full response:', JSON.stringify(error.response?.data, null, 2));
      }
      console.log('');

      // Step 5: Test with different course ID
      console.log('5. Testing with course ID 1...');
      try {
        const testResponse = await axios.get(`${API_BASE_URL}/admin/courses/1/students`, {
          headers: { Authorization: token }
        });
        console.log('✅ Course 1 students endpoint successful');
        console.log('   Students count:', testResponse.data.data.length);
      } catch (error) {
        console.log('❌ Course 1 students endpoint failed');
        console.log('   Status:', error.response?.status);
        console.log('   Error:', error.response?.data?.error?.message);
      }

    } else {
      console.log('❌ Admin login failed');
      console.log('   Response:', loginResponse.data);
    }

  } catch (error) {
    console.error('❌ Debug failed:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
  }
}

// Run the debug
debugAdminRole().catch(console.error); 