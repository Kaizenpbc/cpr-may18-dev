-- ============================================
-- CPR Training System - MySQL/MariaDB Schema
-- Run this in cPanel phpMyAdmin or MySQL CLI
-- Compatible: MySQL 8.0+ / MariaDB 10.2+
-- ============================================

SET FOREIGN_KEY_CHECKS = 0;

-- ============================================
-- CREATE TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS organizations (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
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
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS vendors (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  contact_email VARCHAR(255),
  contact_phone VARCHAR(20),
  address TEXT,
  vendor_type VARCHAR(100),
  is_active TINYINT(1) DEFAULT 1,
  user_id INTEGER,
  company_name VARCHAR(255),
  contact_name VARCHAR(255),
  tax_id VARCHAR(100),
  payment_terms VARCHAR(100),
  status VARCHAR(50) DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT chk_vendor_status CHECK (status IS NULL OR status IN ('active','inactive'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS users (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(255) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'student',
  organization_id INTEGER,
  full_name VARCHAR(255),
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  phone VARCHAR(20),
  mobile VARCHAR(20),
  date_onboarded DATE,
  date_offboarded DATE,
  user_comments TEXT,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IS NULL OR status IN ('active','inactive','suspended')),
  reset_token TEXT,
  reset_token_expires TIMESTAMP NULL,
  mfa_enabled TINYINT(1) DEFAULT 0,
  mfa_secret VARCHAR(255),
  mfa_backup_codes JSON,
  failed_login_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMP NULL,
  password_changed_at TIMESTAMP NULL,
  address TEXT,
  emergency_contact_name VARCHAR(255),
  emergency_contact_phone VARCHAR(50),
  certifications TEXT,
  pay_rate DECIMAL(10,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE vendors ADD COLUMN IF NOT EXISTS user_id INTEGER;

CREATE TABLE IF NOT EXISTS class_types (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  duration_minutes INTEGER NOT NULL,
  course_code VARCHAR(50),
  max_students INTEGER,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS sessions (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  session_id VARCHAR(255) UNIQUE NOT NULL,
  user_id INTEGER,
  data JSON,
  expires_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS instructor_availability (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  instructor_id INTEGER NOT NULL,
  date DATE NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'available' CHECK (status IN ('available','confirmed','cancelled')),
  available_date DATE,
  start_time TIME,
  end_time TIME,
  is_available TINYINT(1) DEFAULT 1,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_instructor_date (instructor_id, date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS course_requests (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  organization_id INTEGER NOT NULL,
  course_type_id INTEGER NOT NULL,
  date_requested DATE NOT NULL,
  scheduled_date DATE,
  location VARCHAR(255) NOT NULL,
  registered_students INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','completed','cancelled','past_due','invoiced')),
  instructor_id INTEGER,
  confirmed_date DATE,
  confirmed_start_time TIME,
  confirmed_end_time TIME,
  completed_at TIMESTAMP NULL,
  ready_for_billing TINYINT(1) DEFAULT 0,
  ready_for_billing_at TIMESTAMP NULL,
  invoiced TINYINT(1) DEFAULT 0,
  invoiced_at TIMESTAMP NULL,
  last_reminder_at TIMESTAMP NULL,
  is_cancelled TINYINT(1) DEFAULT 0,
  cancelled_at TIMESTAMP NULL,
  cancellation_reason TEXT,
  archived TINYINT(1) DEFAULT 0,
  archived_at TIMESTAMP NULL,
  instructor_comments TEXT,
  deleted_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS course_students (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  course_request_id INTEGER NOT NULL,
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  college VARCHAR(255),
  attendance_marked TINYINT(1) DEFAULT 0,
  attended TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS colleges (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS classes (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  class_type_id INTEGER,
  instructor_id INTEGER,
  organization_id INTEGER,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'scheduled',
  location TEXT,
  max_students INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS class_students (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  class_id INTEGER,
  student_id INTEGER,
  attendance VARCHAR(50) DEFAULT 'registered',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_class_student (class_id, student_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS certifications (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  course_id INTEGER NOT NULL,
  course_name VARCHAR(255) NOT NULL,
  issue_date DATE NOT NULL,
  expiration_date DATE NOT NULL,
  certification_number VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL,
  instructor_name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS audit_log (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  table_name VARCHAR(100) NOT NULL,
  record_id INTEGER NOT NULL,
  action VARCHAR(20) NOT NULL,
  old_values JSON,
  new_values JSON,
  changed_by INTEGER,
  user_id INTEGER,
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ip_address VARCHAR(45),
  user_agent TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS invoices (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  invoice_number VARCHAR(50) NOT NULL UNIQUE,
  organization_id INTEGER NOT NULL,
  course_request_id INTEGER,
  invoice_date DATE NOT NULL DEFAULT (CURRENT_DATE),
  due_date DATE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  base_cost DECIMAL(10,2),
  tax_amount DECIMAL(10,2),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','overdue','cancelled')),
  course_type_name VARCHAR(255),
  location VARCHAR(255),
  date_completed DATE,
  students_billed INTEGER,
  rate_per_student DECIMAL(10,2),
  notes TEXT,
  email_sent_at TIMESTAMP NULL,
  posted_to_org TINYINT(1) DEFAULT 0,
  posted_to_org_at TIMESTAMP NULL,
  paid_date DATE,
  approved_by INTEGER,
  approved_at TIMESTAMP NULL,
  approval_status VARCHAR(20) DEFAULT 'pending' CHECK (approval_status IS NULL OR approval_status IN ('pending','approved','rejected')),
  rejected_by INTEGER,
  rejected_at TIMESTAMP NULL,
  deleted_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS payments (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  invoice_id INTEGER NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  payment_date DATE NOT NULL,
  payment_method VARCHAR(50),
  reference_number VARCHAR(100),
  notes TEXT,
  status VARCHAR(50) DEFAULT 'verified' CHECK (status IS NULL OR status IN ('pending','verified','reversed','rejected')),
  submitted_by_org_at TIMESTAMP NULL,
  verified_by_accounting_at TIMESTAMP NULL,
  reversed_at TIMESTAMP NULL,
  reversed_by INTEGER,
  reversal_reason TEXT,
  deleted_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS course_pricing (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  organization_id INTEGER NOT NULL,
  course_type_id INTEGER NOT NULL,
  price_per_student DECIMAL(10,2) NOT NULL,
  effective_date DATE NOT NULL,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_org_course_active (organization_id, course_type_id, is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS email_templates (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  `key` VARCHAR(50) NOT NULL UNIQUE,
  category VARCHAR(50) NOT NULL,
  sub_category VARCHAR(50),
  template_type VARCHAR(50),
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  is_active TINYINT(1) DEFAULT 1,
  is_system TINYINT(1) DEFAULT 0,
  created_by INTEGER,
  last_modified_by INTEGER,
  deleted_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS notifications (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(20) NOT NULL DEFAULT 'info',
  category VARCHAR(50) NOT NULL DEFAULT 'system',
  link VARCHAR(500),
  is_read TINYINT(1) DEFAULT 0,
  read_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS notification_settings (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id INTEGER NOT NULL UNIQUE,
  course_notifications TINYINT(1) DEFAULT 1,
  billing_notifications TINYINT(1) DEFAULT 1,
  reminder_notifications TINYINT(1) DEFAULT 1,
  system_notifications TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS system_configurations (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  config_key VARCHAR(100) NOT NULL UNIQUE,
  config_value TEXT NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL DEFAULT 'general',
  updated_by INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS profile_changes (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  change_type VARCHAR(50) NOT NULL,
  field_name VARCHAR(100) NOT NULL,
  old_value TEXT,
  new_value TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IS NULL OR status IN ('pending','approved','rejected')),
  hr_comment TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS instructor_certifications (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  instructor_id INTEGER NOT NULL,
  certification_type VARCHAR(100) NOT NULL,
  certification_number VARCHAR(100),
  issue_date DATE,
  expiration_date DATE,
  issuing_authority VARCHAR(255),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IS NULL OR status IN ('active','expired','revoked')),
  document_path VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS vendor_invoices (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  vendor_id INTEGER NOT NULL,
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
  sent_to_accounting_at TIMESTAMP NULL,
  paid_at TIMESTAMP NULL,
  approved_by INTEGER,
  approved_at TIMESTAMP NULL,
  rejection_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS vendor_payments (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  vendor_invoice_id INTEGER NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  payment_date DATE NOT NULL,
  payment_method VARCHAR(50) NOT NULL,
  reference_number VARCHAR(100),
  notes TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  processed_by INTEGER,
  processed_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS pay_rate_tiers (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  base_hourly_rate DECIMAL(10,2) NOT NULL,
  course_bonus DECIMAL(10,2) DEFAULT 0,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS instructor_pay_rates (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  instructor_id INTEGER NOT NULL,
  tier_id INTEGER,
  hourly_rate DECIMAL(10,2) NOT NULL,
  course_bonus DECIMAL(10,2) DEFAULT 0,
  effective_date DATE DEFAULT (CURRENT_DATE),
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_instructor_active (instructor_id, is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS pay_rate_history (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  instructor_id INTEGER NOT NULL,
  old_hourly_rate DECIMAL(10,2),
  new_hourly_rate DECIMAL(10,2) NOT NULL,
  old_tier_id INTEGER,
  new_tier_id INTEGER,
  old_course_bonus DECIMAL(10,2),
  new_course_bonus DECIMAL(10,2),
  changed_by INTEGER,
  change_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS timesheets (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  instructor_id INTEGER NOT NULL,
  week_start_date DATE NOT NULL,
  week_end_date DATE,
  total_hours DECIMAL(5,2) DEFAULT 0,
  courses_taught INTEGER DEFAULT 0,
  notes TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','submitted','approved','rejected','paid')),
  hr_comment TEXT,
  submitted_at TIMESTAMP NULL,
  approved_by INTEGER,
  approved_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_instructor_week (instructor_id, week_start_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS timesheet_notes (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  timesheet_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  user_role VARCHAR(50),
  note_text TEXT NOT NULL,
  note_type VARCHAR(50) DEFAULT 'comment',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS payment_requests (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  instructor_id INTEGER NOT NULL,
  timesheet_id INTEGER,
  amount DECIMAL(10,2) NOT NULL,
  base_amount DECIMAL(10,2),
  bonus_amount DECIMAL(10,2),
  payment_date DATE,
  payment_method VARCHAR(50),
  status VARCHAR(30) DEFAULT 'pending',
  notes TEXT,
  hr_notes TEXT,
  processed_by INTEGER,
  processed_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS payroll_payments (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  instructor_id INTEGER NOT NULL,
  payment_request_id INTEGER,
  amount DECIMAL(10,2) NOT NULL,
  payment_date DATE NOT NULL,
  payment_method VARCHAR(50) NOT NULL,
  transaction_id VARCHAR(100),
  status VARCHAR(20) DEFAULT 'pending',
  hr_notes TEXT,
  processed_by INTEGER,
  processed_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS enrollments (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  student_id INTEGER NOT NULL,
  class_id INTEGER,
  course_request_id INTEGER,
  enrollment_date DATE DEFAULT (CURRENT_DATE),
  status VARCHAR(20) DEFAULT 'enrolled',
  completion_date DATE,
  certificate_issued TINYINT(1) DEFAULT 0,
  certificate_number VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS holidays (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  date DATE NOT NULL,
  description TEXT,
  is_recurring TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_holiday_name_date (name, date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS pay_rates (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  instructor_id INTEGER NOT NULL,
  course_type_id INTEGER,
  rate_per_hour DECIMAL(10,2),
  rate_per_class DECIMAL(10,2),
  effective_date DATE DEFAULT (CURRENT_DATE),
  end_date DATE,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS schema_info (
  `key` VARCHAR(100) PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- FOREIGN KEY CONSTRAINTS
-- ============================================

ALTER TABLE users ADD CONSTRAINT fk_users_organization FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE SET NULL;
ALTER TABLE vendors ADD CONSTRAINT fk_vendors_user FOREIGN KEY (user_id) REFERENCES users(id);
ALTER TABLE sessions ADD CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users(id);
ALTER TABLE instructor_availability ADD CONSTRAINT fk_ia_instructor FOREIGN KEY (instructor_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE course_requests ADD CONSTRAINT fk_cr_organization FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE course_requests ADD CONSTRAINT fk_cr_course_type FOREIGN KEY (course_type_id) REFERENCES class_types(id) ON DELETE RESTRICT;
ALTER TABLE course_requests ADD CONSTRAINT fk_cr_instructor FOREIGN KEY (instructor_id) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE course_students ADD CONSTRAINT fk_cs_course_request FOREIGN KEY (course_request_id) REFERENCES course_requests(id) ON DELETE CASCADE;
ALTER TABLE classes ADD CONSTRAINT fk_classes_type FOREIGN KEY (class_type_id) REFERENCES class_types(id);
ALTER TABLE classes ADD CONSTRAINT fk_classes_instructor FOREIGN KEY (instructor_id) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE classes ADD CONSTRAINT fk_classes_org FOREIGN KEY (organization_id) REFERENCES organizations(id);
ALTER TABLE class_students ADD CONSTRAINT fk_cstu_class FOREIGN KEY (class_id) REFERENCES classes(id);
ALTER TABLE class_students ADD CONSTRAINT fk_cstu_student FOREIGN KEY (student_id) REFERENCES users(id);
ALTER TABLE audit_log ADD CONSTRAINT fk_al_changed_by FOREIGN KEY (changed_by) REFERENCES users(id);
ALTER TABLE audit_log ADD CONSTRAINT fk_al_user FOREIGN KEY (user_id) REFERENCES users(id);
ALTER TABLE invoices ADD CONSTRAINT fk_inv_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE RESTRICT;
ALTER TABLE invoices ADD CONSTRAINT fk_inv_cr FOREIGN KEY (course_request_id) REFERENCES course_requests(id) ON DELETE SET NULL;
ALTER TABLE invoices ADD CONSTRAINT fk_inv_approved_by FOREIGN KEY (approved_by) REFERENCES users(id);
ALTER TABLE invoices ADD CONSTRAINT fk_inv_rejected_by FOREIGN KEY (rejected_by) REFERENCES users(id);
ALTER TABLE payments ADD CONSTRAINT fk_pay_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE;
ALTER TABLE payments ADD CONSTRAINT fk_pay_reversed_by FOREIGN KEY (reversed_by) REFERENCES users(id);
ALTER TABLE course_pricing ADD CONSTRAINT fk_cp_org FOREIGN KEY (organization_id) REFERENCES organizations(id);
ALTER TABLE course_pricing ADD CONSTRAINT fk_cp_ct FOREIGN KEY (course_type_id) REFERENCES class_types(id);
ALTER TABLE email_templates ADD CONSTRAINT fk_et_created_by FOREIGN KEY (created_by) REFERENCES users(id);
ALTER TABLE email_templates ADD CONSTRAINT fk_et_modified_by FOREIGN KEY (last_modified_by) REFERENCES users(id);
ALTER TABLE notifications ADD CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE notification_settings ADD CONSTRAINT fk_ns_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE system_configurations ADD CONSTRAINT fk_sc_updated_by FOREIGN KEY (updated_by) REFERENCES users(id);
ALTER TABLE profile_changes ADD CONSTRAINT fk_pc_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE instructor_certifications ADD CONSTRAINT fk_ic_instructor FOREIGN KEY (instructor_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE vendor_invoices ADD CONSTRAINT fk_vi_vendor FOREIGN KEY (vendor_id) REFERENCES vendors(id);
ALTER TABLE vendor_invoices ADD CONSTRAINT fk_vi_approved_by FOREIGN KEY (approved_by) REFERENCES users(id);
ALTER TABLE vendor_payments ADD CONSTRAINT fk_vp_invoice FOREIGN KEY (vendor_invoice_id) REFERENCES vendor_invoices(id) ON DELETE CASCADE;
ALTER TABLE vendor_payments ADD CONSTRAINT fk_vp_processed_by FOREIGN KEY (processed_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE instructor_pay_rates ADD CONSTRAINT fk_ipr_instructor FOREIGN KEY (instructor_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE instructor_pay_rates ADD CONSTRAINT fk_ipr_tier FOREIGN KEY (tier_id) REFERENCES pay_rate_tiers(id);
ALTER TABLE pay_rate_history ADD CONSTRAINT fk_prh_instructor FOREIGN KEY (instructor_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE pay_rate_history ADD CONSTRAINT fk_prh_old_tier FOREIGN KEY (old_tier_id) REFERENCES pay_rate_tiers(id);
ALTER TABLE pay_rate_history ADD CONSTRAINT fk_prh_new_tier FOREIGN KEY (new_tier_id) REFERENCES pay_rate_tiers(id);
ALTER TABLE pay_rate_history ADD CONSTRAINT fk_prh_changed_by FOREIGN KEY (changed_by) REFERENCES users(id);
ALTER TABLE timesheets ADD CONSTRAINT fk_ts_instructor FOREIGN KEY (instructor_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE timesheets ADD CONSTRAINT fk_ts_approved_by FOREIGN KEY (approved_by) REFERENCES users(id);
ALTER TABLE timesheet_notes ADD CONSTRAINT fk_tn_timesheet FOREIGN KEY (timesheet_id) REFERENCES timesheets(id) ON DELETE CASCADE;
ALTER TABLE timesheet_notes ADD CONSTRAINT fk_tn_user FOREIGN KEY (user_id) REFERENCES users(id);
ALTER TABLE payment_requests ADD CONSTRAINT fk_pr_instructor FOREIGN KEY (instructor_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE payment_requests ADD CONSTRAINT fk_pr_timesheet FOREIGN KEY (timesheet_id) REFERENCES timesheets(id);
ALTER TABLE payment_requests ADD CONSTRAINT fk_pr_processed_by FOREIGN KEY (processed_by) REFERENCES users(id);
ALTER TABLE payroll_payments ADD CONSTRAINT fk_pp_instructor FOREIGN KEY (instructor_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE payroll_payments ADD CONSTRAINT fk_pp_pr FOREIGN KEY (payment_request_id) REFERENCES payment_requests(id);
ALTER TABLE payroll_payments ADD CONSTRAINT fk_pp_processed_by FOREIGN KEY (processed_by) REFERENCES users(id);
ALTER TABLE enrollments ADD CONSTRAINT fk_enr_student FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE enrollments ADD CONSTRAINT fk_enr_class FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE;
ALTER TABLE enrollments ADD CONSTRAINT fk_enr_cr FOREIGN KEY (course_request_id) REFERENCES course_requests(id) ON DELETE CASCADE;
ALTER TABLE pay_rates ADD CONSTRAINT fk_pr2_instructor FOREIGN KEY (instructor_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE pay_rates ADD CONSTRAINT fk_pr2_ct FOREIGN KEY (course_type_id) REFERENCES class_types(id);

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read);
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
-- Note: partial indexes (WHERE deleted_at IS NULL) not supported in MySQL — queries filter in WHERE clause
CREATE INDEX IF NOT EXISTS idx_invoices_deleted_at ON invoices(deleted_at);
CREATE INDEX IF NOT EXISTS idx_payments_deleted_at ON payments(deleted_at);
CREATE INDEX IF NOT EXISTS idx_course_requests_deleted_at ON course_requests(deleted_at);

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

INSERT IGNORE INTO organizations (name, contact_email)
VALUES ('Test Organization', 'test@org.com');

INSERT IGNORE INTO class_types (name, description, duration_minutes) VALUES
('CPR Basic', 'Basic CPR certification course', 180),
('CPR Advanced', 'Advanced CPR certification course', 240),
('First Aid', 'First Aid certification course', 120);

INSERT IGNORE INTO system_configurations (config_key, config_value, description, category) VALUES
('invoice_due_days', '30', 'Number of days until invoice is due', 'billing'),
('invoice_late_fee_percent', '1.5', 'Late fee percentage for overdue invoices', 'billing'),
('email_smtp_host', '', 'SMTP server host', 'email'),
('email_smtp_port', '587', 'SMTP server port', 'email'),
('email_smtp_user', '', 'SMTP username', 'email'),
('email_smtp_pass', '', 'SMTP password', 'email'),
('email_from_address', 'noreply@cprtraining.com', 'Default from email address', 'email'),
('company_name', 'CPR Training System', 'Company name', 'general'),
('support_email', 'support@cprtraining.com', 'Support email address', 'general'),
('session_timeout_minutes', '60', 'Session timeout in minutes', 'security');

INSERT IGNORE INTO pay_rate_tiers (name, description, base_hourly_rate, course_bonus) VALUES
('Standard', 'Standard instructor rate', 25.00, 50.00),
('Senior', 'Senior instructor rate', 35.00, 75.00),
('Lead', 'Lead instructor rate', 45.00, 100.00);
