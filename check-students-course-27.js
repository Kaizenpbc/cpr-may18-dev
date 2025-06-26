const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'cpr_may18',
  user: 'postgres',
  password: 'gtacpr'
});

async function checkStudentsCourse27() {
  try {
    // Check course_students table for course request 27
    const courseStudents = await pool.query(`
      SELECT cs.id, cs.first_name, cs.last_name, cs.email, cs.attended, cs.attendance_marked
      FROM course_students cs
      WHERE cs.course_request_id = 27
      ORDER BY cs.id
    `);
    
    console.log('Students registered for Course Request 27:');
    if (courseStudents.rows.length > 0) {
      courseStudents.rows.forEach((row, index) => {
        console.log(`${index + 1}. ${row.first_name} ${row.last_name} (${row.email}) - Attended: ${row.attended}, Marked: ${row.attendance_marked}`);
      });
      console.log(`Total students: ${courseStudents.rows.length}`);
    } else {
      console.log('No students found for course request 27');
    }
    
    // Check class_students table for class 25 (the scheduled class)
    const classStudents = await pool.query(`
      SELECT cs.id, u.username, u.email, cs.attendance
      FROM class_students cs
      JOIN users u ON cs.student_id = u.id
      WHERE cs.class_id = 25
      ORDER BY cs.id
    `);
    
    console.log('\nStudents registered for Class 25:');
    if (classStudents.rows.length > 0) {
      classStudents.rows.forEach((row, index) => {
        console.log(`${index + 1}. ${row.username} (${row.email}) - Attendance: ${row.attendance}`);
      });
      console.log(`Total students: ${classStudents.rows.length}`);
    } else {
      console.log('No students found for class 25');
    }
    
    // Check all course_students for instructor 4827
    const allCourseStudents = await pool.query(`
      SELECT cs.id, cs.first_name, cs.last_name, cs.email, cs.attended, cs.course_request_id
      FROM course_students cs
      JOIN course_requests cr ON cs.course_request_id = cr.id
      WHERE cr.instructor_id = 4827
      ORDER BY cs.course_request_id, cs.id
    `);
    
    console.log('\nAll students for instructor 4827:');
    if (allCourseStudents.rows.length > 0) {
      allCourseStudents.rows.forEach((row, index) => {
        console.log(`${index + 1}. ${row.first_name} ${row.last_name} (${row.email}) - Course: ${row.course_request_id}, Attended: ${row.attended}`);
      });
      console.log(`Total students: ${allCourseStudents.rows.length}`);
    } else {
      console.log('No students found for instructor 4827');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkStudentsCourse27(); 