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

    // Create timesheets table
    await client.query(`
      CREATE TABLE IF NOT EXISTS timesheets (
        id SERIAL PRIMARY KEY,
        instructor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        week_start_date DATE NOT NULL,
        total_hours DECIMAL(5,2) NOT NULL CHECK (total_hours >= 0),
        courses_taught INTEGER DEFAULT 0,
        notes TEXT,
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
        hr_comment TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        -- Ensure one timesheet per instructor per week
        UNIQUE(instructor_id, week_start_date)
      )
    `);

    // Create indexes for better performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_timesheets_instructor_id ON timesheets(instructor_id)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_timesheets_status ON timesheets(status)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_timesheets_week_start_date ON timesheets(week_start_date)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_timesheets_created_at ON timesheets(created_at)
    `);

    // Add trigger to update updated_at timestamp
    await client.query(`
      CREATE OR REPLACE FUNCTION update_timesheets_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);

    await client.query(`
      CREATE TRIGGER trigger_timesheets_updated_at
          BEFORE UPDATE ON timesheets
          FOR EACH ROW
          EXECUTE FUNCTION update_timesheets_updated_at()
    `);

    await client.query('COMMIT');
    console.log('✅ Timesheets migration completed successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Timesheets migration failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function down() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Drop timesheets table
    await client.query('DROP TABLE IF EXISTS timesheets CASCADE');

    // Drop trigger and function
    await client.query('DROP TRIGGER IF EXISTS trigger_timesheets_updated_at ON timesheets');
    await client.query('DROP FUNCTION IF EXISTS update_timesheets_updated_at()');

    await client.query('COMMIT');
    console.log('✅ Timesheets migration rolled back successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Timesheets rollback failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { up, down }; 