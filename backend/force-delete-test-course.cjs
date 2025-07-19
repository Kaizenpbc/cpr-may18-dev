const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Load environment variables
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath });
}

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'cpr_dev',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
});

async function forceDeleteTestCourse() {
  const client = await pool.connect();
  try {
    console.log('🔍 Finding and deleting test courses...\n');
    
    await client.query('BEGIN');
    
    // 1. Show all course requests
    console.log('1. All course requests in database:');
    const allCourses = await client.query(`
      SELECT 
        cr.id,
        cr.location,
        cr.registered_students,
        cr.status,
        cr.confirmed_date,
        cr.completed_at,
        o.name as organization_name,
        ct.name as course_type_name
      FROM course_requests cr
      LEFT JOIN organizations o ON cr.organization_id = o.id
      LEFT JOIN class_types ct ON cr.course_type_id = ct.id
      ORDER BY cr.id DESC
    `);
    
    allCourses.rows.forEach(course => {
      console.log(`   - ID: ${course.id}, Location: ${course.location}, Status: ${course.status}, Org: ${course.organization_name}, Type: ${course.course_type_name}`);
    });
    
    // 2. Find courses that match the test criteria
    console.log('\n2. Looking for test courses to delete...');
    const testCourses = await client.query(`
      SELECT cr.id, cr.location, cr.registered_students, cr.status
      FROM course_requests cr
      WHERE cr.location = 'Test Location' 
         OR cr.location LIKE '%Test%'
         OR cr.registered_students = 5
         OR cr.confirmed_date = CURRENT_DATE
      ORDER BY cr.id DESC
    `);
    
    if (testCourses.rows.length > 0) {
      console.log(`Found ${testCourses.rows.length} potential test course(s):`);
      testCourses.rows.forEach(course => {
        console.log(`   - ID: ${course.id}, Location: ${course.location}, Students: ${course.registered_students}, Status: ${course.status}`);
      });
      
      // Delete each test course
      for (const course of testCourses.rows) {
        console.log(`\nDeleting course ID ${course.id}...`);
        
        // Delete related records first
        const studentsDeleted = await client.query('DELETE FROM course_students WHERE course_request_id = $1', [course.id]);
        console.log(`   ✅ Deleted ${studentsDeleted.rowCount} students`);
        
        const invoicesDeleted = await client.query('DELETE FROM invoices WHERE course_request_id = $1', [course.id]);
        console.log(`   ✅ Deleted ${invoicesDeleted.rowCount} invoices`);
        
        // Delete the course request
        const courseDeleted = await client.query('DELETE FROM course_requests WHERE id = $1', [course.id]);
        console.log(`   ✅ Deleted course request`);
      }
    } else {
      console.log('   No test courses found with those criteria');
    }
    
    // 3. Check if there are any courses with today's date
    console.log('\n3. Checking for courses with today\'s date...');
    const todayCourses = await client.query(`
      SELECT cr.id, cr.location, cr.registered_students, cr.status, cr.confirmed_date
      FROM course_requests cr
      WHERE DATE(cr.confirmed_date) = CURRENT_DATE
         OR DATE(cr.completed_at) = CURRENT_DATE
      ORDER BY cr.id DESC
    `);
    
    if (todayCourses.rows.length > 0) {
      console.log(`Found ${todayCourses.rows.length} course(s) with today's date:`);
      todayCourses.rows.forEach(course => {
        console.log(`   - ID: ${course.id}, Location: ${course.location}, Students: ${course.registered_students}, Status: ${course.status}, Date: ${course.confirmed_date}`);
      });
      
      // Delete these courses too
      for (const course of todayCourses.rows) {
        console.log(`\nDeleting course ID ${course.id} (today's date)...`);
        
        // Delete related records first
        await client.query('DELETE FROM course_students WHERE course_request_id = $1', [course.id]);
        await client.query('DELETE FROM invoices WHERE course_request_id = $1', [course.id]);
        await client.query('DELETE FROM course_requests WHERE id = $1', [course.id]);
        console.log(`   ✅ Deleted course ${course.id}`);
      }
    } else {
      console.log('   No courses found with today\'s date');
    }
    
    await client.query('COMMIT');
    
    console.log('\n🎉 Force delete completed!');
    console.log('📋 Refresh your course list - the test course should be gone.');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error force deleting test courses:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

forceDeleteTestCourse(); 