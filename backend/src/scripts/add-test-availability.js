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

async function addTestAvailability() {
  try {
    // First, check if table exists
    const tableCheck = await pool.query(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'instructor_availability'
      )`
    );
    
    if (!tableCheck.rows[0].exists) {
      console.log('Creating instructor_availability table...');
      await pool.query(`
        CREATE TABLE instructor_availability (
          id SERIAL PRIMARY KEY,
          instructor_id INTEGER NOT NULL,
          date DATE NOT NULL,
          status VARCHAR(20) DEFAULT 'available',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
    }

    // Get the instructor ID from the command line argument
    const instructorId = process.argv[2];
    if (!instructorId) {
      console.error('Please provide an instructor ID as a command line argument');
      process.exit(1);
    }

    // Add test availability for the next 7 days
    for (let i = 1; i <= 7; i++) {
      const result = await pool.query(
        `INSERT INTO instructor_availability (instructor_id, date, status) 
         VALUES ($1, CURRENT_DATE + INTERVAL '${i} days', 'available') 
         RETURNING *`,
        [instructorId]
      );
      console.log(`Added availability for day ${i}:`, result.rows[0]);
    }

    // Verify the records were added
    const verify = await pool.query(
      `SELECT * FROM instructor_availability 
       WHERE instructor_id = $1 
       ORDER BY date`,
      [instructorId]
    );
    console.log('\nAll availability records for instructor', instructorId);
    console.log(JSON.stringify(verify.rows, null, 2));

  } catch (error) {
    console.error('Error adding test availability:', error);
  } finally {
    await pool.end();
  }
}

addTestAvailability(); 