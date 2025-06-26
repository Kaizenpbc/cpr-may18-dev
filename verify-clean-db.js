const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'cpr_may18',
  user: 'postgres',
  password: 'gtacpr'
});

async function verifyCleanDB() {
  try {
    // Check if course request 27 still exists
    const courseCheck = await pool.query(`
      SELECT COUNT(*) as count
      FROM course_requests 
      WHERE id = 27
    `);
    
    console.log('Course request 27 remaining:', courseCheck.rows[0].count);
    
    // Check if any students for course 27 remain
    const studentsCheck = await pool.query(`
      SELECT COUNT(*) as count
      FROM course_students 
      WHERE course_request_id = 27
    `);
    
    console.log('Students for course 27 remaining:', studentsCheck.rows[0].count);
    
    // Check all course requests for instructor 4827
    const allCourses = await pool.query(`
      SELECT id, instructor_id, status, confirmed_date
      FROM course_requests 
      WHERE instructor_id = 4827
      ORDER BY id
    `);
    
    console.log('\nAll course requests for instructor 4827:');
    if (allCourses.rows.length > 0) {
      allCourses.rows.forEach(row => {
        console.log(`ID: ${row.id}, Status: ${row.status}, Date: ${row.confirmed_date}`);
      });
    } else {
      console.log('No course requests found for instructor 4827');
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
    
    // Check all students in the system
    const allStudents = await pool.query(`
      SELECT COUNT(*) as total_students
      FROM course_students
    `);
    
    console.log(`\nTotal students in system: ${allStudents.rows[0].total_students}`);
    
    if (courseCheck.rows[0].count === 0 && studentsCheck.rows[0].count === 0 && allCourses.rows.length === 0 && allClasses.rows.length === 0) {
      console.log('\n✅ Database is completely clean for instructor 4827!');
    } else {
      console.log('\n❌ Some data still remains');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

verifyCleanDB(); 