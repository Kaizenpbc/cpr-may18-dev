const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Load environment variables
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      process.env[key.trim()] = value.trim();
    }
  });
}

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'cpr_dev',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function checkRemainingRecords() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Checking remaining records...\n');
    
    // Check course_requests
    console.log('📋 Course Requests:');
    const coursesResult = await client.query(`
      SELECT id, instructor_id, status, course_date, course_type_name, location, registered_students
      FROM course_requests 
      ORDER BY course_date DESC
    `);
    
    if (coursesResult.rows.length === 0) {
      console.log('   No course requests found');
    } else {
      coursesResult.rows.forEach(course => {
        console.log(`   ID: ${course.id}, Instructor: ${course.instructor_id}, Status: ${course.status}, Date: ${course.course_date}, Type: ${course.course_type_name}, Location: ${course.location}, Students: ${course.registered_students}`);
      });
    }
    
    // Check course_students
    console.log('\n📋 Course Students:');
    const studentsResult = await client.query(`
      SELECT cs.id, cs.course_request_id, cs.first_name, cs.last_name, cr.course_date, cr.course_type_name
      FROM course_students cs
      JOIN course_requests cr ON cs.course_request_id = cr.id
      ORDER BY cr.course_date DESC
    `);
    
    if (studentsResult.rows.length === 0) {
      console.log('   No course students found');
    } else {
      studentsResult.rows.forEach(student => {
        console.log(`   ID: ${student.id}, Course: ${student.course_request_id}, Name: ${student.first_name} ${student.last_name}, Date: ${student.course_date}, Type: ${student.course_type_name}`);
      });
    }
    
    // Check instructor_availability
    console.log('\n📋 Instructor Availability:');
    const availabilityResult = await client.query(`
      SELECT id, instructor_id, available_date, start_time, end_time, status
      FROM instructor_availability 
      ORDER BY available_date DESC
    `);
    
    if (availabilityResult.rows.length === 0) {
      console.log('   No availability records found');
    } else {
      availabilityResult.rows.forEach(avail => {
        console.log(`   ID: ${avail.id}, Instructor: ${avail.instructor_id}, Date: ${avail.available_date}, Time: ${avail.start_time}-${avail.end_time}, Status: ${avail.status}`);
      });
    }
    
    // Check timesheets
    console.log('\n📋 Timesheets:');
    const timesheetsResult = await client.query(`
      SELECT id, instructor_id, course_request_id, date, hours_worked, status
      FROM timesheets 
      ORDER BY date DESC
    `);
    
    if (timesheetsResult.rows.length === 0) {
      console.log('   No timesheet records found');
    } else {
      timesheetsResult.rows.forEach(timesheet => {
        console.log(`   ID: ${timesheet.id}, Instructor: ${timesheet.instructor_id}, Course: ${timesheet.course_request_id}, Date: ${timesheet.date}, Hours: ${timesheet.hours_worked}, Status: ${timesheet.status}`);
      });
    }
    
    // Check for any records with July 19 specifically
    console.log('\n📋 Records for July 19, 2025:');
    const july19Courses = await client.query(`
      SELECT id, instructor_id, status, course_date, course_type_name, location
      FROM course_requests 
      WHERE course_date = '2025-07-19'
    `);
    
    if (july19Courses.rows.length === 0) {
      console.log('   No courses found for July 19, 2025');
    } else {
      console.log('   Courses for July 19, 2025:');
      july19Courses.rows.forEach(course => {
        console.log(`     ID: ${course.id}, Instructor: ${course.instructor_id}, Status: ${course.status}, Type: ${course.course_type_name}, Location: ${course.location}`);
      });
    }
    
    const july19Availability = await client.query(`
      SELECT id, instructor_id, available_date, start_time, end_time
      FROM instructor_availability 
      WHERE available_date = '2025-07-19'
    `);
    
    if (july19Availability.rows.length === 0) {
      console.log('   No availability records found for July 19, 2025');
    } else {
      console.log('   Availability for July 19, 2025:');
      july19Availability.rows.forEach(avail => {
        console.log(`     ID: ${avail.id}, Instructor: ${avail.instructor_id}, Time: ${avail.start_time}-${avail.end_time}`);
      });
    }
    
    const july19Timesheets = await client.query(`
      SELECT id, instructor_id, course_request_id, date, hours_worked
      FROM timesheets 
      WHERE date = '2025-07-19'
    `);
    
    if (july19Timesheets.rows.length === 0) {
      console.log('   No timesheet records found for July 19, 2025');
    } else {
      console.log('   Timesheets for July 19, 2025:');
      july19Timesheets.rows.forEach(timesheet => {
        console.log(`     ID: ${timesheet.id}, Instructor: ${timesheet.instructor_id}, Course: ${timesheet.course_request_id}, Hours: ${timesheet.hours_worked}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error checking records:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

checkRemainingRecords(); 