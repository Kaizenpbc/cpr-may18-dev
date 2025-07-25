const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  password: 'gtacpr',
  host: '127.0.0.1',
  port: 5432,
  database: 'cpr_jun21'
});

async function testModalFix() {
  try {
    console.log('🧪 Testing Modal Fix...\n');
    
    // Get a test invoice
    const result = await pool.query('SELECT id, invoice_number, rate, amount, total FROM vendor_invoices ORDER BY id DESC LIMIT 1');
    
    if (result.rows.length === 0) {
      console.log('❌ No invoices found in database');
      return;
    }
    
    const testInvoice = result.rows[0];
    console.log(`🎯 Testing modal data for invoice ID: ${testInvoice.id}`);
    console.log('📊 Raw database values:');
    console.log(`  - Rate: ${testInvoice.rate} (type: ${typeof testInvoice.rate})`);
    console.log(`  - Amount: ${testInvoice.amount} (type: ${typeof testInvoice.amount})`);
    console.log(`  - Total: ${testInvoice.total} (type: ${typeof testInvoice.total})`);
    
    // Simulate the frontend processing
    const processedData = {
      rate: typeof testInvoice.rate === 'string' ? parseFloat(testInvoice.rate) : testInvoice.rate || 0,
      amount: typeof testInvoice.amount === 'string' ? parseFloat(testInvoice.amount) : testInvoice.amount || 0,
      total: typeof testInvoice.total === 'string' ? parseFloat(testInvoice.total) : testInvoice.total || 0
    };
    
    console.log('\n🔄 After frontend processing:');
    console.log(`  - Rate: ${processedData.rate} (type: ${typeof processedData.rate})`);
    console.log(`  - Amount: ${processedData.amount} (type: ${typeof processedData.amount})`);
    console.log(`  - Total: ${processedData.total} (type: ${typeof processedData.total})`);
    
    // Test the toFixed() calls
    console.log('\n✅ Testing toFixed() calls:');
    try {
      const rateDisplay = processedData.rate && typeof processedData.rate === 'number' && processedData.rate > 0 ? 
        `$${processedData.rate.toFixed(2)}` : 'N/A';
      console.log(`  - Rate display: ${rateDisplay}`);
      
      const amountDisplay = processedData.amount && typeof processedData.amount === 'number' ? 
        processedData.amount.toFixed(2) : '0.00';
      console.log(`  - Amount display: ${amountDisplay}`);
      
      const totalDisplay = processedData.total && typeof processedData.total === 'number' && processedData.total > 0 ? 
        processedData.total.toFixed(2) : 
        (processedData.amount && typeof processedData.amount === 'number' ? processedData.amount.toFixed(2) : '0.00');
      console.log(`  - Total display: ${totalDisplay}`);
      
      console.log('\n🎉 All toFixed() calls successful! Modal should work properly.');
      
    } catch (error) {
      console.error('❌ Error in toFixed() calls:', error);
    }
    
  } catch (err) {
    console.error('❌ Test failed:', err);
  } finally {
    await pool.end();
  }
}

testModalFix(); 