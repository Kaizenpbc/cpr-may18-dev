const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'cpr_may18',
  password: 'gtacpr',
  port: 5432,
});

async function checkDatabase() {
  try {
    console.log('🔍 Checking database...');
    
    // Check if the view exists
    console.log('\n1. Checking if course_request_details view exists...');
    const viewCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.views 
      WHERE table_name = 'course_request_details'
    `);
    console.log('View exists:', viewCheck.rows.length > 0);
    
    // Check course 27
    console.log('\n2. Checking course 27...');
    const courseCheck = await pool.query(`
      SELECT id, organization_id, registered_students, status 
      FROM course_requests 
      WHERE id = 27
    `);
    console.log('Course 27:', courseCheck.rows[0] || 'Not found');
    
    // Check course_students table structure
    console.log('\n3. Checking course_students table structure...');
    const tableStructure = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'course_students'
      ORDER BY ordinal_position
    `);
    console.log('course_students table columns:');
    tableStructure.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });
    
    // Check students for course 27 (using correct column names)
    console.log('\n4. Checking students for course 27...');
    const studentsCheck = await pool.query(`
      SELECT * FROM course_students WHERE course_request_id = 27
    `);
    console.log('Students for course 27:', studentsCheck.rows);
    console.log('Number of students:', studentsCheck.rows.length);
    
    // Check the view for course 27
    console.log('\n5. Checking view for course 27...');
    const viewCheck2 = await pool.query(`
      SELECT id, students_registered, course_type_name, organization_name
      FROM course_request_details 
      WHERE id = 27
    `);
    console.log('View data for course 27:', viewCheck2.rows[0] || 'Not found');
    
  } catch (error) {
    console.error('Error checking database:', error);
  } finally {
    await pool.end();
  }
}

checkDatabase(); 