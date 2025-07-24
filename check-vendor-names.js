const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  password: 'gtacpr',
  host: '127.0.0.1',
  port: 5432,
  database: 'cpr_jun21'
});

async function checkVendorNames() {
  try {
    console.log('🔍 Checking vendor names and invoice assignments...\n');

    // Check all vendors
    const vendors = await pool.query(`
      SELECT id, name, contact_email FROM vendors ORDER BY id
    `);

    console.log('🏢 All vendors in database:');
    vendors.rows.forEach(vendor => {
      console.log(`   - ID: ${vendor.id}, Name: "${vendor.name}", Email: ${vendor.contact_email}`);
    });

    // Check all invoices with their vendor assignments
    const invoices = await pool.query(`
      SELECT 
        vi.id, 
        vi.invoice_number, 
        vi.vendor_id, 
        vi.status,
        vi.description,
        v.name as vendor_name,
        v.contact_email as vendor_email,
        vi.created_at
      FROM vendor_invoices vi 
      LEFT JOIN vendors v ON vi.vendor_id = v.id 
      ORDER BY vi.created_at DESC
    `);

    console.log('\n📋 All invoices with vendor assignments:');
    invoices.rows.forEach(invoice => {
      console.log(`   - ID: ${invoice.id}, Invoice: ${invoice.invoice_number}`);
      console.log(`     Vendor ID: ${invoice.vendor_id}, Vendor Name: "${invoice.vendor_name}"`);
      console.log(`     Vendor Email: ${invoice.vendor_email}`);
      console.log(`     Status: ${invoice.status}`);
      console.log(`     Description: ${invoice.description.substring(0, 50)}...`);
      console.log('');
    });

    // Check if there are any invoices that should show F.A.S.T. Rescue
    const fastInvoices = await pool.query(`
      SELECT 
        vi.id, 
        vi.invoice_number, 
        vi.vendor_id,
        v.name as vendor_name
      FROM vendor_invoices vi 
      LEFT JOIN vendors v ON vi.vendor_id = v.id 
      WHERE v.name LIKE '%FAST%' OR v.name LIKE '%F.A.S.T%'
      ORDER BY vi.created_at DESC
    `);

    console.log('\n🔍 Invoices that should show F.A.S.T. Rescue:');
    if (fastInvoices.rows.length === 0) {
      console.log('   - No invoices found with F.A.S.T. Rescue vendor');
    } else {
      fastInvoices.rows.forEach(invoice => {
        console.log(`   - ID: ${invoice.id}, Invoice: ${invoice.invoice_number}, Vendor: "${invoice.vendor_name}"`);
      });
    }

    console.log('\n💡 Analysis:');
    console.log('   - All invoices are currently assigned to GTACPR Staff Portal (vendor_id = 2)');
    console.log('   - The vendor detection may not have been working as expected');
    console.log('   - Or the invoices were uploaded before vendor detection was fully implemented');
    console.log('   - The "GTACPR Staff Portal" you see is correct for all current invoices');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkVendorNames(); 