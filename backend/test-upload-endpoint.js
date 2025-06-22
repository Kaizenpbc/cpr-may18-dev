const axios = require('axios');

// Test the upload endpoint
async function testUploadEndpoint() {
  try {
    console.log('🧪 Testing upload endpoint...');
    
    // First, let's test if the endpoint exists
    const response = await axios.post('http://localhost:3001/api/v1/organization/upload-students', {
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
        'Authorization': 'Bearer test-token'
      }
    });
    
    console.log('✅ Upload endpoint response:', response.data);
  } catch (error) {
    console.error('❌ Upload endpoint error:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message
    });
  }
}

// Test the authentication
async function testAuth() {
  try {
    console.log('🔐 Testing authentication...');
    
    const response = await axios.get('http://localhost:3001/api/v1/organization/courses', {
      headers: {
        'Authorization': 'Bearer test-token'
      }
    });
    
    console.log('✅ Auth test response:', response.data);
  } catch (error) {
    console.error('❌ Auth test error:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message
    });
  }
}

// Run tests
async function runTests() {
  console.log('🚀 Starting upload endpoint tests...\n');
  
  await testAuth();
  console.log('\n' + '='.repeat(50) + '\n');
  await testUploadEndpoint();
  
  console.log('\n✅ Tests completed');
}

runTests().catch(console.error); 