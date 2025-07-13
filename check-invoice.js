const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'cpr_jun21', // Correct database name
  user: 'postgres',
  password: 'gtacpr'
});

async function checkInvoice() {
  try {
    const result = await pool.query('SELECT * FROM invoices WHERE invoice_number = $1', ['INV-2025-502884']);
    console.log('Invoice data:', JSON.stringify(result.rows[0], null, 2));
    
    if (result.rows.length > 0) {
      const invoice = result.rows[0];
      console.log('\nCalculations:');
      console.log('Amount:', invoice.amount, 'Type:', typeof invoice.amount);
      console.log('Base cost (amount / 1.13):', invoice.amount / 1.13);
      console.log('Tax amount (amount - base_cost):', invoice.amount - (invoice.amount / 1.13));
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkInvoice(); 