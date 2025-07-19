const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function testStudentCountView() {
  try {
    console.log('🔍 Testing the new student count view...\n');
    
    // Test the view
    const viewResult = await pool.query(`
      SELECT * FROM course_student_counts 
      ORDER BY course_request_id
    `);
    
    console.log('✅ Student count view results:');
    console.log(JSON.stringify(viewResult.rows, null, 2));
    
    // Compare with original data
    console.log('\n🔍 Comparing with original course_requests data:');
    const originalResult = await pool.query(`
      SELECT 
        cr.id,
        cr.registered_students,
        (SELECT COUNT(*) FROM course_students cs WHERE cs.course_request_id = cr.id) as actual_count
      FROM course_requests cr
      ORDER BY cr.id
    `);
    
    console.log('Original data:', JSON.stringify(originalResult.rows, null, 2));
    
    // Test the logic
    console.log('\n🔍 Testing the display logic:');
    for (const row of viewResult.rows) {
      console.log(`Course ${row.course_request_id}:`);
      console.log(`  - Registered: ${row.registered_students}`);
      console.log(`  - Actual: ${row.actual_student_count}`);
      console.log(`  - Display: ${row.display_student_count}`);
      console.log(`  - Attended: ${row.display_attended_count}`);
      console.log('');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

testStudentCountView(); 