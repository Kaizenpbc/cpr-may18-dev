const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  password: 'gtacpr',
  host: '127.0.0.1',
  port: 5432,
  database: 'cpr_may18',
});

async function fixCourseId() {
  try {
    console.log('🔍 Checking current course request...');
    
    const currentResult = await pool.query('SELECT id, organization_id, course_type_id, status FROM course_requests ORDER BY id');
    console.log('Current course requests:');
    currentResult.rows.forEach(row => {
      console.log(`  - ID: ${row.id}, Org: ${row.organization_id}, Type: ${row.course_type_id}, Status: ${row.status}`);
    });
    
    // Check if ID 1 already exists
    const id1Exists = await pool.query('SELECT id FROM course_requests WHERE id = 1');
    
    if (id1Exists.rows.length > 0) {
      console.log('\n✅ Course request with ID 1 already exists');
    } else {
      console.log('\n🔧 Updating course request ID from 27 to 1...');
      
      // Update the ID from 27 to 1
      await pool.query('UPDATE course_requests SET id = 1 WHERE id = 27');
      
      console.log('✅ Course request ID updated successfully!');
    }
    
    // Verify the change
    const verifyResult = await pool.query('SELECT id, organization_id, course_type_id, status FROM course_requests ORDER BY id');
    console.log('\nUpdated course requests:');
    verifyResult.rows.forEach(row => {
      console.log(`  - ID: ${row.id}, Org: ${row.organization_id}, Type: ${row.course_type_id}, Status: ${row.status}`);
    });
    
  } catch (error) {
    console.error('❌ Error fixing course ID:', error);
  } finally {
    await pool.end();
  }
}

fixCourseId(); 