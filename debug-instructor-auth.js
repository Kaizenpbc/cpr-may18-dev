const axios = require('axios');

const API_BASE = 'http://localhost:3001/api/v1';

async function debugInstructorAuth() {
  try {
    console.log('🔍 Debugging Instructor Authentication...\n');

    // Step 1: Check current auth status
    console.log('1. Checking current authentication status...');
    const authResponse = await axios.get(`${API_BASE}/auth/me`, {
      headers: {
        'Authorization': `Bearer ${process.env.ACCESS_TOKEN || 'NO_TOKEN'}`
      }
    });
    
    console.log('✅ Auth status:', {
      user: authResponse.data.user,
      role: authResponse.data.user?.role,
      id: authResponse.data.user?.id
    });

    // Step 2: Test instructor availability endpoint
    console.log('\n2. Testing instructor availability endpoint...');
    const testDate = '2025-08-20';
    
    try {
      const deleteResponse = await axios.delete(`${API_BASE}/instructor/availability/${testDate}`, {
        headers: {
          'Authorization': `Bearer ${process.env.ACCESS_TOKEN || 'NO_TOKEN'}`
        }
      });
      
      console.log('✅ Delete availability response:', deleteResponse.data);
    } catch (deleteError) {
      console.log('❌ Delete availability error:', {
        status: deleteError.response?.status,
        statusText: deleteError.response?.statusText,
        data: deleteError.response?.data,
        message: deleteError.message
      });
    }

    // Step 3: Test GET availability to see if endpoint is accessible
    console.log('\n3. Testing GET instructor availability...');
    try {
      const getResponse = await axios.get(`${API_BASE}/instructor/availability`, {
        headers: {
          'Authorization': `Bearer ${process.env.ACCESS_TOKEN || 'NO_TOKEN'}`
        }
      });
      
      console.log('✅ GET availability response status:', getResponse.status);
      console.log('✅ Available dates count:', getResponse.data.data?.length || 0);
    } catch (getError) {
      console.log('❌ GET availability error:', {
        status: getError.response?.status,
        statusText: getError.response?.statusText,
        data: getError.response?.data
      });
    }

  } catch (error) {
    console.error('❌ Debug error:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
  }
}

// Run the debug
debugInstructorAuth(); 