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

    // Create notifications table
    await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        recipient_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        sender_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        type VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        data JSONB,
        is_read BOOLEAN DEFAULT false,
        read_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes for better performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_notifications_recipient_id ON notifications(recipient_id)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_notifications_sender_id ON notifications(sender_id)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at)
    `);

    await client.query('COMMIT');
    console.log('✅ Notifications migration completed successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Notifications migration failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function down() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Drop notifications table
    await client.query('DROP TABLE IF EXISTS notifications CASCADE');

    await client.query('COMMIT');
    console.log('✅ Notifications migration rolled back successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Notifications rollback failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { up, down }; 