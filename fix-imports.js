const fs = require('fs');
const path = require('path');

function getAllFiles(dirPath, arrayOfFiles = []) {
  if (!fs.existsSync(dirPath)) return arrayOfFiles;
  
  const files = fs.readdirSync(dirPath);
  
  files.forEach(file => {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (!file.includes('node_modules') && !file.includes('.git') && !file.includes('dist')) {
        arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
      }
    } else {
      arrayOfFiles.push(fullPath);
    }
  });
  
  return arrayOfFiles;
}

function fixImportExtensions() {
  console.log('🔧 Fixing import extensions...\n');
  
  const files = getAllFiles('frontend/src');
  let fixedCount = 0;
  let totalIssues = 0;
  
  files.forEach(file => {
    if (['.js', '.jsx', '.ts', '.tsx'].includes(path.extname(file))) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        let newContent = content;
        
        // Fix import statements with explicit extensions
        const importRegex = /from\s+['"]([^'"]*)\.(ts|tsx|js|jsx)['"]/g;
        const matches = content.match(importRegex);
        
        if (matches) {
          totalIssues += matches.length;
          
          // Replace all matches
          newContent = content.replace(importRegex, "from '$1'");
          
          if (newContent !== content) {
            fs.writeFileSync(file, newContent, 'utf8');
            const relativePath = file.replace(process.cwd(), '').replace(/\\/g, '/');
            console.log(`✅ Fixed ${matches.length} imports in: ${relativePath}`);
            fixedCount++;
          }
        }
      } catch (error) {
        console.error(`❌ Error processing ${file}:`, error.message);
      }
    }
  });
  
  console.log(`\n📊 Summary:`);
  console.log(`   Files processed: ${fixedCount}`);
  console.log(`   Import issues fixed: ${totalIssues}`);
  
  if (fixedCount === 0) {
    console.log('   🎉 No import extension issues found!');
  } else {
    console.log('   ✅ All import extensions fixed!');
  }
}

// Run the fix
fixImportExtensions(); 