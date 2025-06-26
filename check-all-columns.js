const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'cpr_may18',
  user: 'postgres',
  password: 'gtacpr'
});

async function checkAllColumns() {
  try {
    // Check classes table structure
    const classesColumns = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'classes' 
      ORDER BY ordinal_position
    `);
    
    console.log('Classes table columns:');
    classesColumns.rows.forEach(row => {
      console.log(`${row.column_name} (${row.data_type}) - Nullable: ${row.is_nullable}`);
    });
    
    // Check course_requests table structure
    const courseRequestsColumns = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'course_requests' 
      ORDER BY ordinal_position
    `);
    
    console.log('\nCourse_requests table columns:');
    courseRequestsColumns.rows.forEach(row => {
      console.log(`${row.column_name} (${row.data_type}) - Nullable: ${row.is_nullable}`);
    });
    
    // Check if organization_id exists in classes table
    const orgCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'classes' AND column_name = 'organization_id'
    `);
    
    console.log('\nOrganization_id in classes table:', orgCheck.rows.length > 0 ? 'EXISTS' : 'DOES NOT EXIST');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkAllColumns(); 