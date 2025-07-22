const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  password: 'gtacpr',
  host: '127.0.0.1',
  port: 5432,
  database: 'cpr_jun21'
});

async function basicCheck() {
  console.log('🔍 Basic check for Iffat College instructors...\n');
  
  try {
    const result = await pool.query(`
      SELECT 
        cr.id,
        cr.confirmed_date,
        u.username as instructor
      FROM course_requests cr
      LEFT JOIN users u ON cr.instructor_id = u.id
      WHERE cr.organization_id = 2 AND cr.status = 'completed'
    `);
    
    console.log(`Found ${result.rows.length} completed courses:\n`);
    
    result.rows.forEach((course, index) => {
      console.log(`${index + 1}. Course ID: ${course.id}`);
      console.log(`   Date: ${course.confirmed_date}`);
      console.log(`   Instructor: ${course.instructor || 'N/A'}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

basicCheck(); 