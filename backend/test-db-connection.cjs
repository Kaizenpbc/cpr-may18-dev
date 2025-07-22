const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'gtacpr',
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: 'cpr_jun21'
});

async function testConnection() {
  console.log('🔍 Testing database connection...');
  
  try {
    const result = await pool.query('SELECT 1 as test');
    console.log('✅ Database connection successful:', result.rows[0]);
    
    // Test organizations table
    const orgResult = await pool.query('SELECT COUNT(*) as count FROM organizations');
    console.log('✅ Organizations table accessible:', orgResult.rows[0]);
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
  } finally {
    await pool.end();
  }
}

testConnection(); 