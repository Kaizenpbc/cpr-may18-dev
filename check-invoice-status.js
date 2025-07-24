const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  password: 'gtacpr',
  host: '127.0.0.1',
  port: 5432,
  database: 'cpr_jun21'
});

async function checkInvoiceStatus() {
  try {
    console.log('🔍 Checking vendor invoice statuses...\n');

    // Check recent invoices with their status
    const result = await pool.query(`
      SELECT 
        vi.id, 
        vi.invoice_number, 
        vi.vendor_id, 
        vi.status,
        vi.description,
        vi.created_at,
        v.name as vendor_name
      FROM vendor_invoices vi 
      LEFT JOIN vendors v ON vi.vendor_id = v.id 
      ORDER BY vi.created_at DESC 
      LIMIT 10
    `);

    console.log('📋 Recent invoices with status:');
    result.rows.forEach(invoice => {
      console.log(`   - ID: ${invoice.id}`);
      console.log(`     Invoice: ${invoice.invoice_number}`);
      console.log(`     Vendor ID: ${invoice.vendor_id}`);
      console.log(`     Vendor Name: ${invoice.vendor_name}`);
      console.log(`     Status: ${invoice.status}`);
      console.log(`     Created: ${invoice.created_at}`);
      console.log('');
    });

    // Check status distribution
    const statusCounts = await pool.query(`
      SELECT 
        vi.status,
        COUNT(*) as count
      FROM vendor_invoices vi 
      GROUP BY vi.status
      ORDER BY count DESC
    `);

    console.log('📊 Invoice counts by status:');
    statusCounts.rows.forEach(status => {
      console.log(`   - ${status.status}: ${status.count} invoices`);
    });

    // Check which invoices would show in accounting portal
    const accountingInvoices = await pool.query(`
      SELECT 
        vi.id, 
        vi.invoice_number, 
        vi.vendor_id, 
        vi.status,
        v.name as vendor_name
      FROM vendor_invoices vi 
      LEFT JOIN vendors v ON vi.vendor_id = v.id 
      WHERE vi.status = 'sent_to_accounting'
      ORDER BY vi.created_at DESC
    `);

    console.log('\n📋 Invoices that would show in Accounting Portal (status = sent_to_accounting):');
    if (accountingInvoices.rows.length === 0) {
      console.log('   - No invoices with status "sent_to_accounting"');
    } else {
      accountingInvoices.rows.forEach(invoice => {
        console.log(`   - ID: ${invoice.id}, Invoice: ${invoice.invoice_number}, Vendor: ${invoice.vendor_name}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkInvoiceStatus(); 