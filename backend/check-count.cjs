const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  password: 'gtacpr',
  host: '127.0.0.1',
  port: 5432,
  database: 'cpr_may18',
});

async function checkCount() {
  try {
    const result = await pool.query('SELECT COUNT(*) as count FROM course_requests');
    console.log('Course requests count:', result.rows[0].count);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkCount(); 