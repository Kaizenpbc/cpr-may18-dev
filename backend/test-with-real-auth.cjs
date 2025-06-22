const axios = require('axios');

// Test with real authentication
async function testWithRealAuth() {
  try {
    console.log('🔐 Testing with real authentication...');
    
    // Step 1: Login to get a real token
    console.log('📝 Step 1: Logging in...');
    const loginResponse = await axios.post('http://localhost:3001/api/v1/auth/login', {
      username: 'testorg',
      password: 'password123'
    });
    
    console.log('✅ Login successful');
    const accessToken = loginResponse.data.data.accessToken;
    console.log('🔑 Access token received:', !!accessToken);
    
    // Step 2: Test organization courses with real token
    console.log('\n📚 Step 2: Testing organization courses...');
    const coursesResponse = await axios.get('http://localhost:3001/api/v1/organization/courses', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    console.log('✅ Organization courses response:', {
      success: coursesResponse.data.success,
      courseCount: coursesResponse.data.data?.length || 0
    });
    
    // Step 3: Test upload endpoint with real token
    console.log('\n📤 Step 3: Testing upload endpoint...');
    const uploadResponse = await axios.post('http://localhost:3001/api/v1/organization/upload-students', {
      courseRequestId: 27,
      students: [
        {
          firstName: 'Test',
          lastName: 'Student',
          email: 'test@example.com'
        }
      ]
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    console.log('✅ Upload endpoint response:', uploadResponse.data);
    
  } catch (error) {
    console.error('❌ Test error:', {
      step: error.config?.url?.includes('login') ? 'Login' : 
            error.config?.url?.includes('courses') ? 'Courses' : 'Upload',
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message
    });
    
    // If it's an HTML response, show the first part
    if (error.response?.data && typeof error.response.data === 'string') {
      console.log('📄 HTML Response preview:', error.response.data.substring(0, 500));
    }
  }
}

// Run the test
console.log('🚀 Starting real authentication test...\n');
testWithRealAuth().catch(console.error); 