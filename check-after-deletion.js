const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'cpr_may18',
  user: 'postgres',
  password: 'gtacpr'
});

async function checkAfterDeletion() {
  try {
    // Check if class 25 still exists
    const classCheck = await pool.query(`
      SELECT id, instructor_id, status, start_time, end_time
      FROM classes 
      WHERE id = 25
    `);
    
    console.log('Current state of class 25:');
    if (classCheck.rows.length > 0) {
      console.log('Class 25 still exists:', classCheck.rows[0]);
    } else {
      console.log('Class 25 has been deleted');
    }
    
    // Check all classes for instructor 4827
    const allClasses = await pool.query(`
      SELECT id, instructor_id, status, start_time, end_time
      FROM classes 
      WHERE instructor_id = 4827
      ORDER BY id
    `);
    
    console.log('\nAll classes for instructor 4827:');
    if (allClasses.rows.length > 0) {
      allClasses.rows.forEach(row => {
        console.log(`ID: ${row.id}, Status: ${row.status}, Time: ${row.start_time}-${row.end_time}`);
      });
    } else {
      console.log('No classes found for instructor 4827');
    }
    
    // Check course request 27
    const courseRequest = await pool.query(`
      SELECT id, instructor_id, status, confirmed_date
      FROM course_requests 
      WHERE id = 27
    `);
    
    console.log('\nCourse Request 27:');
    if (courseRequest.rows.length > 0) {
      console.log(courseRequest.rows[0]);
    } else {
      console.log('Course request 27 not found');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkAfterDeletion(); 