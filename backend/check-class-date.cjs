const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'gtacpr',
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: 'cpr_jun21',
});

async function checkClassDate() {
  try {
    console.log('Checking class date details...');
    
    // Get current date
    const currentDateResult = await pool.query('SELECT CURRENT_DATE as current_date');
    const currentDate = currentDateResult.rows[0].current_date;
    console.log(`Current date: ${currentDate}`);
    
    // Check the specific class
    const classDetails = await pool.query(
      `SELECT 
        cr.id,
        cr.instructor_id,
        cr.status,
        cr.confirmed_date,
        cr.scheduled_date,
        cr.confirmed_date::date as confirmed_date_only,
        cr.scheduled_date::date as scheduled_date_only,
        CURRENT_DATE as today_date
       FROM course_requests cr
       WHERE cr.id = 25`,
      []
    );
    
    if (classDetails.rows.length > 0) {
      const row = classDetails.rows[0];
      console.log(`\nClass ID 25 details:`);
      console.log(`ID: ${row.id}`);
      console.log(`Instructor ID: ${row.instructor_id}`);
      console.log(`Status: ${row.status}`);
      console.log(`Confirmed Date: ${row.confirmed_date}`);
      console.log(`Scheduled Date: ${row.scheduled_date}`);
      console.log(`Confirmed Date Only: ${row.confirmed_date_only}`);
      console.log(`Scheduled Date Only: ${row.scheduled_date_only}`);
      console.log(`Today Date: ${row.today_date}`);
      
      // Test the exact query from the API
      const apiQuery = await pool.query(
        `SELECT cr.id, cr.status, cr.confirmed_date, cr.confirmed_date::date as confirmed_date_only
         FROM course_requests cr
         WHERE cr.instructor_id = 32 AND cr.status = 'confirmed' AND cr.confirmed_date::date = $1::date`,
        [currentDate]
      );
      
      console.log(`\nAPI query result for today (${apiQuery.rows.length}):`);
      apiQuery.rows.forEach((row, index) => {
        console.log(`${index + 1}. ID: ${row.id}, Status: ${row.status}, Confirmed: ${row.confirmed_date}, Confirmed Only: ${row.confirmed_date_only}`);
      });
      
      // Test with the actual class date
      const classDate = row.confirmed_date_only;
      const apiQueryWithClassDate = await pool.query(
        `SELECT cr.id, cr.status, cr.confirmed_date, cr.confirmed_date::date as confirmed_date_only
         FROM course_requests cr
         WHERE cr.instructor_id = 32 AND cr.status = 'confirmed' AND cr.confirmed_date::date = $1::date`,
        [classDate]
      );
      
      console.log(`\nAPI query result for class date ${classDate} (${apiQueryWithClassDate.rows.length}):`);
      apiQueryWithClassDate.rows.forEach((row, index) => {
        console.log(`${index + 1}. ID: ${row.id}, Status: ${row.status}, Confirmed: ${row.confirmed_date}, Confirmed Only: ${row.confirmed_date_only}`);
      });
    }
    
    await pool.end();
  } catch (error) {
    console.error('Error:', error);
    await pool.end();
  }
}

checkClassDate(); 