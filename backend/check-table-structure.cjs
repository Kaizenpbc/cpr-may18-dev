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

async function checkTableStructure() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Checking table structures...\n');
    
    const tablesToCheck = [
      'payments',
      'invoices', 
      'course_materials',
      'notifications',
      'activity_logs'
    ];
    
    for (const tableName of tablesToCheck) {
      try {
        const columnsResult = await client.query(`
          SELECT column_name, data_type 
          FROM information_schema.columns 
          WHERE table_name = $1 
          ORDER BY ordinal_position
        `, [tableName]);
        
        console.log(`📋 ${tableName} table columns:`);
        columnsResult.rows.forEach(row => {
          console.log(`   - ${row.column_name} (${row.data_type})`);
        });
        console.log('');
        
      } catch (error) {
        console.log(`❌ ${tableName}: Table does not exist\n`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error checking table structure:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

checkTableStructure(); 