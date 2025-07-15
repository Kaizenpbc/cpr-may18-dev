const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'cpr_jun21',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'gtacpr',
});

async function createPaymentRequestsTable() {
  const client = await pool.connect();
  
  try {
    console.log('Creating payment_requests table...');
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS payment_requests (
        id SERIAL PRIMARY KEY,
        instructor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        timesheet_id INTEGER NOT NULL REFERENCES timesheets(id) ON DELETE CASCADE,
        amount DECIMAL(10,2) NOT NULL CHECK (amount >= 0),
        payment_date DATE NOT NULL,
        payment_method VARCHAR(50) DEFAULT 'direct_deposit',
        notes TEXT,
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(timesheet_id)
      )
    `);
    
    // Create indexes for better performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_payment_requests_instructor_id ON payment_requests(instructor_id)
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_payment_requests_status ON payment_requests(status)
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_payment_requests_created_at ON payment_requests(created_at)
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_payment_requests_timesheet_id ON payment_requests(timesheet_id)
    `);
    
    console.log('✅ payment_requests table created successfully');
    
    // Add trigger to update updated_at timestamp
    await client.query(`
      CREATE OR REPLACE FUNCTION update_payment_requests_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql'
    `);
    
    await client.query(`
      DROP TRIGGER IF EXISTS trigger_update_payment_requests_updated_at ON payment_requests
    `);
    
    await client.query(`
      CREATE TRIGGER trigger_update_payment_requests_updated_at
        BEFORE UPDATE ON payment_requests
        FOR EACH ROW
        EXECUTE FUNCTION update_payment_requests_updated_at()
    `);
    
    console.log('✅ payment_requests table triggers created successfully');
    
  } catch (error) {
    console.error('❌ Error creating payment_requests table:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the migration
createPaymentRequestsTable()
  .then(() => {
    console.log('🎉 Payment requests migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Payment requests migration failed:', error);
    process.exit(1);
  }); 