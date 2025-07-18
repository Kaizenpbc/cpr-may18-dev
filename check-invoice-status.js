const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'cpr_jun21',
  user: 'postgres',
  password: 'gtacpr',
});

async function checkInvoiceStatus() {
  try {
    console.log('📊 Checking Invoice Status for INV-2025-954797\n');

    // Check the specific invoice
    const invoiceResult = await pool.query(`
      SELECT 
        i.id,
        i.invoice_number,
        i.amount,
        i.status,
        i.paid_date,
        i.base_cost,
        i.tax_amount,
        COALESCE(payments.total_paid, 0) as amount_paid,
        GREATEST(0, (i.base_cost + i.tax_amount) - COALESCE(payments.total_paid, 0)) as balance_due,
        CASE 
          WHEN COALESCE(payments.total_paid, 0) >= (i.base_cost + i.tax_amount) THEN 'paid'
          WHEN CURRENT_DATE > i.due_date THEN 'overdue'
          ELSE 'pending'
        END as payment_status
      FROM invoice_with_breakdown i
      LEFT JOIN (
        SELECT invoice_id, SUM(amount) as total_paid
        FROM payments 
        WHERE status = 'verified'
        GROUP BY invoice_id
      ) payments ON payments.invoice_id = i.id
      WHERE i.invoice_number = 'INV-2025-954797'
    `);

    if (invoiceResult.rows.length === 0) {
      console.log('❌ Invoice INV-2025-954797 not found');
      return;
    }

    const invoice = invoiceResult.rows[0];
    console.log('📋 Invoice Details:');
    console.log(`  Invoice ID: ${invoice.id}`);
    console.log(`  Invoice Number: ${invoice.invoice_number}`);
    console.log(`  Amount: $${invoice.amount}`);
    console.log(`  Status: ${invoice.status}`);
    console.log(`  Payment Status: ${invoice.payment_status}`);
    console.log(`  Base Cost: $${invoice.base_cost}`);
    console.log(`  Tax Amount: $${invoice.tax_amount}`);
    console.log(`  Amount Paid: $${invoice.amount_paid}`);
    console.log(`  Balance Due: $${invoice.balance_due}`);
    console.log(`  Paid Date: ${invoice.paid_date || 'Not paid'}`);

    console.log('\n🔍 Looking for invoices that can be approved...\n');

    // Find invoices with statuses that can be approved
    const availableInvoices = await pool.query(`
      SELECT 
        i.id,
        i.invoice_number,
        i.amount,
        i.status,
        CASE 
          WHEN COALESCE(payments.total_paid, 0) >= (i.base_cost + i.tax_amount) THEN 'paid'
          WHEN CURRENT_DATE > i.due_date THEN 'overdue'
          ELSE 'pending'
        END as payment_status
      FROM invoice_with_breakdown i
      LEFT JOIN (
        SELECT invoice_id, SUM(amount) as total_paid
        FROM payments 
        WHERE status = 'verified'
        GROUP BY invoice_id
      ) payments ON payments.invoice_id = i.id
      WHERE i.status IN ('pending', 'draft', 'new', 'pending_approval')
      ORDER BY i.created_at DESC
      LIMIT 10
    `);

    console.log(`Found ${availableInvoices.rows.length} invoices that can be approved:`);
    availableInvoices.rows.forEach((inv, index) => {
      console.log(`${index + 1}. ${inv.invoice_number} - Status: ${inv.status} - Payment Status: ${inv.payment_status} - Amount: $${inv.amount}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkInvoiceStatus(); 