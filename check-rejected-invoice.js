const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'cpr_jun21',
  user: 'postgres',
  password: 'gtacpr',
});

async function checkRejectedInvoice() {
  try {
    console.log('🔍 Checking the previously rejected invoice INV-2025-954797...\n');
    
    // Check the specific invoice with both old and new status fields
    const invoiceResult = await pool.query(`
      SELECT 
        i.id,
        i.invoice_number,
        i.amount,
        i.status as old_status,
        i.approval_status as new_approval_status,
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
    console.log(`  Old Status: ${invoice.old_status}`);
    console.log(`  New Approval Status: ${invoice.new_approval_status || 'NULL (not set yet)'}`);
    console.log(`  Payment Status: ${invoice.payment_status}`);
    console.log(`  Base Cost: $${invoice.base_cost}`);
    console.log(`  Tax Amount: $${invoice.tax_amount}`);
    console.log(`  Amount Paid: $${invoice.amount_paid}`);
    console.log(`  Balance Due: $${invoice.balance_due}`);
    console.log(`  Paid Date: ${invoice.paid_date || 'Not paid'}`);

    console.log('\n🔄 Migration Status:');
    if (invoice.old_status === 'rejected' && !invoice.new_approval_status) {
      console.log('  ⚠️  This invoice needs to be migrated to the new approval_status field');
      console.log('  📝 The old "status" field shows "rejected" but approval_status is NULL');
    } else if (invoice.new_approval_status) {
      console.log('  ✅ This invoice has been migrated to the new approval_status field');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkRejectedInvoice(); 