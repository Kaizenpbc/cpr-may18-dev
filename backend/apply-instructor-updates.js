const fs = require('fs');
const path = require('path');

const instructorFile = path.join(__dirname, 'src/routes/v1/instructor.ts');

async function updateInstructorEndpoints() {
  try {
    console.log('🔧 Updating instructor endpoints to use new student count view...\n');
    
    // Read the current file
    let content = fs.readFileSync(instructorFile, 'utf8');
    
    // Update all the student count queries to use the new view
    const updates = [
      {
        // /classes endpoint
        find: `(SELECT COUNT(*) FROM course_students cs WHERE cs.course_request_id = cr.id) as studentcount,
      (SELECT COUNT(*) FROM course_students cs WHERE cs.course_request_id = cr.id AND cs.attended = true) as studentsattendance`,
        replace: `csc.display_student_count as studentcount,
      csc.display_attended_count as studentsattendance`
      },
      {
        // Add the JOIN for course_student_counts view
        find: `FROM course_requests cr
     JOIN class_types ct ON cr.course_type_id = ct.id
     LEFT JOIN organizations o ON cr.organization_id = o.id`,
        replace: `FROM course_requests cr
     JOIN class_types ct ON cr.course_type_id = ct.id
     LEFT JOIN organizations o ON cr.organization_id = o.id
     LEFT JOIN course_student_counts csc ON cr.id = csc.course_request_id`
      }
    ];
    
    // Apply all updates
    for (const update of updates) {
      const beforeCount = (content.match(new RegExp(update.find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
      content = content.replace(new RegExp(update.find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), update.replace);
      const afterCount = (content.match(new RegExp(update.replace.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
      
      console.log(`✅ Updated ${beforeCount} occurrences of student count logic`);
    }
    
    // Write the updated content back
    fs.writeFileSync(instructorFile, content, 'utf8');
    
    console.log('\n✅ Successfully updated instructor endpoints!');
    console.log('📝 All endpoints now use the course_student_counts view for consistent student counts.');
    
  } catch (error) {
    console.error('❌ Error updating instructor endpoints:', error.message);
  }
}

updateInstructorEndpoints(); 