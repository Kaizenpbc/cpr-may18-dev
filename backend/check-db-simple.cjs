const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'cpr_may18',
  user: 'postgres',
  password: 'gtacpr'
});

async function checkDatabase() {
  try {
    console.log('🔍 Checking database connection...');
    
    // Test connection
    const client = await pool.connect();
    console.log('✅ Database connection successful');
    
    // Check if users table exists
    const tableCheck = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'users'
    `);
    
    console.log('Users table exists:', tableCheck.rows.length > 0);
    
    if (tableCheck.rows.length > 0) {
      // Check users table structure
      const columnsCheck = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        ORDER BY ordinal_position
      `);
      
      console.log('Users table columns:');
      columnsCheck.rows.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type}`);
      });
      
      // Check if there are any users
      const usersCount = await client.query('SELECT COUNT(*) as count FROM users');
      console.log('Number of users in database:', usersCount.rows[0].count);
      
      if (parseInt(usersCount.rows[0].count) > 0) {
        // Get first few users
        const users = await client.query('SELECT id, username, role FROM users LIMIT 5');
        console.log('Sample users:');
        users.rows.forEach(user => {
          console.log(`  - ID: ${user.id}, Username: ${user.username}, Role: ${user.role}`);
        });
      }
    }
    
    client.release();
    
  } catch (error) {
    console.error('❌ Database error:', error.message);
  } finally {
    await pool.end();
  }
}

checkDatabase(); 