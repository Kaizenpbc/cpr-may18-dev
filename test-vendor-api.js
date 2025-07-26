const axios = require('axios');

async function testVendorInvoicesAPI() {
  try {
    console.log('🔍 Testing vendor invoices API...');
    
    // Test the API endpoint
    const response = await axios.get('http://localhost:3001/api/v1/vendor/invoices', {
      headers: {
        'Authorization': 'Bearer test-token',
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ API Response Status:', response.status);
    console.log('📊 Response Data:', JSON.stringify(response.data, null, 2));
    
    if (response.data && response.data.data) {
      const invoices = response.data.data;
      console.log(`📋 Found ${invoices.length} invoices:`);
      
      invoices.forEach((invoice, index) => {
        console.log(`\n  ${index + 1}. Invoice ID: ${invoice.id}`);
        console.log(`     Number: ${invoice.invoice_number}`);
        console.log(`     Status: ${invoice.status}`);
        console.log(`     Vendor ID: ${invoice.vendor_id}`);
        console.log(`     Created: ${invoice.created_at}`);
      });
    }
    
  } catch (error) {
    console.error('❌ API Error:', error.response ? {
      status: error.response.status,
      data: error.response.data
    } : error.message);
  }
}

testVendorInvoicesAPI(); 