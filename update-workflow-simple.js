const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'cpr_jun21',
  user: 'postgres',
  password: 'gtacpr'
});

async function updateWorkflow() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Updating vendor invoice workflow...');
    
    // First, add the 'pending' status to the enum if it doesn't exist
    console.log('📋 Adding pending status to enum...');
    try {
      await client.query(`
        ALTER TYPE vendor_invoice_status_updated ADD VALUE IF NOT EXISTS 'pending';
      `);
      console.log('✅ Pending status added to enum');
    } catch (error) {
      console.log('ℹ️ Pending status already exists or enum not found');
    }
    
    // Update existing invoices to the new workflow
    console.log('🔄 Updating existing invoice statuses...');
    
    // Update submitted invoices to pending (vendor can review before submitting)
    const submittedResult = await client.query(`
      UPDATE vendor_invoices 
      SET status = 'pending' 
      WHERE status = 'submitted'
    `);
    console.log(`✅ Updated ${submittedResult.rowCount} submitted invoices to pending`);
    
    // Update ready_to_process to ready_for_processing
    const readyResult = await client.query(`
      UPDATE vendor_invoices 
      SET status = 'ready_for_processing' 
      WHERE status = 'ready_to_process'
    `);
    console.log(`✅ Updated ${readyResult.rowCount} ready_to_process invoices to ready_for_processing`);
    
    // Update pending_review to ready_for_processing
    const pendingResult = await client.query(`
      UPDATE vendor_invoices 
      SET status = 'ready_for_processing' 
      WHERE status = 'pending_review'
    `);
    console.log(`✅ Updated ${pendingResult.rowCount} pending_review invoices to ready_for_processing`);
    
    // Update approved to sent_to_accounting
    const approvedResult = await client.query(`
      UPDATE vendor_invoices 
      SET status = 'sent_to_accounting' 
      WHERE status = 'approved'
    `);
    console.log(`✅ Updated ${approvedResult.rowCount} approved invoices to sent_to_accounting`);
    
    // Update partially_paid to paid
    const paidResult = await client.query(`
      UPDATE vendor_invoices 
      SET status = 'paid' 
      WHERE status = 'partially_paid'
    `);
    console.log(`✅ Updated ${paidResult.rowCount} partially_paid invoices to paid`);
    
    console.log('🎉 Workflow update completed successfully!');
    
    // Show current status distribution
    const statusResult = await client.query(`
      SELECT status, COUNT(*) as count 
      FROM vendor_invoices 
      GROUP BY status 
      ORDER BY count DESC
    `);
    
    console.log('\n📊 Current invoice status distribution:');
    statusResult.rows.forEach(row => {
      console.log(`  ${row.status}: ${row.count} invoices`);
    });
    
  } catch (error) {
    console.error('❌ Error updating workflow:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

updateWorkflow(); 