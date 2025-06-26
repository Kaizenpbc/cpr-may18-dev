const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'cpr_jun21',
  password: 'gtacpr',
  port: 5432,
});

async function checkInstructorCredentials() {
  try {
    console.log('🔍 Checking instructor credentials...\n');

    const result = await pool.query(
      'SELECT id, username, email, role FROM users WHERE role = $1',
      ['instructor']
    );

    console.log('Instructors found:');
    result.rows.forEach((instructor, index) => {
      console.log(`${index + 1}. ID: ${instructor.id}, Username: ${instructor.username}, Email: ${instructor.email}, Role: ${instructor.role}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkInstructorCredentials(); 