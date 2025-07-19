const fs = require('fs');
const path = require('path');

const instructorFile = path.join(__dirname, 'src/routes/v1/instructor.ts');

async function fixInstructorEndpoints() {
  try {
    console.log('🔧 Fixing instructor endpoints...\n');
    
    // Read the current file
    let content = fs.readFileSync(instructorFile, 'utf8');
    
    // Replace all instances of the old student count queries
    const oldQuery = `(SELECT COUNT(*) FROM course_students cs WHERE cs.course_request_id = cr.id) as studentcount,
      (SELECT COUNT(*) FROM course_students cs WHERE cs.course_request_id = cr.id AND cs.attended = true) as studentsattendance`;
    
    const newQuery = `csc.display_student_count as studentcount,
      csc.display_attended_count as studentsattendance`;
    
    // Count how many replacements we need to make
    const oldCount = (content.match(new RegExp(oldQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
    console.log(`Found ${oldCount} instances to replace`);
    
    // Replace the student count queries
    content = content.replace(new RegExp(oldQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), newQuery);
    
    // Add the JOIN for course_student_counts view where it's missing
    const joinPattern = `FROM course_requests cr
     JOIN class_types ct ON cr.course_type_id = ct.id
     LEFT JOIN organizations o ON cr.organization_id = o.id`;
    
    const newJoinPattern = `FROM course_requests cr
     JOIN class_types ct ON cr.course_type_id = ct.id
     LEFT JOIN organizations o ON cr.organization_id = o.id
     LEFT JOIN course_student_counts csc ON cr.id = csc.course_request_id`;
    
    // Count how many JOINs we need to add
    const joinCount = (content.match(new RegExp(joinPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
    console.log(`Found ${joinCount} JOIN patterns to update`);
    
    // Replace the JOIN patterns
    content = content.replace(new RegExp(joinPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), newJoinPattern);
    
    // Write the updated content back
    fs.writeFileSync(instructorFile, content, 'utf8');
    
    console.log('✅ Successfully updated instructor endpoints!');
    console.log('📝 All endpoints now use the course_student_counts view.');
    
  } catch (error) {
    console.error('❌ Error updating instructor endpoints:', error.message);
  }
}

fixInstructorEndpoints(); 