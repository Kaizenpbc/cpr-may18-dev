const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'cpr_jun21_dev',
  user: 'postgres',
  password: 'postgres'
});

async function updateToNewWorkflow() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Starting migration to new vendor invoice workflow...');
    
    // First, run the migration to add the new status enum
    console.log('📋 Running database migration...');
    await client.query(`
      ALTER TYPE vendor_invoice_status_updated ADD VALUE IF NOT EXISTS 'pending';
    `);
    
    // Update existing invoices to the new workflow
    console.log('🔄 Updating existing invoice statuses...');
    
    // Update submitted invoices to pending (vendor can review before submitting)
    const submittedResult = await client.query(`
      UPDATE vendor_invoices 
      SET status = 'pending' 
      WHERE status = 'submitted'
      RETURNING id, status
    `);
    console.log(`✅ Updated ${submittedResult.rowCount} 'submitted' invoices to 'pending'`);
    
    // Update ready_to_process invoices to pending
    const readyToProcessResult = await client.query(`
      UPDATE vendor_invoices 
      SET status = 'pending' 
      WHERE status = 'ready_to_process'
      RETURNING id, status
    `);
    console.log(`✅ Updated ${readyToProcessResult.rowCount} 'ready_to_process' invoices to 'pending'`);
    
    // Update ready_for_processing invoices to pending (they were auto-submitted, now vendor can review)
    const readyForProcessingResult = await client.query(`
      UPDATE vendor_invoices 
      SET status = 'pending' 
      WHERE status = 'ready_for_processing'
      RETURNING id, status
    `);
    console.log(`✅ Updated ${readyForProcessingResult.rowCount} 'ready_for_processing' invoices to 'pending'`);
    
    // Keep existing approved invoices as sent_to_accounting
    console.log('✅ Keeping existing approved invoices as sent_to_accounting');
    
    // Keep existing paid invoices as paid
    console.log('✅ Keeping existing paid invoices as paid');
    
    // Keep existing rejected invoices as rejected
    console.log('✅ Keeping existing rejected invoices as rejected');
    
    // Show final status distribution
    const statusDistribution = await client.query(`
      SELECT status, COUNT(*) as count
      FROM vendor_invoices
      GROUP BY status
      ORDER BY status
    `);
    
    console.log('\n📊 Final status distribution:');
    statusDistribution.rows.forEach(row => {
      console.log(`   ${row.status}: ${row.count} invoices`);
    });
    
    console.log('\n✅ Migration completed successfully!');
    console.log('\n📋 New Workflow:');
    console.log('   1. Vendor uploads → status: pending');
    console.log('   2. Vendor reviews and submits → status: sent_to_admin');
    console.log('   3. Admin reviews and approves → status: sent_to_accounting');
    console.log('   4. Accounting processes payment → status: paid');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

updateToNewWorkflow().catch(console.error); 