const axios = require('axios');

async function testVendorLogin() {
  try {
    console.log('🔍 Testing vendor login...');
    
    // Test login with vendor account
    const loginResponse = await axios.post('http://localhost:3001/api/v1/auth/login', {
      username: 'vendor',
      password: 'vendor123' // Updated password
    });
    
    console.log('✅ Login successful:', loginResponse.data);
    
    const token = loginResponse.data.data.accessToken;
    
    // Test vendor invoices endpoint with proper authentication
    const invoicesResponse = await axios.get('http://localhost:3001/api/v1/vendor/invoices', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Vendor invoices response:', JSON.stringify(invoicesResponse.data, null, 2));
    
    if (invoicesResponse.data && Array.isArray(invoicesResponse.data)) {
      console.log(`📋 Found ${invoicesResponse.data.length} invoices:`);
      
      invoicesResponse.data.forEach((invoice, index) => {
        console.log(`\n  ${index + 1}. Invoice ID: ${invoice.id}`);
        console.log(`     Number: ${invoice.invoice_number}`);
        console.log(`     Status: ${invoice.status}`);
        console.log(`     Vendor ID: ${invoice.vendor_id}`);
        console.log(`     Created: ${invoice.created_at}`);
      });
    } else {
      console.log('❌ Response is not an array:', typeof invoicesResponse.data);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.response ? {
      status: error.response.status,
      data: error.response.data
    } : error.message);
    
    if (error.response && error.response.status === 401) {
      console.log('💡 Try logging in with these credentials:');
      console.log('   Email: vendor@example.com');
      console.log('   Password: test123 (or check the database for the actual password)');
    }
  }
}

testVendorLogin(); 