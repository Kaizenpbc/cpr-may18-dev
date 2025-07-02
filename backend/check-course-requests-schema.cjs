const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'gtacpr',
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: 'cpr_jun21',
});

async function checkCourseRequestsTable() {
  try {
    console.log('🔍 Checking course_requests table schema...');
    
    // Get table schema
    const schema = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'course_requests'
      ORDER BY ordinal_position;
    `);
    
    console.log('📋 Course requests table columns:');
    schema.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });
    
    // Count records
    const count = await pool.query('SELECT COUNT(*) FROM course_requests');
    console.log(`\n📊 Total course requests: ${count.rows[0].count}`);
    
    // Show sample data
    const sample = await pool.query('SELECT * FROM course_requests LIMIT 3');
    if (sample.rows.length > 0) {
      console.log('\n📝 Sample course requests:');
      sample.rows.forEach((row, i) => {
        console.log(`  Request ${i + 1}:`, row);
      });
    } else {
      console.log('\n📝 No course requests found in the table');
    }
    
  } catch (error) {
    console.error('❌ Error checking course_requests table:', error.message);
  } finally {
    await pool.end();
  }
}

checkCourseRequestsTable(); 