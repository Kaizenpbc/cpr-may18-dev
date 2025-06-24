const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'backend', 'src', 'routes', 'instructor.ts');

// Read the file
let content = fs.readFileSync(filePath, 'utf8');

// Fix all the current_students issues
// 1. Add 0 as current_students to SELECT statements that don't have it
content = content.replace(
  /(SELECT\s+[\s\S]*?c\.max_students,)(\s*)(c\.class_type_id,)/g,
  '$1\n          0 as current_students,$2$3'
);

// 2. Fix the response mapping to use 0 for current_students when it doesn't exist
content = content.replace(
  /current_students:\s*row\.current_students/g,
  'current_students: row.current_students || 0'
);

// 3. Remove any UPDATE statements that try to update current_students
content = content.replace(
  /SET\s+current_students\s*=\s*\$1[^;]*;/g,
  '-- SET current_students = $1, updated_at = CURRENT_TIMESTAMP -- Removed: column does not exist'
);

// Write the fixed content back
fs.writeFileSync(filePath, content, 'utf8');

console.log('Fixed current_students references in instructor.ts'); 