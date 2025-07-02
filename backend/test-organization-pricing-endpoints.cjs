const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api/v1';
const TEST_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NSwidXNlcklkIjoiNSIsInVzZXJuYW1lIjoic3lzYWRtaW4iLCJyb2xlIjoic3lzYWRtaW4iLCJvcmdhbml6YXRpb25JZCI6bnVsbCwic2Vzc2lvbklkIjoiMjYxN2JmYmUxZGZlNWVmZGYyZWJjNzY1NTc1NTkxMTQ0NGNiMDU5ZTFlY2VlOTBiMGM0NDFjMzQzMGIxN2Q0MyIsImlhdCI6MTc1MTQ5MzU4MSwiZXhwIjoxNzUxNDk0NDgxfQ.Ch9zDP1lR-vxgajetEMJtZG0s-xOZqk-uYlIJX_V6hE';

const headers = {
  'Authorization': `Bearer ${TEST_TOKEN}`,
  'Content-Type': 'application/json'
};

async function testEndpoints() {
  console.log('🧪 Testing Organization Pricing Endpoints...\n');

  try {
    // Test 1: GET all organization pricing (should return empty array initially)
    console.log('1. Testing GET /organization-pricing/admin');
    const getAllResponse = await axios.get(`${BASE_URL}/organization-pricing/admin`, { headers });
    console.log('✅ GET all pricing:', getAllResponse.data);
    console.log('');

    // Test 2: GET organizations (for reference)
    console.log('2. Testing GET /accounting/organizations');
    const orgsResponse = await axios.get(`${BASE_URL}/accounting/organizations`, { headers });
    console.log('✅ Organizations:', orgsResponse.data.data.length, 'organizations found');
    console.log('');

    // Test 3: GET course types (for reference)
    console.log('3. Testing GET /course-types');
    const typesResponse = await axios.get(`${BASE_URL}/course-types`);
    console.log('✅ Course types:', typesResponse.data.data.length, 'types found');
    console.log('');

    // Test 4: CREATE new pricing record
    console.log('4. Testing POST /organization-pricing/admin');
    const createData = {
      organizationId: 1, // Test Organization
      classTypeId: 1,    // CPR Basic
      pricePerStudent: 150.00,
      isActive: true
    };
    const createResponse = await axios.post(`${BASE_URL}/organization-pricing/admin`, createData, { headers });
    console.log('✅ Created pricing record:', createResponse.data);
    const newPricingId = createResponse.data.data.id;
    console.log('');

    // Test 5: GET specific pricing record
    console.log('5. Testing GET /organization-pricing/admin/:id');
    const getOneResponse = await axios.get(`${BASE_URL}/organization-pricing/admin/${newPricingId}`, { headers });
    console.log('✅ Retrieved pricing record:', getOneResponse.data);
    console.log('');

    // Test 6: UPDATE pricing record
    console.log('6. Testing PUT /organization-pricing/admin/:id');
    const updateData = {
      organizationId: 1,
      classTypeId: 1,
      pricePerStudent: 175.00,
      isActive: true
    };
    const updateResponse = await axios.put(`${BASE_URL}/organization-pricing/admin/${newPricingId}`, updateData, { headers });
    console.log('✅ Updated pricing record:', updateResponse.data);
    console.log('');

    // Test 7: GET all pricing records again (should now have 1 record)
    console.log('7. Testing GET /organization-pricing/admin (after create)');
    const getAllAfterResponse = await axios.get(`${BASE_URL}/organization-pricing/admin`, { headers });
    console.log('✅ GET all pricing after create:', getAllAfterResponse.data);
    console.log('');

    // Test 8: DELETE pricing record
    console.log('8. Testing DELETE /organization-pricing/admin/:id');
    const deleteResponse = await axios.delete(`${BASE_URL}/organization-pricing/admin/${newPricingId}`, { headers });
    console.log('✅ Deleted pricing record:', deleteResponse.data);
    console.log('');

    // Test 9: GET all pricing records again (should be empty again)
    console.log('9. Testing GET /organization-pricing/admin (after delete)');
    const getAllAfterDeleteResponse = await axios.get(`${BASE_URL}/organization-pricing/admin`, { headers });
    console.log('✅ GET all pricing after delete:', getAllAfterDeleteResponse.data);
    console.log('');

    console.log('🎉 All tests passed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Headers:', error.response.headers);
    }
  }
}

testEndpoints(); 