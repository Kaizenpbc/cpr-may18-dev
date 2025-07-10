const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'cpr_may18',
  user: 'postgres',
  password: 'gtacpr'
});

async function checkClassesStructure() {
  try {
    console.log('🔍 Checking classes table structure...\n');
    
    // Check classes table columns
    const columnsResult = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'classes' 
      ORDER BY ordinal_position
    `);
    console.log('📋 Classes table columns:', columnsResult.rows);
    
    // Check a sample class record
    const sampleResult = await pool.query('SELECT * FROM classes WHERE instructor_id = 32 LIMIT 1');
    console.log('\n📚 Sample class record:', sampleResult.rows);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

checkClassesStructure(); 