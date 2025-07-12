const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'gtacpr',
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: 'cpr_jun21',
});

async function checkAvailabilityDetails() {
  try {
    console.log('Checking availability data details...');
    
    // Check all availability entries with raw data
    const allAvailability = await pool.query(
      'SELECT * FROM instructor_availability ORDER BY created_at DESC'
    );
    
    console.log(`\nAll availability entries (${allAvailability.rows.length}):`);
    allAvailability.rows.forEach((entry, index) => {
      console.log(`${index + 1}. ID: ${entry.id}, Instructor ID: ${entry.instructor_id}, Date: ${entry.date}, Status: ${entry.status}, Created: ${entry.created_at}`);
    });
    
    // Check Mike's specific entries
    const mikeAvailability = await pool.query(
      'SELECT * FROM instructor_availability WHERE instructor_id = 32 ORDER BY created_at DESC'
    );
    
    console.log(`\nMike's availability entries (${mikeAvailability.rows.length}):`);
    mikeAvailability.rows.forEach((entry, index) => {
      console.log(`${index + 1}. ID: ${entry.id}, Date: ${entry.date}, Status: ${entry.status}, Created: ${entry.created_at}`);
    });
    
    // Check if there are any availability entries with actual dates
    const entriesWithDates = await pool.query(
      'SELECT * FROM instructor_availability WHERE date IS NOT NULL ORDER BY date DESC'
    );
    
    console.log(`\nEntries with actual dates (${entriesWithDates.rows.length}):`);
    entriesWithDates.rows.forEach((entry, index) => {
      console.log(`${index + 1}. ID: ${entry.id}, Instructor ID: ${entry.instructor_id}, Date: ${entry.date}, Status: ${entry.status}`);
    });
    
    await pool.end();
  } catch (error) {
    console.error('Error:', error);
    await pool.end();
  }
}

checkAvailabilityDetails(); 