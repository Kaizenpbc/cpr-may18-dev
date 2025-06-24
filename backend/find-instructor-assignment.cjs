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

async function findInstructorAssignment() {
  try {
    console.log(`🔍 Searching for existing assignments for any instructor on ${targetDate}...`);
    const result = await pool.query(`
      SELECT 
        cr.id as course_request_id,
        cr.status,
        cr.confirmed_date,
        u.username as instructor_name,
        o.name as organization_name
      FROM course_requests cr
      JOIN users u ON cr.instructor_id = u.id
      JOIN organizations o ON cr.organization_id = o.id
      WHERE cr.confirmed_date = $1 AND cr.status IN ('confirmed', 'completed')
    `, [targetDate]);

    if (result.rows.length === 0) {
      console.log(`\n✅ No instructors are currently assigned to any confirmed courses on ${targetDate}.`);
    } else {
      console.log(`\n🚨 Found the following assignment(s) for ${targetDate}:`);
      result.rows.forEach(row => {
        console.log(`
  Instructor:        ${row.instructor_name}
  Is Assigned To:    Course for "${row.organization_name}"
  Course Status:     ${row.status}
  Confirmed Date:    ${new Date(row.confirmed_date).toLocaleDateString()}
  Course Request ID: ${row.course_request_id}
        `);
      });
      console.log("\nThis is why the instructor appears 'scheduled' in the UI and is unavailable for a new assignment on this date.");
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

findInstructorAssignment(); 