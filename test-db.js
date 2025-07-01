const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  password: 'gtacpr',
  host: '127.0.0.1',
  port: 5432,
  database: 'cpr_jun21',
});

async function testConnection() {
  try {
    console.log('🔍 Testing database connection...');
    
    // Test basic connection
    const result = await pool.query('SELECT current_database(), version()');
    console.log('✅ Connected to database:', result.rows[0].current_database);
    
    // Test classes table
    const classesResult = await pool.query('SELECT column_name FROM information_schema.columns WHERE table_name = \'classes\' ORDER BY ordinal_position');
    console.log('✅ Classes table columns:', classesResult.rows.map(r => r.column_name));
    
    // Test instructor_id column specifically
    const instructorCheck = await pool.query('SELECT instructor_id FROM classes LIMIT 1');
    console.log('✅ instructor_id column exists and accessible');
    
    // Test class_type_id column specifically
    const classTypeCheck = await pool.query('SELECT class_type_id FROM classes LIMIT 1');
    console.log('✅ class_type_id column exists and accessible');
    
    console.log('🎉 All database tests passed!');
    
  } catch (error) {
    console.error('❌ Database test failed:', error.message);
  } finally {
    await pool.end();
  }
}

testConnection(); 