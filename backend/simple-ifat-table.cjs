const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  password: 'gtacpr',
  host: '127.0.0.1',
  port: 5432,
  database: 'cpr_jun21'
});

async function showSimpleTable() {
  console.log('🔍 Iffat College Completed Courses with Instructors\n');
  
  try {
    // Simple query with basic columns
    const result = await pool.query(`
      SELECT 
        cr.id,
        cr.confirmed_date,
        cr.location,
        u.username as instructor
      FROM course_requests cr
      LEFT JOIN users u ON cr.instructor_id = u.id
      WHERE cr.organization_id = 2 AND cr.status = 'completed'
      ORDER BY cr.confirmed_date DESC
    `);
    
    if (result.rows.length === 0) {
      console.log('❌ No completed courses found');
      return;
    }
    
    console.log(`📊 Found ${result.rows.length} completed courses:\n`);
    
    // Simple table
    console.log('┌──────────┬────────────┬─────────────────┬─────────────────┐');
    console.log('│ Course ID│    Date    │    Location     │   Instructor    │');
    console.log('├──────────┼────────────┼─────────────────┼─────────────────┤');
    
    result.rows.forEach((course, index) => {
      const id = course.id.toString().padEnd(8);
      const date = course.confirmed_date ? new Date(course.confirmed_date).toLocaleDateString() : 'N/A';
      const location = (course.location || 'N/A').padEnd(15);
      const instructor = (course.instructor || 'N/A').padEnd(15);
      
      console.log(`│ ${id} │ ${date.padEnd(10)} │ ${location} │ ${instructor} │`);
      
      if (index < result.rows.length - 1) {
        console.log('├──────────┼────────────┼─────────────────┼─────────────────┤');
      }
    });
    
    console.log('└──────────┴────────────┴─────────────────┴─────────────────┘');
    
    // Summary
    console.log('\n📈 Summary:');
    console.log(`   Total courses: ${result.rows.length}`);
    
    const instructors = [...new Set(result.rows.map(course => course.instructor).filter(name => name !== 'N/A'))];
    console.log(`   Instructors: ${instructors.join(', ')}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

showSimpleTable(); 