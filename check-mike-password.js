const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

async function checkAndResetMikePassword() {
  const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'gtacpr',
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: 'cpr_jun21',
  });

  try {
    console.log('🔍 Checking mike user...');
    
    // Check current user
    const result = await pool.query(
      'SELECT id, username, email, role, password_hash FROM users WHERE username = $1',
      ['mike']
    );

    if (result.rows.length === 0) {
      console.log('❌ User "mike" not found');
      return;
    }

    const user = result.rows[0];
    console.log('✅ Found mike user:');
    console.log(`   ID: ${user.id}`);
    console.log(`   Username: ${user.username}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Current password hash: ${user.password_hash}`);

    // Test current password
    const testPassword = 'test123';
    const isValid = await bcrypt.compare(testPassword, user.password_hash);
    console.log(`\n🔐 Testing password "test123": ${isValid ? '✅ VALID' : '❌ INVALID'}`);

    if (!isValid) {
      console.log('\n🔧 Resetting password to "test123"...');
      const newHash = await bcrypt.hash(testPassword, 10);
      
      await pool.query(
        'UPDATE users SET password_hash = $1 WHERE username = $2',
        [newHash, 'mike']
      );
      
      console.log('✅ Password reset successfully!');
      console.log('   mike can now login with: test123');
    } else {
      console.log('✅ Password is already correct!');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkAndResetMikePassword(); 