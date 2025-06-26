const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'cpr_jun21',
  password: 'gtacpr',
  port: 5432,
});

async function checkInstructorPassword() {
  try {
    console.log('🔍 Checking instructor password in database...\n');

    const result = await pool.query(
      'SELECT id, username, email, password_hash, role FROM users WHERE role = $1',
      ['instructor']
    );

    console.log('Instructor found:');
    result.rows.forEach((instructor, index) => {
      console.log(`${index + 1}. ID: ${instructor.id}`);
      console.log(`   Username: ${instructor.username}`);
      console.log(`   Email: ${instructor.email}`);
      console.log(`   Role: ${instructor.role}`);
      console.log(`   Password Hash: ${instructor.password_hash || 'NULL'}`);
      console.log('');
    });

    // Check if there are any users with test123 password
    console.log('Checking for users with test123 password...');
    const testResult = await pool.query(
      'SELECT id, username, email, role FROM users WHERE password_hash LIKE $1',
      ['%test123%']
    );

    if (testResult.rows.length > 0) {
      console.log('Users with test123 in password hash:');
      testResult.rows.forEach(user => {
        console.log(`- ${user.username} (${user.email}) - ${user.role}`);
      });
    } else {
      console.log('No users found with test123 in password hash');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkInstructorPassword(); 