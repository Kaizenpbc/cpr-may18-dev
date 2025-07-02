const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'cpr_jun21',
  password: 'gtacpr',
  port: 5432,
});

async function testVendorQuery() {
  try {
    console.log('Testing vendor query with correct columns...');
    
    const result = await pool.query(`
      SELECT 
        id,
        name,
        contact_email,
        contact_phone,
        address,
        vendor_type,
        is_active,
        created_at,
        updated_at
      FROM vendors
      ORDER BY name
    `);
    
    console.log('✅ Query successful!');
    console.log('Number of vendors:', result.rows.length);
    console.log('Sample vendor data:', result.rows[0] || 'No vendors found');
    
  } catch (error) {
    console.error('❌ Query failed:', error.message);
  } finally {
    await pool.end();
  }
}

testVendorQuery(); 