const { Pool } = require('pg');

const pool = new Pool({
  host: '127.0.0.1',
  port: 5432,
  database: 'cpr_jun21',
  user: 'postgres',
  password: 'gtacpr'
});

async function checkIffat() {
  try {
    const result = await pool.query('SELECT id, username, email, role, password_hash FROM users WHERE username = $1', ['iffat']);
    
    if (result.rows.length > 0) {
      const user = result.rows[0];
      console.log('Iffat user found:');
      console.log('  ID:', user.id);
      console.log('  Username:', user.username);
      console.log('  Email:', user.email);
      console.log('  Role:', user.role);
      console.log('  Password Hash:', user.password_hash);
    } else {
      console.log('Iffat user not found');
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkIffat(); 