const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function checkSpecificCourse() {
  try {
    console.log('🔍 Checking specific course details...\n');
    
    // Check course 27 (completed)
    console.log('Course 27 (completed):');
    const course27Result = await pool.query(`
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
      WHERE cr.id = 27
    `);
    console.log('Course details:', course27Result.rows[0]);
    
    const students27Result = await pool.query(`
      SELECT COUNT(*) as student_count
      FROM course_students cs
      WHERE cs.course_request_id = 27
    `);
    console.log('Student count:', students27Result.rows[0].student_count);
    
    // Check course 28 (confirmed)
    console.log('\nCourse 28 (confirmed):');
    const course28Result = await pool.query(`
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
      WHERE cr.id = 28
    `);
    console.log('Course details:', course28Result.rows[0]);
    
    const students28Result = await pool.query(`
      SELECT COUNT(*) as student_count
      FROM course_students cs
      WHERE cs.course_request_id = 28
    `);
    console.log('Student count:', students28Result.rows[0].student_count);
    
    // Check what the instructor portal query would return
    console.log('\nInstructor portal query result for instructor 32:');
    const instructorQueryResult = await pool.query(`
      SELECT 
        cr.id,
        cr.id as course_id,
        cr.instructor_id,
        cr.confirmed_date as start_time,
        cr.confirmed_date as end_time,
        cr.status,
        cr.location,
        cr.registered_students as max_students,
        CASE WHEN cr.status = 'completed' THEN true ELSE false END as completed,
        cr.created_at,
        cr.updated_at,
        ct.name as course_name,
        ct.name as coursetypename,
        COALESCE(o.name, 'Unassigned') as organizationname,
        COALESCE(cr.location, '') as notes,
        (SELECT COUNT(*) FROM course_students cs WHERE cs.course_request_id = cr.id) as studentcount,
        (SELECT COUNT(*) FROM course_students cs WHERE cs.course_request_id = cr.id AND cs.attended = true) as studentsattendance
       FROM course_requests cr
       JOIN class_types ct ON cr.course_type_id = ct.id
       LEFT JOIN organizations o ON cr.organization_id = o.id
       WHERE cr.instructor_id = 32 AND cr.status = 'confirmed'
       ORDER BY cr.confirmed_date DESC
    `);
    console.log('Instructor portal query result:', instructorQueryResult.rows);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkSpecificCourse(); 