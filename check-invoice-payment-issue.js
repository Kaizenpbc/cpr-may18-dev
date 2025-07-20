const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'cpr_jun21',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'gtacpr',
});

async function checkInvoicePaymentIssue() {
  try {
    console.log('🔍 Investigating payment submission failure for INV-2025-277254...\n');
    
    // 1. Check invoice details
    console.log('1. Checking invoice details...');
    const invoiceResult = await pool.query(`
      SELECT 
        i.id,
        i.invoice_number,
        i.amount,
        i.base_cost,
        i.tax_amount,
        i.status,
        i.organization_id,
        i.course_request_id,
        i.created_at,
        i.updated_at,
        o.name as organization_name,
        o.contact_email,
        cr.status as course_status,
        cr.completed_at
      FROM invoices i
      JOIN organizations o ON i.organization_id = o.id
      LEFT JOIN course_requests cr ON i.course_request_id = cr.id
      WHERE i.invoice_number = 'INV-2025-277254'
    `);
    
    if (invoiceResult.rows.length === 0) {
      console.log('❌ Invoice INV-2025-277254 not found');
      return;
    }
    
    const invoice = invoiceResult.rows[0];
    console.log('✅ Invoice found:');
    console.log(`   ID: ${invoice.id}`);
    console.log(`   Amount: $${invoice.amount}`);
    console.log(`   Base Cost: $${invoice.base_cost}`);
    console.log(`   Tax: $${invoice.tax_amount}`);
    console.log(`   Status: ${invoice.status}`);
    console.log(`   Organization: ${invoice.organization_name}`);
    console.log(`   Course Status: ${invoice.course_status}`);
    console.log(`   Created: ${invoice.created_at}`);
    console.log('');
    
    // 2. Check existing payments for this invoice
    console.log('2. Checking existing payments...');
    const paymentsResult = await pool.query(`
      SELECT 
        id,
        invoice_id,
        amount,
        payment_date,
        payment_method,
        reference_number,
        notes,
        status,
        submitted_by_org_at,
        verified_by_accounting_at,
        created_at
      FROM payments 
      WHERE invoice_id = $1
      ORDER BY created_at DESC
    `, [invoice.id]);
    
    if (paymentsResult.rows.length > 0) {
      console.log(`✅ Found ${paymentsResult.rows.length} payment(s):`);
      paymentsResult.rows.forEach((payment, index) => {
        console.log(`   Payment ${index + 1}:`);
        console.log(`     Amount: $${payment.amount}`);
        console.log(`     Method: ${payment.payment_method || 'N/A'}`);
        console.log(`     Status: ${payment.status}`);
        console.log(`     Date: ${payment.payment_date}`);
        console.log(`     Submitted: ${payment.submitted_by_org_at || 'N/A'}`);
        console.log(`     Verified: ${payment.verified_by_accounting_at || 'N/A'}`);
        console.log(`     Notes: ${payment.notes || 'N/A'}`);
        console.log('');
      });
    } else {
      console.log('ℹ️  No payments found for this invoice');
      console.log('');
    }
    
    // 3. Check organization user for Iffat College
    console.log('3. Checking organization user...');
    const orgUserResult = await pool.query(`
      SELECT 
        u.id,
        u.username,
        u.email,
        u.role,
        u.organization_id,
        u.created_at,
        u.last_login
      FROM users u
      WHERE u.organization_id = $1 AND u.role = 'organization'
    `, [invoice.organization_id]);
    
    if (orgUserResult.rows.length > 0) {
      console.log(`✅ Found ${orgUserResult.rows.length} organization user(s):`);
      orgUserResult.rows.forEach((user, index) => {
        console.log(`   User ${index + 1}:`);
        console.log(`     ID: ${user.id}`);
        console.log(`     Username: ${user.username}`);
        console.log(`     Email: ${user.email}`);
        console.log(`     Role: ${user.role}`);
        console.log(`     Last Login: ${user.last_login || 'Never'}`);
        console.log('');
      });
    } else {
      console.log('❌ No organization users found for Iffat College');
      console.log('');
    }
    
    // 4. Check payment table structure
    console.log('4. Checking payments table structure...');
    const tableStructureResult = await pool.query(`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns 
      WHERE table_name = 'payments' 
      ORDER BY ordinal_position
    `);
    
    console.log('Payments table columns:');
    tableStructureResult.rows.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });
    console.log('');
    
    // 5. Check for any recent errors in the logs (simulate)
    console.log('5. Potential issues analysis...');
    
    const balanceDue = Number(invoice.amount);
    const totalPaid = paymentsResult.rows
      .filter(p => p.status === 'verified')
      .reduce((sum, p) => sum + Number(p.amount), 0);
    
    console.log(`   Balance Due: $${balanceDue}`);
    console.log(`   Total Paid: $${totalPaid}`);
    console.log(`   Remaining: $${balanceDue - totalPaid}`);
    console.log('');
    
    // 6. Check if there are older unpaid invoices
    console.log('6. Checking for older unpaid invoices...');
    const olderInvoicesResult = await pool.query(`
      SELECT 
        id,
        invoice_number,
        amount,
        status,
        created_at
      FROM invoices 
      WHERE organization_id = $1 
        AND status IN ('pending', 'payment_submitted')
        AND created_at < $2
        AND id != $3
      ORDER BY created_at ASC
    `, [invoice.organization_id, invoice.created_at, invoice.id]);
    
    if (olderInvoicesResult.rows.length > 0) {
      console.log(`⚠️  Found ${olderInvoicesResult.rows.length} older unpaid invoice(s):`);
      olderInvoicesResult.rows.forEach((inv, index) => {
        console.log(`   ${index + 1}. ${inv.invoice_number}: $${inv.amount} (${inv.status}) - Created: ${inv.created_at}`);
      });
      console.log('   This might be causing the payment order validation to fail.');
    } else {
      console.log('✅ No older unpaid invoices found');
    }
    console.log('');
    
    // 7. Test payment submission logic
    console.log('7. Testing payment submission logic...');
    
    const canSubmitPayment = () => {
      const status = invoice.status;
      const balanceDue = Number(invoice.amount);
      const hasOlderUnpaid = olderInvoicesResult.rows.length > 0;
      
      console.log(`   Status check: ${status} !== 'paid' && ${status} !== 'payment_submitted' = ${status !== 'paid' && status !== 'payment_submitted'}`);
      console.log(`   Balance check: ${balanceDue} > 0 = ${balanceDue > 0}`);
      console.log(`   Older invoices check: !${hasOlderUnpaid} = ${!hasOlderUnpaid}`);
      
      const result = balanceDue > 0 && status !== 'paid' && status !== 'payment_submitted' && !hasOlderUnpaid;
      console.log(`   Final result: ${result}`);
      
      return result;
    };
    
    const canSubmit = canSubmitPayment();
    console.log(`   Can submit payment: ${canSubmit ? 'YES' : 'NO'}`);
    
    if (!canSubmit) {
      console.log('\n❌ Payment submission blocked by validation:');
      if (invoice.status === 'paid') {
        console.log('   - Invoice is already marked as paid');
      }
      if (invoice.status === 'payment_submitted') {
        console.log('   - Payment already submitted and pending verification');
      }
      if (balanceDue <= 0) {
        console.log('   - No balance due');
      }
      if (olderInvoicesResult.rows.length > 0) {
        console.log('   - There are older unpaid invoices that should be paid first');
      }
    }
    
    console.log('\n🎯 Summary:');
    console.log(`   Invoice Status: ${invoice.status}`);
    console.log(`   Balance Due: $${balanceDue}`);
    console.log(`   Older Unpaid Invoices: ${olderInvoicesResult.rows.length}`);
    console.log(`   Can Submit Payment: ${canSubmit ? 'YES' : 'NO'}`);
    
  } catch (error) {
    console.error('❌ Error investigating payment issue:', error);
  } finally {
    await pool.end();
  }
}

checkInvoicePaymentIssue(); 