const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  password: 'gtacpr',
  host: '127.0.0.1',
  port: 5432,
  database: 'cpr_jun21'
});

async function checkVendorMismatch() {
  try {
    console.log('🔍 Checking vendor ID mismatch...\n');

    // Check vendor for vendor@example.com
    const vendorResult = await pool.query(
      'SELECT id, name, contact_email FROM vendors WHERE contact_email = $1',
      ['vendor@example.com']
    );

    console.log('📋 Vendor for vendor@example.com:');
    if (vendorResult.rows.length > 0) {
      vendorResult.rows.forEach(v => {
        console.log(`   - ID: ${v.id}, Name: ${v.name}, Email: ${v.contact_email}`);
      });
    } else {
      console.log('   ❌ No vendor found for vendor@example.com');
    }

    // Check recent invoices
    const invoiceResult = await pool.query(
      'SELECT id, vendor_id, invoice_number, created_at FROM vendor_invoices ORDER BY created_at DESC LIMIT 5'
    );

    console.log('\n📋 Recent invoices:');
    if (invoiceResult.rows.length > 0) {
      invoiceResult.rows.forEach(inv => {
        console.log(`   - Invoice ID: ${inv.id}, Vendor ID: ${inv.vendor_id}, Number: ${inv.invoice_number}, Created: ${inv.created_at}`);
      });
    } else {
      console.log('   📭 No invoices found');
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

checkVendorMismatch(); 