-- This script updates all instructor endpoints to use the new course_student_counts view
-- for consistent student count logic across all portals

-- Note: This is a reference script. The actual updates need to be made in the TypeScript files.
-- The SQL queries below show what each endpoint should look like after the update.

-- 1. /classes endpoint
/*
SELECT 
  cr.id,
  cr.id as course_id,
  cr.instructor_id,
  cr.confirmed_date as start_time,
  cr.confirmed_date as end_time,
  cr.status,
  cr.location,
  cr.registered_students as max_students,
  CASE WHEN cr.status = 'completed' THEN true ELSE false END as completed,
  cr.created_at,
  cr.updated_at,
  ct.name as course_name,
  ct.name as coursetypename,
  COALESCE(o.name, 'Unassigned') as organizationname,
  COALESCE(cr.location, '') as notes,
  csc.display_student_count as studentcount,
  csc.display_attended_count as studentsattendance
FROM course_requests cr
JOIN class_types ct ON cr.course_type_id = ct.id
LEFT JOIN organizations o ON cr.organization_id = o.id
LEFT JOIN course_student_counts csc ON cr.id = csc.course_request_id
WHERE cr.instructor_id = $1 AND cr.status = 'confirmed'
ORDER BY cr.confirmed_date DESC
*/

-- 2. /classes/active endpoint
/*
SELECT 
  cr.id,
  cr.id as course_id,
  cr.instructor_id,
  cr.confirmed_date as start_time,
  cr.confirmed_date as end_time,
  cr.status,
  cr.location,
  cr.registered_students as max_students,
  CASE WHEN cr.status = 'completed' THEN true ELSE false END as completed,
  cr.created_at,
  cr.updated_at,
  ct.name as course_name,
  ct.name as coursetypename,
  COALESCE(o.name, 'Unassigned') as organizationname,
  COALESCE(cr.location, '') as notes,
  csc.display_student_count as studentcount,
  csc.display_attended_count as studentsattendance
FROM course_requests cr
JOIN class_types ct ON cr.course_type_id = ct.id
LEFT JOIN organizations o ON cr.organization_id = o.id
LEFT JOIN course_student_counts csc ON cr.id = csc.course_request_id
WHERE cr.instructor_id = $1 AND cr.status = 'confirmed' AND cr.status != 'completed'
ORDER BY cr.confirmed_date ASC
*/

-- 3. /classes/today endpoint
/*
SELECT 
  cr.id,
  cr.id as course_id,
  cr.instructor_id,
  cr.confirmed_date as start_time,
  cr.confirmed_date as end_time,
  cr.status,
  cr.location,
  cr.registered_students as max_students,
  CASE WHEN cr.status = 'completed' THEN true ELSE false END as completed,
  cr.created_at,
  cr.updated_at,
  ct.name as course_name,
  ct.name as coursetypename,
  COALESCE(o.name, 'Unassigned') as organizationname,
  COALESCE(cr.location, '') as notes,
  csc.display_student_count as studentcount,
  csc.display_attended_count as studentsattendance
FROM course_requests cr
JOIN class_types ct ON cr.course_type_id = ct.id
LEFT JOIN organizations o ON cr.organization_id = o.id
LEFT JOIN course_student_counts csc ON cr.id = csc.course_request_id
WHERE cr.instructor_id = $1 AND cr.status = 'confirmed' AND cr.confirmed_date::date = $2::date
ORDER BY cr.confirmed_date ASC
*/

-- 4. /schedule endpoint
/*
SELECT 
  cr.id,
  cr.id as course_id,
  cr.instructor_id,
  cr.confirmed_date as start_time,
  cr.confirmed_date as end_time,
  cr.status,
  cr.location,
  cr.registered_students as max_students,
  CASE WHEN cr.status = 'completed' THEN true ELSE false END as completed,
  cr.created_at,
  cr.updated_at,
  ct.name as course_name,
  ct.name as coursetypename,
  COALESCE(o.name, 'Unassigned') as organizationname,
  COALESCE(cr.location, '') as notes,
  csc.display_student_count as studentcount,
  csc.display_attended_count as studentsattendance
FROM course_requests cr
JOIN class_types ct ON cr.course_type_id = ct.id
LEFT JOIN organizations o ON cr.organization_id = o.id
LEFT JOIN course_student_counts csc ON cr.id = csc.course_request_id
WHERE cr.instructor_id = $1 AND cr.status = 'confirmed'
ORDER BY cr.confirmed_date ASC
*/ 