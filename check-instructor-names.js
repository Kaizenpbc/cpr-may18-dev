const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'cpr_jun21',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'gtacpr',
});

async function checkInstructorNames() {
  try {
    console.log('🔍 Checking instructor names in the system...\n');
    
    // 1. Check instructors table
    console.log('1. Checking instructors table...');
    const instructors = await pool.query(`
      SELECT * FROM instructors ORDER BY name
    `);
    
    if (instructors.rows.length > 0) {
      console.log('Instructors found:');
      instructors.rows.forEach(instructor => {
        console.log(`  - ID: ${instructor.id}, Name: ${instructor.name}, User ID: ${instructor.user_id}`);
      });
    } else {
      console.log('❌ No instructors found in instructors table');
    }
    
    // 2. Check course_requests table structure
    console.log('\n2. Checking course_requests table structure...');
    const courseRequestColumns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'course_requests' 
      ORDER BY column_name
    `);
    
    console.log('Course_requests columns:');
    courseRequestColumns.rows.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type})`);
    });
    
    // 3. Check if there's an instructor_id column and join with users
    console.log('\n3. Checking course_requests with instructor information...');
    const courseRequestsWithInstructors = await pool.query(`
      SELECT 
        cr.id,
        cr.course_type_name,
        cr.organization_name,
        cr.scheduled_date,
        u.username,
        u.email
      FROM course_requests cr
      LEFT JOIN users u ON cr.instructor_id = u.id
      WHERE cr.instructor_id IS NOT NULL
      ORDER BY cr.scheduled_date DESC
      LIMIT 10
    `);
    
    if (courseRequestsWithInstructors.rows.length > 0) {
      console.log('Recent course requests with instructors:');
      courseRequestsWithInstructors.rows.forEach(course => {
        console.log(`  - Course: ${course.course_type_name}, Instructor: ${course.username} (${course.email}), Date: ${course.scheduled_date}`);
      });
    }
    
    // 4. Check timesheets table structure
    console.log('\n4. Checking timesheets table structure...');
    const timesheetColumns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'timesheets' 
      ORDER BY column_name
    `);
    
    console.log('Timesheets columns:');
    timesheetColumns.rows.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type})`);
    });
    
    // 5. Check timesheets with instructor information
    console.log('\n5. Checking timesheets with instructor information...');
    const timesheetsWithInstructors = await pool.query(`
      SELECT 
        t.id,
        t.week_start_date,
        t.total_hours,
        u.username,
        u.email
      FROM timesheets t
      LEFT JOIN users u ON t.instructor_id = u.id
      ORDER BY t.week_start_date DESC
      LIMIT 10
    `);
    
    if (timesheetsWithInstructors.rows.length > 0) {
      console.log('Recent timesheets with instructors:');
      timesheetsWithInstructors.rows.forEach(timesheet => {
        console.log(`  - Week: ${timesheet.week_start_date}, Instructor: ${timesheet.username} (${timesheet.email}), Hours: ${timesheet.total_hours}`);
      });
    }
    
    // 6. Check payment_requests table structure
    console.log('\n6. Checking payment_requests table structure...');
    const paymentRequestColumns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'payment_requests' 
      ORDER BY column_name
    `);
    
    console.log('Payment_requests columns:');
    paymentRequestColumns.rows.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type})`);
    });
    
    // 7. Check payment_requests with instructor information
    console.log('\n7. Checking payment_requests with instructor information...');
    const paymentRequestsWithInstructors = await pool.query(`
      SELECT 
        pr.id,
        pr.amount,
        pr.status,
        pr.created_at,
        u.username,
        u.email
      FROM payment_requests pr
      LEFT JOIN users u ON pr.instructor_id = u.id
      ORDER BY pr.created_at DESC
      LIMIT 10
    `);
    
    if (paymentRequestsWithInstructors.rows.length > 0) {
      console.log('Recent payment requests with instructors:');
      paymentRequestsWithInstructors.rows.forEach(payment => {
        console.log(`  - Amount: $${payment.amount}, Instructor: ${payment.username} (${payment.email}), Status: ${payment.status}, Date: ${payment.created_at}`);
      });
    }
    
    // 8. Check if Mike has any records in these tables
    console.log('\n8. Checking if Mike has records in these tables...');
    
    // Check course_requests
    const mikeCourses = await pool.query(`
      SELECT COUNT(*) as count FROM course_requests WHERE instructor_id = 32
    `);
    console.log(`Mike's course requests: ${mikeCourses.rows[0].count}`);
    
    // Check timesheets
    const mikeTimesheets = await pool.query(`
      SELECT COUNT(*) as count FROM timesheets WHERE instructor_id = 32
    `);
    console.log(`Mike's timesheets: ${mikeTimesheets.rows[0].count}`);
    
    // Check payment_requests
    const mikePayments = await pool.query(`
      SELECT COUNT(*) as count FROM payment_requests WHERE instructor_id = 32
    `);
    console.log(`Mike's payment requests: ${mikePayments.rows[0].count}`);
    
  } catch (error) {
    console.error('❌ Error checking instructor names:', error);
  } finally {
    await pool.end();
  }
}

checkInstructorNames(); 