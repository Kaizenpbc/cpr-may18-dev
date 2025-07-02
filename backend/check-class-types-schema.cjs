const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'gtacpr',
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: 'cpr_jun21',
});

async function checkClassTypesTable() {
  try {
    console.log('🔍 Checking class_types table schema...');
    
    // Get table schema
    const schema = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'class_types'
      ORDER BY ordinal_position;
    `);
    
    console.log('📋 Class types table columns:');
    schema.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });
    
    // Count records
    const count = await pool.query('SELECT COUNT(*) FROM class_types');
    console.log(`\n📊 Total class types: ${count.rows[0].count}`);
    
    // Show sample data
    const sample = await pool.query('SELECT * FROM class_types LIMIT 3');
    if (sample.rows.length > 0) {
      console.log('\n📝 Sample class types:');
      sample.rows.forEach((row, i) => {
        console.log(`  Type ${i + 1}:`, row);
      });
    } else {
      console.log('\n📝 No class types found in the table');
    }
    
  } catch (error) {
    console.error('❌ Error checking class_types table:', error.message);
  } finally {
    await pool.end();
  }
}

checkClassTypesTable(); 