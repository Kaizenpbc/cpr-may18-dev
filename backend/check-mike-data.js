const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'cpr_dev',
  user: 'postgres',
  password: 'gtacpr'
});

async function checkMikeData() {
  try {
    console.log('🔍 Checking Mike\'s data (User ID: 32)...\n');
    
    // Check Mike's user info
    const userResult = await pool.query('SELECT id, username, role FROM users WHERE id = 32');
    console.log('👤 Mike\'s user info:', userResult.rows);
    
    // Check classes table for Mike
    const classesResult = await pool.query(`
      SELECT 
        c.id, 
        c.organization_id, 
        o.name as org_name,
        c.status,
        c.start_time,
        c.location
      FROM classes c 
      LEFT JOIN organizations o ON c.organization_id = o.id 
      WHERE c.instructor_id = 32
    `);
    console.log('\n📚 Classes for Mike:', classesResult.rows);
    
    // Check course_requests table for Mike
    const courseRequestsResult = await pool.query(`
      SELECT 
        cr.id, 
        cr.organization_id, 
        o.name as org_name,
        cr.status,
        cr.confirmed_date,
        cr.location
      FROM course_requests cr 
      LEFT JOIN organizations o ON cr.organization_id = o.id 
      WHERE cr.instructor_id = 32
    `);
    console.log('\n📋 Course Requests for Mike:', courseRequestsResult.rows);
    
    // Check all organizations
    const orgsResult = await pool.query('SELECT id, name FROM organizations ORDER BY id');
    console.log('\n🏢 All organizations:', orgsResult.rows);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

checkMikeData(); 