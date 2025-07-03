const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

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

async function debugBlacklistHash() {
  try {
    console.log('🔍 Debugging Blacklist Hash Function...\n');

    // 1. Get a sample token from the database
    console.log('1. Getting sample token from blacklist...');
    const sampleToken = await pool.query(`
      SELECT token_hash, expires_at
      FROM token_blacklist
      WHERE expires_at > NOW()
      LIMIT 1;
    `);

    if (sampleToken.rows.length === 0) {
      console.log('❌ No active tokens found in blacklist');
      return;
    }

    const storedHash = sampleToken.rows[0].token_hash;
    console.log(`   Stored hash: ${storedHash}`);

    // 2. Create a test token and hash it
    console.log('\n2. Creating test token...');
    const testPayload = {
      id: 1,
      userId: 1,
      username: 'admin',
      role: 'admin'
    };
    
    const testToken = jwt.sign(testPayload, 'access_secret', { expiresIn: '1h' });
    const testHash = hashToken(testToken);
    
    console.log(`   Test token: ${testToken.substring(0, 20)}...`);
    console.log(`   Test hash: ${testHash}`);

    // 3. Test the blacklist check query
    console.log('\n3. Testing blacklist check query...');
    const blacklistCheck = await pool.query(`
      SELECT COUNT(*) as count
      FROM token_blacklist
      WHERE token_hash = $1 AND expires_at > NOW()
    `, [testHash]);
    
    console.log(`   Query result: ${blacklistCheck.rows[0].count} matches`);

    // 4. Test with the stored hash
    console.log('\n4. Testing with stored hash...');
    const storedCheck = await pool.query(`
      SELECT COUNT(*) as count
      FROM token_blacklist
      WHERE token_hash = $1 AND expires_at > NOW()
    `, [storedHash]);
    
    console.log(`   Stored hash check: ${storedCheck.rows[0].count} matches`);

    // 5. Show all active tokens
    console.log('\n5. All active tokens in blacklist:');
    const activeTokens = await pool.query(`
      SELECT token_hash, expires_at
      FROM token_blacklist
      WHERE expires_at > NOW()
      ORDER BY created_at DESC;
    `);
    
    activeTokens.rows.forEach((row, index) => {
      console.log(`   ${index + 1}. Hash: ${row.token_hash}, Expires: ${row.expires_at}`);
    });

  } catch (error) {
    console.error('❌ Error debugging blacklist hash:', error);
  } finally {
    await pool.end();
  }
}

debugBlacklistHash(); 