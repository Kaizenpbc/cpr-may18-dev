const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Load environment variables
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      process.env[key.trim()] = value.trim();
    }
  });
}

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'cpr_dev',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function checkUsersTable() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Checking users table structure...\n');
    
    const columnsResult = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position
    `);
    
    console.log('📋 users table columns:');
    columnsResult.rows.forEach(row => {
      console.log(`   - ${row.column_name} (${row.data_type})`);
    });
    
    console.log('\n📋 Sample users data:');
    const sampleResult = await client.query(`
      SELECT * FROM users LIMIT 3
    `);
    
    if (sampleResult.rows.length === 0) {
      console.log('   No users found');
    } else {
      sampleResult.rows.forEach((row, index) => {
        console.log(`   User ${index + 1}:`, row);
      });
    }
    
    // Check if there's a status column or similar
    const hasStatus = columnsResult.rows.some(col => col.column_name === 'status');
    const hasActive = columnsResult.rows.some(col => col.column_name === 'is_active');
    const hasEnabled = columnsResult.rows.some(col => col.column_name === 'enabled');
    
    console.log('\n🔍 Status-related columns:');
    console.log(`   status column: ${hasStatus ? 'YES' : 'NO'}`);
    console.log(`   is_active column: ${hasActive ? 'YES' : 'NO'}`);
    console.log(`   enabled column: ${hasEnabled ? 'YES' : 'NO'}`);
    
  } catch (error) {
    console.error('❌ Error checking users table:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

checkUsersTable(); 