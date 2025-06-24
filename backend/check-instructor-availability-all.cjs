const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'cpr_jun21',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
});

async function checkAllInstructorAvailability() {
  try {
    console.log('🔍 Checking all instructor availability records...');
    const result = await pool.query(`
      SELECT ia.instructor_id, u.username, ia.date, ia.status
      FROM instructor_availability ia
      LEFT JOIN users u ON ia.instructor_id = u.id
      ORDER BY ia.date DESC, ia.instructor_id
      LIMIT 20
    `);

    if (result.rows.length === 0) {
      console.log('No instructor availability records found in the database.');
    } else {
      console.log('Found the following availability records:');
      result.rows.forEach(row => {
        console.log(`
  Instructor ID: ${row.instructor_id}
  Name:          ${row.username}
  Date:          ${new Date(row.date).toLocaleDateString()}
  Status:        ${row.status}`);
      });
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkAllInstructorAvailability(); 