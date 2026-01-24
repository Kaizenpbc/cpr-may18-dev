-- ==========================================
-- DATABASE INTEGRITY FIX MIGRATION
-- Date: 2025-01-24
-- Fixes: Foreign keys, CHECK constraints, data integrity
-- ==========================================

BEGIN;

-- ==========================================
-- 1. FOREIGN KEY CONSTRAINTS
-- ==========================================

-- Course Requests Foreign Keys
ALTER TABLE course_requests
  DROP CONSTRAINT IF EXISTS fk_course_requests_organization;
ALTER TABLE course_requests
  ADD CONSTRAINT fk_course_requests_organization
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE course_requests
  DROP CONSTRAINT IF EXISTS fk_course_requests_instructor;
ALTER TABLE course_requests
  ADD CONSTRAINT fk_course_requests_instructor
  FOREIGN KEY (instructor_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE course_requests
  DROP CONSTRAINT IF EXISTS fk_course_requests_course_type;
ALTER TABLE course_requests
  ADD CONSTRAINT fk_course_requests_course_type
  FOREIGN KEY (course_type_id) REFERENCES class_types(id) ON DELETE RESTRICT;

-- Course Students Foreign Keys
ALTER TABLE course_students
  DROP CONSTRAINT IF EXISTS fk_course_students_course_request;
ALTER TABLE course_students
  ADD CONSTRAINT fk_course_students_course_request
  FOREIGN KEY (course_request_id) REFERENCES course_requests(id) ON DELETE CASCADE;

-- Invoices Foreign Keys
ALTER TABLE invoices
  DROP CONSTRAINT IF EXISTS fk_invoices_organization;
ALTER TABLE invoices
  ADD CONSTRAINT fk_invoices_organization
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE RESTRICT;

ALTER TABLE invoices
  DROP CONSTRAINT IF EXISTS fk_invoices_course_request;
ALTER TABLE invoices
  ADD CONSTRAINT fk_invoices_course_request
  FOREIGN KEY (course_request_id) REFERENCES course_requests(id) ON DELETE SET NULL;

-- Payments Foreign Keys
ALTER TABLE payments
  DROP CONSTRAINT IF EXISTS fk_payments_invoice;
ALTER TABLE payments
  ADD CONSTRAINT fk_payments_invoice
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE;

-- Instructor Availability Foreign Keys
ALTER TABLE instructor_availability
  DROP CONSTRAINT IF EXISTS fk_instructor_availability_user;
ALTER TABLE instructor_availability
  ADD CONSTRAINT fk_instructor_availability_user
  FOREIGN KEY (instructor_id) REFERENCES users(id) ON DELETE CASCADE;

-- Classes Foreign Keys
ALTER TABLE classes
  DROP CONSTRAINT IF EXISTS fk_classes_instructor;
ALTER TABLE classes
  ADD CONSTRAINT fk_classes_instructor
  FOREIGN KEY (instructor_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE classes
  DROP CONSTRAINT IF EXISTS fk_classes_type;
ALTER TABLE classes
  ADD CONSTRAINT fk_classes_type
  FOREIGN KEY (type_id) REFERENCES class_types(id) ON DELETE RESTRICT;

-- Users Foreign Keys (organization)
ALTER TABLE users
  DROP CONSTRAINT IF EXISTS fk_users_organization;
ALTER TABLE users
  ADD CONSTRAINT fk_users_organization
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE SET NULL;

-- ==========================================
-- 2. CHECK CONSTRAINTS FOR DATA INTEGRITY
-- ==========================================

-- Monetary amount constraints (must be non-negative)
ALTER TABLE invoices
  DROP CONSTRAINT IF EXISTS check_invoice_amount_positive;
ALTER TABLE invoices
  ADD CONSTRAINT check_invoice_amount_positive
  CHECK (amount >= 0);

ALTER TABLE invoices
  DROP CONSTRAINT IF EXISTS check_invoice_base_cost_positive;
ALTER TABLE invoices
  ADD CONSTRAINT check_invoice_base_cost_positive
  CHECK (base_cost IS NULL OR base_cost >= 0);

ALTER TABLE invoices
  DROP CONSTRAINT IF EXISTS check_invoice_tax_positive;
ALTER TABLE invoices
  ADD CONSTRAINT check_invoice_tax_positive
  CHECK (tax_amount IS NULL OR tax_amount >= 0);

ALTER TABLE payments
  DROP CONSTRAINT IF EXISTS check_payment_amount_positive;
ALTER TABLE payments
  ADD CONSTRAINT check_payment_amount_positive
  CHECK (amount > 0);

ALTER TABLE course_pricing
  DROP CONSTRAINT IF EXISTS check_pricing_positive;
ALTER TABLE course_pricing
  ADD CONSTRAINT check_pricing_positive
  CHECK (price_per_student >= 0);

-- Date range constraints
ALTER TABLE invoices
  DROP CONSTRAINT IF EXISTS check_invoice_due_date;
ALTER TABLE invoices
  ADD CONSTRAINT check_invoice_due_date
  CHECK (due_date IS NULL OR invoice_date IS NULL OR due_date >= invoice_date);

ALTER TABLE course_requests
  DROP CONSTRAINT IF EXISTS check_course_times;
ALTER TABLE course_requests
  ADD CONSTRAINT check_course_times
  CHECK (confirmed_end_time IS NULL OR confirmed_start_time IS NULL OR confirmed_end_time > confirmed_start_time);

-- ==========================================
-- 3. UNIQUE CONSTRAINTS (prevent duplicates)
-- ==========================================

-- Prevent duplicate invoices for same course request
-- (Only add if not exists - some systems may allow multiple invoices)
-- ALTER TABLE invoices ADD CONSTRAINT unique_invoice_per_course
--   UNIQUE (course_request_id) WHERE course_request_id IS NOT NULL;

-- Ensure unique email per organization (for contacts)
ALTER TABLE organizations
  DROP CONSTRAINT IF EXISTS unique_org_contact_email;
-- Only add if you want unique emails:
-- ALTER TABLE organizations ADD CONSTRAINT unique_org_contact_email UNIQUE (contact_email);

-- ==========================================
-- 4. REMOVE PLAINTEXT CREDENTIALS FROM DB
-- ==========================================

-- Clear sensitive data from system_configurations
-- These should be in environment variables instead
UPDATE system_configurations
SET config_value = '[MOVED_TO_ENV_VARS]',
    description = 'Value moved to environment variables for security'
WHERE config_key IN ('email_smtp_pass', 'email_smtp_user', 'email_api_key')
  AND config_value NOT LIKE '[MOVED%';

-- ==========================================
-- 5. ADD MISSING NOT NULL CONSTRAINTS
-- ==========================================

-- Ensure critical fields are not null
-- (Only run if data is already clean)
-- ALTER TABLE invoices ALTER COLUMN organization_id SET NOT NULL;
-- ALTER TABLE payments ALTER COLUMN invoice_id SET NOT NULL;
-- ALTER TABLE course_requests ALTER COLUMN organization_id SET NOT NULL;

-- ==========================================
-- 6. CREATE AUDIT LOG TABLE
-- ==========================================

CREATE TABLE IF NOT EXISTS audit_log (
    id SERIAL PRIMARY KEY,
    table_name VARCHAR(100) NOT NULL,
    record_id INTEGER NOT NULL,
    action VARCHAR(20) NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    old_values JSONB,
    new_values JSONB,
    changed_by INTEGER REFERENCES users(id),
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45),
    user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_audit_log_table_record ON audit_log(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_changed_at ON audit_log(changed_at);
CREATE INDEX IF NOT EXISTS idx_audit_log_changed_by ON audit_log(changed_by);

-- ==========================================
-- 7. STANDARDIZE SOFT DELETE (add deleted_at where missing)
-- ==========================================

-- Add deleted_at to tables using boolean flags for consistency
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL;
ALTER TABLE course_requests ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL;

-- Create index for soft delete queries
CREATE INDEX IF NOT EXISTS idx_invoices_not_deleted ON invoices(id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_payments_not_deleted ON payments(id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_course_requests_not_deleted ON course_requests(id) WHERE deleted_at IS NULL;

COMMIT;

-- ==========================================
-- ROLLBACK SCRIPT (if needed)
-- ==========================================
-- BEGIN;
-- ALTER TABLE course_requests DROP CONSTRAINT IF EXISTS fk_course_requests_organization;
-- ALTER TABLE course_requests DROP CONSTRAINT IF EXISTS fk_course_requests_instructor;
-- ALTER TABLE course_requests DROP CONSTRAINT IF EXISTS fk_course_requests_course_type;
-- ALTER TABLE course_students DROP CONSTRAINT IF EXISTS fk_course_students_course_request;
-- ALTER TABLE invoices DROP CONSTRAINT IF EXISTS fk_invoices_organization;
-- ALTER TABLE invoices DROP CONSTRAINT IF EXISTS fk_invoices_course_request;
-- ALTER TABLE payments DROP CONSTRAINT IF EXISTS fk_payments_invoice;
-- ALTER TABLE instructor_availability DROP CONSTRAINT IF EXISTS fk_instructor_availability_user;
-- ALTER TABLE classes DROP CONSTRAINT IF EXISTS fk_classes_instructor;
-- ALTER TABLE classes DROP CONSTRAINT IF EXISTS fk_classes_type;
-- ALTER TABLE users DROP CONSTRAINT IF EXISTS fk_users_organization;
-- DROP TABLE IF EXISTS audit_log;
-- COMMIT;
