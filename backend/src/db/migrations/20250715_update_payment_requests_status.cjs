const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'cpr_jun21',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'gtacpr',
});

async function updatePaymentRequestsStatus() {
  const client = await pool.connect();
  
  try {
    console.log('Updating payment_requests table status constraint...');
    
    // Drop the existing check constraint
    await client.query(`
      ALTER TABLE payment_requests 
      DROP CONSTRAINT IF EXISTS payment_requests_status_check
    `);
    
    // Add the new check constraint with returned_to_hr status
    await client.query(`
      ALTER TABLE payment_requests 
      ADD CONSTRAINT payment_requests_status_check 
      CHECK (status IN ('pending', 'approved', 'rejected', 'completed', 'returned_to_hr'))
    `);
    
    console.log('✅ payment_requests status constraint updated successfully');
    
  } catch (error) {
    console.error('❌ Error updating payment_requests status constraint:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the migration
updatePaymentRequestsStatus()
  .then(() => {
    console.log('🎉 Payment requests status update completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Payment requests status update failed:', error);
    process.exit(1);
  }); 