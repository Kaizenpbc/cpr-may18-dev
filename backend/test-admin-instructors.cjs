const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'gtacpr',
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: 'cpr_jun21',
});

async function testAdminInstructors() {
  try {
    console.log('Testing Admin portal instructors endpoint...');
    
    // Simulate the Admin portal query
    const result = await pool.query(
      `SELECT 
        u.id,
        u.username,
        u.email,
        u.role,
        ia.date,
        ia.status as availability_status,
        CASE 
          WHEN ia.date IS NOT NULL THEN 'Available'
          ELSE 'No availability'
        END as assignment_status,
        COALESCE(o.name, '') as assigned_organization,
        COALESCE(cr.location, '') as assigned_location,
        COALESCE(ct.name, '') as assigned_course_type
       FROM users u
       LEFT JOIN instructor_availability ia ON u.id = ia.instructor_id 
         AND ia.date >= CURRENT_DATE
       LEFT JOIN course_requests cr ON u.id = cr.instructor_id 
         AND cr.confirmed_date::date = ia.date::date
         AND cr.status IN ('confirmed', 'completed')
       LEFT JOIN organizations o ON cr.organization_id = o.id
       LEFT JOIN class_types ct ON cr.course_type_id = ct.id
       WHERE u.role = 'instructor' 
       ORDER BY u.username, ia.date`
    );
    
    console.log(`\nAdmin portal instructors query results (${result.rows.length}):`);
    result.rows.forEach((row, index) => {
      console.log(`${index + 1}. Username: ${row.username}, Date: ${row.date}, Status: ${row.availability_status}, Assignment: ${row.assignment_status}`);
    });
    
    // Check what CURRENT_DATE returns
    const currentDateResult = await pool.query('SELECT CURRENT_DATE as current_date');
    console.log(`\nCurrent date: ${currentDateResult.rows[0].current_date}`);
    
    // Check Mike's availability specifically
    const mikeAvailability = await pool.query(
      'SELECT * FROM instructor_availability WHERE instructor_id = 32 AND date >= CURRENT_DATE'
    );
    
    console.log(`\nMike's availability from current date (${mikeAvailability.rows.length}):`);
    mikeAvailability.rows.forEach((row, index) => {
      console.log(`${index + 1}. Date: ${row.date}, Status: ${row.status}`);
    });
    
    await pool.end();
  } catch (error) {
    console.error('Error:', error);
    await pool.end();
  }
}

testAdminInstructors(); 