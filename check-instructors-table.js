const { pool } = require('./src/config/database.js');

async function checkInstructorsTable() {
  try {
    console.log('Checking instructors table structure...');
    
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'instructors' 
      ORDER BY ordinal_position
    `);
    
    console.log('Instructors table columns:');
    result.rows.forEach(row => {
      console.log(`- ${row.column_name} (${row.data_type})`);
    });
    
    // Also check if there are any instructors
    const instructorsResult = await pool.query('SELECT COUNT(*) as count FROM instructors');
    console.log(`\nTotal instructors: ${instructorsResult.rows[0].count}`);
    
    if (instructorsResult.rows[0].count > 0) {
      const sampleResult = await pool.query('SELECT * FROM instructors LIMIT 1');
      console.log('\nSample instructor record:');
      console.log(sampleResult.rows[0]);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkInstructorsTable(); 