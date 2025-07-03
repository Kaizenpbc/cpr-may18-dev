const jwt = require('jsonwebtoken');

const payload = {
  id: 3, // assuming coujoe's user id is 3
  username: 'coujoe',
  role: 'instructor',
  sessionId: 'test-session-coujoe'
};

const secret = 'cpr-training-super-secure-jwt-secret-key-2025!';
const token = jwt.sign(payload, secret, { expiresIn: '1h' });

console.log('JWT for coujoe:', token); 