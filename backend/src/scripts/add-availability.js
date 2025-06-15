require('dotenv').config();
const { Pool } = require('pg');

const poolConfig = {
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'gtacpr',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'cpr_may18',
};

const pool = new Pool(poolConfig);

async function addAvailability() {
  try {
    // Add availability for the next 7 days
    for (let i = 1; i <= 7; i++) {
      const result = await pool.query(
        `INSERT INTO instructor_availability (instructor_id, date, status) 
         VALUES (2, CURRENT_DATE + INTERVAL '${i} days', 'available') 
         RETURNING *`
      );
      console.log(`Added availability for day ${i}:`, result.rows[0]);
    }
  } catch (error) {
    console.error('Error adding availability:', error);
  } finally {
    await pool.end();
  }
}

addAvailability(); 