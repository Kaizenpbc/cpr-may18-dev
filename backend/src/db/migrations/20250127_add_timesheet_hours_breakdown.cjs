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

    // Add new columns for hours breakdown and late flag
    await client.query(`
      ALTER TABLE timesheets
      ADD COLUMN IF NOT EXISTS travel_time DECIMAL(5,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS prep_time DECIMAL(5,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS teaching_hours DECIMAL(5,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS is_late BOOLEAN DEFAULT FALSE
    `);

    // Add course_details column if it doesn't exist
    await client.query(`
      ALTER TABLE timesheets
      ADD COLUMN IF NOT EXISTS course_details JSONB
    `);

    await client.query('COMMIT');
    console.log('Timesheet hours breakdown migration completed successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Timesheet hours breakdown migration failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function down() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Remove added columns
    await client.query(`
      ALTER TABLE timesheets
      DROP COLUMN IF EXISTS travel_time,
      DROP COLUMN IF EXISTS prep_time,
      DROP COLUMN IF EXISTS teaching_hours,
      DROP COLUMN IF EXISTS is_late
    `);

    await client.query('COMMIT');
    console.log('Timesheet hours breakdown migration rolled back successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Timesheet hours breakdown rollback failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { up, down };
