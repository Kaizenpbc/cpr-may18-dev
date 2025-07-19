const fs = require('fs');
const path = require('path');

const instructorFile = path.join(__dirname, 'src/routes/v1/instructor.ts');

async function fixDuplicateJoins() {
  try {
    console.log('🔧 Fixing duplicate JOIN statements...\n');
    
    // Read the current file
    let content = fs.readFileSync(instructorFile, 'utf8');
    
    // Fix duplicate JOIN statements
    const duplicateJoin = `LEFT JOIN course_student_counts csc ON cr.id = csc.course_request_id
     LEFT JOIN course_student_counts csc ON cr.id = csc.course_request_id`;
    
    const singleJoin = `LEFT JOIN course_student_counts csc ON cr.id = csc.course_request_id`;
    
    // Count how many duplicates we need to fix
    const duplicateCount = (content.match(new RegExp(duplicateJoin.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
    console.log(`Found ${duplicateCount} duplicate JOIN patterns to fix`);
    
    // Replace duplicate JOINs with single JOIN
    content = content.replace(new RegExp(duplicateJoin.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), singleJoin);
    
    // Write the updated content back
    fs.writeFileSync(instructorFile, content, 'utf8');
    
    console.log('✅ Successfully fixed duplicate JOIN statements!');
    
  } catch (error) {
    console.error('❌ Error fixing duplicate JOINs:', error.message);
  }
}

fixDuplicateJoins(); 