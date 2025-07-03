const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'cpr_jun21',
  user: 'postgres',
  password: 'gtacpr'
});

async function debugBlacklistQuery() {
  try {
    console.log('🔍 Debugging Blacklist Query...\n');

    // 1. Get the token we just added
    console.log('1. Getting the recently added token...');
    const recentToken = await pool.query(`
      SELECT token_hash, expires_at, created_at
      FROM token_blacklist
      ORDER BY created_at DESC
      LIMIT 1
    `);

    if (recentToken.rows.length === 0) {
      console.log('❌ No tokens found in blacklist');
      return;
    }

    const tokenHash = recentToken.rows[0].token_hash;
    const expiresAt = recentToken.rows[0].expires_at;
    const createdAt = recentToken.rows[0].created_at;

    console.log(`   Token hash: ${tokenHash}`);
    console.log(`   Expires at: ${expiresAt}`);
    console.log(`   Created at: ${createdAt}`);

    // 2. Check current time
    console.log('\n2. Checking current time...');
    const nowQuery = await pool.query('SELECT NOW() as current_time');
    const currentTime = nowQuery.rows[0].current_time;
    console.log(`   Current time: ${currentTime}`);

    // 3. Test the exact query from the backend
    console.log('\n3. Testing the exact blacklist query...');
    const blacklistQuery = `
      SELECT COUNT(*) as count
      FROM token_blacklist
      WHERE token_hash = $1 AND expires_at > NOW()
    `;
    
    console.log(`   Query: ${blacklistQuery}`);
    console.log(`   Parameters: [${tokenHash}]`);
    
    const result = await pool.query(blacklistQuery, [tokenHash]);
    console.log(`   Result: ${result.rows[0].count} matches`);

    // 4. Test without the expiration check
    console.log('\n4. Testing without expiration check...');
    const noExpiryQuery = `
      SELECT COUNT(*) as count
      FROM token_blacklist
      WHERE token_hash = $1
    `;
    
    const noExpiryResult = await pool.query(noExpiryQuery, [tokenHash]);
    console.log(`   Result without expiry: ${noExpiryResult.rows[0].count} matches`);

    // 5. Test the expiration condition separately
    console.log('\n5. Testing expiration condition...');
    const expiryQuery = `
      SELECT expires_at > NOW() as is_not_expired
      FROM token_blacklist
      WHERE token_hash = $1
    `;
    
    const expiryResult = await pool.query(expiryQuery, [tokenHash]);
    if (expiryResult.rows.length > 0) {
      console.log(`   Is not expired: ${expiryResult.rows[0].is_not_expired}`);
    }

    // 6. Show all tokens with their expiration status
    console.log('\n6. All tokens with expiration status:');
    const allTokens = await pool.query(`
      SELECT 
        token_hash,
        expires_at,
        created_at,
        expires_at > NOW() as is_not_expired,
        NOW() as current_time
      FROM token_blacklist
      ORDER BY created_at DESC
    `);
    
    allTokens.rows.forEach((row, index) => {
      console.log(`   ${index + 1}. Hash: ${row.token_hash}`);
      console.log(`      Expires: ${row.expires_at}`);
      console.log(`      Not expired: ${row.is_not_expired}`);
      console.log(`      Current: ${row.current_time}`);
    });

  } catch (error) {
    console.error('❌ Error debugging blacklist query:', error);
  } finally {
    await pool.end();
  }
}

debugBlacklistQuery(); 