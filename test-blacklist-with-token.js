const axios = require('axios');
const { Pool } = require('pg');

const BASE_URL = 'http://localhost:3001/api/v1';

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'cpr_jun21',
  user: 'postgres',
  password: 'gtacpr'
});

// Copy the hash function from the backend
function hashToken(token) {
  let hash = 0;
  for (let i = 0; i < token.length; i++) {
    const char = token.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString(36);
}

async function testBlacklistWithToken() {
  try {
    console.log('🔍 Testing Blacklist with Actual Token...\n');

    // 1. Login to get a token
    console.log('1. Logging in...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      username: 'admin',
      password: 'test123'
    });

    const token = loginResponse.data.data.accessToken;
    console.log('✅ Login successful');
    console.log(`   Token: ${token.substring(0, 20)}...`);
    
    // Hash the token
    const tokenHash = hashToken(token);
    console.log(`   Token hash: ${tokenHash}`);

    // 2. Test authentication with the token
    console.log('\n2. Testing authentication...');
    const authResponse = await axios.get(`${BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Authentication successful');
    console.log(`   User: ${authResponse.data.data.username}`);

    // 3. Check if token is already in blacklist
    console.log('\n3. Checking if token is already blacklisted...');
    const existingCheck = await pool.query(`
      SELECT COUNT(*) as count
      FROM token_blacklist
      WHERE token_hash = $1 AND expires_at > NOW()
    `, [tokenHash]);
    
    console.log(`   Already blacklisted: ${existingCheck.rows[0].count > 0}`);

    // 4. Logout to blacklist the token
    console.log('\n4. Logging out...');
    await axios.post(`${BASE_URL}/auth/logout`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Logout successful');

    // 5. Wait a moment for the blacklist to be updated
    console.log('\n5. Waiting for blacklist update...');
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 6. Check if token is now in blacklist
    console.log('\n6. Checking if token is now blacklisted...');
    const blacklistCheck = await pool.query(`
      SELECT COUNT(*) as count
      FROM token_blacklist
      WHERE token_hash = $1 AND expires_at > NOW()
    `, [tokenHash]);
    
    console.log(`   Now blacklisted: ${blacklistCheck.rows[0].count > 0}`);

    // 7. Test authentication again with the same token
    console.log('\n7. Testing authentication after logout...');
    try {
      await axios.get(`${BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('❌ FAILED: Token still works after logout');
    } catch (error) {
      if (error.response && error.response.status === 401) {
        console.log('✅ SUCCESS: Token properly invalidated');
      } else {
        console.log('❌ Unexpected error:', error.message);
      }
    }

    // 8. Show the token in the blacklist
    console.log('\n8. Token details in blacklist:');
    const tokenDetails = await pool.query(`
      SELECT token_hash, expires_at, created_at
      FROM token_blacklist
      WHERE token_hash = $1
      ORDER BY created_at DESC
      LIMIT 1
    `, [tokenHash]);
    
    if (tokenDetails.rows.length > 0) {
      const row = tokenDetails.rows[0];
      console.log(`   Hash: ${row.token_hash}`);
      console.log(`   Expires: ${row.expires_at}`);
      console.log(`   Created: ${row.created_at}`);
    } else {
      console.log('   Token not found in blacklist');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('   Response:', error.response.data);
    }
  } finally {
    await pool.end();
  }
}

testBlacklistWithToken(); 