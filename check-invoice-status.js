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
    console.log('📊 Checking Invoice Payment Status\n');

    // Check all invoices for Iffat College (organization_id = 2)
    const invoicesResult = await pool.query(`
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
      WHERE i.organization_id = 2
      ORDER BY i.created_at DESC
    `);

    console.log(`Found ${invoicesResult.rows.length} invoices for Iffat College:\n`);
    
    invoicesResult.rows.forEach((invoice, index) => {
      const isFullyPaid = invoice.balance_due <= 0;
      const shouldBeMarkedPaid = isFullyPaid && invoice.status !== 'paid';
      
      console.log(`${index + 1}. Invoice: ${invoice.invoice_number}`);
      console.log(`   Amount: $${invoice.amount}`);
      console.log(`   Base Cost: $${invoice.base_cost}`);
      console.log(`   Tax: $${invoice.tax_amount}`);
      console.log(`   Amount Paid: $${invoice.amount_paid}`);
      console.log(`   Balance Due: $${invoice.balance_due}`);
      console.log(`   Status: ${invoice.status}`);
      console.log(`   Payment Status: ${invoice.payment_status}`);
      console.log(`   Paid Date: ${invoice.paid_date || 'Not set'}`);
      console.log(`   Fully Paid: ${isFullyPaid ? '✅ Yes' : '❌ No'}`);
      console.log(`   Should Mark as Paid: ${shouldBeMarkedPaid ? '⚠️ Yes' : '✅ No'}`);
      console.log('');
    });

    // Check payment history for each invoice
    console.log('💰 Payment History:\n');
    for (const invoice of invoicesResult.rows) {
      const paymentsResult = await pool.query(`
        SELECT 
          p.id,
          p.amount,
          p.payment_date,
          p.payment_method,
          p.status,
          p.verified_by_accounting_at
        FROM payments p
        WHERE p.invoice_id = $1
        ORDER BY p.payment_date DESC
      `, [invoice.id]);

      console.log(`Invoice ${invoice.invoice_number} payments:`);
      if (paymentsResult.rows.length === 0) {
        console.log('  No payments recorded');
      } else {
        paymentsResult.rows.forEach((payment, pIndex) => {
          console.log(`  ${pIndex + 1}. $${payment.amount} - ${payment.payment_method} - ${payment.status} - ${payment.payment_date}`);
        });
      }
      console.log('');
    }

    console.log('📋 Summary:');
    const fullyPaid = invoicesResult.rows.filter(inv => inv.balance_due <= 0);
    const needsMarking = fullyPaid.filter(inv => inv.status !== 'paid');
    
    console.log(`  - Total invoices: ${invoicesResult.rows.length}`);
    console.log(`  - Fully paid: ${fullyPaid.length}`);
    console.log(`  - Need to mark as paid: ${needsMarking.length}`);
    
    if (needsMarking.length > 0) {
      console.log('\n⚠️  Invoices that should be marked as paid:');
      needsMarking.forEach(inv => {
        console.log(`  - ${inv.invoice_number} (Balance: $${inv.balance_due})`);
      });
    }

  } catch (error) {
    console.error('❌ Error checking invoice status:', error);
  } finally {
    await pool.end();
  }
}

checkInvoiceStatus(); 