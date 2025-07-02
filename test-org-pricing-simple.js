const https = require('https');
const http = require('http');

// Generate a valid organization user token
const jwt = require('jsonwebtoken');

const payload = {
  id: 1,
  username: 'organization1',
  role: 'organization',
  organizationId: 1,
  sessionId: 'test-session-123'
};

const token = jwt.sign(payload, 'cpr-training-super-secure-jwt-secret-key-2025!', { expiresIn: '1h' });

console.log('Testing organization pricing endpoint...');

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/v1/organization-pricing/organization/1',
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
    console.log('Response:', data);
    try {
      const jsonData = JSON.parse(data);
      console.log('Parsed response:', JSON.stringify(jsonData, null, 2));
    } catch (e) {
      console.log('Could not parse JSON response');
    }
  });
});

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`);
});

req.end(); 