const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'cpr_jun21',
  password: 'gtacpr',
  port: 5432,
});

async function checkUsers() {
  try {
    console.log('Checking available users...');
    
    const result = await pool.query(`
      SELECT username, role, status, email 
      FROM users 
      WHERE status = 'active' 
      ORDER BY username
    `);
    
    console.log('\nAvailable users:');
    if (result.rows.length === 0) {
      console.log('No active users found');
    } else {
      result.rows.forEach(user => {
        console.log(`- ${user.username} (${user.role}) - ${user.email || 'no email'}`);
      });
    }
    
    // Also check for sysadmin user
    const sysadminResult = await pool.query(`
      SELECT username, role, status 
      FROM users 
      WHERE username = 'sysadmin'
    `);
    
    if (sysadminResult.rows.length > 0) {
      console.log('\nSysadmin user:');
      sysadminResult.rows.forEach(user => {
        console.log(`- ${user.username} (${user.role}) - ${user.status}`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkUsers(); 