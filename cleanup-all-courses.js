const { Pool } = require('pg');
require('dotenv').config();

async function cleanupAllCourses() {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'cpr_jun21',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'gtacpr',
  });

  try {
    const client = await pool.connect();
    console.log('🧹 Deleting all courses and related records...\n');

    // Delete from related tables first due to foreign key constraints
    const relatedTables = [
      'enrollments',
      'attendance',
      'course_students',
      'instructor_availability',
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
      'course_archives'
    ];

    for (const table of relatedTables) {
      try {
        const result = await client.query(`DELETE FROM ${table}`);
        console.log(`✅ Deleted ${result.rowCount} records from ${table}`);
      } catch (error) {
        if (error.message.includes('does not exist')) {
          console.log(`⚠️  Table ${table} does not exist (skipping)`);
        } else {
          console.log(`❌ Error deleting from ${table}: ${error.message}`);
        }
      }
    }

    // Now delete from courses table
    try {
      const result = await client.query('DELETE FROM courses');
      console.log(`✅ Deleted ${result.rowCount} records from courses`);
    } catch (error) {
      if (error.message.includes('does not exist')) {
        console.log('⚠️  Table courses does not exist (skipping)');
      } else {
        console.log(`❌ Error deleting from courses: ${error.message}`);
      }
    }

    console.log('\n🎉 All course records and related data deleted!');
    client.release();
  } catch (error) {
    console.error('❌ Error during course cleanup:', error.message);
  } finally {
    await pool.end();
  }
}

cleanupAllCourses(); 