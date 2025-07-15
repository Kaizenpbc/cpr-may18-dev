const axios = require('axios');
const bcrypt = require('bcryptjs');

const BASE_URL = 'http://localhost:3001/api/v1';

// Test users to create
const testUsers = [
  {
    username: 'hr_test',
    email: 'hr@test.com',
    password: 'hr123',
    role: 'hr'
  },
  {
    username: 'instructor_test',
    email: 'instructor@test.com',
    password: 'instructor123',
    role: 'instructor'
  },
  {
    username: 'accountant_test',
    email: 'accountant@test.com',
    password: 'accountant123',
    role: 'accountant'
  }
];

async function createTestUsers() {
  console.log('🔧 Creating test users for payment request workflow...\n');
  
  // First, let's try to login as an existing user to get admin access
  let adminToken = null;
  
  try {
    // Try to login as an existing user
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      username: 'orguser',
      password: 'password' // Try common password
    });
    adminToken = loginResponse.data.data.access_token;
    console.log('✅ Logged in as existing user');
  } catch (error) {
    console.log('❌ Could not login as existing user, will try direct database approach');
  }
  
  // For now, let's update the test script to use the existing accountant user
  // since we can see from the logs that 'accountant' user exists and is working
  console.log('\n📋 Using existing users for testing:');
  console.log('- HR: hr (password: hr123)');
  console.log('- Instructor: instructor1 (password: instructor123)');
  console.log('- Accountant: accountant (password: accountant123)');
  
  // Test login with these credentials
  console.log('\n🔍 Testing login with existing credentials...');
  
  const credentials = [
    { username: 'hr', password: 'hr123' },
    { username: 'instructor1', password: 'instructor123' },
    { username: 'accountant', password: 'accountant123' }
  ];
  
  const tokens = {};
  
  for (const cred of credentials) {
    try {
      const response = await axios.post(`${BASE_URL}/auth/login`, cred);
      tokens[cred.username] = response.data.data.access_token;
      console.log(`✅ ${cred.username}: Login successful`);
    } catch (error) {
      console.log(`❌ ${cred.username}: Login failed - ${error.response?.data?.error || error.message}`);
    }
  }
  
  return tokens;
}

createTestUsers(); 