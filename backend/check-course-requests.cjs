const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  password: 'gtacpr',
  host: '127.0.0.1',
  port: 5432,
  database: 'cpr_may18',
});

async function checkCourseRequests() {
  try {
    console.log('🔍 Checking course_requests table...');
    
    const result = await pool.query(`
      SELECT id, organization_id, course_type_id, date_requested, scheduled_date, status
      FROM course_requests 
      ORDER BY id
    `);
    
    console.log('\nExisting course_requests:');
    if (result.rows.length === 0) {
      console.log('  No course requests found');
    } else {
      result.rows.forEach(row => {
        console.log(`  - ID: ${row.id}, Org: ${row.organization_id}, Type: ${row.course_type_id}, Status: ${row.status}`);
      });
    }
    
    // Check if there are any course_students records
    const studentsResult = await pool.query(`
      SELECT course_request_id, COUNT(*) as student_count
      FROM course_students 
      GROUP BY course_request_id
      ORDER BY course_request_id
    `);
    
    console.log('\nExisting course_students records:');
    if (studentsResult.rows.length === 0) {
      console.log('  No student records found');
    } else {
      studentsResult.rows.forEach(row => {
        console.log(`  - Course Request ID: ${row.course_request_id}, Students: ${row.student_count}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error checking course_requests:', error);
  } finally {
    await pool.end();
  }
}

checkCourseRequests(); 