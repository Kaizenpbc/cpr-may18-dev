const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'cpr_may18',
  user: 'postgres',
  password: 'gtacpr'
});

async function checkCourse27() {
  try {
    // Check course_requests table for ID 27
    const courseRequest = await pool.query(`
      SELECT id, instructor_id, status, confirmed_date, course_type_id, completed_at, instructor_comments
      FROM course_requests 
      WHERE id = 27
    `);
    
    console.log('Course Request ID 27:');
    if (courseRequest.rows.length > 0) {
      courseRequest.rows.forEach(row => {
        console.log(`ID: ${row.id}, Status: ${row.status}, Date: ${row.confirmed_date}, Completed: ${row.completed_at}, Comments: ${row.instructor_comments}`);
      });
    } else {
      console.log('Course request 27 not found');
    }
    
    // Check classes table for any classes related to instructor 4827
    const classes = await pool.query(`
      SELECT id, instructor_id, status, start_time, end_time, type_id, completed_at
      FROM classes 
      WHERE instructor_id = 4827
      ORDER BY start_time DESC
    `);
    
    console.log('\nAll classes for instructor 4827:');
    classes.rows.forEach(row => {
      console.log(`ID: ${row.id}, Status: ${row.status}, Date: ${row.start_time}, Completed: ${row.completed_at}`);
    });
    
    // Check if there are any completed courses in course_requests
    const completedRequests = await pool.query(`
      SELECT id, instructor_id, status, confirmed_date, completed_at
      FROM course_requests 
      WHERE instructor_id = 4827 AND status = 'completed'
      ORDER BY completed_at DESC
    `);
    
    console.log('\nCompleted course requests for instructor 4827:');
    completedRequests.rows.forEach(row => {
      console.log(`ID: ${row.id}, Status: ${row.status}, Date: ${row.confirmed_date}, Completed: ${row.completed_at}`);
    });
    
    // Check if there are any completed classes
    const completedClasses = await pool.query(`
      SELECT id, instructor_id, status, start_time, completed_at
      FROM classes 
      WHERE instructor_id = 4827 AND status = 'completed'
      ORDER BY completed_at DESC
    `);
    
    console.log('\nCompleted classes for instructor 4827:');
    completedClasses.rows.forEach(row => {
      console.log(`ID: ${row.id}, Status: ${row.status}, Date: ${row.start_time}, Completed: ${row.completed_at}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkCourse27(); 