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

async function deleteAllRecords() {
  const client = await pool.connect();
  
  try {
    console.log('🗑️  Deleting ALL records across all portals...\n');
    
    // Delete all course_students first
    console.log('1. Deleting all course_students...');
    const studentsResult = await client.query('DELETE FROM course_students');
    console.log(`   ✅ Deleted ${studentsResult.rowCount} student records\n`);
    
    // Delete all payments
    console.log('2. Deleting all payments...');
    const paymentsResult = await client.query('DELETE FROM payments');
    console.log(`   ✅ Deleted ${paymentsResult.rowCount} payment records\n`);
    
    // Delete all invoices
    console.log('3. Deleting all invoices...');
    const invoicesResult = await client.query('DELETE FROM invoices');
    console.log(`   ✅ Deleted ${invoicesResult.rowCount} invoice records\n`);
    
    // Delete all notifications
    console.log('4. Deleting all notifications...');
    const notificationsResult = await client.query('DELETE FROM notifications');
    console.log(`   ✅ Deleted ${notificationsResult.rowCount} notification records\n`);
    
    // Delete all activity_logs
    console.log('5. Deleting all activity_logs...');
    const logsResult = await client.query('DELETE FROM activity_logs');
    console.log(`   ✅ Deleted ${logsResult.rowCount} activity log records\n`);
    
    // Delete all timesheets
    console.log('6. Deleting all timesheets...');
    const timesheetsResult = await client.query('DELETE FROM timesheets');
    console.log(`   ✅ Deleted ${timesheetsResult.rowCount} timesheet records\n`);
    
    // Delete all instructor_availability
    console.log('7. Deleting all instructor_availability...');
    const availabilityResult = await client.query('DELETE FROM instructor_availability');
    console.log(`   ✅ Deleted ${availabilityResult.rowCount} availability records\n`);
    
    // Finally delete all course_requests
    console.log('8. Deleting all course_requests...');
    const coursesResult = await client.query('DELETE FROM course_requests');
    console.log(`   ✅ Deleted ${coursesResult.rowCount} course records\n`);
    
    console.log('\n🎉 ALL RECORDS DELETED SUCCESSFULLY!');
    console.log('📊 Database is now completely clean across all portals.');
    
  } catch (error) {
    console.error('❌ Error deleting records:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

deleteAllRecords(); 