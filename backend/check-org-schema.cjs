const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'gtacpr',
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: 'cpr_jun21',
});

async function checkOrgSchema() {
  try {
    console.log('Checking organizations table schema...');
    
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'organizations' 
      ORDER BY ordinal_position;
    `);
    
    console.log('Organization table columns:');
    result.rows.forEach(row => {
      console.log(`- ${row.column_name} (${row.data_type}, nullable: ${row.is_nullable})`);
    });
    
    // Also check if there are any organizations
    const orgCount = await pool.query('SELECT COUNT(*) as count FROM organizations');
    console.log(`\nTotal organizations: ${orgCount.rows[0].count}`);
    
    if (orgCount.rows[0].count > 0) {
      const sampleOrg = await pool.query('SELECT * FROM organizations LIMIT 1');
      console.log('\nSample organization:');
      console.log(sampleOrg.rows[0]);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkOrgSchema(); 