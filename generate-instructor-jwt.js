const jwt = require('jsonwebtoken');

const payload = {
  id: 2,
  userId: '2',
  username: 'instructor',
  role: 'instructor',
};

const secret = 'cpr-training-super-secure-jwt-secret-key-2025!';
const token = jwt.sign(payload, secret, { expiresIn: '1h' });

console.log('JWT for instructor:', token); 