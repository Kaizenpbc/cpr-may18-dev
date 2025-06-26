const { Pool } = require('pg');

const pool = new Pool({
  host: '127.0.0.1',
  user: 'postgres',
  password: 'gtacpr',
  port: 5432,
  database: 'cpr_may18',
});

async function testCorrected() {
  try {
    console.log('🔍 Testing the corrected billing queue query...\n');
    
    // Test the corrected billing queue query
    const correctedQuery = `
      SELECT 
        cr.id as course_id,
        cr.status,
        cr.organization_id,
        o.name as organization_name,
        ct.name as course_type_name,
        cr.location,
        cr.completed_at,
        cr.ready_for_billing_at,
        cr.invoiced,
        (SELECT COUNT(*) FROM course_students cs WHERE cs.course_request_id = cr.id) as students_attended,
        COALESCE(cp.price_per_student, 50.00) as rate_per_student,
        (SELECT COUNT(*) FROM course_students cs WHERE cs.course_request_id = cr.id) * COALESCE(cp.price_per_student, 50.00) as total_amount
      FROM course_requests cr
      JOIN organizations o ON cr.organization_id = o.id
      JOIN class_types ct ON cr.course_type_id = ct.id
      LEFT JOIN course_pricing cp ON cr.organization_id = cp.organization_id AND cr.course_type_id = cp.course_type_id AND COALESCE(cp.is_active, true) = true
      WHERE cr.id = 27
    `;
    
    const result = await pool.query(correctedQuery);
    
    if (result.rows.length === 0) {
      console.log('❌ Course 27 not found');
      return;
    }
    
    const course = result.rows[0];
    console.log(`🏫 Course 27 - Corrected Query Results:`);
    console.log(`   Status: ${course.status}`);
    console.log(`   Organization: ${course.organization_name}`);
    console.log(`   Course Type: ${course.course_type_name}`);
    console.log(`   Location: ${course.location}`);
    console.log(`   Completed At: ${course.completed_at || 'Not completed'}`);
    console.log(`   Ready for Billing At: ${course.ready_for_billing_at || 'Not ready'}`);
    console.log(`   Invoiced: ${course.invoiced}`);
    console.log(`   Students Attended: ${course.students_attended}`);
    console.log(`   Rate per Student: $${course.rate_per_student}`);
    console.log(`   Total Amount: $${course.total_amount}`);
    console.log('');
    
    // Show the student details
    const studentsQuery = `
      SELECT 
        id,
        email,
        first_name,
        last_name,
        attended,
        created_at
      FROM course_students
      WHERE course_request_id = 27
      ORDER BY email, created_at
    `;
    
    const studentsResult = await pool.query(studentsQuery);
    
    console.log(`📚 Student Details for Course 27:`);
    studentsResult.rows.forEach((student, index) => {
      console.log(`   ${index + 1}. ID: ${student.id} | Email: ${student.email} | Name: ${student.first_name} ${student.last_name} | Attended: ${student.attended}`);
    });
    console.log('');
    
    console.log('✅ Confirmation:');
    console.log(`   - Total students in database: ${studentsResult.rows.length}`);
    console.log(`   - Query returns: ${course.students_attended}`);
    console.log(`   - These should match: ${studentsResult.rows.length === course.students_attended ? '✅ YES' : '❌ NO'}`);
    
  } catch (error) {
    console.error('❌ Error testing corrected query:', error);
  } finally {
    await pool.end();
  }
}

testCorrected(); 