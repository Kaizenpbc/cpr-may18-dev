const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'routes', 'v1', 'index.ts');

try {
  console.log('🔧 Fixing sysadmin dashboard queries...\n');
  
  // Read the file
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Fix the users query - remove status filter since users table doesn't have status column
  const usersQueryOld = "SELECT COUNT(*) as count FROM users WHERE status = 'active'";
  const usersQueryNew = "SELECT COUNT(*) as count FROM users";
  
  if (content.includes(usersQueryOld)) {
    content = content.replace(usersQueryOld, usersQueryNew);
    console.log('✅ Fixed users query');
  } else {
    console.log('⚠️  Users query not found or already fixed');
  }
  
  // Fix the vendors query - use is_active instead of status
  const vendorsQueryOld = "SELECT COUNT(*) as count FROM vendors WHERE status = 'active'";
  const vendorsQueryNew = "SELECT COUNT(*) as count FROM vendors WHERE is_active = true";
  
  if (content.includes(vendorsQueryOld)) {
    content = content.replace(vendorsQueryOld, vendorsQueryNew);
    console.log('✅ Fixed vendors query');
  } else {
    console.log('⚠️  Vendors query not found or already fixed');
  }
  
  // Write the updated content back
  fs.writeFileSync(filePath, content, 'utf8');
  
  console.log('\n🎉 Sysadmin dashboard queries fixed successfully!');
  
} catch (error) {
  console.error('❌ Error fixing sysadmin dashboard:', error.message);
} 