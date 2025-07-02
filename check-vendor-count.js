const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'cpr_may18',
  password: 'gtacpr',
  port: 5432,
});

async function checkVendorCount() {
  try {
    const result = await pool.query('SELECT COUNT(*) FROM vendors');
    console.log('Number of vendors:', result.rows[0].count);
    
    if (parseInt(result.rows[0].count) > 0) {
      const vendors = await pool.query('SELECT id, vendor_name FROM vendors LIMIT 5');
      console.log('\nSample vendors:');
      vendors.rows.forEach(vendor => {
        console.log(`- ID: ${vendor.id}, Name: ${vendor.vendor_name}`);
      });
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkVendorCount(); 