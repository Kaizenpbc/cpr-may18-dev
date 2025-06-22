const axios = require('axios');

// Test basic backend health
async function testBackendHealth() {
  try {
    console.log('🏥 Testing backend health...');
    
    // Test basic endpoint
    const response = await axios.get('http://localhost:3001/api/v1/health');
    console.log('✅ Health check response:', response.data);
  } catch (error) {
    console.error('❌ Health check error:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message
    });
  }
}

// Test organization courses endpoint
async function testOrganizationCourses() {
  try {
    console.log('📚 Testing organization courses endpoint...');
    
    const response = await axios.get('http://localhost:3001/api/v1/organization/courses', {
      headers: {
        'Authorization': 'Bearer test-token'
      }
    });
    console.log('✅ Organization courses response:', response.data);
  } catch (error) {
    console.error('❌ Organization courses error:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message
    });
  }
}

// Test upload endpoint with minimal data
async function testUploadEndpoint() {
  try {
    console.log('📤 Testing upload endpoint...');
    
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
    
    // If it's an HTML response, show the first part
    if (error.response?.data && typeof error.response.data === 'string') {
      console.log('📄 HTML Response preview:', error.response.data.substring(0, 500));
    }
  }
}

// Run all tests
async function runTests() {
  console.log('🚀 Starting backend health tests...\n');
  
  await testBackendHealth();
  console.log('\n' + '='.repeat(50) + '\n');
  
  await testOrganizationCourses();
  console.log('\n' + '='.repeat(50) + '\n');
  
  await testUploadEndpoint();
  
  console.log('\n✅ All tests completed');
}

runTests().catch(console.error); 