const { pool } = require('./src/config/database');

async function checkMike() {
  try {
    console.log('Checking for Mike in database...');
    
    // Check by username
    const usernameResult = await pool.query(
      'SELECT id, username, email, role, organization_id, is_active FROM users WHERE username = $1',
      ['Mike']
    );
    
    console.log('Users with username "Mike":', usernameResult.rows);
    
    // Check by email containing 'mike'
    const emailResult = await pool.query(
      'SELECT id, username, email, role, organization_id, is_active FROM users WHERE email ILIKE $1',
      ['%mike%']
    );
    
    console.log('Users with email containing "mike":', emailResult.rows);
    
    // Check all users to see what's in the database
    const allUsers = await pool.query(
      'SELECT id, username, email, role, organization_id, is_active FROM users LIMIT 10'
    );
    
    console.log('First 10 users in database:', allUsers.rows);
    
    await pool.end();
  } catch (error) {
    console.error('Error:', error);
    await pool.end();
  }
}

checkMike(); 