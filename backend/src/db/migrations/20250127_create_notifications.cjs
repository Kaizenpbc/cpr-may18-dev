const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/cpr_jun21'
});

async function createNotificationsTable() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Create notification_types enum
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE notification_type AS ENUM (
          'payment_submitted',
          'timesheet_submitted', 
          'invoice_status_change',
          'payment_verification_needed',
          'payment_verified',
          'timesheet_approved',
          'invoice_overdue',
          'system_alert'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create notifications table
    await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type notification_type NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        data JSONB DEFAULT '{}',
        read_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create notification_preferences table
    await client.query(`
      CREATE TABLE IF NOT EXISTS notification_preferences (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type notification_type NOT NULL,
        email_enabled BOOLEAN DEFAULT true,
        push_enabled BOOLEAN DEFAULT true,
        sound_enabled BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, type)
      );
    `);

    // Create indexes for performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_read_at ON notifications(read_at);
      CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
      CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
      CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON notification_preferences(user_id);
    `);

    // Insert default notification preferences for existing users
    await client.query(`
      INSERT INTO notification_preferences (user_id, type, email_enabled, push_enabled, sound_enabled)
      SELECT 
        u.id,
        nt.type,
        true,
        true,
        true
      FROM users u
      CROSS JOIN (
        SELECT unnest(enum_range(NULL::notification_type)) as type
      ) nt
      WHERE u.role = 'accountant'
      ON CONFLICT (user_id, type) DO NOTHING;
    `);

    await client.query('COMMIT');
    console.log('✅ Notifications tables created successfully');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error creating notifications tables:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function main() {
  try {
    await createNotificationsTable();
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { createNotificationsTable }; 