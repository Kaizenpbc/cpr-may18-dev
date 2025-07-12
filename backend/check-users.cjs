const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'gtacpr',
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: 'cpr_jun21',
});

async function checkUsers() {
  try {
    console.log('Checking all users in database...');
    
    // Get all users
    const result = await pool.query(
      'SELECT id, username, email, role, organization_id FROM users ORDER BY id'
    );
    
    console.log('All users in database:');
    result.rows.forEach((user, index) => {
      console.log(`${index + 1}. ID: ${user.id}, Username: "${user.username}", Email: "${user.email}", Role: ${user.role}, Org ID: ${user.organization_id}`);
    });
    
    // Check specifically for Mike
    const mikeResult = await pool.query(
      'SELECT id, username, email, role, organization_id FROM users WHERE username ILIKE $1 OR email ILIKE $2',
      ['%mike%', '%mike%']
    );
    
    console.log('\nUsers matching "mike":');
    mikeResult.rows.forEach((user, index) => {
      console.log(`${index + 1}. ID: ${user.id}, Username: "${user.username}", Email: "${user.email}", Role: ${user.role}, Org ID: ${user.organization_id}`);
    });
    
    await pool.end();
  } catch (error) {
    console.error('Error:', error);
    await pool.end();
  }
}

checkUsers(); 