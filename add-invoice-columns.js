const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'cpr_jun21',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'gtacpr',
});

async function addInvoiceColumns() {
  try {
    console.log('🔍 Adding base_cost and tax_amount columns to invoices table...');
    
    // Check current table structure
    const currentColumns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'invoices' 
      ORDER BY ordinal_position
    `);
    
    console.log('Current invoices table columns:');
    currentColumns.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type}`);
    });
    
    // Add the missing columns
    await pool.query(`
      ALTER TABLE invoices
      ADD COLUMN IF NOT EXISTS base_cost DECIMAL(10,2),
      ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(10,2)
    `);
    
    console.log('✅ Added base_cost and tax_amount columns');
    
    // Update existing invoices to calculate base_cost and tax_amount from amount
    const updateResult = await pool.query(`
      UPDATE invoices 
      SET 
        base_cost = ROUND(amount / 1.13, 2),
        tax_amount = ROUND(amount - (amount / 1.13), 2)
      WHERE base_cost IS NULL OR tax_amount IS NULL
    `);
    
    console.log(`✅ Updated ${updateResult.rowCount} existing invoices with calculated values`);
    
    // Verify the changes
    const updatedColumns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'invoices' 
      ORDER BY ordinal_position
    `);
    
    console.log('\nUpdated invoices table columns:');
    updatedColumns.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type}`);
    });
    
    // Test with a sample invoice
    const sampleInvoice = await pool.query(`
      SELECT id, invoice_number, amount, base_cost, tax_amount 
      FROM invoices 
      LIMIT 1
    `);
    
    if (sampleInvoice.rows.length > 0) {
      console.log('\nSample invoice data:');
      console.log(JSON.stringify(sampleInvoice.rows[0], null, 2));
    }
    
  } catch (error) {
    console.error('❌ Error adding invoice columns:', error);
  } finally {
    await pool.end();
  }
}

addInvoiceColumns(); 