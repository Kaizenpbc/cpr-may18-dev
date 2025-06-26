const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'cpr_may18',
  user: 'postgres',
  password: 'gtacpr'
});

async function deleteClass25() {
  try {
    console.log('Checking class 25 before deletion...');
    
    // First check if class 25 exists and has any dependencies
    const classCheck = await pool.query(`
      SELECT id, instructor_id, status, start_time, end_time
      FROM classes 
      WHERE id = 25
    `);
    
    if (classCheck.rows.length === 0) {
      console.log('Class 25 does not exist');
      return;
    }
    
    console.log('Class 25 found:', classCheck.rows[0]);
    
    // Check if there are any students in class_students table
    const studentsCheck = await pool.query(`
      SELECT COUNT(*) as student_count
      FROM class_students 
      WHERE class_id = 25
    `);
    
    console.log(`Students in class_students for class 25: ${studentsCheck.rows[0].student_count}`);
    
    // Delete class 25
    const deleteResult = await pool.query(`
      DELETE FROM classes 
      WHERE id = 25
    `);
    
    console.log('Class 25 deleted successfully');
    
    // Verify deletion
    const verifyDeletion = await pool.query(`
      SELECT COUNT(*) as count
      FROM classes 
      WHERE id = 25
    `);
    
    if (verifyDeletion.rows[0].count === 0) {
      console.log('✅ Class 25 successfully deleted and verified');
    } else {
      console.log('❌ Class 25 still exists after deletion attempt');
    }
    
  } catch (error) {
    console.error('Error deleting class 25:', error);
  } finally {
    await pool.end();
  }
}

deleteClass25(); 