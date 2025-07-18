const { Pool } = require('pg');

const pool = new Pool({
  host: '127.0.0.1',
  port: 5432,
  database: 'cpr_jun21',
  user: 'postgres',
  password: 'gtacpr'
});

async function checkUsers() {
  try {
    console.log('🔍 Checking available users in database...\n');
    
    const result = await pool.query('SELECT username, role, email FROM users ORDER BY username');
    
    console.log('Available users:');
    result.rows.forEach((user, index) => {
      console.log(`${index + 1}. ${user.username} (${user.role})`);
    });
    
    if (result.rows.length === 0) {
      console.log('No users found in database');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkUsers(); 