const axios = require('axios');

const API_BASE = 'http://localhost:3001/api/v1';

// Test endpoints that were fixed
const endpointsToTest = [
  '/instructors/classes/today',
  '/instructors/classes',
  '/instructors/availability',
  '/organization/profile',
  '/organization/courses',
  '/courses',
  '/instructors'
];

async function testApiEndpoints() {
  console.log('🧪 Testing API endpoints after consistency fixes...\n');
  
  for (const endpoint of endpointsToTest) {
    try {
      console.log(`Testing: ${endpoint}`);
      const response = await axios.get(`${API_BASE}${endpoint}`, {
        timeout: 5000,
        validateStatus: () => true // Don't throw on any status code
      });
      
      if (response.status === 200) {
        console.log(`✅ ${endpoint} - SUCCESS (${response.status})`);
      } else if (response.status === 401) {
        console.log(`⚠️  ${endpoint} - UNAUTHORIZED (${response.status}) - Expected for protected endpoints`);
      } else if (response.status === 404) {
        console.log(`❌ ${endpoint} - NOT FOUND (${response.status}) - Endpoint doesn't exist`);
      } else {
        console.log(`⚠️  ${endpoint} - STATUS ${response.status}`);
      }
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        console.log(`❌ ${endpoint} - CONNECTION REFUSED - Backend not running`);
      } else {
        console.log(`❌ ${endpoint} - ERROR: ${error.message}`);
      }
    }
    console.log('');
  }
  
  console.log('🎯 API endpoint testing completed!');
}

// Run the tests
testApiEndpoints().catch(console.error); 