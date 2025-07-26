const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  password: 'gtacpr',
  host: '127.0.0.1',
  port: 5432,
  database: 'cpr_jun21',
});

async function checkVendorPassword() {
  try {
    console.log('🔍 Checking vendor account password...');
    
    // Check the vendor user account
    const vendorUser = await pool.query(`
      SELECT id, username, email, role, password_hash
      FROM users 
      WHERE email = 'vendor@example.com' AND role = 'vendor'
    `);
    
    if (vendorUser.rows.length > 0) {
      const user = vendorUser.rows[0];
      console.log('👤 Vendor user found:');
      console.log(`  - ID: ${user.id}`);
      console.log(`  - Username: ${user.username}`);
      console.log(`  - Email: ${user.email}`);
      console.log(`  - Role: ${user.role}`);
      console.log(`  - Password hash: ${user.password_hash ? 'Set' : 'Not set'}`);
      
      // Check if this is a default password
      if (user.password_hash) {
        console.log('💡 The password is hashed, so we can\'t see the plain text.');
        console.log('💡 Try these common default passwords:');
        console.log('   - test123');
        console.log('   - password');
        console.log('   - vendor');
        console.log('   - 123456');
      }
    } else {
      console.log('❌ Vendor user not found');
    }
    
    // Also check if there are any other vendor accounts
    const allVendorUsers = await pool.query(`
      SELECT id, username, email, role
      FROM users 
      WHERE role = 'vendor'
      ORDER BY id
    `);
    
    console.log('\n👥 All vendor users:');
    allVendorUsers.rows.forEach(user => {
      console.log(`  - ID: ${user.id}, Username: ${user.username}, Email: ${user.email}`);
    });
    
  } catch (error) {
    console.error('❌ Error checking vendor password:', error.message);
  } finally {
    await pool.end();
  }
}

checkVendorPassword(); 