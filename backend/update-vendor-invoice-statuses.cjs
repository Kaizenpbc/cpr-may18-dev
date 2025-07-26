const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'gtacpr',
  database: process.env.DB_NAME || 'cpr_jun21',
});

async function updateVendorInvoiceStatuses() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Starting vendor invoice status updates...');
    
    // Update existing 'submitted' status to 'submitted_to_admin'
    const result = await client.query(`
      UPDATE vendor_invoices 
      SET status = 'submitted_to_admin' 
      WHERE status = 'submitted'
    `);
    
    console.log(`✅ Updated ${result.rowCount} invoices from 'submitted' to 'submitted_to_admin'`);
    
    // Check for any other statuses that need updating
    const statusCheck = await client.query(`
      SELECT status, COUNT(*) as count 
      FROM vendor_invoices 
      GROUP BY status
    `);
    
    console.log('📊 Current status distribution:');
    statusCheck.rows.forEach(row => {
      console.log(`  - ${row.status}: ${row.count} invoices`);
    });
    
    console.log('✅ Status updates completed successfully!');
    
  } catch (error) {
    console.error('❌ Error updating vendor invoice statuses:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

updateVendorInvoiceStatuses()
  .then(() => {
    console.log('🎉 Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  }); 