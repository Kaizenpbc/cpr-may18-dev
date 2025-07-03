const { Pool } = require('pg');
const { TokenBlacklist } = require('./backend/dist/utils/tokenBlacklist.js');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'cpr_jun21',
  password: 'gtacpr',
  port: 5432,
});

async function testBlacklistDirect() {
  try {
    console.log('🔍 Testing Blacklist Directly...\n');

    // 1. Test adding a token to blacklist
    console.log('1. Testing addToBlacklist...');
    const testToken = 'test-token-123';
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now
    
    await TokenBlacklist.addToBlacklist(testToken, expiresAt);
    console.log('✅ Token added to blacklist');

    // 2. Test checking if token is blacklisted
    console.log('\n2. Testing isBlacklisted...');
    const isBlacklisted = await TokenBlacklist.isBlacklisted(testToken);
    console.log('   Is blacklisted:', isBlacklisted);

    // 3. Test with a different token
    console.log('\n3. Testing with different token...');
    const differentToken = 'different-token-456';
    const isDifferentBlacklisted = await TokenBlacklist.isBlacklisted(differentToken);
    console.log('   Is different token blacklisted:', isDifferentBlacklisted);

    // 4. Check database directly
    console.log('\n4. Checking database directly...');
    const result = await pool.query('SELECT COUNT(*) as count FROM token_blacklist');
    console.log('   Total blacklisted tokens:', result.rows[0].count);

    const tokenHash = hashToken(testToken);
    const specificResult = await pool.query(
      'SELECT * FROM token_blacklist WHERE token_hash = $1',
      [tokenHash]
    );
    console.log('   Test token in database:', specificResult.rows.length > 0);

    console.log('\n🎉 Direct Blacklist Test Complete!');

  } catch (error) {
    console.error('❌ Test error:', error);
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

testBlacklistDirect(); 