const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'gtacpr',
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: 'cpr_jun21',
});

async function addMikeFutureAvailability() {
  try {
    console.log('Adding future availability for Mike...');
    
    // Get current date
    const currentDateResult = await pool.query('SELECT CURRENT_DATE as current_date');
    const currentDate = currentDateResult.rows[0].current_date;
    console.log(`Current date: ${currentDate}`);
    
    // Add availability for the next 7 days
    const mikeId = 32; // Mike's user ID
    
    for (let i = 1; i <= 7; i++) {
      const futureDate = new Date(currentDate);
      futureDate.setDate(futureDate.getDate() + i);
      const dateStr = futureDate.toISOString().split('T')[0];
      
      // Check if availability already exists
      const existingCheck = await pool.query(
        'SELECT id FROM instructor_availability WHERE instructor_id = $1 AND date = $2',
        [mikeId, dateStr]
      );
      
      if (existingCheck.rows.length === 0) {
        // Add new availability
        await pool.query(
          'INSERT INTO instructor_availability (instructor_id, date, status) VALUES ($1, $2, $3)',
          [mikeId, dateStr, 'available']
        );
        console.log(`Added availability for ${dateStr}`);
      } else {
        console.log(`Availability already exists for ${dateStr}`);
      }
    }
    
    // Verify the new availability
    const newAvailability = await pool.query(
      'SELECT * FROM instructor_availability WHERE instructor_id = $1 AND date >= CURRENT_DATE ORDER BY date',
      [mikeId]
    );
    
    console.log(`\nMike's future availability (${newAvailability.rows.length}):`);
    newAvailability.rows.forEach((row, index) => {
      console.log(`${index + 1}. Date: ${row.date}, Status: ${row.status}`);
    });
    
    await pool.end();
  } catch (error) {
    console.error('Error:', error);
    await pool.end();
  }
}

addMikeFutureAvailability(); 