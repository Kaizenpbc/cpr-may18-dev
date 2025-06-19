-- Phase 1: Add indexes for common join patterns
-- These indexes will help optimize the redundant joins we identified

-- Indexes for course_requests table
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_course_requests_type_org 
ON course_requests(course_type_id, organization_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_course_requests_instructor 
ON course_requests(instructor_id);

-- Indexes for invoices table
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_org_course 
ON invoices(organization_id, course_request_id);

-- Indexes for course_students table
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_course_students_request 
ON course_students(course_request_id);

-- Indexes for organizations table
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_organizations_name 
ON organizations(name);

-- Indexes for class_types table
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_class_types_name 
ON class_types(name);

-- Add comment to track when these indexes were added
COMMENT ON INDEX idx_course_requests_type_org IS 'Added 2024-03-19 to optimize redundant joins';
COMMENT ON INDEX idx_course_requests_instructor IS 'Added 2024-03-19 to optimize redundant joins';
COMMENT ON INDEX idx_invoices_org_course IS 'Added 2024-03-19 to optimize redundant joins';
COMMENT ON INDEX idx_course_students_request IS 'Added 2024-03-19 to optimize redundant joins';
COMMENT ON INDEX idx_organizations_name IS 'Added 2024-03-19 to optimize redundant joins';
COMMENT ON INDEX idx_class_types_name IS 'Added 2024-03-19 to optimize redundant joins'; 