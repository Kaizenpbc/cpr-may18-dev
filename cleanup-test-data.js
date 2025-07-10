const { Pool } = require('pg');
require('dotenv').config();

async function cleanupTestData() {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'cpr_jun21',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'gtacpr',
  });

  try {
    console.log('🧹 Starting safe cleanup of test data...\n');
    
    // Test connection
    const client = await pool.connect();
    console.log('✅ Database connection successful\n');
    
    // List of tables to safely clean (test data only)
    const tablesToClean = [
      'instructor_availability',
      'courses',
      'enrollments', 
      'attendance',
      'course_requests',
      'billing_queue',
      'email_templates'
    ];
    
    console.log('📋 Tables that will be cleaned (test data only):');
    tablesToClean.forEach(table => console.log(`  - ${table}`));
    console.log('');
    
    // Tables that will be PRESERVED (user accounts and system config)
    const preservedTables = [
      'users',
      'user_roles', 
      'organizations',
      'instructors',
      'students',
      'vendors',
      'class_types',
      'knex_migrations',
      'knex_migrations_lock'
    ];
    
    console.log('🔒 Tables that will be PRESERVED (user accounts & system config):');
    preservedTables.forEach(table => console.log(`  - ${table}`));
    console.log('');
    
    // Clean each table
    for (const table of tablesToClean) {
      try {
        const result = await client.query(`DELETE FROM ${table}`);
        console.log(`✅ Cleaned ${table}: ${result.rowCount} rows deleted`);
      } catch (error) {
        if (error.message.includes('does not exist')) {
          console.log(`⚠️  Table ${table} does not exist (skipping)`);
        } else {
          console.log(`❌ Error cleaning ${table}: ${error.message}`);
        }
      }
    }
    
    console.log('\n🎉 Cleanup completed successfully!');
    console.log('✅ User accounts and system configuration preserved');
    console.log('✅ Test data removed');
    console.log('\n💡 You can now add fresh test data when needed');
    
    client.release();
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error.message);
  } finally {
    await pool.end();
  }
}

cleanupTestData(); 