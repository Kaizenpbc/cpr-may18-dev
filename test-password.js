const bcrypt = require('bcryptjs');

const hash = '$2a$10$.p53yMEzs7CeigEuw5aGC.3LT7eQxKcmOlzGYufGFKC2Y0voyUNI2';
const passwords = ['password', '123456', 'admin', 'test', 'iffat', 'user', 'pass'];

async function testPasswords() {
  for (const password of passwords) {
    const isValid = await bcrypt.compare(password, hash);
    console.log(`Password "${password}": ${isValid ? 'VALID' : 'invalid'}`);
    if (isValid) {
      console.log(`Found correct password: ${password}`);
      break;
    }
  }
}

testPasswords(); 