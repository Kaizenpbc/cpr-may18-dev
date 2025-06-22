const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  password: 'gtacpr',
  host: '127.0.0.1',
  port: 5432,
  database: 'cpr_may18',
});

async function fixCourseRequestsTable() {
  try {
    console.log('🔍 Checking if course_requests table exists...');
    
    // Check if table exists
    const tableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'course_requests'
      );
    `);
    
    if (!tableExists.rows[0].exists) {
      console.log('❌ course_requests table does not exist. Creating it...');
      
      await pool.query(`
        CREATE TABLE course_requests (
          id SERIAL PRIMARY KEY,
          organization_id INTEGER NOT NULL REFERENCES organizations(id),
          course_type_id INTEGER NOT NULL REFERENCES class_types(id),
          request_submitted_date DATE NOT NULL DEFAULT CURRENT_DATE,
          scheduled_date DATE NOT NULL,
          location VARCHAR(255) NOT NULL,
          registered_students INTEGER NOT NULL DEFAULT 0,
          notes TEXT,
          status VARCHAR(50) NOT NULL DEFAULT 'pending',
          instructor_id INTEGER REFERENCES users(id),
          confirmed_date DATE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);
      
      console.log('✅ course_requests table created successfully!');
    } else {
      console.log('✅ course_requests table exists. Checking columns...');
      
      const columns = await pool.query(`
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'course_requests' 
        ORDER BY ordinal_position
      `);
      
      console.log('\nCurrent columns:');
      columns.rows.forEach(row => {
        console.log(`  - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
      });
      
      // Check if request_submitted_date column exists
      const hasRequestSubmittedDate = columns.rows.some(row => row.column_name === 'request_submitted_date');
      
      if (!hasRequestSubmittedDate) {
        console.log('\n❌ request_submitted_date column missing. Adding it...');
        
        await pool.query(`
          ALTER TABLE course_requests 
          ADD COLUMN request_submitted_date DATE NOT NULL DEFAULT CURRENT_DATE;
        `);
        
        console.log('✅ request_submitted_date column added successfully!');
      } else {
        console.log('\n✅ request_submitted_date column already exists.');
      }
    }
    
    // Show final table structure
    console.log('\n🔍 Final course_requests table structure:');
    const finalColumns = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'course_requests' 
      ORDER BY ordinal_position
    `);
    
    finalColumns.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });
    
  } catch (error) {
    console.error('❌ Error fixing course_requests table:', error);
  } finally {
    await pool.end();
  }
}

fixCourseRequestsTable(); 