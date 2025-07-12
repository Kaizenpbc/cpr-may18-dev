const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function checkCourse26() {
  try {
    console.log('🔍 Checking course details for course ID 26...\n');

    // Check course_requests table
    const courseResult = await pool.query(`
      SELECT 
        cr.id,
        cr.scheduled_date,
        cr.confirmed_date,
        cr.status,
        cr.instructor_id,
        cr.location,
        cr.registered_students,
        ct.name as course_type_name,
        o.name as organization_name,
        u.username as instructor_name
      FROM course_requests cr
      LEFT JOIN class_types ct ON cr.course_type_id = ct.id
      LEFT JOIN organizations o ON cr.organization_id = o.id
      LEFT JOIN users u ON cr.instructor_id = u.id
      WHERE cr.id = 26
    `);

    if (courseResult.rows.length === 0) {
      console.log('❌ Course 26 not found in course_requests');
    } else {
      const course = courseResult.rows[0];
      console.log('✅ Course 26 found:');
      console.log('   ID:', course.id);
      console.log('   Scheduled Date:', course.scheduled_date);
      console.log('   Confirmed Date:', course.confirmed_date);
      console.log('   Status:', course.status);
      console.log('   Instructor ID:', course.instructor_id);
      console.log('   Instructor Name:', course.instructor_name);
      console.log('   Location:', course.location);
      console.log('   Course Type:', course.course_type_name);
      console.log('   Organization:', course.organization_name);
      console.log('   Registered Students:', course.registered_students);
    }

    // Check current date
    const currentDateResult = await pool.query('SELECT CURRENT_DATE as current_date');
    const currentDate = currentDateResult.rows[0].current_date;
    console.log('\n📅 Current Date:', currentDate);

    // Check if course is for today
    if (courseResult.rows.length > 0) {
      const course = courseResult.rows[0];
      const courseDate = course.confirmed_date;
      const isToday = courseDate && courseDate.toISOString().split('T')[0] === currentDate.toISOString().split('T')[0];
      console.log('📅 Course Date:', courseDate);
      console.log('🎯 Is for today?', isToday);
    }

    // Check classes table
    const classesResult = await pool.query(`
      SELECT * FROM classes WHERE instructor_id = 32 AND date = CURRENT_DATE
    `);
    console.log('\n📚 Classes for instructor 32 today:', classesResult.rows.length);
    classesResult.rows.forEach((cls, index) => {
      console.log(`   Class ${index + 1}:`, cls);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

checkCourse26(); 