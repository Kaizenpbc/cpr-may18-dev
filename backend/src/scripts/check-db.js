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

async function checkDatabase() {
  try {
    console.log('Checking database structure and content...\n');

    // Check all tables
    const tables = await pool.query(
      `SELECT table_name 
       FROM information_schema.tables 
       WHERE table_schema = 'public'`
    );
    console.log('Available tables:', tables.rows.map(t => t.table_name));

    // Check instructor_availability table structure
    const columns = await pool.query(
      `SELECT column_name, data_type 
       FROM information_schema.columns 
       WHERE table_name = 'instructor_availability'`
    );
    console.log('\nInstructor Availability Table Structure:');
    console.log(JSON.stringify(columns.rows, null, 2));

    // Check instructor_availability content
    const availability = await pool.query(
      `SELECT * FROM instructor_availability ORDER BY date`
    );
    console.log('\nInstructor Availability Records:');
    console.log(JSON.stringify(availability.rows, null, 2));

    // Check users table for instructor
    const instructor = await pool.query(
      `SELECT * FROM users WHERE id = 2`
    );
    console.log('\nInstructor User Record:');
    console.log(JSON.stringify(instructor.rows, null, 2));

  } catch (error) {
    console.error('Error checking database:', error);
  } finally {
    await pool.end();
  }
}

checkDatabase(); 