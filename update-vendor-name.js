const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  password: 'gtacpr',
  host: '127.0.0.1',
  port: 5432,
  database: 'cpr_jun21'
});

async function updateVendorName() {
  try {
    console.log('🔧 Updating vendor name...\n');

    // Update the vendor name
    await pool.query(
      'UPDATE vendors SET name = $1 WHERE contact_email = $2',
      ['GTACPR Staff Portal', 'vendor@example.com']
    );

    console.log('✅ Updated vendor name to "GTACPR Staff Portal"');

    // Verify the update
    const result = await pool.query(
      'SELECT name, contact_email FROM vendors WHERE contact_email = $1',
      ['vendor@example.com']
    );

    console.log('📋 Updated vendor details:');
    console.log(`   Name: ${result.rows[0].name}`);
    console.log(`   Email: ${result.rows[0].contact_email}`);

    // Show all vendors
    const allVendors = await pool.query('SELECT id, name, contact_email FROM vendors');
    console.log('\n📋 All vendors:');
    allVendors.rows.forEach(v => {
      console.log(`   - ID: ${v.id}, Name: ${v.name}, Email: ${v.contact_email}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

updateVendorName(); 