const { Pool } = require('pg');
require('dotenv').config();

async function deleteAllCoursesAndRelated() {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'cpr_jun21',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'gtacpr',
  });

  try {
    const client = await pool.connect();
    console.log('🧹 Deleting ALL courses and related records from all relevant tables...\n');

    // Order matters: delete from child tables first due to foreign key constraints
    const tables = [
      'course_students',
      'enrollments',
      'invoices',
      'course_attendance',
      'course_completions',
      'course_requests',
      'classes',
      'course_types',
      'course_analytics',
      'course_reports',
      'course_archives',
      'course_confirmations',
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
      'course_cancellations',
      'billing_queue',
      'course_pricing',
      'organization_pricing',
      'course_notifications',
      'course_reminders',
      'course_evaluations',
      'course_certificates',
      'course_documents',
      'instructor_availability'
    ];

    let totalDeleted = 0;

    for (const table of tables) {
      try {
        const result = await client.query(`DELETE FROM ${table}`);
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

    console.log(`\n🎉 All course and related records deleted! Total records deleted: ${totalDeleted}`);
    client.release();
  } catch (error) {
    console.error('❌ Error during deletion:', error.message);
  } finally {
    await pool.end();
  }
}

deleteAllCoursesAndRelated(); 