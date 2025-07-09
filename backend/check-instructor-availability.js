const { pool } = require('./src/config/database');

async function checkInstructorAvailability() {
  try {
    console.log('Checking instructor_availability table...');
    
    // Check if table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'instructor_availability'
      );
    `);
    
    if (!tableCheck.rows[0].exists) {
      console.log('❌ instructor_availability table does not exist!');
      return;
    }
    
    console.log('✅ instructor_availability table exists');
    
    // Check table structure
    const structure = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'instructor_availability'
      ORDER BY ordinal_position;
    `);
    
    console.log('\nTable structure:');
    structure.rows.forEach(col => {
      console.log(`  ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });
    
    // Check for data
    const data = await pool.query('SELECT * FROM instructor_availability LIMIT 10');
    
    console.log(`\nFound ${data.rows.length} availability records:`);
    data.rows.forEach((row, index) => {
      console.log(`  ${index + 1}. Instructor ID: ${row.instructor_id}, Date: ${row.date}, Status: ${row.status}`);
    });
    
    // Check for specific instructor (assuming instructor ID 1 exists)
    const instructorData = await pool.query('SELECT * FROM instructor_availability WHERE instructor_id = 1');
    console.log(`\nAvailability for instructor ID 1: ${instructorData.rows.length} records`);
    
    // Check users table for instructors
    const instructors = await pool.query(`
      SELECT id, username, email, role 
      FROM users 
      WHERE role = 'instructor' 
      LIMIT 5
    `);
    
    console.log('\nInstructors in users table:');
    instructors.rows.forEach(instructor => {
      console.log(`  ID: ${instructor.id}, Username: ${instructor.username}, Email: ${instructor.email}`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkInstructorAvailability(); 