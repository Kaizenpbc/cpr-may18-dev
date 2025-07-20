const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'cpr_jun21',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'gtacpr',
});

async function checkInstructorDisplay() {
  try {
    console.log('🔍 Checking how instructor names are displayed in billing...\n');
    
    // 1. Check current billing queue query
    console.log('1. Current billing queue query results:');
    const billingQueue = await pool.query(`
      SELECT 
        cr.id as course_id,
        cr.organization_id,
        o.name as organization_name,
        o.contact_email,
        ct.name as course_type_name,
        cr.location,
        cr.completed_at::date as date_completed,
        cr.registered_students,
        (SELECT COUNT(*) FROM course_students cs WHERE cs.course_request_id = cr.id AND cs.attended = true) as students_attended,
        cp.price_per_student as rate_per_student,
        ((SELECT COUNT(*) FROM course_students cs WHERE cs.course_request_id = cr.id AND cs.attended = true) * cp.price_per_student * 1.13) as total_amount,
        u.username as instructor_name,
        u.email as instructor_email,
        cr.ready_for_billing_at
      FROM course_requests cr
      JOIN organizations o ON cr.organization_id = o.id
      JOIN class_types ct ON cr.course_type_id = ct.id
      JOIN course_pricing cp ON cr.organization_id = cp.organization_id AND cr.course_type_id = cp.course_type_id AND cp.is_active = true
      LEFT JOIN users u ON cr.instructor_id = u.id
      WHERE cr.status = 'completed'
      AND cr.ready_for_billing_at IS NOT NULL
      AND (cr.invoiced IS NULL OR cr.invoiced = FALSE)
      ORDER BY cr.ready_for_billing_at DESC
      LIMIT 5
    `);
    
    if (billingQueue.rows.length > 0) {
      console.log('Current billing queue shows:');
      billingQueue.rows.forEach(course => {
        console.log(`  - Course: ${course.course_type_name}`);
        console.log(`    Organization: ${course.organization_name}`);
        console.log(`    Instructor: ${course.instructor_name} (${course.instructor_email})`);
        console.log(`    Students: ${course.students_attended}`);
        console.log('');
      });
    } else {
      console.log('❌ No courses in billing queue');
    }
    
    // 2. Check if there are any instructor records with full names
    console.log('2. Checking instructor table for full names:');
    const instructors = await pool.query(`
      SELECT * FROM instructors ORDER BY name
    `);
    
    if (instructors.rows.length > 0) {
      console.log('Instructors with full names:');
      instructors.rows.forEach(instructor => {
        console.log(`  - ID: ${instructor.id}, Name: ${instructor.name}, User ID: ${instructor.user_id}`);
      });
    } else {
      console.log('❌ No instructor records found');
    }
    
    // 3. Check if we can get Mike's full name from course_students
    console.log('\n3. Checking for Mike\'s full name in course_students:');
    const mikeFullName = await pool.query(`
      SELECT DISTINCT first_name, last_name, email
      FROM course_students 
      WHERE LOWER(email) LIKE '%mike%'
      LIMIT 1
    `);
    
    if (mikeFullName.rows.length > 0) {
      const mike = mikeFullName.rows[0];
      console.log(`Mike's full name: ${mike.first_name} ${mike.last_name} (${mike.email})`);
    }
    
    // 4. Check if there are any other ways to get instructor full names
    console.log('\n4. Checking users table structure for name fields:');
    const userColumns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY column_name
    `);
    
    console.log('Users table columns:');
    userColumns.rows.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type})`);
    });
    
    // 5. Check if there are any views that might have instructor full names
    console.log('\n5. Checking for views with instructor information:');
    const views = await pool.query(`
      SELECT viewname 
      FROM pg_views 
      WHERE schemaname = 'public'
      AND viewname LIKE '%instructor%'
    `);
    
    if (views.rows.length > 0) {
      console.log('Instructor-related views:');
      views.rows.forEach(view => {
        console.log(`  - ${view.viewname}`);
      });
    } else {
      console.log('❌ No instructor-related views found');
    }
    
    // 6. Check if there's a way to join with course_students to get instructor full names
    console.log('\n6. Checking if we can get instructor full names from course_students:');
    const instructorFromStudents = await pool.query(`
      SELECT DISTINCT 
        u.id as user_id,
        u.username,
        u.email as user_email,
        cs.first_name,
        cs.last_name,
        cs.email as student_email
      FROM users u
      LEFT JOIN course_students cs ON LOWER(u.email) = LOWER(cs.email)
      WHERE u.role = 'instructor'
      AND cs.first_name IS NOT NULL
      ORDER BY u.username
    `);
    
    if (instructorFromStudents.rows.length > 0) {
      console.log('Instructors with potential full names from course_students:');
      instructorFromStudents.rows.forEach(instructor => {
        console.log(`  - User ID: ${instructor.user_id}`);
        console.log(`    Username: ${instructor.username}`);
        console.log(`    User Email: ${instructor.user_email}`);
        console.log(`    Full Name: ${instructor.first_name} ${instructor.last_name}`);
        console.log(`    Student Email: ${instructor.student_email}`);
        console.log('');
      });
    } else {
      console.log('❌ No instructor full names found in course_students');
    }
    
  } catch (error) {
    console.error('❌ Error checking instructor display:', error);
  } finally {
    await pool.end();
  }
}

checkInstructorDisplay(); 