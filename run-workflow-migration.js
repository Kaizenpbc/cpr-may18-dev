const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'cpr_jun21',
  user: 'postgres',
  password: 'gtacpr'
});

async function runWorkflowMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Running vendor invoice workflow migration...');
    
    // Add the new 'pending' status to the enum
    console.log('📋 Adding pending status to enum...');
    await client.query(`
      ALTER TYPE vendor_invoice_status_updated ADD VALUE IF NOT EXISTS 'pending';
    `);
    
    console.log('✅ Migration completed successfully!');
    console.log('📋 New workflow statuses available:');
    console.log('   - pending (vendor uploads, can review)');
    console.log('   - ready_for_processing (vendor submits to admin)');
    console.log('   - sent_to_admin (admin reviews)');
    console.log('   - sent_to_accounting (admin approves)');
    console.log('   - ready_for_payment (accounting sees)');
    console.log('   - paid (payment completed)');
    console.log('   - rejected (admin rejects)');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
  } finally {
    await client.release();
    await pool.end();
  }
}

runWorkflowMigration(); 