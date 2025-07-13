const https = require('https');
const http = require('http');

async function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data, headers: res.headers }));
    });
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

async function getInvoiceData() {
  try {
    // Login with the reset password
    const loginResponse = await makeRequest('http://localhost:3001/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'iffat', password: 'password123' })
    });
    
    console.log('Login response headers:', loginResponse.headers);
    const loginData = JSON.parse(loginResponse.data);
    
    let cookie = '';
    if (loginResponse.headers['set-cookie']) {
      cookie = loginResponse.headers['set-cookie'][0].split(';')[0];
      console.log('Using session cookie:', cookie);
    }
    
    if (loginData.success) {
      console.log('Login successful!');
      const token = loginData.data.token;
      
      // Get invoices with session cookie
      const invoicesResponse = await makeRequest('http://localhost:3001/api/v1/organization/invoices', {
        method: 'GET',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...(cookie ? { 'Cookie': cookie } : {})
        }
      });
      
      // Print the full invoices response for debugging
      console.log('\nFull invoices response:', invoicesResponse.data);
      
      const invoicesData = JSON.parse(invoicesResponse.data);
      
      if (invoicesData.success && invoicesData.data.invoices) {
        const targetInvoice = invoicesData.data.invoices.find(inv => inv.invoice_number === 'INV-2025-502884');
        if (targetInvoice) {
          console.log('\nTarget invoice data:', JSON.stringify(targetInvoice, null, 2));
          return;
        } else {
          console.log('\nInvoice INV-2025-502884 not found in response');
        }
      }
    } else {
      console.log('Login failed:', loginData);
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

getInvoiceData(); 