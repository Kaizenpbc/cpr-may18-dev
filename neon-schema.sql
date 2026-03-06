-- ============================================
-- CPR Training System - Neon Database Schema
-- Run this in Neon SQL Editor
-- ============================================

-- ============================================
-- CREATE TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS organizations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  contact_name VARCHAR(255),
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),
  contact_position VARCHAR(100),
  address TEXT,
  address_street VARCHAR(255),
  address_city VARCHAR(100),
  address_province VARCHAR(100),
  address_postal_code VARCHAR(20),
  country VARCHAR(100) DEFAULT 'Canada',
  ceo_name VARCHAR(255),
  ceo_email VARCHAR(255),
  ceo_phone VARCHAR(50),
  organization_comments TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vendors (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  contact_email VARCHAR(255),
  contact_phone VARCHAR(20),
  address TEXT,
  vendor_type VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  user_id INTEGER,
  company_name VARCHAR(255),
  contact_name VARCHAR(255),
  tax_id VARCHAR(100),
  payment_terms VARCHAR(100),
  status VARCHAR(50) DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'student',
  organization_id INTEGER REFERENCES organizations(id) ON DELETE SET NULL,
  full_name VARCHAR(255),
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  phone VARCHAR(20),
  mobile VARCHAR(20),
  date_onboarded DATE,
  date_offboarded DATE,
  user_comments TEXT,
  status VARCHAR(20) DEFAULT 'active',
  reset_token TEXT,
  reset_token_expires TIMESTAMP,
  mfa_enabled BOOLEAN DEFAULT false,
  mfa_secret VARCHAR(255),
  mfa_backup_codes TEXT[],
  failed_login_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMP,
  password_changed_at TIMESTAMP,
  address TEXT,
  emergency_contact_name VARCHAR(255),
  emergency_contact_phone VARCHAR(50),
  certifications TEXT,
  pay_rate DECIMAL(10,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE vendors ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id);

CREATE TABLE IF NOT EXISTS class_types (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  duration_minutes INTEGER NOT NULL,
  course_code VARCHAR(50),
  max_students INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sessions (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(255) UNIQUE NOT NULL,
  user_id INTEGER REFERENCES users(id),
  data JSONB,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS instructor_availability (
  id SERIAL PRIMARY KEY,
  instructor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'available',
  available_date DATE,
  start_time TIME,
  end_time TIME,
  is_available BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(instructor_id, date)
);

CREATE TABLE IF NOT EXISTS course_requests (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  course_type_id INTEGER NOT NULL REFERENCES class_types(id) ON DELETE RESTRICT,
  date_requested DATE NOT NULL,
  scheduled_date DATE,
  location VARCHAR(255) NOT NULL,
  registered_students INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  instructor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  confirmed_date DATE,
  confirmed_start_time TIME,
  confirmed_end_time TIME,
  completed_at TIMESTAMP,
  ready_for_billing BOOLEAN DEFAULT false,
  ready_for_billing_at TIMESTAMP,
  invoiced BOOLEAN DEFAULT false,
  invoiced_at TIMESTAMP,
  last_reminder_at TIMESTAMP,
  is_cancelled BOOLEAN DEFAULT false,
  cancelled_at TIMESTAMP,
  cancellation_reason TEXT,
  archived BOOLEAN DEFAULT false,
  archived_at TIMESTAMP,
  instructor_comments TEXT,
  deleted_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS course_students (
  id SERIAL PRIMARY KEY,
  course_request_id INTEGER NOT NULL REFERENCES course_requests(id) ON DELETE CASCADE,
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  college VARCHAR(255),
  attendance_marked BOOLEAN DEFAULT false,
  attended BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS colleges (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS classes (
  id SERIAL PRIMARY KEY,
  class_type_id INTEGER REFERENCES class_types(id),
  instructor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  organization_id INTEGER REFERENCES organizations(id),
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'scheduled',
  location TEXT,
  max_students INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS class_students (
  id SERIAL PRIMARY KEY,
  class_id INTEGER REFERENCES classes(id),
  student_id INTEGER REFERENCES users(id),
  attendance VARCHAR(50) DEFAULT 'registered',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(class_id, student_id)
);

CREATE TABLE IF NOT EXISTS certifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  course_id INTEGER NOT NULL,
  course_name VARCHAR(255) NOT NULL,
  issue_date DATE NOT NULL,
  expiration_date DATE NOT NULL,
  certification_number VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL,
  instructor_name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_log (
  id SERIAL PRIMARY KEY,
  table_name VARCHAR(100) NOT NULL,
  record_id INTEGER NOT NULL,
  action VARCHAR(20) NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_values JSONB,
  new_values JSONB,
  changed_by INTEGER REFERENCES users(id),
  user_id INTEGER REFERENCES users(id),
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ip_address VARCHAR(45),
  user_agent TEXT
);

CREATE TABLE IF NOT EXISTS invoices (
  id SERIAL PRIMARY KEY,
  invoice_number VARCHAR(50) NOT NULL UNIQUE,
  organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  course_request_id INTEGER REFERENCES course_requests(id) ON DELETE SET NULL,
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  base_cost DECIMAL(10,2),
  tax_amount DECIMAL(10,2),
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  course_type_name VARCHAR(255),
  location VARCHAR(255),
  date_completed DATE,
  students_billed INTEGER,
  rate_per_student DECIMAL(10,2),
  notes TEXT,
  email_sent_at TIMESTAMP,
  posted_to_org BOOLEAN DEFAULT false,
  posted_to_org_at TIMESTAMP,
  paid_date DATE,
  approved_by INTEGER REFERENCES users(id),
  approved_at TIMESTAMP,
  approval_status VARCHAR(20) DEFAULT 'pending',
  deleted_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  payment_date DATE NOT NULL,
  payment_method VARCHAR(50),
  reference_number VARCHAR(100),
  notes TEXT,
  status VARCHAR(50) DEFAULT 'verified',
  submitted_by_org_at TIMESTAMP,
  verified_by_accounting_at TIMESTAMP,
  reversed_at TIMESTAMP,
  reversed_by INTEGER REFERENCES users(id),
  reversal_reason TEXT,
  deleted_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS course_pricing (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER NOT NULL REFERENCES organizations(id),
  course_type_id INTEGER NOT NULL REFERENCES class_types(id),
  price_per_student DECIMAL(10,2) NOT NULL,
  effective_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(organization_id, course_type_id, is_active)
);

CREATE TABLE IF NOT EXISTS email_templates (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  key VARCHAR(50) NOT NULL UNIQUE,
  category VARCHAR(50) NOT NULL,
  sub_category VARCHAR(50),
  template_type VARCHAR(50),
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  is_system BOOLEAN DEFAULT false,
  created_by INTEGER REFERENCES users(id),
  last_modified_by INTEGER REFERENCES users(id),
  deleted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(20) NOT NULL DEFAULT 'info',
  category VARCHAR(50) NOT NULL DEFAULT 'system',
  link VARCHAR(500),
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notification_settings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  course_notifications BOOLEAN DEFAULT true,
  billing_notifications BOOLEAN DEFAULT true,
  reminder_notifications BOOLEAN DEFAULT true,
  system_notifications BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS system_configurations (
  id SERIAL PRIMARY KEY,
  config_key VARCHAR(100) NOT NULL UNIQUE,
  config_value TEXT NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL DEFAULT 'general',
  updated_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

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
);

CREATE TABLE IF NOT EXISTS instructor_certifications (
  id SERIAL PRIMARY KEY,
  instructor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  certification_type VARCHAR(100) NOT NULL,
  certification_number VARCHAR(100),
  issue_date DATE,
  expiration_date DATE,
  issuing_authority VARCHAR(255),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked')),
  document_path VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vendor_invoices (
  id SERIAL PRIMARY KEY,
  vendor_id INTEGER NOT NULL REFERENCES vendors(id),
  invoice_number VARCHAR(255) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  rate DECIMAL(10,2),
  hst DECIMAL(10,2),
  total DECIMAL(10,2),
  description TEXT,
  invoice_date DATE NOT NULL,
  due_date DATE,
  manual_type VARCHAR(100),
  quantity INTEGER,
  pdf_filename VARCHAR(255),
  status VARCHAR(50) DEFAULT 'submitted',
  notes TEXT,
  admin_notes TEXT,
  payment_date DATE,
  sent_to_accounting_at TIMESTAMP,
  paid_at TIMESTAMP,
  approved_by INTEGER REFERENCES users(id),
  approved_at TIMESTAMP,
  rejection_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vendor_payments (
  id SERIAL PRIMARY KEY,
  vendor_invoice_id INTEGER NOT NULL REFERENCES vendor_invoices(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  payment_date DATE NOT NULL,
  payment_method VARCHAR(50) NOT NULL,
  reference_number VARCHAR(100),
  notes TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'reversed')),
  processed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  processed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pay_rate_tiers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  base_hourly_rate DECIMAL(10,2) NOT NULL,
  course_bonus DECIMAL(10,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS instructor_pay_rates (
  id SERIAL PRIMARY KEY,
  instructor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tier_id INTEGER REFERENCES pay_rate_tiers(id),
  hourly_rate DECIMAL(10,2) NOT NULL,
  course_bonus DECIMAL(10,2) DEFAULT 0,
  effective_date DATE DEFAULT CURRENT_DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(instructor_id, is_active)
);

CREATE TABLE IF NOT EXISTS pay_rate_history (
  id SERIAL PRIMARY KEY,
  instructor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  old_hourly_rate DECIMAL(10,2),
  new_hourly_rate DECIMAL(10,2) NOT NULL,
  old_tier_id INTEGER REFERENCES pay_rate_tiers(id),
  new_tier_id INTEGER REFERENCES pay_rate_tiers(id),
  old_course_bonus DECIMAL(10,2),
  new_course_bonus DECIMAL(10,2),
  changed_by INTEGER REFERENCES users(id),
  change_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS timesheets (
  id SERIAL PRIMARY KEY,
  instructor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  week_start_date DATE NOT NULL,
  week_end_date DATE,
  total_hours DECIMAL(5,2) DEFAULT 0,
  courses_taught INTEGER DEFAULT 0,
  notes TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'approved', 'rejected')),
  hr_comment TEXT,
  submitted_at TIMESTAMP,
  approved_by INTEGER REFERENCES users(id),
  approved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(instructor_id, week_start_date)
);

CREATE TABLE IF NOT EXISTS timesheet_notes (
  id SERIAL PRIMARY KEY,
  timesheet_id INTEGER NOT NULL REFERENCES timesheets(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id),
  user_role VARCHAR(50),
  note_text TEXT NOT NULL,
  note_type VARCHAR(50) DEFAULT 'comment',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payment_requests (
  id SERIAL PRIMARY KEY,
  instructor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  timesheet_id INTEGER REFERENCES timesheets(id),
  amount DECIMAL(10,2) NOT NULL,
  base_amount DECIMAL(10,2),
  bonus_amount DECIMAL(10,2),
  payment_date DATE,
  payment_method VARCHAR(50),
  status VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed', 'returned_to_hr')),
  notes TEXT,
  hr_notes TEXT,
  processed_by INTEGER REFERENCES users(id),
  processed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payroll_payments (
  id SERIAL PRIMARY KEY,
  instructor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  payment_request_id INTEGER REFERENCES payment_requests(id),
  amount DECIMAL(10,2) NOT NULL,
  payment_date DATE NOT NULL,
  payment_method VARCHAR(50) NOT NULL,
  transaction_id VARCHAR(100),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'failed', 'reversed')),
  hr_notes TEXT,
  processed_by INTEGER REFERENCES users(id),
  processed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS enrollments (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  class_id INTEGER REFERENCES classes(id) ON DELETE CASCADE,
  course_request_id INTEGER REFERENCES course_requests(id) ON DELETE CASCADE,
  enrollment_date DATE DEFAULT CURRENT_DATE,
  status VARCHAR(20) DEFAULT 'enrolled' CHECK (status IN ('enrolled', 'completed', 'cancelled', 'no_show')),
  completion_date DATE,
  certificate_issued BOOLEAN DEFAULT false,
  certificate_number VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS holidays (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  date DATE NOT NULL,
  description TEXT,
  is_recurring BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(name, date)
);

CREATE TABLE IF NOT EXISTS pay_rates (
  id SERIAL PRIMARY KEY,
  instructor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_type_id INTEGER REFERENCES class_types(id),
  rate_per_hour DECIMAL(10,2),
  rate_per_class DECIMAL(10,2),
  effective_date DATE DEFAULT CURRENT_DATE,
  end_date DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_profile_changes_status ON profile_changes(status);
CREATE INDEX IF NOT EXISTS idx_profile_changes_user_id ON profile_changes(user_id);
CREATE INDEX IF NOT EXISTS idx_instructor_certifications_instructor ON instructor_certifications(instructor_id);
CREATE INDEX IF NOT EXISTS idx_instructor_certifications_expiration ON instructor_certifications(expiration_date);
CREATE INDEX IF NOT EXISTS idx_vendor_invoices_vendor_id ON vendor_invoices(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_invoices_status ON vendor_invoices(status);
CREATE INDEX IF NOT EXISTS idx_vendor_payments_invoice ON vendor_payments(vendor_invoice_id);
CREATE INDEX IF NOT EXISTS idx_vendor_payments_status ON vendor_payments(status);
CREATE INDEX IF NOT EXISTS idx_instructor_pay_rates_instructor ON instructor_pay_rates(instructor_id);
CREATE INDEX IF NOT EXISTS idx_pay_rate_history_instructor ON pay_rate_history(instructor_id);
CREATE INDEX IF NOT EXISTS idx_timesheets_instructor ON timesheets(instructor_id);
CREATE INDEX IF NOT EXISTS idx_timesheets_status ON timesheets(status);
CREATE INDEX IF NOT EXISTS idx_timesheets_week ON timesheets(week_start_date);
CREATE INDEX IF NOT EXISTS idx_timesheet_notes_timesheet ON timesheet_notes(timesheet_id);
CREATE INDEX IF NOT EXISTS idx_payment_requests_instructor ON payment_requests(instructor_id);
CREATE INDEX IF NOT EXISTS idx_payment_requests_status ON payment_requests(status);
CREATE INDEX IF NOT EXISTS idx_payment_requests_timesheet ON payment_requests(timesheet_id);
CREATE INDEX IF NOT EXISTS idx_payroll_payments_instructor ON payroll_payments(instructor_id);
CREATE INDEX IF NOT EXISTS idx_payroll_payments_status ON payroll_payments(status);
CREATE INDEX IF NOT EXISTS idx_enrollments_student ON enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_class ON enrollments(class_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course_request ON enrollments(course_request_id);
CREATE INDEX IF NOT EXISTS idx_course_requests_instructor_id ON course_requests(instructor_id);
CREATE INDEX IF NOT EXISTS idx_course_requests_organization_id ON course_requests(organization_id);
CREATE INDEX IF NOT EXISTS idx_course_requests_status ON course_requests(status);
CREATE INDEX IF NOT EXISTS idx_course_students_course_request_id ON course_students(course_request_id);
CREATE INDEX IF NOT EXISTS idx_course_students_attended ON course_students(course_request_id, attended);
CREATE INDEX IF NOT EXISTS idx_classes_instructor_id ON classes(instructor_id);
CREATE INDEX IF NOT EXISTS idx_classes_organization_id ON classes(organization_id);
CREATE INDEX IF NOT EXISTS idx_invoices_organization_id ON invoices(organization_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_users_organization_id ON users(organization_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_audit_log_table_record ON audit_log(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_changed_at ON audit_log(changed_at);
CREATE INDEX IF NOT EXISTS idx_audit_log_changed_by ON audit_log(changed_by);
CREATE INDEX IF NOT EXISTS idx_holidays_date ON holidays(date);
CREATE INDEX IF NOT EXISTS idx_pay_rates_instructor ON pay_rates(instructor_id);
CREATE INDEX IF NOT EXISTS idx_invoices_not_deleted ON invoices(id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_payments_not_deleted ON payments(id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_course_requests_not_deleted ON course_requests(id) WHERE deleted_at IS NULL;

-- ============================================
-- VIEWS
-- ============================================

CREATE OR REPLACE VIEW invoice_with_breakdown AS
SELECT * FROM invoices;

CREATE OR REPLACE VIEW course_request_details AS
SELECT
  cr.id,
  cr.organization_id,
  cr.course_type_id,
  cr.date_requested,
  cr.scheduled_date,
  cr.location,
  cr.registered_students AS students_registered,
  cr.notes,
  cr.status,
  cr.instructor_id,
  cr.confirmed_date,
  cr.confirmed_start_time,
  cr.confirmed_end_time,
  cr.completed_at,
  cr.created_at,
  cr.updated_at,
  o.name AS organization_name,
  ct.name AS course_type_name,
  u.username AS instructor_username,
  u.first_name AS instructor_first_name,
  u.last_name AS instructor_last_name
FROM course_requests cr
LEFT JOIN organizations o ON cr.organization_id = o.id
LEFT JOIN class_types ct ON cr.course_type_id = ct.id
LEFT JOIN users u ON cr.instructor_id = u.id;

-- ============================================
-- SEED DATA
-- ============================================

INSERT INTO organizations (name, contact_email)
VALUES ('Test Organization', 'test@org.com')
ON CONFLICT (name) DO NOTHING;

INSERT INTO class_types (name, description, duration_minutes) VALUES
('CPR Basic', 'Basic CPR certification course', 180),
('CPR Advanced', 'Advanced CPR certification course', 240),
('First Aid', 'First Aid certification course', 120)
ON CONFLICT (name) DO NOTHING;

INSERT INTO system_configurations (config_key, config_value, description, category) VALUES
('invoice_due_days', '30', 'Number of days until invoice is due', 'billing'),
('invoice_late_fee_percent', '1.5', 'Late fee percentage for overdue invoices', 'billing'),
('email_smtp_host', '', 'SMTP server host', 'email'),
('email_smtp_port', '587', 'SMTP server port', 'email'),
('email_smtp_user', '', 'SMTP username', 'email'),
('email_smtp_pass', '', 'SMTP password', 'email'),
('email_from_address', 'noreply@cprtraining.com', 'Default from email address', 'email'),
('company_name', 'CPR Training System', 'Company name', 'general'),
('support_email', 'support@cprtraining.com', 'Support email address', 'general'),
('session_timeout_minutes', '60', 'Session timeout in minutes', 'security')
ON CONFLICT (config_key) DO NOTHING;

INSERT INTO pay_rate_tiers (name, description, base_hourly_rate, course_bonus) VALUES
('Standard', 'Standard instructor rate', 25.00, 50.00),
('Senior', 'Senior instructor rate', 35.00, 75.00),
('Lead', 'Lead instructor rate', 45.00, 100.00)
ON CONFLICT DO NOTHING;
