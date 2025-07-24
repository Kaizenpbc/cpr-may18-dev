const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  password: 'gtacpr',
  host: '127.0.0.1',
  port: 5432,
  database: 'cpr_jun21'
});

async function updateInvoiceVendor() {
  try {
    console.log('🔍 Updating invoice vendor assignments...\n');

    // Check current state
    const currentInvoices = await pool.query(`
      SELECT 
        vi.id, 
        vi.invoice_number, 
        vi.vendor_id, 
        vi.status,
        v.name as vendor_name,
        vi.created_at
      FROM vendor_invoices vi 
      LEFT JOIN vendors v ON vi.vendor_id = v.id 
      ORDER BY vi.created_at DESC
    `);

    console.log('📋 Current invoice assignments:');
    currentInvoices.rows.forEach(invoice => {
      console.log(`   - ID: ${invoice.id}, Invoice: ${invoice.invoice_number}, Vendor: ${invoice.vendor_name} (ID: ${invoice.vendor_id})`);
    });

    // Update newer invoices (18-20) to use GTACPR Staff Portal (vendor_id = 2)
    // This allows them to appear in the vendor portal while maintaining vendor detection for future uploads
    const updateResult = await pool.query(`
      UPDATE vendor_invoices 
      SET vendor_id = 2, updated_at = NOW()
      WHERE id IN (18, 19, 20) AND vendor_id = 1
    `);

    console.log(`\n🔧 Updated ${updateResult.rowCount} invoices to use GTACPR Staff Portal (vendor_id = 2)`);

    // Verify the updates
    const updatedInvoices = await pool.query(`
      SELECT 
        vi.id, 
        vi.invoice_number, 
        vi.vendor_id, 
        vi.status,
        v.name as vendor_name,
        vi.created_at
      FROM vendor_invoices vi 
      LEFT JOIN vendors v ON vi.vendor_id = v.id 
      ORDER BY vi.created_at DESC
    `);

    console.log('\n📋 Updated invoice assignments:');
    updatedInvoices.rows.forEach(invoice => {
      console.log(`   - ID: ${invoice.id}, Invoice: ${invoice.invoice_number}, Vendor: ${invoice.vendor_name} (ID: ${invoice.vendor_id})`);
    });

    // Check what the vendor portal will now show
    const vendorPortalInvoices = await pool.query(`
      SELECT 
        vi.id, 
        vi.invoice_number, 
        vi.vendor_id, 
        vi.status,
        v.name as vendor_name
      FROM vendor_invoices vi 
      LEFT JOIN vendors v ON vi.vendor_id = v.id 
      WHERE vi.vendor_id = 2
      ORDER BY vi.created_at DESC
    `);

    console.log('\n📋 Invoices visible in Vendor Portal (vendor_id = 2):');
    vendorPortalInvoices.rows.forEach(invoice => {
      console.log(`   - ID: ${invoice.id}, Invoice: ${invoice.invoice_number}, Vendor: ${invoice.vendor_name}`);
    });

    console.log('\n💡 Solution Summary:');
    console.log('   - Updated invoices 18-20 to use GTACPR Staff Portal (vendor_id = 2)');
    console.log('   - These invoices will now appear in the Vendor Portal');
    console.log('   - The Accounting Portal will still show "GTACPR Staff Portal" for these invoices');
    console.log('   - Future uploads will continue to use vendor detection for correct vendor assignment');
    console.log('   - This maintains the business logic while ensuring visibility in both portals');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

updateInvoiceVendor(); 