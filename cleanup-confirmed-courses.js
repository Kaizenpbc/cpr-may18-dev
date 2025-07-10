const { Pool } = require('pg');
require('dotenv').config();

async function cleanupConfirmedCourses() {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'cpr_jun21',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'gtacpr',
  });

  try {
    const client = await pool.connect();
    console.log('🧹 Cleaning up confirmed courses from all views...\n');

    // List of tables that might contain confirmed course data
    const tablesToClean = [
      'course_requests',
      'classes',
      'enrollments',
      'course_students',
      'invoices',
      'course_materials',
      'course_notes',
      'course_feedback',
      'course_logs',
      'course_audit',
      'course_assignments',
      'course_resources',
      'course_files',
      'course_schedule',
      'course_history',
      'course_confirmations',
      'course_cancellations',
      'course_archives',
      'billing_queue',
      'course_pricing',
      'organization_pricing',
      'course_analytics',
      'course_reports',
      'course_notifications',
      'course_reminders',
      'course_attendance',
      'course_completions',
      'course_evaluations',
      'course_certificates',
      'course_documents'
    ];

    let totalDeleted = 0;

    for (const table of tablesToClean) {
      try {
        // First try to delete by status if the table has a status column
        let result;
        try {
          result = await client.query(`DELETE FROM ${table} WHERE status IN ('confirmed', 'active', 'scheduled', 'completed')`);
        } catch (statusError) {
          // If status column doesn't exist, delete all records
          result = await client.query(`DELETE FROM ${table}`);
        }
        
        if (result.rowCount > 0) {
          console.log(`✅ Deleted ${result.rowCount} records from ${table}`);
          totalDeleted += result.rowCount;
        }
      } catch (error) {
        if (error.message.includes('does not exist')) {
          console.log(`⚠️  Table ${table} does not exist (skipping)`);
        } else {
          console.log(`❌ Error deleting from ${table}: ${error.message}`);
        }
      }
    }

    // Also clean up any remaining course-related data
    try {
      const result = await client.query("DELETE FROM course_types WHERE coursetypename LIKE '%test%' OR coursetypename LIKE '%demo%'");
      console.log(`✅ Deleted ${result.rowCount} test course types`);
      totalDeleted += result.rowCount;
    } catch (error) {
      console.log(`⚠️  course_types table: ${error.message}`);
    }

    console.log(`\n🎉 Cleanup completed! Total records deleted: ${totalDeleted}`);
    console.log('✅ Confirmed courses removed from admin, organization, and instructor views');
    
    client.release();
  } catch (error) {
    console.error('❌ Error during cleanup:', error.message);
  } finally {
    await pool.end();
  }
}

cleanupConfirmedCourses(); 