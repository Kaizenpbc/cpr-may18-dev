const axios = require('axios');

async function testRealDownload() {
  try {
    console.log('🧪 Logging in as vendor...');
    // Attempt login
    const loginRes = await axios.post('http://localhost:3001/api/v1/auth/login', {
      username: 'vendor',
      password: 'vendor123'
    });
    console.log('🔎 Login response:', loginRes.data);
    const token = loginRes.data?.data?.accessToken;
    if (!token) {
      console.error('❌ Login failed: No token received');
      return;
    }
    console.log('✅ Login successful, token received');

    // Now download the invoice
    console.log('📥 Attempting to download invoice 23 as vendor...');
    const response = await axios.get('http://localhost:3001/api/v1/vendor/invoices/23/download', {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      responseType: 'arraybuffer',
      validateStatus: function (status) {
        return status < 500; // Accept all status codes less than 500
      }
    });
    
    console.log('📊 Response status:', response.status);
    if (response.status === 200) {
      console.log('✅ PDF generated successfully!');
      console.log('📊 Response size:', response.data.length, 'bytes');
      console.log('📊 Content-Type:', response.headers['content-type']);
      console.log('📊 Content-Disposition:', response.headers['content-disposition']);
      if (response.headers['content-type'] && response.headers['content-type'].includes('application/pdf')) {
        console.log('✅ Confirmed: Response is a PDF file');
      } else {
        console.log('⚠️ Warning: Response is not a PDF file');
      }
    } else if (response.status === 401) {
      console.log('❌ Authentication failed - invalid token or permissions');
    } else if (response.status === 404) {
      console.log('❌ Invoice not found');
    } else {
      console.log('❌ Unexpected response:', response.status);
    }
  } catch (error) {
    console.error('❌ Error testing download:', error.message);
    if (error.response) {
      console.error('📋 Status:', error.response.status);
      console.error('📋 Data:', error.response.data?.toString?.() || error.response.data);
    }
  }
}

testRealDownload(); 