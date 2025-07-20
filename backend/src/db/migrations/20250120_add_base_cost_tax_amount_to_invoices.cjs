module.exports = {
  async up(db) {
    console.log('Adding base_cost and tax_amount columns to invoices table...');
    
    // Add the new columns
    await db.query(`
      ALTER TABLE invoices
      ADD COLUMN IF NOT EXISTS base_cost DECIMAL(10,2),
      ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(10,2);
    `);
    
    // Update existing invoices to calculate base_cost and tax_amount from amount
    await db.query(`
      UPDATE invoices 
      SET 
        base_cost = ROUND(amount / 1.13, 2),
        tax_amount = ROUND(amount - (amount / 1.13), 2)
      WHERE base_cost IS NULL OR tax_amount IS NULL;
    `);
    
    console.log('✅ Successfully added base_cost and tax_amount columns to invoices table');
  },

  async down(db) {
    console.log('Removing base_cost and tax_amount columns from invoices table...');
    
    await db.query(`
      ALTER TABLE invoices
      DROP COLUMN IF EXISTS base_cost,
      DROP COLUMN IF EXISTS tax_amount;
    `);
    
    console.log('✅ Successfully removed base_cost and tax_amount columns from invoices table');
  },
}; 