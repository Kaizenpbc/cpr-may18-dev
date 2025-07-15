const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api/v1';

// Test with different common credentials
const testCredentials = [
  { username: 'hr', password: 'hr123' },
  { username: 'hr', password: 'password' },
  { username: 'hr', password: '123456' },
  { username: 'admin', password: 'admin123' },
  { username: 'admin', password: 'password' },
  { username: 'instructor1', password: 'instructor123' },
  { username: 'instructor1', password: 'password' },
  { username: 'accountant', password: 'accountant123' },
  { username: 'accountant', password: 'password' },
  { username: 'sysadmin', password: 'sysadmin123' },
  { username: 'sysadmin', password: 'password' }
];

async function testLogin(credentials) {
  try {
    const response = await axios.post(`${BASE_URL}/auth/login`, credentials);
    console.log(`✅ SUCCESS: ${credentials.username}/${credentials.password} - Role: ${response.data.data.user.role}`);
    return response.data.data.access_token;
  } catch (error) {
    if (error.response?.status === 401) {
      console.log(`❌ FAILED: ${credentials.username}/${credentials.password} - ${error.response.data.error}`);
    } else {
      console.log(`❌ ERROR: ${credentials.username}/${credentials.password} - ${error.message}`);
    }
    return null;
  }
}

async function findWorkingCredentials() {
  console.log('🔍 Testing different login credentials...\n');
  
  const workingTokens = {};
  
  for (const cred of testCredentials) {
    const token = await testLogin(cred);
    if (token) {
      workingTokens[cred.username] = {
        password: cred.password,
        token: token
      };
    }
  }
  
  console.log('\n📋 Working credentials found:');
  Object.keys(workingTokens).forEach(username => {
    console.log(`- ${username}: ${workingTokens[username].password}`);
  });
  
  return workingTokens;
}

findWorkingCredentials(); 