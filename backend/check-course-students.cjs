const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function checkCourseStudents() {
  try {
    console.log('🔍 Checking course students data...\n');

    // Check all course requests
    console.log('1. All course requests:');
    const courseRequestsResult = await pool.query(`
      SELECT 
        cr.id,
        cr.instructor_id,
        cr.status,
        cr.confirmed_date,
        cr.registered_students,
        ct.name as course_type_name,
        o.name as organization_name
      FROM course_requests cr
      LEFT JOIN class_types ct ON cr.course_type_id = ct.id
      LEFT JOIN organizations o ON cr.organization_id = o.id
      ORDER BY cr.id
    `);
    
    console.log('Course Requests:', courseRequestsResult.rows);

    // Check course_students table
    console.log('\n2. Course students table:');
    const courseStudentsResult = await pool.query(`
      SELECT 
        cs.id,
        cs.course_request_id,
        cs.first_name,
        cs.last_name,
        cs.email,
        cs.attended
      FROM course_students cs
      ORDER BY cs.course_request_id
    `);
    
    console.log('Course Students:', courseStudentsResult.rows);

    // Check student count for each course
    console.log('\n3. Student counts per course:');
    for (const course of courseRequestsResult.rows) {
      const studentCountResult = await pool.query(`
        SELECT COUNT(*) as student_count
        FROM course_students cs
        WHERE cs.course_request_id = $1
      `, [course.id]);
      
      console.log(`Course ${course.id} (${course.course_type_name}):`);
      console.log(`  - Status: ${course.status}`);
      console.log(`  - Instructor: ${course.instructor_id}`);
      console.log(`  - Registered Students (field): ${course.registered_students}`);
      console.log(`  - Actual Students (counted): ${studentCountResult.rows[0].student_count}`);
      console.log('');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkCourseStudents(); 