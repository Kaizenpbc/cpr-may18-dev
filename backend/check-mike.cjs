const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'gtacpr',
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: 'cpr_jun21',
});

async function checkMike() {
  try {
    console.log('Checking for Mike in database...');
    
    // First, let's see what columns exist in the users table
    const columnsResult = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `);
    
    console.log('Users table columns:', columnsResult.rows.map(row => row.column_name));
    
    // Check by username
    const usernameResult = await pool.query(
      'SELECT id, username, email, role, organization_id FROM users WHERE username = $1',
      ['Mike']
    );
    
    console.log('Users with username "Mike":', usernameResult.rows);
    
    // Check by email containing 'mike'
    const emailResult = await pool.query(
      'SELECT id, username, email, role, organization_id FROM users WHERE email ILIKE $1',
      ['%mike%']
    );
    
    console.log('Users with email containing "mike":', emailResult.rows);
    
    // Check all users to see what's in the database
    const allUsers = await pool.query(
      'SELECT id, username, email, role, organization_id FROM users LIMIT 10'
    );
    
    console.log('First 10 users in database:', allUsers.rows);
    
    await pool.end();
  } catch (error) {
    console.error('Error:', error);
    await pool.end();
  }
}

checkMike(); 