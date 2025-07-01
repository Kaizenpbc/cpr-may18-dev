const http = require('http');

const postData = JSON.stringify({
  username: 'instructor',
  password: 'test123'
});

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/v1/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  console.log(`Headers: ${JSON.stringify(res.headers)}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Response body:');
    console.log(data);
    
    try {
      const parsed = JSON.parse(data);
      console.log('\nParsed response:');
      console.log(JSON.stringify(parsed, null, 2));
      
      // Check if response has the expected structure
      if (parsed.data && parsed.data.accessToken && parsed.data.user) {
        console.log('\n✅ Response format is correct!');
        console.log('✅ Has data.accessToken:', !!parsed.data.accessToken);
        console.log('✅ Has data.user:', !!parsed.data.user);
      } else {
        console.log('\n❌ Response format is incorrect!');
        console.log('Expected: { success: true, data: { accessToken: "...", user: {...} } }');
      }
    } catch (e) {
      console.log('❌ Failed to parse JSON:', e.message);
    }
  });
});

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`);
});

req.write(postData);
req.end(); 