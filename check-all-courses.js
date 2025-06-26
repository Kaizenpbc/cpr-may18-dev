const { Pool } = require('pg');

const pool = new Pool({
  host: '127.0.0.1',
  user: 'postgres',
  password: 'gtacpr',
  port: 5432,
  database: 'cpr_may18',
});

async function checkAllCourses() {
  try {
    console.log('🔍 Checking all courses and their status...\n');
    
    // Check all course_requests
    const allCoursesQuery = `
      SELECT 
        cr.id as course_id,
        cr.status,
        cr.organization_id,
        cr.completed_at,
        cr.location,
        o.name as organization_name,
        ct.name as course_type_name,
        (SELECT COUNT(*) FROM course_students cs WHERE cs.course_request_id = cr.id) as students_count,
        CASE WHEN i.id IS NOT NULL THEN 'Has Invoice' ELSE 'No Invoice' END as invoice_status
      FROM course_requests cr
      JOIN organizations o ON cr.organization_id = o.id
      JOIN class_types ct ON cr.course_type_id = ct.id
      LEFT JOIN invoices i ON cr.id = i.course_request_id
      ORDER BY cr.created_at DESC
    `;
    
    const allCoursesResult = await pool.query(allCoursesQuery);
    
    console.log(`📋 Found ${allCoursesResult.rows.length} total course(s):\n`);
    
    for (const course of allCoursesResult.rows) {
      console.log(`🏫 Course ID: ${course.course_id}`);
      console.log(`   Status: ${course.status}`);
      console.log(`   Organization: ${course.organization_name}`);
      console.log(`   Course Type: ${course.course_type_name}`);
      console.log(`   Location: ${course.location}`);
      console.log(`   Completed: ${course.completed_at || 'Not completed'}`);
      console.log(`   Students Count: ${course.students_count}`);
      console.log(`   Invoice Status: ${course.invoice_status}`);
      console.log('');
    }
    
    // Check completed courses specifically
    console.log('🔍 Checking completed courses specifically...\n');
    const completedCoursesQuery = `
      SELECT 
        cr.id as course_id,
        cr.organization_id,
        cr.completed_at,
        cr.location,
        o.name as organization_name,
        ct.name as course_type_name,
        (SELECT COUNT(*) FROM course_students cs WHERE cs.course_request_id = cr.id) as students_count
      FROM course_requests cr
      JOIN organizations o ON cr.organization_id = o.id
      JOIN class_types ct ON cr.course_type_id = ct.id
      WHERE cr.status = 'completed'
      ORDER BY cr.completed_at DESC
    `;
    
    const completedResult = await pool.query(completedCoursesQuery);
    
    console.log(`📋 Found ${completedResult.rows.length} completed course(s):\n`);
    
    for (const course of completedResult.rows) {
      console.log(`🏫 Course ID: ${course.course_id}`);
      console.log(`   Organization: ${course.organization_name}`);
      console.log(`   Course Type: ${course.course_type_name}`);
      console.log(`   Location: ${course.location}`);
      console.log(`   Completed: ${course.completed_at}`);
      console.log(`   Students Count: ${course.students_count}`);
      console.log('');
    }
    
    // Check invoices
    console.log('🔍 Checking existing invoices...\n');
    const invoicesQuery = `
      SELECT 
        i.id as invoice_id,
        i.course_request_id,
        i.invoice_number,
        i.amount,
        i.status,
        i.created_at
      FROM invoices i
      ORDER BY i.created_at DESC
    `;
    
    const invoicesResult = await pool.query(invoicesQuery);
    
    console.log(`📋 Found ${invoicesResult.rows.length} invoice(s):\n`);
    
    for (const invoice of invoicesResult.rows) {
      console.log(`🧾 Invoice ID: ${invoice.invoice_id}`);
      console.log(`   Course Request ID: ${invoice.course_request_id}`);
      console.log(`   Invoice Number: ${invoice.invoice_number}`);
      console.log(`   Amount: $${invoice.amount}`);
      console.log(`   Status: ${invoice.status}`);
      console.log(`   Created: ${invoice.created_at}`);
      console.log('');
    }
    
  } catch (error) {
    console.error('❌ Error checking courses:', error);
  } finally {
    await pool.end();
  }
}

checkAllCourses(); 