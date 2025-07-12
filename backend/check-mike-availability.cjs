const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'gtacpr',
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: 'cpr_jun21',
});

async function checkMikeAvailability() {
  try {
    console.log('Checking Mike\'s availability data...');
    
    // First, get Mike's user ID
    const mikeUser = await pool.query(
      'SELECT id, username, email, role, organization_id FROM users WHERE username = $1',
      ['mike']
    );
    
    if (mikeUser.rows.length === 0) {
      console.log('Mike not found in users table');
      return;
    }
    
    const mikeId = mikeUser.rows[0].id;
    console.log(`Mike's user ID: ${mikeId}`);
    
    // Check instructor_availability table
    const availabilityResult = await pool.query(
      'SELECT * FROM instructor_availability WHERE instructor_id = $1 ORDER BY created_at DESC',
      [mikeId]
    );
    
    console.log(`\nMike's availability entries (${availabilityResult.rows.length}):`);
    availabilityResult.rows.forEach((entry, index) => {
      console.log(`${index + 1}. ID: ${entry.id}, Date: ${entry.availability_date}, Start: ${entry.start_time}, End: ${entry.end_time}, Status: ${entry.status}`);
    });
    
    // Check if there are any availability entries at all
    const allAvailability = await pool.query(
      'SELECT ia.*, u.username FROM instructor_availability ia JOIN users u ON ia.instructor_id = u.id ORDER BY ia.created_at DESC LIMIT 10'
    );
    
    console.log(`\nAll availability entries (${allAvailability.rows.length}):`);
    allAvailability.rows.forEach((entry, index) => {
      console.log(`${index + 1}. Instructor: ${entry.username}, Date: ${entry.availability_date}, Start: ${entry.start_time}, End: ${entry.end_time}, Status: ${entry.status}`);
    });
    
    // Check the structure of instructor_availability table
    const tableStructure = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'instructor_availability'
      ORDER BY ordinal_position
    `);
    
    console.log('\nInstructor availability table structure:');
    tableStructure.rows.forEach(col => {
      console.log(`- ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });
    
    await pool.end();
  } catch (error) {
    console.error('Error:', error);
    await pool.end();
  }
}

checkMikeAvailability(); 