const jwt = require('jsonwebtoken');

// Generate a valid organization user token
const payload = {
  id: 1,
  username: 'organization1',
  role: 'organization',
  organizationId: 1,
  sessionId: 'test-session-123'
};

const token = jwt.sign(payload, 'your-secret-key', { expiresIn: '1h' });

console.log('Generated token:', token);
console.log('\nTest the endpoint with:');
console.log(`curl -X GET "http://localhost:3001/api/v1/organization-pricing/organization/1" -H "Authorization: Bearer ${token}"`); 