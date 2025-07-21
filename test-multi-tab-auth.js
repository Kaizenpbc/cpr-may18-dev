const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'cpr_jun21',
  user: 'postgres',
  password: 'gtacpr'
});

async function testMultiTabAuth() {
  try {
    console.log('🧪 Testing Multi-Tab Authentication Fix\n');
    
    // Test 1: Check if mike and iffat users exist
    console.log('1. Checking user accounts...');
    const users = await pool.query(`
      SELECT id, username, email, role, organization_id 
      FROM users 
      WHERE username IN ('mike', 'iffat')
      ORDER BY username
    `);
    
    console.log('Found users:');
    users.rows.forEach(user => {
      console.log(`   - ${user.username} (ID: ${user.id}, Role: ${user.role})`);
    });
    
    // Test 2: Check if there are any blacklisted tokens
    console.log('\n2. Checking for blacklisted tokens...');
    const blacklistedTokens = await pool.query(`
      SELECT COUNT(*) as count 
      FROM token_blacklist 
      WHERE expires_at > NOW()
    `);
    
    console.log(`   Blacklisted tokens: ${blacklistedTokens.rows[0].count}`);
    
    // Test 3: Check course data for testing
    console.log('\n3. Checking course data for testing...');
    const courses = await pool.query(`
      SELECT cr.id, cr.status, cr.instructor_id, u.username as instructor_name,
             COUNT(cs.id) as student_count
      FROM course_requests cr
      LEFT JOIN users u ON cr.instructor_id = u.id
      LEFT JOIN course_students cs ON cr.id = cs.course_request_id
      WHERE cr.instructor_id IN (SELECT id FROM users WHERE username IN ('mike', 'akil'))
      GROUP BY cr.id, cr.status, cr.instructor_id, u.username
      ORDER BY cr.id DESC
      LIMIT 5
    `);
    
    console.log('Recent courses:');
    courses.rows.forEach(course => {
      console.log(`   - Course ${course.id}: ${course.instructor_name} (${course.status}) - ${course.student_count} students`);
    });
    
    console.log('\n✅ Multi-tab auth test setup complete!');
    console.log('\n📋 Manual Testing Instructions:');
    console.log('1. Open http://localhost:5173 in two browser tabs');
    console.log('2. Tab 1: Login as mike');
    console.log('3. Tab 2: Login as iffat');
    console.log('4. Tab 1: Logout');
    console.log('5. Tab 1: Should redirect to login page (not show iffat)');
    console.log('6. Tab 2: Should still be logged in as iffat');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await pool.end();
  }
}

testMultiTabAuth(); 