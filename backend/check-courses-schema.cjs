const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'gtacpr',
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: 'cpr_jun21',
});

async function checkCoursesTable() {
  try {
    console.log('🔍 Checking courses table schema...');
    
    // Check if table exists
    const tableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'courses'
      );
    `);
    
    if (!tableExists.rows[0].exists) {
      console.log('❌ Courses table does not exist');
      return;
    }
    
    // Get table schema
    const schema = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'courses'
      ORDER BY ordinal_position;
    `);
    
    console.log('📋 Courses table columns:');
    schema.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });
    
    // Count records
    const count = await pool.query('SELECT COUNT(*) FROM courses');
    console.log(`\n📊 Total courses: ${count.rows[0].count}`);
    
    // Show sample data
    const sample = await pool.query('SELECT * FROM courses LIMIT 3');
    if (sample.rows.length > 0) {
      console.log('\n📝 Sample courses:');
      sample.rows.forEach((row, i) => {
        console.log(`  Course ${i + 1}:`, row);
      });
    } else {
      console.log('\n📝 No courses found in the table');
    }
    
  } catch (error) {
    console.error('❌ Error checking courses table:', error.message);
  } finally {
    await pool.end();
  }
}

checkCoursesTable(); 