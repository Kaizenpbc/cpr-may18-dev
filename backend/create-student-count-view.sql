-- Create a database view for consistent student count logic across all portals
-- This view provides a single source of truth for student counts

CREATE OR REPLACE VIEW course_student_counts AS
SELECT 
  cr.id as course_request_id,
  cr.registered_students,
  COALESCE(cs.actual_student_count, 0) as actual_student_count,
  COALESCE(cs.attended_student_count, 0) as attended_student_count,
  CASE 
    WHEN cs.actual_student_count > 0 THEN cs.actual_student_count
    ELSE cr.registered_students 
  END as display_student_count,
  CASE 
    WHEN cs.actual_student_count > 0 THEN cs.attended_student_count
    ELSE 0
  END as display_attended_count
FROM course_requests cr
LEFT JOIN (
  SELECT 
    course_request_id,
    COUNT(*) as actual_student_count,
    COUNT(CASE WHEN attended = true THEN 1 END) as attended_student_count
  FROM course_students 
  GROUP BY course_request_id
) cs ON cr.id = cs.course_request_id;

-- Add comment to document the business logic
COMMENT ON VIEW course_student_counts IS 
'Provides consistent student count logic across all portals. 
Display count shows actual students when available, otherwise falls back to registered_students.
This ensures all portals show the same numbers.'; 