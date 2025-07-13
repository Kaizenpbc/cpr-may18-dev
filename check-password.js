const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'cpr_jun21',
  user: 'postgres',
  password: 'gtacpr'
});

async function checkPassword() {
  try {
    const result = await pool.query('SELECT username, password_hash FROM users WHERE username = $1', ['iffat']);
    console.log('User data:', result.rows[0]);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkPassword(); 