const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  password: 'gtacpr',
  host: '127.0.0.1',
  port: 5432,
  database: 'cpr_jun21'
});

async function checkInvoices() {
  try {
    console.log('🔍 Checking recent vendor invoices...\n');

    // Check recent invoices
    const result = await pool.query(`
      SELECT 
        vi.id, 
        vi.invoice_number, 
        vi.vendor_id, 
        vi.description,
        vi.created_at,
        v.name as vendor_name
      FROM vendor_invoices vi 
      LEFT JOIN vendors v ON vi.vendor_id = v.id 
      ORDER BY vi.created_at DESC 
      LIMIT 10
    `);

    console.log('📋 Recent invoices:');
    result.rows.forEach(invoice => {
      console.log(`   - ID: ${invoice.id}`);
      console.log(`     Invoice: ${invoice.invoice_number}`);
      console.log(`     Vendor ID: ${invoice.vendor_id}`);
      console.log(`     Vendor Name: ${invoice.vendor_name}`);
      console.log(`     Description: ${invoice.description}`);
      console.log(`     Created: ${invoice.created_at}`);
      console.log('');
    });

    // Check vendor counts
    const vendorCounts = await pool.query(`
      SELECT 
        vi.vendor_id,
        v.name as vendor_name,
        COUNT(*) as invoice_count
      FROM vendor_invoices vi 
      LEFT JOIN vendors v ON vi.vendor_id = v.id 
      GROUP BY vi.vendor_id, v.name
      ORDER BY invoice_count DESC
    `);

    console.log('📊 Invoice counts by vendor:');
    vendorCounts.rows.forEach(vendor => {
      console.log(`   - Vendor ID ${vendor.vendor_id} (${vendor.vendor_name}): ${vendor.invoice_count} invoices`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkInvoices(); 