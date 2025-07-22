const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  password: 'gtacpr',
  host: '127.0.0.1',
  port: 5432,
  database: 'cpr_jun21'
});

async function checkIffatSession() {
  console.log('🔍 Checking Iffat College session and authentication...\n');
  
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
        u.last_login,
        u.created_at,
        u.is_active
      FROM users u
      WHERE u.organization_id = $1
      ORDER BY u.last_login DESC
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
        console.log(`      Last Login: ${user.last_login || 'Never'}`);
        console.log(`      Created: ${user.created_at}`);
      });
    }
    
    // Check if there are any active sessions (if sessions table exists)
    try {
      const sessionsResult = await pool.query(`
        SELECT 
          s.id,
          s.user_id,
          s.token,
          s.created_at,
          s.expires_at,
          u.username
        FROM sessions s
        JOIN users u ON s.user_id = u.id
        WHERE u.organization_id = $1
        ORDER BY s.created_at DESC
      `, [org.id]);
      
      console.log(`\n🔐 Active Sessions for ${org.name}:`);
      if (sessionsResult.rows.length === 0) {
        console.log('   No active sessions found');
      } else {
        sessionsResult.rows.forEach((session, index) => {
          console.log(`\n   ${index + 1}. Session ID: ${session.id}`);
          console.log(`      User: ${session.username} (ID: ${session.user_id})`);
          console.log(`      Created: ${session.created_at}`);
          console.log(`      Expires: ${session.expires_at}`);
          console.log(`      Token: ${session.token ? session.token.substring(0, 20) + '...' : 'N/A'}`);
        });
      }
    } catch (error) {
      console.log('\n⚠️  Sessions table not found or error accessing it');
    }
    
    // Check recent activity for this organization
    const recentActivityResult = await pool.query(`
      SELECT 
        cr.id as course_id,
        cr.status,
        cr.created_at,
        cr.updated_at,
        u.username as created_by
      FROM course_requests cr
      LEFT JOIN users u ON cr.created_by = u.id
      WHERE cr.organization_id = $1
      ORDER BY cr.updated_at DESC
      LIMIT 5
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
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkIffatSession(); 