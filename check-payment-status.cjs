const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'gtacpr',
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: 'cpr_jun21',
});

async function checkPaymentStatus() {
  try {
    console.log('🔍 Checking status of payment ID 10 ($23.51 payment)\n');

    // Check the specific payment
    const result = await pool.query(`
      SELECT 
        id,
        invoice_id,
        amount,
        payment_date,
        payment_method,
        reference_number,
        notes,
        status,
        created_at,
        submitted_by_org_at,
        verified_by_accounting_at,
        reversed_at,
        reversed_by
      FROM payments
      WHERE id = 10
    `);

    if (result.rows.length === 0) {
      console.log('❌ Payment ID 10 not found!');
      return;
    }

    const payment = result.rows[0];
    console.log('📋 Payment Details:');
    console.log(`  ID: ${payment.id}`);
    console.log(`  Amount: $${Number(payment.amount).toFixed(2)}`);
    console.log(`  Method: ${payment.payment_method}`);
    console.log(`  Date: ${payment.payment_date}`);
    console.log(`  Status: ${payment.status}`);
    console.log(`  Notes: ${payment.notes || 'N/A'}`);
    console.log(`  Submitted: ${payment.submitted_by_org_at || 'N/A'}`);
    console.log(`  Verified: ${payment.verified_by_accounting_at || 'N/A'}`);
    console.log(`  Reversed: ${payment.reversed_at || 'N/A'}`);

    // Check invoice status
    const invoiceResult = await pool.query(`
      SELECT 
        id,
        invoice_number,
        status,
        amount,
        paid_date,
        updated_at
      FROM invoices
      WHERE id = ${payment.invoice_id}
    `);

    if (invoiceResult.rows.length > 0) {
      const invoice = invoiceResult.rows[0];
      console.log('\n📄 Invoice Details:');
      console.log(`  ID: ${invoice.id}`);
      console.log(`  Number: ${invoice.invoice_number}`);
      console.log(`  Status: ${invoice.status}`);
      console.log(`  Amount: $${Number(invoice.amount).toFixed(2)}`);
      console.log(`  Paid Date: ${invoice.paid_date || 'N/A'}`);
      console.log(`  Updated: ${invoice.updated_at}`);
    }

    // Check total payments for this invoice
    const totalResult = await pool.query(`
      SELECT 
        COUNT(*) as total_payments,
        SUM(CASE WHEN status = 'verified' THEN amount ELSE 0 END) as total_verified,
        SUM(CASE WHEN status = 'pending_verification' THEN amount ELSE 0 END) as total_pending,
        SUM(CASE WHEN status = 'rejected' THEN amount ELSE 0 END) as total_rejected
      FROM payments
      WHERE invoice_id = ${payment.invoice_id}
    `);

    if (totalResult.rows.length > 0) {
      const totals = totalResult.rows[0];
      console.log('\n💰 Payment Summary for Invoice:');
      console.log(`  Total Payments: ${totals.total_payments}`);
      console.log(`  Verified: $${Number(totals.total_verified || 0).toFixed(2)}`);
      console.log(`  Pending: $${Number(totals.total_pending || 0).toFixed(2)}`);
      console.log(`  Rejected: $${Number(totals.total_rejected || 0).toFixed(2)}`);
    }

    // Check if this payment should still appear in pending verifications
    if (payment.status === 'pending_verification' && !payment.verified_by_accounting_at) {
      console.log('\n⚠️  This payment should still appear in pending verifications');
    } else if (payment.status === 'verified' && payment.verified_by_accounting_at) {
      console.log('\n✅ This payment has been verified and should NOT appear in pending verifications');
    } else if (payment.status === 'rejected') {
      console.log('\n❌ This payment has been rejected');
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkPaymentStatus(); 