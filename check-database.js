const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  password: 'gtacpr',
  host: '127.0.0.1',
  port: 5432,
  database: 'cpr_jun21'
});

async function checkDatabase() {
  console.log('🔍 Checking database...\n');

  try {
    // Test connection
    const client = await pool.connect();
    console.log('✅ Database connection successful');

    // Check if users table exists
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'users'
    `);

    if (tables.rows.length > 0) {
      console.log('✅ Users table exists');
      
      // Check users count
      const userCount = await client.query('SELECT COUNT(*) as count FROM users');
      console.log(`📊 Total users: ${userCount.rows[0].count}`);
      
      // Get sample users
      const users = await client.query(`
        SELECT id, email, role, created_at 
        FROM users 
        LIMIT 5
      `);
      
      console.log('\n📋 Sample users:');
      users.rows.forEach(user => {
        console.log(`   ${user.email} (${user.role}) - ID: ${user.id}`);
      });
      
    } else {
      console.log('❌ Users table does not exist');
    }

    client.release();

  } catch (error) {
    console.error('❌ Database error:', error.message);
  } finally {
    await pool.end();
  }
}

checkDatabase(); 