const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'cpr_jun21',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'gtacpr',
});

async function testInstructorNameFix() {
  try {
    console.log('🔍 Testing instructor name fix for all courses with mike...\n');
    
    // Test the updated query for any course with mike as instructor
    const result = await pool.query(`
      SELECT 
        cr.id as course_id,
        cr.organization_id,
        o.name as organization_name,
        ct.name as course_type_name,
        cr.location,
        cr.status,
        cr.completed_at::date as date_completed,
        (SELECT COUNT(*) FROM course_students cs WHERE cs.course_request_id = cr.id AND cs.attended = true) as students_attended,
        COALESCE(
          -- First try to get full name from course_students table (most reliable)
          (SELECT DISTINCT cs.first_name || ' ' || cs.last_name 
           FROM course_students cs 
           WHERE LOWER(cs.email) = LOWER(u.email) 
           AND cs.first_name IS NOT NULL 
           AND cs.last_name IS NOT NULL 
           LIMIT 1),
          -- Fallback to instructor table if it exists
          (SELECT i.name FROM instructors i WHERE i.user_id = u.id LIMIT 1),
          -- Final fallback to username if no full name found
          u.username
        ) as instructor_name,
        u.email as instructor_email,
        u.username as instructor_username
      FROM course_requests cr
      JOIN organizations o ON cr.organization_id = o.id
      JOIN class_types ct ON cr.course_type_id = ct.id
      LEFT JOIN users u ON cr.instructor_id = u.id
      WHERE cr.instructor_id = (SELECT id FROM users WHERE username = 'mike')
      ORDER BY cr.completed_at DESC NULLS LAST, cr.scheduled_date DESC
    `);
    
    if (result.rows.length > 0) {
      console.log(`✅ Found ${result.rows.length} courses with mike as instructor:`);
      result.rows.forEach((course, index) => {
        console.log(`\n${index + 1}. Course Details:`);
        console.log(`  - Course: ${course.course_type_name}`);
        console.log(`  - Organization: ${course.organization_name}`);
        console.log(`  - Location: ${course.location}`);
        console.log(`  - Status: ${course.status}`);
        console.log(`  - Completed: ${course.date_completed || 'Not completed'}`);
        console.log(`  - Students Attended: ${course.students_attended}`);
        console.log(`  - Instructor Name: ${course.instructor_name}`);
        console.log(`  - Instructor Email: ${course.instructor_email}`);
        console.log(`  - Instructor Username: ${course.instructor_username}`);
        
        // Check if the fix worked
        if (course.instructor_name === 'Michael Annamunthodo') {
          console.log(`  ✅ SUCCESS: Shows full name "Michael Annamunthodo"`);
        } else if (course.instructor_name === 'mike') {
          console.log(`  ❌ FAILED: Still shows username "mike"`);
        } else {
          console.log(`  ⚠️  UNEXPECTED: Shows "${course.instructor_name}"`);
        }
      });
      
      // Summary
      const successCount = result.rows.filter(course => course.instructor_name === 'Michael Annamunthodo').length;
      const totalCount = result.rows.length;
      console.log(`\n📊 Summary:`);
      console.log(`  - Total courses: ${totalCount}`);
      console.log(`  - Successfully showing full name: ${successCount}`);
      console.log(`  - Success rate: ${Math.round((successCount / totalCount) * 100)}%`);
      
      if (successCount === totalCount) {
        console.log(`\n🎉 PERFECT! All courses now show "Michael Annamunthodo" instead of "mike"`);
      } else if (successCount > 0) {
        console.log(`\n✅ PARTIAL SUCCESS: Some courses show full name, others may need attention`);
      } else {
        console.log(`\n❌ ISSUE: No courses are showing the full name. The fix may need adjustment.`);
      }
    } else {
      console.log('❌ No courses found with mike as instructor');
    }
    
    // Also test the fallback logic by checking what happens if we remove the course_students data
    console.log('\n🔍 Testing fallback logic...');
    const fallbackTest = await pool.query(`
      SELECT 
        u.id,
        u.username,
        u.email,
        -- Test instructor table fallback
        (SELECT i.name FROM instructors i WHERE i.user_id = u.id LIMIT 1) as instructor_table_name,
        -- Test course_students fallback
        (SELECT DISTINCT cs.first_name || ' ' || cs.last_name 
         FROM course_students cs 
         WHERE LOWER(cs.email) = LOWER(u.email) 
         AND cs.first_name IS NOT NULL 
         AND cs.last_name IS NOT NULL 
         LIMIT 1) as course_students_name
      FROM users u
      WHERE u.username = 'mike'
    `);
    
    if (fallbackTest.rows.length > 0) {
      const user = fallbackTest.rows[0];
      console.log('Fallback test results for mike:');
      console.log(`  - Username: ${user.username}`);
      console.log(`  - Email: ${user.email}`);
      console.log(`  - Instructor table name: ${user.instructor_table_name || 'NULL'}`);
      console.log(`  - Course students name: ${user.course_students_name || 'NULL'}`);
    }
    
  } catch (error) {
    console.error('❌ Error testing instructor name fix:', error);
  } finally {
    await pool.end();
  }
}

testInstructorNameFix(); 