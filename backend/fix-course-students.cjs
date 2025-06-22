const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  password: 'gtacpr',
  host: '127.0.0.1',
  port: 5432,
  database: 'cpr_may18',
});

async function fixCourseStudentsTable() {
  try {
    console.log('🔍 Checking course_students table structure...');
    
    // Check if table exists
    const tableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'course_students'
      );
    `);
    
    if (!tableExists.rows[0].exists) {
      console.log('❌ course_students table does not exist. Creating it...');
      
      await pool.query(`
        CREATE TABLE course_students (
          id SERIAL PRIMARY KEY,
          course_request_id INTEGER NOT NULL REFERENCES course_requests(id),
          first_name VARCHAR(255) NOT NULL,
          last_name VARCHAR(255) NOT NULL,
          email VARCHAR(255),
          attendance_marked BOOLEAN DEFAULT false,
          attended BOOLEAN DEFAULT false,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);
      
      console.log('✅ course_students table created successfully!');
    } else {
      console.log('✅ course_students table exists. Checking columns...');
      
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
          ADD COLUMN first_name VARCHAR(255) NOT NULL DEFAULT '';
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
          ADD COLUMN last_name VARCHAR(255) NOT NULL DEFAULT '';
        `);
        
        console.log('✅ last_name column added successfully!');
      } else {
        console.log('\n✅ last_name column already exists.');
      }
    }
    
    // Show final table structure
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
    
  } catch (error) {
    console.error('❌ Error fixing course_students table:', error);
  } finally {
    await pool.end();
  }
}

fixCourseStudentsTable(); 