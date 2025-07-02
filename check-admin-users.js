const { Pool } = require('pg');

const pool = new Pool({
  host: '127.0.0.1',
  port: 5432,
  database: 'cpr_jun21',
  user: 'postgres',
  password: 'gtacpr'
});

async function checkAdminUsers() {
  try {
    console.log('Checking admin users...');
    
    const result = await pool.query(`
      SELECT id, username, email, role, organization_id 
      FROM users 
      WHERE role = 'admin' OR role = 'superadmin'
      ORDER BY username
    `);
    
    console.log(`Found ${result.rows.length} admin users:`);
    result.rows.forEach(user => {
      console.log(`  - ${user.username} (${user.email}) - ${user.role}`);
    });
    
  } catch (error) {
    console.error('Error checking admin users:', error);
  } finally {
    await pool.end();
  }
}

checkAdminUsers(); 