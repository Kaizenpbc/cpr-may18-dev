const bcrypt = require('bcryptjs');

const hash = '$2a$10$.p53yMEzs7CeigEuw5aGC.3LT7eQxKcmOlzGYufGFKC2Y0voyUNI2';

const testPasswords = [
  'password123',
  'password',
  'iffat',
  'test123',
  'admin',
  '123456',
  'password1',
  'qwerty'
];

async function testPasswordMatch() {
  for (const password of testPasswords) {
    const isMatch = await bcrypt.compare(password, hash);
    if (isMatch) {
      console.log(`✅ Password found: "${password}"`);
      return password;
    }
  }
  console.log('❌ No matching password found');
  return null;
}

testPasswordMatch(); 