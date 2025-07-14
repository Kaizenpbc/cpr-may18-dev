const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

// Database configuration
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: 'cpr_jun21', // Using the current database
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'gtacpr',
});

async function createHRUser() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Check if HR user already exists
    const existingUser = await client.query(
      'SELECT id, username, role FROM users WHERE username = $1 OR role = $2',
      ['hr', 'hr']
    );

    if (existingUser.rows.length > 0) {
      console.log('⚠️  HR user already exists:');
      existingUser.rows.forEach(user => {
        console.log(`   - Username: ${user.username}, Role: ${user.role}, ID: ${user.id}`);
      });
      
      // Update existing user to HR role if needed
      if (existingUser.rows[0].role !== 'hr') {
        await client.query(
          'UPDATE users SET role = $1 WHERE username = $2',
          ['hr', existingUser.rows[0].username]
        );
        console.log('✅ Updated existing user to HR role');
      }
      
      await client.query('COMMIT');
      return;
    }

    // Generate password hash for "test123"
    const saltRounds = 12;
    const password = 'test123';
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create HR user
    const result = await client.query(`
      INSERT INTO users (username, email, password_hash, role, created_at, updated_at)
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING id, username, email, role
    `, [
      'hr',
      'hr@cpr-training.com',
      hashedPassword,
      'hr'
    ]);

    const newUser = result.rows[0];
    
    console.log('✅ HR user created successfully!');
    console.log(`   - ID: ${newUser.id}`);
    console.log(`   - Username: ${newUser.username}`);
    console.log(`   - Email: ${newUser.email}`);
    console.log(`   - Role: ${newUser.role}`);
    console.log(`   - Password: ${password}`);

    await client.query('COMMIT');
    
    console.log('\n🎯 HR User Login Credentials:');
    console.log('   Username: hr');
    console.log('   Password: test123');
    console.log('   Email: hr@cpr-training.com');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error creating HR user:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function main() {
  try {
    console.log('🚀 Creating HR user...\n');
    await createHRUser();
    console.log('\n✅ HR user setup completed!');
  } catch (error) {
    console.error('❌ Failed to create HR user:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  main();
}

module.exports = { createHRUser }; 