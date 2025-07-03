const axios = require('axios');
const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'cpr_jun21',
  password: 'gtacpr',
  port: 5432,
});

async function testBlacklistWithDbCheck() {
  try {
    console.log('🔍 Testing Token Blacklist with Database Check...\n');

    // 1. Check initial blacklist count
    console.log('1. Checking initial blacklist count...');
    const initialCount = await pool.query('SELECT COUNT(*) as count FROM token_blacklist');
    console.log(`   Initial blacklist count: ${initialCount.rows[0].count}`);

    // 2. Login as admin
    console.log('\n2. Logging in as admin...');
    const loginResponse = await axios.post('http://localhost:3001/api/v1/auth/login', {
      username: 'admin',
      password: 'test123'
    });

    if (!loginResponse.data.success) {
      console.log('❌ Admin login failed:', loginResponse.data.message);
      return;
    }

    const token = loginResponse.data.data.accessToken;
    const headers = { 'Authorization': `Bearer ${token}` };
    console.log('✅ Admin login successful');
    console.log('   Token:', token.substring(0, 20) + '...');

    // 3. Verify authentication before logout
    console.log('\n3. Verifying authentication before logout...');
    try {
      const authResponse = await axios.get('http://localhost:3001/api/v1/auth/me', { headers });
      console.log('✅ Authentication verified');
      console.log('   User:', authResponse.data.data.user.username);
    } catch (error) {
      console.log('❌ Authentication check failed:', error.response?.data?.message);
      return;
    }

    // 4. Perform logout
    console.log('\n4. Performing logout...');
    try {
      const logoutResponse = await axios.post('http://localhost:3001/api/v1/auth/logout', {}, { headers });
      console.log('✅ Logout API call successful');
      console.log('   Response:', logoutResponse.data);
    } catch (error) {
      console.log('❌ Logout API failed:', error.response?.data?.message || error.message);
      return;
    }

    // 5. Check blacklist count after logout
    console.log('\n5. Checking blacklist count after logout...');
    const afterCount = await pool.query('SELECT COUNT(*) as count FROM token_blacklist');
    console.log(`   Blacklist count after logout: ${afterCount.rows[0].count}`);

    // 6. Check if the token was added to blacklist
    console.log('\n6. Checking if token was added to blacklist...');
    const tokenHash = hashToken(token);
    console.log(`   Token hash: ${tokenHash}`);
    
    const blacklistCheck = await pool.query(
      'SELECT * FROM token_blacklist WHERE token_hash = $1',
      [tokenHash]
    );
    
    if (blacklistCheck.rows.length > 0) {
      console.log('✅ Token found in blacklist');
      console.log('   Record:', blacklistCheck.rows[0]);
    } else {
      console.log('❌ Token NOT found in blacklist');
    }

    // 7. Test authentication after logout (with same token)
    console.log('\n7. Testing authentication after logout (with same token)...');
    try {
      const authResponse = await axios.get('http://localhost:3001/api/v1/auth/me', { headers });
      console.log('⚠️  User still authenticated with same token');
      console.log('   User:', authResponse.data.data.user.username);
      console.log('   ❌ BLACKLIST NOT WORKING - Token should be invalidated');
    } catch (error) {
      console.log('✅ User properly logged out (auth check failed)');
      console.log('   Status:', error.response?.status);
      console.log('   Message:', error.response?.data?.message);
      console.log('   ✅ BLACKLIST WORKING - Token properly invalidated');
    }

    console.log('\n🎉 Blacklist Test with DB Check Complete!');

  } catch (error) {
    console.error('❌ Test error:', error.response?.data || error.message);
  } finally {
    await pool.end();
  }
}

// Simple hash function (same as in the backend)
function hashToken(token) {
  let hash = 0;
  for (let i = 0; i < token.length; i++) {
    const char = token.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString(36);
}

testBlacklistWithDbCheck(); 