const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  password: 'gtacpr',
  host: '127.0.0.1',
  port: 5432,
  database: 'cpr_jun21'
});

async function checkVendorName() {
  try {
    console.log('🔍 Checking vendor name...\n');

    // Check vendor for vendor@example.com
    const vendorResult = await pool.query(
      'SELECT * FROM vendors WHERE contact_email = $1',
      ['vendor@example.com']
    );

    console.log('📋 Vendor details:');
    if (vendorResult.rows.length > 0) {
      const vendor = vendorResult.rows[0];
      console.log('   All columns:');
      Object.keys(vendor).forEach(key => {
        console.log(`     ${key}: ${vendor[key]}`);
      });
    } else {
      console.log('   ❌ No vendor found for vendor@example.com');
    }

    // Check all vendors
    const allVendorsResult = await pool.query('SELECT id, name, contact_email FROM vendors');
    
    console.log('\n📋 All vendors:');
    allVendorsResult.rows.forEach(v => {
      console.log(`   - ID: ${v.id}, Name: ${v.name}, Email: ${v.contact_email}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkVendorName(); 