const https = require('https');
const http = require('http');

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MiwidXNlcklkIjoiMiIsInVzZXJuYW1lIjoiaW5zdHJ1Y3RvciIsInJvbGUiOiJpbnN0cnVjdG9yIiwiaWF0IjoxNzUwMzU2ODg1LCJleHAiOjE3NTAzNjA0ODV9.6ulTgIPAii4MghEUwYCoJY0Q6mnM5o7lUX2omeJ-p38';

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/v1/instructor/classes',
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
};

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  console.log(`Headers:`, res.headers);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Response body:', data);
    try {
      const jsonData = JSON.parse(data);
      console.log('Parsed JSON:', JSON.stringify(jsonData, null, 2));
    } catch (e) {
      console.log('Could not parse as JSON');
    }
  });
});

req.on('error', (e) => {
  console.error(`Request error: ${e.message}`);
});

req.end(); 