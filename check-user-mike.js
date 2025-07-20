const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'cpr_jun21',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'gtacpr',
});

async function checkUserMike() {
  try {
    console.log('🔍 Checking all information for user "mike"...\n');
    
    // 1. Get mike's user record
    console.log('1. Mike\'s user record:');
    const mikeUser = await pool.query(`
      SELECT * FROM users WHERE username = 'mike'
    `);
    
    if (mikeUser.rows.length > 0) {
      const mike = mikeUser.rows[0];
      console.log(`  - ID: ${mike.id}`);
      console.log(`  - Username: ${mike.username}`);
      console.log(`  - Email: ${mike.email}`);
      console.log(`  - Role: ${mike.role}`);
      console.log(`  - Organization ID: ${mike.organization_id || 'N/A'}`);
      console.log(`  - Phone: ${mike.phone || 'N/A'}`);
      console.log(`  - Created: ${mike.created_at}`);
      console.log(`  - Updated: ${mike.updated_at}`);
    } else {
      console.log('❌ User "mike" not found in users table');
    }
    
    // 2. Check if mike has an instructor record
    console.log('\n2. Mike\'s instructor record:');
    const mikeInstructor = await pool.query(`
      SELECT * FROM instructors WHERE user_id = (SELECT id FROM users WHERE username = 'mike')
    `);
    
    if (mikeInstructor.rows.length > 0) {
      const instructor = mikeInstructor.rows[0];
      console.log(`  - ID: ${instructor.id}`);
      console.log(`  - Name: ${instructor.name}`);
      console.log(`  - Phone: ${instructor.phone || 'N/A'}`);
      console.log(`  - Address: ${instructor.address || 'N/A'}`);
      console.log(`  - City: ${instructor.city || 'N/A'}`);
      console.log(`  - Province: ${instructor.province || 'N/A'}`);
    } else {
      console.log('❌ No instructor record found for mike');
    }
    
    // 3. Check mike's course assignments
    console.log('\n3. Mike\'s course assignments:');
    const mikeCourses = await pool.query(`
      SELECT 
        cr.id,
        cr.course_type_id,
        ct.name as course_type_name,
        cr.organization_id,
        o.name as organization_name,
        cr.location,
        cr.scheduled_date,
        cr.confirmed_date,
        cr.completed_at,
        cr.status,
        cr.instructor_id
      FROM course_requests cr
      JOIN class_types ct ON cr.course_type_id = ct.id
      JOIN organizations o ON cr.organization_id = o.id
      WHERE cr.instructor_id = (SELECT id FROM users WHERE username = 'mike')
      ORDER BY cr.scheduled_date DESC
    `);
    
    if (mikeCourses.rows.length > 0) {
      console.log(`Mike has ${mikeCourses.rows.length} course assignments:`);
      mikeCourses.rows.forEach(course => {
        console.log(`  - Course: ${course.course_type_name}`);
        console.log(`    Organization: ${course.organization_name}`);
        console.log(`    Location: ${course.location}`);
        console.log(`    Status: ${course.status}`);
        console.log(`    Scheduled: ${course.scheduled_date || 'N/A'}`);
        console.log(`    Confirmed: ${course.confirmed_date || 'N/A'}`);
        console.log(`    Completed: ${course.completed_at || 'N/A'}`);
        console.log('');
      });
    } else {
      console.log('❌ No course assignments found for mike');
    }
    
    // 4. Check mike's timesheets
    console.log('\n4. Mike\'s timesheets:');
    const mikeTimesheets = await pool.query(`
      SELECT 
        id,
        week_start_date,
        total_hours,
        status,
        created_at
      FROM timesheets 
      WHERE instructor_id = (SELECT id FROM users WHERE username = 'mike')
      ORDER BY week_start_date DESC
    `);
    
    if (mikeTimesheets.rows.length > 0) {
      console.log(`Mike has ${mikeTimesheets.rows.length} timesheets:`);
      mikeTimesheets.rows.forEach(timesheet => {
        console.log(`  - Week: ${timesheet.week_start_date}`);
        console.log(`    Hours: ${timesheet.total_hours}`);
        console.log(`    Status: ${timesheet.status}`);
        console.log(`    Created: ${timesheet.created_at}`);
        console.log('');
      });
    } else {
      console.log('❌ No timesheets found for mike');
    }
    
    // 5. Check mike's payment requests
    console.log('\n5. Mike\'s payment requests:');
    const mikePayments = await pool.query(`
      SELECT 
        id,
        amount,
        status,
        created_at
      FROM payment_requests 
      WHERE instructor_id = (SELECT id FROM users WHERE username = 'mike')
      ORDER BY created_at DESC
    `);
    
    if (mikePayments.rows.length > 0) {
      console.log(`Mike has ${mikePayments.rows.length} payment requests:`);
      mikePayments.rows.forEach(payment => {
        console.log(`  - Amount: $${payment.amount}`);
        console.log(`    Status: ${payment.status}`);
        console.log(`    Created: ${payment.created_at}`);
        console.log('');
      });
    } else {
      console.log('❌ No payment requests found for mike');
    }
    
    // 6. Check if mike appears as a student in any courses
    console.log('\n6. Mike as a student in courses:');
    const mikeAsStudent = await pool.query(`
      SELECT DISTINCT
        cr.id as course_id,
        ct.name as course_type_name,
        o.name as organization_name,
        cr.location,
        cr.scheduled_date,
        cs.first_name,
        cs.last_name,
        cs.email,
        cs.attended
      FROM course_students cs
      JOIN course_requests cr ON cs.course_request_id = cr.id
      JOIN class_types ct ON cr.course_type_id = ct.id
      JOIN organizations o ON cr.organization_id = o.id
      WHERE LOWER(cs.email) LIKE '%mike%'
      ORDER BY cr.scheduled_date DESC
    `);
    
    if (mikeAsStudent.rows.length > 0) {
      console.log(`Mike appears as a student in ${mikeAsStudent.rows.length} courses:`);
      mikeAsStudent.rows.forEach(student => {
        console.log(`  - Course: ${student.course_type_name}`);
        console.log(`    Organization: ${student.organization_name}`);
        console.log(`    Name: ${student.first_name} ${student.last_name}`);
        console.log(`    Email: ${student.email}`);
        console.log(`    Attended: ${student.attended ? 'Yes' : 'No'}`);
        console.log(`    Date: ${student.scheduled_date || 'N/A'}`);
        console.log('');
      });
    } else {
      console.log('❌ No student records found for mike');
    }
    
    // 7. Check mike's organization
    console.log('\n7. Mike\'s organization:');
    if (mikeUser.rows.length > 0 && mikeUser.rows[0].organization_id) {
      const mikeOrg = await pool.query(`
        SELECT * FROM organizations WHERE id = $1
      `, [mikeUser.rows[0].organization_id]);
      
      if (mikeOrg.rows.length > 0) {
        const org = mikeOrg.rows[0];
        console.log(`  - ID: ${org.id}`);
        console.log(`  - Name: ${org.name}`);
        console.log(`  - Contact Email: ${org.contact_email || 'N/A'}`);
        console.log(`  - Contact Phone: ${org.contact_phone || 'N/A'}`);
        console.log(`  - Address: ${org.address || 'N/A'}`);
      }
    } else {
      console.log('❌ Mike is not associated with any organization');
    }
    
  } catch (error) {
    console.error('❌ Error checking user mike:', error);
  } finally {
    await pool.end();
  }
}

checkUserMike(); 