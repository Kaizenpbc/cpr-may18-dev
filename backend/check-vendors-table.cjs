const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Load environment variables
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath });
}

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'cpr_dev',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
});

async function checkVendorsTable() {
  const client = await pool.connect();
  try {
    console.log('🔍 Checking vendors table structure...\n');
    
    const columnsResult = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'vendors'
      ORDER BY ordinal_position
    `);
    
    console.log('📋 vendors table columns:');
    columnsResult.rows.forEach(row => {
      console.log(`   - ${row.column_name} (${row.data_type})`);
    });
    
    console.log('\n🔍 Checking if vendors table exists...');
    const tableExistsResult = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'vendors'
      );
    `);
    
    if (tableExistsResult.rows[0].exists) {
      console.log('✅ vendors table exists');
      
      // Check if there are any records
      const countResult = await client.query('SELECT COUNT(*) FROM vendors');
      console.log(`📊 Total vendors: ${countResult.rows[0].count}`);
      
      // Show a sample record if any exist
      if (parseInt(countResult.rows[0].count) > 0) {
        const sampleResult = await client.query('SELECT * FROM vendors LIMIT 1');
        console.log('\n📝 Sample vendor record:');
        console.log(JSON.stringify(sampleResult.rows[0], null, 2));
      }
    } else {
      console.log('❌ vendors table does not exist');
    }
    
  } catch (error) {
    console.error('❌ Error checking vendors table:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

checkVendorsTable(); 