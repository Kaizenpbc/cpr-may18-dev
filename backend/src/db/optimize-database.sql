-- ==========================================
-- DATABASE OPTIMIZATION SCRIPT
-- CPR Training System Performance Enhancement
-- ==========================================

-- This script includes:
-- 1. Index creation for performance optimization
-- 2. Query optimization examples
-- 3. Performance monitoring setup
-- 4. Database maintenance procedures

BEGIN;

-- ==========================================
-- 1. PRIMARY INDEXES FOR CORE TABLES
-- ==========================================

-- Users table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_organization_id ON users(organization_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_role_org ON users(role, organization_id) WHERE status = 'active';

-- Organizations table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_organizations_name ON organizations(name);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_organizations_contact_email ON organizations(contact_email);

-- Course requests table indexes (heavily queried)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_course_requests_status ON course_requests(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_course_requests_organization_id ON course_requests(organization_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_course_requests_instructor_id ON course_requests(instructor_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_course_requests_course_type_id ON course_requests(course_type_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_course_requests_scheduled_date ON course_requests(scheduled_date);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_course_requests_confirmed_date ON course_requests(confirmed_date);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_course_requests_completed_at ON course_requests(completed_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_course_requests_created_at ON course_requests(created_at);

-- Composite indexes for common query patterns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_course_requests_org_status ON course_requests(organization_id, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_course_requests_instructor_date ON course_requests(instructor_id, confirmed_date) WHERE status IN ('confirmed', 'completed');
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_course_requests_status_date ON course_requests(status, confirmed_date) WHERE status = 'confirmed';
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_course_requests_billing ON course_requests(status, ready_for_billing_at) WHERE status = 'completed' AND ready_for_billing_at IS NOT NULL;

-- Class types table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_class_types_name ON class_types(name);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_class_types_active ON class_types(is_active) WHERE is_active = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_class_types_category ON class_types(course_category);

-- Course students table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_course_students_course_request_id ON course_students(course_request_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_course_students_email ON course_students(email);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_course_students_attended ON course_students(course_request_id, attended);

-- Instructor availability table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_instructor_availability_instructor_id ON instructor_availability(instructor_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_instructor_availability_date ON instructor_availability(date);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_instructor_availability_instructor_date ON instructor_availability(instructor_id, date);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_instructor_availability_status ON instructor_availability(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_instructor_availability_available ON instructor_availability(date, status) WHERE status = 'available';

-- Classes table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_classes_instructor_id ON classes(instructor_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_classes_date ON classes(date);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_classes_type_id ON classes(type_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_classes_status ON classes(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_classes_instructor_date ON classes(instructor_id, date);

-- ==========================================
-- 2. FINANCIAL/ACCOUNTING INDEXES
-- ==========================================

-- Invoices table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_organization_id ON invoices(organization_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_invoice_number ON invoices(invoice_number);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_invoice_date ON invoices(COALESCE(invoice_date, created_at));
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_posted_to_org ON invoices(posted_to_org) WHERE posted_to_org = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_org_posted ON invoices(organization_id, posted_to_org) WHERE posted_to_org = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_org_status ON invoices(organization_id, status) WHERE posted_to_org = true;

-- Payments table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_invoice_id ON payments(invoice_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_payment_date ON payments(payment_date);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_verification ON payments(status, submitted_by_org_at) WHERE status = 'pending_verification';

-- Course pricing table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_course_pricing_organization_id ON course_pricing(organization_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_course_pricing_course_type_id ON course_pricing(course_type_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_course_pricing_active ON course_pricing(is_active) WHERE is_active = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_course_pricing_org_course ON course_pricing(organization_id, course_type_id) WHERE is_active = true;

-- ==========================================
-- 3. SYSTEM ADMINISTRATION INDEXES
-- ==========================================

-- Vendors table indexes (if exists)
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vendors_vendor_name ON vendors(vendor_name);
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vendors_status ON vendors(status);
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vendors_vendor_type ON vendors(vendor_type);

-- Email templates indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_email_templates_template_name ON email_templates(template_name);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_email_templates_is_active ON email_templates(is_active) WHERE is_active = true;

-- ==========================================
-- 4. ANALYTICS AND REPORTING INDEXES
-- ==========================================

-- Time-based analytics indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_course_requests_analytics_monthly ON course_requests(
  DATE_TRUNC('month', created_at), 
  organization_id, 
  course_type_id
);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_course_requests_completion_analytics ON course_requests(
  status, 
  completed_at, 
  organization_id
) WHERE status = 'completed';

-- Revenue analytics indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_revenue_monthly ON invoices(
  DATE_TRUNC('month', COALESCE(invoice_date, created_at)),
  organization_id,
  status
);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_revenue_monthly ON payments(
  DATE_TRUNC('month', payment_date),
  status
) WHERE status = 'verified';

-- ==========================================
-- 5. PARTIAL INDEXES FOR COMMON FILTERS
-- ==========================================

-- Active/current records only
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_course_requests_pending ON course_requests(organization_id, created_at) WHERE status = 'pending';
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_course_requests_confirmed_future ON course_requests(instructor_id, confirmed_date) WHERE status = 'confirmed' AND confirmed_date >= CURRENT_DATE;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_instructor_availability_future ON instructor_availability(instructor_id, date) WHERE date >= CURRENT_DATE;

-- Overdue invoices
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_overdue ON invoices(organization_id, due_date) 
WHERE status NOT IN ('paid', 'cancelled') AND due_date < CURRENT_DATE;

-- ==========================================
-- 6. FUNCTION-BASED INDEXES
-- ==========================================

-- Case-insensitive searches
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_username_lower ON users(LOWER(username));
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email_lower ON users(LOWER(email));
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_organizations_name_lower ON organizations(LOWER(name));

-- Date extractions for reporting
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_course_requests_year_month ON course_requests(
  EXTRACT(YEAR FROM created_at),
  EXTRACT(MONTH FROM created_at),
  organization_id
);

-- ==========================================
-- 7. FOREIGN KEY CONSTRAINTS (if missing)
-- ==========================================

-- Add foreign key constraints for referential integrity and query optimization
-- These also create indexes automatically

-- ALTER TABLE course_requests ADD CONSTRAINT fk_course_requests_organization 
--   FOREIGN KEY (organization_id) REFERENCES organizations(id);
-- ALTER TABLE course_requests ADD CONSTRAINT fk_course_requests_instructor 
--   FOREIGN KEY (instructor_id) REFERENCES users(id);
-- ALTER TABLE course_requests ADD CONSTRAINT fk_course_requests_course_type 
--   FOREIGN KEY (course_type_id) REFERENCES class_types(id);

-- ALTER TABLE course_students ADD CONSTRAINT fk_course_students_course_request 
--   FOREIGN KEY (course_request_id) REFERENCES course_requests(id);

-- ALTER TABLE invoices ADD CONSTRAINT fk_invoices_organization 
--   FOREIGN KEY (organization_id) REFERENCES organizations(id);
-- ALTER TABLE invoices ADD CONSTRAINT fk_invoices_course_request 
--   FOREIGN KEY (course_request_id) REFERENCES course_requests(id);

-- ALTER TABLE payments ADD CONSTRAINT fk_payments_invoice 
--   FOREIGN KEY (invoice_id) REFERENCES invoices(id);

COMMIT;

-- ==========================================
-- 8. VACUUM AND ANALYZE
-- ==========================================

-- Update table statistics after index creation
ANALYZE users;
ANALYZE organizations;
ANALYZE course_requests;
ANALYZE class_types;
ANALYZE course_students;
ANALYZE instructor_availability;
ANALYZE classes;
ANALYZE invoices;
ANALYZE payments;
ANALYZE course_pricing;

-- ==========================================
-- 9. INDEX USAGE MONITORING QUERIES
-- ==========================================

-- Check index usage statistics
-- SELECT 
--   schemaname,
--   tablename,
--   indexname,
--   idx_scan as index_scans,
--   idx_tup_read as tuples_read,
--   idx_tup_fetch as tuples_fetched
-- FROM pg_stat_user_indexes 
-- ORDER BY idx_scan DESC;

-- Find unused indexes
-- SELECT 
--   schemaname,
--   tablename,
--   indexname,
--   idx_scan
-- FROM pg_stat_user_indexes 
-- WHERE idx_scan = 0 
-- ORDER BY tablename, indexname;

-- Check table sizes and index sizes
-- SELECT 
--   schemaname,
--   tablename,
--   pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
--   pg_size_pretty(pg_indexes_size(schemaname||'.'||tablename)) as index_size
-- FROM pg_tables 
-- WHERE schemaname = 'public'
-- ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC; 