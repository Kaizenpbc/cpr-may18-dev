import { Pool } from 'pg';

const pool = new Pool({
  host: 'localhost',
  database: 'cpr_may18',
  user: 'postgres',
  password: 'gtacpr'
});

async function checkSysadminUsers() {
  try {
    console.log('Checking sysadmin users...');
    
    // Check all users with sysadmin role
    const result = await pool.query(`
      SELECT id, username, role, 
             CASE WHEN password_hash IS NOT NULL THEN 'HAS_PASSWORD' ELSE 'NO_PASSWORD' END as password_status
      FROM users 
      WHERE role = 'sysadmin' OR username LIKE '%sysadmin%'
      ORDER BY role, username
    `);
    
    console.log('Sysadmin users found:', result.rows.length);
    result.rows.forEach(user => {
      console.log(`- ID: ${user.id}, Username: ${user.username}, Role: ${user.role}, Password: ${user.password_status}`);
    });
    
    // Also check all users to see what's available
    const allUsers = await pool.query(`
      SELECT id, username, role 
      FROM users 
      ORDER BY role, username
    `);
    
    console.log('\nAll users in database:');
    allUsers.rows.forEach(user => {
      console.log(`- ${user.username} (${user.role})`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkSysadminUsers(); 