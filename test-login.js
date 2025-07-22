const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const pool = new Pool({
  user: 'postgres',
  password: 'gtacpr',
  host: '127.0.0.1',
  port: 5432,
  database: 'cpr_jun21'
});

async function testLogin() {
  console.log('🔐 Testing login functionality...\n');

  try {
    // Get vendor user
    const userResult = await pool.query(`
      SELECT id, email, role, password_hash
      FROM users 
      WHERE email = 'vendor@example.com'
    `);

    if (userResult.rows.length === 0) {
      console.log('❌ Vendor user not found');
      return;
    }

    const user = userResult.rows[0];
    console.log(`👤 Found user: ${user.email} (${user.role})`);

    // Test password verification
    const testPassword = 'vendor123';
    const isPasswordValid = await bcrypt.compare(testPassword, user.password_hash);
    
    console.log(`🔑 Testing password: ${testPassword}`);
    console.log(`✅ Password valid: ${isPasswordValid}`);

    if (!isPasswordValid) {
      console.log('\n🔄 Resetting password to vendor123...');
      const newHash = await bcrypt.hash(testPassword, 10);
      
      await pool.query(`
        UPDATE users 
        SET password_hash = $1, updated_at = NOW()
        WHERE id = $2
      `, [newHash, user.id]);

      console.log('✅ Password reset complete');
      
      // Verify the new password
      const verifyResult = await pool.query(`
        SELECT password_hash FROM users WHERE id = $1
      `, [user.id]);
      
      const isNewPasswordValid = await bcrypt.compare(testPassword, verifyResult.rows[0].password_hash);
      console.log(`✅ New password verification: ${isNewPasswordValid}`);
    }

    // Check for other users that might work
    console.log('\n📋 Checking other available users:');
    const allUsers = await pool.query(`
      SELECT id, email, role, created_at
      FROM users 
      WHERE role IN ('admin', 'instructor', 'vendor', 'accountant')
      ORDER BY created_at DESC
      LIMIT 5
    `);

    allUsers.rows.forEach(user => {
      console.log(`   ${user.email} (${user.role}) - ID: ${user.id}`);
    });

  } catch (error) {
    console.error('❌ Error testing login:', error.message);
  } finally {
    await pool.end();
  }
}

testLogin(); 