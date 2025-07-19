import pkg from 'pg';
const { Pool } = pkg;

// Use the same database configuration as the backend
const pool = new Pool({
  host: '127.0.0.1',
  port: 5432,
  database: 'cpr_jun21',
  user: 'postgres',
  password: 'gtacpr'
});

async function fixInvoice() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Fixing invoice ID 9...');
    
    // Get current invoice data
    const getResult = await client.query(
      'SELECT id, invoice_number, students_billed, rate_per_student, amount FROM invoices WHERE id = 9'
    );
    
    if (getResult.rows.length === 0) {
      console.log('❌ Invoice ID 9 not found');
      return;
    }
    
    const invoice = getResult.rows[0];
    console.log('📋 Current invoice data:', invoice);
    
    // Calculate correct values
    const ratePerStudent = 9.00; // We know this from the API response
    const studentsBilled = invoice.students_billed || 3;
    const baseCost = ratePerStudent * studentsBilled;
    const taxAmount = baseCost * 0.13; // HST 13%
    const totalAmount = baseCost + taxAmount;
    
    console.log('🧮 Calculations:');
    console.log(`   Rate per student: $${ratePerStudent}`);
    console.log(`   Students billed: ${studentsBilled}`);
    console.log(`   Base cost: $${baseCost.toFixed(2)}`);
    console.log(`   Tax (HST): $${taxAmount.toFixed(2)}`);
    console.log(`   Total amount: $${totalAmount.toFixed(2)}`);
    
    // Update the invoice
    const updateResult = await client.query(
      `UPDATE invoices 
       SET amount = $1, 
           rate_per_student = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = 9
       RETURNING *`,
      [totalAmount, ratePerStudent]
    );
    
    console.log('✅ Invoice updated successfully!');
    console.log('📊 Updated invoice:', updateResult.rows[0]);
    
  } catch (error) {
    console.error('❌ Error fixing invoice:', error);
  } finally {
    client.release();
    await pool.end();
    process.exit(0);
  }
}

fixInvoice(); 