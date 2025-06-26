const { Pool } = require('pg');

const pool = new Pool({
  host: '127.0.0.1',
  user: 'postgres',
  password: 'gtacpr',
  port: 5432,
  database: 'cpr_may18',
});

async function checkCourseDetails() {
  try {
    console.log('🔍 Checking course details for course ID 27...\n');
    
    // Check the specific course
    const courseQuery = `
      SELECT 
        cr.id,
        cr.status,
        cr.organization_id,
        cr.completed_at,
        cr.ready_for_billing_at,
        cr.invoiced,
        cr.location,
        o.name as organization_name,
        ct.name as course_type_name,
        (SELECT COUNT(*) FROM course_students cs WHERE cs.course_request_id = cr.id) as students_count
      FROM course_requests cr
      JOIN organizations o ON cr.organization_id = o.id
      JOIN class_types ct ON cr.course_type_id = ct.id
      WHERE cr.id = 27
    `;
    
    const courseResult = await pool.query(courseQuery);
    
    if (courseResult.rows.length === 0) {
      console.log('❌ Course 27 not found');
      return;
    }
    
    const course = courseResult.rows[0];
    console.log(`🏫 Course ID: ${course.id}`);
    console.log(`   Status: ${course.status}`);
    console.log(`   Organization: ${course.organization_name}`);
    console.log(`   Course Type: ${course.course_type_name}`);
    console.log(`   Location: ${course.location}`);
    console.log(`   Completed At: ${course.completed_at || 'Not completed'}`);
    console.log(`   Ready for Billing At: ${course.ready_for_billing_at || 'Not ready'}`);
    console.log(`   Invoiced: ${course.invoiced}`);
    console.log(`   Students Count: ${course.students_count}`);
    console.log('');
    
    // Check students for this course
    const studentsQuery = `
      SELECT 
        cs.id,
        cs.student_name,
        cs.email,
        cs.phone,
        cs.attended,
        cs.created_at
      FROM course_students cs
      WHERE cs.course_request_id = 27
      ORDER BY cs.student_name
    `;
    
    const studentsResult = await pool.query(studentsQuery);
    
    console.log(`📚 Students for Course 27 (${studentsResult.rows.length} total):`);
    if (studentsResult.rows.length === 0) {
      console.log('   No students found');
    } else {
      studentsResult.rows.forEach((student, index) => {
        console.log(`   ${index + 1}. ${student.student_name} (${student.email}) - Attended: ${student.attended ? 'Yes' : 'No'}`);
      });
    }
    console.log('');
    
    // Check if there are any invoices for this course
    const invoicesQuery = `
      SELECT 
        i.id,
        i.invoice_number,
        i.course_request_id,
        i.amount,
        i.status,
        i.created_at
      FROM invoices i
      WHERE i.course_request_id = 27
    `;
    
    const invoicesResult = await pool.query(invoicesQuery);
    
    console.log(`🧾 Invoices for Course 27 (${invoicesResult.rows.length} total):`);
    if (invoicesResult.rows.length === 0) {
      console.log('   No invoices found');
    } else {
      invoicesResult.rows.forEach((invoice, index) => {
        console.log(`   ${index + 1}. Invoice ${invoice.invoice_number} - Amount: $${invoice.amount} - Status: ${invoice.status}`);
      });
    }
    console.log('');
    
    // Test the billing queue queries
    console.log('🔍 Testing billing queue queries...\n');
    
    // Test the main billing queue query
    const mainBillingQuery = `
      SELECT 
        cr.id as course_id,
        cr.status,
        cr.ready_for_billing_at,
        cr.invoiced,
        o.name as organization_name,
        (SELECT COUNT(*) FROM course_students cs WHERE cs.course_request_id = cr.id) as students_attended
      FROM course_requests cr
      JOIN organizations o ON cr.organization_id = o.id
      WHERE cr.status = 'completed'
      AND cr.ready_for_billing_at IS NOT NULL
      AND (cr.invoiced IS NULL OR cr.invoiced = FALSE)
    `;
    
    const mainBillingResult = await pool.query(mainBillingQuery);
    console.log(`📋 Main billing queue query found ${mainBillingResult.rows.length} course(s)`);
    
    // Test the simple billing queue query
    const simpleBillingQuery = `
      SELECT 
        cr.id as course_id,
        cr.status,
        o.name as organization_name,
        (SELECT COUNT(*) FROM course_students cs WHERE cs.course_request_id = cr.id) as students_attended
      FROM course_requests cr
      JOIN organizations o ON cr.organization_id = o.id
      WHERE cr.status = 'completed'
    `;
    
    const simpleBillingResult = await pool.query(simpleBillingQuery);
    console.log(`📋 Simple billing queue query found ${simpleBillingResult.rows.length} course(s)`);
    
  } catch (error) {
    console.error('❌ Error checking course details:', error);
  } finally {
    await pool.end();
  }
}

checkCourseDetails(); 