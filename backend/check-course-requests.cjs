const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'gtacpr',
  database: 'cpr_jun21'
});

async function checkCourseRequests() {
  try {
    console.log('Checking course_requests for instructor 4827...');
    
    const courseRequestsResult = await pool.query(`
      SELECT 
        id, 
        instructor_id, 
        status, 
        scheduled_date, 
        confirmed_date,
        organization_id,
        course_type_id
      FROM course_requests 
      WHERE instructor_id = 4827 
      ORDER BY scheduled_date DESC
    `);
    
    console.log(`Found ${courseRequestsResult.rows.length} course requests:`);
    console.table(courseRequestsResult.rows);
    
    // Count by status
    const statusCounts = {};
    courseRequestsResult.rows.forEach(row => {
      statusCounts[row.status] = (statusCounts[row.status] || 0) + 1;
    });
    
    console.log('\nCourse Requests Status counts:');
    console.table(statusCounts);
    
    console.log('\n--- Checking classes table structure ---');
    
    // First check the table structure
    const structureResult = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'classes' 
      ORDER BY ordinal_position
    `);
    
    console.log('Classes table columns:');
    console.table(structureResult.rows);
    
    console.log('\n--- Checking classes table data ---');
    
    const classesResult = await pool.query(`
      SELECT * FROM classes WHERE instructor_id = 4827 LIMIT 5
    `);
    
    console.log(`Found ${classesResult.rows.length} classes (showing first 5):`);
    console.table(classesResult.rows);
    
    // Count all classes for this instructor
    const totalClassesResult = await pool.query(`
      SELECT COUNT(*) as total FROM classes WHERE instructor_id = 4827
    `);
    
    console.log(`\nTotal classes for instructor 4827: ${totalClassesResult.rows[0].total}`);
    
    // Count by status if status column exists
    try {
      const statusCountResult = await pool.query(`
        SELECT status, COUNT(*) as count 
        FROM classes 
        WHERE instructor_id = 4827 
        GROUP BY status
      `);
      
      console.log('\nClasses by status:');
      console.table(statusCountResult.rows);
    } catch (error) {
      console.log('Could not count by status:', error.message);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkCourseRequests(); 