const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: 'cpr_jun21',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'gtacpr',
});

async function createTestInstructor() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Check if instructor user already exists
    const existingUser = await client.query(
      'SELECT id, username, role FROM users WHERE username = $1',
      ['instructor']
    );

    if (existingUser.rows.length > 0) {
      console.log('✅ Instructor user already exists:', existingUser.rows[0]);
      
      // Check if instructor record exists
      const instructorRecord = await client.query(
        'SELECT id, name FROM instructors WHERE user_id = $1',
        [existingUser.rows[0].id]
      );

      if (instructorRecord.rows.length === 0) {
        // Create instructor record
        await client.query(
          `INSERT INTO instructors (user_id, name, phone, address, city, province, postal_code)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [existingUser.rows[0].id, 'Test Instructor', '555-1234', '123 Test St', 'Test City', 'ON', 'A1A 1A1']
        );
        console.log('✅ Created instructor record');
      } else {
        console.log('✅ Instructor record already exists');
      }
      
      await client.query('COMMIT');
      return;
    }

    // Generate password hash for "test123"
    const saltRounds = 12;
    const password = 'test123';
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create instructor user
    const userResult = await client.query(`
      INSERT INTO users (username, email, password_hash, role, created_at, updated_at)
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING id, username, email, role
    `, [
      'instructor',
      'instructor@cpr-training.com',
      hashedPassword,
      'instructor'
    ]);

    const newUser = userResult.rows[0];

    // Create instructor record
    await client.query(
      `INSERT INTO instructors (user_id, name, phone, address, city, province, postal_code)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [newUser.id, 'Test Instructor', '555-1234', '123 Test St', 'Test City', 'ON', 'A1A 1A1']
    );
    
    console.log('✅ Test instructor created successfully!');
    console.log(`   - ID: ${newUser.id}`);
    console.log(`   - Username: ${newUser.username}`);
    console.log(`   - Email: ${newUser.email}`);
    console.log(`   - Role: ${newUser.role}`);
    console.log(`   - Password: ${password}`);

    await client.query('COMMIT');
    
    console.log('\n🎯 Test Instructor Login Credentials:');
    console.log('   Username: instructor');
    console.log('   Password: test123');
    console.log('   Email: instructor@cpr-training.com');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error creating test instructor:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function main() {
  try {
    console.log('🚀 Creating test instructor...\n');
    await createTestInstructor();
    console.log('\n✅ Test instructor setup completed!');
  } catch (error) {
    console.error('❌ Failed to create test instructor:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  main();
}

module.exports = { createTestInstructor }; 