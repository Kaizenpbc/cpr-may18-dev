const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  password: 'gtacpr',
  host: '127.0.0.1',
  port: 5432,
  database: 'cpr_jun21'
});

async function checkIffatUsers() {
  console.log('🔍 Checking Iffat College users...\n');
  
  try {
    // First, find Iffat College organization
    const orgResult = await pool.query(`
      SELECT id, name FROM organizations 
      WHERE name ILIKE '%iffat%' OR name ILIKE '%ifat%'
    `);
    
    if (orgResult.rows.length === 0) {
      console.log('❌ Iffat College not found');
      return;
    }
    
    const org = orgResult.rows[0];
    console.log(`✅ Found organization: ${org.name} (ID: ${org.id})`);
    
    // Check users associated with Iffat College
    const usersResult = await pool.query(`
      SELECT 
        u.id,
        u.username,
        u.email,
        u.role,
        u.organization_id,
        u.created_at,
        u.is_active
      FROM users u
      WHERE u.organization_id = $1
      ORDER BY u.created_at DESC
    `, [org.id]);
    
    console.log(`\n👥 Users for ${org.name}:`);
    if (usersResult.rows.length === 0) {
      console.log('   No users found');
    } else {
      usersResult.rows.forEach((user, index) => {
        console.log(`\n   ${index + 1}. User ID: ${user.id}`);
        console.log(`      Username: ${user.username}`);
        console.log(`      Email: ${user.email}`);
        console.log(`      Role: ${user.role}`);
        console.log(`      Active: ${user.is_active}`);
        console.log(`      Created: ${user.created_at}`);
      });
    }
    
    // Check if any of these users have recent activity
    if (usersResult.rows.length > 0) {
      const userIds = usersResult.rows.map(u => u.id);
      console.log(`\n📊 Checking recent activity for users: ${userIds.join(', ')}`);
      
      // Check recent course requests
      const recentCoursesResult = await pool.query(`
        SELECT 
          cr.id,
          cr.status,
          cr.created_at,
          cr.updated_at,
          cr.created_by
        FROM course_requests cr
        WHERE cr.organization_id = $1
        ORDER BY cr.updated_at DESC
        LIMIT 3
      `, [org.id]);
      
      console.log('\n📋 Recent course activity:');
      recentCoursesResult.rows.forEach((course, index) => {
        console.log(`\n   ${index + 1}. Course ID: ${course.id}`);
        console.log(`      Status: ${course.status}`);
        console.log(`      Created: ${course.created_at}`);
        console.log(`      Updated: ${course.updated_at}`);
        console.log(`      Created By: ${course.created_by || 'N/A'}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkIffatUsers(); 