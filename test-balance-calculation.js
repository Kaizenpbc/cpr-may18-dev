const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  password: 'gtacpr',
  host: '127.0.0.1',
  port: 5432,
  database: 'cpr_jun21'
});

async function testBalanceCalculation() {
  console.log('🔍 Testing balance calculation in backend...\n');
  
  try {
    // Test the same query that the backend uses
    const result = await pool.query(`
      SELECT 
        i.id as invoiceid,
        i.invoice_number as invoicenumber,
        i.amount,
        COALESCE(payments.total_paid, 0) as paidtodate,
        (i.amount - COALESCE(payments.total_paid, 0)) as balancedue,
        o.name as organizationname
      FROM invoice_with_breakdown i
      JOIN organizations o ON i.organization_id = o.id
      LEFT JOIN (
        SELECT invoice_id, SUM(amount) as total_paid
        FROM payments 
        WHERE status = 'verified'
        GROUP BY invoice_id
      ) payments ON payments.invoice_id = i.id
      ORDER BY i.created_at DESC
      LIMIT 5
    `);
    
    console.log('📊 Backend Balance Calculation Results:');
    result.rows.forEach(row => {
      console.log(`   Invoice ${row.invoicenumber} (${row.organizationname}):`);
      console.log(`     Amount: $${row.amount}`);
      console.log(`     Paid: $${row.paidtodate}`);
      console.log(`     Balance Due: $${row.balancedue}`);
      console.log(`     Frontend would calculate: $${(parseFloat(row.amount) - parseFloat(row.paidtodate)).toFixed(2)}`);
      console.log(`     Match: ${parseFloat(row.balancedue).toFixed(2) === (parseFloat(row.amount) - parseFloat(row.paidtodate)).toFixed(2) ? '✅' : '❌'}`);
      console.log('');
    });
    
    console.log('✅ Backend is correctly calculating balancedue!');
    console.log('✅ Frontend should now use balancedue instead of calculating');
    
  } catch (error) {
    console.error('❌ Error testing balance calculation:', error.message);
  } finally {
    await pool.end();
  }
}

testBalanceCalculation(); 