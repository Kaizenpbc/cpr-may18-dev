-- Phase 2: Create common views to reduce redundant joins

CREATE OR REPLACE VIEW course_request_details AS
SELECT
  cr.id,
  cr.organization_id,
  cr.course_type_id,
  cr.date_requested,
  cr.scheduled_date,
  cr.location,
  cr.registered_students as students_registered,
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