const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  database: 'cpr_training_db',
  user: 'postgres',
  password: 'gtacpr'
});

async function checkDatabase() {
  try {
    console.log('Checking course_students table structure...');
    
    // Check columns
    const columnsResult = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'course_students' 
      ORDER BY ordinal_position
    `);
    
    console.log('\ncourse_students columns:');
    columnsResult.rows.forEach(row => {
      console.log(`  - ${row.column_name} (${row.data_type})`);
    });
    
    // Check sample data
    const sampleResult = await pool.query('SELECT * FROM course_students LIMIT 1');
    if (sampleResult.rows.length > 0) {
      console.log('\nSample course_students row:');
      console.log(JSON.stringify(sampleResult.rows[0], null, 2));
    } else {
      console.log('\nNo data in course_students table');
    }
    
    // Check attendance data
    const attendanceResult = await pool.query(`
      SELECT COUNT(*) as total_students,
             COUNT(CASE WHEN attended = true THEN 1 END) as attended_count
      FROM course_students
    `);
    
    console.log('\nAttendance summary:');
    console.log(JSON.stringify(attendanceResult.rows[0], null, 2));
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkDatabase(); 