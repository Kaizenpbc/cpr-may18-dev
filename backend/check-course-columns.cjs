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

async function checkCourseColumns() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Checking course_requests table structure...\n');
    
    const columnsResult = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'course_requests' 
      ORDER BY ordinal_position
    `);
    
    console.log('📋 course_requests table columns:');
    columnsResult.rows.forEach(row => {
      console.log(`   - ${row.column_name} (${row.data_type})`);
    });
    
    console.log('\n📋 Sample course_requests data:');
    const sampleResult = await client.query(`
      SELECT * FROM course_requests LIMIT 3
    `);
    
    if (sampleResult.rows.length === 0) {
      console.log('   No course requests found');
    } else {
      sampleResult.rows.forEach((row, index) => {
        console.log(`   Record ${index + 1}:`, row);
      });
    }
    
  } catch (error) {
    console.error('❌ Error checking columns:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

checkCourseColumns(); 