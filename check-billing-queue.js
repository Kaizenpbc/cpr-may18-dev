const { Pool } = require('pg');

const pool = new Pool({
  host: '127.0.0.1',
  user: 'postgres',
  password: 'gtacpr',
  port: 5432,
  database: 'cpr_may18',
});

async function checkBillingQueue() {
  try {
    console.log('🔍 Checking billing queue...\n');
    
    // Query for courses ready for billing (completed courses without invoices)
    const billingQuery = `
      SELECT 
        cr.id as course_id,
        cr.organization_id,
        cr.completed_at,
        cr.location,
        o.name as organization_name,
        ct.name as course_type_name,
        (SELECT COUNT(*) FROM course_students cs WHERE cs.course_request_id = cr.id) as students_attended,
        COALESCE(cp.price_per_student, 50.00) as rate_per_student
      FROM course_requests cr
      JOIN organizations o ON cr.organization_id = o.id
      JOIN class_types ct ON cr.course_type_id = ct.id
      LEFT JOIN course_pricing cp ON cr.organization_id = cp.organization_id AND cr.course_type_id = cp.course_type_id AND cp.is_active = true
      WHERE cr.status = 'completed' 
      AND cr.id NOT IN (SELECT DISTINCT course_request_id FROM invoices WHERE course_request_id IS NOT NULL)
      ORDER BY cr.completed_at DESC
    `;
    
    const billingResult = await pool.query(billingQuery);
    
    if (billingResult.rows.length === 0) {
      console.log('✅ No courses in billing queue');
      return;
    }
    
    console.log(`📋 Found ${billingResult.rows.length} course(s) in billing queue:\n`);
    
    for (const course of billingResult.rows) {
      console.log(`🏫 Course ID: ${course.course_id}`);
      console.log(`   Organization: ${course.organization_name}`);
      console.log(`   Course Type: ${course.course_type_name}`);
      console.log(`   Location: ${course.location}`);
      console.log(`   Completed: ${course.completed_at}`);
      console.log(`   Students Attended: ${course.students_attended}`);
      console.log(`   Rate per Student: $${course.rate_per_student}`);
      console.log(`   Total Amount: $${(course.students_attended * course.rate_per_student).toFixed(2)}`);
      
      // Get detailed student list for this course
      const studentsQuery = `
        SELECT 
          cs.id,
          cs.student_name,
          cs.email,
          cs.phone,
          cs.attended,
          cs.created_at
        FROM course_students cs
        WHERE cs.course_request_id = $1
        ORDER BY cs.student_name
      `;
      
      const studentsResult = await pool.query(studentsQuery, [course.course_id]);
      
      console.log(`   📚 Student Details:`);
      if (studentsResult.rows.length === 0) {
        console.log(`      No students found!`);
      } else {
        studentsResult.rows.forEach((student, index) => {
          console.log(`      ${index + 1}. ${student.student_name} (${student.email}) - Attended: ${student.attended ? 'Yes' : 'No'}`);
        });
      }
      console.log('');
    }
    
  } catch (error) {
    console.error('❌ Error checking billing queue:', error);
  } finally {
    await pool.end();
  }
}

checkBillingQueue(); 