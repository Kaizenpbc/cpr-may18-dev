const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  password: 'gtacpr',
  host: '127.0.0.1',
  port: 5432,
  database: 'cpr_jun21',
});

async function fixCourseStudents() {
  try {
    console.log('🔧 Fixing course_students table in cpr_jun21...');
    
    // Check current columns
    const columns = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'course_students' 
      ORDER BY ordinal_position
    `);
    
    console.log('\nCurrent columns:');
    columns.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });
    
    // Check if first_name column exists
    const hasFirstName = columns.rows.some(row => row.column_name === 'first_name');
    
    if (!hasFirstName) {
      console.log('\n❌ first_name column missing. Adding it...');
      await pool.query(`
        ALTER TABLE course_students 
        ADD COLUMN first_name VARCHAR(255);
      `);
      console.log('✅ first_name column added successfully!');
    } else {
      console.log('\n✅ first_name column already exists.');
    }
    
    // Check if last_name column exists
    const hasLastName = columns.rows.some(row => row.column_name === 'last_name');
    
    if (!hasLastName) {
      console.log('\n❌ last_name column missing. Adding it...');
      await pool.query(`
        ALTER TABLE course_students 
        ADD COLUMN last_name VARCHAR(255);
      `);
      console.log('✅ last_name column added successfully!');
    } else {
      console.log('\n✅ last_name column already exists.');
    }
    
    // Check if email column exists
    const hasEmail = columns.rows.some(row => row.column_name === 'email');
    
    if (!hasEmail) {
      console.log('\n❌ email column missing. Adding it...');
      await pool.query(`
        ALTER TABLE course_students 
        ADD COLUMN email VARCHAR(255);
      `);
      console.log('✅ email column added successfully!');
    } else {
      console.log('\n✅ email column already exists.');
    }
    
    // Check if attendance_marked column exists
    const hasAttendanceMarked = columns.rows.some(row => row.column_name === 'attendance_marked');
    
    if (!hasAttendanceMarked) {
      console.log('\n❌ attendance_marked column missing. Adding it...');
      await pool.query(`
        ALTER TABLE course_students 
        ADD COLUMN attendance_marked BOOLEAN DEFAULT false;
      `);
      console.log('✅ attendance_marked column added successfully!');
    } else {
      console.log('\n✅ attendance_marked column already exists.');
    }
    
    // Check if attended column exists
    const hasAttended = columns.rows.some(row => row.column_name === 'attended');
    
    if (!hasAttended) {
      console.log('\n❌ attended column missing. Adding it...');
      await pool.query(`
        ALTER TABLE course_students 
        ADD COLUMN attended BOOLEAN DEFAULT false;
      `);
      console.log('✅ attended column added successfully!');
    } else {
      console.log('\n✅ attended column already exists.');
    }
    
    // Show final structure
    console.log('\n🔍 Final course_students table structure:');
    const finalColumns = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'course_students' 
      ORDER BY ordinal_position
    `);
    
    finalColumns.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });
    
    console.log('\n🎉 course_students table fixed! CSV upload should work now.');
    
  } catch (error) {
    console.error('❌ Error fixing course_students table:', error);
  } finally {
    await pool.end();
  }
}

fixCourseStudents(); 