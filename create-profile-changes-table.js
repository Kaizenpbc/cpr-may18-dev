const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: 'cpr_jun21',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'gtacpr',
});

async function createProfileChangesTable() {
  const client = await pool.connect();
  
  try {
    console.log('Creating profile_changes table...');
    
    await client.query('BEGIN');

    // Create profile_changes table
    await client.query(`
      CREATE TABLE IF NOT EXISTS profile_changes (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        change_type VARCHAR(50) NOT NULL,
        field_name VARCHAR(100) NOT NULL,
        old_value TEXT,
        new_value TEXT NOT NULL,
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
        hr_comment TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_profile_changes_status ON profile_changes(status)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_profile_changes_user_id ON profile_changes(user_id)
    `);

    await client.query('COMMIT');
    console.log('✅ profile_changes table created successfully');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Failed to create table:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

createProfileChangesTable(); 