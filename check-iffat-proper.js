const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  password: 'gtacpr',
  host: '127.0.0.1',
  port: 5432,
  database: 'cpr_jun21'
});

async function checkIffatProper() {
  console.log('🔍 Checking Iffat College users and session status...\n');
  
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
        u.updated_at
      FROM users u
      WHERE u.organization_id = $1
      ORDER BY u.created_at DESC
    `, [org.id]);
    
    console.log(`\n👥 Users for ${org.name}:`);
    if (usersResult.rows.length === 0) {
      console.log('   No users found');
      console.log('   This means Iffat College has no valid login credentials!');
    } else {
      usersResult.rows.forEach((user, index) => {
        console.log(`\n   ${index + 1}. User ID: ${user.id}`);
        console.log(`      Username: ${user.username}`);
        console.log(`      Email: ${user.email}`);
        console.log(`      Role: ${user.role}`);
        console.log(`      Created: ${user.created_at}`);
        console.log(`      Last Updated: ${user.updated_at}`);
      });
    }
    
    // Check if there are any recent course requests (activity)
    const recentActivityResult = await pool.query(`
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
    
    console.log(`\n📊 Recent Activity for ${org.name}:`);
    if (recentActivityResult.rows.length > 0) {
      recentActivityResult.rows.forEach((activity, index) => {
        console.log(`\n   ${index + 1}. Course ID: ${activity.course_id}`);
        console.log(`      Status: ${activity.status}`);
        console.log(`      Created: ${activity.created_at}`);
        console.log(`      Updated: ${activity.updated_at}`);
        console.log(`      Created By: ${activity.created_by || 'N/A'}`);
      });
    }
    
    // Summary
    console.log('\n📈 Summary:');
    console.log(`   Organization: ${org.name}`);
    console.log(`   Users: ${usersResult.rows.length}`);
    console.log(`   Recent Courses: ${recentActivityResult.rows.length}`);
    
    if (usersResult.rows.length === 0) {
      console.log('\n⚠️  WARNING: Iffat College has no users!');
      console.log('   This means they cannot log in to the system.');
      console.log('   You need to create a user account for them.');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkIffatProper(); 