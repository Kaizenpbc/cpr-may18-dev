const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'cpr_jun21',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
});

const targetDate = '2025-06-22';

async function getAvailableInstructors() {
  try {
    console.log(`-`.repeat(50));
    console.log(`[Definitive Check]`);
    console.log(`Searching for instructors EXPLICITLY marked as 'available' for ${targetDate}.`);
    console.log(`This ignores any existing assignments or other statuses.`);
    console.log(`-`.repeat(50));

    const result = await pool.query(`
      SELECT
        u.id as instructor_id,
        u.username
      FROM users u
      INNER JOIN instructor_availability ia ON u.id = ia.instructor_id
      WHERE u.role = 'instructor'
        AND ia.status = 'available'
        AND ia.date = $1
    `, [targetDate]);

    if (result.rows.length === 0) {
      console.log('\nRESULT: No instructors found.');
      console.log('This confirms that no instructor has marked themselves as "available" for this date in the database.');
    } else {
      console.log('\nRESULT: Found the following available instructors:');
      result.rows.forEach(row => {
        console.log(`  - ID: ${row.instructor_id}, Username: ${row.username}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

getAvailableInstructors(); 