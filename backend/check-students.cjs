const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'cpr_may18',
  user: 'postgres',
  password: 'gtacpr'
});

async function checkStudents() {
  try {
    console.log('🔍 Checking students for course 27...');
    
    // Check course_students table
    const studentsResult = await pool.query(
      'SELECT * FROM course_students WHERE course_request_id = 27'
    );
    
    console.log('Students in course_students table:');
    console.log(JSON.stringify(studentsResult.rows, null, 2));
    console.log(`Total students: ${studentsResult.rows.length}`);
    
    // Check course_requests table
    const courseResult = await pool.query(
      'SELECT id, organization_id, registered_students, status FROM course_requests WHERE id = 27'
    );
    
    console.log('\nCourse 27 details:');
    console.log(JSON.stringify(courseResult.rows[0], null, 2));
    
    // Check the view
    try {
      const viewResult = await pool.query(
        'SELECT id, organization_id, students_registered, status FROM course_request_details WHERE id = 27'
      );
      
      console.log('\nView result:');
      console.log(JSON.stringify(viewResult.rows[0], null, 2));
    } catch (viewError) {
      console.log('\nView error:', viewError.message);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkStudents(); 