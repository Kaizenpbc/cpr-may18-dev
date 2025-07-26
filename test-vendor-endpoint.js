const axios = require('axios');

async function testVendorEndpoint() {
  try {
    console.log('🔍 Testing vendor endpoint accessibility...');
    
    // Test without authentication first
    try {
      const response = await axios.get('http://localhost:3001/api/v1/vendor/invoices');
      console.log('❌ Endpoint accessible without auth (should not be):', response.status);
    } catch (error) {
      if (error.response && error.response.status === 401) {
        console.log('✅ Endpoint requires authentication (correct)');
      } else {
        console.log('❌ Unexpected error:', error.response ? error.response.status : error.message);
      }
    }
    
    // Test with invalid token
    try {
      const response = await axios.get('http://localhost:3001/api/v1/vendor/invoices', {
        headers: {
          'Authorization': 'Bearer invalid-token',
          'Content-Type': 'application/json'
        }
      });
      console.log('❌ Endpoint accessible with invalid token (should not be):', response.status);
    } catch (error) {
      if (error.response && error.response.status === 401) {
        console.log('✅ Endpoint rejects invalid token (correct)');
      } else {
        console.log('❌ Unexpected error with invalid token:', error.response ? error.response.status : error.message);
      }
    }
    
    // Test with valid login and token
    console.log('\n🔍 Testing with valid vendor login...');
    const loginResponse = await axios.post('http://localhost:3001/api/v1/auth/login', {
      username: 'vendor',
      password: 'vendor123'
    });
    
    console.log('✅ Login successful');
    const token = loginResponse.data.data.accessToken;
    
    // Test vendor invoices endpoint
    const invoicesResponse = await axios.get('http://localhost:3001/api/v1/vendor/invoices', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Vendor invoices endpoint accessible');
    console.log('📊 Response status:', invoicesResponse.status);
    console.log('📊 Response data type:', typeof invoicesResponse.data);
    console.log('📊 Response data length:', Array.isArray(invoicesResponse.data) ? invoicesResponse.data.length : 'not array');
    
    if (Array.isArray(invoicesResponse.data)) {
      console.log('📋 Invoices found:', invoicesResponse.data.length);
      invoicesResponse.data.forEach((invoice, index) => {
        console.log(`  ${index + 1}. ID: ${invoice.id}, Number: ${invoice.invoice_number}, Status: ${invoice.status}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error testing vendor endpoint:', error.response ? {
      status: error.response.status,
      data: error.response.data
    } : error.message);
  }
}

testVendorEndpoint(); 