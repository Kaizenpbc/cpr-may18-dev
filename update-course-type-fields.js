const fs = require('fs');
const path = require('path');

// Files that need updating with their specific changes
const filesToUpdate = [
  {
    file: 'frontend/src/components/views/instructor/MyScheduleView.tsx',
    changes: [
      { from: 'coursetypename: string;', to: 'name: string;' },
      { from: 'c.course_name || c.coursetypename || \'CPR Class\'', to: 'c.course_name || c.name || \'CPR Class\'' }
    ]
  },
  {
    file: 'frontend/src/components/views/instructor/AttendanceView.tsx',
    changes: [
      { from: '{course.coursetypename} - {course.organizationname}', to: '{course.name} - {course.organizationname}' },
      { from: '{selectedClass.coursetypename} -', to: '{selectedClass.name} -' }
    ]
  },
  {
    file: 'frontend/src/components/views/instructor/MyClassesView.tsx',
    changes: [
      { from: '<TableCell>{item.type === \'class\' ? item.coursetypename : \'\'}</TableCell>', to: '<TableCell>{item.type === \'class\' ? item.name : \'\'}</TableCell>' }
    ]
  },
  {
    file: 'frontend/src/components/tables/InstructorArchiveTable.tsx',
    changes: [
      { from: '{course.coursetypename || \'CPR Class\'}', to: '{course.name || \'CPR Class\'}' }
    ]
  },
  {
    file: 'frontend/src/components/tables/OrgCourseHistoryTable.tsx',
    changes: [
      { from: '<TableCell>{course.coursetypename || \'-\'}</TableCell>', to: '<TableCell>{course.name || \'-\'}</TableCell>' }
    ]
  },
  {
    file: 'frontend/src/components/instructor/InstructorDashboard.tsx',
    changes: [
      { from: '{cls.coursetypename}', to: '{cls.name}' }
    ]
  },
  {
    file: 'frontend/src/components/portals/courseAdmin/InstructorManagement.tsx',
    changes: [
      { from: 'coursetypename: item.type,', to: 'name: item.type,' },
      { from: '<TableCell>{item.type === \'class\' ? item.coursetypename : \'-\'}</TableCell>', to: '<TableCell>{item.type === \'class\' ? item.name : \'-\'}</TableCell>' }
    ]
  },
  {
    file: 'frontend/src/components/admin/PricingRuleManager.tsx',
    changes: [
      { from: '{rule.coursetypename || \'All Types\'}', to: '{rule.name || \'All Types\'}' }
    ]
  },
  {
    file: 'frontend/src/components/admin/PricingManager.tsx',
    changes: [
      { from: 'rule => rule.coursetypeid === parseInt(filterType, 10)', to: 'rule => rule.id === parseInt(filterType, 10)' },
      { from: 'case \'coursetypename\':', to: 'case \'name\':' },
      { from: 'compareA = a.coursetypename || \'\';', to: 'compareA = a.name || \'\';' },
      { from: 'compareB = b.coursetypename || \'\';', to: 'compareB = b.name || \'\';' },
      { from: '<MenuItem key={ct.coursetypeid} value={ct.coursetypeid}>', to: '<MenuItem key={ct.id} value={ct.id}>' },
      { from: '{ct.coursetypename} ({ct.coursecode})', to: '{ct.name} ({ct.coursecode})' },
      { from: 'active={orderBy === \'coursetypename\'}', to: 'active={orderBy === \'name\'}' },
      { from: 'direction={orderBy === \'coursetypename\' ? order : \'asc\'}', to: 'direction={orderBy === \'name\' ? order : \'asc\'}' },
      { from: 'onClick={() => handleSortRequest(\'coursetypename\')}', to: 'onClick={() => handleSortRequest(\'name\')}' },
      { from: '{rule.coursetypename} (ID: {rule.coursetypeid})', to: '{rule.name} (ID: {rule.id})' }
    ]
  },
  {
    file: 'frontend/src/components/dialogs/InvoiceDetailDialog.tsx',
    changes: [
      { from: '<strong>Course:</strong> {invoice.coursetypename} (', to: '<strong>Course:</strong> {invoice.name} (' }
    ]
  },
  {
    file: 'frontend/src/components/common/CalendarView.tsx',
    changes: [
      { from: 'tooltipText = `${scheduledClass.coursetypename} - ${scheduledClass.organizationname}`;', to: 'tooltipText = `${scheduledClass.name} - ${scheduledClass.organizationname}`;' },
      { from: '{scheduledClass.coursetypename}', to: '{scheduledClass.name}' }
    ]
  }
];

function updateFile(filePath, changes) {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  File not found: ${filePath}`);
      return false;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    let updated = false;

    changes.forEach(change => {
      if (content.includes(change.from)) {
        content = content.replace(new RegExp(change.from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), change.to);
        updated = true;
        console.log(`  ✅ Updated: ${change.from} → ${change.to}`);
      } else {
        console.log(`  ⚠️  Not found: ${change.from}`);
      }
    });

    if (updated) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Updated: ${filePath}`);
      return true;
    } else {
      console.log(`ℹ️  No changes needed: ${filePath}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error updating ${filePath}:`, error.message);
    return false;
  }
}

function main() {
  console.log('🔧 Updating course type field names across components...\n');
  
  let totalFiles = 0;
  let updatedFiles = 0;

  filesToUpdate.forEach(({ file, changes }) => {
    totalFiles++;
    console.log(`📁 Processing: ${file}`);
    if (updateFile(file, changes)) {
      updatedFiles++;
    }
    console.log('');
  });

  console.log(`🎉 Update complete!`);
  console.log(`📊 Summary: ${updatedFiles}/${totalFiles} files updated`);
  
  if (updatedFiles > 0) {
    console.log('\n📝 Next steps:');
    console.log('1. Review the changes in the updated files');
    console.log('2. Test the components to ensure they work correctly');
    console.log('3. Commit the changes with a descriptive message');
  }
}

main(); 