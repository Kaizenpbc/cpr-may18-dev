const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'cpr_jun21',
  password: 'gtacpr',
  port: 5432,
});

async function checkInstructorAvailability() {
  try {
    console.log('🔍 Checking instructor_availability table...');
    
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
    
    // Get table structure
    const structure = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'instructor_availability'
      ORDER BY ordinal_position;
    `);
    
    console.log('\n📋 Table structure:');
    structure.rows.forEach(col => {
      console.log(`  ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });
    
    // Check all availability records
    const allRecords = await pool.query(`
      SELECT * FROM instructor_availability 
      ORDER BY date ASC;
    `);
    
    console.log(`\n📊 Total availability records: ${allRecords.rows.length}`);
    
    if (allRecords.rows.length > 0) {
      console.log('\n📅 All availability records:');
      allRecords.rows.forEach((record, index) => {
        console.log(`  ${index + 1}. Instructor ID: ${record.instructor_id}, Date: ${record.date}, Status: ${record.status}`);
      });
    }
    
    // Check specifically for instructor ID 2 (the test instructor)
    const instructor2Records = await pool.query(`
      SELECT * FROM instructor_availability 
      WHERE instructor_id = 2
      ORDER BY date ASC;
    `);
    
    console.log(`\n👤 Availability records for instructor ID 2: ${instructor2Records.rows.length}`);
    
    if (instructor2Records.rows.length > 0) {
      console.log('\n📅 Instructor 2 availability records:');
      instructor2Records.rows.forEach((record, index) => {
        console.log(`  ${index + 1}. Date: ${record.date}, Status: ${record.status}, Created: ${record.created_at}`);
      });
    } else {
      console.log('❌ No availability records found for instructor ID 2');
    }
    
    // Check future availability (dates >= today)
    const futureRecords = await pool.query(`
      SELECT * FROM instructor_availability 
      WHERE date >= CURRENT_DATE
      ORDER BY date ASC;
    `);
    
    console.log(`\n🔮 Future availability records (>= today): ${futureRecords.rows.length}`);
    
    if (futureRecords.rows.length > 0) {
      console.log('\n📅 Future availability records:');
      futureRecords.rows.forEach((record, index) => {
        console.log(`  ${index + 1}. Instructor ID: ${record.instructor_id}, Date: ${record.date}, Status: ${record.status}`);
      });
    }
    
    // Check if instructor 2 exists in users table
    const instructorCheck = await pool.query(`
      SELECT id, username, email, role FROM users WHERE id = 2;
    `);
    
    console.log('\n👤 Instructor 2 user record:');
    if (instructorCheck.rows.length > 0) {
      console.log(`  ID: ${instructorCheck.rows[0].id}`);
      console.log(`  Username: ${instructorCheck.rows[0].username}`);
      console.log(`  Email: ${instructorCheck.rows[0].email}`);
      console.log(`  Role: ${instructorCheck.rows[0].role}`);
    } else {
      console.log('❌ Instructor ID 2 not found in users table');
    }
    
  } catch (error) {
    console.error('❌ Error checking instructor availability:', error);
  } finally {
    await pool.end();
  }
}

checkInstructorAvailability(); 