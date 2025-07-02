const { Pool } = require('pg');

const pool = new Pool({
  host: '127.0.0.1',
  port: 5432,
  database: 'cpr_jun21',
  user: 'postgres',
  password: 'gtacpr'
});

async function checkSysadminUser() {
  try {
    console.log('Checking sysadmin user...');
    
    const result = await pool.query(`
      SELECT id, username, email, role, organization_id, created_at
      FROM users 
      WHERE username = 'sysadmin' OR role = 'sysadmin'
      ORDER BY username
    `);
    
    if (result.rows.length === 0) {
      console.log('❌ No sysadmin user found in database');
      console.log('\nAvailable users:');
      
      const allUsers = await pool.query(`
        SELECT username, email, role, created_at
        FROM users 
        ORDER BY username
      `);
      
      allUsers.rows.forEach(user => {
        console.log(`  - ${user.username} (${user.email}) - ${user.role}`);
      });
    } else {
      console.log(`✅ Found ${result.rows.length} sysadmin user(s):`);
      result.rows.forEach(user => {
        console.log(`  - ${user.username} (${user.email}) - ${user.role} - Created: ${user.created_at}`);
      });
    }
    
  } catch (error) {
    console.error('Error checking sysadmin user:', error);
  } finally {
    await pool.end();
  }
}

checkSysadminUser(); 