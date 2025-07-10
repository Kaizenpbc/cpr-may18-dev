const { Pool } = require('pg');
require('dotenv').config();

async function cleanupCourseRequests() {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'cpr_jun21',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'gtacpr',
  });

  try {
    const client = await pool.connect();
    console.log('🧹 Cleaning up course requests and related data...\n');

    // Delete related records first (due to foreign key constraints)
    try {
      const result1 = await client.query("DELETE FROM course_students");
      console.log(`✅ Deleted ${result1.rowCount} course_students records`);
    } catch (error) {
      console.log(`⚠️  course_students table: ${error.message}`);
    }

    try {
      const result2 = await client.query("DELETE FROM enrollments");
      console.log(`✅ Deleted ${result2.rowCount} enrollment records`);
    } catch (error) {
      console.log(`⚠️  enrollments table: ${error.message}`);
    }

    try {
      const result3 = await client.query("DELETE FROM attendance");
      console.log(`✅ Deleted ${result3.rowCount} attendance records`);
    } catch (error) {
      console.log(`⚠️  attendance table: ${error.message}`);
    }

    try {
      const result4 = await client.query("DELETE FROM invoices");
      console.log(`✅ Deleted ${result4.rowCount} invoice records`);
    } catch (error) {
      console.log(`⚠️  invoices table: ${error.message}`);
    }

    // Now delete course requests
    try {
      const result5 = await client.query("DELETE FROM course_requests");
      console.log(`✅ Deleted ${result5.rowCount} course request(s)`);
    } catch (error) {
      console.log(`⚠️  course_requests table: ${error.message}`);
    }

    console.log('\n🎉 Course-related data cleanup completed!');
    
    client.release();
  } catch (error) {
    console.error('❌ Error during cleanup:', error.message);
  } finally {
    await pool.end();
  }
}

cleanupCourseRequests(); 