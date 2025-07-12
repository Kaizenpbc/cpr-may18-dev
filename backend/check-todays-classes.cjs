const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'gtacpr',
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: 'cpr_jun21',
});

async function checkTodaysClasses() {
  try {
    console.log('Checking classes for today...');
    
    // Get current date
    const currentDateResult = await pool.query('SELECT CURRENT_DATE as current_date');
    const currentDate = currentDateResult.rows[0].current_date;
    console.log(`Current date: ${currentDate}`);
    
    // Check all course_requests for today
    const todaysClasses = await pool.query(
      `SELECT 
        cr.id,
        cr.instructor_id,
        cr.status,
        cr.confirmed_date,
        cr.scheduled_date,
        cr.created_at,
        ct.name as course_type_name,
        o.name as organization_name
       FROM course_requests cr
       JOIN class_types ct ON cr.course_type_id = ct.id
       LEFT JOIN organizations o ON cr.organization_id = o.id
       WHERE DATE(cr.confirmed_date) = $1 OR DATE(cr.scheduled_date) = $1
       ORDER BY cr.confirmed_date, cr.scheduled_date`,
      [currentDate]
    );
    
    console.log(`\nAll classes for today (${todaysClasses.rows.length}):`);
    todaysClasses.rows.forEach((row, index) => {
      console.log(`${index + 1}. ID: ${row.id}, Status: ${row.status}, Instructor: ${row.instructor_id}, Confirmed: ${row.confirmed_date}, Scheduled: ${row.scheduled_date}, Course: ${row.course_type_name}, Org: ${row.organization_name}`);
    });
    
    // Check specifically for confirmed classes for instructor 32 (Mike)
    const mikesClasses = await pool.query(
      `SELECT 
        cr.id,
        cr.status,
        cr.confirmed_date,
        cr.scheduled_date,
        ct.name as course_type_name,
        o.name as organization_name
       FROM course_requests cr
       JOIN class_types ct ON cr.course_type_id = ct.id
       LEFT JOIN organizations o ON cr.organization_id = o.id
       WHERE cr.instructor_id = 32 AND (DATE(cr.confirmed_date) = $1 OR DATE(cr.scheduled_date) = $1)
       ORDER BY cr.confirmed_date, cr.scheduled_date`,
      [currentDate]
    );
    
    console.log(`\nMike's classes for today (${mikesClasses.rows.length}):`);
    mikesClasses.rows.forEach((row, index) => {
      console.log(`${index + 1}. ID: ${row.id}, Status: ${row.status}, Confirmed: ${row.confirmed_date}, Scheduled: ${row.scheduled_date}, Course: ${row.course_type_name}, Org: ${row.organization_name}`);
    });
    
    // Check what the API endpoint would return
    const apiQuery = await pool.query(
      `SELECT 
        cr.id,
        cr.id as course_id,
        cr.instructor_id,
        cr.confirmed_date as start_time,
        cr.confirmed_date as end_time,
        cr.status,
        cr.location,
        cr.registered_students as max_students,
        CASE WHEN cr.status = 'completed' THEN true ELSE false END as completed,
        cr.created_at,
        cr.updated_at,
        ct.name as course_name,
        ct.name as coursetypename,
        COALESCE(o.name, 'Unassigned') as organizationname,
        COALESCE(cr.location, '') as notes,
        (SELECT COUNT(*) FROM course_students cs WHERE cs.course_request_id = cr.id) as studentcount,
        (SELECT COUNT(*) FROM course_students cs WHERE cs.course_request_id = cr.id AND cs.attended = true) as studentsattendance
       FROM course_requests cr
       JOIN class_types ct ON cr.course_type_id = ct.id
       LEFT JOIN organizations o ON cr.organization_id = o.id
       WHERE cr.instructor_id = 32 AND cr.status = 'confirmed' AND DATE(cr.confirmed_date) = $1
       ORDER BY cr.confirmed_date ASC`,
      [currentDate]
    );
    
    console.log(`\nAPI endpoint query result for Mike (${apiQuery.rows.length}):`);
    apiQuery.rows.forEach((row, index) => {
      console.log(`${index + 1}. ID: ${row.id}, Status: ${row.status}, Confirmed: ${row.confirmed_date}, Course: ${row.course_name}, Org: ${row.organizationname}`);
    });
    
    await pool.end();
  } catch (error) {
    console.error('Error:', error);
    await pool.end();
  }
}

checkTodaysClasses(); 