const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'cpr_may18',
  user: 'postgres',
  password: 'gtacpr'
});

async function checkAdminView() {
  try {
    console.log('🔍 Checking admin view for course 27...');
    
    // Check what columns are in the view
    const columnsResult = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'course_request_details' 
      ORDER BY ordinal_position
    `);
    
    console.log('Columns in course_request_details view:');
    console.log(JSON.stringify(columnsResult.rows, null, 2));
    
    // Check course_request_details view (what admin sees)
    const viewResult = await pool.query(
      'SELECT * FROM course_request_details WHERE id = 27'
    );
    
    console.log('\nAdmin view (course_request_details) for course 27:');
    console.log(JSON.stringify(viewResult.rows, null, 2));
    
    // Check actual course_requests table
    const tableResult = await pool.query(
      'SELECT id, organization_id, registered_students FROM course_requests WHERE id = 27'
    );
    
    console.log('\nActual table (course_requests):');
    console.log(JSON.stringify(tableResult.rows, null, 2));
    
    // Check course_students table
    const studentsResult = await pool.query(
      'SELECT COUNT(*) as student_count FROM course_students WHERE course_request_id = 27'
    );
    
    console.log('\nStudents in course_students table:');
    console.log(JSON.stringify(studentsResult.rows, null, 2));
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkAdminView(); 