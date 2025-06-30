import { pool } from './src/config/database.ts';

async function checkDatabase() {
  try {
    console.log('Testing database connection...');
    const result = await pool.query('SELECT 1 as test');
    console.log('✅ Database connection successful:', result.rows[0]);
    
    // Check if users table exists and has data
    const userCount = await pool.query('SELECT COUNT(*) FROM users');
    console.log('📊 Users in database:', userCount.rows[0].count);
    
    // Show a few sample users
    const sampleUsers = await pool.query('SELECT id, username, role FROM users LIMIT 5');
    console.log('👥 Sample users:', sampleUsers.rows);
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
  } finally {
    await pool.end();
  }
}

checkDatabase(); 