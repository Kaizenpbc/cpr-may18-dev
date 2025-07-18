const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function testDB() {
  try {
    console.log('🔍 Testing database connection...\n');
    
    // Test basic connection
    const result = await pool.query('SELECT NOW() as current_time');
    console.log('✅ Database connected:', result.rows[0]);
    
    // Check if course_requests table exists and has data
    const courseRequestsResult = await pool.query('SELECT COUNT(*) as count FROM course_requests');
    console.log('✅ Course requests count:', courseRequestsResult.rows[0].count);
    
    // Check if course_students table exists and has data
    const courseStudentsResult = await pool.query('SELECT COUNT(*) as count FROM course_students');
    console.log('✅ Course students count:', courseStudentsResult.rows[0].count);
    
    // Show a few sample records
    const sampleCourses = await pool.query('SELECT id, instructor_id, status FROM course_requests LIMIT 3');
    console.log('✅ Sample courses:', sampleCourses.rows);
    
    const sampleStudents = await pool.query('SELECT course_request_id, first_name FROM course_students LIMIT 3');
    console.log('✅ Sample students:', sampleStudents.rows);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

testDB(); 