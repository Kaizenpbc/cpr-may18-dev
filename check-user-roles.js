const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'cpr_jun21',
  user: 'postgres',
  password: 'gtacpr'
});

async function checkUserRoles() {
  try {
    console.log('🔍 Checking user roles...\n');
    
    const result = await pool.query(`
      SELECT id, username, email, role 
      FROM users 
      WHERE username IN ('akil', 'accountant', 'mike', 'iffat')
      ORDER BY username
    `);
    
    console.log('User roles:');
    result.rows.forEach(user => {
      console.log(`  - ${user.username}: ${user.role} (ID: ${user.id})`);
    });
    
    console.log('\n✅ User roles check complete!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

checkUserRoles(); 