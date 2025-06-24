const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'cpr_jun21',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
});

async function checkCourseRequests() {
  try {
    console.log('🔍 Checking course_requests table...');
    
    // Check table structure
    const structureResult = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'course_requests' 
      ORDER BY ordinal_position
    `);
    
    console.log('\n📋 Table Structure:');
    structureResult.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });
    
    // Check sample data using the actual column name
    const dataResult = await pool.query(`
      SELECT id, date_requested, scheduled_date, status, organization_id, course_type_id
      FROM course_requests 
      ORDER BY created_at DESC 
      LIMIT 5
    `);
    
    console.log('\n📊 Sample Data:');
    if (dataResult.rows.length === 0) {
      console.log('  No course requests found in database');
    } else {
      dataResult.rows.forEach(row => {
        console.log(`  ID: ${row.id}`);
        console.log(`    date_requested: ${row.date_requested}`);
        console.log(`    scheduled_date: ${row.scheduled_date}`);
        console.log(`    status: ${row.status}`);
        console.log(`    organization_id: ${row.organization_id}`);
        console.log(`    course_type_id: ${row.course_type_id}`);
        console.log('');
      });
    }
    
    // Check for null date_requested values
    const nullCheckResult = await pool.query(`
      SELECT COUNT(*) as total_count,
             COUNT(date_requested) as non_null_count,
             COUNT(*) - COUNT(date_requested) as null_count
      FROM course_requests
    `);
    
    console.log('\n🔍 Null Check:');
    const stats = nullCheckResult.rows[0];
    console.log(`  Total records: ${stats.total_count}`);
    console.log(`  Non-null date_requested: ${stats.non_null_count}`);
    console.log(`  Null date_requested: ${stats.null_count}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkCourseRequests(); 