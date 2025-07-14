const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: 'cpr_jun21',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'gtacpr',
});

async function up() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Create payroll_payments table
    await client.query(`
      CREATE TABLE IF NOT EXISTS payroll_payments (
        id SERIAL PRIMARY KEY,
        instructor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        amount DECIMAL(10,2) NOT NULL CHECK (amount >= 0),
        payment_date DATE NOT NULL,
        payment_method VARCHAR(50) DEFAULT 'direct_deposit',
        notes TEXT,
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'rejected')),
        transaction_id VARCHAR(100),
        hr_notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes for better performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_payroll_payments_instructor_id ON payroll_payments(instructor_id)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_payroll_payments_status ON payroll_payments(status)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_payroll_payments_payment_date ON payroll_payments(payment_date)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_payroll_payments_created_at ON payroll_payments(created_at)
    `);

    // Add trigger to update updated_at timestamp
    await client.query(`
      CREATE OR REPLACE FUNCTION update_payroll_payments_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);

    await client.query(`
      CREATE TRIGGER trigger_payroll_payments_updated_at
          BEFORE UPDATE ON payroll_payments
          FOR EACH ROW
          EXECUTE FUNCTION update_payroll_payments_updated_at()
    `);

    await client.query('COMMIT');
    console.log('✅ Payroll payments migration completed successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Payroll payments migration failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function down() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Drop payroll_payments table
    await client.query('DROP TABLE IF EXISTS payroll_payments CASCADE');

    // Drop trigger and function
    await client.query('DROP TRIGGER IF EXISTS trigger_payroll_payments_updated_at ON payroll_payments');
    await client.query('DROP FUNCTION IF EXISTS update_payroll_payments_updated_at()');

    await client.query('COMMIT');
    console.log('✅ Payroll payments migration rolled back successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Payroll payments rollback failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { up, down }; 