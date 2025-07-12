const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'gtacpr',
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: 'cpr_jun21',
});

async function checkTimezone() {
  try {
    console.log('Checking database timezone and current date...');
    
    // Check database timezone
    const timezoneResult = await pool.query('SHOW timezone');
    console.log(`Database timezone: ${timezoneResult.rows[0].TimeZone}`);
    
    // Check current date in database
    const currentDateResult = await pool.query('SELECT CURRENT_DATE as current_date, CURRENT_TIMESTAMP as current_timestamp');
    console.log(`Database CURRENT_DATE: ${currentDateResult.rows[0].current_date}`);
    console.log(`Database CURRENT_TIMESTAMP: ${currentDateResult.rows[0].current_timestamp}`);
    
    // Check what JavaScript thinks the current date is
    const now = new Date();
    console.log(`JavaScript current date: ${now.toDateString()}`);
    console.log(`JavaScript current time: ${now.toTimeString()}`);
    console.log(`JavaScript timezone offset: ${now.getTimezoneOffset()} minutes`);
    
    // Check Mike's availability with the actual current date
    const mikeAvailability = await pool.query(
      'SELECT * FROM instructor_availability WHERE instructor_id = 32 ORDER BY date'
    );
    
    console.log(`\nMike's availability entries (${mikeAvailability.rows.length}):`);
    mikeAvailability.rows.forEach((row, index) => {
      console.log(`${index + 1}. Date: ${row.date} (${row.date.toDateString()})`);
    });
    
    await pool.end();
  } catch (error) {
    console.error('Error:', error);
    await pool.end();
  }
}

checkTimezone(); 