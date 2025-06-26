const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'cpr_may18',
  user: 'postgres',
  password: 'gtacpr'
});

async function deleteCourse27() {
  try {
    console.log('Checking course 27 before deletion...');
    
    // First check if course request 27 exists
    const courseCheck = await pool.query(`
      SELECT id, instructor_id, status, confirmed_date
      FROM course_requests 
      WHERE id = 27
    `);
    
    if (courseCheck.rows.length === 0) {
      console.log('Course request 27 does not exist');
      return;
    }
    
    console.log('Course request 27 found:', courseCheck.rows[0]);
    
    // Check students for course 27
    const studentsCheck = await pool.query(`
      SELECT COUNT(*) as student_count
      FROM course_students 
      WHERE course_request_id = 27
    `);
    
    console.log(`Students registered for course 27: ${studentsCheck.rows[0].student_count}`);
    
    // Delete students first (due to foreign key constraints)
    console.log('Deleting students for course 27...');
    const deleteStudents = await pool.query(`
      DELETE FROM course_students 
      WHERE course_request_id = 27
    `);
    
    console.log('Students deleted successfully');
    
    // Delete course request 27
    console.log('Deleting course request 27...');
    const deleteCourse = await pool.query(`
      DELETE FROM course_requests 
      WHERE id = 27
    `);
    
    console.log('Course request 27 deleted successfully');
    
    // Verify deletion
    const verifyCourse = await pool.query(`
      SELECT COUNT(*) as count
      FROM course_requests 
      WHERE id = 27
    `);
    
    const verifyStudents = await pool.query(`
      SELECT COUNT(*) as count
      FROM course_students 
      WHERE course_request_id = 27
    `);
    
    if (verifyCourse.rows[0].count === 0 && verifyStudents.rows[0].count === 0) {
      console.log('✅ Course 27 and all associated data successfully deleted and verified');
    } else {
      console.log('❌ Some data still exists after deletion attempt');
    }
    
  } catch (error) {
    console.error('Error deleting course 27:', error);
  } finally {
    await pool.end();
  }
}

deleteCourse27(); 