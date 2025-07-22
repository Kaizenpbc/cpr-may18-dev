const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const pool = new Pool({
  user: 'postgres',
  password: 'gtacpr',
  host: '127.0.0.1',
  port: 5432,
  database: 'cpr_jun21'
});

async function createTestUser() {
  console.log('👤 Creating test user...\n');

  try {
    const password = 'test123';
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create a test vendor user
    const result = await pool.query(`
      INSERT INTO users (email, password_hash, role, first_name, last_name, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      ON CONFLICT (email) DO UPDATE SET 
        password_hash = EXCLUDED.password_hash,
        updated_at = NOW()
      RETURNING id, email, role
    `, ['testvendor@example.com', hashedPassword, 'vendor', 'Test', 'Vendor']);

    console.log('✅ Test user created/updated:');
    console.log(`   ID: ${result.rows[0].id}`);
    console.log(`   Email: ${result.rows[0].email}`);
    console.log(`   Role: ${result.rows[0].role}`);
    console.log(`   Password: ${password}`);

    console.log('\n🎯 Login credentials:');
    console.log(`   Email: testvendor@example.com`);
    console.log(`   Password: ${password}`);

  } catch (error) {
    console.error('❌ Error creating test user:', error.message);
  } finally {
    await pool.end();
  }
}

createTestUser(); 