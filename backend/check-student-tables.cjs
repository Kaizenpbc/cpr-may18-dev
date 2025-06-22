const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  password: 'gtacpr',
  host: '127.0.0.1',
  port: 5432,
  database: 'cpr_may18',
});

async function checkStudentTables() {
  try {
    console.log('🔍 Checking all tables with "student" in the name...');
    
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name LIKE '%student%'
      ORDER BY table_name
    `);
    
    console.log('\nTables found:');
    tables.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });
    
    // Check course_students specifically
    console.log('\n🔍 Checking course_students table structure:');
    const columns = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'course_students' 
      ORDER BY ordinal_position
    `);
    
    console.log('\ncourse_students columns:');
    columns.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });
    
    // Test a simple insert to see what happens
    console.log('\n🧪 Testing insert into course_students...');
    try {
      const testResult = await pool.query(`
        INSERT INTO course_students (course_request_id, first_name, last_name, email)
        VALUES (1, 'Test', 'Student', 'test@example.com')
        RETURNING id, first_name, last_name
      `);
      console.log('✅ Test insert successful:', testResult.rows[0]);
      
      // Clean up test data
      await pool.query('DELETE FROM course_students WHERE first_name = $1', ['Test']);
      console.log('✅ Test data cleaned up');
    } catch (insertError) {
      console.error('❌ Test insert failed:', insertError.message);
    }
    
  } catch (error) {
    console.error('❌ Error checking tables:', error);
  } finally {
    await pool.end();
  }
}

checkStudentTables(); 