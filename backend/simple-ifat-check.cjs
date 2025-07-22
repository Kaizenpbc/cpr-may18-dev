const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  password: 'gtacpr',
  host: '127.0.0.1',
  port: 5432,
  database: 'cpr_jun21'
});

async function simpleCheck() {
  console.log('🔍 Simple check for Iffat College completed courses...\n');
  
  try {
    // Just count completed courses for organization ID 2 (Iffat College)
    const result = await pool.query(`
      SELECT COUNT(*) as completed_count 
      FROM course_requests 
      WHERE organization_id = 2 AND status = 'completed'
    `);
    
    const count = parseInt(result.rows[0].completed_count);
    console.log(`✅ Iffat College has ${count} completed courses`);
    
    // Also get total courses
    const totalResult = await pool.query(`
      SELECT COUNT(*) as total_count 
      FROM course_requests 
      WHERE organization_id = 2
    `);
    
    const total = parseInt(totalResult.rows[0].total_count);
    console.log(`📊 Total courses: ${total}`);
    
    // Get status breakdown
    const statusResult = await pool.query(`
      SELECT status, COUNT(*) as count 
      FROM course_requests 
      WHERE organization_id = 2 
      GROUP BY status
    `);
    
    console.log('\n📈 Course status breakdown:');
    statusResult.rows.forEach(row => {
      console.log(`   ${row.status}: ${row.count}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

simpleCheck(); 