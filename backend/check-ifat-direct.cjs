const { Pool } = require('pg');

// Use the same database configuration as the backend
const pool = new Pool({
  user: 'postgres',
  password: 'gtacpr',
  host: '127.0.0.1',
  port: 5432,
  database: 'cpr_jun21'
});

async function checkIffatCourses() {
  console.log('🔍 Checking Iffat College courses...\n');
  
  try {
    // Test connection
    const testResult = await pool.query('SELECT 1 as test');
    console.log('✅ Database connection successful');
    
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
      ORDER BY status
    `, [org.id]);
    
    console.log('\n📈 All courses by status:');
    statusResult.rows.forEach(row => {
      console.log(`   ${row.status}: ${row.count}`);
    });
    
    // Get recent completed courses
    const recentResult = await pool.query(`
      SELECT 
        cr.id,
        cr.confirmed_date,
        cr.location,
        ct.name as course_type,
        cr.students_enrolled,
        i.invoice_number,
        i.status as invoice_status
      FROM course_requests cr
      LEFT JOIN class_types ct ON cr.course_type_id = ct.id
      LEFT JOIN invoices i ON cr.id = i.course_request_id
      WHERE cr.organization_id = $1 AND cr.status = 'completed'
      ORDER BY cr.confirmed_date DESC
      LIMIT 5
    `, [org.id]);
    
    if (recentResult.rows.length > 0) {
      console.log('\n📋 Recent completed courses:');
      recentResult.rows.forEach((course, index) => {
        console.log(`\n   ${index + 1}. Course ID: ${course.id}`);
        console.log(`      Date: ${course.confirmed_date}`);
        console.log(`      Location: ${course.location}`);
        console.log(`      Type: ${course.course_type}`);
        console.log(`      Students: ${course.students_enrolled}`);
        console.log(`      Invoice: ${course.invoice_number || 'Not created'}`);
        console.log(`      Invoice Status: ${course.invoice_status || 'N/A'}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkIffatCourses(); 