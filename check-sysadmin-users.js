const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'cpr_jun21',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'gtacpr',
});

async function checkSysadminUsers() {
  try {
    console.log('Checking sysadmin users...');
    
    const users = await pool.query(`
      SELECT 
        id,
        username,
        email,
        role,
        first_name,
        last_name,
        is_active,
        created_at
      FROM users 
      WHERE role = 'sysadmin'
      ORDER BY id;
    `);
    
    console.log('\n📋 Sysadmin users:');
    if (users.rows.length > 0) {
      users.rows.forEach(user => {
        console.log(`  - ID: ${user.id}`);
        console.log(`    Username: ${user.username}`);
        console.log(`    Email: ${user.email}`);
        console.log(`    Name: ${user.first_name} ${user.last_name}`);
        console.log(`    Active: ${user.is_active}`);
        console.log(`    Created: ${user.created_at}`);
        console.log('');
      });
    } else {
      console.log('  No sysadmin users found');
    }
    
    // Also check all users to see what roles exist
    const allUsers = await pool.query(`
      SELECT DISTINCT role, COUNT(*) as count
      FROM users 
      GROUP BY role
      ORDER BY role;
    `);
    
    console.log('📋 All user roles:');
    allUsers.rows.forEach(role => {
      console.log(`  - ${role.role}: ${role.count} users`);
    });
    
  } catch (error) {
    console.error('Error checking sysadmin users:', error);
  } finally {
    await pool.end();
  }
}

checkSysadminUsers(); 