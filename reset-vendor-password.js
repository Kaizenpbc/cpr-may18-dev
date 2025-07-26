const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  user: 'postgres',
  password: 'gtacpr',
  host: '127.0.0.1',
  port: 5432,
  database: 'cpr_jun21',
});

async function resetVendorPassword() {
  try {
    console.log('🔍 Resetting vendor password...');
    
    // Generate a new password hash
    const newPassword = 'vendor123';
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);
    
    // Update the vendor user's password
    const result = await pool.query(`
      UPDATE users 
      SET password_hash = $1 
      WHERE email = 'vendor@example.com' AND role = 'vendor'
      RETURNING id, username, email
    `, [passwordHash]);
    
    if (result.rows.length > 0) {
      const user = result.rows[0];
      console.log('✅ Vendor password reset successfully!');
      console.log(`👤 User: ${user.username} (${user.email})`);
      console.log(`🔑 New password: ${newPassword}`);
      console.log('\n💡 You can now log in with:');
      console.log(`   Email: ${user.email}`);
      console.log(`   Password: ${newPassword}`);
    } else {
      console.log('❌ Vendor user not found or password not updated');
    }
    
  } catch (error) {
    console.error('❌ Error resetting vendor password:', error.message);
  } finally {
    await pool.end();
  }
}

resetVendorPassword(); 