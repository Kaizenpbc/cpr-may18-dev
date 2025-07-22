const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  password: 'gtacpr',
  host: '127.0.0.1',
  port: 5432,
  database: 'cpr_jun21'
});

async function showIffatInstructors() {
  console.log('🔍 Iffat College Completed Courses with Instructors\n');
  
  try {
    // Get completed courses with instructor information
    const result = await pool.query(`
      SELECT 
        cr.id as course_id,
        cr.confirmed_date,
        cr.location,
        ct.name as course_type,
        cr.registered_students,
        u.username as instructor_name,
        u.email as instructor_email,
        i.invoice_number,
        i.status as invoice_status,
        i.amount as invoice_amount
      FROM course_requests cr
      LEFT JOIN class_types ct ON cr.course_type_id = ct.id
      LEFT JOIN users u ON cr.instructor_id = u.id
      LEFT JOIN invoices i ON cr.id = i.course_request_id
      WHERE cr.organization_id = 2 AND cr.status = 'completed'
      ORDER BY cr.confirmed_date DESC
    `);
    
    if (result.rows.length === 0) {
      console.log('❌ No completed courses found for Iffat College');
      return;
    }
    
    console.log(`📊 Found ${result.rows.length} completed courses:\n`);
    
    // Create table header
    console.log('┌──────────┬────────────┬─────────────────┬─────────────────┬──────────┬─────────────────┬─────────────────┬─────────────────┬─────────────────┐');
    console.log('│ Course ID│    Date    │    Location     │   Course Type   │ Students │   Instructor    │   Instructor    │   Invoice #     │ Invoice Status  │');
    console.log('│          │            │                 │                 │          │      Name       │     Email       │                 │                 │');
    console.log('├──────────┼────────────┼─────────────────┼─────────────────┼──────────┼─────────────────┼─────────────────┼─────────────────┼─────────────────┤');
    
    // Display each course
    result.rows.forEach((course, index) => {
      const courseId = course.course_id.toString().padEnd(8);
      const date = course.confirmed_date ? new Date(course.confirmed_date).toLocaleDateString() : 'N/A';
      const location = (course.location || 'N/A').padEnd(15);
      const courseType = (course.course_type || 'N/A').padEnd(15);
      const students = (course.registered_students || 0).toString().padEnd(8);
      const instructorName = (course.instructor_name || 'N/A').padEnd(15);
      const instructorEmail = (course.instructor_email || 'N/A').padEnd(15);
      const invoiceNumber = (course.invoice_number || 'N/A').padEnd(15);
      const invoiceStatus = (course.invoice_status || 'N/A').padEnd(15);
      
      console.log(`│ ${courseId} │ ${date.padEnd(10)} │ ${location} │ ${courseType} │ ${students} │ ${instructorName} │ ${instructorEmail} │ ${invoiceNumber} │ ${invoiceStatus} │`);
      
      // Add separator line between rows
      if (index < result.rows.length - 1) {
        console.log('├──────────┼────────────┼─────────────────┼─────────────────┼──────────┼─────────────────┼─────────────────┼─────────────────┼─────────────────┤');
      }
    });
    
    console.log('└──────────┴────────────┴─────────────────┴─────────────────┴──────────┴─────────────────┴─────────────────┴─────────────────┴─────────────────┘');
    
    // Summary
    console.log('\n📈 Summary:');
    console.log(`   Total completed courses: ${result.rows.length}`);
    
    // Count unique instructors
    const instructors = [...new Set(result.rows.map(course => course.instructor_name).filter(name => name !== 'N/A'))];
    console.log(`   Unique instructors: ${instructors.length}`);
    if (instructors.length > 0) {
      console.log(`   Instructors: ${instructors.join(', ')}`);
    }
    
    // Count total students
    const totalStudents = result.rows.reduce((sum, course) => sum + (course.registered_students || 0), 0);
    console.log(`   Total students trained: ${totalStudents}`);
    
    // Invoice summary
    const invoices = result.rows.filter(course => course.invoice_number !== 'N/A');
    console.log(`   Courses with invoices: ${invoices.length}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

showIffatInstructors(); 