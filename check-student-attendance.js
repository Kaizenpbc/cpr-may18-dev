const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'cpr_jun21',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'gtacpr',
});

async function checkAttendance() {
  try {
    console.log('Checking student attendance data...');
    
    // First, let's see what course requests exist
    const courseRequests = await pool.query(`
      SELECT id, instructor_id, organization_id, course_type_id, status, confirmed_date
      FROM course_requests
      ORDER BY id DESC
      LIMIT 10
    `);
    
    console.log('\n📋 Recent course requests:');
    courseRequests.rows.forEach(cr => {
      console.log(`  ID: ${cr.id}, Instructor: ${cr.instructor_id}, Status: ${cr.status}, Date: ${cr.confirmed_date}`);
    });
    
    // Get all students with their attendance data
    const students = await pool.query(`
      SELECT 
        cs.id,
        cs.first_name,
        cs.last_name,
        cs.email,
        cs.attendance_marked,
        cs.attended,
        cs.course_request_id,
        cs.created_at,
        cs.updated_at
      FROM course_students cs
      ORDER BY cs.course_request_id DESC, cs.last_name, cs.first_name
      LIMIT 20
    `);
    
    console.log('\n📋 Recent students:');
    students.rows.forEach(student => {
      console.log(`  - ${student.first_name} ${student.last_name}`);
      console.log(`    ID: ${student.id}, Course Request: ${student.course_request_id}`);
      console.log(`    attendance_marked: ${student.attendance_marked}`);
      console.log(`    attended: ${student.attended}`);
      console.log(`    updated_at: ${student.updated_at}`);
      console.log('');
    });
    
    // Count attendance status
    const total = students.rows.length;
    const marked = students.rows.filter(s => s.attendance_marked).length;
    const present = students.rows.filter(s => s.attended && s.attendance_marked).length;
    const absent = students.rows.filter(s => !s.attended && s.attendance_marked).length;
    const notMarked = total - marked;
    
    console.log('📊 Attendance Summary:');
    console.log(`  Total students: ${total}`);
    console.log(`  Attendance marked: ${marked}`);
    console.log(`  Present: ${present}`);
    console.log(`  Absent: ${absent}`);
    console.log(`  Not marked: ${notMarked}`);
    
  } catch (error) {
    console.error('Error checking attendance:', error);
  } finally {
    await pool.end();
  }
}

checkAttendance(); 