-- Create notification_type enum
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

-- Create notifications table
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

-- Create notification_preferences table
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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read_at ON notifications(read_at);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON notification_preferences(user_id);

-- Insert default notification preferences for existing accountant users
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

-- Verify tables were created
SELECT 'notifications' as table_name, COUNT(*) as row_count FROM notifications
UNION ALL
SELECT 'notification_preferences' as table_name, COUNT(*) as row_count FROM notification_preferences; 