const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const pool = new Pool({
  user: 'postgres',
  password: 'gtacpr',
  host: '127.0.0.1',
  port: 5432,
  database: 'cpr_jun21'
});

async function resetVendorPassword() {
  console.log('🔧 Resetting vendor password...\n');

  try {
    // New password
    const newPassword = 'vendor123';
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update vendor user password
    const result = await pool.query(`
      UPDATE users 
      SET password_hash = $1, updated_at = NOW()
      WHERE email = 'vendor@example.com' AND role = 'vendor'
      RETURNING id, email, role
    `, [hashedPassword]);

    if (result.rows.length > 0) {
      console.log('✅ Vendor password reset successfully!');
      console.log(`📧 Email: ${result.rows[0].email}`);
      console.log(`🔑 New Password: ${newPassword}`);
      console.log(`👤 Role: ${result.rows[0].role}`);
      console.log('\n🎯 You can now login with:');
      console.log(`   Email: vendor@example.com`);
      console.log(`   Password: ${newPassword}`);
    } else {
      console.log('❌ Vendor user not found');
    }

  } catch (error) {
    console.error('❌ Error resetting password:', error.message);
  } finally {
    await pool.end();
  }
}

resetVendorPassword(); 