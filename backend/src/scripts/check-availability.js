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

async function checkAvailability() {
  try {
    console.log('Checking instructor availability records...');
    
    // Check instructor_availability table
    const result = await pool.query(
      `SELECT id, instructor_id, date, status, created_at, updated_at 
       FROM instructor_availability 
       WHERE instructor_id = 2 
       ORDER BY date`
    );
    
    console.log('\nInstructor Availability Records:');
    console.log(JSON.stringify(result.rows, null, 2));
    
    // Check if table exists
    const tableCheck = await pool.query(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'instructor_availability'
      )`
    );
    
    console.log('\nTable exists:', tableCheck.rows[0].exists);
    
    // Check table structure
    const columns = await pool.query(
      `SELECT column_name, data_type 
       FROM information_schema.columns 
       WHERE table_name = 'instructor_availability'`
    );
    
    console.log('\nTable Structure:');
    console.log(JSON.stringify(columns.rows, null, 2));
    
  } catch (error) {
    console.error('Error checking availability:', error);
  } finally {
    await pool.end();
  }
}

checkAvailability(); 