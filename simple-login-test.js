const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  password: 'gtacpr',
  host: '127.0.0.1',
  port: 5432,
  database: 'cpr_jun21'
});

async function simpleLoginTest() {
  console.log('🔍 Simple login test...\n');

  try {
    // Find all users with their roles
    const users = await pool.query(`
      SELECT id, email, role, created_at
      FROM users 
      ORDER BY created_at DESC
      LIMIT 10
    `);

    console.log('📋 Available users:');
    users.rows.forEach(user => {
      console.log(`   ${user.email} (${user.role}) - ID: ${user.id}`);
    });

    // Check if vendor user exists
    const vendor = await pool.query(`
      SELECT id, email, role, password_hash IS NOT NULL as has_password
      FROM users 
      WHERE email = 'vendor@example.com'
    `);

    if (vendor.rows.length > 0) {
      console.log('\n✅ Vendor user found:');
      console.log(`   Email: ${vendor.rows[0].email}`);
      console.log(`   Role: ${vendor.rows[0].role}`);
      console.log(`   Has Password: ${vendor.rows[0].has_password}`);
    } else {
      console.log('\n❌ Vendor user not found');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

simpleLoginTest(); 