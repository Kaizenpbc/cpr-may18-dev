const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  password: 'gtacpr',
  host: '127.0.0.1',
  port: 5432,
  database: 'cpr_jun21'
});

async function checkPendingActions() {
  console.log('🔍 Checking actual pending actions counts...\n');
  
  try {
    // Check pending payments
    const paymentsResult = await pool.query(`
      SELECT COUNT(*) as pending_payments
      FROM payments p
      WHERE p.status = 'pending_verification' OR p.verified_by_accounting_at IS NULL
    `);
    
    // Check pending invoices
    const invoicesResult = await pool.query(`
      SELECT COUNT(*) as pending_invoices
      FROM invoices i
      WHERE i.approval_status IN ('pending_approval', 'pending', 'draft') 
         OR i.approval_status IS NULL
    `);
    
    const pendingPayments = paymentsResult.rows[0].pending_payments;
    const pendingInvoices = invoicesResult.rows[0].pending_invoices;
    
    console.log('📊 ACTUAL COUNTS:');
    console.log(`   Payments Pending Verification: ${pendingPayments}`);
    console.log(`   Invoices Pending Approval: ${pendingInvoices}`);
    
    // Show some sample data
    console.log('\n📋 SAMPLE PENDING PAYMENTS:');
    const samplePayments = await pool.query(`
      SELECT p.id, p.amount, p.status, p.payment_date, i.invoice_number
      FROM payments p
      JOIN invoices i ON p.invoice_id = i.id
      WHERE p.status = 'pending_verification' OR p.verified_by_accounting_at IS NULL
      LIMIT 3
    `);
    
    samplePayments.rows.forEach(payment => {
      console.log(`   - Payment ID ${payment.id}: $${payment.amount} for Invoice ${payment.invoice_number} (${payment.status})`);
    });
    
    console.log('\n📋 SAMPLE PENDING INVOICES:');
    const sampleInvoices = await pool.query(`
      SELECT i.id, i.invoice_number, i.amount, i.approval_status, o.name as org_name
      FROM invoices i
      JOIN organizations o ON i.organization_id = o.id
      WHERE i.approval_status IN ('pending_approval', 'pending', 'draft') 
         OR i.approval_status IS NULL
      LIMIT 3
    `);
    
    sampleInvoices.rows.forEach(invoice => {
      console.log(`   - Invoice ${invoice.invoice_number}: $${invoice.amount} for ${invoice.org_name} (${invoice.approval_status || 'no status'})`);
    });
    
  } catch (error) {
    console.error('❌ Error checking pending actions:', error.message);
  } finally {
    await pool.end();
  }
}

checkPendingActions(); 