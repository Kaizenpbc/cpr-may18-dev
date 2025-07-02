const { Pool } = require('pg');

const pool = new Pool({
  host: '127.0.0.1',
  port: 5432,
  database: 'cpr_jun21',
  user: 'postgres',
  password: 'gtacpr'
});

async function checkOrganizationsSchema() {
  try {
    console.log('Checking organizations table schema...');
    
    // Get table schema
    const schemaResult = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'organizations' 
      ORDER BY ordinal_position
    `);
    
    console.log('\n📋 Organizations table columns:');
    schemaResult.rows.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });
    
    // Get sample data
    console.log('\n📊 Sample organizations data:');
    const orgsResult = await pool.query(`
      SELECT id, name, contact_email, contact_phone, address, created_at
      FROM organizations 
      ORDER BY name
      LIMIT 10
    `);
    
    orgsResult.rows.forEach(org => {
      console.log(`  - ${org.name} (${org.contact_email})`);
    });
    
  } catch (error) {
    console.error('Error checking organizations schema:', error);
  } finally {
    await pool.end();
  }
}

checkOrganizationsSchema(); 