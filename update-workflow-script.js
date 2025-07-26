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
    console.log('🔄 Starting vendor invoice workflow update...');
    
    // First, add the new 'pending' status to the enum if it doesn't exist
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
      SET status = 'pending', updated_at = NOW()
      WHERE status = 'submitted'
      RETURNING id, status
    `);
    console.log(`✅ Updated ${submittedResult.rowCount} submitted invoices to pending`);
    
    // Update ready_to_process to pending (old status)
    const readyToProcessResult = await client.query(`
      UPDATE vendor_invoices 
      SET status = 'pending', updated_at = NOW()
      WHERE status = 'ready_to_process'
      RETURNING id, status
    `);
    console.log(`✅ Updated ${readyToProcessResult.rowCount} ready_to_process invoices to pending`);
    
    // Keep ready_for_processing as is (this is the new status after vendor submits)
    console.log('ℹ️ Keeping ready_for_processing invoices as is');
    
    // Show current status distribution
    const statusCounts = await client.query(`
      SELECT status, COUNT(*) as count
      FROM vendor_invoices
      GROUP BY status
      ORDER BY status
    `);
    
    console.log('\n📊 Current invoice status distribution:');
    statusCounts.rows.forEach(row => {
      console.log(`  ${row.status}: ${row.count} invoices`);
    });
    
    console.log('\n✅ Workflow update completed successfully!');
    console.log('\n📋 New Workflow:');
    console.log('  1. Upload → pending (vendor reviews)');
    console.log('  2. Submit to Admin → ready_for_processing');
    console.log('  3. Admin approves → sent_to_accounting');
    console.log('  4. Accounting pays → paid');
    
  } catch (error) {
    console.error('❌ Error updating workflow:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

updateWorkflow().catch(console.error); 