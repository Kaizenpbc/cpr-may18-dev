const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'cpr_jun21',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'gtacpr',
});

async function testBillingQueueFix() {
  try {
    console.log('🔍 Testing updated billing queue query...\n');
    
    // Test the updated billing queue query
    const result = await pool.query(`
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
        u.username as instructor_username,
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
    `);
    
    if (result.rows.length > 0) {
      console.log('✅ Updated billing queue results:');
      result.rows.forEach(course => {
        console.log(`  - Course: ${course.course_type_name}`);
        console.log(`    Organization: ${course.organization_name}`);
        console.log(`    Instructor Name: ${course.instructor_name}`);
        console.log(`    Instructor Email: ${course.instructor_email}`);
        console.log(`    Instructor Username: ${course.instructor_username}`);
        console.log(`    Students: ${course.students_attended}`);
        console.log(`    Total Amount: $${course.total_amount}`);
        console.log('');
      });
    } else {
      console.log('❌ No courses in billing queue');
    }
    
    // Test with a specific course that has mike as instructor
    console.log('\n🔍 Testing specific course with mike as instructor:');
    const mikeCourse = await pool.query(`
      SELECT 
        cr.id as course_id,
        cr.organization_id,
        o.name as organization_name,
        ct.name as course_type_name,
        cr.location,
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
      AND cr.status = 'completed'
      ORDER BY cr.completed_at DESC
      LIMIT 1
    `);
    
    if (mikeCourse.rows.length > 0) {
      const course = mikeCourse.rows[0];
      console.log('✅ Mike\'s course with updated instructor name:');
      console.log(`  - Course: ${course.course_type_name}`);
      console.log(`  - Organization: ${course.organization_name}`);
      console.log(`  - Instructor Name: ${course.instructor_name}`);
      console.log(`  - Instructor Email: ${course.instructor_email}`);
      console.log(`  - Instructor Username: ${course.instructor_username}`);
      console.log(`  - Students: ${course.students_attended}`);
      
      // Check if the fix worked
      if (course.instructor_name === 'Michael Annamunthodo') {
        console.log('\n🎉 SUCCESS: The fix worked! Mike now shows as "Michael Annamunthodo" instead of "mike"');
      } else {
        console.log('\n⚠️  WARNING: The fix may not have worked as expected');
        console.log(`Expected: "Michael Annamunthodo", Got: "${course.instructor_name}"`);
      }
    } else {
      console.log('❌ No completed courses found for mike');
    }
    
  } catch (error) {
    console.error('❌ Error testing billing queue fix:', error);
  } finally {
    await pool.end();
  }
}

testBillingQueueFix(); 