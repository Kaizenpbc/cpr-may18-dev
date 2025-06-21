import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const poolConfig = {
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'gtacpr',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'cpr_may18',
};

const pool = new Pool(poolConfig);

async function addTestAvailability() {
  try {
    const instructorId = 4815; // The instructor ID from the logs
    
    console.log(`Adding test availability for instructor ID: ${instructorId}`);
    
    // Add test availability for the next 7 days
    for (let i = 1; i <= 7; i++) {
      const result = await pool.query(
        `INSERT INTO instructor_availability (instructor_id, date, status) 
         VALUES ($1, CURRENT_DATE + INTERVAL '${i} days', 'available') 
         ON CONFLICT (instructor_id, date) DO NOTHING
         RETURNING *`,
        [instructorId]
      );
      
      if (result.rows.length > 0) {
        console.log(`Added availability for day ${i}:`, result.rows[0]);
      } else {
        console.log(`Availability for day ${i} already exists`);
      }
    }

    // Verify the records were added
    const verify = await pool.query(
      `SELECT * FROM instructor_availability 
       WHERE instructor_id = $1 
       ORDER BY date`,
      [instructorId]
    );
    
    console.log('\nCurrent availability records:');
    console.log(JSON.stringify(verify.rows, null, 2));
    
  } catch (error) {
    console.error('Error adding availability:', error);
  } finally {
    await pool.end();
  }
}

addTestAvailability(); 