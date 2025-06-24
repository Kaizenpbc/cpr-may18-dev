const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  database: 'cpr_training_db',
  user: 'postgres',
  password: 'gtacpr'
});

async function addColumn() {
  try {
    console.log('Adding final_attendance_count column to course_requests table...');
    
    const result = await pool.query(`
      ALTER TABLE course_requests 
      ADD COLUMN IF NOT EXISTS final_attendance_count INTEGER DEFAULT 0
    `);
    
    console.log('✅ final_attendance_count column added successfully!');
    
    // Verify the column was added
    const verifyResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'course_requests' 
      AND column_name = 'final_attendance_count'
    `);
    
    if (verifyResult.rows.length > 0) {
      console.log('✅ Column verified successfully!');
    } else {
      console.log('❌ Column not found after adding');
    }
    
  } catch (error) {
    console.error('❌ Error adding column:', error.message);
  } finally {
    await pool.end();
  }
}

addColumn(); 