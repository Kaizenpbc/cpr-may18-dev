const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'cpr_jun21',
  user: 'postgres',
  password: 'gtacpr',
});

async function addApprovalStatus() {
  try {
    console.log('🔧 Adding approval_status column to invoices table...');
    
    // Add the approval_status column
    await pool.query(`
      ALTER TABLE invoices
      ADD COLUMN IF NOT EXISTS approval_status VARCHAR(32) DEFAULT 'pending' NULL;
    `);
    
    console.log('✅ approval_status column added successfully!');
    
    // Verify the column was added
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'invoices' AND column_name = 'approval_status';
    `);
    
    if (result.rows.length > 0) {
      console.log('✅ Column verification: approval_status column exists');
      console.log('   Data type:', result.rows[0].data_type);
      console.log('   Nullable:', result.rows[0].is_nullable);
      console.log('   Default:', result.rows[0].column_default);
    } else {
      console.log('❌ Column verification failed: approval_status column not found');
    }
    
  } catch (error) {
    console.error('❌ Failed to add approval_status column:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

addApprovalStatus().catch(console.error); 