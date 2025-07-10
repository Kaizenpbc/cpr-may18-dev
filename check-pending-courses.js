const { Pool } = require('pg');
require('dotenv').config();

async function checkPendingCourses() {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'cpr_jun21',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'gtacpr',
  });

  try {
    const client = await pool.connect();
    console.log('🔍 Checking for pending courses in the database...\n');

    // Try both possible tables: 'courses' and 'course_requests'
    let found = false;

    // Check 'courses' table
    try {
      const res = await client.query("SELECT * FROM courses WHERE status = 'pending' ORDER BY id DESC LIMIT 20");
      if (res.rows.length > 0) {
        found = true;
        console.log(`Found ${res.rows.length} pending course(s) in 'courses':`);
        res.rows.forEach(row => {
          console.log(`  - ID: ${row.id}, Name: ${row.name || row.title || '(no name)'}, Date: ${row.date || row.scheduled_date || '(no date)'}`);
        });
      }
    } catch (e) {
      console.log("(No 'courses' table or error querying it)");
    }

    // Check 'course_requests' table
    try {
      const res2 = await client.query("SELECT * FROM course_requests WHERE status = 'pending' ORDER BY id DESC LIMIT 20");
      if (res2.rows.length > 0) {
        found = true;
        console.log(`Found ${res2.rows.length} pending course request(s) in 'course_requests':`);
        res2.rows.forEach(row => {
          console.log(`  - ID: ${row.id}, Name: ${row.name || row.title || '(no name)'}, Date: ${row.date || row.scheduled_date || '(no date)'}`);
        });
      }
    } catch (e) {
      console.log("(No 'course_requests' table or error querying it)");
    }

    if (!found) {
      console.log('❌ No pending courses or course requests found.');
    }

    client.release();
  } catch (error) {
    console.error('❌ Error checking pending courses:', error.message);
  } finally {
    await pool.end();
  }
}

checkPendingCourses(); 