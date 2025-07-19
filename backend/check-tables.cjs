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

async function checkTables() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Checking database tables...\n');
    
    // Get all tables
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log('📋 Available tables:');
    tablesResult.rows.forEach(row => {
      console.log(`   - ${row.table_name}`);
    });
    
    // Check specific tables we're interested in
    const tablesToCheck = [
      'instructor_availability',
      'timesheets', 
      'course_requests',
      'course_students',
      'payments',
      'invoices',
      'course_materials',
      'notifications',
      'activity_logs'
    ];
    
    console.log('\n📊 Table record counts:');
    for (const tableName of tablesToCheck) {
      try {
        const countResult = await client.query(`SELECT COUNT(*) FROM ${tableName}`);
        console.log(`   ${tableName}: ${countResult.rows[0].count} records`);
      } catch (error) {
        console.log(`   ${tableName}: ❌ Table does not exist`);
      }
    }
    
    // Check course_requests status distribution
    try {
      const statusResult = await client.query('SELECT status, COUNT(*) FROM course_requests GROUP BY status');
      console.log('\n📈 Course requests by status:');
      statusResult.rows.forEach(row => {
        console.log(`   ${row.status}: ${row.count}`);
      });
    } catch (error) {
      console.log('\n❌ Could not check course_requests status');
    }
    
  } catch (error) {
    console.error('❌ Error checking tables:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

checkTables(); 