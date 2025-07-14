const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'cpr_jun21',
  user: 'postgres',
  password: 'gtacpr',
});

async function reverseDuplicatePayment() {
  try {
    console.log('🔍 Finding duplicate payments for invoice...\n');

    // First, let's find the invoice with the negative balance
    const invoiceResult = await pool.query(`
      SELECT 
        i.id,
        i.invoice_number,
        i.base_cost,
        i.tax_amount,
        (i.base_cost + i.tax_amount) as total_amount,
        COALESCE(SUM(CASE WHEN p.status = 'verified' THEN p.amount ELSE 0 END), 0) as amount_paid,
        GREATEST(0, (i.base_cost + i.tax_amount) - COALESCE(SUM(CASE WHEN p.status = 'verified' THEN p.amount ELSE 0 END), 0)) as balance_due
      FROM invoice_with_breakdown i
      LEFT JOIN payments p ON i.id = p.invoice_id
      WHERE i.invoice_number = 'INV-2025-502884'
      GROUP BY i.id, i.invoice_number, i.base_cost, i.tax_amount
    `);

    if (invoiceResult.rows.length === 0) {
      console.log('❌ Invoice not found');
      return;
    }

    const invoice = invoiceResult.rows[0];
    console.log('📋 Invoice Details:');
    console.log(`  Invoice ID: ${invoice.id}`);
    console.log(`  Invoice Number: ${invoice.invoice_number}`);
    console.log(`  Base Cost: $${invoice.base_cost}`);
    console.log(`  Tax Amount: $${invoice.tax_amount}`);
    console.log(`  Total Amount: $${invoice.total_amount}`);
    console.log(`  Amount Paid: $${invoice.amount_paid}`);
    console.log(`  Balance Due: $${invoice.balance_due}`);

    // Find all payments for this invoice
    const paymentsResult = await pool.query(`
      SELECT 
        id,
        amount,
        payment_date,
        payment_method,
        reference_number,
        status,
        created_at,
        submitted_by_org_at,
        verified_by_accounting_at
      FROM payments 
      WHERE invoice_id = $1
      ORDER BY created_at DESC
    `, [invoice.id]);

    console.log(`\n💰 Found ${paymentsResult.rows.length} payments:`);
    paymentsResult.rows.forEach((payment, index) => {
      console.log(`  ${index + 1}. Payment ID: ${payment.id}`);
      console.log(`     Amount: $${payment.amount}`);
      console.log(`     Date: ${payment.payment_date}`);
      console.log(`     Method: ${payment.payment_method}`);
      console.log(`     Status: ${payment.status}`);
      console.log(`     Created: ${payment.created_at}`);
      console.log('');
    });

    // Find the most recent payment that can be reversed
    const recentPayments = paymentsResult.rows.filter(p => p.status === 'pending_verification');
    
    if (recentPayments.length === 0) {
      console.log('❌ No pending payments found to reverse');
      return;
    }

    const paymentToReverse = recentPayments[0];
    console.log(`🔄 Reversing payment ID: ${paymentToReverse.id}`);
    console.log(`   Amount: $${paymentToReverse.amount}`);
    console.log(`   Status: ${paymentToReverse.status}`);

    // Reverse the payment by deleting it
    const deleteResult = await pool.query(`
      DELETE FROM payments 
      WHERE id = $1 AND status = 'pending_verification'
      RETURNING *
    `, [paymentToReverse.id]);

    if (deleteResult.rows.length === 0) {
      console.log('❌ Failed to delete payment - it may have been verified already');
      return;
    }

    console.log('✅ Payment successfully reversed!');

    // Check the new balance
    const newBalanceResult = await pool.query(`
      SELECT 
        COALESCE(SUM(CASE WHEN p.status = 'verified' THEN p.amount ELSE 0 END), 0) as amount_paid,
        GREATEST(0, (i.base_cost + i.tax_amount) - COALESCE(SUM(CASE WHEN p.status = 'verified' THEN p.amount ELSE 0 END), 0)) as balance_due
      FROM invoice_with_breakdown i
      LEFT JOIN payments p ON i.id = p.invoice_id
      WHERE i.id = $1
      GROUP BY i.base_cost, i.tax_amount
    `, [invoice.id]);

    const newBalance = newBalanceResult.rows[0];
    console.log(`\n📊 New Balance:`);
    console.log(`  Amount Paid: $${newBalance.amount_paid}`);
    console.log(`  Balance Due: $${newBalance.balance_due}`);

    // Update invoice status if needed
    if (newBalance.balance_due > 0) {
      await pool.query(`
        UPDATE invoices 
        SET status = 'pending', updated_at = NOW()
        WHERE id = $1
      `, [invoice.id]);
      console.log('✅ Invoice status updated to "pending"');
    }

  } catch (error) {
    console.error('❌ Error reversing payment:', error);
  } finally {
    await pool.end();
  }
}

reverseDuplicatePayment(); 