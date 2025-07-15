const http = require('http');

async function testEndpoint(path) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: path,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        console.log(`✅ ${path} - Status: ${res.statusCode}`);
        if (data) {
          try {
            const json = JSON.parse(data);
            console.log(`   Response: ${JSON.stringify(json, null, 2)}`);
          } catch (e) {
            console.log(`   Response: ${data}`);
          }
        }
        resolve();
      });
    });

    req.on('error', (err) => {
      console.log(`❌ ${path} - Error: ${err.message}`);
      resolve();
    });

    req.setTimeout(5000, () => {
      console.log(`⏰ ${path} - Timeout`);
      req.destroy();
      resolve();
    });

    req.end();
  });
}

async function testBackend() {
  console.log('🔍 Testing Backend Connection...\n');
  
  const endpoints = [
    '/api/v1/health',
    '/api/v1/auth/login',
    '/api/v1/timesheets',
    '/api/v1/payroll',
    '/api/v1/payment-requests'
  ];

  for (const endpoint of endpoints) {
    await testEndpoint(endpoint);
    console.log(''); // Add spacing
  }

  console.log('🎉 Backend connection test completed!');
}

testBackend().catch(console.error); 