-- Create system_configurations table
CREATE TABLE IF NOT EXISTS system_configurations (
    id SERIAL PRIMARY KEY,
    config_key VARCHAR(100) UNIQUE NOT NULL,
    config_value TEXT NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL DEFAULT 'general',
    updated_by INTEGER REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_system_config_key ON system_configurations(config_key);
CREATE INDEX IF NOT EXISTS idx_system_config_category ON system_configurations(category);

-- Insert default configurations based on current hardcoded values
INSERT INTO system_configurations (config_key, config_value, description, category) VALUES
-- Invoice Settings
('invoice_due_days', '30', 'Default number of days until invoice is due', 'invoice'),
('invoice_late_fee_percent', '1.5', 'Monthly late fee percentage for overdue invoices', 'invoice'),
('invoice_payment_terms', 'Net 30', 'Default payment terms for invoices', 'invoice'),

-- Email Settings
('email_smtp_host', 'smtp.gmail.com', 'SMTP server host for sending emails', 'email'),
('email_smtp_port', '587', 'SMTP server port', 'email'),
('email_smtp_secure', 'false', 'Use secure connection for SMTP', 'email'),
('email_smtp_user', 'kpbcma@gmail.com', 'SMTP username', 'email'),
('email_smtp_pass', 'xnvn dywh kcbo irow', 'SMTP password/app password', 'email'),
('email_smtp_from', 'kpbcma@gmail.com', 'Default sender email address', 'email'),

-- Course Settings
('course_default_price', '50.00', 'Default price per student for courses', 'course'),
('course_max_students', '20', 'Default maximum students per course', 'course'),
('course_cancellation_notice_hours', '24', 'Minimum notice required for course cancellation', 'course'),

-- System Settings
('system_session_timeout_minutes', '15', 'Session timeout in minutes', 'system'),
('system_max_file_size_mb', '10', 'Maximum file upload size in MB', 'system'),
('system_support_email', 'support@cpr-training.com', 'Default support email address', 'system')

ON CONFLICT (config_key) DO NOTHING; 