const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Load environment variables
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      process.env[key.trim()] = value.trim();
    }
  });
}

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'cpr_dev',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function dropRecords() {
  const client = await pool.connect();
  
  try {
    console.log('🗑️  Starting record cleanup...\n');
    
    // 1. Drop instructor availability records
    console.log('1. Dropping instructor availability records...');
    const availabilityResult = await client.query('DELETE FROM instructor_availability');
    console.log(`   ✅ Deleted ${availabilityResult.rowCount} availability records\n`);
    
    // 2. Drop timesheets
    console.log('2. Dropping timesheets...');
    const timesheetsResult = await client.query('DELETE FROM timesheets');
    console.log(`   ✅ Deleted ${timesheetsResult.rowCount} timesheet records\n`);
    
    // 3. Drop attendance records
    console.log('3. Dropping attendance records...');
    const attendanceResult = await client.query('DELETE FROM attendance');
    console.log(`   ✅ Deleted ${attendanceResult.rowCount} attendance records\n`);
    
    // 4. Drop course_students for completed courses first
    console.log('4. Dropping course_students for completed courses...');
    const studentsResult = await client.query(`
      DELETE FROM course_students 
      WHERE course_request_id IN (
        SELECT id FROM course_requests WHERE status = 'completed'
      )
    `);
    console.log(`   ✅ Deleted ${studentsResult.rowCount} student records for completed courses\n`);
    
    // 5. Drop payments for completed courses
    console.log('5. Dropping payment records for completed courses...');
    const paymentsResult = await client.query(`
      DELETE FROM payments 
      WHERE course_request_id IN (
        SELECT id FROM course_requests WHERE status = 'completed'
      )
    `);
    console.log(`   ✅ Deleted ${paymentsResult.rowCount} payment records\n`);
    
    // 6. Drop invoices for completed courses
    console.log('6. Dropping invoice records for completed courses...');
    const invoicesResult = await client.query(`
      DELETE FROM invoices 
      WHERE course_request_id IN (
        SELECT id FROM course_requests WHERE status = 'completed'
      )
    `);
    console.log(`   ✅ Deleted ${invoicesResult.rowCount} invoice records\n`);
    
    // 7. Drop course materials for completed courses
    console.log('7. Dropping course materials for completed courses...');
    const materialsResult = await client.query(`
      DELETE FROM course_materials 
      WHERE course_request_id IN (
        SELECT id FROM course_requests WHERE status = 'completed'
      )
    `);
    console.log(`   ✅ Deleted ${materialsResult.rowCount} course material records\n`);
    
    // 8. Drop notifications for completed courses
    console.log('8. Dropping notifications for completed courses...');
    const notificationsResult = await client.query(`
      DELETE FROM notifications 
      WHERE course_request_id IN (
        SELECT id FROM course_requests WHERE status = 'completed'
      )
    `);
    console.log(`   ✅ Deleted ${notificationsResult.rowCount} notification records\n`);
    
    // 9. Drop activity logs for completed courses
    console.log('9. Dropping activity logs for completed courses...');
    const logsResult = await client.query(`
      DELETE FROM activity_logs 
      WHERE course_request_id IN (
        SELECT id FROM course_requests WHERE status = 'completed'
      )
    `);
    console.log(`   ✅ Deleted ${logsResult.rowCount} activity log records\n`);
    
    // 10. Now drop completed courses (after all dependencies are removed)
    console.log('10. Dropping completed courses...');
    const completedCoursesResult = await client.query("DELETE FROM course_requests WHERE status = 'completed'");
    console.log(`   ✅ Deleted ${completedCoursesResult.rowCount} completed courses\n`);
    
    // 11. Clean up any remaining orphaned records
    console.log('11. Cleaning up any remaining orphaned records...');
    const orphanedStudentsResult = await client.query(`
      DELETE FROM course_students 
      WHERE course_request_id NOT IN (SELECT id FROM course_requests)
    `);
    console.log(`   ✅ Deleted ${orphanedStudentsResult.rowCount} orphaned student records\n`);
    
    console.log('\n🎉 Record cleanup completed successfully!');
    
    // Show remaining records
    console.log('\n📊 Remaining records:');
    const remainingCourses = await client.query('SELECT status, COUNT(*) FROM course_requests GROUP BY status');
    console.log('   Course requests by status:');
    remainingCourses.rows.forEach(row => {
      console.log(`     ${row.status}: ${row.count}`);
    });
    
    const remainingStudents = await client.query('SELECT COUNT(*) FROM course_students');
    console.log(`   Course students: ${remainingStudents.rows[0].count}`);
    
    const remainingTimesheets = await client.query('SELECT COUNT(*) FROM timesheets');
    console.log(`   Timesheets: ${remainingTimesheets.rows[0].count}`);
    
    const remainingAvailability = await client.query('SELECT COUNT(*) FROM instructor_availability');
    console.log(`   Instructor availability: ${remainingAvailability.rows[0].count}`);
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

dropRecords(); 