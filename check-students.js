const { Pool } = require('pg');

const pool = new Pool({
  host: '127.0.0.1',
  user: 'postgres',
  password: 'gtacpr',
  port: 5432,
  database: 'cpr_may18',
});

async function checkStudents() {
  try {
    console.log('🔍 Checking student records for course 27...\n');
    
    // First, let's see the actual course status
    const courseQuery = `
      SELECT 
        cr.id,
        cr.status,
        cr.completed_at,
        cr.ready_for_billing_at,
        cr.invoiced,
        o.name as organization_name,
        ct.name as course_type_name
      FROM course_requests cr
      JOIN organizations o ON cr.organization_id = o.id
      JOIN class_types ct ON cr.course_type_id = ct.id
      WHERE cr.id = 27
    `;
    
    const courseResult = await pool.query(courseQuery);
    const course = courseResult.rows[0];
    
    console.log(`🏫 Course 27 Details:`);
    console.log(`   Status: ${course.status}`);
    console.log(`   Completed At: ${course.completed_at || 'Not completed'}`);
    console.log(`   Ready for Billing At: ${course.ready_for_billing_at || 'Not ready'}`);
    console.log(`   Invoiced: ${course.invoiced}`);
    console.log(`   Organization: ${course.organization_name}`);
    console.log(`   Course Type: ${course.course_type_name}`);
    console.log('');
    
    // Check the course_students table structure
    console.log('🔍 Checking course_students table structure...\n');
    const tableStructureQuery = `
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'course_students'
      ORDER BY ordinal_position
    `;
    
    const structureResult = await pool.query(tableStructureQuery);
    console.log('📋 course_students table columns:');
    structureResult.rows.forEach(col => {
      console.log(`   ${col.column_name} (${col.data_type}) - Nullable: ${col.is_nullable}`);
    });
    console.log('');
    
    // Get all students for this course
    const studentsQuery = `
      SELECT 
        cs.*
      FROM course_students cs
      WHERE cs.course_request_id = 27
      ORDER BY cs.id
    `;
    
    const studentsResult = await pool.query(studentsQuery);
    
    console.log(`📚 All student records for Course 27 (${studentsResult.rows.length} total):`);
    studentsResult.rows.forEach((student, index) => {
      console.log(`   ${index + 1}. ID: ${student.id}`);
      console.log(`      Course Request ID: ${student.course_request_id}`);
      console.log(`      Student ID: ${student.student_id || 'NULL'}`);
      console.log(`      Name: ${student.name || 'NULL'}`);
      console.log(`      Email: ${student.email || 'NULL'}`);
      console.log(`      Phone: ${student.phone || 'NULL'}`);
      console.log(`      Attended: ${student.attended || 'NULL'}`);
      console.log(`      Created At: ${student.created_at}`);
      console.log(`      Updated At: ${student.updated_at || 'NULL'}`);
      console.log('');
    });
    
    // Check if there are any duplicate entries
    console.log('🔍 Checking for potential duplicates...\n');
    const duplicateQuery = `
      SELECT 
        student_id,
        name,
        email,
        COUNT(*) as count
      FROM course_students
      WHERE course_request_id = 27
      GROUP BY student_id, name, email
      HAVING COUNT(*) > 1
    `;
    
    const duplicateResult = await pool.query(duplicateQuery);
    
    if (duplicateResult.rows.length > 0) {
      console.log('⚠️  Found potential duplicate entries:');
      duplicateResult.rows.forEach(dup => {
        console.log(`   Student: ${dup.name || dup.email || dup.student_id} - Count: ${dup.count}`);
      });
    } else {
      console.log('✅ No duplicate entries found');
    }
    console.log('');
    
    // Check the exact query used in the Accounts Receivable view
    console.log('🔍 Testing the Accounts Receivable student count query...\n');
    const arQuery = `
      SELECT 
        cr.id as course_id,
        cr.status,
        cr.completed_at,
        (SELECT COUNT(*) FROM course_students cs WHERE cs.course_request_id = cr.id) as students_attended
      FROM course_requests cr
      WHERE cr.id = 27
    `;
    
    const arResult = await pool.query(arQuery);
    console.log(`📊 Accounts Receivable query result:`);
    console.log(`   Course ID: ${arResult.rows[0].course_id}`);
    console.log(`   Status: ${arResult.rows[0].status}`);
    console.log(`   Completed At: ${arResult.rows[0].completed_at || 'Not completed'}`);
    console.log(`   Students Attended: ${arResult.rows[0].students_attended}`);
    console.log('');
    
    // Check if there are any other tables that might be counting students
    console.log('🔍 Checking if there are other student-related tables...\n');
    const otherTablesQuery = `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name LIKE '%student%'
      ORDER BY table_name
    `;
    
    const otherTablesResult = await pool.query(otherTablesQuery);
    console.log('📋 Student-related tables:');
    otherTablesResult.rows.forEach(table => {
      console.log(`   ${table.table_name}`);
    });
    
  } catch (error) {
    console.error('❌ Error checking students:', error);
  } finally {
    await pool.end();
  }
}

checkStudents(); 