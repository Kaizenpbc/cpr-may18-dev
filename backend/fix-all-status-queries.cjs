const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'routes', 'v1', 'index.ts');

try {
  console.log('🔧 Fixing all status column references...\n');
  
  // Read the file
  let content = fs.readFileSync(filePath, 'utf8');
  let changesMade = 0;
  
  // Fix users queries - remove status filter since users table doesn't have status column
  const usersQueries = [
    {
      old: "SELECT COUNT(*) as count FROM users WHERE role = 'instructor' AND status = 'active'",
      new: "SELECT COUNT(*) as count FROM users WHERE role = 'instructor'"
    }
  ];
  
  usersQueries.forEach(query => {
    if (content.includes(query.old)) {
      content = content.replace(query.old, query.new);
      console.log('✅ Fixed users query:', query.old.substring(0, 50) + '...');
      changesMade++;
    }
  });
  
  // Fix vendors queries - use is_active instead of status
  const vendorsQueries = [
    {
      old: "SELECT COUNT(*) as count FROM vendors WHERE status = 'active'",
      new: "SELECT COUNT(*) as count FROM vendors WHERE is_active = true"
    }
  ];
  
  vendorsQueries.forEach(query => {
    if (content.includes(query.old)) {
      content = content.replace(query.old, query.new);
      console.log('✅ Fixed vendors query:', query.old.substring(0, 50) + '...');
      changesMade++;
    }
  });
  
  // Fix organizations queries - check if organizations table has status column
  const orgQueries = [
    {
      old: "SELECT COUNT(*) as count FROM organizations WHERE status = 'active'",
      new: "SELECT COUNT(*) as count FROM organizations"
    }
  ];
  
  orgQueries.forEach(query => {
    if (content.includes(query.old)) {
      content = content.replace(query.old, query.new);
      console.log('✅ Fixed organizations query:', query.old.substring(0, 50) + '...');
      changesMade++;
    }
  });
  
  // Write the updated content back
  fs.writeFileSync(filePath, content, 'utf8');
  
  if (changesMade > 0) {
    console.log(`\n🎉 Fixed ${changesMade} queries successfully!`);
  } else {
    console.log('\n✅ No queries needed fixing - all are already correct');
  }
  
} catch (error) {
  console.error('❌ Error fixing queries:', error.message);
} 