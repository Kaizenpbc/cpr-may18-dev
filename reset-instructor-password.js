const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'cpr_jun21',
  password: 'gtacpr',
  port: 5432,
});

async function resetInstructorPassword() {
  try {
    console.log('🔧 Resetting instructor password to "test123"...\n');

    // Generate bcrypt hash for "test123"
    const saltRounds = 12;
    const password = 'test123';
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    console.log('Generated hash for "test123":', hashedPassword);

    // Update the instructor's password
    const result = await pool.query(
      'UPDATE users SET password_hash = $1 WHERE username = $2 AND role = $3 RETURNING id, username, email, role',
      [hashedPassword, 'instructor', 'instructor']
    );

    if (result.rows.length > 0) {
      console.log('✅ Password updated successfully!');
      console.log('Updated user:', result.rows[0]);
      console.log('\nYou can now login with:');
      console.log('Username: instructor');
      console.log('Password: test123');
    } else {
      console.log('❌ No instructor user found to update');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

resetInstructorPassword(); 