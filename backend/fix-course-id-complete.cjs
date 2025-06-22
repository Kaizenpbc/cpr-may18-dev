const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  password: 'gtacpr',
  host: '127.0.0.1',
  port: 5432,
  database: 'cpr_jun21',
});

async function fixCourseIdComplete() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Starting complete course ID fix...');
    
    await client.query('BEGIN');
    
    // Check current state
    const currentResult = await client.query('SELECT id, organization_id, course_type_id, status FROM course_requests ORDER BY id');
    console.log('Current course requests:');
    currentResult.rows.forEach(row => {
      console.log(`  - ID: ${row.id}, Org: ${row.organization_id}, Type: ${row.course_type_id}, Status: ${row.status}`);
    });
    
    // Check if there are any course_students records
    const studentsResult = await client.query('SELECT course_request_id, COUNT(*) as count FROM course_students GROUP BY course_request_id');
    console.log('\nCurrent course_students records:');
    studentsResult.rows.forEach(row => {
      console.log(`  - Course Request ID: ${row.course_request_id}, Students: ${row.count}`);
    });
    
    // Check if ID 1 already exists
    const id1Exists = await client.query('SELECT id FROM course_requests WHERE id = 1');
    
    if (id1Exists.rows.length > 0) {
      console.log('\n✅ Course request with ID 1 already exists');
    } else {
      console.log('\n🔧 Updating course request ID from 27 to 1...');
      
      // First, update the course_students foreign key references
      console.log('  - Updating course_students foreign key references...');
      await client.query('UPDATE course_students SET course_request_id = 1 WHERE course_request_id = 27');
      
      // Then update the course_requests ID
      console.log('  - Updating course_requests ID...');
      await client.query('UPDATE course_requests SET id = 1 WHERE id = 27');
      
      console.log('✅ Course request ID updated successfully!');
    }
    
    // Verify the changes
    const verifyResult = await client.query('SELECT id, organization_id, course_type_id, status FROM course_requests ORDER BY id');
    console.log('\nUpdated course requests:');
    verifyResult.rows.forEach(row => {
      console.log(`  - ID: ${row.id}, Org: ${row.organization_id}, Type: ${row.course_type_id}, Status: ${row.status}`);
    });
    
    const verifyStudentsResult = await client.query('SELECT course_request_id, COUNT(*) as count FROM course_students GROUP BY course_request_id');
    console.log('\nUpdated course_students records:');
    verifyStudentsResult.rows.forEach(row => {
      console.log(`  - Course Request ID: ${row.course_request_id}, Students: ${row.count}`);
    });
    
    await client.query('COMMIT');
    console.log('\n✅ All changes committed successfully!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error fixing course ID:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

fixCourseIdComplete(); 