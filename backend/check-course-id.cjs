const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  password: 'gtacpr',
  host: '127.0.0.1',
  port: 5432,
  database: 'cpr_may18',
});

async function checkCourseId() {
  try {
    const result = await pool.query('SELECT id, organization_id, course_type_id, status FROM course_requests ORDER BY id');
    console.log('Course requests:');
    result.rows.forEach(row => {
      console.log(`  - ID: ${row.id}, Org: ${row.organization_id}, Type: ${row.course_type_id}, Status: ${row.status}`);
    });
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkCourseId(); 