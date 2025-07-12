const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'gtacpr',
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: 'cpr_jun21',
});

async function checkClassDetails() {
  try {
    console.log('Checking course_requests table structure...');
    
    // Get current date
    const currentDateResult = await pool.query('SELECT CURRENT_DATE as current_date');
    const currentDate = currentDateResult.rows[0].current_date;
    console.log(`Current date: ${currentDate}`);
    
    // Check the specific class that should be showing up
    const classDetails = await pool.query(
      `SELECT 
        cr.id,
        cr.instructor_id,
        cr.status,
        cr.confirmed_date,
        cr.scheduled_date,
        cr.created_at,
        cr.updated_at,
        cr.course_type_id,
        cr.organization_id,
        cr.location,
        ct.name as course_type_name,
        o.name as organization_name
       FROM course_requests cr
       JOIN class_types ct ON cr.course_type_id = ct.id
       LEFT JOIN organizations o ON cr.organization_id = o.id
       WHERE cr.id = 25`,
      []
    );
    
    console.log(`\nClass ID 25 details:`);
    if (classDetails.rows.length > 0) {
      const row = classDetails.rows[0];
      console.log(`ID: ${row.id}`);
      console.log(`Instructor ID: ${row.instructor_id}`);
      console.log(`Status: ${row.status}`);
      console.log(`Confirmed Date: ${row.confirmed_date} (type: ${typeof row.confirmed_date})`);
      console.log(`Scheduled Date: ${row.scheduled_date} (type: ${typeof row.scheduled_date})`);
      console.log(`Course Type: ${row.course_type_name}`);
      console.log(`Organization: ${row.organization_name}`);
      console.log(`Location: ${row.location}`);
      
      // Check if the date matches today
      const confirmedDateStr = row.confirmed_date ? new Date(row.confirmed_date).toISOString().split('T')[0] : null;
      const scheduledDateStr = row.scheduled_date ? new Date(row.scheduled_date).toISOString().split('T')[0] : null;
      
      console.log(`\nDate comparison:`);
      console.log(`Current date: ${currentDate}`);
      console.log(`Confirmed date string: ${confirmedDateStr}`);
      console.log(`Scheduled date string: ${scheduledDateStr}`);
      console.log(`Confirmed matches today: ${confirmedDateStr === currentDate}`);
      console.log(`Scheduled matches today: ${scheduledDateStr === currentDate}`);
    }
    
    // Check table structure
    const tableStructure = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'course_requests'
      ORDER BY ordinal_position
    `);
    
    console.log(`\nCourse_requests table structure:`);
    tableStructure.rows.forEach(col => {
      console.log(`- ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });
    
    await pool.end();
  } catch (error) {
    console.error('Error:', error);
    await pool.end();
  }
}

checkClassDetails(); 