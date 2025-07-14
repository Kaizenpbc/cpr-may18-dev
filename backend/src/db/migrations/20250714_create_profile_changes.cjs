const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: 'cpr_jun21', // Use the current database
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'gtacpr',
});

async function up() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Create profile_changes table
    await client.query(`
      CREATE TABLE IF NOT EXISTS profile_changes (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        change_type VARCHAR(50) NOT NULL, -- 'instructor' or 'organization'
        field_name VARCHAR(100) NOT NULL,
        old_value TEXT,
        new_value TEXT NOT NULL,
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
        hr_comment TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create index for better performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_profile_changes_status ON profile_changes(status)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_profile_changes_user_id ON profile_changes(user_id)
    `);

    // Add HR role to users table if not exists (handle existing constraint)
    try {
      // First drop existing constraint if it exists
      await client.query(`
        ALTER TABLE users 
        DROP CONSTRAINT IF EXISTS check_valid_roles
      `);
      
      // Add new constraint with HR role
      await client.query(`
        ALTER TABLE users 
        ADD CONSTRAINT check_valid_roles 
        CHECK (role IN ('instructor', 'organization', 'courseadmin', 'accountant', 'sysadmin', 'hr'))
      `);
    } catch (error) {
      console.log('⚠️  Constraint update skipped:', error.message);
    }

    await client.query('COMMIT');
    console.log('✅ Profile changes migration completed successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Profile changes migration failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function down() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Drop profile_changes table
    await client.query('DROP TABLE IF EXISTS profile_changes CASCADE');

    // Remove HR role constraint (revert to original)
    await client.query(`
      ALTER TABLE users 
      DROP CONSTRAINT IF EXISTS check_valid_roles
    `);

    await client.query(`
      ALTER TABLE users 
      ADD CONSTRAINT check_valid_roles 
      CHECK (role IN ('instructor', 'organization', 'courseadmin', 'accountant', 'sysadmin'))
    `);

    await client.query('COMMIT');
    console.log('✅ Profile changes migration rolled back successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Profile changes rollback failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { up, down }; 