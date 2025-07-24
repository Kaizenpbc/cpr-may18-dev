const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  password: 'gtacpr',
  host: '127.0.0.1',
  port: 5432,
  database: 'cpr_jun21'
});

async function checkVendorUser() {
  try {
    console.log('🔍 Checking vendor user and invoice ownership...\n');

    // Check the vendor@example.com user
    const userResult = await pool.query(`
      SELECT id, email, role FROM users WHERE email = 'vendor@example.com'
    `);

    console.log('👤 Vendor user details:');
    if (userResult.rows.length > 0) {
      const user = userResult.rows[0];
      console.log(`   - User ID: ${user.id}`);
      console.log(`   - Email: ${user.email}`);
      console.log(`   - Role: ${user.role}`);
    } else {
      console.log('   - User not found');
      return;
    }

    // Check which vendor this user is associated with
    const vendorResult = await pool.query(`
      SELECT id, name, contact_email FROM vendors WHERE contact_email = 'vendor@example.com'
    `);

    console.log('\n🏢 Associated vendor:');
    if (vendorResult.rows.length > 0) {
      const vendor = vendorResult.rows[0];
      console.log(`   - Vendor ID: ${vendor.id}`);
      console.log(`   - Vendor Name: ${vendor.name}`);
      console.log(`   - Contact Email: ${vendor.contact_email}`);
    } else {
      console.log('   - No vendor found for this email');
      return;
    }

    // Check what invoices this vendor can see
    const vendorId = vendorResult.rows[0].id;
    const vendorInvoices = await pool.query(`
      SELECT 
        vi.id, 
        vi.invoice_number, 
        vi.vendor_id, 
        vi.status,
        v.name as vendor_name
      FROM vendor_invoices vi 
      LEFT JOIN vendors v ON vi.vendor_id = v.id 
      WHERE vi.vendor_id = $1
      ORDER BY vi.created_at DESC
    `, [vendorId]);

    console.log(`\n📋 Invoices visible to vendor ID ${vendorId} (${vendorResult.rows[0].name}):`);
    vendorInvoices.rows.forEach(invoice => {
      console.log(`   - ID: ${invoice.id}, Invoice: ${invoice.invoice_number}, Vendor: ${invoice.vendor_name}`);
    });

    // Check all invoices to see the distribution
    const allInvoices = await pool.query(`
      SELECT 
        vi.id, 
        vi.invoice_number, 
        vi.vendor_id, 
        vi.status,
        v.name as vendor_name
      FROM vendor_invoices vi 
      LEFT JOIN vendors v ON vi.vendor_id = v.id 
      ORDER BY vi.created_at DESC
    `);

    console.log('\n📊 All invoices by vendor:');
    const vendorCounts = {};
    allInvoices.rows.forEach(invoice => {
      const vendorName = invoice.vendor_name || 'Unknown';
      if (!vendorCounts[vendorName]) {
        vendorCounts[vendorName] = { count: 0, ids: [] };
      }
      vendorCounts[vendorName].count++;
      vendorCounts[vendorName].ids.push(invoice.id);
    });

    Object.entries(vendorCounts).forEach(([vendorName, data]) => {
      console.log(`   - ${vendorName}: ${data.count} invoices (IDs: ${data.ids.join(', ')})`);
    });

    console.log('\n💡 Analysis:');
    console.log('   - The vendor portal only shows invoices where vendor_id matches the authenticated user');
    console.log('   - Newer invoices (18-20) are stored with vendor_id = 1 (F.A.S.T. Rescue)');
    console.log('   - The vendor@example.com user is associated with vendor_id = 2 (GTACPR Staff Portal)');
    console.log('   - So the vendor portal only shows the older invoices (11-17)');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkVendorUser(); 