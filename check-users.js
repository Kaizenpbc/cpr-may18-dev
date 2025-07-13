const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'cpr_jun21',
  user: 'postgres',
  password: 'gtacpr'
});

async function checkUsers() {
  try {
    // First check what columns exist in users table
    const columnsResult = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'users'");
    console.log('Available columns:', columnsResult.rows.map(r => r.column_name));
    
    // Then get user data
    const result = await pool.query('SELECT username, role FROM users WHERE username IN ($1, $2)', ['orguser', 'iffat']);
    console.log('Users:', result.rows);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkUsers(); 