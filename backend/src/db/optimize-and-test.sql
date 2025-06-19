-- Phase 1: Add indexes for common join patterns
-- These indexes will help optimize the redundant joins we identified

-- First, let's analyze the queries before adding indexes
SELECT 'Analyzing queries before adding indexes...' as message;

-- Test 1: Course requests with organization and type
EXPLAIN ANALYZE
SELECT cr.*, o.name as org_name, ct.name as course_type
FROM course_requests cr
JOIN organizations o ON cr.organization_id = o.id
JOIN class_types ct ON cr.course_type_id = ct.id
LIMIT 100;

-- Test 2: Invoices with organization and course
EXPLAIN ANALYZE
SELECT i.*, o.name as org_name, cr.id as course_id
FROM invoices i
JOIN organizations o ON i.organization_id = o.id
LEFT JOIN course_requests cr ON i.course_request_id = cr.id
LIMIT 100;

-- Test 3: Course students with request details
EXPLAIN ANALYZE
SELECT cs.*, cr.id as request_id, o.name as org_name
FROM course_students cs
JOIN course_requests cr ON cs.course_request_id = cr.id
JOIN organizations o ON cr.organization_id = o.id
LIMIT 100;

-- Now create the indexes
SELECT 'Creating indexes...' as message;

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

-- Add comments to track when these indexes were added
COMMENT ON INDEX idx_course_requests_type_org IS 'Added 2024-03-19 to optimize redundant joins';
COMMENT ON INDEX idx_course_requests_instructor IS 'Added 2024-03-19 to optimize redundant joins';
COMMENT ON INDEX idx_invoices_org_course IS 'Added 2024-03-19 to optimize redundant joins';
COMMENT ON INDEX idx_course_students_request IS 'Added 2024-03-19 to optimize redundant joins';
COMMENT ON INDEX idx_organizations_name IS 'Added 2024-03-19 to optimize redundant joins';
COMMENT ON INDEX idx_class_types_name IS 'Added 2024-03-19 to optimize redundant joins';

-- Verify indexes were created
SELECT 'Verifying created indexes:' as message;
SELECT schemaname, tablename, indexname, indexdef
FROM pg_indexes
WHERE indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- Analyze the same queries after adding indexes
SELECT 'Analyzing queries after adding indexes...' as message;

-- Test 1: Course requests with organization and type
EXPLAIN ANALYZE
SELECT cr.*, o.name as org_name, ct.name as course_type
FROM course_requests cr
JOIN organizations o ON cr.organization_id = o.id
JOIN class_types ct ON cr.course_type_id = ct.id
LIMIT 100;

-- Test 2: Invoices with organization and course
EXPLAIN ANALYZE
SELECT i.*, o.name as org_name, cr.id as course_id
FROM invoices i
JOIN organizations o ON i.organization_id = o.id
LEFT JOIN course_requests cr ON i.course_request_id = cr.id
LIMIT 100;

-- Test 3: Course students with request details
EXPLAIN ANALYZE
SELECT cs.*, cr.id as request_id, o.name as org_name
FROM course_students cs
JOIN course_requests cr ON cs.course_request_id = cr.id
JOIN organizations o ON cr.organization_id = o.id
LIMIT 100;

SELECT 'Index creation and testing completed' as message; 