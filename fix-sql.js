const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'backend', 'src', 'routes', 'v1', 'index.ts');

// Read the file
let content = fs.readFileSync(filePath, 'utf8');

// Fix the first INSERT statement (around line 1080)
content = content.replace(
  /\) VALUES \(\$1, \$2, \$3, \$4, \$5, \$6, 'scheduled', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP\)/g,
  ') VALUES ($1, $2, $3, $4, $5, $6, $7, \'scheduled\', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)'
);

// Write the fixed content back
fs.writeFileSync(filePath, content, 'utf8');

console.log('✅ SQL INSERT statements fixed!');
console.log('The VALUES clauses now have the correct number of placeholders.'); 