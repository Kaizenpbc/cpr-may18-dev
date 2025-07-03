const { Pool } = require('pg');

console.log('🔍 Starting blacklist table check...');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'cpr_training',
  user: 'postgres',
  password: 'gtacpr'
});

console.log('📊 Pool created, attempting connection...');

async function checkBlacklistTable() {
  try {
    console.log('🔍 Checking Token Blacklist Table...\n');

    // 1. Check if table exists
    console.log('1. Checking if token_blacklist table exists...');
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'token_blacklist'
      );
    `);
    
    const tableExists = tableCheck.rows[0].exists;
    console.log(`   Table exists: ${tableExists}`);

    if (!tableExists) {
      console.log('❌ Table does not exist!');
      return;
    }

    // 2. Check table structure
    console.log('\n2. Checking table structure...');
    const structureCheck = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'token_blacklist'
      ORDER BY ordinal_position;
    `);
    
    console.log('   Columns:');
    structureCheck.rows.forEach(row => {
      console.log(`     ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });

    // 3. Check if there are any tokens in the blacklist
    console.log('\n3. Checking blacklist contents...');
    const blacklistCheck = await pool.query(`
      SELECT COUNT(*) as total_tokens,
             COUNT(CASE WHEN expires_at > NOW() THEN 1 END) as active_tokens,
             COUNT(CASE WHEN expires_at <= NOW() THEN 1 END) as expired_tokens
      FROM token_blacklist;
    `);
    
    const stats = blacklistCheck.rows[0];
    console.log(`   Total tokens: ${stats.total_tokens}`);
    console.log(`   Active tokens: ${stats.active_tokens}`);
    console.log(`   Expired tokens: ${stats.expired_tokens}`);

    // 4. Show some sample tokens
    if (parseInt(stats.total_tokens) > 0) {
      console.log('\n4. Sample blacklisted tokens:');
      const sampleTokens = await pool.query(`
        SELECT token_hash, expires_at, created_at
        FROM token_blacklist
        ORDER BY created_at DESC
        LIMIT 5;
      `);
      
      sampleTokens.rows.forEach((row, index) => {
        console.log(`   ${index + 1}. Hash: ${row.token_hash}`);
        console.log(`      Expires: ${row.expires_at}`);
        console.log(`      Created: ${row.created_at}`);
      });
    }

    console.log('\n🎉 Blacklist Table Check Complete!');

  } catch (error) {
    console.error('❌ Error checking blacklist table:', error);
  } finally {
    console.log('🔌 Closing database connection...');
    await pool.end();
    console.log('✅ Database connection closed');
  }
}

checkBlacklistTable(); 