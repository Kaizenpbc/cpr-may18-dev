const { pool } = require('./src/config/database.js');

async function checkIffatCourses() {
  console.log('🔍 Checking Iffat College courses...\n');
  
  try {
    // Find Iffat College
    const orgResult = await pool.query(`
      SELECT id, name FROM organizations 
      WHERE name ILIKE '%iffat%' OR name ILIKE '%ifat%'
    `);
    
    if (orgResult.rows.length === 0) {
      console.log('❌ Iffat College not found');
      return;
    }
    
    const org = orgResult.rows[0];
    console.log(`✅ Found: ${org.name} (ID: ${org.id})`);
    
    // Count completed courses
    const completedResult = await pool.query(`
      SELECT COUNT(*) as count 
      FROM course_requests 
      WHERE organization_id = $1 AND status = 'completed'
    `, [org.id]);
    
    const completedCount = parseInt(completedResult.rows[0].count);
    console.log(`\n📊 Completed courses: ${completedCount}`);
    
    // Get all course statuses
    const statusResult = await pool.query(`
      SELECT status, COUNT(*) as count 
      FROM course_requests 
      WHERE organization_id = $1 
      GROUP BY status
    `, [org.id]);
    
    console.log('\n📈 All courses by status:');
    statusResult.rows.forEach(row => {
      console.log(`   ${row.status}: ${row.count}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkIffatCourses(); 