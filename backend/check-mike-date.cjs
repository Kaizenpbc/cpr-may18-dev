const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'gtacpr',
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: 'cpr_jun21',
});

async function checkMikeDate() {
  try {
    console.log('Checking Mike\'s availability date...');
    
    // Get current date
    const currentDateResult = await pool.query('SELECT CURRENT_DATE as current_date');
    const currentDate = currentDateResult.rows[0].current_date;
    console.log(`Current date: ${currentDate}`);
    
    // Get Mike's availability
    const mikeAvailability = await pool.query(
      'SELECT * FROM instructor_availability WHERE instructor_id = 32'
    );
    
    console.log(`\nMike's availability entries (${mikeAvailability.rows.length}):`);
    mikeAvailability.rows.forEach((row, index) => {
      const availabilityDate = row.date;
      const isFuture = availabilityDate > currentDate;
      const isPast = availabilityDate < currentDate;
      const isToday = availabilityDate.toDateString() === currentDate.toDateString();
      
      console.log(`${index + 1}. Date: ${availabilityDate} (${availabilityDate.toDateString()})`);
      console.log(`   Status: ${row.status}`);
      console.log(`   Is future: ${isFuture}`);
      console.log(`   Is past: ${isPast}`);
      console.log(`   Is today: ${isToday}`);
      console.log(`   Days difference: ${Math.floor((availabilityDate - currentDate) / (1000 * 60 * 60 * 24))}`);
    });
    
    // Test the date comparison in the query
    const testQuery = await pool.query(
      'SELECT * FROM instructor_availability WHERE instructor_id = 32 AND date >= CURRENT_DATE'
    );
    
    console.log(`\nMike's availability >= CURRENT_DATE (${testQuery.rows.length}):`);
    testQuery.rows.forEach((row, index) => {
      console.log(`${index + 1}. Date: ${row.date}, Status: ${row.status}`);
    });
    
    await pool.end();
  } catch (error) {
    console.error('Error:', error);
    await pool.end();
  }
}

checkMikeDate(); 