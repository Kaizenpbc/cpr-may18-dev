const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'cpr_may18',
  user: 'postgres',
  password: 'gtacpr'
});

async function checkCompletedCourses() {
  try {
    // Check all classes for instructor 4827
    const allClasses = await pool.query(`
      SELECT id, instructor_id, status, start_time, end_time, type_id
      FROM classes 
      WHERE instructor_id = 4827
      ORDER BY start_time DESC
    `);
    
    console.log('All classes for instructor 4827:');
    allClasses.rows.forEach(row => {
      console.log(`ID: ${row.id}, Status: ${row.status}, Date: ${row.start_time}, Type: ${row.type_id}`);
    });
    
    // Check specifically for completed classes
    const completedClasses = await pool.query(`
      SELECT id, instructor_id, status, start_time, end_time, type_id
      FROM classes 
      WHERE instructor_id = 4827 AND status = 'completed'
      ORDER BY start_time DESC
    `);
    
    console.log('\nCompleted classes for instructor 4827:');
    completedClasses.rows.forEach(row => {
      console.log(`ID: ${row.id}, Status: ${row.status}, Date: ${row.start_time}, Type: ${row.type_id}`);
    });
    
    // Check course_requests table
    const courseRequests = await pool.query(`
      SELECT id, instructor_id, status, confirmed_date, course_type_id
      FROM course_requests 
      WHERE instructor_id = 4827
      ORDER BY confirmed_date DESC
    `);
    
    console.log('\nCourse requests for instructor 4827:');
    courseRequests.rows.forEach(row => {
      console.log(`ID: ${row.id}, Status: ${row.status}, Date: ${row.confirmed_date}, Type: ${row.course_type_id}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkCompletedCourses(); 