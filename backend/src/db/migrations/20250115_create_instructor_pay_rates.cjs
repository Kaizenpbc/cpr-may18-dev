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

    // Create pay_rate_tiers table for different instructor levels
    await client.query(`
      CREATE TABLE IF NOT EXISTS pay_rate_tiers (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        base_hourly_rate DECIMAL(8,2) NOT NULL CHECK (base_hourly_rate >= 0),
        course_bonus DECIMAL(8,2) DEFAULT 50.00 CHECK (course_bonus >= 0),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create instructor_pay_rates table
    await client.query(`
      CREATE TABLE IF NOT EXISTS instructor_pay_rates (
        id SERIAL PRIMARY KEY,
        instructor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        tier_id INTEGER REFERENCES pay_rate_tiers(id) ON DELETE SET NULL,
        hourly_rate DECIMAL(8,2) NOT NULL CHECK (hourly_rate >= 0),
        course_bonus DECIMAL(8,2) DEFAULT 50.00 CHECK (course_bonus >= 0),
        effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
        end_date DATE,
        notes TEXT,
        created_by INTEGER REFERENCES users(id),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        -- Ensure only one active rate per instructor at a time
        UNIQUE(instructor_id, effective_date)
      )
    `);

    // Create pay_rate_history table for audit trail
    await client.query(`
      CREATE TABLE IF NOT EXISTS pay_rate_history (
        id SERIAL PRIMARY KEY,
        instructor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        old_hourly_rate DECIMAL(8,2),
        new_hourly_rate DECIMAL(8,2) NOT NULL,
        old_course_bonus DECIMAL(8,2),
        new_course_bonus DECIMAL(8,2),
        old_tier_id INTEGER REFERENCES pay_rate_tiers(id),
        new_tier_id INTEGER REFERENCES pay_rate_tiers(id),
        change_reason TEXT,
        changed_by INTEGER REFERENCES users(id),
        effective_date DATE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes for better performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_instructor_pay_rates_instructor_id ON instructor_pay_rates(instructor_id)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_instructor_pay_rates_effective_date ON instructor_pay_rates(effective_date)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_instructor_pay_rates_is_active ON instructor_pay_rates(is_active)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_pay_rate_history_instructor_id ON pay_rate_history(instructor_id)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_pay_rate_history_effective_date ON pay_rate_history(effective_date)
    `);

    // Add trigger to update updated_at timestamp
    await client.query(`
      CREATE OR REPLACE FUNCTION update_instructor_pay_rates_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);

    await client.query(`
      CREATE TRIGGER trigger_update_instructor_pay_rates_updated_at
      BEFORE UPDATE ON instructor_pay_rates
      FOR EACH ROW
      EXECUTE FUNCTION update_instructor_pay_rates_updated_at()
    `);

    // Insert default pay rate tiers
    await client.query(`
      INSERT INTO pay_rate_tiers (name, description, base_hourly_rate, course_bonus) VALUES
      ('Standard', 'Standard instructor rate', 25.00, 50.00),
      ('Senior', 'Senior instructor with additional experience', 30.00, 60.00),
      ('Specialist', 'Specialist instructor for advanced courses', 35.00, 75.00),
      ('Lead', 'Lead instructor with management responsibilities', 40.00, 100.00)
      ON CONFLICT (name) DO NOTHING
    `);

    await client.query('COMMIT');
    console.log('✅ Instructor pay rate tables created successfully!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error creating instructor pay rate tables:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function down() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Drop tables in reverse order
    await client.query('DROP TABLE IF EXISTS pay_rate_history CASCADE');
    await client.query('DROP TABLE IF EXISTS instructor_pay_rates CASCADE');
    await client.query('DROP TABLE IF EXISTS pay_rate_tiers CASCADE');

    // Drop function
    await client.query('DROP FUNCTION IF EXISTS update_instructor_pay_rates_updated_at() CASCADE');

    await client.query('COMMIT');
    console.log('✅ Instructor pay rate tables dropped successfully!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error dropping instructor pay rate tables:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run migration if called directly
if (require.main === module) {
  const command = process.argv[2];
  
  if (command === 'up') {
    up().then(() => {
      console.log('Migration completed successfully');
      process.exit(0);
    }).catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
  } else if (command === 'down') {
    down().then(() => {
      console.log('Rollback completed successfully');
      process.exit(0);
    }).catch((error) => {
      console.error('Rollback failed:', error);
      process.exit(1);
    });
  } else {
    console.log('Usage: node 20250115_create_instructor_pay_rates.cjs [up|down]');
    process.exit(1);
  }
}

module.exports = { up, down }; 