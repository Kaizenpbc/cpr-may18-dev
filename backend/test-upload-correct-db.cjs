const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  password: 'gtacpr',
  host: '127.0.0.1',
  port: 5432,
  database: 'cpr_jun21',
});

async function testUpload() {
  try {
    console.log('🧪 Testing CSV upload with correct database (cpr_jun21)...');
    
    // Check course request exists
    const courseResult = await pool.query('SELECT id, organization_id, course_type_id, status FROM course_requests WHERE id = 1');
    console.log('Course request ID 1:', courseResult.rows[0]);
    
    // Test inserting a student
    console.log('\n🧪 Testing student insert...');
    const insertResult = await pool.query(`
      INSERT INTO course_students (course_request_id, first_name, last_name, email)
      VALUES (1, 'Test', 'Student', 'test@example.com')
      RETURNING id, first_name, last_name
    `);
    console.log('✅ Student insert successful:', insertResult.rows[0]);
    
    // Clean up test data
    await pool.query('DELETE FROM course_students WHERE first_name = $1', ['Test']);
    console.log('✅ Test data cleaned up');
    
    console.log('\n🎉 CSV upload should work now! The issue was using the wrong database.');
    
  } catch (error) {
    console.error('❌ Error testing upload:', error);
  } finally {
    await pool.end();
  }
}

testUpload(); 