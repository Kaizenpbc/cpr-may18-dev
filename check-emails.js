const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'cpr_jun21',
  user: 'postgres',
  password: 'gtacpr'
});

async function checkEmails() {
  try {
    // Query all users
    const result = await pool.query('SELECT username, email FROM users ORDER BY username');
    const users = result.rows;
    
    if (users.length === 0) {
      console.log('No users found.');
      return;
    }
    
    // Print table header
    console.log('| Username           | Email                      |');
    console.log('|--------------------|----------------------------|');
    // Print each user
    users.forEach(user => {
      const uname = (user.username || '').padEnd(19, ' ');
      const email = (user.email || '').padEnd(27, ' ');
      console.log(`| ${uname}| ${email}|`);
    });
  } catch (error) {
    console.error('Database error:', error.message);
  } finally {
    await pool.end();
  }
}

checkEmails(); 